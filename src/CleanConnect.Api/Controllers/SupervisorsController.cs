using CleanConnect.Application.BusinessProfiles;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace CleanConnect.Api.Controllers;

[ApiController]
[Route("api/v1/supervisors")]
public sealed class SupervisorsController(ISender sender) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetSupervisors([FromQuery] Guid providerId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GetProviderSupervisorsQuery(providerId), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }

    [HttpGet("my-bookings")]
    public async Task<IActionResult> GetMyBookings([FromQuery] Guid supervisorUserId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GetSupervisorBookingsQuery(supervisorUserId), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }

    [HttpPost]
    public async Task<IActionResult> Register([FromBody] RegisterSupervisorCommand command, CancellationToken cancellationToken)
    {
        var result = await sender.Send(command, cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }

    [HttpPost("check-in")]
    public async Task<IActionResult> CheckIn([FromBody] CheckInCommand command, CancellationToken cancellationToken)
    {
        var result = await sender.Send(command, cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }

    [HttpPost("check-out")]
    public async Task<IActionResult> CheckOut([FromBody] CheckOutCommand command, CancellationToken cancellationToken)
    {
        var result = await sender.Send(command, cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }

    [HttpPost("post-job-report")]
    public async Task<IActionResult> CreatePostJobReport([FromBody] CreatePostJobReportCommand command, CancellationToken cancellationToken)
    {
        var result = await sender.Send(command, cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }

    [HttpGet("post-job-report/{bookingId:guid}")]
    public async Task<IActionResult> GetPostJobReport(Guid bookingId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GetPostJobReportQuery(bookingId), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }

    [HttpGet("check-ins/{bookingId:guid}")]
    public async Task<IActionResult> GetCheckIns(Guid bookingId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GetBookingCheckInsQuery(bookingId), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }

    [HttpGet("check-outs/{bookingId:guid}")]
    public async Task<IActionResult> GetCheckOuts(Guid bookingId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GetBookingCheckOutsQuery(bookingId), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }
}
