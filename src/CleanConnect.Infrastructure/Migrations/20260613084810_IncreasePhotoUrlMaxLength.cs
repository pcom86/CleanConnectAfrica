using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CleanConnect.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class IncreasePhotoUrlMaxLength : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "PhotoUrl",
                schema: "cleanconnect",
                table: "job_check_outs",
                type: "character varying(100000)",
                maxLength: 100000,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(1000)",
                oldMaxLength: 1000,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "PhotoUrl",
                schema: "cleanconnect",
                table: "job_check_ins",
                type: "character varying(100000)",
                maxLength: 100000,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(1000)",
                oldMaxLength: 1000,
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "PhotoUrl",
                schema: "cleanconnect",
                table: "job_check_outs",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(100000)",
                oldMaxLength: 100000,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "PhotoUrl",
                schema: "cleanconnect",
                table: "job_check_ins",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(100000)",
                oldMaxLength: 100000,
                oldNullable: true);
        }
    }
}
