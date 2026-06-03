using CleanConnect.Application.BusinessProfiles;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace CleanConnect.Api.Controllers;

[ApiController]
[Route("api/v1/membership-plans")]
public sealed class MembershipPlansController(ISender sender) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        var result = await sender.Send(new ListMembershipPlansQuery(), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }
}
