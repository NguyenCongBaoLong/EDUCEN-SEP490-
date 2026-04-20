using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EducenAPI.Persistence.Migrations.AdminDb
{
    /// <inheritdoc />
    public partial class AddTaxCodeAndBusinessLicenseToTenantRegistration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BusinessLicenseFilePath",
                table: "TenantRegistrations",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TaxCode",
                table: "TenantRegistrations",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BusinessLicenseFilePath",
                table: "TenantRegistrations");

            migrationBuilder.DropColumn(
                name: "TaxCode",
                table: "TenantRegistrations");
        }
    }
}
