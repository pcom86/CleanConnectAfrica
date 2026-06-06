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
            .Select(x => new CustomerBookingDto(
                x.Id,
                x.ServiceId,
                x.Service.Name,
                x.Service.Category,
                x.AddressId,
                x.Address.Label,
                $"{x.Address.StreetAddress}, {x.Address.Suburb}, {x.Address.City}",
                x.ScheduledStart,
                x.ScheduledEnd,
                x.Status,
                x.PaymentStatus,
                x.Price,
                x.Currency,
                x.PayOnsite,
                x.CreatedAt))
            .ToListAsync(cancellationToken);

        return ApiResult<PagedResult<CustomerBookingDto>>.Success(new PagedResult<CustomerBookingDto>(items, request.Page, request.PageSize, total));
    }
}
