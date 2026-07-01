using CleanConnect.Application.Common;
using CleanConnect.Application.Services;
using MediatR;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace CleanConnect.Api.Controllers;

[ApiController]
[Route("api/v1/services")]
[EnableCors("Frontend")]
public sealed class ServicesController(ISender sender) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetServices([FromQuery] bool activeOnly = true, CancellationToken cancellationToken = default)
    {
        var services = await sender.Send(new GetServicesQuery(activeOnly), cancellationToken);
        return Ok(services);
    }

    [HttpPut("{serviceId:guid}")]
    public async Task<IActionResult> UpdateService(Guid serviceId, [FromBody] UpdateServiceRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new UpdateServiceCommand(
            serviceId,
            request.Name,
            request.Description,
            request.Category,
            request.BasePrice,
            request.EstimatedDurationMinutes,
            request.RequiredCleaners,
            request.IsActive
        ), cancellationToken);

        return result.Succeeded ? Ok(result) : BadRequest(result);
    }
}

public sealed record UpdateServiceRequest(
    string? Name = null,
    string? Description = null,
    string? Category = null,
    decimal? BasePrice = null,
    int? EstimatedDurationMinutes = null,
    int? RequiredCleaners = null,
    bool? IsActive = null
);
