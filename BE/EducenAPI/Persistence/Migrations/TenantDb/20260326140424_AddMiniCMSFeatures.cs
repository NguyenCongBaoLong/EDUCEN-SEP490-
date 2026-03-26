using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EducenAPI.Persistence.Migrations.TenantDb
{
    /// <inheritdoc />
    public partial class AddMiniCMSFeatures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DisplayConfig",
                table: "CenterProfiles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FacebookUrl",
                table: "CenterProfiles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "InstagramUrl",
                table: "CenterProfiles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PrimaryColor",
                table: "CenterProfiles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "YoutubeUrl",
                table: "CenterProfiles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ButtonLink",
                table: "CenterHeroImages",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ButtonText",
                table: "CenterHeroImages",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SubTitle",
                table: "CenterHeroImages",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Title",
                table: "CenterHeroImages",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "CenterStaffs",
                columns: table => new
                {
                    CenterStaffId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CenterProfileId = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Role = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Bio = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AvatarUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CenterStaffs", x => x.CenterStaffId);
                    table.ForeignKey(
                        name: "FK_CenterStaffs_CenterProfiles_CenterProfileId",
                        column: x => x.CenterProfileId,
                        principalTable: "CenterProfiles",
                        principalColumn: "CenterProfileId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CenterStaffs_CenterProfileId",
                table: "CenterStaffs",
                column: "CenterProfileId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CenterStaffs");

            migrationBuilder.DropColumn(
                name: "DisplayConfig",
                table: "CenterProfiles");

            migrationBuilder.DropColumn(
                name: "FacebookUrl",
                table: "CenterProfiles");

            migrationBuilder.DropColumn(
                name: "InstagramUrl",
                table: "CenterProfiles");

            migrationBuilder.DropColumn(
                name: "PrimaryColor",
                table: "CenterProfiles");

            migrationBuilder.DropColumn(
                name: "YoutubeUrl",
                table: "CenterProfiles");

            migrationBuilder.DropColumn(
                name: "ButtonLink",
                table: "CenterHeroImages");

            migrationBuilder.DropColumn(
                name: "ButtonText",
                table: "CenterHeroImages");

            migrationBuilder.DropColumn(
                name: "SubTitle",
                table: "CenterHeroImages");

            migrationBuilder.DropColumn(
                name: "Title",
                table: "CenterHeroImages");
        }
    }
}
