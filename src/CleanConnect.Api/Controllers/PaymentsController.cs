using CleanConnect.Application.Common;
using CleanConnect.Application.Payments;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using GetPaymentByIdQuery = CleanConnect.Application.Payments.GetPaymentByIdQuery;

namespace CleanConnect.Api.Controllers;

[ApiController]
[Route("api/v1/payments")]
public sealed class PaymentsController(ISender sender) : ControllerBase
{
    [HttpPost("bookings/{bookingId:guid}")]
    public async Task<IActionResult> CreateBookingPayment(Guid bookingId, [FromBody] CreateBookingPaymentRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new CreateBookingPaymentCommand(bookingId, request.CustomerProfileId), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }

    [HttpPost("confirm")]
    public async Task<IActionResult> ConfirmPayment([FromBody] ConfirmBookingPaymentRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new ConfirmBookingPaymentCommand(request.PaymentId, request.Gateway, request.GatewayReference, request.Status), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }

    [HttpPost("notify")]
    public async Task<IActionResult> NotifyPayment([FromBody] OzowNotificationRequest request, CancellationToken cancellationToken)
    {
        // Map Ozow notification to our confirm command
        var status = request.Status?.Equals("Complete", StringComparison.OrdinalIgnoreCase) == true ? "Complete" : request.Status ?? "Unknown";
        var result = await sender.Send(new ConfirmBookingPaymentCommand(request.PaymentId, "Ozow", request.TransactionReference ?? string.Empty, status), cancellationToken);
        return result.Succeeded ? Ok() : BadRequest(result);
    }

    [HttpGet("{paymentId:guid}")]
    public async Task<IActionResult> GetPayment(Guid paymentId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GetPaymentByIdQuery(paymentId), cancellationToken);
        return result.Succeeded ? Ok(result) : NotFound(result);
    }
}

public sealed record CreateBookingPaymentRequest(Guid CustomerProfileId);

public sealed record OzowNotificationRequest(
    Guid PaymentId,
    string? TransactionReference,
    string? Status,
    string? Hash
);
