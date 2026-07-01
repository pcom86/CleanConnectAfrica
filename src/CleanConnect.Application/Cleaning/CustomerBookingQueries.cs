using System.Text.Json;
using CleanConnect.Application.Common;
using CleanConnect.Infrastructure;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CleanConnect.Application.Cleaning;

public sealed record GetCustomerBookingsQuery(Guid CustomerProfileId, int Page = 1, int PageSize = 20) : IRequest<ApiResult<PagedResult<CustomerBookingDto>>>;

public sealed class GetCustomerBookingsQueryHandler(CleanConnectDbContext dbContext) : IRequestHandler<GetCustomerBookingsQuery, ApiResult<PagedResult<CustomerBookingDto>>>
{
    public async Task<ApiResult<PagedResult<CustomerBookingDto>>> Handle(GetCustomerBookingsQuery request, CancellationToken cancellationToken)
    {
        var query = dbContext.Bookings
            .AsNoTracking()
            .Where(x => x.CustomerProfileId == request.CustomerProfileId)
            .OrderByDescending(x => x.CreatedAt);

        var total = await query.CountAsync(cancellationToken);

        var bookings = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Include(x => x.Service)
            .Include(x => x.Address)
            .Include(x => x.Review)
            .Include(x => x.BookingServices)
            .Include(x => x.Assignment)
            .Include(x => x.CleaningJobDetail)
            .ToListAsync(cancellationToken);

        // Collect all referenced IDs for batched lookup
        var allCleanerIds = new HashSet<Guid>();
        var allSupervisorIds = new HashSet<Guid>();
        var allProviderIds = new HashSet<Guid>();

        foreach (var b in bookings)
        {
            if (b.Assignment?.CleanerProfileId.HasValue == true)
                allCleanerIds.Add(b.Assignment.CleanerProfileId.Value);

            if (b.Assignment?.TeamCleanerProfileIdsJson is not null)
            {
                try
                {
                    var parsed = JsonSerializer.Deserialize<List<Guid>>(b.Assignment.TeamCleanerProfileIdsJson);
                    if (parsed != null) foreach (var id in parsed) allCleanerIds.Add(id);
                }
                catch { /* ignore malformed json */ }
            }

            if (b.Assignment?.SupervisorId.HasValue == true)
                allSupervisorIds.Add(b.Assignment.SupervisorId.Value);

            if (b.Assignment?.ProviderId.HasValue == true)
                allProviderIds.Add(b.Assignment.ProviderId.Value);
        }

        var cleaners = allCleanerIds.Count > 0
            ? await dbContext.CleanerProfiles
                .AsNoTracking()
                .Where(x => allCleanerIds.Contains(x.Id))
                .Include(x => x.User)
                .ToDictionaryAsync(x => x.Id, cancellationToken)
            : new Dictionary<Guid, Infrastructure.Entities.CleanerProfile>();

        var supervisors = allSupervisorIds.Count > 0
            ? await dbContext.Users
                .AsNoTracking()
                .Where(x => allSupervisorIds.Contains(x.Id))
                .ToDictionaryAsync(x => x.Id, cancellationToken)
            : new Dictionary<Guid, Infrastructure.Entities.User>();

        var providers = allProviderIds.Count > 0
            ? await dbContext.Providers
                .AsNoTracking()
                .Where(x => allProviderIds.Contains(x.Id))
                .ToDictionaryAsync(x => x.Id, cancellationToken)
            : new Dictionary<Guid, Infrastructure.Entities.Provider>();

        var items = bookings.Select(b =>
        {
            var assignment = b.Assignment;

            // Team cleaner IDs
            var teamCleanerIds = new List<Guid>();
            if (assignment is not null)
            {
                try
                {
                    var parsed = JsonSerializer.Deserialize<List<Guid>>(assignment.TeamCleanerProfileIdsJson ?? "[]");
                    if (parsed is { Count: > 0 }) teamCleanerIds = parsed;
                    else if (assignment.CleanerProfileId.HasValue) teamCleanerIds = new List<Guid> { assignment.CleanerProfileId.Value };
                }
                catch { if (assignment.CleanerProfileId.HasValue) teamCleanerIds = new List<Guid> { assignment.CleanerProfileId.Value }; }
            }

            // Team members
            var teamMembers = teamCleanerIds
                .Select(id => cleaners.TryGetValue(id, out var cp)
                    ? new TeamMemberDto(cp.Id, cp.UserId, $"{cp.User.FirstName} {cp.User.LastName}", "Cleaner", cp.EmploymentType.ToString(), cp.Skills, cp.ServiceZones, cp.Rating, cp.User.Email, cp.User.PhoneNumber, cp.Status.ToString(), cp.VettingStatus.ToString(), cp.IdDocumentUrl, cp.IdVerifiedAt, cp.ProfilePictureUrl)
                    : null)
                .Where(x => x is not null)
                .Select(x => x!)
                .ToList();

            // Supervisor name
            string? supervisorName = null;
            if (assignment?.SupervisorId is Guid supId && supervisors.TryGetValue(supId, out var supUser))
                supervisorName = $"{supUser.FirstName} {supUser.LastName}";

            // Assignment DTOs
            var assignments = assignment is null
                ? new List<AssignmentDto>()
                : new List<AssignmentDto>
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

            // Job detail
            var jobDetail = b.CleaningJobDetail is null ? null : new CleaningJobDetailDto(
                b.CleaningJobDetail.Id,
                b.CleaningJobDetail.CleaningType,
                b.CleaningJobDetail.NumberOfRooms,
                b.CleaningJobDetail.SquareMeters,
                b.CleaningJobDetail.HasPets,
                b.CleaningJobDetail.SpecialInstructions,
                SafeDeserialize<List<string>>(b.CleaningJobDetail.BeforePhotosJson),
                SafeDeserialize<List<string>>(b.CleaningJobDetail.AfterPhotosJson),
                b.CleaningJobDetail.CleanerNotes,
                b.CleaningJobDetail.TeamDispatchedAt,
                b.CleaningJobDetail.TeamArrivedAt,
                b.CleaningJobDetail.CompletedAt,
                b.CleaningJobDetail.VehicleRegistration,
                b.CleaningJobDetail.VehicleType
            );

            return new CustomerBookingDto(
                b.Id,
                b.ServiceId,
                b.Service?.Name ?? "",
                b.Service?.Category ?? "",
                b.AddressId ?? Guid.Empty,
                b.Address != null ? b.Address.Label : (b.AddressLabel ?? ""),
                b.Address != null
                    ? b.Address.StreetAddress + ", " + b.Address.Suburb + ", " + b.Address.City
                    : (b.AddressStreet ?? "") + ", " + (b.AddressSuburb ?? "") + ", " + (b.AddressCity ?? ""),
                b.ScheduledStart,
                b.ScheduledEnd,
                b.Status,
                b.PaymentStatus,
                b.Price,
                b.Currency,
                b.PayOnsite,
                b.CreatedAt,
                b.Review == null ? null : new ReviewDto(b.Review.Id, b.Review.Rating, b.Review.Comment, b.Review.CreatedAt),
                b.BookingServices.OrderBy(bs => bs.SortOrder).Select(bs => new BookingServiceDto(bs.ServiceId, bs.ServiceName, bs.ServiceCategory, bs.UnitPrice)).ToList(),
                assignments,
                jobDetail
            );
        }).ToList();

        return ApiResult<PagedResult<CustomerBookingDto>>.Success(new PagedResult<CustomerBookingDto>(items, request.Page, request.PageSize, total));
    }

    private static T SafeDeserialize<T>(string json) where T : new()
    {
        if (string.IsNullOrWhiteSpace(json)) return new T();
        try { return JsonSerializer.Deserialize<T>(json) ?? new T(); }
        catch { return new T(); }
    }
}
