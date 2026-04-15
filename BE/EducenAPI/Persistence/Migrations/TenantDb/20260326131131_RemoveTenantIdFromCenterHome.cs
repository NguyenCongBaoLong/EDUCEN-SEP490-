using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EducenAPI.Persistence.Migrations.TenantDb
{
    /// <inheritdoc />
    public partial class RemoveTenantIdFromCenterHome : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "CenterProfiles");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "CenterImages");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "CenterHighlights");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "CenterHeroImages");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "TenantId",
                table: "CenterProfiles",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TenantId",
                table: "CenterImages",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TenantId",
                table: "CenterHighlights",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TenantId",
                table: "CenterHeroImages",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }
    }
}
