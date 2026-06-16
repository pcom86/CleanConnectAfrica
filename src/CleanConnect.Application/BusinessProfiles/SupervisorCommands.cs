using System.Text.Json;
using CleanConnect.Application.Common;
using CleanConnect.Application.Notifications;
using CleanConnect.Application.Users;
using CleanConnect.Infrastructure;
using CleanConnect.Infrastructure.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CleanConnect.Application.BusinessProfiles;

// ------------------------------------------------------------------
// Register Supervisor
// ------------------------------------------------------------------
public sealed record RegisterSupervisorCommand(
    string FirstName,
    string LastName,
    string Email,
    string PhoneNumber,
    string PasswordHash,
    Guid? ProviderId,
    EmploymentType EmploymentType,
    string Skills,
    string ServiceZones
) : IRequest<ApiResult<UserDto>>;

public sealed class RegisterSupervisorCommandValidator : AbstractValidator<RegisterSupervisorCommand>
{
    public RegisterSupervisorCommandValidator()
    {
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(255);
        RuleFor(x => x.PhoneNumber).NotEmpty().MaximumLength(30);
        RuleFor(x => x.PasswordHash).NotEmpty().MaximumLength(500);
        RuleFor(x => x.EmploymentType).IsInEnum();
        RuleFor(x => x.Skills).NotEmpty().MaximumLength(1000);
        RuleFor(x => x.ServiceZones).NotEmpty().MaximumLength(500);
    }
}

public sealed class RegisterSupervisorCommandHandler(CleanConnectDbContext dbContext)
    : IRequestHandler<RegisterSupervisorCommand, ApiResult<UserDto>>
{
    public async Task<ApiResult<UserDto>> Handle(RegisterSupervisorCommand request, CancellationToken cancellationToken)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var normalizedPhone = request.PhoneNumber.Trim();

        var duplicate = await dbContext.Users.AnyAsync(
            x => x.Email == normalizedEmail || x.PhoneNumber == normalizedPhone, cancellationToken);
        if (duplicate)
            return ApiResult<UserDto>.Failure("A user with this email or phone number already exists.");

        if (request.ProviderId is Guid providerId)
        {
            var providerApproved = await dbContext.Providers.AnyAsync(
                x => x.Id == providerId && x.Status == ProviderStatus.Approved, cancellationToken);
            if (!providerApproved)
                return ApiResult<UserDto>.Failure("Provider not found or is not approved.");
        }

        var now = DateTimeOffset.UtcNow;
        var user = new User
        {
            Id = Guid.NewGuid(),
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Email = normalizedEmail,
            PhoneNumber = normalizedPhone,
            PasswordHash = request.PasswordHash,
            Role = UserRole.Supervisor,
            Status = AccountStatus.Active,
            MustChangePassword = true,
            CreatedAt = now,
            UpdatedAt = now,
            SupervisorProfile = new SupervisorProfile
            {
                Id = Guid.NewGuid(),
                UserId = Guid.Empty,
                ProviderId = request.ProviderId,
                EmploymentType = request.EmploymentType,
                Skills = request.Skills,
                ServiceZones = request.ServiceZones,
                Status = AccountStatus.Active,
                CreatedAt = now,
                UpdatedAt = now
            }
        };

        user.SupervisorProfile!.UserId = user.Id;

        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ApiResult<UserDto>.Success(UserMappings.ToDto(user));
    }
}

// ------------------------------------------------------------------
// Check In
// ------------------------------------------------------------------
public sealed record CheckInCommand(
    Guid BookingId,
    Guid UserId,
    decimal? Latitude,
    decimal? Longitude,
    string? PhotoUrl,
    string? Notes,
    List<string>? PhotoUrls = null
) : IRequest<ApiResult<JobCheckInDto>>;

public sealed class CheckInCommandValidator : AbstractValidator<CheckInCommand>
{
    public CheckInCommandValidator()
    {
        RuleFor(x => x.BookingId).NotEmpty();
        RuleFor(x => x.UserId).NotEmpty();
    }
}

