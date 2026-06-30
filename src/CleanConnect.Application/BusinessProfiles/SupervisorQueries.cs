using System.Text.Json;
using CleanConnect.Application.Common;
using CleanConnect.Infrastructure;
using CleanConnect.Infrastructure.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CleanConnect.Application.BusinessProfiles;

// ------------------------------------------------------------------
// Get provider supervisors
// ------------------------------------------------------------------
public sealed record GetProviderSupervisorsQuery(Guid ProviderId) : IRequest<ApiResult<List<SupervisorProfileDto>>>;

public sealed class GetProviderSupervisorsQueryHandler(CleanConnectDbContext dbContext)
    : IRequestHandler<GetProviderSupervisorsQuery, ApiResult<List<SupervisorProfileDto>>>
{
    public async Task<ApiResult<List<SupervisorProfileDto>>> Handle(GetProviderSupervisorsQuery request, CancellationToken cancellationToken)
    {
        var items = await dbContext.SupervisorProfiles
            .AsNoTracking()
            .Where(x => x.ProviderId == request.ProviderId && x.Status == AccountStatus.Active)
            .Select(x => new SupervisorProfileDto(
                x.Id,
                x.ProviderId,
                x.EmploymentType,
                x.Skills,
                x.ServiceZones,
                x.Rating,
                x.Status,
                x.VettingStatus,
                x.VettingNotes,
                x.VettedAt,
                x.IdDocumentUrl,
                x.IdVerifiedAt,
                x.ProfilePictureUrl))
            .ToListAsync(cancellationToken);

        return ApiResult<List<SupervisorProfileDto>>.Success(items);
    }
}

// ------------------------------------------------------------------
// Get supervisor bookings
// ------------------------------------------------------------------
public sealed record GetSupervisorBookingsQuery(Guid SupervisorUserId) : IRequest<ApiResult<List<BookingDto>>>;

public sealed class GetSupervisorBookingsQueryHandler(CleanConnectDbContext dbContext)
    : IRequestHandler<GetSupervisorBookingsQuery, ApiResult<List<BookingDto>>>
{
    public async Task<ApiResult<List<BookingDto>>> Handle(GetSupervisorBookingsQuery request, CancellationToken cancellationToken)
    {
        var bookings = await dbContext.Bookings
            .AsNoTracking()
            .Include(b => b.Service)
            .Include(b => b.Address)
            .Include(b => b.Assignment)
            .Where(b => b.Assignment != null && b.Assignment.SupervisorId == request.SupervisorUserId)
            .OrderByDescending(b => b.ScheduledStart)
            .ToListAsync(cancellationToken);

        var dtos = bookings.Select(b => new BookingDto(
            b.Id,
            b.CustomerProfileId,
            b.ServiceId,
            b.Service?.Name ?? "",
            b.Service?.Category ?? "",
            b.AddressId ?? Guid.Empty,
            b.Address?.Label ?? b.AddressLabel ?? "",
            b.Address != null
                ? $"{b.Address.StreetAddress}, {b.Address.Suburb}"
                : $"{b.AddressStreet}, {b.AddressSuburb}",
            b.ScheduledStart,
            b.ScheduledEnd,
            b.Status,
            b.PaymentStatus,
            b.Price,
            b.Currency,
            b.PayOnsite,
            b.CreatedAt
        )).ToList();

        return ApiResult<List<BookingDto>>.Success(dtos);
    }
}

// ------------------------------------------------------------------
// Get booking check-ins
// ------------------------------------------------------------------
public sealed record GetBookingCheckInsQuery(Guid BookingId) : IRequest<ApiResult<List<JobCheckInDto>>>;

public sealed class GetBookingCheckInsQueryHandler(CleanConnectDbContext dbContext)
    : IRequestHandler<GetBookingCheckInsQuery, ApiResult<List<JobCheckInDto>>>
{
    public async Task<ApiResult<List<JobCheckInDto>>> Handle(GetBookingCheckInsQuery request, CancellationToken cancellationToken)
    {
        var rows = await dbContext.JobCheckIns
            .AsNoTracking()
            .Where(x => x.BookingId == request.BookingId)
            .OrderBy(x => x.CheckInTime)
            .Select(x => new
            {
                x.Id,
                x.BookingId,
                x.UserId,
                UserName = $"{x.User.FirstName} {x.User.LastName}",
                x.CheckInTime,
                x.Latitude,
                x.Longitude,
                x.PhotoUrl,
                x.PhotoUrlsJson,
                x.Notes
            })
            .ToListAsync(cancellationToken);

        var items = rows.Select(x => new JobCheckInDto(
            x.Id,
            x.BookingId,
            x.UserId,
            x.UserName,
            x.CheckInTime,
            x.Latitude,
            x.Longitude,
            x.PhotoUrl,
            PhotoJsonHelper.DeserializePhotos(x.PhotoUrlsJson, x.PhotoUrl),
            x.Notes)).ToList();

        return ApiResult<List<JobCheckInDto>>.Success(items);
    }
}

