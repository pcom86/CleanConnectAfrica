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
        policy.AllowAnyOrigin()
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
    var now = DateTimeOffset.UtcNow;

    // Seed default admin user if none exists
    if (!db.Users.Any(x => x.Role == UserRole.Admin))
    {
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

    // Seed default services if none exist
    var existingServices = db.Services.Select(s => s.Name).ToList();

    var servicesToAdd = new List<Service>();

    if (!existingServices.Contains("Standard Home Cleaning"))
    {
        servicesToAdd.Add(new Service
        {
            Id = Guid.NewGuid(),
            Name = "Standard Home Cleaning",
            Description = "Regular home cleaning service including dusting, vacuuming, mopping and bathroom sanitisation.",
            Category = ServiceCategory.Cleaning.ToString(),
            BasePrice = 450m,
            EstimatedDurationMinutes = 120,
            RequiredCleaners = 1,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        });
    }

    if (!existingServices.Contains("Deep Spring Cleaning"))
    {
        servicesToAdd.Add(new Service
        {
            Id = Guid.NewGuid(),
            Name = "Deep Spring Cleaning",
            Description = "Comprehensive deep clean including inside appliances, windows, and thorough scrubbing of all surfaces.",
            Category = ServiceCategory.Cleaning.ToString(),
            BasePrice = 950m,
            EstimatedDurationMinutes = 240,
            RequiredCleaners = 2,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        });
    }

    if (!existingServices.Contains("Wash, Dry & Fold"))
    {
        servicesToAdd.Add(new Service
        {
            Id = Guid.NewGuid(),
            Name = "Wash, Dry & Fold",
            Description = "Collection, washing, drying, folding and delivery of laundry.",
            Category = ServiceCategory.Laundry.ToString(),
            BasePrice = 180m,
            EstimatedDurationMinutes = 180,
            RequiredCleaners = 1,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        });
    }

    if (!existingServices.Contains("Premium Car Wash"))
    {
        servicesToAdd.Add(new Service
        {
            Id = Guid.NewGuid(),
            Name = "Premium Car Wash",
            Description = "Full exterior wash, interior vacuum, dashboard polish and tyre shine at your location.",
            Category = ServiceCategory.CarWash.ToString(),
            BasePrice = 250m,
            EstimatedDurationMinutes = 45,
            RequiredCleaners = 1,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        });
    }

    if (!existingServices.Contains("Pest Control Service"))
    {
        servicesToAdd.Add(new Service
        {
            Id = Guid.NewGuid(),
            Name = "Pest Control Service",
            Description = "Professional pest control treatment for homes and offices including rodents, insects and termites.",
            Category = ServiceCategory.PestControl.ToString(),
            BasePrice = 600m,
            EstimatedDurationMinutes = 90,
            RequiredCleaners = 1,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        });
    }

    if (!existingServices.Contains("Garden Service"))
    {
        servicesToAdd.Add(new Service
        {
            Id = Guid.NewGuid(),
            Name = "Garden Service",
            Description = "Lawn mowing, hedge trimming, weeding, leaf blowing and general garden maintenance.",
            Category = ServiceCategory.Garden.ToString(),
            BasePrice = 350m,
            EstimatedDurationMinutes = 120,
            RequiredCleaners = 1,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        });
    }

    if (!existingServices.Contains("Landscaping"))
    {
        servicesToAdd.Add(new Service
        {
            Id = Guid.NewGuid(),
            Name = "Landscaping",
            Description = "Professional landscape design, planting, paving, irrigation setup and outdoor transformation.",
            Category = ServiceCategory.Landscaping.ToString(),
            BasePrice = 1200m,
            EstimatedDurationMinutes = 360,
            RequiredCleaners = 2,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        });
    }

    if (servicesToAdd.Count > 0)
    {
        db.Services.AddRange(servicesToAdd);
        db.SaveChanges();
    }
}

app.MapDefaultEndpoints();

app.UseRouting();
app.UseCors("Frontend");
app.MapControllers();
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
app.Run();
