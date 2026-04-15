using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EducenAPI.Persistence.Migrations.TenantDb
{
    /// <inheritdoc />
    public partial class Fix_ResourceFile_LessonMaterial_Cascade : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drop existing foreign key if exists
            migrationBuilder.Sql(@"
                IF EXISTS (
                    SELECT 1 FROM sys.foreign_keys 
                    WHERE name = 'FK_ResourceFiles_LessonMaterials_LessonMaterialId'
                )
                BEGIN
                    ALTER TABLE [ResourceFiles] DROP CONSTRAINT [FK_ResourceFiles_LessonMaterials_LessonMaterialId];
                END
            ");

            // Add foreign key with CASCADE DELETE
            migrationBuilder.Sql(@"
                ALTER TABLE [ResourceFiles] 
                ADD CONSTRAINT [FK_ResourceFiles_LessonMaterials_LessonMaterialId] 
                FOREIGN KEY ([LessonMaterialId]) REFERENCES [LessonMaterials] ([MaterialId]) 
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
                    WHERE name = 'FK_ResourceFiles_LessonMaterials_LessonMaterialId'
                )
                BEGIN
                    ALTER TABLE [ResourceFiles] DROP CONSTRAINT [FK_ResourceFiles_LessonMaterials_LessonMaterialId];
                END
            ");

            // Add back original constraint (SET NULL)
            migrationBuilder.Sql(@"
                ALTER TABLE [ResourceFiles] 
                ADD CONSTRAINT [FK_ResourceFiles_LessonMaterials_LessonMaterialId] 
                FOREIGN KEY ([LessonMaterialId]) REFERENCES [LessonMaterials] ([MaterialId]) 
                ON DELETE SET NULL;
            ");
        }
    }
}
