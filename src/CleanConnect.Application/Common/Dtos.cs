using CleanConnect.Infrastructure.Entities;

namespace CleanConnect.Application.Common;

public sealed record ServiceDto(Guid Id, string Name, string Description, string Category, decimal BasePrice, int EstimatedDurationMinutes, int RequiredCleaners);

public sealed record UserDto(Guid Id, string FirstName, string LastName, string Email, string PhoneNumber, UserRole Role, AccountStatus Status, string? IdNumber, bool MustChangePassword, bool LivenessRequired, DateTimeOffset? LivenessVerifiedAt, CustomerProfileDto? CustomerProfile, CleanerProfileDto? CleanerProfile, SupervisorProfileDto? SupervisorProfile);

public sealed record CustomerProfileDto(Guid Id, CustomerType CustomerType, string? CompanyName, string? VatNumber, string? BillingAddress, string? DefaultPaymentMethodReference, List<AddressDto> Addresses);

public sealed record AddressDto(Guid Id, string Label, string StreetAddress, string Suburb, string City, string Province, string PostalCode, string? AccessInstructions);

public sealed record ReviewDto(Guid Id, int Rating, string? Comment, DateTimeOffset CreatedAt);

public sealed record BookingServiceDto(Guid ServiceId, string ServiceName, string ServiceCategory, decimal UnitPrice);

public sealed record CustomerBookingDto(Guid Id, Guid ServiceId, string ServiceName, string ServiceCategory, Guid AddressId, string AddressLabel, string AddressSummary, DateTimeOffset ScheduledStart, DateTimeOffset ScheduledEnd, BookingStatus Status, PaymentStatus PaymentStatus, decimal Price, string Currency, bool PayOnsite, DateTimeOffset CreatedAt, ReviewDto? Review, List<BookingServiceDto>? Services = null, List<AssignmentDto>? Assignments = null, CleaningJobDetailDto? JobDetail = null);

public sealed record ProviderBookingDto(Guid Id, Guid ServiceId, string ServiceName, string ServiceCategory, Guid AddressId, string AddressLabel, string AddressSummary, decimal? AddressLatitude, decimal? AddressLongitude, DateTimeOffset ScheduledStart, DateTimeOffset ScheduledEnd, BookingStatus Status, PaymentStatus PaymentStatus, decimal Price, string Currency, bool PayOnsite, DateTimeOffset CreatedAt, List<BookingServiceDto>? Services = null);

public sealed record CleanerProfileDto(Guid Id, Guid? ProviderId, EmploymentType EmploymentType, StaffRole StaffRole, string Skills, string ServiceZones, decimal Rating, AccountStatus Status, VettingStatus VettingStatus, string? VettingNotes, DateTimeOffset? VettedAt, string? IdDocumentUrl, DateTimeOffset? IdVerifiedAt, string? ProfilePictureUrl);

public sealed record BookingDto(Guid Id, Guid CustomerProfileId, Guid ServiceId, string ServiceName, string ServiceCategory, Guid AddressId, string AddressLabel, string AddressSummary, DateTimeOffset ScheduledStart, DateTimeOffset ScheduledEnd, BookingStatus Status, PaymentStatus PaymentStatus, decimal Price, string Currency, bool PayOnsite, DateTimeOffset CreatedAt, bool IsRecurring = false, string? RecurrenceFrequency = null, Guid? RecurrenceGroupId = null, int? RecurrenceIndex = null, List<BookingServiceDto>? Services = null);

public sealed record BookingDetailDto(
    Guid Id,
    Guid CustomerProfileId,
    Guid ServiceId,
    string ServiceName,
    string ServiceCategory,
    Guid AddressId,
    string AddressLabel,
    string AddressSummary,
    DateTimeOffset ScheduledStart,
    DateTimeOffset ScheduledEnd,
    BookingStatus Status,
    PaymentStatus PaymentStatus,
    decimal Price,
    string Currency,
    DateTimeOffset CreatedAt,
    bool PayOnsite,
    CleaningJobDetailDto? JobDetail,
    List<AssignmentDto> Assignments,
    List<ServiceMilestoneDto> Milestones,
    bool IsRecurring = false,
    string? RecurrenceFrequency = null,
    Guid? RecurrenceGroupId = null,
    int? RecurrenceIndex = null,
    int? RecurrenceCount = null,
    List<BookingServiceDto>? Services = null,
    string? SpecialInstructions = null,
    string? AccessNotes = null,
    bool HasPets = false,
    string? ParkingInformation = null
);

public sealed record CleaningJobDetailDto(
    Guid Id,
    string CleaningType,
    int? NumberOfRooms,
    decimal? SquareMeters,
    bool HasPets,
    string? SpecialInstructions,
    List<string> BeforePhotos,
    List<string> AfterPhotos,
    string? CleanerNotes,
    DateTimeOffset? TeamDispatchedAt,
    DateTimeOffset? TeamArrivedAt,
    DateTimeOffset? CompletedAt,
    string? VehicleRegistration = null,
    VehicleType? VehicleType = null
);

public sealed record TeamMemberDto(Guid ProfileId, Guid UserId, string Name, string MemberRole, string EmploymentType, string Skills, string ServiceZones, decimal Rating, string Email, string PhoneNumber, string Status, string VettingStatus, string? IdDocumentUrl, DateTimeOffset? IdVerifiedAt, string? ProfilePictureUrl);

