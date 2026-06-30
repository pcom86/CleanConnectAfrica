using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CleanConnect.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddEmployeeVetting : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "VettedAt",
                schema: "cleanconnect",
                table: "supervisor_profiles",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "VettedByUserId",
                schema: "cleanconnect",
                table: "supervisor_profiles",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VettingNotes",
                schema: "cleanconnect",
                table: "supervisor_profiles",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "VettingStatus",
                schema: "cleanconnect",
                table: "supervisor_profiles",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "VettedAt",
                schema: "cleanconnect",
                table: "cleaner_profiles",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "VettedByUserId",
                schema: "cleanconnect",
                table: "cleaner_profiles",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VettingNotes",
                schema: "cleanconnect",
                table: "cleaner_profiles",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "VettingStatus",
                schema: "cleanconnect",
                table: "cleaner_profiles",
                type: "integer",
                nullable: false,
                defaultValue: 1);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "VettedAt",
                schema: "cleanconnect",
                table: "supervisor_profiles");

            migrationBuilder.DropColumn(
                name: "VettedByUserId",
                schema: "cleanconnect",
                table: "supervisor_profiles");

            migrationBuilder.DropColumn(
                name: "VettingNotes",
                schema: "cleanconnect",
                table: "supervisor_profiles");

            migrationBuilder.DropColumn(
                name: "VettingStatus",
                schema: "cleanconnect",
                table: "supervisor_profiles");

            migrationBuilder.DropColumn(
                name: "VettedAt",
                schema: "cleanconnect",
                table: "cleaner_profiles");

            migrationBuilder.DropColumn(
                name: "VettedByUserId",
                schema: "cleanconnect",
                table: "cleaner_profiles");

            migrationBuilder.DropColumn(
                name: "VettingNotes",
                schema: "cleanconnect",
                table: "cleaner_profiles");

            migrationBuilder.DropColumn(
                name: "VettingStatus",
                schema: "cleanconnect",
                table: "cleaner_profiles");
        }
    }
}
