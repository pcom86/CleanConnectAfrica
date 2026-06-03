using CleanConnect.Infrastructure;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CleanConnect.Api.Tests;

public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    // Unique DB name per factory instance so test classes don't share state
    private readonly string _dbName = $"CleanConnectTestDb_{Guid.NewGuid()}";

    // Dedicated EF Core internal service provider — isolated from Npgsql services
    private readonly IServiceProvider _inMemoryServiceProvider =
        new ServiceCollection()
            .AddEntityFrameworkInMemoryDatabase()
            .BuildServiceProvider();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // Remove the Npgsql DbContext registration
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<CleanConnectDbContext>));

            if (descriptor != null)
                services.Remove(descriptor);

            // Replace with InMemory database using an isolated internal service provider
            // This prevents the "multiple providers" conflict with Npgsql
            services.AddDbContext<CleanConnectDbContext>(options =>
            {
                options.UseInMemoryDatabase(_dbName);
                options.UseInternalServiceProvider(_inMemoryServiceProvider);
            });
        });
    }
}
