using CleanConnect.Application.Cleaning;
using CleanConnect.Infrastructure.Entities;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace CleanConnect.Api.Controllers;

[ApiController]
[Route("api/v1/cleaning-bookings")]
public sealed class CleaningBookingsController(ISender sender) : ControllerBase
{
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

    [HttpPost("{bookingId:guid}/complete")]
    public async Task<IActionResult> CompleteCleaning(Guid bookingId, [FromBody] CompleteCleaningRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new CompleteCleaningCommand(bookingId, request.AfterPhotos, request.CleanerNotes, request.CompletedChecklistItems), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }
}

public sealed record UpdateCleaningBookingStatusRequest(BookingStatus NewStatus, string? Notes);
public sealed record CompleteCleaningRequest(List<string> AfterPhotos, string? CleanerNotes, List<string>? CompletedChecklistItems);
