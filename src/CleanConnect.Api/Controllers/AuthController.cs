using CleanConnect.Application.Auth;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace CleanConnect.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
public sealed class AuthController(ISender sender) : ControllerBase
{
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginCommand command, CancellationToken cancellationToken)
    {
        var result = await sender.Send(command, cancellationToken);
        return result.Succeeded ? Ok(result) : Unauthorized(result);
    }
}
