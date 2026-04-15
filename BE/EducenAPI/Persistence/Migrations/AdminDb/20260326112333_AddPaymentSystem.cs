using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EducenAPI.Persistence.Migrations.AdminDb
{
    /// <inheritdoc />
    public partial class AddPaymentSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // migrationBuilder.DropForeignKey(
            //     name: "FK_Subscriptions_Plans_PlanId1",
            //     table: "Subscriptions");

            // migrationBuilder.DropIndex(
            //     name: "IX_Subscriptions_PlanId1",
            //     table: "Subscriptions");

            // migrationBuilder.DropColumn(
            //     name: "PlanId1",
            //     table: "Subscriptions");

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "PaymentRecords",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaidBy",
                table: "PaymentRecords",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaymentMethod",
                table: "PaymentRecords",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProcessedBy",
                table: "PaymentRecords",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReferenceId",
                table: "PaymentRecords",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TransactionType",
                table: "PaymentRecords",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PaymentTransactions",
                columns: table => new
                {
                    TransactionId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    PaymentRecordId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    GatewayType = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    GatewayTransactionId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    GatewayResponse = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ErrorMessage = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentTransactions", x => x.TransactionId);
                    table.ForeignKey(
                        name: "FK_PaymentTransactions_PaymentRecords_PaymentRecordId",
                        column: x => x.PaymentRecordId,
                        principalTable: "PaymentRecords",
                        principalColumn: "PaymentId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RefundRequests",
                columns: table => new
                {
                    RefundId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    PaymentRecordId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    SubscriptionId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    TenantId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    RequestedBy = table.Column<int>(type: "int", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    OriginalAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    RefundAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ApprovedBy = table.Column<int>(type: "int", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ProcessedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    GatewayRefundId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    GatewayResponse = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RejectionReason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ErrorMessage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RefundRequests", x => x.RefundId);
                    table.ForeignKey(
                        name: "FK_RefundRequests_PaymentRecords_PaymentRecordId",
                        column: x => x.PaymentRecordId,
                        principalTable: "PaymentRecords",
                        principalColumn: "PaymentId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PaymentTransactions_GatewayTransactionId",
                table: "PaymentTransactions",
                column: "GatewayTransactionId");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentTransactions_PaymentRecordId_Status",
                table: "PaymentTransactions",
                columns: new[] { "PaymentRecordId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_RefundRequests_PaymentRecordId",
                table: "RefundRequests",
                column: "PaymentRecordId");

            migrationBuilder.CreateIndex(
                name: "IX_RefundRequests_SubscriptionId",
                table: "RefundRequests",
                column: "SubscriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_RefundRequests_TenantId_Status",
                table: "RefundRequests",
                columns: new[] { "TenantId", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PaymentTransactions");

            migrationBuilder.DropTable(
                name: "RefundRequests");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "PaymentRecords");

            migrationBuilder.DropColumn(
                name: "PaidBy",
                table: "PaymentRecords");

            migrationBuilder.DropColumn(
                name: "PaymentMethod",
                table: "PaymentRecords");

            migrationBuilder.DropColumn(
                name: "ProcessedBy",
                table: "PaymentRecords");

            migrationBuilder.DropColumn(
                name: "ReferenceId",
                table: "PaymentRecords");

            migrationBuilder.DropColumn(
                name: "TransactionType",
                table: "PaymentRecords");

            migrationBuilder.AddColumn<string>(
                name: "PlanId1",
                table: "Subscriptions",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Subscriptions_PlanId1",
                table: "Subscriptions",
                column: "PlanId1");

            migrationBuilder.AddForeignKey(
                name: "FK_Subscriptions_Plans_PlanId1",
                table: "Subscriptions",
                column: "PlanId1",
                principalTable: "Plans",
                principalColumn: "PlanId");
        }
    }
}
