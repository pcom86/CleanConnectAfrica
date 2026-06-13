using CleanConnect.Application.BusinessProfiles;
using CleanConnect.Application.Providers;
using CleanConnect.Infrastructure.Entities;
using MediatR;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace CleanConnect.Api.Controllers;

[ApiController]
[Route("api/v1/business-profiles")]
[EnableCors("Frontend")]
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

    [HttpGet("me")]
    public async Task<IActionResult> GetMyProfile([FromQuery] Guid contactUserId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GetMyBusinessProfileQuery(contactUserId), cancellationToken);
        return result.Succeeded ? Ok(result) : NotFound(result);
    }

    [HttpPut("{providerId:guid}")]
    public async Task<IActionResult> Update(Guid providerId, [FromBody] UpdateBusinessProfileOwnerRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new UpdateBusinessProfileCommand(
            providerId, request.CompanyName, request.RegistrationNumber, request.TaxNumber,
            request.ServiceCategories, request.BaseLocation, request.StreetAddress, request.Suburb, request.City, request.Province, request.PostalCode,
            request.ServiceAreas, request.Latitude, request.Longitude, request.ServiceRadiusKm,
            request.JoiningFeeAmount, request.CommissionRate, request.IsEligibleForBookings), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }
}

public sealed record UpdateBusinessProfileOwnerRequest(
    string CompanyName,
    string RegistrationNumber,
    string? TaxNumber,
    List<CleanConnect.Infrastructure.Entities.ServiceCategory> ServiceCategories,
    string? BaseLocation,
    string? StreetAddress,
    string? Suburb,
    string? City,
    string? Province,
    string? PostalCode,
    List<string> ServiceAreas,
    decimal? Latitude,
    decimal? Longitude,
    decimal ServiceRadiusKm,
    decimal JoiningFeeAmount,
    decimal CommissionRate,
    bool IsEligibleForBookings
);

public sealed record VerifyRequest(string RegistrationNumber);

public sealed record RejectRequest(string? Reason);
