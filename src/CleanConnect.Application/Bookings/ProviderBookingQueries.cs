using CleanConnect.Application.Common;
using CleanConnect.Infrastructure;
using CleanConnect.Infrastructure.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CleanConnect.Application.Bookings;

public sealed record GetProviderBookingsQuery(int Page = 1, int PageSize = 50, Guid? ProviderContactUserId = null) : IRequest<ApiResult<PagedResult<ProviderBookingDto>>>;

public sealed class GetProviderBookingsQueryHandler(CleanConnectDbContext dbContext) : IRequestHandler<GetProviderBookingsQuery, ApiResult<PagedResult<ProviderBookingDto>>>
{
    public async Task<ApiResult<PagedResult<ProviderBookingDto>>> Handle(GetProviderBookingsQuery request, CancellationToken cancellationToken)
    {
        Provider? provider = null;
        if (request.ProviderContactUserId.HasValue)
        {
            provider = await dbContext.Providers
                .AsNoTracking()
                .SingleOrDefaultAsync(x => x.ContactUserId == request.ProviderContactUserId.Value && x.IsEligibleForBookings, cancellationToken);
        }

        var query = dbContext.Bookings
            .AsNoTracking()
            .Where(x => x.Status == BookingStatus.Confirmed || x.Status == BookingStatus.PendingPayment)
            .OrderByDescending(x => x.CreatedAt);

        var total = await query.CountAsync(cancellationToken);

        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Include(x => x.Service)
            .Include(x => x.Address)
            .Include(x => x.BookingServices)
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
                x.CreatedAt,
                x.BookingServices.OrderBy(bs => bs.SortOrder).Select(bs => new BookingServiceDto(bs.ServiceId, bs.ServiceName, bs.ServiceCategory, bs.UnitPrice)).ToList()))
            .ToListAsync(cancellationToken);

        // If provider is identified, filter to only bookings whose service categories are all covered by the provider.
        if (provider is not null)
        {
            var providerCategories = provider.ServiceCategories.Select(c => c.ToString()).ToHashSet(StringComparer.OrdinalIgnoreCase);
            items = items
                .Where(x =>
                {
                    var categories = (x.Services is { Count: > 0 } ? x.Services.Select(s => s.ServiceCategory) : new[] { x.ServiceCategory }).Where(c => !string.IsNullOrWhiteSpace(c)).ToList();
                    return categories.Count > 0 && categories.All(c => providerCategories.Contains(c));
                })
                .ToList();
            total = items.Count;
        }

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
            .Include(x => x.BookingServices)
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
                x.CreatedAt,
                x.BookingServices.OrderBy(bs => bs.SortOrder).Select(bs => new BookingServiceDto(bs.ServiceId, bs.ServiceName, bs.ServiceCategory, bs.UnitPrice)).ToList()))
            .ToListAsync(cancellationToken);

        return ApiResult<PagedResult<ProviderBookingDto>>.Success(new PagedResult<ProviderBookingDto>(items, request.Page, request.PageSize, total));
    }
}
