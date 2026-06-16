using CleanConnect.Application.Common;
using CleanConnect.Application.Notifications;
using CleanConnect.Infrastructure;
using CleanConnect.Infrastructure.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CleanConnect.Application.CarWash;

public sealed record CreateCarWashBookingCommand(Guid CustomerProfileId, Guid ServiceId, Guid AddressId, DateTimeOffset ScheduledStart, DateTimeOffset ScheduledEnd, VehicleType VehicleType, string? VehicleMake, string? VehicleModel, string? RegistrationNumber, string PackageType, int NumberOfVehicles, bool RequiresInteriorCleaning, bool RequiresWax, string? SpecialInstructions) : IRequest<ApiResult<CarWashBookingDto>>;

public sealed class CreateCarWashBookingCommandValidator : AbstractValidator<CreateCarWashBookingCommand>
{
    public CreateCarWashBookingCommandValidator()
    {
        RuleFor(x => x.CustomerProfileId).NotEmpty();
        RuleFor(x => x.ServiceId).NotEmpty();
        RuleFor(x => x.AddressId).NotEmpty();
        RuleFor(x => x.ScheduledEnd).GreaterThan(x => x.ScheduledStart);
        RuleFor(x => x.VehicleType).IsInEnum();
        RuleFor(x => x.PackageType).NotEmpty().MaximumLength(100);
        RuleFor(x => x.NumberOfVehicles).GreaterThan(0);
    }
}

public sealed class CreateCarWashBookingCommandHandler(CleanConnectDbContext dbContext) : IRequestHandler<CreateCarWashBookingCommand, ApiResult<CarWashBookingDto>>
{
    public async Task<ApiResult<CarWashBookingDto>> Handle(CreateCarWashBookingCommand request, CancellationToken cancellationToken)
    {
        var service = await dbContext.Services.SingleOrDefaultAsync(x => x.Id == request.ServiceId && x.IsActive, cancellationToken);
        if (service is null || !service.Category.Equals(ServiceCategory.CarWash.ToString(), StringComparison.OrdinalIgnoreCase))
        {
            return ApiResult<CarWashBookingDto>.Failure("Car wash service was not found or is inactive.");
        }

        var addressBelongsToCustomer = await dbContext.Addresses.AnyAsync(x => x.Id == request.AddressId && x.CustomerProfileId == request.CustomerProfileId, cancellationToken);
        if (!addressBelongsToCustomer)
        {
            return ApiResult<CarWashBookingDto>.Failure("Address was not found for the customer.");
        }

        var now = DateTimeOffset.UtcNow;
        var booking = new Booking
        {
            Id = Guid.NewGuid(),
            CustomerProfileId = request.CustomerProfileId,
            ServiceId = request.ServiceId,
            AddressId = request.AddressId,
            ScheduledStart = request.ScheduledStart,
            ScheduledEnd = request.ScheduledEnd,
            Status = BookingStatus.PendingPayment,
            PaymentStatus = PaymentStatus.Pending,
            Price = service.BasePrice * request.NumberOfVehicles,
            Currency = "ZAR",
            SpecialInstructions = request.SpecialInstructions,
            CreatedAt = now,
            UpdatedAt = now
        };

        var detail = new CarWashJobDetail
        {
            Id = Guid.NewGuid(),
            BookingId = booking.Id,
            VehicleType = request.VehicleType,
            VehicleMake = request.VehicleMake,
            VehicleModel = request.VehicleModel,
            RegistrationNumber = request.RegistrationNumber,
            PackageType = request.PackageType,
            NumberOfVehicles = request.NumberOfVehicles,
            RequiresInteriorCleaning = request.RequiresInteriorCleaning,
            RequiresWax = request.RequiresWax,
            CarWashStatus = CarWashStatus.ProviderAssigned,
            CreatedAt = now,
            UpdatedAt = now
        };

        dbContext.Bookings.Add(booking);
        dbContext.CarWashJobDetails.Add(detail);
        dbContext.ServiceMilestones.Add(new ServiceMilestone { Id = Guid.NewGuid(), BookingId = booking.Id, MilestoneType = "CarWash", Status = CarWashStatus.ProviderAssigned.ToString(), OccurredAt = now });
        await dbContext.SaveChangesAsync(cancellationToken);

        return ApiResult<CarWashBookingDto>.Success(new CarWashBookingDto(booking.Id, detail.Id, detail.CarWashStatus, detail.VehicleType, detail.PackageType, detail.NumberOfVehicles));
    }
}

public sealed record UpdateCarWashStatusCommand(Guid BookingId, CarWashStatus Status, string? Notes = null) : IRequest<ApiResult<CarWashBookingDto>>;

public sealed record UpdateCarWashStatusRequest(CarWashStatus Status, string? Notes = null);

public sealed class UpdateCarWashStatusCommandHandler(CleanConnectDbContext dbContext) : IRequestHandler<UpdateCarWashStatusCommand, ApiResult<CarWashBookingDto>>
{
    public async Task<ApiResult<CarWashBookingDto>> Handle(UpdateCarWashStatusCommand request, CancellationToken cancellationToken)
    {
        var detail = await dbContext.CarWashJobDetails.Include(x => x.Booking).SingleOrDefaultAsync(x => x.BookingId == request.BookingId, cancellationToken);
        if (detail is null)
        {
            return ApiResult<CarWashBookingDto>.Failure("Car wash booking was not found.");
        }

        var now = DateTimeOffset.UtcNow;
        detail.CarWashStatus = request.Status;
        detail.ProviderArrivedAt = request.Status == CarWashStatus.Arrived ? now : detail.ProviderArrivedAt;
        detail.StartedAt = request.Status == CarWashStatus.InProgress ? now : detail.StartedAt;
        detail.CompletedAt = request.Status is CarWashStatus.Completed or CarWashStatus.CustomerConfirmed ? now : detail.CompletedAt;
        detail.UpdatedAt = now;
        detail.Booking.Status = request.Status is CarWashStatus.Completed or CarWashStatus.CustomerConfirmed ? BookingStatus.Completed : BookingStatus.InProgress;
        detail.Booking.UpdatedAt = now;

        dbContext.ServiceMilestones.Add(new ServiceMilestone { Id = Guid.NewGuid(), BookingId = detail.BookingId, MilestoneType = "CarWash", Status = request.Status.ToString(), Notes = request.Notes, OccurredAt = now });
        BookingNotifications.Add(dbContext, detail.Booking.CustomerProfileId, detail.BookingId,
            "Car wash update", $"Your car wash is now {request.Status}.");
        await dbContext.SaveChangesAsync(cancellationToken);

        return ApiResult<CarWashBookingDto>.Success(new CarWashBookingDto(detail.BookingId, detail.Id, detail.CarWashStatus, detail.VehicleType, detail.PackageType, detail.NumberOfVehicles));
    }
}
