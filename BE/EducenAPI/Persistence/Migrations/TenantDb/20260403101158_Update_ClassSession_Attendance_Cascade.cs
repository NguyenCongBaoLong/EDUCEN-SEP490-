using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EducenAPI.Persistence.Migrations.TenantDb
{
    /// <inheritdoc />
    public partial class Update_ClassSession_Attendance_Cascade : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drop existing foreign key if exists
            migrationBuilder.Sql(@"
                IF EXISTS (
                    SELECT 1 FROM sys.foreign_keys 
                    WHERE name = 'FK_Attendances_ClassSessions_SessionId'
                )
                BEGIN
                    ALTER TABLE [Attendances] DROP CONSTRAINT [FK_Attendances_ClassSessions_SessionId];
                END
            ");

            // Add foreign key with CASCADE DELETE
            migrationBuilder.Sql(@"
                ALTER TABLE [Attendances] 
                ADD CONSTRAINT [FK_Attendances_ClassSessions_SessionId] 
                FOREIGN KEY ([SessionId]) REFERENCES [ClassSessions] ([SessionId]) 
                ON DELETE CASCADE;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Drop cascade constraint
            migrationBuilder.Sql(@"
                IF EXISTS (
                    SELECT 1 FROM sys.foreign_keys 
                    WHERE name = 'FK_Attendances_ClassSessions_SessionId'
                )
                BEGIN
                    ALTER TABLE [Attendances] DROP CONSTRAINT [FK_Attendances_ClassSessions_SessionId];
                END
            ");

            // Add back original constraint (no cascade)
            migrationBuilder.Sql(@"
                ALTER TABLE [Attendances] 
                ADD CONSTRAINT [FK_Attendances_ClassSessions_SessionId] 
                FOREIGN KEY ([SessionId]) REFERENCES [ClassSessions] ([SessionId]);
            ");
        }
    }
}
