using CleanConnect.Application.Bookings;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace CleanConnect.Api.Controllers;

[ApiController]
[Route("api/v1/provider-bookings")]
public sealed class ProviderBookingsController(ISender sender) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetProviderBookings([FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken cancellationToken = default)
    {
        var result = await sender.Send(new GetProviderBookingsQuery(page, pageSize), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }

    [HttpGet("my")]
    public async Task<IActionResult> GetMyProviderBookings([FromQuery] Guid contactUserId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken cancellationToken = default)
    {
        var result = await sender.Send(new GetMyProviderBookingsQuery(contactUserId, page, pageSize), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }
}
