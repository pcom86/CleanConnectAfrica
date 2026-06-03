using System.Text.Json;
using CleanConnect.Application.Common;
using CleanConnect.Infrastructure;
using CleanConnect.Infrastructure.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CleanConnect.Application.Cleaning;

// --- Create Cleaning Request (Customer) ---
public sealed record CreateCleaningRequestCommand(Guid CustomerProfileId, Guid? AddressId, Guid? ServiceId, string? Notes, DateTimeOffset? PreferredDate, DateTimeOffset? PreferredTimeStart, DateTimeOffset? PreferredTimeEnd) : IRequest<ApiResult<CleaningRequestDto>>;

public sealed class CreateCleaningRequestCommandValidator : AbstractValidator<CreateCleaningRequestCommand>
{
    public CreateCleaningRequestCommandValidator()
    {
        RuleFor(x => x.CustomerProfileId).NotEmpty();
    }
}

public sealed class CreateCleaningRequestCommandHandler(CleanConnectDbContext dbContext) : IRequestHandler<CreateCleaningRequestCommand, ApiResult<CleaningRequestDto>>
{
    public async Task<ApiResult<CleaningRequestDto>> Handle(CreateCleaningRequestCommand request, CancellationToken cancellationToken)
    {
        var customerExists = await dbContext.CustomerProfiles.AnyAsync(x => x.Id == request.CustomerProfileId, cancellationToken);
        if (!customerExists)
        {
            return ApiResult<CleaningRequestDto>.Failure("Customer profile was not found.");
        }

        var now = DateTimeOffset.UtcNow;
        var cleaningRequest = new CleaningRequest
        {
            Id = Guid.NewGuid(),
            CustomerProfileId = request.CustomerProfileId,
            AddressId = request.AddressId,
            ServiceId = request.ServiceId,
            Status = CleaningRequestStatus.Requested,
            Notes = request.Notes,
            PreferredDate = request.PreferredDate,
            PreferredTimeStart = request.PreferredTimeStart,
            PreferredTimeEnd = request.PreferredTimeEnd,
            CreatedAt = now,
            UpdatedAt = now
        };

        dbContext.CleaningRequests.Add(cleaningRequest);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ApiResult<CleaningRequestDto>.Success(new CleaningRequestDto(cleaningRequest.Id, cleaningRequest.CustomerProfileId, cleaningRequest.AddressId, cleaningRequest.ServiceId, cleaningRequest.Status, cleaningRequest.Notes, cleaningRequest.PreferredDate, cleaningRequest.PreferredTimeStart, cleaningRequest.PreferredTimeEnd, cleaningRequest.CreatedAt));
    }
}

// --- Find Nearby Providers (Query) ---
public sealed record FindNearbyProvidersQuery(Guid CleaningRequestId, decimal? MaxDistanceKm = null) : IRequest<ApiResult<List<NearbyProviderDto>>>;

public sealed class FindNearbyProvidersQueryHandler(CleanConnectDbContext dbContext) : IRequestHandler<FindNearbyProvidersQuery, ApiResult<List<NearbyProviderDto>>>
{
    public async Task<ApiResult<List<NearbyProviderDto>>> Handle(FindNearbyProvidersQuery request, CancellationToken cancellationToken)
    {
        var cleaningRequest = await dbContext.CleaningRequests
            .Include(x => x.Address)
            .SingleOrDefaultAsync(x => x.Id == request.CleaningRequestId, cancellationToken);

        if (cleaningRequest is null)
        {
            return ApiResult<List<NearbyProviderDto>>.Failure("Cleaning request was not found.");
        }

        if (cleaningRequest.Address?.Latitude is null || cleaningRequest.Address?.Longitude is null)
        {
            return ApiResult<List<NearbyProviderDto>>.Failure("Cleaning request address does not have coordinates.");
        }

        var customerLat = cleaningRequest.Address.Latitude.Value;
        var customerLon = cleaningRequest.Address.Longitude.Value;
        var maxDistance = request.MaxDistanceKm ?? 50m;

        // Simplified distance filter using providers within a bounding box first, then rough Haversine
        var providers = await dbContext.Providers
            .Where(x => x.Status == ProviderStatus.Approved && x.IsEligibleForBookings && x.Latitude != null && x.Longitude != null)
            .ToListAsync(cancellationToken);

        var nearby = providers
            .Select(p => new
            {
                p.Id,
                p.CompanyName,
                p.Rating,
                Distance = CalculateDistance(customerLat, customerLon, p.Latitude!.Value, p.Longitude!.Value)
            })
            .Where(x => x.Distance <= maxDistance)
            .OrderBy(x => x.Distance)
            .Select(x => new NearbyProviderDto(x.Id, x.CompanyName, x.Rating, x.Distance))
            .ToList();

        return ApiResult<List<NearbyProviderDto>>.Success(nearby);
    }

