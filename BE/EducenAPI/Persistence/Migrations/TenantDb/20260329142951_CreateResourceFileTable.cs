using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EducenAPI.Persistence.Migrations.TenantDb
{
    /// <inheritdoc />
    public partial class CreateResourceFileTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ResourceFiles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    FileName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ContentType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    FilePath = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Extension = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    FileSize = table.Column<long>(type: "bigint", nullable: true),
                    LessonMaterialId = table.Column<int>(type: "int", nullable: true),
                    AssignmentId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ResourceFiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ResourceFiles_Assignments_AssignmentId",
                        column: x => x.AssignmentId,
                        principalTable: "Assignments",
                        principalColumn: "AsmId");
                    table.ForeignKey(
                        name: "FK_ResourceFiles_LessonMaterials_LessonMaterialId",
                        column: x => x.LessonMaterialId,
                        principalTable: "LessonMaterials",
                        principalColumn: "MaterialId");
                });

            migrationBuilder.CreateIndex(
                name: "IX_ResourceFiles_AssignmentId",
                table: "ResourceFiles",
                column: "AssignmentId");

            migrationBuilder.CreateIndex(
                name: "IX_ResourceFiles_LessonMaterialId",
                table: "ResourceFiles",
                column: "LessonMaterialId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ResourceFiles");
        }
    }
}