public sealed class CheckInCommandHandler(CleanConnectDbContext dbContext)
    : IRequestHandler<CheckInCommand, ApiResult<JobCheckInDto>>
{
    public async Task<ApiResult<JobCheckInDto>> Handle(CheckInCommand request, CancellationToken cancellationToken)
    {
        var booking = await dbContext.Bookings
            .SingleOrDefaultAsync(b => b.Id == request.BookingId, cancellationToken);

        if (booking is null)
            return ApiResult<JobCheckInDto>.Failure($"Booking not found. BookingId: {request.BookingId}");

        var user = await dbContext.Users
            .Include(u => u.CleanerProfile)
            .Include(u => u.SupervisorProfile)
            .SingleOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);

        if (user is null)
            return ApiResult<JobCheckInDto>.Failure($"User not found. UserId: {request.UserId}");

        if (user.CleanerProfile is null && user.SupervisorProfile is null)
            return ApiResult<JobCheckInDto>.Failure($"Only cleaners or supervisors can check in. User role: {user.Role}, HasCleanerProfile: {user.CleanerProfile != null}, HasSupervisorProfile: {user.SupervisorProfile != null}");

        var photoUrls = (request.PhotoUrls ?? new List<string>())
            .Where(p => !string.IsNullOrWhiteSpace(p))
            .ToList();
        if (photoUrls.Count == 0 && !string.IsNullOrWhiteSpace(request.PhotoUrl))
        {
            photoUrls.Add(request.PhotoUrl);
        }

        var now = DateTimeOffset.UtcNow;
        var checkIn = new JobCheckIn
        {
            Id = Guid.NewGuid(),
            BookingId = request.BookingId,
            UserId = request.UserId,
            CheckInTime = now,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            PhotoUrl = photoUrls.FirstOrDefault(),
            PhotoUrlsJson = JsonSerializer.Serialize(photoUrls),
            Notes = request.Notes,
            CreatedAt = now
        };

        dbContext.JobCheckIns.Add(checkIn);

        // Update booking status to InProgress if first check-in
        if (booking.Status == BookingStatus.Assigned || booking.Status == BookingStatus.CleanerEnRoute)
        {
            booking.Status = BookingStatus.InProgress;
            booking.UpdatedAt = now;
            dbContext.ServiceMilestones.Add(new ServiceMilestone
            {
                Id = Guid.NewGuid(),
                BookingId = booking.Id,
                MilestoneType = "CheckIn",
                Status = BookingStatus.InProgress.ToString(),
                OccurredAt = now
            });
        }

        BookingNotifications.Add(dbContext, booking.CustomerProfileId, booking.Id,
            "Team checked in",
            $"{user.FirstName} {user.LastName} has arrived and checked in for your booking.");

        await dbContext.SaveChangesAsync(cancellationToken);

        var dto = new JobCheckInDto(
            checkIn.Id, checkIn.BookingId, checkIn.UserId,
            $"{user.FirstName} {user.LastName}",
            checkIn.CheckInTime, checkIn.Latitude, checkIn.Longitude,
            checkIn.PhotoUrl, photoUrls, checkIn.Notes);

        return ApiResult<JobCheckInDto>.Success(dto);
    }
}

// ------------------------------------------------------------------
// Check Out
// ------------------------------------------------------------------
public sealed record CheckOutCommand(
    Guid BookingId,
    Guid UserId,
    decimal? Latitude,
    decimal? Longitude,
    string? PhotoUrl,
    string? Notes,
    string? WorkSummary,
    List<string>? PhotoUrls = null
) : IRequest<ApiResult<JobCheckOutDto>>;

public sealed class CheckOutCommandValidator : AbstractValidator<CheckOutCommand>
{
    public CheckOutCommandValidator()
    {
        RuleFor(x => x.BookingId).NotEmpty();
        RuleFor(x => x.UserId).NotEmpty();
    }
}

public sealed class CheckOutCommandHandler(CleanConnectDbContext dbContext)
    : IRequestHandler<CheckOutCommand, ApiResult<JobCheckOutDto>>
{
    public async Task<ApiResult<JobCheckOutDto>> Handle(CheckOutCommand request, CancellationToken cancellationToken)
    {
        var booking = await dbContext.Bookings
            .SingleOrDefaultAsync(b => b.Id == request.BookingId, cancellationToken);

        if (booking is null)
            return ApiResult<JobCheckOutDto>.Failure($"Booking not found. BookingId: {request.BookingId}");

        var user = await dbContext.Users
            .Include(u => u.CleanerProfile)
            .Include(u => u.SupervisorProfile)
            .SingleOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);

        if (user is null)
            return ApiResult<JobCheckOutDto>.Failure($"User not found. UserId: {request.UserId}");

        if (user.CleanerProfile is null && user.SupervisorProfile is null)
            return ApiResult<JobCheckOutDto>.Failure($"Only cleaners or supervisors can check out. User role: {user.Role}, HasCleanerProfile: {user.CleanerProfile != null}, HasSupervisorProfile: {user.SupervisorProfile != null}");

        var photoUrls = (request.PhotoUrls ?? new List<string>())
            .Where(p => !string.IsNullOrWhiteSpace(p))
            .ToList();
        if (photoUrls.Count == 0 && !string.IsNullOrWhiteSpace(request.PhotoUrl))
        {
            photoUrls.Add(request.PhotoUrl);
        }

        var now = DateTimeOffset.UtcNow;
        var checkOut = new JobCheckOut
        {
            Id = Guid.NewGuid(),
            BookingId = request.BookingId,
            UserId = request.UserId,
            CheckOutTime = now,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            PhotoUrl = photoUrls.FirstOrDefault(),
            PhotoUrlsJson = JsonSerializer.Serialize(photoUrls),
            Notes = request.Notes,
            WorkSummary = request.WorkSummary,
            CreatedAt = now
        };

        dbContext.JobCheckOuts.Add(checkOut);

        // Update booking status to Completed on check-out
        booking.Status = BookingStatus.Completed;
        booking.UpdatedAt = now;
        dbContext.ServiceMilestones.Add(new ServiceMilestone
        {
            Id = Guid.NewGuid(),
            BookingId = booking.Id,
            MilestoneType = "CheckOut",
            Status = BookingStatus.Completed.ToString(),
            OccurredAt = now
        });

        BookingNotifications.Add(dbContext, booking.CustomerProfileId, booking.Id,
            "Job completed",
            $"{user.FirstName} {user.LastName} has checked out. Your booking is now complete.");

        await dbContext.SaveChangesAsync(cancellationToken);

        var dto = new JobCheckOutDto(
            checkOut.Id, checkOut.BookingId, checkOut.UserId,
            $"{user.FirstName} {user.LastName}",
            checkOut.CheckOutTime, checkOut.Latitude, checkOut.Longitude,
            checkOut.PhotoUrl, photoUrls, checkOut.Notes, checkOut.WorkSummary);

        return ApiResult<JobCheckOutDto>.Success(dto);
    }
}

