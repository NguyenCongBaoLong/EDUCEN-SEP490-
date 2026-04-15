using EducenAPI.Persistence.Contexts;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EducenAPI.Persistence.Migrations.TenantDb
{
    [DbContext(typeof(EducenV2Context))]
    [Migration("20260404161500_AddUpdatedAtToFamilyInvoices")]
    public partial class AddUpdatedAtToFamilyInvoices : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[FamilyInvoices]', N'U') IS NOT NULL
    AND COL_LENGTH(N'[dbo].[FamilyInvoices]', N'UpdatedAt') IS NULL
BEGIN
    ALTER TABLE [dbo].[FamilyInvoices]
    ADD [UpdatedAt] datetime2 NULL;
END
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[FamilyInvoices]', N'U') IS NOT NULL
    AND COL_LENGTH(N'[dbo].[FamilyInvoices]', N'UpdatedAt') IS NOT NULL
BEGIN
    ALTER TABLE [dbo].[FamilyInvoices]
    DROP COLUMN [UpdatedAt];
END
");
        }
    }
}
