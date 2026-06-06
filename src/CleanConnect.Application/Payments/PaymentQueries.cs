using CleanConnect.Application.Common;
using CleanConnect.Infrastructure;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CleanConnect.Application.Payments;

public sealed record GetPaymentByIdQuery(Guid PaymentId) : IRequest<ApiResult<PaymentDto>>;

public sealed class GetPaymentByIdQueryHandler(CleanConnectDbContext dbContext) : IRequestHandler<GetPaymentByIdQuery, ApiResult<PaymentDto>>
{
    public async Task<ApiResult<PaymentDto>> Handle(GetPaymentByIdQuery request, CancellationToken cancellationToken)
    {
        var payment = await dbContext.Payments
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == request.PaymentId, cancellationToken);

        if (payment is null)
            return ApiResult<PaymentDto>.Failure("Payment was not found.");

        var dto = new PaymentDto(
            payment.Id,
            payment.BookingId,
            payment.Amount,
            payment.Currency,
            payment.PaymentMethod,
            payment.Gateway,
            payment.GatewayReference,
            payment.Status,
            payment.PaidAt,
            payment.CreatedAt
        );

        return ApiResult<PaymentDto>.Success(dto);
    }
}
