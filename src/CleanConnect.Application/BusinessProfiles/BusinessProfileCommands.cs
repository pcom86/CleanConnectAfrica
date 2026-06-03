using CleanConnect.Application.Common;
using CleanConnect.Infrastructure;
using CleanConnect.Infrastructure.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CleanConnect.Application.BusinessProfiles;

public sealed record CompanyVerificationResult(bool IsValid, string? CompanyName, string Message);

public sealed record VerifyCompanyQuery(string RegistrationNumber) : IRequest<ApiResult<CompanyVerificationResult>>;

public sealed class VerifyCompanyQueryHandler : IRequestHandler<VerifyCompanyQuery, ApiResult<CompanyVerificationResult>>
{
    public Task<ApiResult<CompanyVerificationResult>> Handle(VerifyCompanyQuery request, CancellationToken cancellationToken)
    {
        // Mocked third-party company verification (CIPC, Experian, etc.)
        // For demo: registrations starting with "INVALID" or "FAIL" are rejected
        var isValid = !request.RegistrationNumber.StartsWith("INVALID", StringComparison.OrdinalIgnoreCase)
                   && !request.RegistrationNumber.StartsWith("FAIL", StringComparison.OrdinalIgnoreCase);

        var message = isValid
            ? $"Company registration {request.RegistrationNumber} verified successfully."
            : $"Company registration {request.RegistrationNumber} could not be verified. The profile will be created and left under review.";

        return Task.FromResult(ApiResult<CompanyVerificationResult>.Success(
            new CompanyVerificationResult(isValid, null, message)));
    }
}

public sealed record CreateBusinessProfileCommand(
    Guid ContactUserId,
    string CompanyName,
    string RegistrationNumber,
    string? TaxNumber,
    List<ServiceCategory> ServiceCategories,
    string? BaseLocation,
    List<string> ServiceAreas,
    decimal? Latitude,
    decimal? Longitude,
    decimal ServiceRadiusKm,
    decimal JoiningFeeAmount,
    decimal CommissionRate,
    Guid? MembershipPlanId = null,
    bool VerificationPassed = true,
    bool PaymentCompleted = false
) : IRequest<ApiResult<BusinessProfileDto>>;

public sealed class CreateBusinessProfileCommandValidator : AbstractValidator<CreateBusinessProfileCommand>
{
    public CreateBusinessProfileCommandValidator()
    {
        RuleFor(x => x.ContactUserId).NotEmpty();
        RuleFor(x => x.CompanyName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.RegistrationNumber).NotEmpty().MaximumLength(100);
        RuleFor(x => x.TaxNumber).MaximumLength(50).When(x => x.TaxNumber is not null);
        RuleFor(x => x.ServiceCategories).NotEmpty().WithMessage("At least one service category is required.");
        RuleFor(x => x.BaseLocation).NotEmpty().MaximumLength(200);
        RuleFor(x => x.ServiceRadiusKm).GreaterThan(0);
        RuleFor(x => x.JoiningFeeAmount).GreaterThanOrEqualTo(0);
        RuleFor(x => x.CommissionRate).InclusiveBetween(0, 1);
    }
}

public sealed class CreateBusinessProfileCommandHandler(CleanConnectDbContext dbContext)
    : IRequestHandler<CreateBusinessProfileCommand, ApiResult<BusinessProfileDto>>
{
    public async Task<ApiResult<BusinessProfileDto>> Handle(CreateBusinessProfileCommand request, CancellationToken cancellationToken)
    {
        var user = await dbContext.Users.FindAsync(new object[] { request.ContactUserId }, cancellationToken);
        if (user is null)
            return ApiResult<BusinessProfileDto>.Failure("Contact user was not found.");

        var duplicate = await dbContext.Providers.AnyAsync(x => x.RegistrationNumber == request.RegistrationNumber, cancellationToken);
        if (duplicate)
            return ApiResult<BusinessProfileDto>.Failure("A business with this registration number already exists.");

        var now = DateTimeOffset.UtcNow;

        ProviderStatus status;
        JoiningFeeStatus joiningFeeStatus;
        bool isEligible = false;

        if (!request.VerificationPassed)
        {
            status = ProviderStatus.UnderReview;
            joiningFeeStatus = JoiningFeeStatus.NotRequired;
        }
        else if (request.PaymentCompleted && request.JoiningFeeAmount > 0)
        {
            status = ProviderStatus.JoiningFeePaid;
            joiningFeeStatus = JoiningFeeStatus.Paid;
            isEligible = true;
        }
        else if (request.JoiningFeeAmount > 0)
        {
            status = ProviderStatus.PendingJoiningFee;
            joiningFeeStatus = JoiningFeeStatus.Pending;
        }
        else
        {
            status = ProviderStatus.UnderReview;
            joiningFeeStatus = JoiningFeeStatus.NotRequired;
        }

        var provider = new Provider
        {
            Id = Guid.NewGuid(),
            ContactUserId = request.ContactUserId,
            CompanyName = request.CompanyName,
            RegistrationNumber = request.RegistrationNumber,
            TaxNumber = request.TaxNumber,
            ServiceCategories = request.ServiceCategories,
            BaseLocation = request.BaseLocation,
            ServiceAreas = request.ServiceAreas ?? [],
            Status = status,
            JoiningFeeStatus = joiningFeeStatus,
            JoiningFeeAmount = request.JoiningFeeAmount,
            CommissionRate = request.CommissionRate,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            ServiceRadiusKm = request.ServiceRadiusKm,
            MembershipPlanId = request.MembershipPlanId,
            IsEligibleForBookings = isEligible,
            CreatedAt = now,
            UpdatedAt = now
        };

        dbContext.Providers.Add(provider);

        if (request.JoiningFeeAmount > 0)
        {
            dbContext.ProviderJoiningFeePayments.Add(new ProviderJoiningFeePayment
            {
                Id = Guid.NewGuid(),
                ProviderId = provider.Id,
                Amount = request.JoiningFeeAmount,
                Currency = "ZAR",
                Status = request.PaymentCompleted ? JoiningFeeStatus.Paid : JoiningFeeStatus.Pending,
                Gateway = request.PaymentCompleted ? "Ozow" : "Pending",
                GatewayReference = request.PaymentCompleted ? $"OZOW-PAID-{provider.Id:N}" : $"PENDING-{provider.Id:N}",
                InvoiceNumber = $"CC-JOIN-{now:yyyyMMddHHmmss}-{provider.Id.ToString()[..8]}",
                DueDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7)),
                CreatedAt = now,
                UpdatedAt = now
            });
        }

        if (request.PaymentCompleted && request.JoiningFeeAmount > 0)
        {
            user.Status = AccountStatus.Active;
            user.UpdatedAt = now;
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        return ApiResult<BusinessProfileDto>.Success(ToDto(provider));
    }

    private static BusinessProfileDto ToDto(Provider p) => new(
        p.Id, p.CompanyName, p.RegistrationNumber, p.TaxNumber,
        p.ServiceCategories, p.BaseLocation, p.ServiceAreas,
        p.Status, p.JoiningFeeStatus,
        p.JoiningFeeAmount, p.CommissionRate, p.Latitude, p.Longitude,
        p.ServiceRadiusKm, p.IsEligibleForBookings, p.CreatedAt
    );
}

