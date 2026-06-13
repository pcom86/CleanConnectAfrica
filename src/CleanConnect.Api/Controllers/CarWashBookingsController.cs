using CleanConnect.Application.CarWash;
using MediatR;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace CleanConnect.Api.Controllers;

[ApiController]
[Route("api/v1/car-wash-bookings")]
[EnableCors("Frontend")]
public sealed class CarWashBookingsController(ISender sender) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> CreateCarWashBooking([FromBody] CreateCarWashBookingCommand command, CancellationToken cancellationToken)
    {
        var result = await sender.Send(command, cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }

    [HttpPut("{bookingId:guid}/status")]
    public async Task<IActionResult> UpdateCarWashStatus(Guid bookingId, [FromBody] UpdateCarWashStatusRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new UpdateCarWashStatusCommand(bookingId, request.Status, request.Notes), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }
}
