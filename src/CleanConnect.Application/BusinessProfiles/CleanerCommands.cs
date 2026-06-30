using CleanConnect.Application.Common;
using CleanConnect.Application.Users;
using CleanConnect.Infrastructure;
using CleanConnect.Infrastructure.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CleanConnect.Application.BusinessProfiles;

public sealed record RegisterCleanerCommand(
    string FirstName,
    string LastName,
    string Email,
    string PhoneNumber,
    string PasswordHash,
    Guid? ProviderId,
    EmploymentType EmploymentType,
    string Skills,
    string ServiceZones,
    StaffRole StaffRole = StaffRole.Cleaner,
    string? IdNumber = null,
    string? IdDocumentUrl = null,
    string? ProfilePictureUrl = null
) : IRequest<ApiResult<UserDto>>;

public sealed class RegisterCleanerCommandValidator : AbstractValidator<RegisterCleanerCommand>
{
    public RegisterCleanerCommandValidator()
    {
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(255);
        RuleFor(x => x.PhoneNumber).NotEmpty().MaximumLength(30);
        RuleFor(x => x.PasswordHash).NotEmpty().MaximumLength(500);
        RuleFor(x => x.EmploymentType).IsInEnum();
        RuleFor(x => x.Skills).NotEmpty().MaximumLength(1000);
        RuleFor(x => x.ServiceZones).NotEmpty().MaximumLength(500);
        RuleFor(x => x.StaffRole).IsInEnum();
        RuleFor(x => x.IdNumber)
            .NotEmpty().WithMessage("ID Number is required.")
            .Matches(@"^\d{13}$").WithMessage("ID Number must be exactly 13 digits.");
        RuleFor(x => x.IdDocumentUrl)
            .NotEmpty().WithMessage("ID Document photo is required.");
    }
}

public sealed class RegisterCleanerCommandHandler(CleanConnectDbContext dbContext)
    : IRequestHandler<RegisterCleanerCommand, ApiResult<UserDto>>
{
    public async Task<ApiResult<UserDto>> Handle(RegisterCleanerCommand request, CancellationToken cancellationToken)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var normalizedPhone = request.PhoneNumber.Trim();

        var duplicate = await dbContext.Users.AnyAsync(
            x => x.Email == normalizedEmail || x.PhoneNumber == normalizedPhone, cancellationToken);
        if (duplicate)
            return ApiResult<UserDto>.Failure("A user with this email or phone number already exists.");

        if (request.ProviderId is Guid providerId)
        {
            var providerApproved = await dbContext.Providers.AnyAsync(
                x => x.Id == providerId && x.Status == ProviderStatus.Approved, cancellationToken);
            if (!providerApproved)
                return ApiResult<UserDto>.Failure("Provider not found or is not approved.");
        }

        var now = DateTimeOffset.UtcNow;
        var user = new User
        {
            Id = Guid.NewGuid(),
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Email = normalizedEmail,
            PhoneNumber = normalizedPhone,
            PasswordHash = request.PasswordHash,
            Role = UserRole.Cleaner,
            Status = AccountStatus.Active,
            IdNumber = request.IdNumber,
            CreatedAt = now,
            UpdatedAt = now,
            CleanerProfile = new CleanerProfile
            {
                Id = Guid.NewGuid(),
                UserId = Guid.Empty,
                ProviderId = request.ProviderId,
                EmploymentType = request.EmploymentType,
                StaffRole = request.StaffRole,
                Skills = request.Skills,
                ServiceZones = request.ServiceZones,
                Status = AccountStatus.Active,
                IdDocumentUrl = request.IdDocumentUrl,
                ProfilePictureUrl = request.ProfilePictureUrl,
                CreatedAt = now,
                UpdatedAt = now
            }
        };

        user.CleanerProfile!.UserId = user.Id;

        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ApiResult<UserDto>.Success(UserMappings.ToDto(user));
    }
}

// --- List cleaners for a provider ---
public sealed record GetProviderCleanersQuery(Guid ProviderId) : IRequest<ApiResult<List<CleanerProfileDto>>>;

public sealed class GetProviderCleanersQueryHandler(CleanConnectDbContext dbContext) : IRequestHandler<GetProviderCleanersQuery, ApiResult<List<CleanerProfileDto>>>
{
    public async Task<ApiResult<List<CleanerProfileDto>>> Handle(GetProviderCleanersQuery request, CancellationToken cancellationToken)
    {
        var items = await dbContext.CleanerProfiles
            .AsNoTracking()
            .Where(x => x.ProviderId == request.ProviderId && x.Status == AccountStatus.Active)
            .Select(x => new CleanerProfileDto(x.Id, x.ProviderId, x.EmploymentType, x.StaffRole, x.Skills, x.ServiceZones, x.Rating, x.Status, x.VettingStatus, x.VettingNotes, x.VettedAt, x.IdDocumentUrl, x.IdVerifiedAt, x.ProfilePictureUrl))
            .ToListAsync(cancellationToken);

        return ApiResult<List<CleanerProfileDto>>.Success(items);
    }
}

