using CleanConnect.Application.Common;
using CleanConnect.Infrastructure;
using CleanConnect.Infrastructure.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CleanConnect.Application.Providers;

public sealed record SubmitProviderApplicationCommand(Guid ContactUserId, string CompanyName, string RegistrationNumber, string? TaxNumber, decimal JoiningFeeAmount, decimal CommissionRate, Guid? MembershipPlanId) : IRequest<ApiResult<ProviderDto>>;

public sealed class SubmitProviderApplicationCommandValidator : AbstractValidator<SubmitProviderApplicationCommand>
{
    public SubmitProviderApplicationCommandValidator()
    {
        RuleFor(x => x.ContactUserId).NotEmpty();
        RuleFor(x => x.CompanyName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.RegistrationNumber).NotEmpty().MaximumLength(100);
        RuleFor(x => x.JoiningFeeAmount).GreaterThanOrEqualTo(0);
        RuleFor(x => x.CommissionRate).InclusiveBetween(0, 100);
    }
}

public sealed class SubmitProviderApplicationCommandHandler(CleanConnectDbContext dbContext) : IRequestHandler<SubmitProviderApplicationCommand, ApiResult<ProviderDto>>
{
    public async Task<ApiResult<ProviderDto>> Handle(SubmitProviderApplicationCommand request, CancellationToken cancellationToken)
    {
        var userExists = await dbContext.Users.AnyAsync(x => x.Id == request.ContactUserId, cancellationToken);
        if (!userExists)
        {
            return ApiResult<ProviderDto>.Failure("Contact user was not found.");
        }

        var duplicate = await dbContext.Providers.AnyAsync(x => x.RegistrationNumber == request.RegistrationNumber, cancellationToken);
        if (duplicate)
        {
            return ApiResult<ProviderDto>.Failure("A provider with this registration number already exists.");
        }

        var now = DateTimeOffset.UtcNow;
        var provider = new Provider
        {
            Id = Guid.NewGuid(),
            ContactUserId = request.ContactUserId,
            CompanyName = request.CompanyName,
            RegistrationNumber = request.RegistrationNumber,
            TaxNumber = request.TaxNumber,
            Status = request.JoiningFeeAmount > 0 ? ProviderStatus.PendingJoiningFee : ProviderStatus.UnderReview,
            JoiningFeeStatus = request.JoiningFeeAmount > 0 ? JoiningFeeStatus.Pending : JoiningFeeStatus.NotRequired,
            JoiningFeeAmount = request.JoiningFeeAmount,
            CommissionRate = request.CommissionRate,
            MembershipPlanId = request.MembershipPlanId,
            IsEligibleForBookings = false,
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
                Status = JoiningFeeStatus.Pending,
                Gateway = "Pending",
                GatewayReference = $"PENDING-{provider.Id:N}",
                InvoiceNumber = $"CC-JOIN-{DateTimeOffset.UtcNow:yyyyMMddHHmmss}-{provider.Id.ToString()[..8]}",
                DueDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7)),
                CreatedAt = now,
                UpdatedAt = now
            });
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        return ApiResult<ProviderDto>.Success(new ProviderDto(provider.Id, provider.CompanyName, provider.RegistrationNumber, provider.Status, provider.JoiningFeeStatus, provider.JoiningFeeAmount, provider.CommissionRate, provider.IsEligibleForBookings));
    }
}

public sealed record ConfirmProviderJoiningFeePaymentCommand(Guid ProviderId, string Gateway, string GatewayReference) : IRequest<ApiResult<ProviderJoiningFeeDto>>;

public sealed class ConfirmProviderJoiningFeePaymentCommandHandler(CleanConnectDbContext dbContext) : IRequestHandler<ConfirmProviderJoiningFeePaymentCommand, ApiResult<ProviderJoiningFeeDto>>
{
    public async Task<ApiResult<ProviderJoiningFeeDto>> Handle(ConfirmProviderJoiningFeePaymentCommand request, CancellationToken cancellationToken)
    {
        var payment = await dbContext.ProviderJoiningFeePayments.Include(x => x.Provider).FirstOrDefaultAsync(x => x.ProviderId == request.ProviderId && x.Status == JoiningFeeStatus.Pending, cancellationToken);
        if (payment is null)
        {
            return ApiResult<ProviderJoiningFeeDto>.Failure("Pending joining fee payment was not found.");
        }

        var now = DateTimeOffset.UtcNow;
        payment.Status = JoiningFeeStatus.Paid;
        payment.Gateway = request.Gateway;
        payment.GatewayReference = request.GatewayReference;
        payment.PaidAt = now;
        payment.UpdatedAt = now;
        payment.Provider.JoiningFeeStatus = JoiningFeeStatus.Paid;
        payment.Provider.JoiningFeePaidAt = now;
        payment.Provider.Status = ProviderStatus.JoiningFeePaid;
        payment.Provider.UpdatedAt = now;

        await dbContext.SaveChangesAsync(cancellationToken);

        return ApiResult<ProviderJoiningFeeDto>.Success(new ProviderJoiningFeeDto(payment.Id, payment.ProviderId, payment.Amount, payment.Currency, payment.Status, payment.InvoiceNumber, payment.DueDate, payment.PaidAt));
    }
}

public sealed record RejectProviderCommand(Guid ProviderId, string? Reason = null) : IRequest<ApiResult<ProviderDto>>;

public sealed class RejectProviderCommandHandler(CleanConnectDbContext dbContext) : IRequestHandler<RejectProviderCommand, ApiResult<ProviderDto>>
{
    public async Task<ApiResult<ProviderDto>> Handle(RejectProviderCommand request, CancellationToken cancellationToken)
    {
        var provider = await dbContext.Providers.SingleOrDefaultAsync(x => x.Id == request.ProviderId, cancellationToken);
        if (provider is null)
            return ApiResult<ProviderDto>.Failure("Provider was not found.");

        provider.Status = ProviderStatus.Rejected;
        provider.IsEligibleForBookings = false;
        provider.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return ApiResult<ProviderDto>.Success(new ProviderDto(provider.Id, provider.CompanyName, provider.RegistrationNumber, provider.Status, provider.JoiningFeeStatus, provider.JoiningFeeAmount, provider.CommissionRate, provider.IsEligibleForBookings));
    }
}

public sealed record ApproveProviderCommand(Guid ProviderId) : IRequest<ApiResult<ProviderDto>>;

public sealed class ApproveProviderCommandHandler(CleanConnectDbContext dbContext) : IRequestHandler<ApproveProviderCommand, ApiResult<ProviderDto>>
{
    public async Task<ApiResult<ProviderDto>> Handle(ApproveProviderCommand request, CancellationToken cancellationToken)
    {
        var provider = await dbContext.Providers.SingleOrDefaultAsync(x => x.Id == request.ProviderId, cancellationToken);
        if (provider is null)
        {
            return ApiResult<ProviderDto>.Failure("Provider was not found.");
        }

        if (provider.JoiningFeeStatus is JoiningFeeStatus.Pending or JoiningFeeStatus.Failed or JoiningFeeStatus.Overdue)
        {
            return ApiResult<ProviderDto>.Failure("Provider cannot be approved before the joining fee is paid or waived.");
        }

        provider.Status = ProviderStatus.Approved;
        provider.IsEligibleForBookings = true;
        provider.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return ApiResult<ProviderDto>.Success(new ProviderDto(provider.Id, provider.CompanyName, provider.RegistrationNumber, provider.Status, provider.JoiningFeeStatus, provider.JoiningFeeAmount, provider.CommissionRate, provider.IsEligibleForBookings));
    }
}
