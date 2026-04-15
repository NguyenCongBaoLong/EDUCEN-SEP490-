using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EducenAPI.Persistence.Migrations.TenantDb
{
    /// <inheritdoc />
    public partial class CreateFamilyInvoiceSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "FamilyInvoices",
                columns: table => new
                {
                    InvoiceId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ParentId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Type = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Month = table.Column<int>(type: "int", nullable: false),
                    Year = table.Column<int>(type: "int", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    StudentCount = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PaidAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PaymentRecordId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FamilyInvoices", x => x.InvoiceId);
                });

            migrationBuilder.CreateTable(
                name: "FamilyInvoiceItems",
                columns: table => new
                {
                    ItemId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    FamilyInvoiceId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    StudentInvoiceId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    StudentId = table.Column<int>(type: "int", nullable: false),
                    StudentName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PaidAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FamilyInvoiceItems", x => x.ItemId);
                    table.ForeignKey(
                        name: "FK_FamilyInvoiceItems_FamilyInvoices_FamilyInvoiceId",
                        column: x => x.FamilyInvoiceId,
                        principalTable: "FamilyInvoices",
                        principalColumn: "InvoiceId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FamilyInvoiceItems_FamilyInvoiceId",
                table: "FamilyInvoiceItems",
                column: "FamilyInvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_FamilyInvoiceItems_StudentInvoiceId",
                table: "FamilyInvoiceItems",
                column: "StudentInvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_FamilyInvoices_ParentId_Month_Year_Type",
                table: "FamilyInvoices",
                columns: new[] { "ParentId", "Month", "Year", "Type" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FamilyInvoiceItems");

            migrationBuilder.DropTable(
                name: "FamilyInvoices");
        }
    }
}
