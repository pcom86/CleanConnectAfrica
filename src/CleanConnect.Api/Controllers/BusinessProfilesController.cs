using CleanConnect.Application.BusinessProfiles;
using CleanConnect.Application.Providers;
using CleanConnect.Infrastructure.Entities;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace CleanConnect.Api.Controllers;

[ApiController]
[Route("api/v1/business-profiles")]
public sealed class BusinessProfilesController(ISender sender) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateBusinessProfileCommand command, CancellationToken cancellationToken)
    {
        var result = await sender.Send(command, cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }

    [HttpGet("{providerId:guid}")]
    public async Task<IActionResult> Get(Guid providerId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GetBusinessProfileQuery(providerId), cancellationToken);
        return result.Succeeded ? Ok(result) : NotFound(result);
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] ServiceCategory? serviceCategory, [FromQuery] ProviderStatus? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken cancellationToken = default)
    {
        var result = await sender.Send(new ListBusinessProfilesQuery(serviceCategory, status, page, pageSize), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }

    [HttpPost("verify")]
    public async Task<IActionResult> Verify([FromBody] VerifyRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new VerifyCompanyQuery(request.RegistrationNumber), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }

    [HttpPost("{providerId:guid}/approve")]
    public async Task<IActionResult> Approve(Guid providerId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new ApproveProviderCommand(providerId), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }

    [HttpPost("{providerId:guid}/reject")]
    public async Task<IActionResult> Reject(Guid providerId, [FromBody] RejectRequest? request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new RejectProviderCommand(providerId, request?.Reason), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }
}

public sealed record VerifyRequest(string RegistrationNumber);

public sealed record RejectRequest(string? Reason);
