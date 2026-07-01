using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace CleanConnect.Infrastructure;

public sealed class CleanConnectDbContextFactory : IDesignTimeDbContextFactory<CleanConnectDbContext>
{
    public CleanConnectDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<CleanConnectDbContext>();
        var connectionString = Environment.GetEnvironmentVariable("CLEANCONNECT_DATABASE")
            ?? "Host=localhost;Port=57606;Database=cleanconnect;Username=postgres;Password=postgres";

        optionsBuilder.UseNpgsql(connectionString, npgsqlOptions =>
        {
            npgsqlOptions.MigrationsHistoryTable("__ef_migrations_history", "cleanconnect");
        });

        return new CleanConnectDbContext(optionsBuilder.Options);
    }
}
