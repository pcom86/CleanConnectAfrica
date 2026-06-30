using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CleanConnect.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddIdDocumentFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "IdDocumentUrl",
                schema: "cleanconnect",
                table: "supervisor_profiles",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "IdVerifiedAt",
                schema: "cleanconnect",
                table: "supervisor_profiles",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IdDocumentUrl",
                schema: "cleanconnect",
                table: "cleaner_profiles",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "IdVerifiedAt",
                schema: "cleanconnect",
                table: "cleaner_profiles",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IdDocumentUrl",
                schema: "cleanconnect",
                table: "supervisor_profiles");

            migrationBuilder.DropColumn(
                name: "IdVerifiedAt",
                schema: "cleanconnect",
                table: "supervisor_profiles");

            migrationBuilder.DropColumn(
                name: "IdDocumentUrl",
                schema: "cleanconnect",
                table: "cleaner_profiles");

            migrationBuilder.DropColumn(
                name: "IdVerifiedAt",
                schema: "cleanconnect",
                table: "cleaner_profiles");
        }
    }
}
