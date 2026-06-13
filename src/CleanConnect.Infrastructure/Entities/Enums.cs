namespace CleanConnect.Infrastructure.Entities;

public enum UserRole
{
    Customer = 1,
    BusinessCustomer = 2,
    Cleaner = 3,
    Supervisor = 4,
    Admin = 5,
    OperationsManager = 6,
    FinanceManager = 7,
    ProviderOwner = 8,
    ProviderStaff = 9
}

public enum AccountStatus
{
    Active = 1,
    Inactive = 2,
    Suspended = 3,
    Deleted = 4
}

public enum CustomerType
{
    Residential = 1,
    Hospitality = 2,
    Commercial = 3
}

public enum BookingStatus
{
    Draft = 1,
    PendingPayment = 2,
    Confirmed = 3,
    Assigned = 4,
    CleanerEnRoute = 5,
    InProgress = 6,
    Completed = 7,
    Cancelled = 8,
    Failed = 9,
    Disputed = 10,
    Refunded = 11
}

public enum PaymentStatus
{
    Pending = 1,
    Authorized = 2,
    Paid = 3,
    Failed = 4,
    Refunded = 5,
    PartiallyRefunded = 6
}

public enum AssignmentStatus
{
    Pending = 1,
    Accepted = 2,
    Rejected = 3,
    Reassigned = 4,
    Completed = 5,
    Cancelled = 6
}

public enum AssignmentType
{
    InternalCleaner = 1,
    InternalTeam = 2,
    MarketplaceProvider = 3
}

public enum EmploymentType
{
    InternalStaff = 1,
    Contractor = 2,
    ProviderStaff = 3
}

public enum StaffRole
{
    Cleaner = 1,
    Washer = 2,
    Driver = 3,
    Supervisor = 4
}

public enum ProviderStatus
{
    ApplicationStarted = 1,
    Submitted = 2,
    PendingJoiningFee = 3,
    JoiningFeePaid = 4,
    UnderReview = 5,
    Approved = 6,
    Rejected = 7,
    Suspended = 8,
    Inactive = 9
}

public enum JoiningFeeStatus
{
    NotRequired = 1,
    Pending = 2,
    Paid = 3,
    Failed = 4,
    Waived = 5,
    Refunded = 6,
    Overdue = 7
}

public enum CommissionStatus
{
    Pending = 1,
    IncludedInPayout = 2,
    PaidOut = 3,
    Reversed = 4
}

public enum BillingCycle
{
    None = 1,
    Monthly = 2,
    Annual = 3
}

public enum PayoutStatus
{
    Pending = 1,
    Approved = 2,
    Processing = 3,
    Paid = 4,
    Failed = 5,
    OnHold = 6
}

public enum ServiceCategory
{
    Cleaning = 1,
    Laundry = 2,
    CarWash = 3,
    PestControl = 4
}

public enum LaundryStatus
{
    AwaitingCollection = 1,
    ProviderEnRouteForCollection = 2,
    Collected = 3,
    ReceivedAtLaundryFacility = 4,
    Washing = 5,
    Drying = 6,
    Ironing = 7,
    Packed = 8,
    ReadyForDelivery = 9,
    OutForDelivery = 10,
    Delivered = 11,
    DeliveryConfirmed = 12
}

public enum CarWashStatus
{
    ProviderAssigned = 1,
    ProviderEnRoute = 2,
    Arrived = 3,
    InProgress = 4,
    Completed = 5,
    CustomerConfirmed = 6
}

public enum VehicleType
{
    Hatchback = 1,
    Sedan = 2,
    Suv = 3,
    Bakkie = 4,
    Van = 5,
    Truck = 6
}

public enum CleaningRequestStatus
{
    Requested = 1,
    ProvidersNotified = 2,
    Accepted = 3,
    Rejected = 4,
    Cancelled = 5,
    Expired = 6
}

public enum CleaningRequestResponseStatus
{
    Invited = 1,
    Viewed = 2,
    Accepted = 3,
    Rejected = 4,
    Expired = 5
}
