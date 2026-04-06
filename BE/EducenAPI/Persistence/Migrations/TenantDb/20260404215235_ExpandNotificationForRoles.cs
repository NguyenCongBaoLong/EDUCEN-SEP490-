using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EducenAPI.Persistence.Migrations.TenantDb
{
    /// <inheritdoc />
    public partial class ExpandNotificationForRoles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsEmailSent",
                table: "Notifications",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsInApp",
                table: "Notifications",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsZaloSent",
                table: "Notifications",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "StudentId",
                table: "Notifications",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TargetRole",
                table: "Notifications",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "NotificationSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenantId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    InvoiceNotif = table.Column<bool>(type: "bit", nullable: false),
                    AssignmentNotif = table.Column<bool>(type: "bit", nullable: false),
                    GradeNotif = table.Column<bool>(type: "bit", nullable: false),
                    ScheduleNotif = table.Column<bool>(type: "bit", nullable: false),
                    AttendanceNotif = table.Column<bool>(type: "bit", nullable: false),
                    SubmissionNotif = table.Column<bool>(type: "bit", nullable: false),
                    EmailEnabled = table.Column<bool>(type: "bit", nullable: false),
                    ZaloEnabled = table.Column<bool>(type: "bit", nullable: false),
                    InAppEnabled = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificationSettings", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NotificationSettings_TenantId_UserId",
                table: "NotificationSettings",
                columns: new[] { "TenantId", "UserId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NotificationSettings");

            migrationBuilder.DropColumn(
                name: "IsEmailSent",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "IsInApp",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "IsZaloSent",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "StudentId",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "TargetRole",
                table: "Notifications");
        }
    }
}
