using CleanConnect.Application.Common;
using CleanConnect.Application.Notifications;
using CleanConnect.Infrastructure;
using CleanConnect.Infrastructure.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CleanConnect.Application.Laundry;

public sealed record CreateLaundryBookingCommand(Guid CustomerProfileId, Guid ServiceId, Guid AddressId, DateTimeOffset PickupWindowStart, DateTimeOffset PickupWindowEnd, DateTimeOffset? DeliveryWindowStart, DateTimeOffset? DeliveryWindowEnd, string PackageType, decimal EstimatedWeightKg, bool RequiresIroning, bool RequiresExpressTurnaround, string? SpecialInstructions) : IRequest<ApiResult<LaundryBookingDto>>;

public sealed class CreateLaundryBookingCommandValidator : AbstractValidator<CreateLaundryBookingCommand>
{
    public CreateLaundryBookingCommandValidator()
    {
        RuleFor(x => x.CustomerProfileId).NotEmpty();
        RuleFor(x => x.ServiceId).NotEmpty();
        RuleFor(x => x.AddressId).NotEmpty();
        RuleFor(x => x.PackageType).NotEmpty().MaximumLength(100);
        RuleFor(x => x.EstimatedWeightKg).GreaterThan(0);
        RuleFor(x => x.PickupWindowEnd).GreaterThan(x => x.PickupWindowStart);
    }
}

public sealed class CreateLaundryBookingCommandHandler(CleanConnectDbContext dbContext) : IRequestHandler<CreateLaundryBookingCommand, ApiResult<LaundryBookingDto>>
{
    public async Task<ApiResult<LaundryBookingDto>> Handle(CreateLaundryBookingCommand request, CancellationToken cancellationToken)
    {
        var service = await dbContext.Services.SingleOrDefaultAsync(x => x.Id == request.ServiceId && x.IsActive, cancellationToken);
        if (service is null || !service.Category.Equals(ServiceCategory.Laundry.ToString(), StringComparison.OrdinalIgnoreCase))
        {
            return ApiResult<LaundryBookingDto>.Failure("Laundry service was not found or is inactive.");
        }

        var addressBelongsToCustomer = await dbContext.Addresses.AnyAsync(x => x.Id == request.AddressId && x.CustomerProfileId == request.CustomerProfileId, cancellationToken);
        if (!addressBelongsToCustomer)
        {
            return ApiResult<LaundryBookingDto>.Failure("Address was not found for the customer.");
        }

        var now = DateTimeOffset.UtcNow;
        var booking = new Booking
        {
            Id = Guid.NewGuid(),
            CustomerProfileId = request.CustomerProfileId,
            ServiceId = request.ServiceId,
            AddressId = request.AddressId,
            ScheduledStart = request.PickupWindowStart,
            ScheduledEnd = request.DeliveryWindowEnd ?? request.PickupWindowEnd,
            Status = BookingStatus.PendingPayment,
            PaymentStatus = PaymentStatus.Pending,
            Price = service.BasePrice,
            Currency = "ZAR",
            SpecialInstructions = request.SpecialInstructions,
            CreatedAt = now,
            UpdatedAt = now
        };

        var detail = new LaundryJobDetail
        {
            Id = Guid.NewGuid(),
            BookingId = booking.Id,
            PackageType = request.PackageType,
            EstimatedWeightKg = request.EstimatedWeightKg,
            PickupWindowStart = request.PickupWindowStart,
            PickupWindowEnd = request.PickupWindowEnd,
            DeliveryWindowStart = request.DeliveryWindowStart,
            DeliveryWindowEnd = request.DeliveryWindowEnd,
            LaundryStatus = LaundryStatus.AwaitingCollection,
            RequiresIroning = request.RequiresIroning,
            RequiresExpressTurnaround = request.RequiresExpressTurnaround,
            CreatedAt = now,
            UpdatedAt = now
        };

        dbContext.Bookings.Add(booking);
        dbContext.LaundryJobDetails.Add(detail);
        dbContext.ServiceMilestones.Add(new ServiceMilestone { Id = Guid.NewGuid(), BookingId = booking.Id, MilestoneType = "Laundry", Status = LaundryStatus.AwaitingCollection.ToString(), OccurredAt = now });
        await dbContext.SaveChangesAsync(cancellationToken);

        return ApiResult<LaundryBookingDto>.Success(new LaundryBookingDto(booking.Id, detail.Id, detail.LaundryStatus, detail.PackageType, detail.EstimatedWeightKg, detail.ActualWeightKg, detail.PickupWindowStart, detail.PickupWindowEnd));
    }
}

public sealed record UpdateLaundryStatusCommand(Guid BookingId, LaundryStatus Status, decimal? ActualWeightKg = null, string? Notes = null) : IRequest<ApiResult<LaundryBookingDto>>;

public sealed record UpdateLaundryStatusRequest(LaundryStatus Status, decimal? ActualWeightKg = null, string? Notes = null);

public sealed class UpdateLaundryStatusCommandHandler(CleanConnectDbContext dbContext) : IRequestHandler<UpdateLaundryStatusCommand, ApiResult<LaundryBookingDto>>
{
    public async Task<ApiResult<LaundryBookingDto>> Handle(UpdateLaundryStatusCommand request, CancellationToken cancellationToken)
    {
        var detail = await dbContext.LaundryJobDetails.Include(x => x.Booking).SingleOrDefaultAsync(x => x.BookingId == request.BookingId, cancellationToken);
        if (detail is null)
        {
            return ApiResult<LaundryBookingDto>.Failure("Laundry booking was not found.");
        }

        var now = DateTimeOffset.UtcNow;
        detail.LaundryStatus = request.Status;
        detail.ActualWeightKg = request.ActualWeightKg ?? detail.ActualWeightKg;
        detail.CollectionConfirmedAt = request.Status == LaundryStatus.Collected ? now : detail.CollectionConfirmedAt;
        detail.DeliveryConfirmedAt = request.Status == LaundryStatus.Delivered || request.Status == LaundryStatus.DeliveryConfirmed ? now : detail.DeliveryConfirmedAt;
        detail.UpdatedAt = now;
        detail.Booking.Status = request.Status is LaundryStatus.Delivered or LaundryStatus.DeliveryConfirmed ? BookingStatus.Completed : BookingStatus.InProgress;
        detail.Booking.UpdatedAt = now;

        dbContext.ServiceMilestones.Add(new ServiceMilestone { Id = Guid.NewGuid(), BookingId = detail.BookingId, MilestoneType = "Laundry", Status = request.Status.ToString(), Notes = request.Notes, OccurredAt = now });
        BookingNotifications.Add(dbContext, detail.Booking.CustomerProfileId, detail.BookingId,
            "Laundry update", $"Your laundry order is now {request.Status}.");
        await dbContext.SaveChangesAsync(cancellationToken);

        return ApiResult<LaundryBookingDto>.Success(new LaundryBookingDto(detail.BookingId, detail.Id, detail.LaundryStatus, detail.PackageType, detail.EstimatedWeightKg, detail.ActualWeightKg, detail.PickupWindowStart, detail.PickupWindowEnd));
    }
}
