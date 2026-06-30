using CleanConnect.Application.Common;
using CleanConnect.Application.Users;
using CleanConnect.Infrastructure;
using CleanConnect.Infrastructure.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CleanConnect.Application.BusinessProfiles;

// ------------------------------------------------------------------
// Verify Identity (ID number + document)
// ------------------------------------------------------------------
public sealed record VerifyIdentityCommand(
    Guid ProfileId,
    bool IsSupervisor,
    string IdNumber,
    string IdDocumentBase64) : IRequest<ApiResult<TeamMemberDto>>;

public sealed class VerifyIdentityCommandValidator : AbstractValidator<VerifyIdentityCommand>
{
    public VerifyIdentityCommandValidator()
    {
        RuleFor(x => x.ProfileId).NotEmpty();
        RuleFor(x => x.IdNumber).NotEmpty().MaximumLength(30);
        RuleFor(x => x.IdDocumentBase64).NotEmpty();
    }
}

public sealed class VerifyIdentityCommandHandler(
    CleanConnectDbContext dbContext,
    IIdentityVerificationService identityService)
    : IRequestHandler<VerifyIdentityCommand, ApiResult<TeamMemberDto>>
{
    public async Task<ApiResult<TeamMemberDto>> Handle(VerifyIdentityCommand request, CancellationToken cancellationToken)
    {
        var verification = await identityService.VerifyIdDocumentAsync(request.IdNumber, request.IdDocumentBase64, cancellationToken);

        if (!verification.IsValid)
            return ApiResult<TeamMemberDto>.Failure(verification.Message ?? "Identity verification failed.");

        var now = DateTimeOffset.UtcNow;
        TeamMemberDto? dto = null;

        if (request.IsSupervisor)
        {
            var profile = await dbContext.SupervisorProfiles
                .Include(x => x.User)
                .SingleOrDefaultAsync(x => x.Id == request.ProfileId, cancellationToken);

            if (profile is null)
                return ApiResult<TeamMemberDto>.Failure("Profile was not found.");

            profile.IdDocumentUrl = request.IdDocumentBase64;
            profile.IdVerifiedAt = now;
            profile.UpdatedAt = now;

            profile.User.IdNumber = request.IdNumber;
            profile.User.LivenessRequired = true;
            profile.User.UpdatedAt = now;

            dto = new TeamMemberDto(
                profile.Id, profile.UserId,
                $"{profile.User.FirstName} {profile.User.LastName}",
                "Supervisor", profile.EmploymentType.ToString(),
                profile.Skills, profile.ServiceZones, profile.Rating,
                profile.User.Email, profile.User.PhoneNumber,
                profile.Status.ToString(), profile.VettingStatus.ToString(),
                profile.IdDocumentUrl, profile.IdVerifiedAt, profile.ProfilePictureUrl);
        }
        else
        {
            var profile = await dbContext.CleanerProfiles
                .Include(x => x.User)
                .SingleOrDefaultAsync(x => x.Id == request.ProfileId, cancellationToken);

            if (profile is null)
                return ApiResult<TeamMemberDto>.Failure("Profile was not found.");

            profile.IdDocumentUrl = request.IdDocumentBase64;
            profile.IdVerifiedAt = now;
            profile.UpdatedAt = now;

            profile.User.IdNumber = request.IdNumber;
            profile.User.LivenessRequired = true;
            profile.User.UpdatedAt = now;

            dto = new TeamMemberDto(
                profile.Id, profile.UserId,
                $"{profile.User.FirstName} {profile.User.LastName}",
                profile.StaffRole.ToString(), profile.EmploymentType.ToString(),
                profile.Skills, profile.ServiceZones, profile.Rating,
                profile.User.Email, profile.User.PhoneNumber,
                profile.Status.ToString(), profile.VettingStatus.ToString(),
                profile.IdDocumentUrl, profile.IdVerifiedAt, profile.ProfilePictureUrl);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return ApiResult<TeamMemberDto>.Success(dto);
    }
}

// ------------------------------------------------------------------
// Verify Liveness (selfie vs ID document)
// ------------------------------------------------------------------
public sealed record VerifyLivenessCommand(
    Guid UserId,
    string SelfieBase64) : IRequest<ApiResult<UserDto>>;

public sealed class VerifyLivenessCommandValidator : AbstractValidator<VerifyLivenessCommand>
{
    public VerifyLivenessCommandValidator()
    {
        RuleFor(x => x.UserId).NotEmpty();
        RuleFor(x => x.SelfieBase64).NotEmpty();
    }
}

public sealed class VerifyLivenessCommandHandler(
    CleanConnectDbContext dbContext,
    IIdentityVerificationService identityService)
    : IRequestHandler<VerifyLivenessCommand, ApiResult<UserDto>>
{
    public async Task<ApiResult<UserDto>> Handle(VerifyLivenessCommand request, CancellationToken cancellationToken)
    {
        var user = await dbContext.Users
            .Include(x => x.CleanerProfile)
            .Include(x => x.SupervisorProfile)
            .SingleOrDefaultAsync(x => x.Id == request.UserId, cancellationToken);

        if (user is null)
            return ApiResult<UserDto>.Failure("User not found.");

        var idDocument = user.CleanerProfile?.IdDocumentUrl ?? user.SupervisorProfile?.IdDocumentUrl;
        if (string.IsNullOrWhiteSpace(idDocument))
            return ApiResult<UserDto>.Failure("No ID document on file. Please complete ID verification first.");

        var result = await identityService.VerifyLivenessAsync(request.SelfieBase64, idDocument, cancellationToken);

        if (!result.IsLive || !result.FaceMatch)
            return ApiResult<UserDto>.Failure(result.Message ?? "Liveness verification failed. Please ensure you are in a well-lit area and your face is clearly visible.");

        var now = DateTimeOffset.UtcNow;
        user.LivenessVerifiedAt = now;
        user.LivenessRequired = false;
        user.UpdatedAt = now;

        await dbContext.SaveChangesAsync(cancellationToken);
        return ApiResult<UserDto>.Success(UserMappings.ToDto(user));
    }
}
