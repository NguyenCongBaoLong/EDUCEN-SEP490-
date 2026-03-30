using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using EducenAPI.Persistence.Contexts;

#nullable disable

namespace EducenAPI.Persistence.Migrations.TenantDb
{
    [DbContext(typeof(EducenV2Context))]
    [Migration("20260328235000_RemoveTenantIdFromPaymentRecordTenant")]
    public partial class RemoveTenantIdFromPaymentRecordTenant : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PaymentRecordTenant_TenantId",
                table: "PaymentRecordTenant");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "PaymentRecordTenant");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "TenantId",
                table: "PaymentRecordTenant",
                type: "nvarchar(450)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentRecordTenant_TenantId",
                table: "PaymentRecordTenant",
                column: "TenantId");
        }
    }
}
