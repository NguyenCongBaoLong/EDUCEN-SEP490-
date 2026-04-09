using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EducenAPI.Persistence.Migrations.TenantDb
{
    public partial class RemoveUserIdFromZaloOARecipients : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ZaloOARecipients_Users_UserId",
                table: "ZaloOARecipients");

            migrationBuilder.DropIndex(
                name: "IX_ZaloOARecipients_UserId",
                table: "ZaloOARecipients");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "ZaloOARecipients");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "UserId",
                table: "ZaloOARecipients",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_ZaloOARecipients_UserId",
                table: "ZaloOARecipients",
                column: "UserId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_ZaloOARecipients_Users_UserId",
                table: "ZaloOARecipients",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "user_id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}