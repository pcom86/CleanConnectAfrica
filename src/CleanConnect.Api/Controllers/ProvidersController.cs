using CleanConnect.Application.Providers;
using MediatR;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace CleanConnect.Api.Controllers;

[ApiController]
[Route("api/v1/providers")]
[EnableCors("Frontend")]
public sealed class ProvidersController(ISender sender) : ControllerBase
{
    [HttpPost("apply")]
    public async Task<IActionResult> Apply([FromBody] SubmitProviderApplicationCommand command, CancellationToken cancellationToken)
    {
        var result = await sender.Send(command, cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }

    [HttpGet("{providerId:guid}/onboarding-status")]
    public async Task<IActionResult> GetOnboardingStatus(Guid providerId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GetProviderOnboardingStatusQuery(providerId), cancellationToken);
        return result.Succeeded ? Ok(result) : NotFound(result);
    }

    [HttpPost("{providerId:guid}/joining-fee/confirm-payment")]
    public async Task<IActionResult> ConfirmJoiningFee(Guid providerId, [FromBody] ConfirmJoiningFeeRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new ConfirmProviderJoiningFeePaymentCommand(providerId, request.Gateway, request.GatewayReference), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }

    [HttpPost("{providerId:guid}/approve")]
    public async Task<IActionResult> Approve(Guid providerId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new ApproveProviderCommand(providerId), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }

    [HttpPost("commissions/calculate")]
    public async Task<IActionResult> CalculateCommission([FromBody] CalculateProviderBookingCommissionCommand command, CancellationToken cancellationToken)
    {
        var result = await sender.Send(command, cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }

    [HttpPost("{providerId:guid}/payouts/generate")]
    public async Task<IActionResult> GeneratePayout(Guid providerId, [FromBody] GeneratePayoutRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GenerateProviderPayoutCommand(providerId, request.PeriodStart, request.PeriodEnd), cancellationToken);
        return result.Succeeded ? Ok(result) : BadRequest(result);
    }
}

public sealed record ConfirmJoiningFeeRequest(string Gateway, string GatewayReference);
public sealed record GeneratePayoutRequest(DateOnly PeriodStart, DateOnly PeriodEnd);