    private static decimal CalculateDistance(decimal lat1, decimal lon1, decimal lat2, decimal lon2)
    {
        const decimal R = 6371m; // Earth radius in km
        var dLat = ToRad(lat2 - lat1);
        var dLon = ToRad(lon2 - lon1);
        var a = Math.Sin((double)(dLat / 2)) * Math.Sin((double)(dLat / 2)) +
                Math.Cos((double)ToRad(lat1)) * Math.Cos((double)ToRad(lat2)) *
                Math.Sin((double)(dLon / 2)) * Math.Sin((double)(dLon / 2));
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return R * (decimal)c;
    }

    private static decimal ToRad(decimal deg) => deg * (decimal)(Math.PI / 180);
}

// --- Accept Cleaning Request (Provider) ---
public sealed record AcceptCleaningRequestCommand(Guid CleaningRequestId, Guid ProviderId, string? ResponseNotes) : IRequest<ApiResult<BookingDto>>;

public sealed class AcceptCleaningRequestCommandValidator : AbstractValidator<AcceptCleaningRequestCommand>
{
    public AcceptCleaningRequestCommandValidator()
    {
        RuleFor(x => x.CleaningRequestId).NotEmpty();
        RuleFor(x => x.ProviderId).NotEmpty();
    }
}

public sealed class AcceptCleaningRequestCommandHandler(CleanConnectDbContext dbContext) : IRequestHandler<AcceptCleaningRequestCommand, ApiResult<BookingDto>>
{
    public async Task<ApiResult<BookingDto>> Handle(AcceptCleaningRequestCommand request, CancellationToken cancellationToken)
    {
        var cleaningRequest = await dbContext.CleaningRequests
            .Include(x => x.Address)
            .SingleOrDefaultAsync(x => x.Id == request.CleaningRequestId, cancellationToken);

        if (cleaningRequest is null)
        {
            return ApiResult<BookingDto>.Failure("Cleaning request was not found.");
        }

        if (cleaningRequest.Status != CleaningRequestStatus.Requested && cleaningRequest.Status != CleaningRequestStatus.ProvidersNotified)
        {
            return ApiResult<BookingDto>.Failure("Cleaning request is no longer available for acceptance.");
        }

        var provider = await dbContext.Providers.SingleOrDefaultAsync(x => x.Id == request.ProviderId && x.IsEligibleForBookings, cancellationToken);
        if (provider is null)
        {
            return ApiResult<BookingDto>.Failure("Provider was not found or is not eligible for bookings.");
        }

        var now = DateTimeOffset.UtcNow;
        var scheduledStart = cleaningRequest.PreferredDate ?? now.AddDays(1);
        var scheduledEnd = cleaningRequest.PreferredTimeEnd ?? scheduledStart.AddHours(2);

        var booking = new Booking
        {
            Id = Guid.NewGuid(),
            CustomerProfileId = cleaningRequest.CustomerProfileId,
            ServiceId = cleaningRequest.ServiceId ?? Guid.Empty,
            AddressId = cleaningRequest.AddressId ?? Guid.Empty,
            ScheduledStart = scheduledStart,
            ScheduledEnd = scheduledEnd,
            Status = BookingStatus.Confirmed,
            PaymentStatus = PaymentStatus.Pending,
            Price = 0m,
            Currency = "ZAR",
            SpecialInstructions = cleaningRequest.Notes,
            CreatedAt = now,
            UpdatedAt = now
        };

        var assignment = new Assignment
        {
            Id = Guid.NewGuid(),
            BookingId = booking.Id,
            AssignedType = AssignmentType.MarketplaceProvider,
            ProviderId = provider.Id,
            Status = AssignmentStatus.Accepted,
            AssignedAt = now,
            AcceptedAt = now
        };

        cleaningRequest.Status = CleaningRequestStatus.Accepted;
        cleaningRequest.UpdatedAt = now;

        dbContext.Bookings.Add(booking);
        dbContext.Assignments.Add(assignment);
        dbContext.ServiceMilestones.Add(new ServiceMilestone { Id = Guid.NewGuid(), BookingId = booking.Id, MilestoneType = "CleaningAccepted", Status = BookingStatus.Confirmed.ToString(), OccurredAt = now });

        await dbContext.SaveChangesAsync(cancellationToken);

        return ApiResult<BookingDto>.Success(new BookingDto(booking.Id, booking.CustomerProfileId, booking.ServiceId, booking.AddressId, booking.ScheduledStart, booking.ScheduledEnd, booking.Status, booking.PaymentStatus, booking.Price, booking.Currency));
    }
}

