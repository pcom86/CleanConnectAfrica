using System.Text.Json;
using CleanConnect.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;

namespace CleanConnect.Infrastructure;

public sealed class CleanConnectDbContext(DbContextOptions<CleanConnectDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<CustomerProfile> CustomerProfiles => Set<CustomerProfile>();
    public DbSet<Address> Addresses => Set<Address>();
    public DbSet<Service> Services => Set<Service>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<Assignment> Assignments => Set<Assignment>();
    public DbSet<CleanerProfile> CleanerProfiles => Set<CleanerProfile>();
    public DbSet<Provider> Providers => Set<Provider>();
    public DbSet<Checklist> Checklists => Set<Checklist>();
    public DbSet<ChecklistItem> ChecklistItems => Set<ChecklistItem>();
    public DbSet<JobCompletion> JobCompletions => Set<JobCompletion>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<Payout> Payouts => Set<Payout>();
    public DbSet<ProviderMembershipPlan> ProviderMembershipPlans => Set<ProviderMembershipPlan>();
    public DbSet<ProviderJoiningFeePayment> ProviderJoiningFeePayments => Set<ProviderJoiningFeePayment>();
    public DbSet<ProviderCommission> ProviderCommissions => Set<ProviderCommission>();
    public DbSet<LaundryJobDetail> LaundryJobDetails => Set<LaundryJobDetail>();
    public DbSet<CarWashJobDetail> CarWashJobDetails => Set<CarWashJobDetail>();
    public DbSet<ServiceMilestone> ServiceMilestones => Set<ServiceMilestone>();
    public DbSet<CleaningRequest> CleaningRequests => Set<CleaningRequest>();
    public DbSet<CleaningRequestResponse> CleaningRequestResponses => Set<CleaningRequestResponse>();
    public DbSet<CleaningJobDetail> CleaningJobDetails => Set<CleaningJobDetail>();
    public DbSet<SupervisorProfile> SupervisorProfiles => Set<SupervisorProfile>();
    public DbSet<JobCheckIn> JobCheckIns => Set<JobCheckIn>();
    public DbSet<JobCheckOut> JobCheckOuts => Set<JobCheckOut>();
    public DbSet<PostJobReport> PostJobReports => Set<PostJobReport>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.HasDefaultSchema("cleanconnect");
        ConfigureUsers(modelBuilder);
        ConfigureCustomers(modelBuilder);
        ConfigureServices(modelBuilder);
        ConfigureBookings(modelBuilder);
        ConfigureOperations(modelBuilder);
        ConfigureMarketplace(modelBuilder);
        ConfigureServiceExtensions(modelBuilder);
    }

    private static void ConfigureUsers(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.FirstName).HasMaxLength(100).IsRequired();
            entity.Property(x => x.LastName).HasMaxLength(100).IsRequired();
            entity.Property(x => x.Email).HasMaxLength(255).IsRequired();
            entity.Property(x => x.PhoneNumber).HasMaxLength(30).IsRequired();
            entity.Property(x => x.PasswordHash).HasMaxLength(500).IsRequired();
            entity.Property(x => x.Role).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(x => x.MustChangePassword).HasDefaultValue(false);
            entity.HasIndex(x => x.Email).IsUnique();
            entity.HasIndex(x => x.PhoneNumber).IsUnique();
        });
    }

    private static void ConfigureCustomers(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<CustomerProfile>(entity =>
        {
            entity.ToTable("customer_profiles");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.CustomerType).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(x => x.CompanyName).HasMaxLength(200);
            entity.Property(x => x.VatNumber).HasMaxLength(50);
            entity.Property(x => x.BillingAddress).HasMaxLength(500);
            entity.Property(x => x.DefaultPaymentMethodReference).HasMaxLength(255);
            entity.HasOne(x => x.User).WithOne(x => x.CustomerProfile).HasForeignKey<CustomerProfile>(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(x => x.UserId).IsUnique();
            entity.HasIndex(x => x.CustomerType);
        });

        modelBuilder.Entity<Address>(entity =>
        {
            entity.ToTable("addresses");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Label).HasMaxLength(100).IsRequired();
            entity.Property(x => x.StreetAddress).HasMaxLength(300).IsRequired();
            entity.Property(x => x.Suburb).HasMaxLength(100).IsRequired();
            entity.Property(x => x.City).HasMaxLength(100).IsRequired();
            entity.Property(x => x.Province).HasMaxLength(100).IsRequired();
            entity.Property(x => x.PostalCode).HasMaxLength(20).IsRequired();
            entity.Property(x => x.Latitude).HasPrecision(10, 7);
            entity.Property(x => x.Longitude).HasPrecision(10, 7);
            entity.Property(x => x.AccessInstructions).HasMaxLength(1000);
            entity.HasOne(x => x.CustomerProfile).WithMany(x => x.Addresses).HasForeignKey(x => x.CustomerProfileId).OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(x => new { x.City, x.Suburb });
        });
    }

    private static void ConfigureServices(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Service>(entity =>
        {
            entity.ToTable("services");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(150).IsRequired();
            entity.Property(x => x.Description).HasMaxLength(1000).IsRequired();
            entity.Property(x => x.Category).HasMaxLength(100).IsRequired();
            entity.Property(x => x.BasePrice).HasPrecision(12, 2);
            entity.HasIndex(x => x.Category);
            entity.HasIndex(x => x.IsActive);
        });

        modelBuilder.Entity<Checklist>(entity =>
        {
            entity.ToTable("checklists");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(150).IsRequired();
            entity.Property(x => x.Description).HasMaxLength(1000);
            entity.HasOne(x => x.Service).WithMany(x => x.Checklists).HasForeignKey(x => x.ServiceId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ChecklistItem>(entity =>
        {
            entity.ToTable("checklist_items");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.TaskName).HasMaxLength(250).IsRequired();
            entity.HasOne(x => x.Checklist).WithMany(x => x.Items).HasForeignKey(x => x.ChecklistId).OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(x => new { x.ChecklistId, x.SortOrder });
        });
    }

    private static void ConfigureBookings(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Booking>(entity =>
        {
            entity.ToTable("bookings");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(x => x.PaymentStatus).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(x => x.Price).HasPrecision(12, 2);
            entity.Property(x => x.Currency).HasMaxLength(3).IsRequired();
            entity.Property(x => x.SpecialInstructions).HasMaxLength(1000);
            entity.Property(x => x.AccessNotes).HasMaxLength(1000);
            entity.Property(x => x.ParkingInformation).HasMaxLength(500);
            entity.HasOne(x => x.CustomerProfile).WithMany(x => x.Bookings).HasForeignKey(x => x.CustomerProfileId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Service).WithMany(x => x.Bookings).HasForeignKey(x => x.ServiceId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Address).WithMany(x => x.Bookings).HasForeignKey(x => x.AddressId).OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(x => x.Status);
            entity.HasIndex(x => x.PaymentStatus);
            entity.HasIndex(x => x.ScheduledStart);
            entity.HasIndex(x => new { x.CustomerProfileId, x.ScheduledStart });
        });

        modelBuilder.Entity<Assignment>(entity =>
        {
            entity.ToTable("assignments");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.AssignedType).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(x => x.TeamCleanerProfileIdsJson).HasColumnType("jsonb").HasDefaultValue("[]").IsRequired();
            entity.HasOne(x => x.Booking).WithOne(x => x.Assignment).HasForeignKey<Assignment>(x => x.BookingId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.CleanerProfile).WithMany(x => x.Assignments).HasForeignKey(x => x.CleanerProfileId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Provider).WithMany(x => x.Assignments).HasForeignKey(x => x.ProviderId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Supervisor).WithMany().HasForeignKey(x => x.SupervisorId).OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(x => x.BookingId).IsUnique();
            entity.HasIndex(x => x.Status);
            entity.HasIndex(x => x.AssignedAt);
        });
    }

    private static void ConfigureOperations(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<CleanerProfile>(entity =>
        {
            entity.ToTable("cleaner_profiles");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.EmploymentType).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(x => x.StaffRole).HasConversion<string>().HasMaxLength(50).HasDefaultValue(StaffRole.Cleaner).IsRequired();
            entity.Property(x => x.Skills).HasMaxLength(1000);
            entity.Property(x => x.ServiceZones).HasMaxLength(1000);
            entity.Property(x => x.Rating).HasPrecision(3, 2);
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.HasOne(x => x.User).WithOne(x => x.CleanerProfile).HasForeignKey<CleanerProfile>(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Provider).WithMany(x => x.Cleaners).HasForeignKey(x => x.ProviderId).OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(x => x.UserId).IsUnique();
            entity.HasIndex(x => x.Status);
        });

        modelBuilder.Entity<SupervisorProfile>(entity =>
        {
            entity.ToTable("supervisor_profiles");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.EmploymentType).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(x => x.Skills).HasMaxLength(1000);
            entity.Property(x => x.ServiceZones).HasMaxLength(1000);
            entity.Property(x => x.Rating).HasPrecision(3, 2);
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.HasOne(x => x.User).WithOne(x => x.SupervisorProfile).HasForeignKey<SupervisorProfile>(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Provider).WithMany(x => x.Supervisors).HasForeignKey(x => x.ProviderId).OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(x => x.UserId).IsUnique();
            entity.HasIndex(x => x.Status);
        });

        modelBuilder.Entity<JobCheckIn>(entity =>
        {
            entity.ToTable("job_check_ins");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Latitude).HasPrecision(10, 7);
            entity.Property(x => x.Longitude).HasPrecision(10, 7);
            entity.Property(x => x.PhotoUrl).HasMaxLength(100000);
            entity.Property(x => x.Notes).HasMaxLength(2000);
            entity.HasOne(x => x.Booking).WithMany(x => x.JobCheckIns).HasForeignKey(x => x.BookingId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(x => x.BookingId);
        });

        modelBuilder.Entity<JobCheckOut>(entity =>
        {
            entity.ToTable("job_check_outs");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Latitude).HasPrecision(10, 7);
            entity.Property(x => x.Longitude).HasPrecision(10, 7);
            entity.Property(x => x.PhotoUrl).HasMaxLength(100000);
            entity.Property(x => x.Notes).HasMaxLength(2000);
            entity.Property(x => x.WorkSummary).HasMaxLength(2000);
            entity.HasOne(x => x.Booking).WithMany(x => x.JobCheckOuts).HasForeignKey(x => x.BookingId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(x => x.BookingId);
        });

        modelBuilder.Entity<PostJobReport>(entity =>
        {
            entity.ToTable("post_job_reports");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Summary).HasMaxLength(2000).IsRequired();
            entity.Property(x => x.IssuesFound).HasMaxLength(2000);
            entity.Property(x => x.Recommendations).HasMaxLength(2000);
            entity.Property(x => x.PhotosJson).HasColumnType("jsonb").IsRequired();
            entity.Property(x => x.ChecklistResultsJson).HasColumnType("jsonb").IsRequired();
            entity.HasOne(x => x.Booking).WithOne(x => x.PostJobReport).HasForeignKey<PostJobReport>(x => x.BookingId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.CompiledByUser).WithMany().HasForeignKey(x => x.CompiledByUserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(x => x.BookingId).IsUnique();
        });

        modelBuilder.Entity<JobCompletion>(entity =>
        {
            entity.ToTable("job_completions");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.CompletedChecklistItemsJson).HasColumnType("jsonb").IsRequired();
            entity.Property(x => x.PhotosJson).HasColumnType("jsonb").IsRequired();
            entity.Property(x => x.CleanerNotes).HasMaxLength(2000);
            entity.Property(x => x.CustomerSignatureUrl).HasMaxLength(1000);
            entity.Property(x => x.CompletionStatus).HasMaxLength(50).IsRequired();
            entity.HasOne(x => x.Booking).WithOne(x => x.JobCompletion).HasForeignKey<JobCompletion>(x => x.BookingId).OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(x => x.BookingId).IsUnique();
        });

        modelBuilder.Entity<Payment>(entity =>
        {
            entity.ToTable("payments");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Amount).HasPrecision(12, 2);
            entity.Property(x => x.Currency).HasMaxLength(3).IsRequired();
            entity.Property(x => x.PaymentMethod).HasMaxLength(100).IsRequired();
            entity.Property(x => x.Gateway).HasMaxLength(100).IsRequired();
            entity.Property(x => x.GatewayReference).HasMaxLength(255).IsRequired();
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.HasOne(x => x.Booking).WithOne(x => x.Payment).HasForeignKey<Payment>(x => x.BookingId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.CustomerProfile).WithMany().HasForeignKey(x => x.CustomerProfileId).OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(x => x.BookingId).IsUnique();
            entity.HasIndex(x => x.GatewayReference).IsUnique();
            entity.HasIndex(x => x.Status);
        });

        modelBuilder.Entity<Review>(entity =>
        {
            entity.ToTable("reviews");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Comment).HasMaxLength(2000);
            entity.HasOne(x => x.Booking).WithOne(x => x.Review).HasForeignKey<Review>(x => x.BookingId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.CustomerProfile).WithMany().HasForeignKey(x => x.CustomerProfileId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.CleanerProfile).WithMany().HasForeignKey(x => x.CleanerProfileId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Provider).WithMany().HasForeignKey(x => x.ProviderId).OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(x => x.BookingId).IsUnique();
            entity.HasIndex(x => x.Rating);
        });
    }

    private static void ConfigureMarketplace(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Provider>(entity =>
        {
            entity.ToTable("providers");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.CompanyName).HasMaxLength(200).IsRequired();
            entity.Property(x => x.RegistrationNumber).HasMaxLength(100).IsRequired();
            entity.Property(x => x.TaxNumber).HasMaxLength(100);
            entity.Property(x => x.ServiceCategories)
                .HasConversion(
                    v => JsonSerializer.Serialize(v.Select(c => c.ToString()).ToList(), (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null)!
                        .Select(s => Enum.Parse<ServiceCategory>(s)).ToList())
                .HasColumnType("jsonb")
                .IsRequired();
            entity.Property(x => x.BaseLocation).HasMaxLength(200);
            entity.Property(x => x.ServiceAreas)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>())
                .HasColumnType("jsonb")
                .IsRequired();
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(x => x.JoiningFeeStatus).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(x => x.Rating).HasPrecision(3, 2);
            entity.Property(x => x.CommissionRate).HasPrecision(5, 2);
            entity.Property(x => x.Latitude).HasPrecision(10, 7);
            entity.Property(x => x.Longitude).HasPrecision(10, 7);
            entity.Property(x => x.ServiceRadiusKm).HasPrecision(8, 2);
            entity.Property(x => x.JoiningFeeAmount).HasPrecision(12, 2);
            entity.HasOne(x => x.ContactUser).WithOne(x => x.OwnedProvider).HasForeignKey<Provider>(x => x.ContactUserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.MembershipPlan).WithMany(x => x.Providers).HasForeignKey(x => x.MembershipPlanId).OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(x => x.RegistrationNumber).IsUnique();
            entity.HasIndex(x => x.Status);
            entity.HasIndex(x => x.JoiningFeeStatus);
            entity.HasIndex(x => x.IsEligibleForBookings);
        });

        modelBuilder.Entity<Payout>(entity =>
        {
            entity.ToTable("payouts");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.GrossAmount).HasPrecision(12, 2);
            entity.Property(x => x.CommissionAmount).HasPrecision(12, 2);
            entity.Property(x => x.NetAmount).HasPrecision(12, 2);
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.HasOne(x => x.Provider).WithMany(x => x.Payouts).HasForeignKey(x => x.ProviderId).OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(x => new { x.ProviderId, x.PeriodStart, x.PeriodEnd });
            entity.HasIndex(x => x.Status);
        });

        modelBuilder.Entity<ProviderMembershipPlan>(entity =>
        {
            entity.ToTable("provider_membership_plans");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(150).IsRequired();
            entity.Property(x => x.Description).HasMaxLength(1000).IsRequired();
            entity.Property(x => x.JoiningFeeAmount).HasPrecision(12, 2);
            entity.Property(x => x.RecurringFeeAmount).HasPrecision(12, 2);
            entity.Property(x => x.DefaultCommissionRate).HasPrecision(5, 2);
            entity.Property(x => x.BillingCycle).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.HasIndex(x => x.IsActive);
        });

        modelBuilder.Entity<ProviderJoiningFeePayment>(entity =>
        {
            entity.ToTable("provider_joining_fee_payments");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Amount).HasPrecision(12, 2);
            entity.Property(x => x.Currency).HasMaxLength(3).IsRequired();
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(x => x.Gateway).HasMaxLength(100).IsRequired();
            entity.Property(x => x.GatewayReference).HasMaxLength(255).IsRequired();
            entity.Property(x => x.InvoiceNumber).HasMaxLength(100).IsRequired();
            entity.Property(x => x.WaiverReason).HasMaxLength(1000);
            entity.HasOne(x => x.Provider).WithMany(x => x.JoiningFeePayments).HasForeignKey(x => x.ProviderId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.WaivedByUser).WithMany().HasForeignKey(x => x.WaivedByUserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(x => x.InvoiceNumber).IsUnique();
            entity.HasIndex(x => x.GatewayReference).IsUnique();
            entity.HasIndex(x => x.Status);
        });

        modelBuilder.Entity<ProviderCommission>(entity =>
        {
            entity.ToTable("provider_commissions");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.GrossBookingAmount).HasPrecision(12, 2);
            entity.Property(x => x.CommissionRate).HasPrecision(5, 2);
            entity.Property(x => x.CommissionAmount).HasPrecision(12, 2);
            entity.Property(x => x.ProviderNetAmount).HasPrecision(12, 2);
            entity.Property(x => x.Currency).HasMaxLength(3).IsRequired();
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.HasOne(x => x.Provider).WithMany(x => x.Commissions).HasForeignKey(x => x.ProviderId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.Booking).WithMany().HasForeignKey(x => x.BookingId).OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(x => x.BookingId).IsUnique();
            entity.HasIndex(x => x.Status);
            entity.HasIndex(x => new { x.ProviderId, x.CalculatedAt });
        });
    }

    private static void ConfigureServiceExtensions(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<LaundryJobDetail>(entity =>
        {
            entity.ToTable("laundry_job_details");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.PackageType).HasMaxLength(100).IsRequired();
            entity.Property(x => x.EstimatedWeightKg).HasPrecision(8, 2);
            entity.Property(x => x.ActualWeightKg).HasPrecision(8, 2);
            entity.Property(x => x.LaundryStatus).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.HasOne(x => x.Booking).WithOne(x => x.LaundryJobDetail).HasForeignKey<LaundryJobDetail>(x => x.BookingId).OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(x => x.BookingId).IsUnique();
            entity.HasIndex(x => x.LaundryStatus);
            entity.HasIndex(x => x.PickupWindowStart);
        });

        modelBuilder.Entity<CarWashJobDetail>(entity =>
        {
            entity.ToTable("car_wash_job_details");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.VehicleType).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(x => x.VehicleMake).HasMaxLength(100);
            entity.Property(x => x.VehicleModel).HasMaxLength(100);
            entity.Property(x => x.RegistrationNumber).HasMaxLength(50);
            entity.Property(x => x.PackageType).HasMaxLength(100).IsRequired();
            entity.Property(x => x.CarWashStatus).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.HasOne(x => x.Booking).WithOne(x => x.CarWashJobDetail).HasForeignKey<CarWashJobDetail>(x => x.BookingId).OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(x => x.BookingId).IsUnique();
            entity.HasIndex(x => x.CarWashStatus);
        });

        modelBuilder.Entity<ServiceMilestone>(entity =>
        {
            entity.ToTable("service_milestones");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.MilestoneType).HasMaxLength(100).IsRequired();
            entity.Property(x => x.Status).HasMaxLength(100).IsRequired();
            entity.Property(x => x.Notes).HasMaxLength(1000);
            entity.HasOne(x => x.Booking).WithMany(x => x.ServiceMilestones).HasForeignKey(x => x.BookingId).OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(x => new { x.BookingId, x.OccurredAt });
        });

        modelBuilder.Entity<CleaningRequest>(entity =>
        {
            entity.ToTable("cleaning_requests");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(x => x.Notes).HasMaxLength(2000);
            entity.HasOne(x => x.CustomerProfile).WithMany().HasForeignKey(x => x.CustomerProfileId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Address).WithMany().HasForeignKey(x => x.AddressId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Service).WithMany().HasForeignKey(x => x.ServiceId).OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(x => x.Status);
            entity.HasIndex(x => x.CustomerProfileId);
        });

        modelBuilder.Entity<CleaningRequestResponse>(entity =>
        {
            entity.ToTable("cleaning_request_responses");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(x => x.ResponseNotes).HasMaxLength(1000);
            entity.HasOne(x => x.CleaningRequest).WithMany(x => x.ProviderResponses).HasForeignKey(x => x.CleaningRequestId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.Provider).WithMany().HasForeignKey(x => x.ProviderId).OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(x => new { x.CleaningRequestId, x.ProviderId }).IsUnique();
            entity.HasIndex(x => x.Status);
        });

        modelBuilder.Entity<CleaningJobDetail>(entity =>
        {
            entity.ToTable("cleaning_job_details");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.CleaningType).HasMaxLength(100).IsRequired();
            entity.Property(x => x.SquareMeters).HasPrecision(8, 2);
            entity.Property(x => x.SpecialInstructions).HasMaxLength(2000);
            entity.Property(x => x.BeforePhotosJson).HasColumnType("jsonb").IsRequired();
            entity.Property(x => x.AfterPhotosJson).HasColumnType("jsonb").IsRequired();
            entity.Property(x => x.CleanerNotes).HasMaxLength(2000);
            entity.HasOne(x => x.Booking).WithOne(x => x.CleaningJobDetail).HasForeignKey<CleaningJobDetail>(x => x.BookingId).OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(x => x.BookingId).IsUnique();
        });
    }
}
