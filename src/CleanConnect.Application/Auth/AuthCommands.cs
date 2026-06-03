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
            .SingleOrDefaultAsync(x => x.Email == normalizedEmail, cancellationToken);

        if (user is null || user.PasswordHash != request.Password)
            return ApiResult<UserDto>.Failure("Invalid email or password.");

        if (user.Status != AccountStatus.Active)
            return ApiResult<UserDto>.Failure("Account is not active. Please contact support.");

        return ApiResult<UserDto>.Success(UserMappings.ToDto(user));
    }
}
