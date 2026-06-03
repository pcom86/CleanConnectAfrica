using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CleanConnect.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCleaningRequestFlow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "cleanconnect");

            migrationBuilder.CreateTable(
                name: "provider_membership_plans",
                schema: "cleanconnect",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    JoiningFeeAmount = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    RecurringFeeAmount = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    BillingCycle = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    DefaultCommissionRate = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_provider_membership_plans", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "services",
                schema: "cleanconnect",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    Category = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    BasePrice = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    EstimatedDurationMinutes = table.Column<int>(type: "integer", nullable: false),
                    RequiredCleaners = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_services", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "users",
                schema: "cleanconnect",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FirstName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    LastName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    PhoneNumber = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    PasswordHash = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Role = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "checklists",
                schema: "cleanconnect",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ServiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_checklists", x => x.Id);
                    table.ForeignKey(
                        name: "FK_checklists_services_ServiceId",
                        column: x => x.ServiceId,
                        principalSchema: "cleanconnect",
                        principalTable: "services",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "customer_profiles",
                schema: "cleanconnect",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CompanyName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    VatNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    BillingAddress = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    DefaultPaymentMethodReference = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_customer_profiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_customer_profiles_users_UserId",
                        column: x => x.UserId,
                        principalSchema: "cleanconnect",
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "providers",
                schema: "cleanconnect",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContactUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CompanyName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    RegistrationNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    TaxNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Rating = table.Column<decimal>(type: "numeric(3,2)", precision: 3, scale: 2, nullable: false),
                    CommissionRate = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    Latitude = table.Column<decimal>(type: "numeric(10,7)", precision: 10, scale: 7, nullable: true),
                    Longitude = table.Column<decimal>(type: "numeric(10,7)", precision: 10, scale: 7, nullable: true),
                    ServiceRadiusKm = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: false),
                    JoiningFeeStatus = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    JoiningFeeAmount = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    JoiningFeePaidAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    MembershipPlanId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsEligibleForBookings = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_providers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_providers_provider_membership_plans_MembershipPlanId",
                        column: x => x.MembershipPlanId,
                        principalSchema: "cleanconnect",
                        principalTable: "provider_membership_plans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_providers_users_ContactUserId",
                        column: x => x.ContactUserId,
                        principalSchema: "cleanconnect",
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "checklist_items",
                schema: "cleanconnect",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ChecklistId = table.Column<Guid>(type: "uuid", nullable: false),
                    TaskName = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    IsRequired = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_checklist_items", x => x.Id);
                    table.ForeignKey(
                        name: "FK_checklist_items_checklists_ChecklistId",
                        column: x => x.ChecklistId,
                        principalSchema: "cleanconnect",
                        principalTable: "checklists",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "addresses",
                schema: "cleanconnect",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    Label = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    StreetAddress = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Suburb = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    City = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Province = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    PostalCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Latitude = table.Column<decimal>(type: "numeric(10,7)", precision: 10, scale: 7, nullable: true),
                    Longitude = table.Column<decimal>(type: "numeric(10,7)", precision: 10, scale: 7, nullable: true),
                    AccessInstructions = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_addresses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_addresses_customer_profiles_CustomerProfileId",
                        column: x => x.CustomerProfileId,
                        principalSchema: "cleanconnect",
                        principalTable: "customer_profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "cleaner_profiles",
                schema: "cleanconnect",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProviderId = table.Column<Guid>(type: "uuid", nullable: true),
                    EmploymentType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Skills = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    ServiceZones = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    Rating = table.Column<decimal>(type: "numeric(3,2)", precision: 3, scale: 2, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cleaner_profiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_cleaner_profiles_providers_ProviderId",
                        column: x => x.ProviderId,
                        principalSchema: "cleanconnect",
                        principalTable: "providers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_cleaner_profiles_users_UserId",
                        column: x => x.UserId,
                        principalSchema: "cleanconnect",
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "payouts",
                schema: "cleanconnect",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProviderId = table.Column<Guid>(type: "uuid", nullable: false),
                    PeriodStart = table.Column<DateOnly>(type: "date", nullable: false),
                    PeriodEnd = table.Column<DateOnly>(type: "date", nullable: false),
                    GrossAmount = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    CommissionAmount = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    JoiningFeeDeductionAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    AdjustmentAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    NetAmount = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PaidAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payouts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_payouts_providers_ProviderId",
                        column: x => x.ProviderId,
                        principalSchema: "cleanconnect",
                        principalTable: "providers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "provider_joining_fee_payments",
                schema: "cleanconnect",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProviderId = table.Column<Guid>(type: "uuid", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    Currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Gateway = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    GatewayReference = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    InvoiceNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DueDate = table.Column<DateOnly>(type: "date", nullable: true),
                    PaidAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    WaivedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    WaivedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    WaiverReason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_provider_joining_fee_payments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_provider_joining_fee_payments_providers_ProviderId",
                        column: x => x.ProviderId,
                        principalSchema: "cleanconnect",
                        principalTable: "providers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_provider_joining_fee_payments_users_WaivedByUserId",
                        column: x => x.WaivedByUserId,
                        principalSchema: "cleanconnect",
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "bookings",
                schema: "cleanconnect",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    ServiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    AddressId = table.Column<Guid>(type: "uuid", nullable: false),
                    ScheduledStart = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ScheduledEnd = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PaymentStatus = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Price = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    Currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    SpecialInstructions = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    AccessNotes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    HasPets = table.Column<bool>(type: "boolean", nullable: false),
                    ParkingInformation = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_bookings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_bookings_addresses_AddressId",
                        column: x => x.AddressId,
                        principalSchema: "cleanconnect",
                        principalTable: "addresses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_bookings_customer_profiles_CustomerProfileId",
                        column: x => x.CustomerProfileId,
                        principalSchema: "cleanconnect",
                        principalTable: "customer_profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_bookings_services_ServiceId",
                        column: x => x.ServiceId,
                        principalSchema: "cleanconnect",
                        principalTable: "services",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "assignments",
                schema: "cleanconnect",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BookingId = table.Column<Guid>(type: "uuid", nullable: false),
                    AssignedType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CleanerProfileId = table.Column<Guid>(type: "uuid", nullable: true),
                    ProviderId = table.Column<Guid>(type: "uuid", nullable: true),
                    SupervisorId = table.Column<Guid>(type: "uuid", nullable: true),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    AssignedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    AcceptedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_assignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_assignments_bookings_BookingId",
                        column: x => x.BookingId,
                        principalSchema: "cleanconnect",
                        principalTable: "bookings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_assignments_cleaner_profiles_CleanerProfileId",
                        column: x => x.CleanerProfileId,
                        principalSchema: "cleanconnect",
                        principalTable: "cleaner_profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_assignments_providers_ProviderId",
                        column: x => x.ProviderId,
                        principalSchema: "cleanconnect",
                        principalTable: "providers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_assignments_users_SupervisorId",
                        column: x => x.SupervisorId,
                        principalSchema: "cleanconnect",
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "car_wash_job_details",
                schema: "cleanconnect",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BookingId = table.Column<Guid>(type: "uuid", nullable: false),
                    VehicleType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    VehicleMake = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    VehicleModel = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    RegistrationNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    PackageType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    NumberOfVehicles = table.Column<int>(type: "integer", nullable: false),
                    RequiresInteriorCleaning = table.Column<bool>(type: "boolean", nullable: false),
                    RequiresWax = table.Column<bool>(type: "boolean", nullable: false),
                    CarWashStatus = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ProviderArrivedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    StartedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CompletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_car_wash_job_details", x => x.Id);
                    table.ForeignKey(
                        name: "FK_car_wash_job_details_bookings_BookingId",
                        column: x => x.BookingId,
                        principalSchema: "cleanconnect",
                        principalTable: "bookings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "cleaning_job_details",
                schema: "cleanconnect",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BookingId = table.Column<Guid>(type: "uuid", nullable: false),
                    CleaningType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    NumberOfRooms = table.Column<int>(type: "integer", nullable: true),
                    SquareMeters = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: true),
                    HasPets = table.Column<bool>(type: "boolean", nullable: false),
                    SpecialInstructions = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    BeforePhotosJson = table.Column<string>(type: "jsonb", nullable: false),
                    AfterPhotosJson = table.Column<string>(type: "jsonb", nullable: false),
                    CleanerNotes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    TeamDispatchedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    TeamArrivedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CompletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cleaning_job_details", x => x.Id);
                    table.ForeignKey(
                        name: "FK_cleaning_job_details_bookings_BookingId",
                        column: x => x.BookingId,
                        principalSchema: "cleanconnect",
                        principalTable: "bookings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "cleaning_requests",
                schema: "cleanconnect",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    AddressId = table.Column<Guid>(type: "uuid", nullable: true),
                    ServiceId = table.Column<Guid>(type: "uuid", nullable: true),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    PreferredDate = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    PreferredTimeStart = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    PreferredTimeEnd = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    BookingId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cleaning_requests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_cleaning_requests_addresses_AddressId",
                        column: x => x.AddressId,
                        principalSchema: "cleanconnect",
                        principalTable: "addresses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_cleaning_requests_bookings_BookingId",
                        column: x => x.BookingId,
                        principalSchema: "cleanconnect",
                        principalTable: "bookings",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_cleaning_requests_customer_profiles_CustomerProfileId",
                        column: x => x.CustomerProfileId,
                        principalSchema: "cleanconnect",
                        principalTable: "customer_profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_cleaning_requests_services_ServiceId",
                        column: x => x.ServiceId,
                        principalSchema: "cleanconnect",
                        principalTable: "services",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "job_completions",
                schema: "cleanconnect",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BookingId = table.Column<Guid>(type: "uuid", nullable: false),
                    CheckInTime = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CheckOutTime = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CompletedChecklistItemsJson = table.Column<string>(type: "jsonb", nullable: false),
                    PhotosJson = table.Column<string>(type: "jsonb", nullable: false),
                    CleanerNotes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CustomerSignatureUrl = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CompletionStatus = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_job_completions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_job_completions_bookings_BookingId",
                        column: x => x.BookingId,
                        principalSchema: "cleanconnect",
                        principalTable: "bookings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "laundry_job_details",
                schema: "cleanconnect",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BookingId = table.Column<Guid>(type: "uuid", nullable: false),
                    PackageType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    EstimatedWeightKg = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: false),
                    ActualWeightKg = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: true),
                    PickupWindowStart = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    PickupWindowEnd = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    DeliveryWindowStart = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeliveryWindowEnd = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LaundryStatus = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    RequiresIroning = table.Column<bool>(type: "boolean", nullable: false),
                    RequiresExpressTurnaround = table.Column<bool>(type: "boolean", nullable: false),
                    CollectionConfirmedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeliveryConfirmedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_laundry_job_details", x => x.Id);
                    table.ForeignKey(
                        name: "FK_laundry_job_details_bookings_BookingId",
                        column: x => x.BookingId,
                        principalSchema: "cleanconnect",
                        principalTable: "bookings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "payments",
                schema: "cleanconnect",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BookingId = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    Currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    PaymentMethod = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Gateway = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    GatewayReference = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PaidAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_payments_bookings_BookingId",
                        column: x => x.BookingId,
                        principalSchema: "cleanconnect",
                        principalTable: "bookings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_payments_customer_profiles_CustomerProfileId",
                        column: x => x.CustomerProfileId,
                        principalSchema: "cleanconnect",
                        principalTable: "customer_profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "provider_commissions",
                schema: "cleanconnect",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProviderId = table.Column<Guid>(type: "uuid", nullable: false),
                    BookingId = table.Column<Guid>(type: "uuid", nullable: false),
                    GrossBookingAmount = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    CommissionRate = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    CommissionAmount = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    ProviderNetAmount = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    Currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CalculatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ReversedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_provider_commissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_provider_commissions_bookings_BookingId",
                        column: x => x.BookingId,
                        principalSchema: "cleanconnect",
                        principalTable: "bookings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_provider_commissions_providers_ProviderId",
                        column: x => x.ProviderId,
                        principalSchema: "cleanconnect",
                        principalTable: "providers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "reviews",
                schema: "cleanconnect",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BookingId = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    CleanerProfileId = table.Column<Guid>(type: "uuid", nullable: true),
                    ProviderId = table.Column<Guid>(type: "uuid", nullable: true),
                    Rating = table.Column<int>(type: "integer", nullable: false),
                    Comment = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_reviews", x => x.Id);
                    table.ForeignKey(
                        name: "FK_reviews_bookings_BookingId",
                        column: x => x.BookingId,
                        principalSchema: "cleanconnect",
                        principalTable: "bookings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_reviews_cleaner_profiles_CleanerProfileId",
                        column: x => x.CleanerProfileId,
                        principalSchema: "cleanconnect",
                        principalTable: "cleaner_profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_reviews_customer_profiles_CustomerProfileId",
                        column: x => x.CustomerProfileId,
                        principalSchema: "cleanconnect",
                        principalTable: "customer_profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_reviews_providers_ProviderId",
                        column: x => x.ProviderId,
                        principalSchema: "cleanconnect",
                        principalTable: "providers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "service_milestones",
                schema: "cleanconnect",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BookingId = table.Column<Guid>(type: "uuid", nullable: false),
                    MilestoneType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    OccurredAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_service_milestones", x => x.Id);
                    table.ForeignKey(
                        name: "FK_service_milestones_bookings_BookingId",
                        column: x => x.BookingId,
                        principalSchema: "cleanconnect",
                        principalTable: "bookings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "cleaning_request_responses",
                schema: "cleanconnect",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CleaningRequestId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProviderId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ResponseNotes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    RespondedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cleaning_request_responses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_cleaning_request_responses_cleaning_requests_CleaningReques~",
                        column: x => x.CleaningRequestId,
                        principalSchema: "cleanconnect",
                        principalTable: "cleaning_requests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_cleaning_request_responses_providers_ProviderId",
                        column: x => x.ProviderId,
                        principalSchema: "cleanconnect",
                        principalTable: "providers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_addresses_City_Suburb",
                schema: "cleanconnect",
                table: "addresses",
                columns: new[] { "City", "Suburb" });

            migrationBuilder.CreateIndex(
                name: "IX_addresses_CustomerProfileId",
                schema: "cleanconnect",
                table: "addresses",
                column: "CustomerProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_assignments_AssignedAt",
                schema: "cleanconnect",
                table: "assignments",
                column: "AssignedAt");

            migrationBuilder.CreateIndex(
                name: "IX_assignments_BookingId",
                schema: "cleanconnect",
                table: "assignments",
                column: "BookingId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_assignments_CleanerProfileId",
                schema: "cleanconnect",
                table: "assignments",
                column: "CleanerProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_assignments_ProviderId",
                schema: "cleanconnect",
                table: "assignments",
                column: "ProviderId");

            migrationBuilder.CreateIndex(
                name: "IX_assignments_Status",
                schema: "cleanconnect",
                table: "assignments",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_assignments_SupervisorId",
                schema: "cleanconnect",
                table: "assignments",
                column: "SupervisorId");

            migrationBuilder.CreateIndex(
                name: "IX_bookings_AddressId",
                schema: "cleanconnect",
                table: "bookings",
                column: "AddressId");

            migrationBuilder.CreateIndex(
                name: "IX_bookings_CustomerProfileId_ScheduledStart",
                schema: "cleanconnect",
                table: "bookings",
                columns: new[] { "CustomerProfileId", "ScheduledStart" });

            migrationBuilder.CreateIndex(
                name: "IX_bookings_PaymentStatus",
                schema: "cleanconnect",
                table: "bookings",
                column: "PaymentStatus");

            migrationBuilder.CreateIndex(
                name: "IX_bookings_ScheduledStart",
                schema: "cleanconnect",
                table: "bookings",
                column: "ScheduledStart");

            migrationBuilder.CreateIndex(
                name: "IX_bookings_ServiceId",
                schema: "cleanconnect",
                table: "bookings",
                column: "ServiceId");

            migrationBuilder.CreateIndex(
                name: "IX_bookings_Status",
                schema: "cleanconnect",
                table: "bookings",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_car_wash_job_details_BookingId",
                schema: "cleanconnect",
                table: "car_wash_job_details",
                column: "BookingId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_car_wash_job_details_CarWashStatus",
                schema: "cleanconnect",
                table: "car_wash_job_details",
                column: "CarWashStatus");

            migrationBuilder.CreateIndex(
                name: "IX_checklist_items_ChecklistId_SortOrder",
                schema: "cleanconnect",
                table: "checklist_items",
                columns: new[] { "ChecklistId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_checklists_ServiceId",
                schema: "cleanconnect",
                table: "checklists",
                column: "ServiceId");

            migrationBuilder.CreateIndex(
                name: "IX_cleaner_profiles_ProviderId",
                schema: "cleanconnect",
                table: "cleaner_profiles",
                column: "ProviderId");

            migrationBuilder.CreateIndex(
                name: "IX_cleaner_profiles_Status",
                schema: "cleanconnect",
                table: "cleaner_profiles",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_cleaner_profiles_UserId",
                schema: "cleanconnect",
                table: "cleaner_profiles",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_cleaning_job_details_BookingId",
                schema: "cleanconnect",
                table: "cleaning_job_details",
                column: "BookingId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_cleaning_request_responses_CleaningRequestId_ProviderId",
                schema: "cleanconnect",
                table: "cleaning_request_responses",
                columns: new[] { "CleaningRequestId", "ProviderId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_cleaning_request_responses_ProviderId",
                schema: "cleanconnect",
                table: "cleaning_request_responses",
                column: "ProviderId");

            migrationBuilder.CreateIndex(
                name: "IX_cleaning_request_responses_Status",
                schema: "cleanconnect",
                table: "cleaning_request_responses",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_cleaning_requests_AddressId",
                schema: "cleanconnect",
                table: "cleaning_requests",
                column: "AddressId");

            migrationBuilder.CreateIndex(
                name: "IX_cleaning_requests_BookingId",
                schema: "cleanconnect",
                table: "cleaning_requests",
                column: "BookingId");

            migrationBuilder.CreateIndex(
                name: "IX_cleaning_requests_CustomerProfileId",
                schema: "cleanconnect",
                table: "cleaning_requests",
                column: "CustomerProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_cleaning_requests_ServiceId",
                schema: "cleanconnect",
                table: "cleaning_requests",
                column: "ServiceId");

            migrationBuilder.CreateIndex(
                name: "IX_cleaning_requests_Status",
                schema: "cleanconnect",
                table: "cleaning_requests",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_customer_profiles_CustomerType",
                schema: "cleanconnect",
                table: "customer_profiles",
                column: "CustomerType");

            migrationBuilder.CreateIndex(
                name: "IX_customer_profiles_UserId",
                schema: "cleanconnect",
                table: "customer_profiles",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_job_completions_BookingId",
                schema: "cleanconnect",
                table: "job_completions",
                column: "BookingId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_laundry_job_details_BookingId",
                schema: "cleanconnect",
                table: "laundry_job_details",
                column: "BookingId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_laundry_job_details_LaundryStatus",
                schema: "cleanconnect",
                table: "laundry_job_details",
                column: "LaundryStatus");

            migrationBuilder.CreateIndex(
                name: "IX_laundry_job_details_PickupWindowStart",
                schema: "cleanconnect",
                table: "laundry_job_details",
                column: "PickupWindowStart");

            migrationBuilder.CreateIndex(
                name: "IX_payments_BookingId",
                schema: "cleanconnect",
                table: "payments",
                column: "BookingId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payments_CustomerProfileId",
                schema: "cleanconnect",
                table: "payments",
                column: "CustomerProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_payments_GatewayReference",
                schema: "cleanconnect",
                table: "payments",
                column: "GatewayReference",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payments_Status",
                schema: "cleanconnect",
                table: "payments",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_payouts_ProviderId_PeriodStart_PeriodEnd",
                schema: "cleanconnect",
                table: "payouts",
                columns: new[] { "ProviderId", "PeriodStart", "PeriodEnd" });

            migrationBuilder.CreateIndex(
                name: "IX_payouts_Status",
                schema: "cleanconnect",
                table: "payouts",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_provider_commissions_BookingId",
                schema: "cleanconnect",
                table: "provider_commissions",
                column: "BookingId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_provider_commissions_ProviderId_CalculatedAt",
                schema: "cleanconnect",
                table: "provider_commissions",
                columns: new[] { "ProviderId", "CalculatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_provider_commissions_Status",
                schema: "cleanconnect",
                table: "provider_commissions",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_provider_joining_fee_payments_GatewayReference",
                schema: "cleanconnect",
                table: "provider_joining_fee_payments",
                column: "GatewayReference",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_provider_joining_fee_payments_InvoiceNumber",
                schema: "cleanconnect",
                table: "provider_joining_fee_payments",
                column: "InvoiceNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_provider_joining_fee_payments_ProviderId",
                schema: "cleanconnect",
                table: "provider_joining_fee_payments",
                column: "ProviderId");

            migrationBuilder.CreateIndex(
                name: "IX_provider_joining_fee_payments_Status",
                schema: "cleanconnect",
                table: "provider_joining_fee_payments",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_provider_joining_fee_payments_WaivedByUserId",
                schema: "cleanconnect",
                table: "provider_joining_fee_payments",
                column: "WaivedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_provider_membership_plans_IsActive",
                schema: "cleanconnect",
                table: "provider_membership_plans",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_providers_ContactUserId",
                schema: "cleanconnect",
                table: "providers",
                column: "ContactUserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_providers_IsEligibleForBookings",
                schema: "cleanconnect",
                table: "providers",
                column: "IsEligibleForBookings");

            migrationBuilder.CreateIndex(
                name: "IX_providers_JoiningFeeStatus",
                schema: "cleanconnect",
                table: "providers",
                column: "JoiningFeeStatus");

            migrationBuilder.CreateIndex(
                name: "IX_providers_MembershipPlanId",
                schema: "cleanconnect",
                table: "providers",
                column: "MembershipPlanId");

            migrationBuilder.CreateIndex(
                name: "IX_providers_RegistrationNumber",
                schema: "cleanconnect",
                table: "providers",
                column: "RegistrationNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_providers_Status",
                schema: "cleanconnect",
                table: "providers",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_reviews_BookingId",
                schema: "cleanconnect",
                table: "reviews",
                column: "BookingId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_reviews_CleanerProfileId",
                schema: "cleanconnect",
                table: "reviews",
                column: "CleanerProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_reviews_CustomerProfileId",
                schema: "cleanconnect",
                table: "reviews",
                column: "CustomerProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_reviews_ProviderId",
                schema: "cleanconnect",
                table: "reviews",
                column: "ProviderId");

            migrationBuilder.CreateIndex(
                name: "IX_reviews_Rating",
                schema: "cleanconnect",
                table: "reviews",
                column: "Rating");

            migrationBuilder.CreateIndex(
                name: "IX_service_milestones_BookingId_OccurredAt",
                schema: "cleanconnect",
                table: "service_milestones",
                columns: new[] { "BookingId", "OccurredAt" });

            migrationBuilder.CreateIndex(
                name: "IX_services_Category",
                schema: "cleanconnect",
                table: "services",
                column: "Category");

            migrationBuilder.CreateIndex(
                name: "IX_services_IsActive",
                schema: "cleanconnect",
                table: "services",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_users_Email",
                schema: "cleanconnect",
                table: "users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_users_PhoneNumber",
                schema: "cleanconnect",
                table: "users",
                column: "PhoneNumber",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "assignments",
                schema: "cleanconnect");

            migrationBuilder.DropTable(
                name: "car_wash_job_details",
                schema: "cleanconnect");

            migrationBuilder.DropTable(
                name: "checklist_items",
                schema: "cleanconnect");

            migrationBuilder.DropTable(
                name: "cleaning_job_details",
                schema: "cleanconnect");

            migrationBuilder.DropTable(
                name: "cleaning_request_responses",
                schema: "cleanconnect");

            migrationBuilder.DropTable(
                name: "job_completions",
                schema: "cleanconnect");

            migrationBuilder.DropTable(
                name: "laundry_job_details",
                schema: "cleanconnect");

            migrationBuilder.DropTable(
                name: "payments",
                schema: "cleanconnect");

            migrationBuilder.DropTable(
                name: "payouts",
                schema: "cleanconnect");

            migrationBuilder.DropTable(
                name: "provider_commissions",
                schema: "cleanconnect");

            migrationBuilder.DropTable(
                name: "provider_joining_fee_payments",
                schema: "cleanconnect");

            migrationBuilder.DropTable(
                name: "reviews",
                schema: "cleanconnect");

            migrationBuilder.DropTable(
                name: "service_milestones",
                schema: "cleanconnect");

            migrationBuilder.DropTable(
                name: "checklists",
                schema: "cleanconnect");

            migrationBuilder.DropTable(
                name: "cleaning_requests",
                schema: "cleanconnect");

            migrationBuilder.DropTable(
                name: "cleaner_profiles",
                schema: "cleanconnect");

            migrationBuilder.DropTable(
                name: "bookings",
                schema: "cleanconnect");

            migrationBuilder.DropTable(
                name: "providers",
                schema: "cleanconnect");

            migrationBuilder.DropTable(
                name: "addresses",
                schema: "cleanconnect");

            migrationBuilder.DropTable(
                name: "services",
                schema: "cleanconnect");

            migrationBuilder.DropTable(
                name: "provider_membership_plans",
                schema: "cleanconnect");

            migrationBuilder.DropTable(
                name: "customer_profiles",
                schema: "cleanconnect");

            migrationBuilder.DropTable(
                name: "users",
                schema: "cleanconnect");
        }
    }
}
