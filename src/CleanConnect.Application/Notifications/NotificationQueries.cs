using CleanConnect.Application.Common;
using CleanConnect.Infrastructure;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CleanConnect.Application.Notifications;

// --- Get notifications for a customer ---
public sealed record GetCustomerNotificationsQuery(Guid CustomerProfileId, bool UnreadOnly = false) : IRequest<ApiResult<List<NotificationDto>>>;

public sealed class GetCustomerNotificationsQueryHandler(CleanConnectDbContext dbContext)
    : IRequestHandler<GetCustomerNotificationsQuery, ApiResult<List<NotificationDto>>>
{
    public async Task<ApiResult<List<NotificationDto>>> Handle(GetCustomerNotificationsQuery request, CancellationToken cancellationToken)
    {
        var query = dbContext.Notifications
            .AsNoTracking()
            .Where(x => x.CustomerProfileId == request.CustomerProfileId);

        if (request.UnreadOnly)
        {
            query = query.Where(x => !x.IsRead);
        }

        var items = await query
            .OrderByDescending(x => x.CreatedAt)
            .Take(100)
            .Select(x => new NotificationDto(x.Id, x.BookingId, x.Title, x.Message, x.Type, x.IsRead, x.CreatedAt, x.ReadAt))
            .ToListAsync(cancellationToken);

        return ApiResult<List<NotificationDto>>.Success(items);
    }
}

// --- Mark a single notification as read ---
public sealed record MarkNotificationReadCommand(Guid NotificationId) : IRequest<ApiResult<bool>>;

public sealed class MarkNotificationReadCommandValidator : AbstractValidator<MarkNotificationReadCommand>
{
    public MarkNotificationReadCommandValidator()
    {
        RuleFor(x => x.NotificationId).NotEmpty();
    }
}

public sealed class MarkNotificationReadCommandHandler(CleanConnectDbContext dbContext)
    : IRequestHandler<MarkNotificationReadCommand, ApiResult<bool>>
{
    public async Task<ApiResult<bool>> Handle(MarkNotificationReadCommand request, CancellationToken cancellationToken)
    {
        var notification = await dbContext.Notifications.SingleOrDefaultAsync(x => x.Id == request.NotificationId, cancellationToken);
        if (notification is null)
        {
            return ApiResult<bool>.Failure("Notification was not found.");
        }

        if (!notification.IsRead)
        {
            notification.IsRead = true;
            notification.ReadAt = DateTimeOffset.UtcNow;
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return ApiResult<bool>.Success(true);
    }
}

// --- Mark all of a customer's notifications as read ---
public sealed record MarkAllNotificationsReadCommand(Guid CustomerProfileId) : IRequest<ApiResult<int>>;

public sealed class MarkAllNotificationsReadCommandValidator : AbstractValidator<MarkAllNotificationsReadCommand>
{
    public MarkAllNotificationsReadCommandValidator()
    {
        RuleFor(x => x.CustomerProfileId).NotEmpty();
    }
}

public sealed class MarkAllNotificationsReadCommandHandler(CleanConnectDbContext dbContext)
    : IRequestHandler<MarkAllNotificationsReadCommand, ApiResult<int>>
{
    public async Task<ApiResult<int>> Handle(MarkAllNotificationsReadCommand request, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var unread = await dbContext.Notifications
            .Where(x => x.CustomerProfileId == request.CustomerProfileId && !x.IsRead)
            .ToListAsync(cancellationToken);

        foreach (var notification in unread)
        {
            notification.IsRead = true;
            notification.ReadAt = now;
        }

        if (unread.Count > 0)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return ApiResult<int>.Success(unread.Count);
    }
}
