using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EducenAPI.Persistence.Migrations.TenantDb
{
    /// <inheritdoc />
    public partial class AddParentInfoToEnrollment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ParentEmail",
                table: "EnrollmentRequests",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ParentName",
                table: "EnrollmentRequests",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ParentPhone",
                table: "EnrollmentRequests",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ParentEmail",
                table: "EnrollmentRequests");

            migrationBuilder.DropColumn(
                name: "ParentName",
                table: "EnrollmentRequests");

            migrationBuilder.DropColumn(
                name: "ParentPhone",
                table: "EnrollmentRequests");
        }
    }
}
