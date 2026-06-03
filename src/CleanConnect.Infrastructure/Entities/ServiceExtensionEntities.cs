namespace CleanConnect.Infrastructure.Entities;

public sealed class LaundryJobDetail
{
    public Guid Id { get; set; }
    public Guid BookingId { get; set; }
    public string PackageType { get; set; } = string.Empty;
    public decimal EstimatedWeightKg { get; set; }
    public decimal? ActualWeightKg { get; set; }
    public DateTimeOffset PickupWindowStart { get; set; }
    public DateTimeOffset PickupWindowEnd { get; set; }
    public DateTimeOffset? DeliveryWindowStart { get; set; }
    public DateTimeOffset? DeliveryWindowEnd { get; set; }
    public LaundryStatus LaundryStatus { get; set; } = LaundryStatus.AwaitingCollection;
    public bool RequiresIroning { get; set; }
    public bool RequiresExpressTurnaround { get; set; }
    public DateTimeOffset? CollectionConfirmedAt { get; set; }
    public DateTimeOffset? DeliveryConfirmedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Booking Booking { get; set; } = null!;
}

public sealed class CarWashJobDetail
{
    public Guid Id { get; set; }
    public Guid BookingId { get; set; }
    public VehicleType VehicleType { get; set; }
    public string? VehicleMake { get; set; }
    public string? VehicleModel { get; set; }
    public string? RegistrationNumber { get; set; }
    public string PackageType { get; set; } = string.Empty;
    public int NumberOfVehicles { get; set; } = 1;
    public bool RequiresInteriorCleaning { get; set; }
    public bool RequiresWax { get; set; }
    public CarWashStatus CarWashStatus { get; set; } = CarWashStatus.ProviderAssigned;
    public DateTimeOffset? ProviderArrivedAt { get; set; }
    public DateTimeOffset? StartedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Booking Booking { get; set; } = null!;
}

public sealed class ServiceMilestone
{
    public Guid Id { get; set; }
    public Guid BookingId { get; set; }
    public string MilestoneType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTimeOffset OccurredAt { get; set; }

    public Booking Booking { get; set; } = null!;
}

public sealed class CleaningRequest
{
    public Guid Id { get; set; }
    public Guid CustomerProfileId { get; set; }
    public Guid? AddressId { get; set; }
    public Guid? ServiceId { get; set; }
    public CleaningRequestStatus Status { get; set; } = CleaningRequestStatus.Requested;
    public string? Notes { get; set; }
    public DateTimeOffset? PreferredDate { get; set; }
    public DateTimeOffset? PreferredTimeStart { get; set; }
    public DateTimeOffset? PreferredTimeEnd { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public CustomerProfile CustomerProfile { get; set; } = null!;
    public Address? Address { get; set; }
    public Service? Service { get; set; }
    public ICollection<CleaningRequestResponse> ProviderResponses { get; set; } = new List<CleaningRequestResponse>();
    public Booking? Booking { get; set; }
}

public sealed class CleaningRequestResponse
{
    public Guid Id { get; set; }
    public Guid CleaningRequestId { get; set; }
    public Guid ProviderId { get; set; }
    public CleaningRequestResponseStatus Status { get; set; } = CleaningRequestResponseStatus.Invited;
    public string? ResponseNotes { get; set; }
    public DateTimeOffset? RespondedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public CleaningRequest CleaningRequest { get; set; } = null!;
    public Provider Provider { get; set; } = null!;
}

public sealed class CleaningJobDetail
{
    public Guid Id { get; set; }
    public Guid BookingId { get; set; }
    public string CleaningType { get; set; } = string.Empty;
    public int? NumberOfRooms { get; set; }
    public decimal? SquareMeters { get; set; }
    public bool HasPets { get; set; }
    public string? SpecialInstructions { get; set; }
    public string BeforePhotosJson { get; set; } = "[]";
    public string AfterPhotosJson { get; set; } = "[]";
    public string? CleanerNotes { get; set; }
    public DateTimeOffset? TeamDispatchedAt { get; set; }
    public DateTimeOffset? TeamArrivedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Booking Booking { get; set; } = null!;
}
