using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EducenAPI.Persistence.Migrations.TenantDb
{
    /// <inheritdoc />
    public partial class AddGradeToAssigmentAndMaterial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "GradeId",
                table: "LessonMaterials",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "GradeId",
                table: "Assignments",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_LessonMaterials_GradeId",
                table: "LessonMaterials",
                column: "GradeId");

            migrationBuilder.CreateIndex(
                name: "IX_Assignments_GradeId",
                table: "Assignments",
                column: "GradeId");

            migrationBuilder.AddForeignKey(
                name: "FK_Assignments_Grades_GradeId",
                table: "Assignments",
                column: "GradeId",
                principalTable: "Grades",
                principalColumn: "GradeId");

            migrationBuilder.AddForeignKey(
                name: "FK_LessonMaterials_Grades_GradeId",
                table: "LessonMaterials",
                column: "GradeId",
                principalTable: "Grades",
                principalColumn: "GradeId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Assignments_Grades_GradeId",
                table: "Assignments");

            migrationBuilder.DropForeignKey(
                name: "FK_LessonMaterials_Grades_GradeId",
                table: "LessonMaterials");

            migrationBuilder.DropIndex(
                name: "IX_LessonMaterials_GradeId",
                table: "LessonMaterials");

            migrationBuilder.DropIndex(
                name: "IX_Assignments_GradeId",
                table: "Assignments");

            migrationBuilder.DropColumn(
                name: "GradeId",
                table: "LessonMaterials");

            migrationBuilder.DropColumn(
                name: "GradeId",
                table: "Assignments");
        }
    }
}
