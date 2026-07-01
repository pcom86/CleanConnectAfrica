using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CleanConnect.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddVehicleToCleaningJobDetail : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "VehicleRegistration",
                schema: "cleanconnect",
                table: "cleaning_job_details",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "VehicleType",
                schema: "cleanconnect",
                table: "cleaning_job_details",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "VehicleRegistration",
                schema: "cleanconnect",
                table: "cleaning_job_details");

            migrationBuilder.DropColumn(
                name: "VehicleType",
                schema: "cleanconnect",
                table: "cleaning_job_details");
        }
    }
}
