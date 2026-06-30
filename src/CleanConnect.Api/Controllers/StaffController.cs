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
    StaffRole StaffRole,
    string? IdNumber = null,
    string? IdDocumentUrl = null,
    string? ProfilePictureUrl = null
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
    Guid? ProviderId = null,
    string? IdDocumentUrl = null,
    string? ProfilePictureUrl = null
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
                request.EmploymentType, request.Skills, request.ServiceZones,
                request.IdNumber, request.IdDocumentUrl, request.ProfilePictureUrl);
            var supResult = await sender.Send(supervisorCmd, cancellationToken);
            return supResult.Succeeded ? Ok(supResult) : BadRequest(supResult);
        }

        var cmd = new RegisterCleanerCommand(
            request.FirstName, request.LastName, request.Email,
            request.PhoneNumber, request.PasswordHash, request.ProviderId,
            request.EmploymentType, request.Skills, request.ServiceZones,
            request.StaffRole, request.IdNumber, request.IdDocumentUrl, request.ProfilePictureUrl);
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
                request.Status,
                request.IdDocumentUrl,
                request.ProfilePictureUrl);

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
            request.StaffRole,
            request.IdDocumentUrl,
            request.ProfilePictureUrl);

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

    [HttpPut("{profileId:guid}/vetting")]
    public async Task<IActionResult> UpdateVettingStatus(Guid profileId, [FromBody] UpdateVettingStatusRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new UpdateVettingStatusCommand(profileId, request.IsSupervisor, request.NewStatus, request.Notes), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }

    [HttpPut("{profileId:guid}/verify-id")]
    public async Task<IActionResult> VerifyIdDocument(Guid profileId, [FromBody] VerifyIdDocumentRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new VerifyIdDocumentCommand(profileId, request.IsSupervisor), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }

    [HttpPost("{profileId:guid}/verify-identity")]
    public async Task<IActionResult> VerifyIdentity(Guid profileId, [FromBody] VerifyIdentityRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new VerifyIdentityCommand(profileId, request.IsSupervisor, request.IdNumber, request.IdDocumentBase64), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }
}

public sealed record UpdateVettingStatusRequest(bool IsSupervisor, VettingStatus NewStatus, string? Notes);
public sealed record VerifyIdDocumentRequest(bool IsSupervisor);
public sealed record VerifyIdentityRequest(bool IsSupervisor, string IdNumber, string IdDocumentBase64);
