using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EducenAPI.Persistence.Migrations.TenantDb
{
    [Migration("20260328225000_RemoveTenantFkFromPaymentRecords")]
    public partial class RemoveTenantFkFromPaymentRecords : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PaymentRecords_Tenant_TenantId",
                table: "PaymentRecords");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddForeignKey(
                name: "FK_PaymentRecords_Tenant_TenantId",
                table: "PaymentRecords",
                column: "TenantId",
                principalTable: "Tenant",
                principalColumn: "TenantId",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
