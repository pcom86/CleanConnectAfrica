using CleanConnect.Application.Cleaning;
using CleanConnect.Infrastructure.Entities;
using MediatR;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace CleanConnect.Api.Controllers;

[ApiController]
[Route("api/v1/cleaning-requests")]
[EnableCors("Frontend")]
public sealed class CleaningRequestsController(ISender sender) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> CreateCleaningRequest([FromBody] CreateCleaningRequestCommand command, CancellationToken cancellationToken)
    {
        var result = await sender.Send(command, cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }

    [HttpGet("{cleaningRequestId:guid}/nearby-providers")]
    public async Task<IActionResult> FindNearbyProviders(Guid cleaningRequestId, [FromQuery] decimal? maxDistanceKm, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new FindNearbyProvidersQuery(cleaningRequestId, maxDistanceKm), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }

    [HttpPost("{cleaningRequestId:guid}/accept")]
    public async Task<IActionResult> AcceptCleaningRequest(Guid cleaningRequestId, [FromBody] AcceptCleaningRequestRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new AcceptCleaningRequestCommand(cleaningRequestId, request.ProviderId, request.ResponseNotes), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }
}

public sealed record AcceptCleaningRequestRequest(Guid ProviderId, string? ResponseNotes);