// --- Update Cleaning Booking Status (Dispatch / OnSite / etc.) ---
public sealed record UpdateCleaningBookingStatusCommand(Guid BookingId, BookingStatus NewStatus, string? Notes) : IRequest<ApiResult<BookingDto>>;

public sealed class UpdateCleaningBookingStatusCommandValidator : AbstractValidator<UpdateCleaningBookingStatusCommand>
{
    public UpdateCleaningBookingStatusCommandValidator()
    {
        RuleFor(x => x.BookingId).NotEmpty();
        RuleFor(x => x.NewStatus).IsInEnum();
    }
}

public sealed class UpdateCleaningBookingStatusCommandHandler(CleanConnectDbContext dbContext) : IRequestHandler<UpdateCleaningBookingStatusCommand, ApiResult<BookingDto>>
{
    public async Task<ApiResult<BookingDto>> Handle(UpdateCleaningBookingStatusCommand request, CancellationToken cancellationToken)
    {
        var booking = await dbContext.Bookings
            .Include(x => x.CleaningJobDetail)
            .SingleOrDefaultAsync(x => x.Id == request.BookingId, cancellationToken);

        if (booking is null)
        {
            return ApiResult<BookingDto>.Failure("Booking was not found.");
        }

        var now = DateTimeOffset.UtcNow;
        booking.Status = request.NewStatus;
        booking.UpdatedAt = now;

        // Ensure CleaningJobDetail exists for tracking
        if (booking.CleaningJobDetail is null)
        {
            booking.CleaningJobDetail = new CleaningJobDetail
            {
                Id = Guid.NewGuid(),
                BookingId = booking.Id,
                CleaningType = "Standard",
                CreatedAt = now,
                UpdatedAt = now
            };
            dbContext.CleaningJobDetails.Add(booking.CleaningJobDetail);
        }

        switch (request.NewStatus)
        {
            case BookingStatus.Assigned:
            case BookingStatus.CleanerEnRoute:
                booking.CleaningJobDetail.TeamDispatchedAt = now;
                break;
            case BookingStatus.InProgress:
                booking.CleaningJobDetail.TeamArrivedAt = now;
                break;
            case BookingStatus.Completed:
                booking.CleaningJobDetail.CompletedAt = now;
                break;
        }

        booking.CleaningJobDetail.UpdatedAt = now;

        dbContext.ServiceMilestones.Add(new ServiceMilestone
        {
            Id = Guid.NewGuid(),
            BookingId = booking.Id,
            MilestoneType = "CleaningStatusUpdate",
            Status = request.NewStatus.ToString(),
            Notes = request.Notes,
            OccurredAt = now
        });

        await dbContext.SaveChangesAsync(cancellationToken);

        return ApiResult<BookingDto>.Success(new BookingDto(booking.Id, booking.CustomerProfileId, booking.ServiceId, booking.AddressId, booking.ScheduledStart, booking.ScheduledEnd, booking.Status, booking.PaymentStatus, booking.Price, booking.Currency));
    }
}

// --- Complete Cleaning with Report ---
public sealed record CompleteCleaningCommand(Guid BookingId, List<string> AfterPhotos, string? CleanerNotes, List<string>? CompletedChecklistItems) : IRequest<ApiResult<CleaningReportDto>>;

public sealed class CompleteCleaningCommandValidator : AbstractValidator<CompleteCleaningCommand>
{
    public CompleteCleaningCommandValidator()
    {
        RuleFor(x => x.BookingId).NotEmpty();
        RuleFor(x => x.AfterPhotos).NotEmpty();
    }
}

