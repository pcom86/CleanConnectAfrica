using CleanConnect.Application.Common;
using CleanConnect.Infrastructure;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CleanConnect.Application.Services;

public sealed record UpdateServiceCommand(
    Guid ServiceId,
    string? Name = null,
    string? Description = null,
    string? Category = null,
    decimal? BasePrice = null,
    int? EstimatedDurationMinutes = null,
    int? RequiredCleaners = null,
    bool? IsActive = null
) : IRequest<ApiResult<ServiceDto>>;

public sealed class UpdateServiceCommandHandler(CleanConnectDbContext dbContext) : IRequestHandler<UpdateServiceCommand, ApiResult<ServiceDto>>
{
    public async Task<ApiResult<ServiceDto>> Handle(UpdateServiceCommand request, CancellationToken cancellationToken)
    {
        var service = await dbContext.Services.FindAsync(new object[] { request.ServiceId }, cancellationToken);

        if (service is null)
            return ApiResult<ServiceDto>.Failure("Service was not found.");

        if (!string.IsNullOrWhiteSpace(request.Name))
            service.Name = request.Name.Trim();

        if (request.Description is not null)
            service.Description = request.Description.Trim();

        if (!string.IsNullOrWhiteSpace(request.Category))
            service.Category = request.Category.Trim();

        if (request.BasePrice.HasValue)
            service.BasePrice = request.BasePrice.Value;

        if (request.EstimatedDurationMinutes.HasValue)
            service.EstimatedDurationMinutes = request.EstimatedDurationMinutes.Value;

        if (request.RequiredCleaners.HasValue)
            service.RequiredCleaners = request.RequiredCleaners.Value;

        if (request.IsActive.HasValue)
            service.IsActive = request.IsActive.Value;

        service.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return ApiResult<ServiceDto>.Success(new ServiceDto(
            service.Id,
            service.Name,
            service.Description,
            service.Category,
            service.BasePrice,
            service.EstimatedDurationMinutes,
            service.RequiredCleaners
        ));
    }
}
