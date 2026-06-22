using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RoadMap.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddUserRoadmapAccess : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "UserRoadmapAccesses",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    UserId = table.Column<int>(type: "INTEGER", nullable: false),
                    RoadmapId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserRoadmapAccesses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserRoadmapAccesses_Roadmaps_RoadmapId",
                        column: x => x.RoadmapId,
                        principalTable: "Roadmaps",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserRoadmapAccesses_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserRoadmapAccesses_RoadmapId",
                table: "UserRoadmapAccesses",
                column: "RoadmapId");

            migrationBuilder.CreateIndex(
                name: "IX_UserRoadmapAccesses_UserId",
                table: "UserRoadmapAccesses",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "UserRoadmapAccesses");
        }
    }
}
