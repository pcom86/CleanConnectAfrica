namespace CleanConnect.Infrastructure.Entities;

public sealed class Checklist
{
    public Guid Id { get; set; }
    public Guid ServiceId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Service Service { get; set; } = null!;
    public ICollection<ChecklistItem> Items { get; set; } = new List<ChecklistItem>();
}

public sealed class ChecklistItem
{
    public Guid Id { get; set; }
    public Guid ChecklistId { get; set; }
    public string TaskName { get; set; } = string.Empty;
    public bool IsRequired { get; set; } = true;
    public int SortOrder { get; set; }

    public Checklist Checklist { get; set; } = null!;
}

public sealed class JobCompletion
{
    public Guid Id { get; set; }
    public Guid BookingId { get; set; }
    public DateTimeOffset? CheckInTime { get; set; }
    public DateTimeOffset? CheckOutTime { get; set; }
    public string CompletedChecklistItemsJson { get; set; } = "[]";
    public string PhotosJson { get; set; } = "[]";
    public string? CleanerNotes { get; set; }
    public string? CustomerSignatureUrl { get; set; }
    public string CompletionStatus { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Booking Booking { get; set; } = null!;
}

public sealed class Payment
{
    public Guid Id { get; set; }
    public Guid BookingId { get; set; }
    public Guid CustomerProfileId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "ZAR";
    public string PaymentMethod { get; set; } = string.Empty;
    public string Gateway { get; set; } = string.Empty;
    public string GatewayReference { get; set; } = string.Empty;
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;
    public DateTimeOffset? PaidAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Booking Booking { get; set; } = null!;
    public CustomerProfile CustomerProfile { get; set; } = null!;
}

public sealed class Review
{
    public Guid Id { get; set; }
    public Guid BookingId { get; set; }
    public Guid CustomerProfileId { get; set; }
    public Guid? CleanerProfileId { get; set; }
    public Guid? ProviderId { get; set; }
    public int Rating { get; set; }
    public string? Comment { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Booking Booking { get; set; } = null!;
    public CustomerProfile CustomerProfile { get; set; } = null!;
    public CleanerProfile? CleanerProfile { get; set; }
    public Provider? Provider { get; set; }
}

public sealed class Payout
{
    public Guid Id { get; set; }
    public Guid ProviderId { get; set; }
    public DateOnly PeriodStart { get; set; }
    public DateOnly PeriodEnd { get; set; }
    public decimal GrossAmount { get; set; }
    public decimal CommissionAmount { get; set; }
    public decimal JoiningFeeDeductionAmount { get; set; }
    public decimal AdjustmentAmount { get; set; }
    public decimal NetAmount { get; set; }
    public PayoutStatus Status { get; set; } = PayoutStatus.Pending;
    public DateTimeOffset? PaidAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Provider Provider { get; set; } = null!;
}

public sealed class ProviderMembershipPlan
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal JoiningFeeAmount { get; set; }
    public decimal RecurringFeeAmount { get; set; }
    public BillingCycle BillingCycle { get; set; } = BillingCycle.None;
    public decimal DefaultCommissionRate { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public ICollection<Provider> Providers { get; set; } = new List<Provider>();
}

public sealed class ProviderJoiningFeePayment
{
    public Guid Id { get; set; }
    public Guid ProviderId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "ZAR";
    public JoiningFeeStatus Status { get; set; } = JoiningFeeStatus.Pending;
    public string Gateway { get; set; } = string.Empty;
    public string GatewayReference { get; set; } = string.Empty;
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateOnly? DueDate { get; set; }
    public DateTimeOffset? PaidAt { get; set; }
    public DateTimeOffset? WaivedAt { get; set; }
    public Guid? WaivedByUserId { get; set; }
    public string? WaiverReason { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Provider Provider { get; set; } = null!;
    public User? WaivedByUser { get; set; }
}

public sealed class ProviderCommission
{
    public Guid Id { get; set; }
    public Guid ProviderId { get; set; }
    public Guid BookingId { get; set; }
    public decimal GrossBookingAmount { get; set; }
    public decimal CommissionRate { get; set; }
    public decimal CommissionAmount { get; set; }
    public decimal ProviderNetAmount { get; set; }
    public string Currency { get; set; } = "ZAR";
    public CommissionStatus Status { get; set; } = CommissionStatus.Pending;
    public DateTimeOffset CalculatedAt { get; set; }
    public DateTimeOffset? ReversedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Provider Provider { get; set; } = null!;
    public Booking Booking { get; set; } = null!;
}

public sealed class Notification
{
    public Guid Id { get; set; }
    public Guid CustomerProfileId { get; set; }
    public Guid? BookingId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Type { get; set; } = "BookingUpdate";
    public bool IsRead { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? ReadAt { get; set; }

    public CustomerProfile CustomerProfile { get; set; } = null!;
    public Booking? Booking { get; set; }
}