public sealed record GetBusinessProfileQuery(Guid ProviderId) : IRequest<ApiResult<BusinessProfileDto>>;

public sealed class GetBusinessProfileQueryHandler(CleanConnectDbContext dbContext)
    : IRequestHandler<GetBusinessProfileQuery, ApiResult<BusinessProfileDto>>
{
    public async Task<ApiResult<BusinessProfileDto>> Handle(GetBusinessProfileQuery request, CancellationToken cancellationToken)
    {
        var provider = await dbContext.Providers
            .SingleOrDefaultAsync(x => x.Id == request.ProviderId, cancellationToken);

        if (provider is null)
            return ApiResult<BusinessProfileDto>.Failure("Business profile was not found.");

        return ApiResult<BusinessProfileDto>.Success(new BusinessProfileDto(
            provider.Id, provider.CompanyName, provider.RegistrationNumber, provider.TaxNumber,
            provider.ServiceCategories, provider.BaseLocation, provider.ServiceAreas,
            provider.Status, provider.JoiningFeeStatus,
            provider.JoiningFeeAmount, provider.CommissionRate, provider.Latitude, provider.Longitude,
            provider.ServiceRadiusKm, provider.IsEligibleForBookings, provider.CreatedAt
        ));
    }
}

public sealed record ListBusinessProfilesQuery(ServiceCategory? FilterByCategory, ProviderStatus? FilterByStatus, int Page = 1, int PageSize = 20)
    : IRequest<ApiResult<PagedResult<BusinessProfileDto>>>;

public sealed class ListBusinessProfilesQueryHandler(CleanConnectDbContext dbContext)
    : IRequestHandler<ListBusinessProfilesQuery, ApiResult<PagedResult<BusinessProfileDto>>>
{
    public async Task<ApiResult<PagedResult<BusinessProfileDto>>> Handle(ListBusinessProfilesQuery request, CancellationToken cancellationToken)
    {
        var query = dbContext.Providers.AsQueryable();

        if (request.FilterByCategory.HasValue)
            query = query.Where(x => x.ServiceCategories.Contains(request.FilterByCategory.Value));

        if (request.FilterByStatus.HasValue)
            query = query.Where(x => x.Status == request.FilterByStatus.Value);

        var total = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderBy(x => x.CompanyName)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(p => new BusinessProfileDto(
                p.Id, p.CompanyName, p.RegistrationNumber, p.TaxNumber,
                p.ServiceCategories, p.BaseLocation, p.ServiceAreas,
                p.Status, p.JoiningFeeStatus,
                p.JoiningFeeAmount, p.CommissionRate, p.Latitude, p.Longitude,
                p.ServiceRadiusKm, p.IsEligibleForBookings, p.CreatedAt))
            .ToListAsync(cancellationToken);

        return ApiResult<PagedResult<BusinessProfileDto>>.Success(
            new PagedResult<BusinessProfileDto>(items, request.Page, request.PageSize, total));
    }
}

public sealed record ListMembershipPlansQuery : IRequest<ApiResult<List<MembershipPlanDto>>>;

public sealed class ListMembershipPlansQueryHandler(CleanConnectDbContext dbContext)
    : IRequestHandler<ListMembershipPlansQuery, ApiResult<List<MembershipPlanDto>>>
{
    public async Task<ApiResult<List<MembershipPlanDto>>> Handle(ListMembershipPlansQuery request, CancellationToken cancellationToken)
    {
        var plans = await dbContext.ProviderMembershipPlans
            .Where(x => x.IsActive)
            .OrderBy(x => x.JoiningFeeAmount)
            .Select(x => new MembershipPlanDto(
                x.Id, x.Name, x.Description, x.JoiningFeeAmount, x.RecurringFeeAmount,
                x.BillingCycle.ToString(), x.DefaultCommissionRate, x.IsActive))
            .ToListAsync(cancellationToken);

        return ApiResult<List<MembershipPlanDto>>.Success(plans);
    }
}
