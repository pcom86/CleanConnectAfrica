using CleanConnect.Application.Common;
using CleanConnect.Infrastructure;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CleanConnect.Application.Bookings;

public sealed record GetProviderBookingsQuery(int Page = 1, int PageSize = 50) : IRequest<ApiResult<PagedResult<ProviderBookingDto>>>;

public sealed class GetProviderBookingsQueryHandler(CleanConnectDbContext dbContext) : IRequestHandler<GetProviderBookingsQuery, ApiResult<PagedResult<ProviderBookingDto>>>
{
    public async Task<ApiResult<PagedResult<ProviderBookingDto>>> Handle(GetProviderBookingsQuery request, CancellationToken cancellationToken)
    {
        var query = dbContext.Bookings
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAt);

        var total = await query.CountAsync(cancellationToken);

        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Include(x => x.Service)
            .Include(x => x.Address)
            .Select(x => new ProviderBookingDto(
                x.Id,
                x.ServiceId,
                x.Service.Name,
                x.Service.Category,
                x.AddressId ?? Guid.Empty,
                x.Address != null ? x.Address.Label : (x.AddressLabel ?? ""),
                x.Address != null
                    ? x.Address.StreetAddress + ", " + x.Address.Suburb + ", " + x.Address.City
                    : (x.AddressStreet ?? "") + ", " + (x.AddressSuburb ?? "") + ", " + (x.AddressCity ?? ""),
                x.Address != null ? x.Address.Latitude : null,
                x.Address != null ? x.Address.Longitude : null,
                x.ScheduledStart,
                x.ScheduledEnd,
                x.Status,
                x.PaymentStatus,
                x.Price,
                x.Currency,
                x.PayOnsite,
                x.CreatedAt))
            .ToListAsync(cancellationToken);

        return ApiResult<PagedResult<ProviderBookingDto>>.Success(new PagedResult<ProviderBookingDto>(items, request.Page, request.PageSize, total));
    }
}

public sealed record GetMyProviderBookingsQuery(Guid ContactUserId, int Page = 1, int PageSize = 50) : IRequest<ApiResult<PagedResult<ProviderBookingDto>>>;

public sealed class GetMyProviderBookingsQueryHandler(CleanConnectDbContext dbContext) : IRequestHandler<GetMyProviderBookingsQuery, ApiResult<PagedResult<ProviderBookingDto>>>
{
    public async Task<ApiResult<PagedResult<ProviderBookingDto>>> Handle(GetMyProviderBookingsQuery request, CancellationToken cancellationToken)
    {
        // Find the provider for this contact user
        var provider = await dbContext.Providers
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.ContactUserId == request.ContactUserId, cancellationToken);

        if (provider is null)
            return ApiResult<PagedResult<ProviderBookingDto>>.Failure("Provider profile was not found.");

        // Get bookings that have an assignment to this provider
        var bookingIds = await dbContext.Assignments
            .AsNoTracking()
            .Where(x => x.ProviderId == provider.Id)
            .Select(x => x.BookingId)
            .ToListAsync(cancellationToken);

        var query = dbContext.Bookings
            .AsNoTracking()
            .Where(x => bookingIds.Contains(x.Id))
            .OrderByDescending(x => x.CreatedAt);

        var total = await query.CountAsync(cancellationToken);

        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Include(x => x.Service)
            .Include(x => x.Address)
            .Select(x => new ProviderBookingDto(
                x.Id,
                x.ServiceId,
                x.Service.Name,
                x.Service.Category,
                x.AddressId ?? Guid.Empty,
                x.Address != null ? x.Address.Label : (x.AddressLabel ?? ""),
                x.Address != null
                    ? x.Address.StreetAddress + ", " + x.Address.Suburb + ", " + x.Address.City
                    : (x.AddressStreet ?? "") + ", " + (x.AddressSuburb ?? "") + ", " + (x.AddressCity ?? ""),
                x.Address != null ? x.Address.Latitude : null,
                x.Address != null ? x.Address.Longitude : null,
                x.ScheduledStart,
                x.ScheduledEnd,
                x.Status,
                x.PaymentStatus,
                x.Price,
                x.Currency,
                x.PayOnsite,
                x.CreatedAt))
            .ToListAsync(cancellationToken);

        return ApiResult<PagedResult<ProviderBookingDto>>.Success(new PagedResult<ProviderBookingDto>(items, request.Page, request.PageSize, total));
    }
}
