using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace CleanConnect.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddCleanConnectApplication(this IServiceCollection services)
    {
        services.AddMediatR(configuration => configuration.RegisterServicesFromAssembly(typeof(DependencyInjection).Assembly));
        services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly);

        return services;
    }
}
