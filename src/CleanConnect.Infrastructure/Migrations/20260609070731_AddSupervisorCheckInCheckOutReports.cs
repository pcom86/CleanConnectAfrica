using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CleanConnect.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSupervisorCheckInCheckOutReports : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "SupervisorProfileId",
                schema: "cleanconnect",
                table: "assignments",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "job_check_ins",
                schema: "cleanconnect",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BookingId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CheckInTime = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Latitude = table.Column<decimal>(type: "numeric(10,7)", precision: 10, scale: 7, nullable: true),
                    Longitude = table.Column<decimal>(type: "numeric(10,7)", precision: 10, scale: 7, nullable: true),
                    PhotoUrl = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_job_check_ins", x => x.Id);
                    table.ForeignKey(
                        name: "FK_job_check_ins_bookings_BookingId",
                        column: x => x.BookingId,
                        principalSchema: "cleanconnect",
                        principalTable: "bookings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_job_check_ins_users_UserId",
                        column: x => x.UserId,
                        principalSchema: "cleanconnect",
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "job_check_outs",
                schema: "cleanconnect",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BookingId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CheckOutTime = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Latitude = table.Column<decimal>(type: "numeric(10,7)", precision: 10, scale: 7, nullable: true),
                    Longitude = table.Column<decimal>(type: "numeric(10,7)", precision: 10, scale: 7, nullable: true),
                    PhotoUrl = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    WorkSummary = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_job_check_outs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_job_check_outs_bookings_BookingId",
                        column: x => x.BookingId,
                        principalSchema: "cleanconnect",
                        principalTable: "bookings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_job_check_outs_users_UserId",
                        column: x => x.UserId,
                        principalSchema: "cleanconnect",
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "post_job_reports",
                schema: "cleanconnect",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BookingId = table.Column<Guid>(type: "uuid", nullable: false),
                    CompiledByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CompiledAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Summary = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    IssuesFound = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    Recommendations = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    OverallRating = table.Column<int>(type: "integer", nullable: true),
                    PhotosJson = table.Column<string>(type: "jsonb", nullable: false),
                    ChecklistResultsJson = table.Column<string>(type: "jsonb", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_post_job_reports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_post_job_reports_bookings_BookingId",
                        column: x => x.BookingId,
                        principalSchema: "cleanconnect",
                        principalTable: "bookings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_post_job_reports_users_CompiledByUserId",
                        column: x => x.CompiledByUserId,
                        principalSchema: "cleanconnect",
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "supervisor_profiles",
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
                    table.PrimaryKey("PK_supervisor_profiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_supervisor_profiles_providers_ProviderId",
                        column: x => x.ProviderId,
                        principalSchema: "cleanconnect",
                        principalTable: "providers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_supervisor_profiles_users_UserId",
                        column: x => x.UserId,
                        principalSchema: "cleanconnect",
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_assignments_SupervisorProfileId",
                schema: "cleanconnect",
                table: "assignments",
                column: "SupervisorProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_job_check_ins_BookingId",
                schema: "cleanconnect",
                table: "job_check_ins",
                column: "BookingId");

            migrationBuilder.CreateIndex(
                name: "IX_job_check_ins_UserId",
                schema: "cleanconnect",
                table: "job_check_ins",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_job_check_outs_BookingId",
                schema: "cleanconnect",
                table: "job_check_outs",
                column: "BookingId");

            migrationBuilder.CreateIndex(
                name: "IX_job_check_outs_UserId",
                schema: "cleanconnect",
                table: "job_check_outs",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_post_job_reports_BookingId",
                schema: "cleanconnect",
                table: "post_job_reports",
                column: "BookingId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_post_job_reports_CompiledByUserId",
                schema: "cleanconnect",
                table: "post_job_reports",
                column: "CompiledByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_supervisor_profiles_ProviderId",
                schema: "cleanconnect",
                table: "supervisor_profiles",
                column: "ProviderId");

            migrationBuilder.CreateIndex(
                name: "IX_supervisor_profiles_Status",
                schema: "cleanconnect",
                table: "supervisor_profiles",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_supervisor_profiles_UserId",
                schema: "cleanconnect",
                table: "supervisor_profiles",
                column: "UserId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_assignments_supervisor_profiles_SupervisorProfileId",
                schema: "cleanconnect",
                table: "assignments",
                column: "SupervisorProfileId",
                principalSchema: "cleanconnect",
                principalTable: "supervisor_profiles",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_assignments_supervisor_profiles_SupervisorProfileId",
                schema: "cleanconnect",
                table: "assignments");

            migrationBuilder.DropTable(
                name: "job_check_ins",
                schema: "cleanconnect");

            migrationBuilder.DropTable(
                name: "job_check_outs",
                schema: "cleanconnect");

            migrationBuilder.DropTable(
                name: "post_job_reports",
                schema: "cleanconnect");

            migrationBuilder.DropTable(
                name: "supervisor_profiles",
                schema: "cleanconnect");

            migrationBuilder.DropIndex(
                name: "IX_assignments_SupervisorProfileId",
                schema: "cleanconnect",
                table: "assignments");

            migrationBuilder.DropColumn(
                name: "SupervisorProfileId",
                schema: "cleanconnect",
                table: "assignments");
        }
    }
}
