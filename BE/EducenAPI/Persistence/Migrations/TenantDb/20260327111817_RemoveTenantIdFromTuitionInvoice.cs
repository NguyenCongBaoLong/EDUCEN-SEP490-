using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EducenAPI.Persistence.Migrations.TenantDb
{
    /// <inheritdoc />
    public partial class RemoveTenantIdFromTuitionInvoice : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TuitionInvoices_TenantId_InvoiceMonth_InvoiceYear",
                table: "TuitionInvoices");

            migrationBuilder.DropIndex(
                name: "IX_TuitionInvoices_TenantId_Status_DueDate",
                table: "TuitionInvoices");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "TuitionInvoices");

            migrationBuilder.CreateIndex(
                name: "IX_TuitionInvoices_InvoiceMonth_InvoiceYear",
                table: "TuitionInvoices",
                columns: new[] { "InvoiceMonth", "InvoiceYear" });

            migrationBuilder.CreateIndex(
                name: "IX_TuitionInvoices_Status_DueDate",
                table: "TuitionInvoices",
                columns: new[] { "Status", "DueDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TuitionInvoices_InvoiceMonth_InvoiceYear",
                table: "TuitionInvoices");

            migrationBuilder.DropIndex(
                name: "IX_TuitionInvoices_Status_DueDate",
                table: "TuitionInvoices");

            migrationBuilder.AddColumn<string>(
                name: "TenantId",
                table: "TuitionInvoices",
                type: "nvarchar(450)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_TuitionInvoices_TenantId_InvoiceMonth_InvoiceYear",
                table: "TuitionInvoices",
                columns: new[] { "TenantId", "InvoiceMonth", "InvoiceYear" });

            migrationBuilder.CreateIndex(
                name: "IX_TuitionInvoices_TenantId_Status_DueDate",
                table: "TuitionInvoices",
                columns: new[] { "TenantId", "Status", "DueDate" });
        }
    }
}
