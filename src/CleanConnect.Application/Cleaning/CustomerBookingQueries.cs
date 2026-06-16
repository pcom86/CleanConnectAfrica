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

        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Include(x => x.Service)
            .Include(x => x.Address)
            .Include(x => x.Review)
            .Select(x => new CustomerBookingDto(
                x.Id,
                x.ServiceId,
                x.Service.Name,
                x.Service.Category,
                x.AddressId ?? Guid.Empty,
                x.Address != null ? x.Address.Label : (x.AddressLabel ?? ""),
                x.Address != null
                    ? x.Address.StreetAddress + ", " + x.Address.Suburb + ", " + x.Address.City
                    : (x.AddressStreet ?? "") + ", " + (x.AddressSuburb ?? "") + ", " + (x.AddressCity ?? ""),
                x.ScheduledStart,
                x.ScheduledEnd,
                x.Status,
                x.PaymentStatus,
                x.Price,
                x.Currency,
                x.PayOnsite,
                x.CreatedAt,
                x.Review == null ? null : new ReviewDto(x.Review.Id, x.Review.Rating, x.Review.Comment, x.Review.CreatedAt)))
            .ToListAsync(cancellationToken);

        return ApiResult<PagedResult<CustomerBookingDto>>.Success(new PagedResult<CustomerBookingDto>(items, request.Page, request.PageSize, total));
    }
}
