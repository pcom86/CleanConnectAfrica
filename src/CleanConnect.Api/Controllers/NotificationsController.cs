using CleanConnect.Application.Notifications;
using MediatR;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace CleanConnect.Api.Controllers;

[ApiController]
[Route("api/v1/notifications")]
[EnableCors("Frontend")]
public sealed class NotificationsController(ISender sender) : ControllerBase
{
    [HttpGet("customer/{customerProfileId:guid}")]
    public async Task<IActionResult> GetCustomerNotifications(Guid customerProfileId, [FromQuery] bool unreadOnly = false, CancellationToken cancellationToken = default)
    {
        var result = await sender.Send(new GetCustomerNotificationsQuery(customerProfileId, unreadOnly), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }

    [HttpPost("{notificationId:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid notificationId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new MarkNotificationReadCommand(notificationId), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }

    [HttpPost("customer/{customerProfileId:guid}/read-all")]
    public async Task<IActionResult> MarkAllRead(Guid customerProfileId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new MarkAllNotificationsReadCommand(customerProfileId), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }
}
