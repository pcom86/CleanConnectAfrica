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
    string ServiceZones
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
            CreatedAt = now,
            UpdatedAt = now,
            CleanerProfile = new CleanerProfile
            {
                Id = Guid.NewGuid(),
                UserId = Guid.Empty,
                ProviderId = request.ProviderId,
                EmploymentType = request.EmploymentType,
                Skills = request.Skills,
                ServiceZones = request.ServiceZones,
                Status = AccountStatus.Active,
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
