using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CleanConnect.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddServiceCategoriesAndAreas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ServiceCategory",
                schema: "cleanconnect",
                table: "providers");

            migrationBuilder.AddColumn<string>(
                name: "BaseLocation",
                schema: "cleanconnect",
                table: "providers",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ServiceAreas",
                schema: "cleanconnect",
                table: "providers",
                type: "jsonb",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ServiceCategories",
                schema: "cleanconnect",
                table: "providers",
                type: "jsonb",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BaseLocation",
                schema: "cleanconnect",
                table: "providers");

            migrationBuilder.DropColumn(
                name: "ServiceAreas",
                schema: "cleanconnect",
                table: "providers");

            migrationBuilder.DropColumn(
                name: "ServiceCategories",
                schema: "cleanconnect",
                table: "providers");

            migrationBuilder.AddColumn<string>(
                name: "ServiceCategory",
                schema: "cleanconnect",
                table: "providers",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");
        }
    }
}