// --- Get full team (cleaners + supervisors) with names ---
public sealed record GetProviderTeamQuery(Guid ProviderId) : IRequest<ApiResult<List<TeamMemberDto>>>;

public sealed class GetProviderTeamQueryHandler(CleanConnectDbContext dbContext)
    : IRequestHandler<GetProviderTeamQuery, ApiResult<List<TeamMemberDto>>>
{
    public async Task<ApiResult<List<TeamMemberDto>>> Handle(GetProviderTeamQuery request, CancellationToken cancellationToken)
    {
        var cleaners = await dbContext.CleanerProfiles
            .AsNoTracking()
            .Include(x => x.User)
            .Where(x => x.ProviderId == request.ProviderId && x.Status == AccountStatus.Active)
            .Select(x => new TeamMemberDto(
                x.Id,
                x.UserId,
                $"{x.User.FirstName} {x.User.LastName}",
                x.StaffRole.ToString(),
                x.EmploymentType.ToString(),
                x.Skills,
                x.ServiceZones,
                x.Rating,
                x.User.Email,
                x.User.PhoneNumber,
                x.Status.ToString(),
                x.VettingStatus.ToString(),
                x.IdDocumentUrl,
                x.IdVerifiedAt,
                x.ProfilePictureUrl))
            .ToListAsync(cancellationToken);

        var supervisors = await dbContext.SupervisorProfiles
            .AsNoTracking()
            .Include(x => x.User)
            .Where(x => x.ProviderId == request.ProviderId && x.Status == AccountStatus.Active)
            .Select(x => new TeamMemberDto(
                x.Id,
                x.UserId,
                $"{x.User.FirstName} {x.User.LastName}",
                "Supervisor",
                x.EmploymentType.ToString(),
                x.Skills,
                x.ServiceZones,
                x.Rating,
                x.User.Email,
                x.User.PhoneNumber,
                x.Status.ToString(),
                x.VettingStatus.ToString(),
                x.IdDocumentUrl,
                x.IdVerifiedAt,
                x.ProfilePictureUrl))
            .ToListAsync(cancellationToken);

        return ApiResult<List<TeamMemberDto>>.Success(cleaners.Concat(supervisors).ToList());
    }
}

// --- Update Vetting Status ---
public sealed record UpdateVettingStatusCommand(
    Guid ProfileId,
    bool IsSupervisor,
    VettingStatus NewStatus,
    string? Notes) : IRequest<ApiResult<TeamMemberDto>>;

public sealed class UpdateVettingStatusCommandValidator : AbstractValidator<UpdateVettingStatusCommand>
{
    public UpdateVettingStatusCommandValidator()
    {
        RuleFor(x => x.ProfileId).NotEmpty();
        RuleFor(x => x.NewStatus).IsInEnum();
    }
}

public sealed class UpdateVettingStatusCommandHandler(CleanConnectDbContext dbContext)
    : IRequestHandler<UpdateVettingStatusCommand, ApiResult<TeamMemberDto>>
{
    public async Task<ApiResult<TeamMemberDto>> Handle(UpdateVettingStatusCommand request, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        TeamMemberDto? dto = null;

        if (request.IsSupervisor)
        {
            var profile = await dbContext.SupervisorProfiles
                .Include(x => x.User)
                .SingleOrDefaultAsync(x => x.Id == request.ProfileId, cancellationToken);

            if (profile is null)
                return ApiResult<TeamMemberDto>.Failure("Profile was not found.");

            profile.VettingStatus = request.NewStatus;
            profile.VettingNotes = request.Notes;
            profile.VettedAt = request.NewStatus == VettingStatus.Vetted ? now : profile.VettedAt;
            profile.UpdatedAt = now;

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

            profile.VettingStatus = request.NewStatus;
            profile.VettingNotes = request.Notes;
            profile.VettedAt = request.NewStatus == VettingStatus.Vetted ? now : profile.VettedAt;
            profile.UpdatedAt = now;

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

// --- Verify ID Document ---
public sealed record VerifyIdDocumentCommand(
    Guid ProfileId,
    bool IsSupervisor) : IRequest<ApiResult<TeamMemberDto>>;

public sealed class VerifyIdDocumentCommandValidator : AbstractValidator<VerifyIdDocumentCommand>
{
    public VerifyIdDocumentCommandValidator()
    {
        RuleFor(x => x.ProfileId).NotEmpty();
    }
}

public sealed class VerifyIdDocumentCommandHandler(CleanConnectDbContext dbContext)
    : IRequestHandler<VerifyIdDocumentCommand, ApiResult<TeamMemberDto>>
{
    public async Task<ApiResult<TeamMemberDto>> Handle(VerifyIdDocumentCommand request, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        TeamMemberDto? dto = null;

        if (request.IsSupervisor)
        {
            var profile = await dbContext.SupervisorProfiles
                .Include(x => x.User)
                .SingleOrDefaultAsync(x => x.Id == request.ProfileId, cancellationToken);

            if (profile is null)
                return ApiResult<TeamMemberDto>.Failure("Profile was not found.");

            profile.IdVerifiedAt = now;
            profile.UpdatedAt = now;

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

            profile.IdVerifiedAt = now;
            profile.UpdatedAt = now;

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
