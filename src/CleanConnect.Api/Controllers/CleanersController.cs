using CleanConnect.Application.BusinessProfiles;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace CleanConnect.Api.Controllers;

[ApiController]
[Route("api/v1/cleaners")]
public sealed class CleanersController(ISender sender) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Register([FromBody] RegisterCleanerCommand command, CancellationToken cancellationToken)
    {
        var result = await sender.Send(command, cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }
}