public sealed record AssignmentDto(Guid Id, Guid? CleanerProfileId, string? CleanerName, Guid? ProviderId, string? ProviderName, AssignmentType AssignedType, AssignmentStatus Status, DateTimeOffset AssignedAt, DateTimeOffset? AcceptedAt, List<TeamMemberDto>? TeamMembers = null, string? SupervisorName = null);

public sealed record ServiceMilestoneDto(string MilestoneType, string Status, string? Notes, DateTimeOffset OccurredAt);

public sealed record ProviderDto(Guid Id, string CompanyName, string RegistrationNumber, ProviderStatus Status, JoiningFeeStatus JoiningFeeStatus, decimal JoiningFeeAmount, decimal CommissionRate, bool IsEligibleForBookings);

public sealed record BusinessProfileDto(Guid Id, string CompanyName, string RegistrationNumber, string? TaxNumber, List<ServiceCategory> ServiceCategories, string? BaseLocation, string? StreetAddress, string? Suburb, string? City, string? Province, string? PostalCode, List<string> ServiceAreas, ProviderStatus Status, JoiningFeeStatus JoiningFeeStatus, decimal JoiningFeeAmount, decimal CommissionRate, decimal? Latitude, decimal? Longitude, decimal ServiceRadiusKm, bool IsEligibleForBookings, DateTimeOffset CreatedAt);

public sealed record ProviderJoiningFeeDto(Guid Id, Guid ProviderId, decimal Amount, string Currency, JoiningFeeStatus Status, string InvoiceNumber, DateOnly? DueDate, DateTimeOffset? PaidAt);

public sealed record ProviderCommissionDto(Guid Id, Guid ProviderId, Guid BookingId, decimal GrossBookingAmount, decimal CommissionRate, decimal CommissionAmount, decimal ProviderNetAmount, CommissionStatus Status);

public sealed record PayoutDto(Guid Id, Guid ProviderId, DateOnly PeriodStart, DateOnly PeriodEnd, decimal GrossAmount, decimal CommissionAmount, decimal JoiningFeeDeductionAmount, decimal AdjustmentAmount, decimal NetAmount, PayoutStatus Status);

public sealed record LaundryBookingDto(Guid BookingId, Guid LaundryJobDetailId, LaundryStatus LaundryStatus, string PackageType, decimal EstimatedWeightKg, decimal? ActualWeightKg, DateTimeOffset PickupWindowStart, DateTimeOffset PickupWindowEnd);

public sealed record CarWashBookingDto(Guid BookingId, Guid CarWashJobDetailId, CarWashStatus CarWashStatus, VehicleType VehicleType, string PackageType, int NumberOfVehicles);

public sealed record CleaningRequestDto(Guid Id, Guid CustomerProfileId, Guid? AddressId, Guid? ServiceId, CleaningRequestStatus Status, string? Notes, DateTimeOffset? PreferredDate, DateTimeOffset? PreferredTimeStart, DateTimeOffset? PreferredTimeEnd, DateTimeOffset CreatedAt);

public sealed record CleaningRequestResponseDto(Guid Id, Guid CleaningRequestId, Guid ProviderId, string ProviderName, CleaningRequestResponseStatus Status, string? ResponseNotes, DateTimeOffset? RespondedAt);

public sealed record NearbyProviderDto(Guid Id, string CompanyName, decimal Rating, decimal? DistanceKm);

public sealed record CleaningReportDto(Guid BookingId, string CompletionStatus, List<string> AfterPhotos, string? CleanerNotes, DateTimeOffset? CheckInTime, DateTimeOffset? CheckOutTime);

public sealed record MembershipPlanDto(Guid Id, string Name, string Description, decimal JoiningFeeAmount, decimal RecurringFeeAmount, string BillingCycle, decimal DefaultCommissionRate, bool IsActive);

public sealed record SupervisorProfileDto(Guid Id, Guid? ProviderId, EmploymentType EmploymentType, string Skills, string ServiceZones, decimal Rating, AccountStatus Status, VettingStatus VettingStatus, string? VettingNotes, DateTimeOffset? VettedAt, string? IdDocumentUrl, DateTimeOffset? IdVerifiedAt, string? ProfilePictureUrl);

public sealed record JobCheckInDto(Guid Id, Guid BookingId, Guid UserId, string UserName, DateTimeOffset CheckInTime, decimal? Latitude, decimal? Longitude, string? PhotoUrl, List<string> PhotoUrls, string? Notes);

public sealed record JobCheckOutDto(Guid Id, Guid BookingId, Guid UserId, string UserName, DateTimeOffset CheckOutTime, decimal? Latitude, decimal? Longitude, string? PhotoUrl, List<string> PhotoUrls, string? Notes, string? WorkSummary);

public sealed record PostJobReportDto(
    Guid Id,
    Guid BookingId,
    Guid CompiledByUserId,
    string CompiledByName,
    DateTimeOffset CompiledAt,
    string Summary,
    string? IssuesFound,
    string? Recommendations,
    int? OverallRating,
    List<string> Photos,
    List<ChecklistResultDto> ChecklistResults
);

public sealed record ChecklistResultDto(string TaskName, bool Completed, string? Notes);

public sealed record NotificationDto(Guid Id, Guid? BookingId, string Title, string Message, string Type, bool IsRead, DateTimeOffset CreatedAt, DateTimeOffset? ReadAt);
