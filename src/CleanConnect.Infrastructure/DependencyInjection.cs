using CleanConnect.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CleanConnect.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddCleanConnectDatabase(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("CleanConnectDatabase");

        services.AddDbContext<CleanConnectDbContext>(options =>
        {
            options.UseNpgsql(connectionString, npgsqlOptions =>
            {
                npgsqlOptions.MigrationsHistoryTable("__ef_migrations_history", "cleanconnect");
            });
        });

        services.Configure<OzowSettings>(configuration.GetSection(OzowSettings.SectionName));
        services.AddHttpClient<IOzowPaymentService, OzowPaymentService>();

        return services;
    }
}
