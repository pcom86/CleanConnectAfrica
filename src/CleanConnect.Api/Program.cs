using System.Text.Json.Serialization;
using CleanConnect.Application;
using CleanConnect.Infrastructure;
using CleanConnect.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();
builder.Services.AddControllers()
    .AddJsonOptions(opts =>
    {
        opts.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new() { Title = "CleanConnect API", Version = "v1" });
    options.CustomSchemaIds(type => type.FullName?.Replace('+', '.') ?? type.Name);
});
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins("http://localhost:3000", "https://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod());
});
builder.Services.AddCleanConnectApplication();
builder.Services.AddCleanConnectDatabase(builder.Configuration);

builder.Services.AddApiVersioning(options =>
{
    options.DefaultApiVersion = new Asp.Versioning.ApiVersion(1, 0);
    options.AssumeDefaultVersionWhenUnspecified = true;
    options.ReportApiVersions = true;
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<CleanConnectDbContext>();
    db.Database.Migrate();

    // Seed default admin user if none exists
    if (!db.Users.Any(x => x.Role == UserRole.Admin))
    {
        var now = DateTimeOffset.UtcNow;
        db.Users.Add(new User
        {
            Id = Guid.NewGuid(),
            FirstName = "Super",
            LastName = "Admin",
            Email = "admin@cleanconnect.co.za",
            PhoneNumber = "+27820000000",
            PasswordHash = "admin123",
            Role = UserRole.Admin,
            Status = AccountStatus.Active,
            CreatedAt = now,
            UpdatedAt = now
        });
        db.SaveChanges();
    }

    // Seed default membership plans if none exist
    if (!db.ProviderMembershipPlans.Any())
    {
        var now = DateTimeOffset.UtcNow;
        db.ProviderMembershipPlans.AddRange(
            new ProviderMembershipPlan
            {
                Id = Guid.NewGuid(),
                Name = "Starter",
                Description = "Perfect for small cleaning businesses just getting started.",
                JoiningFeeAmount = 500m,
                RecurringFeeAmount = 0m,
                BillingCycle = BillingCycle.None,
                DefaultCommissionRate = 0.10m,
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now
            },
            new ProviderMembershipPlan
            {
                Id = Guid.NewGuid(),
                Name = "Professional",
                Description = "For growing businesses with multiple teams and wider coverage.",
                JoiningFeeAmount = 1000m,
                RecurringFeeAmount = 299m,
                BillingCycle = BillingCycle.Monthly,
                DefaultCommissionRate = 0.08m,
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now
            }
        );
        db.SaveChanges();
    }
}

app.MapDefaultEndpoints();

app.UseRouting();
app.UseCors("Frontend");
app.UseSwagger();

if (app.Environment.IsDevelopment())
{
    app.UseSwaggerUI();
}

app.MapScalarApiReference("/scalar", options =>
{
    options.Title = "CleanConnect API";
    options.Theme = ScalarTheme.Moon;
    options.DefaultHttpClient = new(ScalarTarget.Http, ScalarClient.Http11);
    options.OpenApiRoutePattern = "/swagger/{documentName}/swagger.json";
});

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.MapControllers();
app.Run();
