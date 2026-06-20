using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CleanConnect.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddBookingServices : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "booking_services",
                schema: "cleanconnect",
                columns: table => new
                {
                    BookingId = table.Column<Guid>(type: "uuid", nullable: false),
                    ServiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    ServiceName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    ServiceCategory = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_booking_services", x => new { x.BookingId, x.ServiceId });
                    table.ForeignKey(
                        name: "FK_booking_services_bookings_BookingId",
                        column: x => x.BookingId,
                        principalSchema: "cleanconnect",
                        principalTable: "bookings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_booking_services_services_ServiceId",
                        column: x => x.ServiceId,
                        principalSchema: "cleanconnect",
                        principalTable: "services",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_booking_services_ServiceId",
                schema: "cleanconnect",
                table: "booking_services",
                column: "ServiceId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "booking_services",
                schema: "cleanconnect");
        }
    }
}