// ------------------------------------------------------------------
// Create Post Job Report
// ------------------------------------------------------------------
public sealed record ChecklistResultRequest(string TaskName, bool Completed, string? Notes);

public sealed record CreatePostJobReportCommand(
    Guid BookingId,
    Guid CompiledByUserId,
    string Summary,
    string? IssuesFound,
    string? Recommendations,
    int? OverallRating,
    List<string> Photos,
    List<ChecklistResultRequest> ChecklistResults
) : IRequest<ApiResult<PostJobReportDto>>;

public sealed class CreatePostJobReportCommandValidator : AbstractValidator<CreatePostJobReportCommand>
{
    public CreatePostJobReportCommandValidator()
    {
        RuleFor(x => x.BookingId).NotEmpty();
        RuleFor(x => x.CompiledByUserId).NotEmpty();
        RuleFor(x => x.Summary).NotEmpty().MaximumLength(2000);
        RuleFor(x => x.IssuesFound).MaximumLength(2000);
        RuleFor(x => x.Recommendations).MaximumLength(2000);
        RuleFor(x => x.OverallRating).InclusiveBetween(1, 5).When(x => x.OverallRating.HasValue);
    }
}

public sealed class CreatePostJobReportCommandHandler(CleanConnectDbContext dbContext)
    : IRequestHandler<CreatePostJobReportCommand, ApiResult<PostJobReportDto>>
{
    public async Task<ApiResult<PostJobReportDto>> Handle(CreatePostJobReportCommand request, CancellationToken cancellationToken)
    {
        var booking = await dbContext.Bookings
            .Include(b => b.Service)
            .SingleOrDefaultAsync(b => b.Id == request.BookingId, cancellationToken);

        if (booking is null)
            return ApiResult<PostJobReportDto>.Failure("Booking not found.");

        var user = await dbContext.Users
            .SingleOrDefaultAsync(u => u.Id == request.CompiledByUserId, cancellationToken);

        if (user is null)
            return ApiResult<PostJobReportDto>.Failure("User not found.");

        // Only supervisor or provider owner can compile report
        if (user.Role != UserRole.Supervisor && user.Role != UserRole.ProviderOwner)
            return ApiResult<PostJobReportDto>.Failure("Only supervisors or provider owners can compile post-job reports.");

        var existingReport = await dbContext.PostJobReports
            .SingleOrDefaultAsync(r => r.BookingId == request.BookingId, cancellationToken);

        if (existingReport is not null)
            return ApiResult<PostJobReportDto>.Failure("A post-job report already exists for this booking.");

        var now = DateTimeOffset.UtcNow;
        var report = new PostJobReport
        {
            Id = Guid.NewGuid(),
            BookingId = request.BookingId,
            CompiledByUserId = request.CompiledByUserId,
            CompiledAt = now,
            Summary = request.Summary,
            IssuesFound = request.IssuesFound,
            Recommendations = request.Recommendations,
            OverallRating = request.OverallRating,
            PhotosJson = JsonSerializer.Serialize(request.Photos ?? new List<string>()),
            ChecklistResultsJson = JsonSerializer.Serialize(request.ChecklistResults ?? new List<ChecklistResultRequest>()),
            CreatedAt = now,
            UpdatedAt = now
        };

        dbContext.PostJobReports.Add(report);
        await dbContext.SaveChangesAsync(cancellationToken);

        var dto = MapToDto(report, user);
        return ApiResult<PostJobReportDto>.Success(dto);
    }

    private static PostJobReportDto MapToDto(PostJobReport report, User user)
    {
        var photos = JsonSerializer.Deserialize<List<string>>(report.PhotosJson) ?? new List<string>();
        var checklistResults = JsonSerializer.Deserialize<List<ChecklistResultRequest>>(report.ChecklistResultsJson) ?? new List<ChecklistResultRequest>();

        return new PostJobReportDto(
            report.Id,
            report.BookingId,
            report.CompiledByUserId,
            $"{user.FirstName} {user.LastName}",
            report.CompiledAt,
            report.Summary,
            report.IssuesFound,
            report.Recommendations,
            report.OverallRating,
            photos,
            checklistResults.Select(r => new ChecklistResultDto(r.TaskName, r.Completed, r.Notes)).ToList()
        );
    }
}
