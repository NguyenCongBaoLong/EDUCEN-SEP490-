using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EducenAPI.Persistence.Migrations.TenantDb
{
    /// <inheritdoc />
    public partial class AddZaloOARecipient : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ZaloOARecipients",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    ZaloUserId = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    IsFollowing = table.Column<bool>(type: "bit", nullable: false),
                    FollowedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UnfollowedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ZaloOARecipients", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ZaloOARecipients_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ZaloOARecipients_UserId",
                table: "ZaloOARecipients",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ZaloOARecipients_ZaloUserId",
                table: "ZaloOARecipients",
                column: "ZaloUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ZaloOARecipients");
        }
    }
}
