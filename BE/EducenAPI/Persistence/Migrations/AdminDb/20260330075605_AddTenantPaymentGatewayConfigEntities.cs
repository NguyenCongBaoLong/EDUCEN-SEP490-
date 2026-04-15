using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EducenAPI.Persistence.Migrations.AdminDb
{
    /// <inheritdoc />
    public partial class AddTenantPaymentGatewayConfigEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TenantPaymentGatewayConfigs",
                columns: table => new
                {
                    ConfigId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    TenantId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    GatewayType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    DisplayName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    ConfigData = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    SubmittedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ActivatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeactivatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    StatusReason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TenantPaymentGatewayConfigs", x => x.ConfigId);
                    table.CheckConstraint("CK_TenantPaymentGatewayConfig_Status", "[Status] IN ('Draft', 'PendingApproval', 'Active', 'Inactive', 'Rejected')");
                    table.ForeignKey(
                        name: "FK_TenantPaymentGatewayConfigs_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "TenantId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "TenantPaymentConfigAudits",
                columns: table => new
                {
                    AuditId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    TenantPaymentGatewayConfigId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    TenantId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Action = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    OldStatus = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    NewStatus = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    Reason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    SnapshotData = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PerformedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PerformedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TenantPaymentConfigAudits", x => x.AuditId);
                    table.CheckConstraint("CK_TenantPaymentConfigAudit_Action", "[Action] IN ('Create', 'Update', 'Submit', 'Approve', 'Reject', 'Activate', 'Deactivate', 'SoftDelete', 'Restore')");
                    table.ForeignKey(
                        name: "FK_TenantPaymentConfigAudits_TenantPaymentGatewayConfigs_TenantPaymentGatewayConfigId",
                        column: x => x.TenantPaymentGatewayConfigId,
                        principalTable: "TenantPaymentGatewayConfigs",
                        principalColumn: "ConfigId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TenantPaymentConfigAudits_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "TenantId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TenantPaymentConfigAudits_TenantId_PerformedAt",
                table: "TenantPaymentConfigAudits",
                columns: new[] { "TenantId", "PerformedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_TenantPaymentConfigAudits_TenantPaymentGatewayConfigId_PerformedAt",
                table: "TenantPaymentConfigAudits",
                columns: new[] { "TenantPaymentGatewayConfigId", "PerformedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_TenantPaymentGatewayConfigs_TenantId_GatewayType",
                table: "TenantPaymentGatewayConfigs",
                columns: new[] { "TenantId", "GatewayType" },
                unique: true,
                filter: "[IsDeleted] = 0 AND [Status] = 'Active'");

            migrationBuilder.CreateIndex(
                name: "IX_TenantPaymentGatewayConfigs_TenantId_GatewayType_Status",
                table: "TenantPaymentGatewayConfigs",
                columns: new[] { "TenantId", "GatewayType", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TenantPaymentConfigAudits");

            migrationBuilder.DropTable(
                name: "TenantPaymentGatewayConfigs");
        }
    }
}
