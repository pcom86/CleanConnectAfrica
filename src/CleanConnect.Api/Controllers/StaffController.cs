using CleanConnect.Application.BusinessProfiles;
using CleanConnect.Application.Users;
using CleanConnect.Infrastructure.Entities;
using MediatR;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace CleanConnect.Api.Controllers;

public sealed record RegisterStaffRequest(
    string FirstName,
    string LastName,
    string Email,
    string PhoneNumber,
    string PasswordHash,
    Guid? ProviderId,
    EmploymentType EmploymentType,
    string Skills,
    string ServiceZones,
    StaffRole StaffRole
);

public sealed record UpdateStaffRequest(
    string FirstName,
    string LastName,
    string Email,
    string PhoneNumber,
    EmploymentType EmploymentType,
    string Skills,
    string ServiceZones,
    AccountStatus Status,
    StaffRole StaffRole,
    Guid? ProviderId = null
);

[ApiController]
[Route("api/v1/staff")]
[EnableCors("Frontend")]
public sealed class StaffController(ISender sender) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Register([FromBody] RegisterStaffRequest request, CancellationToken cancellationToken)
    {
        if (request.StaffRole == StaffRole.Supervisor)
        {
            var supervisorCmd = new RegisterSupervisorCommand(
                request.FirstName, request.LastName, request.Email,
                request.PhoneNumber, request.PasswordHash, request.ProviderId,
                request.EmploymentType, request.Skills, request.ServiceZones);
            var supResult = await sender.Send(supervisorCmd, cancellationToken);
            return supResult.Succeeded ? Ok(supResult) : BadRequest(supResult);
        }

        var cmd = new RegisterCleanerCommand(
            request.FirstName, request.LastName, request.Email,
            request.PhoneNumber, request.PasswordHash, request.ProviderId,
            request.EmploymentType, request.Skills, request.ServiceZones,
            request.StaffRole);
        var result = await sender.Send(cmd, cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }

    [HttpPut("{userId:guid}")]
    public async Task<IActionResult> Update(Guid userId, [FromBody] UpdateStaffRequest request, CancellationToken cancellationToken)
    {
        if (request.StaffRole == StaffRole.Supervisor)
        {
            var supervisorProfile = new SupervisorProfileRequest(
                request.ProviderId,
                request.EmploymentType,
                request.Skills,
                request.ServiceZones,
                request.Status);

            var supCmd = new UpdateUserCommand(
                userId,
                request.FirstName,
                request.LastName,
                request.Email,
                request.PhoneNumber,
                UserRole.Supervisor,
                request.Status,
                null,
                null,
                supervisorProfile);

            var supResult = await sender.Send(supCmd, cancellationToken);
            return supResult.Succeeded ? Ok(supResult) : BadRequest(supResult);
        }

        var cleanerProfile = new CleanerProfileRequest(
            request.ProviderId,
            request.EmploymentType,
            request.Skills,
            request.ServiceZones,
            request.Status,
            request.StaffRole);

        var cmd = new UpdateUserCommand(
            userId,
            request.FirstName,
            request.LastName,
            request.Email,
            request.PhoneNumber,
            UserRole.Cleaner,
            request.Status,
            null,
            cleanerProfile);

        var result = await sender.Send(cmd, cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }
}
