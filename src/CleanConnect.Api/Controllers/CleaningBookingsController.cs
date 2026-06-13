using CleanConnect.Application.BusinessProfiles;
using CleanConnect.Application.Cleaning;
using CleanConnect.Infrastructure.Entities;
using MediatR;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace CleanConnect.Api.Controllers;

[ApiController]
[Route("api/v1/cleaning-bookings")]
[EnableCors("Frontend")]
public sealed class CleaningBookingsController(ISender sender) : ControllerBase
{
    [HttpGet("{bookingId:guid}")]
    public async Task<IActionResult> GetBooking(Guid bookingId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GetBookingByIdQuery(bookingId), cancellationToken);
        return result.Succeeded ? Ok(result) : NotFound(result);
    }

    [HttpPost]
    public async Task<IActionResult> CreateCleaningBooking([FromBody] CreateCleaningBookingCommand command, CancellationToken cancellationToken)
    {
        var result = await sender.Send(command, cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }

    [HttpPut("{bookingId:guid}/status")]
    public async Task<IActionResult> UpdateCleaningBookingStatus(Guid bookingId, [FromBody] UpdateCleaningBookingStatusRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new UpdateCleaningBookingStatusCommand(bookingId, request.NewStatus, request.Notes), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }

    [HttpPost("{bookingId:guid}/accept")]
    public async Task<IActionResult> AcceptBooking(Guid bookingId, [FromBody] AcceptBookingRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new AcceptBookingCommand(bookingId, request.ProviderId), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }

    [HttpPost("{bookingId:guid}/assign-cleaner")]
    public async Task<IActionResult> AssignCleaner(Guid bookingId, [FromBody] AssignCleanerRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new AssignCleanerToBookingCommand(bookingId, request.CleanerProfileId), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }

    [HttpPost("{bookingId:guid}/assign-team")]
    public async Task<IActionResult> AssignTeam(Guid bookingId, [FromBody] AssignTeamRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new AssignTeamCommand(bookingId, request.CleanerProfileIds, request.SupervisorProfileId), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }

    [HttpGet("team/{providerId:guid}")]
    public async Task<IActionResult> GetProviderTeam(Guid providerId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GetProviderTeamQuery(providerId), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }

    [HttpPost("{bookingId:guid}/complete")]
    public async Task<IActionResult> CompleteCleaning(Guid bookingId, [FromBody] CompleteCleaningRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new CompleteCleaningCommand(bookingId, request.AfterPhotos, request.CleanerNotes, request.CompletedChecklistItems), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }
}

public sealed record UpdateCleaningBookingStatusRequest(BookingStatus NewStatus, string? Notes);
public sealed record AcceptBookingRequest(Guid ProviderId);
public sealed record AssignCleanerRequest(Guid CleanerProfileId);
public sealed record CompleteCleaningRequest(List<string> AfterPhotos, string? CleanerNotes, List<string>? CompletedChecklistItems);
public sealed record AssignTeamRequest(List<Guid> CleanerProfileIds, Guid? SupervisorProfileId);
