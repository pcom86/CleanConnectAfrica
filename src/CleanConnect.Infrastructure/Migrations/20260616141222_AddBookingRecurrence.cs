using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CleanConnect.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddBookingRecurrence : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsRecurring",
                schema: "cleanconnect",
                table: "bookings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "RecurrenceFrequency",
                schema: "cleanconnect",
                table: "bookings",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "RecurrenceGroupId",
                schema: "cleanconnect",
                table: "bookings",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RecurrenceIndex",
                schema: "cleanconnect",
                table: "bookings",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_bookings_RecurrenceGroupId",
                schema: "cleanconnect",
                table: "bookings",
                column: "RecurrenceGroupId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_bookings_RecurrenceGroupId",
                schema: "cleanconnect",
                table: "bookings");

            migrationBuilder.DropColumn(
                name: "IsRecurring",
                schema: "cleanconnect",
                table: "bookings");

            migrationBuilder.DropColumn(
                name: "RecurrenceFrequency",
                schema: "cleanconnect",
                table: "bookings");

            migrationBuilder.DropColumn(
                name: "RecurrenceGroupId",
                schema: "cleanconnect",
                table: "bookings");

            migrationBuilder.DropColumn(
                name: "RecurrenceIndex",
                schema: "cleanconnect",
                table: "bookings");
        }
    }
}