// ------------------------------------------------------------------
// Get booking check-outs
// ------------------------------------------------------------------
public sealed record GetBookingCheckOutsQuery(Guid BookingId) : IRequest<ApiResult<List<JobCheckOutDto>>>;

public sealed class GetBookingCheckOutsQueryHandler(CleanConnectDbContext dbContext)
    : IRequestHandler<GetBookingCheckOutsQuery, ApiResult<List<JobCheckOutDto>>>
{
    public async Task<ApiResult<List<JobCheckOutDto>>> Handle(GetBookingCheckOutsQuery request, CancellationToken cancellationToken)
    {
        var rows = await dbContext.JobCheckOuts
            .AsNoTracking()
            .Where(x => x.BookingId == request.BookingId)
            .OrderBy(x => x.CheckOutTime)
            .Select(x => new
            {
                x.Id,
                x.BookingId,
                x.UserId,
                UserName = $"{x.User.FirstName} {x.User.LastName}",
                x.CheckOutTime,
                x.Latitude,
                x.Longitude,
                x.PhotoUrl,
                x.PhotoUrlsJson,
                x.Notes,
                x.WorkSummary
            })
            .ToListAsync(cancellationToken);

        var items = rows.Select(x => new JobCheckOutDto(
            x.Id,
            x.BookingId,
            x.UserId,
            x.UserName,
            x.CheckOutTime,
            x.Latitude,
            x.Longitude,
            x.PhotoUrl,
            PhotoJsonHelper.DeserializePhotos(x.PhotoUrlsJson, x.PhotoUrl),
            x.Notes,
            x.WorkSummary)).ToList();

        return ApiResult<List<JobCheckOutDto>>.Success(items);
    }
}

// ------------------------------------------------------------------
// Get post job report by booking
// ------------------------------------------------------------------
public sealed record GetPostJobReportQuery(Guid BookingId) : IRequest<ApiResult<PostJobReportDto>>;

public sealed class GetPostJobReportQueryHandler(CleanConnectDbContext dbContext)
    : IRequestHandler<GetPostJobReportQuery, ApiResult<PostJobReportDto>>
{
    public async Task<ApiResult<PostJobReportDto>> Handle(GetPostJobReportQuery request, CancellationToken cancellationToken)
    {
        var report = await dbContext.PostJobReports
            .AsNoTracking()
            .Include(x => x.CompiledByUser)
            .SingleOrDefaultAsync(x => x.BookingId == request.BookingId, cancellationToken);

        if (report is null)
            return ApiResult<PostJobReportDto>.Failure("Post-job report not found for this booking.");

        var photos = JsonSerializer.Deserialize<List<string>>(report.PhotosJson) ?? new List<string>();
        var checklistResults = JsonSerializer.Deserialize<List<ChecklistResultRequest>>(report.ChecklistResultsJson) ?? new List<ChecklistResultRequest>();

        var dto = new PostJobReportDto(
            report.Id,
            report.BookingId,
            report.CompiledByUserId,
            $"{report.CompiledByUser.FirstName} {report.CompiledByUser.LastName}",
            report.CompiledAt,
            report.Summary,
            report.IssuesFound,
            report.Recommendations,
            report.OverallRating,
            photos,
            checklistResults.Select(r => new ChecklistResultDto(r.TaskName, r.Completed, r.Notes)).ToList()
        );

        return ApiResult<PostJobReportDto>.Success(dto);
    }
}

internal static class PhotoJsonHelper
{
    public static List<string> DeserializePhotos(string? json, string? fallback)
    {
        if (string.IsNullOrWhiteSpace(json)) return FallbackList(fallback);
        try
        {
            var list = JsonSerializer.Deserialize<List<string>>(json) ?? new List<string>();
            if (list.Count == 0) return FallbackList(fallback);
            return list;
        }
        catch
        {
            return FallbackList(fallback);
        }
    }

    private static List<string> FallbackList(string? url)
    {
        return string.IsNullOrWhiteSpace(url) ? new List<string>() : new List<string> { url };
    }
}
