using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EducenAPI.Persistence.Migrations.AdminDb
{
    /// <inheritdoc />
    public partial class AddZaloOfficialAccountId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "OAId",
                table: "TenantZaloOAConfigs",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100);

            migrationBuilder.AddColumn<string>(
                name: "AppId",
                table: "TenantZaloOAConfigs",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_TenantZaloOAConfigs_AppId",
                table: "TenantZaloOAConfigs",
                column: "AppId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TenantZaloOAConfigs_AppId",
                table: "TenantZaloOAConfigs");

            migrationBuilder.DropColumn(
                name: "AppId",
                table: "TenantZaloOAConfigs");

            migrationBuilder.AlterColumn<string>(
                name: "OAId",
                table: "TenantZaloOAConfigs",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100,
                oldNullable: true);
        }
    }
}
