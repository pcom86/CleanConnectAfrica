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
        var cleanerIds = assignment?.CleanerProfileId is Guid cid ? new List<Guid> { cid } : new List<Guid>();
        var providerIds = assignment?.ProviderId is Guid pid ? new List<Guid> { pid } : new List<Guid>();

        var cleaners = await dbContext.CleanerProfiles
            .AsNoTracking()
            .Where(x => cleanerIds.Contains(x.Id))
            .Include(x => x.User)
            .ToDictionaryAsync(x => x.Id, cancellationToken);

        var providers = await dbContext.Providers
            .AsNoTracking()
            .Where(x => providerIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, cancellationToken);

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
                assignment.AcceptedAt)
        };

        var milestones = booking.ServiceMilestones
            .OrderByDescending(m => m.OccurredAt)
            .Select(m => new ServiceMilestoneDto(m.MilestoneType, m.Status, m.Notes, m.OccurredAt))
            .ToList();

        var dto = new BookingDetailDto(
            booking.Id,
            booking.CustomerProfileId,
            booking.ServiceId,
            booking.Service?.Name ?? "",
            booking.Service?.Category ?? "",
            booking.AddressId,
            booking.Address?.Label ?? "",
            $"{booking.Address?.StreetAddress}, {booking.Address?.Suburb}, {booking.Address?.City}",
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
            milestones
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
