using System.Text.Json;
using CleanConnect.Application.Common;
using CleanConnect.Application.Notifications;
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
            .Include(x => x.Service)
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
            AddressId = cleaningRequest.AddressId,
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

        return ApiResult<BookingDto>.Success(new BookingDto(booking.Id, booking.CustomerProfileId, booking.ServiceId, cleaningRequest.Service?.Name ?? "", cleaningRequest.Service?.Category ?? "", booking.AddressId ?? Guid.Empty, cleaningRequest.Address?.Label ?? "", $"{cleaningRequest.Address?.StreetAddress}, {cleaningRequest.Address?.Suburb}", booking.ScheduledStart, booking.ScheduledEnd, booking.Status, booking.PaymentStatus, booking.Price, booking.Currency, booking.PayOnsite, booking.CreatedAt));
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
            .Include(x => x.Service)
            .Include(x => x.Address)
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

        BookingNotifications.Add(dbContext, booking.CustomerProfileId, booking.Id,
            "Booking update",
            BookingNotifications.DescribeStatus(request.NewStatus, booking.Service?.Name));

        await dbContext.SaveChangesAsync(cancellationToken);

        return ApiResult<BookingDto>.Success(new BookingDto(booking.Id, booking.CustomerProfileId, booking.ServiceId, booking.Service?.Name ?? "", booking.Service?.Category ?? "", booking.AddressId ?? Guid.Empty, booking.Address?.Label ?? booking.AddressLabel ?? "", booking.Address != null ? $"{booking.Address.StreetAddress}, {booking.Address.Suburb}" : $"{booking.AddressStreet}, {booking.AddressSuburb}", booking.ScheduledStart, booking.ScheduledEnd, booking.Status, booking.PaymentStatus, booking.Price, booking.Currency, booking.PayOnsite, booking.CreatedAt));
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

        BookingNotifications.Add(dbContext, booking.CustomerProfileId, booking.Id,
            "Job completed",
            BookingNotifications.DescribeStatus(BookingStatus.Completed, booking.Service?.Name));

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
// A one-time service address captured on the booking that is NOT persisted to the customer's saved addresses.
public sealed record OneTimeAddressRequest(string StreetAddress, string Suburb, string City, string Province, string? PostalCode = null, string? Label = null);

public sealed record CreateCleaningBookingCommand(Guid CustomerProfileId, Guid? ServiceId, List<Guid>? ServiceIds, Guid? AddressId, DateTimeOffset ScheduledStart, DateTimeOffset ScheduledEnd, string? SpecialInstructions, string? AccessNotes, bool HasPets, string? ParkingInformation, bool PayOnsite = false, OneTimeAddressRequest? OneTimeAddress = null, string? RecurrenceFrequency = null, int RecurrenceCount = 1) : IRequest<ApiResult<List<BookingDto>>>;

public sealed class CreateCleaningBookingCommandValidator : AbstractValidator<CreateCleaningBookingCommand>
{
    public CreateCleaningBookingCommandValidator()
    {
        RuleFor(x => x.CustomerProfileId).NotEmpty();
        RuleFor(x => x)
            .Must(x => x.ServiceId.HasValue && x.ServiceId.Value != Guid.Empty || (x.ServiceIds is { Count: > 0 }))
            .WithMessage("At least one service must be selected.");
        RuleFor(x => x.ScheduledEnd).GreaterThan(x => x.ScheduledStart);
        RuleFor(x => x)
            .Must(x => (x.AddressId.HasValue && x.AddressId.Value != Guid.Empty) || x.OneTimeAddress is not null)
            .WithMessage("Either a saved address or a one-time address must be provided.");
        When(x => x.OneTimeAddress is not null, () =>
        {
            RuleFor(x => x.OneTimeAddress!.StreetAddress).NotEmpty().MaximumLength(255);
            RuleFor(x => x.OneTimeAddress!.Suburb).NotEmpty().MaximumLength(100);
            RuleFor(x => x.OneTimeAddress!.City).NotEmpty().MaximumLength(100);
            RuleFor(x => x.OneTimeAddress!.Province).NotEmpty().MaximumLength(100);
        });
        RuleFor(x => x.RecurrenceCount).InclusiveBetween(1, 12);
        When(x => !string.IsNullOrWhiteSpace(x.RecurrenceFrequency), () =>
        {
            RuleFor(x => x.RecurrenceFrequency)
                .Must(f => f is "Weekly" or "BiWeekly" or "Monthly")
                .WithMessage("Recurrence frequency must be Weekly, BiWeekly, or Monthly.");
        });
    }
}

