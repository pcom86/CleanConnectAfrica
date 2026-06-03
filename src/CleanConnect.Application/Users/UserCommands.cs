using CleanConnect.Application.Common;
using CleanConnect.Infrastructure;
using CleanConnect.Infrastructure.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CleanConnect.Application.Users;

public sealed record CustomerProfileRequest(CustomerType CustomerType, string? CompanyName, string? VatNumber, string? BillingAddress, string? DefaultPaymentMethodReference);

public sealed record CleanerProfileRequest(Guid? ProviderId, EmploymentType EmploymentType, string Skills, string ServiceZones, AccountStatus Status = AccountStatus.Active);

public sealed record CreateUserCommand(string FirstName, string LastName, string Email, string PhoneNumber, string PasswordHash, UserRole Role, AccountStatus Status = AccountStatus.Active, CustomerProfileRequest? CustomerProfile = null, CleanerProfileRequest? CleanerProfile = null) : IRequest<ApiResult<UserDto>>;

public sealed record UpdateUserRequest(string FirstName, string LastName, string Email, string PhoneNumber, UserRole Role, AccountStatus Status, CustomerProfileRequest? CustomerProfile = null, CleanerProfileRequest? CleanerProfile = null);

public sealed class CreateUserCommandValidator : AbstractValidator<CreateUserCommand>
{
    public CreateUserCommandValidator()
    {
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(255);
        RuleFor(x => x.PhoneNumber).NotEmpty().MaximumLength(30);
        RuleFor(x => x.PasswordHash).NotEmpty().MaximumLength(500);
        RuleFor(x => x.Role).IsInEnum();
        RuleFor(x => x.Status).IsInEnum();
        RuleFor(x => x.CustomerProfile!.CustomerType).IsInEnum().When(x => x.CustomerProfile is not null);
        RuleFor(x => x.CleanerProfile!.EmploymentType).IsInEnum().When(x => x.CleanerProfile is not null);
        RuleFor(x => x.CleanerProfile!.Status).IsInEnum().When(x => x.CleanerProfile is not null);
    }
}

public sealed class CreateUserCommandHandler(CleanConnectDbContext dbContext) : IRequestHandler<CreateUserCommand, ApiResult<UserDto>>
{
    public async Task<ApiResult<UserDto>> Handle(CreateUserCommand request, CancellationToken cancellationToken)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var normalizedPhoneNumber = request.PhoneNumber.Trim();

        var duplicate = await dbContext.Users.AnyAsync(x => x.Email == normalizedEmail || x.PhoneNumber == normalizedPhoneNumber, cancellationToken);
        if (duplicate)
        {
            return ApiResult<UserDto>.Failure("A user with this email address or phone number already exists.");
        }

        if (request.CleanerProfile?.ProviderId is Guid providerId)
        {
            var providerExists = await dbContext.Providers.AnyAsync(x => x.Id == providerId, cancellationToken);
            if (!providerExists)
            {
                return ApiResult<UserDto>.Failure("Provider was not found for the cleaner profile.");
            }
        }

        var now = DateTimeOffset.UtcNow;
        var user = new User
        {
            Id = Guid.NewGuid(),
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Email = normalizedEmail,
            PhoneNumber = normalizedPhoneNumber,
            PasswordHash = request.PasswordHash,
            Role = request.Role,
            Status = request.Status,
            CreatedAt = now,
            UpdatedAt = now
        };

        if (request.CustomerProfile is not null)
        {
            user.CustomerProfile = new CustomerProfile
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                CustomerType = request.CustomerProfile.CustomerType,
                CompanyName = request.CustomerProfile.CompanyName,
                VatNumber = request.CustomerProfile.VatNumber,
                BillingAddress = request.CustomerProfile.BillingAddress,
                DefaultPaymentMethodReference = request.CustomerProfile.DefaultPaymentMethodReference,
                CreatedAt = now,
                UpdatedAt = now
            };
        }

        if (request.CleanerProfile is not null)
        {
            user.CleanerProfile = new CleanerProfile
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                ProviderId = request.CleanerProfile.ProviderId,
                EmploymentType = request.CleanerProfile.EmploymentType,
                Skills = request.CleanerProfile.Skills,
                ServiceZones = request.CleanerProfile.ServiceZones,
                Status = request.CleanerProfile.Status,
                CreatedAt = now,
                UpdatedAt = now
            };
        }

        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ApiResult<UserDto>.Success(UserMappings.ToDto(user));
    }
}

