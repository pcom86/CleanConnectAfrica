namespace CleanConnect.Infrastructure.Entities;

public sealed class User
{
    public Guid Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public AccountStatus Status { get; set; } = AccountStatus.Active;
    public string? IdNumber { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public CustomerProfile? CustomerProfile { get; set; }
    public CleanerProfile? CleanerProfile { get; set; }
    public Provider? OwnedProvider { get; set; }
}

public sealed class CustomerProfile
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public CustomerType CustomerType { get; set; }
    public string? CompanyName { get; set; }
    public string? VatNumber { get; set; }
    public string? BillingAddress { get; set; }
    public string? DefaultPaymentMethodReference { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public User User { get; set; } = null!;
    public ICollection<Address> Addresses { get; set; } = new List<Address>();
    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
}

public sealed class Address
{
    public Guid Id { get; set; }
    public Guid CustomerProfileId { get; set; }
    public string Label { get; set; } = string.Empty;
    public string StreetAddress { get; set; } = string.Empty;
    public string Suburb { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Province { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public string? AccessInstructions { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public CustomerProfile CustomerProfile { get; set; } = null!;
    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
}

public sealed class Service
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public decimal BasePrice { get; set; }
    public int EstimatedDurationMinutes { get; set; }
    public int RequiredCleaners { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
    public ICollection<Checklist> Checklists { get; set; } = new List<Checklist>();
}

public sealed class Booking
{
    public Guid Id { get; set; }
    public Guid CustomerProfileId { get; set; }
    public Guid ServiceId { get; set; }
    public Guid AddressId { get; set; }
    public DateTimeOffset ScheduledStart { get; set; }
    public DateTimeOffset ScheduledEnd { get; set; }
    public BookingStatus Status { get; set; } = BookingStatus.Draft;
    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Pending;
    public decimal Price { get; set; }
    public string Currency { get; set; } = "ZAR";
    public string? SpecialInstructions { get; set; }
    public string? AccessNotes { get; set; }
    public bool HasPets { get; set; }
    public string? ParkingInformation { get; set; }
    public bool PayOnsite { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public CustomerProfile CustomerProfile { get; set; } = null!;
    public Service Service { get; set; } = null!;
    public Address Address { get; set; } = null!;
    public Assignment? Assignment { get; set; }
    public JobCompletion? JobCompletion { get; set; }
    public Payment? Payment { get; set; }
    public Review? Review { get; set; }
    public LaundryJobDetail? LaundryJobDetail { get; set; }
    public CarWashJobDetail? CarWashJobDetail { get; set; }
    public CleaningJobDetail? CleaningJobDetail { get; set; }
    public ICollection<ServiceMilestone> ServiceMilestones { get; set; } = new List<ServiceMilestone>();
}

public sealed class Assignment
{
    public Guid Id { get; set; }
    public Guid BookingId { get; set; }
    public AssignmentType AssignedType { get; set; }
    public Guid? CleanerProfileId { get; set; }
    public Guid? ProviderId { get; set; }
    public Guid? SupervisorId { get; set; }
    public AssignmentStatus Status { get; set; } = AssignmentStatus.Pending;
    public DateTimeOffset AssignedAt { get; set; }
    public DateTimeOffset? AcceptedAt { get; set; }

    public Booking Booking { get; set; } = null!;
    public CleanerProfile? CleanerProfile { get; set; }
    public Provider? Provider { get; set; }
    public User? Supervisor { get; set; }
}

public sealed class CleanerProfile
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid? ProviderId { get; set; }
    public EmploymentType EmploymentType { get; set; }
    public string Skills { get; set; } = string.Empty;
    public string ServiceZones { get; set; } = string.Empty;
    public decimal Rating { get; set; }
    public AccountStatus Status { get; set; } = AccountStatus.Active;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public User User { get; set; } = null!;
    public Provider? Provider { get; set; }
    public ICollection<Assignment> Assignments { get; set; } = new List<Assignment>();
}

public sealed class Provider
{
    public Guid Id { get; set; }
    public Guid ContactUserId { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string RegistrationNumber { get; set; } = string.Empty;
    public string? TaxNumber { get; set; }
    public List<ServiceCategory> ServiceCategories { get; set; } = [];
    public string? BaseLocation { get; set; }
    public string? StreetAddress { get; set; }
    public string? Suburb { get; set; }
    public string? City { get; set; }
    public string? Province { get; set; }
    public string? PostalCode { get; set; }
    public List<string> ServiceAreas { get; set; } = [];
    public ProviderStatus Status { get; set; } = ProviderStatus.ApplicationStarted;
    public decimal Rating { get; set; }
    public decimal CommissionRate { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public decimal ServiceRadiusKm { get; set; } = 10m;
    public JoiningFeeStatus JoiningFeeStatus { get; set; } = JoiningFeeStatus.Pending;
    public decimal JoiningFeeAmount { get; set; }
    public DateTimeOffset? JoiningFeePaidAt { get; set; }
    public Guid? MembershipPlanId { get; set; }
    public bool IsEligibleForBookings { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public User ContactUser { get; set; } = null!;
    public ProviderMembershipPlan? MembershipPlan { get; set; }
    public ICollection<CleanerProfile> Cleaners { get; set; } = new List<CleanerProfile>();
    public ICollection<Assignment> Assignments { get; set; } = new List<Assignment>();
    public ICollection<Payout> Payouts { get; set; } = new List<Payout>();
    public ICollection<ProviderJoiningFeePayment> JoiningFeePayments { get; set; } = new List<ProviderJoiningFeePayment>();
    public ICollection<ProviderCommission> Commissions { get; set; } = new List<ProviderCommission>();
}