public sealed class CreateCleaningBookingCommandHandler(CleanConnectDbContext dbContext) : IRequestHandler<CreateCleaningBookingCommand, ApiResult<List<BookingDto>>>
{
    public async Task<ApiResult<List<BookingDto>>> Handle(CreateCleaningBookingCommand request, CancellationToken cancellationToken)
    {
        var requestedServiceIds = new List<Guid>();
        if (request.ServiceIds is { Count: > 0 })
        {
            requestedServiceIds.AddRange(request.ServiceIds);
        }
        if (request.ServiceId.HasValue && request.ServiceId.Value != Guid.Empty && !requestedServiceIds.Contains(request.ServiceId.Value))
        {
            requestedServiceIds.Add(request.ServiceId.Value);
        }

        if (requestedServiceIds.Count == 0)
        {
            return ApiResult<List<BookingDto>>.Failure("At least one service must be selected.");
        }

        var services = await dbContext.Services
            .Where(x => requestedServiceIds.Contains(x.Id) && x.IsActive)
            .ToListAsync(cancellationToken);

        if (services.Count != requestedServiceIds.Count)
        {
            return ApiResult<List<BookingDto>>.Failure("One or more selected services were not found or are inactive.");
        }

        var primaryService = services.First();
        var totalPrice = services.Sum(x => x.BasePrice);
        var serviceDtos = services.Select((x, idx) => new BookingServiceDto(x.Id, x.Name, x.Category, x.BasePrice) { }).ToList();

        string addressLabel;
        string addressSummary;
        Guid? addressId = null;

        if (request.AddressId.HasValue && request.AddressId.Value != Guid.Empty)
        {
            var address = await dbContext.Addresses.SingleOrDefaultAsync(x => x.Id == request.AddressId.Value && x.CustomerProfileId == request.CustomerProfileId, cancellationToken);
            if (address is null)
            {
                return ApiResult<List<BookingDto>>.Failure("Address was not found for the customer.");
            }
            addressId = address.Id;
            addressLabel = address.Label;
            addressSummary = $"{address.StreetAddress}, {address.Suburb}";
        }
        else if (request.OneTimeAddress is not null)
        {
            var ot = request.OneTimeAddress;
            addressLabel = string.IsNullOrWhiteSpace(ot.Label) ? "Service address" : ot.Label.Trim();
            addressSummary = $"{ot.StreetAddress.Trim()}, {ot.Suburb.Trim()}";
        }
        else
        {
            return ApiResult<List<BookingDto>>.Failure("Either a saved address or a one-time address must be provided.");
        }

        var count = Math.Clamp(request.RecurrenceCount, 1, 12);
        var isRecurring = count > 1 && !string.IsNullOrWhiteSpace(request.RecurrenceFrequency);
        var groupId = isRecurring ? Guid.NewGuid() : (Guid?)null;
        var results = new List<BookingDto>();
        var now = DateTimeOffset.UtcNow;

        for (int i = 0; i < count; i++)
        {
            var offset = GetDateOffset(request.RecurrenceFrequency, i);
            var start = request.ScheduledStart.Add(offset);
            var end = request.ScheduledEnd.Add(offset);

            var booking = new Booking
            {
                Id = Guid.NewGuid(),
                CustomerProfileId = request.CustomerProfileId,
                ServiceId = primaryService.Id,
                ScheduledStart = start,
                ScheduledEnd = end,
                Status = request.PayOnsite ? BookingStatus.Confirmed : BookingStatus.PendingPayment,
                PaymentStatus = PaymentStatus.Pending,
                Price = totalPrice,
                Currency = "ZAR",
                SpecialInstructions = request.SpecialInstructions,
                AccessNotes = request.AccessNotes,
                HasPets = request.HasPets,
                ParkingInformation = request.ParkingInformation,
                PayOnsite = request.PayOnsite,
                CreatedAt = now,
                UpdatedAt = now,
                IsRecurring = isRecurring,
                RecurrenceGroupId = groupId,
                RecurrenceFrequency = isRecurring ? request.RecurrenceFrequency : null,
                RecurrenceIndex = isRecurring ? i + 1 : null
            };

            if (addressId.HasValue)
            {
                booking.AddressId = addressId.Value;
            }
            else if (request.OneTimeAddress is not null)
            {
                var ot = request.OneTimeAddress;
                booking.AddressLabel = string.IsNullOrWhiteSpace(ot.Label) ? "Service address" : ot.Label.Trim();
                booking.AddressStreet = ot.StreetAddress.Trim();
                booking.AddressSuburb = ot.Suburb.Trim();
                booking.AddressCity = ot.City.Trim();
                booking.AddressProvince = ot.Province.Trim();
                booking.AddressPostalCode = ot.PostalCode?.Trim();
            }

            dbContext.Bookings.Add(booking);
            dbContext.ServiceMilestones.Add(new ServiceMilestone { Id = Guid.NewGuid(), BookingId = booking.Id, MilestoneType = primaryService.Category, Status = booking.Status.ToString(), OccurredAt = now });

            foreach (var svc in services)
            {
                dbContext.BookingServices.Add(new BookingService
                {
                    BookingId = booking.Id,
                    ServiceId = svc.Id,
                    ServiceName = svc.Name,
                    ServiceCategory = svc.Category,
                    UnitPrice = svc.BasePrice,
                    SortOrder = services.IndexOf(svc)
                });
            }

            results.Add(new BookingDto(booking.Id, booking.CustomerProfileId, booking.ServiceId, primaryService.Name, primaryService.Category, booking.AddressId ?? Guid.Empty, addressLabel, addressSummary, booking.ScheduledStart, booking.ScheduledEnd, booking.Status, booking.PaymentStatus, booking.Price, booking.Currency, booking.PayOnsite, booking.CreatedAt, booking.IsRecurring, booking.RecurrenceFrequency, booking.RecurrenceGroupId, booking.RecurrenceIndex, serviceDtos));
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return ApiResult<List<BookingDto>>.Success(results);
    }

    private static TimeSpan GetDateOffset(string? frequency, int index)
    {
        if (string.IsNullOrWhiteSpace(frequency) || index == 0) return TimeSpan.Zero;
        return frequency switch
        {
            "Weekly" => TimeSpan.FromDays(7 * index),
            "BiWeekly" => TimeSpan.FromDays(14 * index),
            "Monthly" => TimeSpan.FromDays(30 * index), // Approximate; for precision use AddMonths in loop
            _ => TimeSpan.Zero
        };
    }
}

// --- Provider Accept Booking ---
public enum AcceptBookingScope { Single, Selected, AllInSeries }

public sealed record AcceptBookingCommand(Guid BookingId, Guid ProviderId, AcceptBookingScope Scope = AcceptBookingScope.Single, List<Guid>? SelectedBookingIds = null) : IRequest<ApiResult<List<BookingDto>>>;

public sealed class AcceptBookingCommandValidator : AbstractValidator<AcceptBookingCommand>
{
    public AcceptBookingCommandValidator()
    {
        RuleFor(x => x.BookingId).NotEmpty();
        RuleFor(x => x.ProviderId).NotEmpty();
        When(x => x.Scope == AcceptBookingScope.Selected, () =>
        {
            RuleFor(x => x.SelectedBookingIds).NotNull().Must(ids => ids!.Count > 0).WithMessage("At least one booking must be selected.");
        });
    }
}

public sealed class AcceptBookingCommandHandler(CleanConnectDbContext dbContext) : IRequestHandler<AcceptBookingCommand, ApiResult<List<BookingDto>>>
{
    public async Task<ApiResult<List<BookingDto>>> Handle(AcceptBookingCommand request, CancellationToken cancellationToken)
    {
        var primaryBooking = await dbContext.Bookings
            .Include(x => x.Service)
            .Include(x => x.Address)
            .Include(x => x.BookingServices)
            .SingleOrDefaultAsync(x => x.Id == request.BookingId, cancellationToken);

        if (primaryBooking is null)
            return ApiResult<List<BookingDto>>.Failure("Booking was not found.");

        var provider = await dbContext.Providers.SingleOrDefaultAsync(x => x.Id == request.ProviderId && x.IsEligibleForBookings, cancellationToken);
        if (provider is null)
            return ApiResult<List<BookingDto>>.Failure("Provider was not found or is not eligible for bookings.");

        // Provider must offer all requested service categories.
        var requiredCategories = primaryBooking.BookingServices.Count > 0
            ? primaryBooking.BookingServices.Select(x => x.ServiceCategory).Distinct().ToList()
            : new List<string> { primaryBooking.Service?.Category ?? "" };
        var missingCategories = requiredCategories.Where(c => !string.IsNullOrWhiteSpace(c) && !provider.ServiceCategories.Any(pc => pc.ToString().Equals(c, StringComparison.OrdinalIgnoreCase))).ToList();
        if (missingCategories.Count > 0)
        {
            return ApiResult<List<BookingDto>>.Failure($"Provider does not offer all requested services. Missing: {string.Join(", ", missingCategories)}");
        }

        // Determine which bookings to accept
        var bookingIdsToAccept = new List<Guid> { request.BookingId };
        if (request.Scope == AcceptBookingScope.AllInSeries && primaryBooking.RecurrenceGroupId.HasValue)
        {
            var seriesIds = await dbContext.Bookings
                .AsNoTracking()
                .Where(x => x.RecurrenceGroupId == primaryBooking.RecurrenceGroupId && (x.Status == BookingStatus.Confirmed || x.Status == BookingStatus.PendingPayment))
                .Select(x => x.Id)
                .ToListAsync(cancellationToken);
            bookingIdsToAccept = seriesIds;
        }
        else if (request.Scope == AcceptBookingScope.Selected && request.SelectedBookingIds is { Count: > 0 })
        {
            bookingIdsToAccept = request.SelectedBookingIds.Distinct().ToList();
        }

        var results = new List<BookingDto>();
        var now = DateTimeOffset.UtcNow;

        foreach (var bookingId in bookingIdsToAccept)
        {
            var booking = await dbContext.Bookings
                .Include(x => x.Service)
                .Include(x => x.Address)
                .Include(x => x.BookingServices)
                .SingleOrDefaultAsync(x => x.Id == bookingId, cancellationToken);

            if (booking is null || (booking.Status != BookingStatus.Confirmed && booking.Status != BookingStatus.PendingPayment))
                continue;

            var bookingServices = booking.BookingServices
                .OrderBy(x => x.SortOrder)
                .Select(x => new BookingServiceDto(x.ServiceId, x.ServiceName, x.ServiceCategory, x.UnitPrice))
                .ToList();

            booking.Status = BookingStatus.Assigned;
            booking.UpdatedAt = now;

            var assignment = await dbContext.Assignments.SingleOrDefaultAsync(x => x.BookingId == bookingId, cancellationToken);
            if (assignment is null)
            {
                assignment = new Assignment
                {
                    Id = Guid.NewGuid(),
                    BookingId = booking.Id,
                    AssignedType = AssignmentType.MarketplaceProvider,
                    ProviderId = provider.Id,
                    Status = AssignmentStatus.Accepted,
                    AssignedAt = now,
                    AcceptedAt = now
                };
                dbContext.Assignments.Add(assignment);
            }
            else
            {
                assignment.ProviderId = provider.Id;
                assignment.Status = AssignmentStatus.Accepted;
                assignment.AcceptedAt = now;
            }

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

            dbContext.ServiceMilestones.Add(new ServiceMilestone
            {
                Id = Guid.NewGuid(),
                BookingId = booking.Id,
                MilestoneType = "BookingAccepted",
                Status = BookingStatus.Assigned.ToString(),
                OccurredAt = now
            });

            BookingNotifications.Add(dbContext, booking.CustomerProfileId, booking.Id,
                "Booking accepted",
                BookingNotifications.DescribeStatus(BookingStatus.Assigned, booking.Service?.Name));

            results.Add(new BookingDto(booking.Id, booking.CustomerProfileId, booking.ServiceId, booking.Service?.Name ?? "", booking.Service?.Category ?? "", booking.AddressId ?? Guid.Empty, booking.Address?.Label ?? booking.AddressLabel ?? "", booking.Address != null ? $"{booking.Address.StreetAddress}, {booking.Address.Suburb}" : $"{booking.AddressStreet}, {booking.AddressSuburb}", booking.ScheduledStart, booking.ScheduledEnd, booking.Status, booking.PaymentStatus, booking.Price, booking.Currency, booking.PayOnsite, booking.CreatedAt, booking.IsRecurring, booking.RecurrenceFrequency, booking.RecurrenceGroupId, booking.RecurrenceIndex, bookingServices));
        }

        if (results.Count == 0)
            return ApiResult<List<BookingDto>>.Failure("No bookings could be accepted.");

        await dbContext.SaveChangesAsync(cancellationToken);
        return ApiResult<List<BookingDto>>.Success(results);
    }
}

// --- Assign Cleaner to Booking ---
public sealed record AssignCleanerToBookingCommand(Guid BookingId, Guid CleanerProfileId) : IRequest<ApiResult<BookingDto>>;

public sealed class AssignCleanerToBookingCommandValidator : AbstractValidator<AssignCleanerToBookingCommand>
{
    public AssignCleanerToBookingCommandValidator()
    {
        RuleFor(x => x.BookingId).NotEmpty();
        RuleFor(x => x.CleanerProfileId).NotEmpty();
    }
}

public sealed class AssignCleanerToBookingCommandHandler(CleanConnectDbContext dbContext) : IRequestHandler<AssignCleanerToBookingCommand, ApiResult<BookingDto>>
{
    public async Task<ApiResult<BookingDto>> Handle(AssignCleanerToBookingCommand request, CancellationToken cancellationToken)
    {
        var booking = await dbContext.Bookings
            .Include(x => x.Service)
            .Include(x => x.Address)
            .Include(x => x.CleaningJobDetail)
            .SingleOrDefaultAsync(x => x.Id == request.BookingId, cancellationToken);

        if (booking is null)
            return ApiResult<BookingDto>.Failure("Booking was not found.");

        if (booking.Status != BookingStatus.Assigned && booking.Status != BookingStatus.Confirmed)
            return ApiResult<BookingDto>.Failure("Booking must be accepted before assigning a cleaner.");

        var cleaner = await dbContext.CleanerProfiles
            .Include(x => x.User)
            .SingleOrDefaultAsync(x => x.Id == request.CleanerProfileId && x.Status == AccountStatus.Active, cancellationToken);

        if (cleaner is null)
            return ApiResult<BookingDto>.Failure("Cleaner was not found or is not active.");

        var now = DateTimeOffset.UtcNow;

        // Find or create assignment
        var assignment = await dbContext.Assignments.SingleOrDefaultAsync(x => x.BookingId == request.BookingId, cancellationToken);
        if (assignment is null)
        {
            assignment = new Assignment
            {
                Id = Guid.NewGuid(),
                BookingId = booking.Id,
                AssignedType = AssignmentType.InternalCleaner,
                CleanerProfileId = cleaner.Id,
                Status = AssignmentStatus.Accepted,
                AssignedAt = now,
                AcceptedAt = now
            };
            dbContext.Assignments.Add(assignment);
        }
        else
        {
            assignment.CleanerProfileId = cleaner.Id;
            assignment.AssignedType = AssignmentType.InternalCleaner;
            assignment.Status = AssignmentStatus.Accepted;
        }

        // Update booking status to CleanerEnRoute (dispatched)
        booking.Status = BookingStatus.CleanerEnRoute;
        booking.UpdatedAt = now;

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

        booking.CleaningJobDetail.TeamDispatchedAt = now;
        booking.CleaningJobDetail.UpdatedAt = now;

        dbContext.ServiceMilestones.Add(new ServiceMilestone
        {
            Id = Guid.NewGuid(),
            BookingId = booking.Id,
            MilestoneType = "CleanerAssigned",
            Status = BookingStatus.CleanerEnRoute.ToString(),
            Notes = $"Assigned to {cleaner.User.FirstName} {cleaner.User.LastName}",
            OccurredAt = now
        });

        BookingNotifications.Add(dbContext, booking.CustomerProfileId, booking.Id,
            "Cleaner assigned",
            $"{cleaner.User.FirstName} {cleaner.User.LastName} has been assigned to {booking.Service?.Name ?? "your booking"} and is on the way.");

        await dbContext.SaveChangesAsync(cancellationToken);

        return ApiResult<BookingDto>.Success(new BookingDto(booking.Id, booking.CustomerProfileId, booking.ServiceId, booking.Service?.Name ?? "", booking.Service?.Category ?? "", booking.AddressId ?? Guid.Empty, booking.Address?.Label ?? booking.AddressLabel ?? "", booking.Address != null ? $"{booking.Address.StreetAddress}, {booking.Address.Suburb}" : $"{booking.AddressStreet}, {booking.AddressSuburb}", booking.ScheduledStart, booking.ScheduledEnd, booking.Status, booking.PaymentStatus, booking.Price, booking.Currency, booking.PayOnsite, booking.CreatedAt));
    }
}

// --- Assign Team to Booking ---
public sealed record AssignTeamCommand(
    Guid BookingId,
    List<Guid> CleanerProfileIds,
    Guid? SupervisorProfileId
) : IRequest<ApiResult<BookingDto>>;

public sealed class AssignTeamCommandValidator : AbstractValidator<AssignTeamCommand>
{
    public AssignTeamCommandValidator()
    {
        RuleFor(x => x.BookingId).NotEmpty();
        RuleFor(x => x.CleanerProfileIds).NotEmpty().WithMessage("At least one cleaner must be selected.");
    }
}

public sealed class AssignTeamCommandHandler(CleanConnectDbContext dbContext)
    : IRequestHandler<AssignTeamCommand, ApiResult<BookingDto>>
{
    public async Task<ApiResult<BookingDto>> Handle(AssignTeamCommand request, CancellationToken cancellationToken)
    {
        var booking = await dbContext.Bookings
            .Include(x => x.Service)
            .Include(x => x.Address)
            .Include(x => x.CleaningJobDetail)
            .SingleOrDefaultAsync(x => x.Id == request.BookingId, cancellationToken);

        if (booking is null)
            return ApiResult<BookingDto>.Failure("Booking was not found.");

        if (booking.Status != BookingStatus.Assigned && booking.Status != BookingStatus.Confirmed)
            return ApiResult<BookingDto>.Failure("Booking must be accepted before assigning a team.");

        var cleaners = await dbContext.CleanerProfiles
            .Include(x => x.User)
            .Where(x => request.CleanerProfileIds.Contains(x.Id))
            .ToListAsync(cancellationToken);

        if (cleaners.Count == 0)
            return ApiResult<BookingDto>.Failure("No valid cleaners found.");

        User? supervisor = null;
        if (request.SupervisorProfileId.HasValue)
        {
            var supervisorProfile = await dbContext.SupervisorProfiles
                .Include(x => x.User)
                .SingleOrDefaultAsync(x => x.Id == request.SupervisorProfileId.Value, cancellationToken);
            supervisor = supervisorProfile?.User;
        }

        var now = DateTimeOffset.UtcNow;

        var assignment = await dbContext.Assignments
            .SingleOrDefaultAsync(x => x.BookingId == request.BookingId, cancellationToken);

        if (assignment is null)
        {
            assignment = new Assignment
            {
                Id = Guid.NewGuid(),
                BookingId = booking.Id,
                AssignedType = AssignmentType.InternalCleaner,
                Status = AssignmentStatus.Accepted,
                AssignedAt = now,
                AcceptedAt = now
            };
            dbContext.Assignments.Add(assignment);
        }

        assignment.CleanerProfileId = cleaners[0].Id;
        assignment.AssignedType = AssignmentType.InternalCleaner;
        assignment.Status = AssignmentStatus.Accepted;
        assignment.TeamCleanerProfileIdsJson = System.Text.Json.JsonSerializer.Serialize(
            cleaners.Select(c => c.Id).ToList());
        assignment.SupervisorId = supervisor?.Id;

        booking.Status = BookingStatus.CleanerEnRoute;
        booking.UpdatedAt = now;

        if (booking.CleaningJobDetail is not null)
        {
            booking.CleaningJobDetail.TeamDispatchedAt = now;
            booking.CleaningJobDetail.UpdatedAt = now;
        }

        var cleanerNames = string.Join(", ", cleaners.Select(c => $"{c.User.FirstName} {c.User.LastName}"));
        var milestoneNote = supervisor is not null
            ? $"Team: {cleanerNames}. Supervisor: {supervisor.FirstName} {supervisor.LastName}"
            : $"Team: {cleanerNames}";

        dbContext.ServiceMilestones.Add(new ServiceMilestone
        {
            Id = Guid.NewGuid(),
            BookingId = booking.Id,
            MilestoneType = "TeamAssigned",
            Status = BookingStatus.CleanerEnRoute.ToString(),
            Notes = milestoneNote,
            OccurredAt = now
        });

        BookingNotifications.Add(dbContext, booking.CustomerProfileId, booking.Id,
            "Team assigned",
            $"A team has been assigned to {booking.Service?.Name ?? "your booking"} and is on the way.");

        await dbContext.SaveChangesAsync(cancellationToken);

        return ApiResult<BookingDto>.Success(new BookingDto(booking.Id, booking.CustomerProfileId, booking.ServiceId, booking.Service?.Name ?? "", booking.Service?.Category ?? "", booking.AddressId ?? Guid.Empty, booking.Address?.Label ?? booking.AddressLabel ?? "", booking.Address != null ? $"{booking.Address.StreetAddress}, {booking.Address.Suburb}" : $"{booking.AddressStreet}, {booking.AddressSuburb}", booking.ScheduledStart, booking.ScheduledEnd, booking.Status, booking.PaymentStatus, booking.Price, booking.Currency, booking.PayOnsite, booking.CreatedAt));
    }
}
