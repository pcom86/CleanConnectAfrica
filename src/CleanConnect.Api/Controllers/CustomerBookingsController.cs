using CleanConnect.Application.Cleaning;
using MediatR;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace CleanConnect.Api.Controllers;

[ApiController]
[Route("api/v1/customer-bookings")]
[EnableCors("Frontend")]
public sealed class CustomerBookingsController(ISender sender) : ControllerBase
{
    [HttpGet("{customerProfileId:guid}")]
    public async Task<IActionResult> GetCustomerBookings(Guid customerProfileId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken cancellationToken = default)
    {
        var result = await sender.Send(new GetCustomerBookingsQuery(customerProfileId, page, pageSize), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }

    [HttpPost("rate")]
    public async Task<IActionResult> RateBooking([FromBody] RateBookingCommand command, CancellationToken cancellationToken)
    {
        var result = await sender.Send(command, cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }
}
