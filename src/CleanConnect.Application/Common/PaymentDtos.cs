using CleanConnect.Infrastructure.Entities;

namespace CleanConnect.Application.Common;

public sealed record PaymentDto(
    Guid Id,
    Guid BookingId,
    decimal Amount,
    string Currency,
    string PaymentMethod,
    string Gateway,
    string GatewayReference,
    PaymentStatus Status,
    DateTimeOffset? PaidAt,
    DateTimeOffset CreatedAt
);

public sealed record PaymentUrlDto(Guid PaymentId, string PaymentUrl, decimal Amount, string Currency);

public sealed record ConfirmBookingPaymentRequest(
    Guid PaymentId,
    string Gateway,
    string GatewayReference,
    string Status
);