public sealed class CompleteCleaningCommandHandler(CleanConnectDbContext dbContext) : IRequestHandler<CompleteCleaningCommand, ApiResult<CleaningReportDto>>
{
    public async Task<ApiResult<CleaningReportDto>> Handle(CompleteCleaningCommand request, CancellationToken cancellationToken)
    {
        var booking = await dbContext.Bookings
            .Include(x => x.CleaningJobDetail)
            .Include(x => x.JobCompletion)
            .SingleOrDefaultAsync(x => x.Id == request.BookingId, cancellationToken);

        if (booking is null)
        {
            return ApiResult<CleaningReportDto>.Failure("Booking was not found.");
        }

        var now = DateTimeOffset.UtcNow;
        booking.Status = BookingStatus.Completed;
        booking.UpdatedAt = now;

        if (booking.CleaningJobDetail is null)
        {
            booking.CleaningJobDetail = new CleaningJobDetail
            {
                Id = Guid.NewGuid(),
                BookingId = booking.Id,
                CleaningType = "Standard",
                CreatedAt = now
            };
            dbContext.CleaningJobDetails.Add(booking.CleaningJobDetail);
        }

        booking.CleaningJobDetail.AfterPhotosJson = JsonSerializer.Serialize(request.AfterPhotos);
        booking.CleaningJobDetail.CleanerNotes = request.CleanerNotes;
        booking.CleaningJobDetail.CompletedAt = now;
        booking.CleaningJobDetail.UpdatedAt = now;

        // Update or create JobCompletion for overall completion tracking
        if (booking.JobCompletion is null)
        {
            booking.JobCompletion = new JobCompletion
            {
                Id = Guid.NewGuid(),
                BookingId = booking.Id,
                CreatedAt = now
            };
            dbContext.JobCompletions.Add(booking.JobCompletion);
        }

        booking.JobCompletion.CheckOutTime = now;
        booking.JobCompletion.CompletionStatus = BookingStatus.Completed.ToString();
        booking.JobCompletion.PhotosJson = JsonSerializer.Serialize(request.AfterPhotos);
        booking.JobCompletion.CleanerNotes = request.CleanerNotes;
        if (request.CompletedChecklistItems is not null)
        {
            booking.JobCompletion.CompletedChecklistItemsJson = JsonSerializer.Serialize(request.CompletedChecklistItems);
        }
        booking.JobCompletion.UpdatedAt = now;

        dbContext.ServiceMilestones.Add(new ServiceMilestone
        {
            Id = Guid.NewGuid(),
            BookingId = booking.Id,
            MilestoneType = "CleaningCompleted",
            Status = BookingStatus.Completed.ToString(),
            Notes = request.CleanerNotes,
            OccurredAt = now
        });

        await dbContext.SaveChangesAsync(cancellationToken);

        return ApiResult<CleaningReportDto>.Success(new CleaningReportDto(
            booking.Id,
            booking.JobCompletion.CompletionStatus,
            request.AfterPhotos,
            request.CleanerNotes,
            booking.JobCompletion.CheckInTime,
            booking.JobCompletion.CheckOutTime));
    }
}

// --- Legacy: Direct Booking Creation ---
public sealed record CreateCleaningBookingCommand(Guid CustomerProfileId, Guid ServiceId, Guid AddressId, DateTimeOffset ScheduledStart, DateTimeOffset ScheduledEnd, string? SpecialInstructions, string? AccessNotes, bool HasPets, string? ParkingInformation) : IRequest<ApiResult<BookingDto>>;

public sealed class CreateCleaningBookingCommandValidator : AbstractValidator<CreateCleaningBookingCommand>
{
    public CreateCleaningBookingCommandValidator()
    {
        RuleFor(x => x.CustomerProfileId).NotEmpty();
        RuleFor(x => x.ServiceId).NotEmpty();
        RuleFor(x => x.AddressId).NotEmpty();
        RuleFor(x => x.ScheduledEnd).GreaterThan(x => x.ScheduledStart);
    }
}

public sealed class CreateCleaningBookingCommandHandler(CleanConnectDbContext dbContext) : IRequestHandler<CreateCleaningBookingCommand, ApiResult<BookingDto>>
{
    public async Task<ApiResult<BookingDto>> Handle(CreateCleaningBookingCommand request, CancellationToken cancellationToken)
    {
        var service = await dbContext.Services.SingleOrDefaultAsync(x => x.Id == request.ServiceId && x.IsActive, cancellationToken);
        if (service is null || !service.Category.Equals(ServiceCategory.Cleaning.ToString(), StringComparison.OrdinalIgnoreCase))
        {
            return ApiResult<BookingDto>.Failure("Cleaning service was not found or is inactive.");
        }

        var addressBelongsToCustomer = await dbContext.Addresses.AnyAsync(x => x.Id == request.AddressId && x.CustomerProfileId == request.CustomerProfileId, cancellationToken);
        if (!addressBelongsToCustomer)
        {
            return ApiResult<BookingDto>.Failure("Address was not found for the customer.");
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
            Price = service.BasePrice,
            Currency = "ZAR",
            SpecialInstructions = request.SpecialInstructions,
            AccessNotes = request.AccessNotes,
            HasPets = request.HasPets,
            ParkingInformation = request.ParkingInformation,
            CreatedAt = now,
            UpdatedAt = now
        };

        dbContext.Bookings.Add(booking);
        dbContext.ServiceMilestones.Add(new ServiceMilestone { Id = Guid.NewGuid(), BookingId = booking.Id, MilestoneType = "Cleaning", Status = BookingStatus.PendingPayment.ToString(), OccurredAt = now });
        await dbContext.SaveChangesAsync(cancellationToken);

        return ApiResult<BookingDto>.Success(new BookingDto(booking.Id, booking.CustomerProfileId, booking.ServiceId, booking.AddressId, booking.ScheduledStart, booking.ScheduledEnd, booking.Status, booking.PaymentStatus, booking.Price, booking.Currency));
    }
}
