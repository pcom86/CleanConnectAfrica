using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CleanConnect.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddStaffRoleToCleanerProfile : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "StaffRole",
                schema: "cleanconnect",
                table: "cleaner_profiles",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "Cleaner");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "StaffRole",
                schema: "cleanconnect",
                table: "cleaner_profiles");
        }
    }
}
