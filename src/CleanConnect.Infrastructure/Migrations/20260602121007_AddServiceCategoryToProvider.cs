using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CleanConnect.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddServiceCategoryToProvider : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ServiceCategory",
                schema: "cleanconnect",
                table: "providers",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ServiceCategory",
                schema: "cleanconnect",
                table: "providers");
        }
    }
}
