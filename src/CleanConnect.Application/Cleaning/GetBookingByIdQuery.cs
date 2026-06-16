using System.Text.Json;
using CleanConnect.Application.Common;
using CleanConnect.Infrastructure;
using CleanConnect.Infrastructure.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CleanConnect.Application.Cleaning;

public sealed record GetBookingByIdQuery(Guid BookingId) : IRequest<ApiResult<BookingDetailDto>>;

public sealed class GetBookingByIdQueryHandler(CleanConnectDbContext dbContext) : IRequestHandler<GetBookingByIdQuery, ApiResult<BookingDetailDto>>
{
    public async Task<ApiResult<BookingDetailDto>> Handle(GetBookingByIdQuery query, CancellationToken cancellationToken)
    {
        var booking = await dbContext.Bookings
            .AsNoTracking()
            .Include(b => b.Service)
            .Include(b => b.Address)
            .Include(b => b.CleaningJobDetail)
            .Include(b => b.Assignment)
            .Include(b => b.ServiceMilestones)
            .Where(b => b.Id == query.BookingId)
            .FirstOrDefaultAsync(cancellationToken);

        if (booking is null)
            return ApiResult<BookingDetailDto>.Failure("Booking was not found.");

        var assignment = booking.Assignment;
        var providerIds = assignment?.ProviderId is Guid pid ? new List<Guid> { pid } : new List<Guid>();

        // Load all team cleaners from TeamCleanerProfileIdsJson or fallback to single CleanerProfileId
        var teamCleanerIds = new List<Guid>();
        if (assignment is not null)
        {
            try
            {
                var parsed = System.Text.Json.JsonSerializer.Deserialize<List<Guid>>(assignment.TeamCleanerProfileIdsJson ?? "[]");
                if (parsed is { Count: > 0 }) teamCleanerIds = parsed;
                else if (assignment.CleanerProfileId.HasValue) teamCleanerIds = new List<Guid> { assignment.CleanerProfileId.Value };
            }
            catch { if (assignment.CleanerProfileId.HasValue) teamCleanerIds = new List<Guid> { assignment.CleanerProfileId.Value }; }
        }

        var cleaners = await dbContext.CleanerProfiles
            .AsNoTracking()
            .Where(x => teamCleanerIds.Contains(x.Id))
            .Include(x => x.User)
            .ToDictionaryAsync(x => x.Id, cancellationToken);

        var providers = await dbContext.Providers
            .AsNoTracking()
            .Where(x => providerIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, cancellationToken);

        // Load supervisor
        string? supervisorName = null;
        if (assignment?.SupervisorId is Guid supId)
        {
            var supUser = await dbContext.Users.AsNoTracking().SingleOrDefaultAsync(u => u.Id == supId, cancellationToken);
            if (supUser is not null) supervisorName = $"{supUser.FirstName} {supUser.LastName}";
        }

        var jobDetail = booking.CleaningJobDetail is null ? null : new CleaningJobDetailDto(
            booking.CleaningJobDetail.Id,
            booking.CleaningJobDetail.CleaningType,
            booking.CleaningJobDetail.NumberOfRooms,
            booking.CleaningJobDetail.SquareMeters,
            booking.CleaningJobDetail.HasPets,
            booking.CleaningJobDetail.SpecialInstructions,
            SafeDeserialize<List<string>>(booking.CleaningJobDetail.BeforePhotosJson),
            SafeDeserialize<List<string>>(booking.CleaningJobDetail.AfterPhotosJson),
            booking.CleaningJobDetail.CleanerNotes,
            booking.CleaningJobDetail.TeamDispatchedAt,
            booking.CleaningJobDetail.TeamArrivedAt,
            booking.CleaningJobDetail.CompletedAt
        );

        var teamMembers = teamCleanerIds
            .Select(id => cleaners.TryGetValue(id, out var cp)
                ? new TeamMemberDto(cp.Id, cp.UserId, $"{cp.User.FirstName} {cp.User.LastName}", "Cleaner", cp.EmploymentType.ToString(), cp.Skills, cp.ServiceZones, cp.Rating, cp.User.Email, cp.User.PhoneNumber, cp.Status.ToString())
                : null)
            .Where(x => x is not null)
            .Select(x => x!)
            .ToList();

        var assignments = assignment is null ? new List<AssignmentDto>() : new List<AssignmentDto>
        {
            new AssignmentDto(
                assignment.Id,
                assignment.CleanerProfileId,
                assignment.CleanerProfileId.HasValue && cleaners.TryGetValue(assignment.CleanerProfileId.Value, out var c)
                    ? $"{c.User.FirstName} {c.User.LastName}"
                    : null,
                assignment.ProviderId,
                assignment.ProviderId.HasValue && providers.TryGetValue(assignment.ProviderId.Value, out var p)
                    ? p.CompanyName
                    : null,
                assignment.AssignedType,
                assignment.Status,
                assignment.AssignedAt,
                assignment.AcceptedAt,
                teamMembers,
                supervisorName)
        };

        var milestones = booking.ServiceMilestones
            .OrderByDescending(m => m.OccurredAt)
            .Select(m => new ServiceMilestoneDto(m.MilestoneType, m.Status, m.Notes, m.OccurredAt))
            .ToList();

        int? recurrenceCount = null;
        if (booking.IsRecurring && booking.RecurrenceGroupId.HasValue)
        {
            recurrenceCount = await dbContext.Bookings
                .AsNoTracking()
                .CountAsync(x => x.RecurrenceGroupId == booking.RecurrenceGroupId, cancellationToken);
        }

        var dto = new BookingDetailDto(
            booking.Id,
            booking.CustomerProfileId,
            booking.ServiceId,
            booking.Service?.Name ?? "",
            booking.Service?.Category ?? "",
            booking.AddressId ?? Guid.Empty,
            booking.Address?.Label ?? booking.AddressLabel ?? "",
            booking.Address != null
                ? $"{booking.Address.StreetAddress}, {booking.Address.Suburb}, {booking.Address.City}"
                : $"{booking.AddressStreet}, {booking.AddressSuburb}, {booking.AddressCity}",
            booking.ScheduledStart,
            booking.ScheduledEnd,
            booking.Status,
            booking.PaymentStatus,
            booking.Price,
            booking.Currency,
            booking.CreatedAt,
            booking.PayOnsite,
            jobDetail,
            assignments,
            milestones,
            booking.IsRecurring,
            booking.RecurrenceFrequency,
            booking.RecurrenceGroupId,
            booking.RecurrenceIndex,
            recurrenceCount
        );

        return ApiResult<BookingDetailDto>.Success(dto);
    }

    private static T SafeDeserialize<T>(string json) where T : new()
    {
        if (string.IsNullOrWhiteSpace(json)) return new T();
        try { return JsonSerializer.Deserialize<T>(json) ?? new T(); }
        catch { return new T(); }
    }
}
