using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CleanConnect.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddBookingOneTimeAddress : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "AddressId",
                schema: "cleanconnect",
                table: "bookings",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<string>(
                name: "AddressCity",
                schema: "cleanconnect",
                table: "bookings",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AddressLabel",
                schema: "cleanconnect",
                table: "bookings",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AddressPostalCode",
                schema: "cleanconnect",
                table: "bookings",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AddressProvince",
                schema: "cleanconnect",
                table: "bookings",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AddressStreet",
                schema: "cleanconnect",
                table: "bookings",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AddressSuburb",
                schema: "cleanconnect",
                table: "bookings",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AddressCity",
                schema: "cleanconnect",
                table: "bookings");

            migrationBuilder.DropColumn(
                name: "AddressLabel",
                schema: "cleanconnect",
                table: "bookings");

            migrationBuilder.DropColumn(
                name: "AddressPostalCode",
                schema: "cleanconnect",
                table: "bookings");

            migrationBuilder.DropColumn(
                name: "AddressProvince",
                schema: "cleanconnect",
                table: "bookings");

            migrationBuilder.DropColumn(
                name: "AddressStreet",
                schema: "cleanconnect",
                table: "bookings");

            migrationBuilder.DropColumn(
                name: "AddressSuburb",
                schema: "cleanconnect",
                table: "bookings");

            migrationBuilder.AlterColumn<Guid>(
                name: "AddressId",
                schema: "cleanconnect",
                table: "bookings",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);
        }
    }
}
