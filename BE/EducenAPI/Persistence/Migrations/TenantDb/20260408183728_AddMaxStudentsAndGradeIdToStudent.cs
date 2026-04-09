using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EducenAPI.Persistence.Migrations.TenantDb
{
    /// <inheritdoc />
    public partial class AddMaxStudentsAndGradeIdToStudent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "GradeId",
                table: "Students",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ClassId",
                table: "EnrollmentRequests",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "GradeId",
                table: "EnrollmentRequests",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RequestType",
                table: "EnrollmentRequests",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "MaxStudents",
                table: "Classes",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "GradeId",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "ClassId",
                table: "EnrollmentRequests");

            migrationBuilder.DropColumn(
                name: "GradeId",
                table: "EnrollmentRequests");

            migrationBuilder.DropColumn(
                name: "RequestType",
                table: "EnrollmentRequests");

            migrationBuilder.DropColumn(
                name: "MaxStudents",
                table: "Classes");
        }
    }
}
