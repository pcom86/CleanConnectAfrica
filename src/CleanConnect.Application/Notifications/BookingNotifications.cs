using CleanConnect.Infrastructure;
using CleanConnect.Infrastructure.Entities;

namespace CleanConnect.Application.Notifications;

/// <summary>
/// Helper used by booking-related command handlers to queue an in-app
/// notification for the customer whenever a booking is updated. The caller
/// is responsible for calling SaveChangesAsync.
/// </summary>
public static class BookingNotifications
{
    public static void Add(
        CleanConnectDbContext dbContext,
        Guid customerProfileId,
        Guid bookingId,
        string title,
        string message,
        string type = "BookingUpdate")
    {
        dbContext.Notifications.Add(new Notification
        {
            Id = Guid.NewGuid(),
            CustomerProfileId = customerProfileId,
            BookingId = bookingId,
            Title = title,
            Message = message,
            Type = type,
            IsRead = false,
            CreatedAt = DateTimeOffset.UtcNow
        });
    }

    /// <summary>
    /// Produces a friendly, customer-facing message for a booking status change.
    /// </summary>
    public static string DescribeStatus(BookingStatus status, string? serviceName)
    {
        var service = string.IsNullOrWhiteSpace(serviceName) ? "your booking" : serviceName;
        return status switch
        {
            BookingStatus.PendingPayment => $"Payment is pending for {service}.",
            BookingStatus.Confirmed => $"{service} has been confirmed.",
            BookingStatus.Assigned => $"A provider has been assigned to {service}.",
            BookingStatus.CleanerEnRoute => $"Your cleaner is on the way for {service}.",
            BookingStatus.InProgress => $"Work has started on {service}.",
            BookingStatus.Completed => $"{service} has been completed. Thank you!",
            BookingStatus.Cancelled => $"{service} has been cancelled.",
            BookingStatus.Failed => $"{service} could not be completed.",
            BookingStatus.Disputed => $"A dispute has been raised for {service}.",
            BookingStatus.Refunded => $"A refund has been processed for {service}.",
            _ => $"{service} has been updated to {status}."
        };
    }
}
