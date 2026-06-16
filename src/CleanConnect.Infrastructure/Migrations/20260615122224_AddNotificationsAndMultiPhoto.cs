using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CleanConnect.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddNotificationsAndMultiPhoto : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PhotoUrlsJson",
                schema: "cleanconnect",
                table: "job_check_outs",
                type: "jsonb",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<string>(
                name: "PhotoUrlsJson",
                schema: "cleanconnect",
                table: "job_check_ins",
                type: "jsonb",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.CreateTable(
                name: "notifications",
                schema: "cleanconnect",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    BookingId = table.Column<Guid>(type: "uuid", nullable: true),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Message = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    Type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    IsRead = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ReadAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_notifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_notifications_bookings_BookingId",
                        column: x => x.BookingId,
                        principalSchema: "cleanconnect",
                        principalTable: "bookings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_notifications_customer_profiles_CustomerProfileId",
                        column: x => x.CustomerProfileId,
                        principalSchema: "cleanconnect",
                        principalTable: "customer_profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_notifications_BookingId",
                schema: "cleanconnect",
                table: "notifications",
                column: "BookingId");

            migrationBuilder.CreateIndex(
                name: "IX_notifications_CreatedAt",
                schema: "cleanconnect",
                table: "notifications",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_notifications_CustomerProfileId_IsRead",
                schema: "cleanconnect",
                table: "notifications",
                columns: new[] { "CustomerProfileId", "IsRead" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "notifications",
                schema: "cleanconnect");

            migrationBuilder.DropColumn(
                name: "PhotoUrlsJson",
                schema: "cleanconnect",
                table: "job_check_outs");

            migrationBuilder.DropColumn(
                name: "PhotoUrlsJson",
                schema: "cleanconnect",
                table: "job_check_ins");
        }
    }
}
