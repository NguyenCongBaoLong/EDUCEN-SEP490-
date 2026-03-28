using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EducenAPI.Persistence.Migrations.TenantDb
{
    /// <inheritdoc />
    public partial class add_receiverId_to_SupportedRequest : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SupportRequests_Users_SenderId",
                table: "SupportRequests");

            migrationBuilder.AddColumn<int>(
                name: "ReceiverId",
                table: "SupportRequests",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_SupportRequests_ReceiverId",
                table: "SupportRequests",
                column: "ReceiverId");

            migrationBuilder.AddForeignKey(
                name: "FK_SupportRequests_Users_ReceiverId",
                table: "SupportRequests",
                column: "ReceiverId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_SupportRequests_Users_SenderId",
                table: "SupportRequests",
                column: "SenderId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SupportRequests_Users_ReceiverId",
                table: "SupportRequests");

            migrationBuilder.DropForeignKey(
                name: "FK_SupportRequests_Users_SenderId",
                table: "SupportRequests");

            migrationBuilder.DropIndex(
                name: "IX_SupportRequests_ReceiverId",
                table: "SupportRequests");

            migrationBuilder.DropColumn(
                name: "ReceiverId",
                table: "SupportRequests");

            migrationBuilder.AddForeignKey(
                name: "FK_SupportRequests_Users_SenderId",
                table: "SupportRequests",
                column: "SenderId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
