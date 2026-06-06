using CleanConnect.Application.Common;
using CleanConnect.Infrastructure;
using CleanConnect.Infrastructure.Entities;
using CleanConnect.Infrastructure.Services;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OzowSettings = CleanConnect.Infrastructure.Services.OzowSettings;

namespace CleanConnect.Application.Payments;

public sealed record CreateBookingPaymentCommand(Guid BookingId, Guid CustomerProfileId) : IRequest<ApiResult<PaymentUrlDto>>;

public sealed record ConfirmBookingPaymentCommand(Guid PaymentId, string Gateway, string GatewayReference, string Status) : IRequest<ApiResult<PaymentDto>>;

public sealed class CreateBookingPaymentCommandHandler(
    CleanConnectDbContext dbContext,
    IOzowPaymentService ozowService,
    IOptions<OzowSettings> ozowSettings,
    ILogger<CreateBookingPaymentCommandHandler> logger)
    : IRequestHandler<CreateBookingPaymentCommand, ApiResult<PaymentUrlDto>>
{
    public async Task<ApiResult<PaymentUrlDto>> Handle(CreateBookingPaymentCommand request, CancellationToken cancellationToken)
    {
        var booking = await dbContext.Bookings
            .AsNoTracking()
            .Include(b => b.Service)
            .FirstOrDefaultAsync(b => b.Id == request.BookingId && b.CustomerProfileId == request.CustomerProfileId, cancellationToken);

        if (booking is null)
            return ApiResult<PaymentUrlDto>.Failure("Booking was not found.");

        if (booking.Status != BookingStatus.PendingPayment)
            return ApiResult<PaymentUrlDto>.Failure("Booking is not awaiting payment.");

        var existingPayment = await dbContext.Payments
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.BookingId == request.BookingId, cancellationToken);

        if (existingPayment is not null && existingPayment.Status == PaymentStatus.Paid)
            return ApiResult<PaymentUrlDto>.Failure("Payment has already been completed for this booking.");

        var settings = ozowSettings.Value;
        var reference = $"CC-BOOKING-{booking.Id:N}";
        var bankRef = $"CC-{booking.Id.ToString()[..8].ToUpper()}";

        var frontendBase = settings.FrontendBaseUrl?.TrimEnd('/') ?? "http://localhost:3000";
        var apiBase = settings.ApiBaseUrl?.TrimEnd('/') ?? "http://localhost:5000";

        var ozowRequest = new OzowPaymentRequest(
            settings.SiteCode,
            "ZA",
            "ZAR",
            booking.Price,
            reference,
            bankRef,
            $"{frontendBase}/dashboard/payment?status=cancel&bookingId={booking.Id}",
            $"{frontendBase}/dashboard/payment?status=error&bookingId={booking.Id}",
            $"{frontendBase}/dashboard/payment?status=success&bookingId={booking.Id}",
            $"{apiBase}/api/v1/payments/notify",
            settings.IsTest,
            settings.PrivateKey
        );

        var ozowResponse = await ozowService.GeneratePaymentUrlAsync(ozowRequest, cancellationToken);

        if (string.IsNullOrEmpty(ozowResponse.Url))
        {
            logger.LogError("Ozow payment URL generation failed for booking {BookingId}: {Error}", booking.Id, ozowResponse.Error);
            return ApiResult<PaymentUrlDto>.Failure($"Payment gateway error: {ozowResponse.Error ?? "Unable to generate payment link."}");
        }

        var now = DateTimeOffset.UtcNow;
        Payment payment;

        if (existingPayment is not null)
        {
            existingPayment.GatewayReference = reference;
            existingPayment.UpdatedAt = now;
            dbContext.Payments.Update(existingPayment);
            payment = existingPayment;
        }
        else
        {
            payment = new Payment
            {
                Id = Guid.NewGuid(),
                BookingId = booking.Id,
                CustomerProfileId = request.CustomerProfileId,
                Amount = booking.Price,
                Currency = booking.Currency,
                PaymentMethod = "Instant EFT",
                Gateway = "Ozow",
                GatewayReference = reference,
                Status = PaymentStatus.Pending,
                CreatedAt = now,
                UpdatedAt = now
            };
            dbContext.Payments.Add(payment);
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        return ApiResult<PaymentUrlDto>.Success(new PaymentUrlDto(payment.Id, ozowResponse.Url, payment.Amount, payment.Currency));
    }
}

public sealed class ConfirmBookingPaymentCommandHandler(
    CleanConnectDbContext dbContext,
    ILogger<ConfirmBookingPaymentCommandHandler> logger)
    : IRequestHandler<ConfirmBookingPaymentCommand, ApiResult<PaymentDto>>
{
    public async Task<ApiResult<PaymentDto>> Handle(ConfirmBookingPaymentCommand request, CancellationToken cancellationToken)
    {
        var payment = await dbContext.Payments
            .Include(p => p.Booking)
            .FirstOrDefaultAsync(p => p.Id == request.PaymentId, cancellationToken);

        if (payment is null)
            return ApiResult<PaymentDto>.Failure("Payment was not found.");

        if (payment.Status == PaymentStatus.Paid)
            return ApiResult<PaymentDto>.Success(MapToDto(payment));

        var now = DateTimeOffset.UtcNow;

        if (request.Status.Equals("Complete", StringComparison.OrdinalIgnoreCase) ||
            request.Status.Equals("Success", StringComparison.OrdinalIgnoreCase) ||
            request.Status.Equals("Paid", StringComparison.OrdinalIgnoreCase))
        {
            payment.Status = PaymentStatus.Paid;
            payment.PaidAt = now;
            payment.Gateway = request.Gateway;
            payment.GatewayReference = request.GatewayReference;
            payment.UpdatedAt = now;

            if (payment.Booking is not null)
            {
                payment.Booking.Status = BookingStatus.Confirmed;
                payment.Booking.PaymentStatus = PaymentStatus.Paid;
                payment.Booking.UpdatedAt = now;
            }

            logger.LogInformation("Payment {PaymentId} confirmed for booking {BookingId}", payment.Id, payment.BookingId);
        }
        else if (request.Status.Equals("Failed", StringComparison.OrdinalIgnoreCase) ||
                 request.Status.Equals("Error", StringComparison.OrdinalIgnoreCase))
        {
            payment.Status = PaymentStatus.Failed;
            payment.UpdatedAt = now;
            logger.LogWarning("Payment {PaymentId} failed for booking {BookingId}", payment.Id, payment.BookingId);
        }
        else
        {
            payment.Gateway = request.Gateway;
            payment.GatewayReference = request.GatewayReference;
            payment.UpdatedAt = now;
            logger.LogInformation("Payment {PaymentId} updated with status {Status}", payment.Id, request.Status);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return ApiResult<PaymentDto>.Success(MapToDto(payment));
    }

    private static PaymentDto MapToDto(Payment p) => new(
        p.Id,
        p.BookingId,
        p.Amount,
        p.Currency,
        p.PaymentMethod,
        p.Gateway,
        p.GatewayReference,
        p.Status,
        p.PaidAt,
        p.CreatedAt
    );
}
