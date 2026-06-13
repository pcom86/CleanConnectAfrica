using CleanConnect.Application.BusinessProfiles;
using CleanConnect.Infrastructure.Entities;
using MediatR;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace CleanConnect.Api.Controllers;

[ApiController]
[Route("api/v1/cleaners")]
[EnableCors("Frontend")]
public sealed class CleanersController(ISender sender) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetCleaners([FromQuery] Guid providerId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GetProviderCleanersQuery(providerId), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }

    [HttpPost]
    public async Task<IActionResult> Register([FromBody] RegisterCleanerCommand command, CancellationToken cancellationToken)
    {
        try
        {
            var result = await sender.Send(command with { StaffRole = StaffRole.Cleaner }, cancellationToken);
            return result.Succeeded ? Ok(result) : BadRequest(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message, type = ex.GetType().Name, inner = ex.InnerException?.Message });
        }
    }
}
