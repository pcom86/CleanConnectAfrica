using CleanConnect.Application.Common;
using CleanConnect.Application.Users;
using CleanConnect.Infrastructure;
using CleanConnect.Infrastructure.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CleanConnect.Application.Auth;

public sealed record LoginCommand(string Email, string Password) : IRequest<ApiResult<UserDto>>;

public sealed class LoginCommandValidator : AbstractValidator<LoginCommand>
{
    public LoginCommandValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty();
    }
}

public sealed class LoginCommandHandler(CleanConnectDbContext dbContext)
    : IRequestHandler<LoginCommand, ApiResult<UserDto>>
{
    public async Task<ApiResult<UserDto>> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var user = await dbContext.Users
            .Include(x => x.CustomerProfile)
            .Include(x => x.CleanerProfile)
            .Include(x => x.SupervisorProfile)
            .SingleOrDefaultAsync(x => x.Email == normalizedEmail, cancellationToken);

        if (user is null || user.PasswordHash != request.Password)
            return ApiResult<UserDto>.Failure("Invalid email or password.");

        if (user.Status != AccountStatus.Active)
            return ApiResult<UserDto>.Failure("Account is not active. Please contact support.");

        if (user.MustChangePassword)
            return ApiResult<UserDto>.Failure("Password change required. Please change your password to continue.", "MustChangePassword");

        return ApiResult<UserDto>.Success(UserMappings.ToDto(user));
    }
}

public sealed record ChangePasswordCommand(string Email, string CurrentPassword, string NewPassword) : IRequest<ApiResult<UserDto>>;

public sealed class ChangePasswordCommandValidator : AbstractValidator<ChangePasswordCommand>
{
    public ChangePasswordCommandValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.CurrentPassword).NotEmpty();
        RuleFor(x => x.NewPassword).NotEmpty().MinimumLength(8);
    }
}

public sealed class ChangePasswordCommandHandler(CleanConnectDbContext dbContext)
    : IRequestHandler<ChangePasswordCommand, ApiResult<UserDto>>
{
    public async Task<ApiResult<UserDto>> Handle(ChangePasswordCommand request, CancellationToken cancellationToken)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var user = await dbContext.Users
            .Include(x => x.CustomerProfile)
            .Include(x => x.CleanerProfile)
            .Include(x => x.SupervisorProfile)
            .SingleOrDefaultAsync(x => x.Email == normalizedEmail, cancellationToken);

        if (user is null)
            return ApiResult<UserDto>.Failure("User not found.");

        if (user.PasswordHash != request.CurrentPassword)
            return ApiResult<UserDto>.Failure("Current password is incorrect.");

        if (user.Status != AccountStatus.Active)
            return ApiResult<UserDto>.Failure("Account is not active. Please contact support.");

        var now = DateTimeOffset.UtcNow;
        user.PasswordHash = request.NewPassword;
        user.MustChangePassword = false;
        user.UpdatedAt = now;

        await dbContext.SaveChangesAsync(cancellationToken);

        return ApiResult<UserDto>.Success(UserMappings.ToDto(user));
    }
}
