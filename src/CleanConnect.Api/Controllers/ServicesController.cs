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
    public async Task<IActionResult> GetServices(CancellationToken cancellationToken)
    {
        var services = await sender.Send(new GetServicesQuery(), cancellationToken);
        return Ok(services);
    }
}
