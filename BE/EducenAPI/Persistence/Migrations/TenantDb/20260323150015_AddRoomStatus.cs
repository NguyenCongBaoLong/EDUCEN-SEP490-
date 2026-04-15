using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EducenAPI.Persistence.Migrations.TenantDb
{
    /// <inheritdoc />
    public partial class AddRoomStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Assignments_ClassSessions_SessionId",
                table: "Assignments");

            migrationBuilder.AddColumn<bool>(
                name: "Status",
                table: "Rooms",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddForeignKey(
                name: "FK_Assignments_ClassSessions_SessionId",
                table: "Assignments",
                column: "SessionId",
                principalTable: "ClassSessions",
                principalColumn: "SessionId",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Assignments_ClassSessions_SessionId",
                table: "Assignments");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Rooms");

            migrationBuilder.AddForeignKey(
                name: "FK_Assignments_ClassSessions_SessionId",
                table: "Assignments",
                column: "SessionId",
                principalTable: "ClassSessions",
                principalColumn: "SessionId",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