public sealed record UpdateUserCommand(Guid UserId, string FirstName, string LastName, string Email, string PhoneNumber, UserRole Role, AccountStatus Status, CustomerProfileRequest? CustomerProfile = null, CleanerProfileRequest? CleanerProfile = null) : IRequest<ApiResult<UserDto>>;

public sealed class UpdateUserCommandValidator : AbstractValidator<UpdateUserCommand>
{
    public UpdateUserCommandValidator()
    {
        RuleFor(x => x.UserId).NotEmpty();
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(255);
        RuleFor(x => x.PhoneNumber).NotEmpty().MaximumLength(30);
        RuleFor(x => x.Role).IsInEnum();
        RuleFor(x => x.Status).IsInEnum();
        RuleFor(x => x.CustomerProfile!.CustomerType).IsInEnum().When(x => x.CustomerProfile is not null);
        RuleFor(x => x.CleanerProfile!.EmploymentType).IsInEnum().When(x => x.CleanerProfile is not null);
        RuleFor(x => x.CleanerProfile!.Status).IsInEnum().When(x => x.CleanerProfile is not null);
    }
}

public sealed class UpdateUserCommandHandler(CleanConnectDbContext dbContext) : IRequestHandler<UpdateUserCommand, ApiResult<UserDto>>
{
    public async Task<ApiResult<UserDto>> Handle(UpdateUserCommand request, CancellationToken cancellationToken)
    {
        var user = await dbContext.Users
            .Include(x => x.CustomerProfile)
            .Include(x => x.CleanerProfile)
            .SingleOrDefaultAsync(x => x.Id == request.UserId, cancellationToken);

        if (user is null)
        {
            return ApiResult<UserDto>.Failure("User was not found.");
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var normalizedPhoneNumber = request.PhoneNumber.Trim();

        var duplicate = await dbContext.Users.AnyAsync(x => x.Id != request.UserId && (x.Email == normalizedEmail || x.PhoneNumber == normalizedPhoneNumber), cancellationToken);
        if (duplicate)
        {
            return ApiResult<UserDto>.Failure("A user with this email address or phone number already exists.");
        }

        if (request.CleanerProfile?.ProviderId is Guid providerId)
        {
            var providerExists = await dbContext.Providers.AnyAsync(x => x.Id == providerId, cancellationToken);
            if (!providerExists)
            {
                return ApiResult<UserDto>.Failure("Provider was not found for the cleaner profile.");
            }
        }

        var now = DateTimeOffset.UtcNow;
        user.FirstName = request.FirstName.Trim();
        user.LastName = request.LastName.Trim();
        user.Email = normalizedEmail;
        user.PhoneNumber = normalizedPhoneNumber;
        user.Role = request.Role;
        user.Status = request.Status;
        user.UpdatedAt = now;

        UpsertCustomerProfile(user, request.CustomerProfile, now);
        UpsertCleanerProfile(user, request.CleanerProfile, now);

        await dbContext.SaveChangesAsync(cancellationToken);

        return ApiResult<UserDto>.Success(UserMappings.ToDto(user));
    }

    private static void UpsertCustomerProfile(User user, CustomerProfileRequest? request, DateTimeOffset now)
    {
        if (request is null)
        {
            return;
        }

        if (user.CustomerProfile is null)
        {
            user.CustomerProfile = new CustomerProfile
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                CreatedAt = now
            };
        }

        user.CustomerProfile.CustomerType = request.CustomerType;
        user.CustomerProfile.CompanyName = request.CompanyName;
        user.CustomerProfile.VatNumber = request.VatNumber;
        user.CustomerProfile.BillingAddress = request.BillingAddress;
        user.CustomerProfile.DefaultPaymentMethodReference = request.DefaultPaymentMethodReference;
        user.CustomerProfile.UpdatedAt = now;
    }

