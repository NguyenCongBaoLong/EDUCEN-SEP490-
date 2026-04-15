using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EducenAPI.Persistence.Migrations.TenantDb
{
    /// <inheritdoc />
    public partial class AllowMultipleFamilyInvoiceBatches : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_FamilyInvoices_ParentId_Month_Year_Type",
                table: "FamilyInvoices");

            migrationBuilder.CreateIndex(
                name: "IX_FamilyInvoices_ParentId_Month_Year_Type",
                table: "FamilyInvoices",
                columns: new[] { "ParentId", "Month", "Year", "Type" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_FamilyInvoices_ParentId_Month_Year_Type",
                table: "FamilyInvoices");

            migrationBuilder.CreateIndex(
                name: "IX_FamilyInvoices_ParentId_Month_Year_Type",
                table: "FamilyInvoices",
                columns: new[] { "ParentId", "Month", "Year", "Type" },
                unique: true);
        }
    }
}
