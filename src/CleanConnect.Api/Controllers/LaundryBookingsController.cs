using CleanConnect.Application.Laundry;
using MediatR;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace CleanConnect.Api.Controllers;

[ApiController]
[Route("api/v1/laundry-bookings")]
[EnableCors("Frontend")]
public sealed class LaundryBookingsController(ISender sender) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> CreateLaundryBooking([FromBody] CreateLaundryBookingCommand command, CancellationToken cancellationToken)
    {
        var result = await sender.Send(command, cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }

    [HttpPut("{bookingId:guid}/status")]
    public async Task<IActionResult> UpdateLaundryStatus(Guid bookingId, [FromBody] UpdateLaundryStatusRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new UpdateLaundryStatusCommand(bookingId, request.Status, request.ActualWeightKg, request.Notes), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }
}