    private static void UpsertCleanerProfile(User user, CleanerProfileRequest? request, DateTimeOffset now)
    {
        if (request is null)
        {
            return;
        }

        if (user.CleanerProfile is null)
        {
            user.CleanerProfile = new CleanerProfile
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                CreatedAt = now
            };
        }

        user.CleanerProfile.ProviderId = request.ProviderId;
        user.CleanerProfile.EmploymentType = request.EmploymentType;
        user.CleanerProfile.Skills = request.Skills;
        user.CleanerProfile.ServiceZones = request.ServiceZones;
        user.CleanerProfile.Status = request.Status;
        user.CleanerProfile.UpdatedAt = now;
    }
}

public sealed record ListUsersQuery(AccountStatus? Status, UserRole? Role, int Page = 1, int PageSize = 20) : IRequest<ApiResult<PagedResult<UserDto>>>;

public sealed class ListUsersQueryHandler(CleanConnectDbContext dbContext) : IRequestHandler<ListUsersQuery, ApiResult<PagedResult<UserDto>>>
{
    public async Task<ApiResult<PagedResult<UserDto>>> Handle(ListUsersQuery request, CancellationToken cancellationToken)
    {
        var query = dbContext.Users.AsNoTracking();

        if (request.Status.HasValue)
            query = query.Where(x => x.Status == request.Status.Value);

        if (request.Role.HasValue)
            query = query.Where(x => x.Role == request.Role.Value);

        var total = await query.CountAsync(cancellationToken);

        var items = await query
            .Include(x => x.CustomerProfile)
            .Include(x => x.CleanerProfile)
            .OrderByDescending(x => x.CreatedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(x => UserMappings.ToDto(x))
            .ToListAsync(cancellationToken);

        return ApiResult<PagedResult<UserDto>>.Success(new PagedResult<UserDto>(items, request.Page, request.PageSize, total));
    }
}

public sealed record UpdateUserStatusCommand(Guid UserId, AccountStatus NewStatus) : IRequest<ApiResult<UserDto>>;

public sealed class UpdateUserStatusCommandHandler(CleanConnectDbContext dbContext) : IRequestHandler<UpdateUserStatusCommand, ApiResult<UserDto>>
{
    public async Task<ApiResult<UserDto>> Handle(UpdateUserStatusCommand request, CancellationToken cancellationToken)
    {
        var user = await dbContext.Users
            .Include(x => x.CustomerProfile)
            .Include(x => x.CleanerProfile)
            .SingleOrDefaultAsync(x => x.Id == request.UserId, cancellationToken);

        if (user is null)
            return ApiResult<UserDto>.Failure("User was not found.");

        user.Status = request.NewStatus;
        user.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return ApiResult<UserDto>.Success(UserMappings.ToDto(user));
    }
}

internal static class UserMappings
{
    public static UserDto ToDto(User user)
    {
        var customerProfile = user.CustomerProfile is null
            ? null
            : new CustomerProfileDto(user.CustomerProfile.Id, user.CustomerProfile.CustomerType, user.CustomerProfile.CompanyName, user.CustomerProfile.VatNumber, user.CustomerProfile.BillingAddress, user.CustomerProfile.DefaultPaymentMethodReference);

        var cleanerProfile = user.CleanerProfile is null
            ? null
            : new CleanerProfileDto(user.CleanerProfile.Id, user.CleanerProfile.ProviderId, user.CleanerProfile.EmploymentType, user.CleanerProfile.Skills, user.CleanerProfile.ServiceZones, user.CleanerProfile.Rating, user.CleanerProfile.Status);

        return new UserDto(user.Id, user.FirstName, user.LastName, user.Email, user.PhoneNumber, user.Role, user.Status, customerProfile, cleanerProfile);
    }
}
