using CleanConnect.Application.Common;
using CleanConnect.Infrastructure;
using CleanConnect.Infrastructure.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CleanConnect.Application.Cleaning;

public sealed record RateBookingCommand(
    Guid BookingId,
    Guid CustomerProfileId,
    int Rating,
    string? Comment
) : IRequest<ApiResult<ReviewDto>>;

public sealed class RateBookingCommandHandler(CleanConnectDbContext dbContext)
    : IRequestHandler<RateBookingCommand, ApiResult<ReviewDto>>
{
    public async Task<ApiResult<ReviewDto>> Handle(RateBookingCommand request, CancellationToken cancellationToken)
    {
        if (request.Rating < 1 || request.Rating > 5)
            return ApiResult<ReviewDto>.Failure("Rating must be between 1 and 5.");

        var booking = await dbContext.Bookings
            .AsNoTracking()
            .Include(b => b.Assignment)
            .SingleOrDefaultAsync(b => b.Id == request.BookingId, cancellationToken);

        if (booking is null)
            return ApiResult<ReviewDto>.Failure("Booking not found.");

        if (booking.CustomerProfileId != request.CustomerProfileId)
            return ApiResult<ReviewDto>.Failure("You can only rate your own bookings.");

        if (booking.Status != BookingStatus.Completed)
            return ApiResult<ReviewDto>.Failure("You can only rate completed bookings.");

        var existingReview = await dbContext.Reviews
            .SingleOrDefaultAsync(r => r.BookingId == request.BookingId, cancellationToken);

        if (existingReview is not null)
            return ApiResult<ReviewDto>.Failure("You have already rated this booking.");

        var review = new Review
        {
            Id = Guid.NewGuid(),
            BookingId = request.BookingId,
            CustomerProfileId = request.CustomerProfileId,
            CleanerProfileId = booking.Assignment?.CleanerProfileId,
            ProviderId = booking.Assignment?.ProviderId,
            Rating = request.Rating,
            Comment = request.Comment,
            CreatedAt = DateTimeOffset.UtcNow
        };

        dbContext.Reviews.Add(review);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ApiResult<ReviewDto>.Success(new ReviewDto(review.Id, review.Rating, review.Comment, review.CreatedAt));
    }
}
