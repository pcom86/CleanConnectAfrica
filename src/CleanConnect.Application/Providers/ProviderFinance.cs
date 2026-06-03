using CleanConnect.Application.Common;
using CleanConnect.Infrastructure;
using CleanConnect.Infrastructure.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CleanConnect.Application.Providers;

public sealed record GetProviderOnboardingStatusQuery(Guid ProviderId) : IRequest<ApiResult<ProviderDto>>;

public sealed class GetProviderOnboardingStatusQueryHandler(CleanConnectDbContext dbContext) : IRequestHandler<GetProviderOnboardingStatusQuery, ApiResult<ProviderDto>>
{
    public async Task<ApiResult<ProviderDto>> Handle(GetProviderOnboardingStatusQuery request, CancellationToken cancellationToken)
    {
        var provider = await dbContext.Providers.AsNoTracking().SingleOrDefaultAsync(x => x.Id == request.ProviderId, cancellationToken);
        if (provider is null)
        {
            return ApiResult<ProviderDto>.Failure("Provider was not found.");
        }

        return ApiResult<ProviderDto>.Success(new ProviderDto(provider.Id, provider.CompanyName, provider.RegistrationNumber, provider.Status, provider.JoiningFeeStatus, provider.JoiningFeeAmount, provider.CommissionRate, provider.IsEligibleForBookings));
    }
}

public sealed record CalculateProviderBookingCommissionCommand(Guid BookingId) : IRequest<ApiResult<ProviderCommissionDto>>;

public sealed class CalculateProviderBookingCommissionCommandHandler(CleanConnectDbContext dbContext) : IRequestHandler<CalculateProviderBookingCommissionCommand, ApiResult<ProviderCommissionDto>>
{
    public async Task<ApiResult<ProviderCommissionDto>> Handle(CalculateProviderBookingCommissionCommand request, CancellationToken cancellationToken)
    {
        var assignment = await dbContext.Assignments.Include(x => x.Booking).Include(x => x.Provider).SingleOrDefaultAsync(x => x.BookingId == request.BookingId, cancellationToken);
        if (assignment?.Provider is null)
        {
            return ApiResult<ProviderCommissionDto>.Failure("Provider assignment was not found for the booking.");
        }

        if (assignment.Booking.Status != BookingStatus.Completed || assignment.Booking.PaymentStatus != PaymentStatus.Paid)
        {
            return ApiResult<ProviderCommissionDto>.Failure("Commission can only be calculated for completed and paid bookings.");
        }

        var existing = await dbContext.ProviderCommissions.AsNoTracking().SingleOrDefaultAsync(x => x.BookingId == request.BookingId, cancellationToken);
        if (existing is not null)
        {
            return ApiResult<ProviderCommissionDto>.Success(new ProviderCommissionDto(existing.Id, existing.ProviderId, existing.BookingId, existing.GrossBookingAmount, existing.CommissionRate, existing.CommissionAmount, existing.ProviderNetAmount, existing.Status));
        }

        var gross = assignment.Booking.Price;
        var rate = assignment.Provider.CommissionRate;
        var commissionAmount = Math.Round(gross * rate / 100m, 2);
        var providerNetAmount = gross - commissionAmount;
        var now = DateTimeOffset.UtcNow;

        var commission = new ProviderCommission
        {
            Id = Guid.NewGuid(),
            ProviderId = assignment.Provider.Id,
            BookingId = assignment.Booking.Id,
            GrossBookingAmount = gross,
            CommissionRate = rate,
            CommissionAmount = commissionAmount,
            ProviderNetAmount = providerNetAmount,
            Currency = assignment.Booking.Currency,
            Status = CommissionStatus.Pending,
            CalculatedAt = now,
            CreatedAt = now
        };

        dbContext.ProviderCommissions.Add(commission);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ApiResult<ProviderCommissionDto>.Success(new ProviderCommissionDto(commission.Id, commission.ProviderId, commission.BookingId, commission.GrossBookingAmount, commission.CommissionRate, commission.CommissionAmount, commission.ProviderNetAmount, commission.Status));
    }
}

public sealed record GenerateProviderPayoutCommand(Guid ProviderId, DateOnly PeriodStart, DateOnly PeriodEnd) : IRequest<ApiResult<PayoutDto>>;

public sealed class GenerateProviderPayoutCommandHandler(CleanConnectDbContext dbContext) : IRequestHandler<GenerateProviderPayoutCommand, ApiResult<PayoutDto>>
{
    public async Task<ApiResult<PayoutDto>> Handle(GenerateProviderPayoutCommand request, CancellationToken cancellationToken)
    {
        var providerExists = await dbContext.Providers.AnyAsync(x => x.Id == request.ProviderId, cancellationToken);
        if (!providerExists)
        {
            return ApiResult<PayoutDto>.Failure("Provider was not found.");
        }

        var start = request.PeriodStart.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var end = request.PeriodEnd.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);

        var commissions = await dbContext.ProviderCommissions
            .Where(x => x.ProviderId == request.ProviderId && x.Status == CommissionStatus.Pending && x.CalculatedAt >= start && x.CalculatedAt <= end)
            .ToListAsync(cancellationToken);

        if (commissions.Count == 0)
        {
            return ApiResult<PayoutDto>.Failure("No pending commission records were found for this payout period.");
        }

        var grossAmount = commissions.Sum(x => x.GrossBookingAmount);
        var commissionAmount = commissions.Sum(x => x.CommissionAmount);
        var netAmount = commissions.Sum(x => x.ProviderNetAmount);
        var now = DateTimeOffset.UtcNow;

        var payout = new Payout
        {
            Id = Guid.NewGuid(),
            ProviderId = request.ProviderId,
            PeriodStart = request.PeriodStart,
            PeriodEnd = request.PeriodEnd,
            GrossAmount = grossAmount,
            CommissionAmount = commissionAmount,
            JoiningFeeDeductionAmount = 0,
            AdjustmentAmount = 0,
            NetAmount = netAmount,
            Status = PayoutStatus.Pending,
            CreatedAt = now,
            UpdatedAt = now
        };

        foreach (var commission in commissions)
        {
            commission.Status = CommissionStatus.IncludedInPayout;
        }

        dbContext.Payouts.Add(payout);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ApiResult<PayoutDto>.Success(new PayoutDto(payout.Id, payout.ProviderId, payout.PeriodStart, payout.PeriodEnd, payout.GrossAmount, payout.CommissionAmount, payout.JoiningFeeDeductionAmount, payout.AdjustmentAmount, payout.NetAmount, payout.Status));
    }
}
