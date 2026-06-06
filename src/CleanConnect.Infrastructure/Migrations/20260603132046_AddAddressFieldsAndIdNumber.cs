using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CleanConnect.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAddressFieldsAndIdNumber : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "IdNumber",
                schema: "cleanconnect",
                table: "users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "City",
                schema: "cleanconnect",
                table: "providers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PostalCode",
                schema: "cleanconnect",
                table: "providers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Province",
                schema: "cleanconnect",
                table: "providers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StreetAddress",
                schema: "cleanconnect",
                table: "providers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Suburb",
                schema: "cleanconnect",
                table: "providers",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IdNumber",
                schema: "cleanconnect",
                table: "users");

            migrationBuilder.DropColumn(
                name: "City",
                schema: "cleanconnect",
                table: "providers");

            migrationBuilder.DropColumn(
                name: "PostalCode",
                schema: "cleanconnect",
                table: "providers");

            migrationBuilder.DropColumn(
                name: "Province",
                schema: "cleanconnect",
                table: "providers");

            migrationBuilder.DropColumn(
                name: "StreetAddress",
                schema: "cleanconnect",
                table: "providers");

            migrationBuilder.DropColumn(
                name: "Suburb",
                schema: "cleanconnect",
                table: "providers");
        }
    }
}
