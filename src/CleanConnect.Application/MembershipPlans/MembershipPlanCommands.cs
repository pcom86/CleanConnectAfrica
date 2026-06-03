using CleanConnect.Application.Common;
using CleanConnect.Infrastructure;
using CleanConnect.Infrastructure.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CleanConnect.Application.MembershipPlans;

public sealed record CreateMembershipPlanCommand(
    string Name,
    string Description,
    decimal JoiningFeeAmount,
    decimal RecurringFeeAmount,
    BillingCycle BillingCycle,
    decimal DefaultCommissionRate,
    bool IsActive = true
) : IRequest<ApiResult<MembershipPlanDto>>;

public sealed class CreateMembershipPlanCommandValidator : AbstractValidator<CreateMembershipPlanCommand>
{
    public CreateMembershipPlanCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Description).NotEmpty().MaximumLength(1000);
        RuleFor(x => x.JoiningFeeAmount).GreaterThanOrEqualTo(0);
        RuleFor(x => x.RecurringFeeAmount).GreaterThanOrEqualTo(0);
        RuleFor(x => x.DefaultCommissionRate).InclusiveBetween(0, 1);
    }
}

public sealed class CreateMembershipPlanCommandHandler(CleanConnectDbContext dbContext)
    : IRequestHandler<CreateMembershipPlanCommand, ApiResult<MembershipPlanDto>>
{
    public async Task<ApiResult<MembershipPlanDto>> Handle(CreateMembershipPlanCommand request, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var plan = new ProviderMembershipPlan
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Description = request.Description,
            JoiningFeeAmount = request.JoiningFeeAmount,
            RecurringFeeAmount = request.RecurringFeeAmount,
            BillingCycle = request.BillingCycle,
            DefaultCommissionRate = request.DefaultCommissionRate,
            IsActive = request.IsActive,
            CreatedAt = now,
            UpdatedAt = now
        };

        dbContext.ProviderMembershipPlans.Add(plan);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ApiResult<MembershipPlanDto>.Success(ToDto(plan));
    }

    private static MembershipPlanDto ToDto(ProviderMembershipPlan p) => new(
        p.Id, p.Name, p.Description, p.JoiningFeeAmount, p.RecurringFeeAmount,
        p.BillingCycle.ToString(), p.DefaultCommissionRate, p.IsActive
    );
}

public sealed record UpdateMembershipPlanCommand(
    Guid Id,
    string Name,
    string Description,
    decimal JoiningFeeAmount,
    decimal RecurringFeeAmount,
    BillingCycle BillingCycle,
    decimal DefaultCommissionRate,
    bool IsActive
) : IRequest<ApiResult<MembershipPlanDto>>;

public sealed class UpdateMembershipPlanCommandValidator : AbstractValidator<UpdateMembershipPlanCommand>
{
    public UpdateMembershipPlanCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Description).NotEmpty().MaximumLength(1000);
        RuleFor(x => x.JoiningFeeAmount).GreaterThanOrEqualTo(0);
        RuleFor(x => x.RecurringFeeAmount).GreaterThanOrEqualTo(0);
        RuleFor(x => x.DefaultCommissionRate).InclusiveBetween(0, 1);
    }
}

public sealed class UpdateMembershipPlanCommandHandler(CleanConnectDbContext dbContext)
    : IRequestHandler<UpdateMembershipPlanCommand, ApiResult<MembershipPlanDto>>
{
    public async Task<ApiResult<MembershipPlanDto>> Handle(UpdateMembershipPlanCommand request, CancellationToken cancellationToken)
    {
        var plan = await dbContext.ProviderMembershipPlans.FindAsync(new object[] { request.Id }, cancellationToken);
        if (plan is null)
            return ApiResult<MembershipPlanDto>.Failure("Membership plan was not found.");

        plan.Name = request.Name;
        plan.Description = request.Description;
        plan.JoiningFeeAmount = request.JoiningFeeAmount;
        plan.RecurringFeeAmount = request.RecurringFeeAmount;
        plan.BillingCycle = request.BillingCycle;
        plan.DefaultCommissionRate = request.DefaultCommissionRate;
        plan.IsActive = request.IsActive;
        plan.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return ApiResult<MembershipPlanDto>.Success(new MembershipPlanDto(
            plan.Id, plan.Name, plan.Description, plan.JoiningFeeAmount, plan.RecurringFeeAmount,
            plan.BillingCycle.ToString(), plan.DefaultCommissionRate, plan.IsActive));
    }
}

public sealed record DeleteMembershipPlanCommand(Guid Id) : IRequest<ApiResult<bool>>;

public sealed class DeleteMembershipPlanCommandHandler(CleanConnectDbContext dbContext)
    : IRequestHandler<DeleteMembershipPlanCommand, ApiResult<bool>>
{
    public async Task<ApiResult<bool>> Handle(DeleteMembershipPlanCommand request, CancellationToken cancellationToken)
    {
        var plan = await dbContext.ProviderMembershipPlans.FindAsync(new object[] { request.Id }, cancellationToken);
        if (plan is null)
            return ApiResult<bool>.Failure("Membership plan was not found.");

        var inUse = await dbContext.Providers.AnyAsync(x => x.MembershipPlanId == request.Id, cancellationToken);
        if (inUse)
            return ApiResult<bool>.Failure("Cannot delete a membership plan that is currently assigned to providers.");

        dbContext.ProviderMembershipPlans.Remove(plan);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ApiResult<bool>.Success(true);
    }
}
