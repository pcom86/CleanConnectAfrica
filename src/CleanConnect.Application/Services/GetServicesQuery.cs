using CleanConnect.Application.Common;
using CleanConnect.Infrastructure;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CleanConnect.Application.Services;

public sealed record GetServicesQuery(bool ActiveOnly = true) : IRequest<IReadOnlyCollection<ServiceDto>>;

public sealed class GetServicesQueryHandler(CleanConnectDbContext dbContext) : IRequestHandler<GetServicesQuery, IReadOnlyCollection<ServiceDto>>
{
    public async Task<IReadOnlyCollection<ServiceDto>> Handle(GetServicesQuery request, CancellationToken cancellationToken)
    {
        var query = dbContext.Services.AsNoTracking();

        if (request.ActiveOnly)
        {
            query = query.Where(service => service.IsActive);
        }

        return await query
            .OrderBy(service => service.Category)
            .ThenBy(service => service.Name)
            .Select(service => new ServiceDto(service.Id, service.Name, service.Description, service.Category, service.BasePrice, service.EstimatedDurationMinutes, service.RequiredCleaners))
            .ToListAsync(cancellationToken);
    }
}
