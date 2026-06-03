using CleanConnect.Application.BusinessProfiles;
using CleanConnect.Application.Common;
using CleanConnect.Application.MembershipPlans;
using CleanConnect.Infrastructure;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CleanConnect.Api.Controllers;

[ApiController]
[Route("api/v1/admin")]
public sealed class AdminController(ISender sender, CleanConnectDbContext dbContext) : ControllerBase
{
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats(CancellationToken cancellationToken)
    {
        var totalUsers = await dbContext.Users.CountAsync(cancellationToken);
        var totalProviders = await dbContext.Providers.CountAsync(cancellationToken);
        var pendingProviders = await dbContext.Providers.CountAsync(x => x.Status == Infrastructure.Entities.ProviderStatus.UnderReview, cancellationToken);
        var approvedProviders = await dbContext.Providers.CountAsync(x => x.Status == Infrastructure.Entities.ProviderStatus.Approved, cancellationToken);
        var rejectedProviders = await dbContext.Providers.CountAsync(x => x.Status == Infrastructure.Entities.ProviderStatus.Rejected, cancellationToken);

        var stats = new
        {
            TotalUsers = totalUsers,
            TotalProviders = totalProviders,
            PendingProviders = pendingProviders,
            ApprovedProviders = approvedProviders,
            RejectedProviders = rejectedProviders,
        };

        return Ok(ApiResult<object>.Success(stats));
    }

    [HttpGet("membership-plans")]
    public async Task<IActionResult> ListMembershipPlans(CancellationToken cancellationToken)
    {
        var result = await sender.Send(new ListMembershipPlansQuery(), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }

    [HttpPost("membership-plans")]
    public async Task<IActionResult> CreateMembershipPlan([FromBody] CreateMembershipPlanCommand command, CancellationToken cancellationToken)
    {
        var result = await sender.Send(command, cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }

    [HttpPut("membership-plans/{id:guid}")]
    public async Task<IActionResult> UpdateMembershipPlan(Guid id, [FromBody] UpdateMembershipPlanRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new UpdateMembershipPlanCommand(
            id, request.Name, request.Description, request.JoiningFeeAmount,
            request.RecurringFeeAmount, request.BillingCycle, request.DefaultCommissionRate, request.IsActive), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }

    [HttpDelete("membership-plans/{id:guid}")]
    public async Task<IActionResult> DeleteMembershipPlan(Guid id, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new DeleteMembershipPlanCommand(id), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }
}

public sealed record UpdateMembershipPlanRequest(
    string Name,
    string Description,
    decimal JoiningFeeAmount,
    decimal RecurringFeeAmount,
    CleanConnect.Infrastructure.Entities.BillingCycle BillingCycle,
    decimal DefaultCommissionRate,
    bool IsActive
);
