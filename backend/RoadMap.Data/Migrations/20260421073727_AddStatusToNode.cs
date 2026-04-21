using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RoadMap.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddStatusToNode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Nodes",
                type: "TEXT",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Status",
                table: "Nodes");
        }
    }
}
