using CleanConnect.Application.Users;
using CleanConnect.Infrastructure.Entities;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace CleanConnect.Api.Controllers;

[ApiController]
[Route("api/v1/users")]
public sealed class UsersController(ISender sender) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserCommand command, CancellationToken cancellationToken)
    {
        var result = await sender.Send(command, cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }

    [HttpGet("{userId:guid}")]
    public async Task<IActionResult> GetUser(Guid userId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GetUserByIdQuery(userId), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }

    [HttpPut("{userId:guid}")]
    public async Task<IActionResult> UpdateUser(Guid userId, [FromBody] UpdateUserRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new UpdateUserCommand(userId, request.FirstName, request.LastName, request.Email, request.PhoneNumber, request.Role, request.Status, request.CustomerProfile, request.CleanerProfile), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] AccountStatus? status, [FromQuery] UserRole? role, [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken cancellationToken = default)
    {
        var result = await sender.Send(new ListUsersQuery(status, role, page, pageSize), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }

    [HttpPost("{userId:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid userId, [FromBody] UpdateStatusRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new UpdateUserStatusCommand(userId, request.Status), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }

    [HttpPost("{userId:guid}/addresses")]
    public async Task<IActionResult> AddAddress(Guid userId, [FromBody] AddCustomerAddressRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new AddCustomerAddressCommand(userId, request.Label, request.StreetAddress, request.Suburb, request.City, request.Province, request.PostalCode, request.AccessInstructions), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }
}

public sealed record UpdateStatusRequest(AccountStatus Status);

public sealed record AddCustomerAddressRequest(string Label, string StreetAddress, string Suburb, string City, string Province, string PostalCode, string? AccessInstructions);
