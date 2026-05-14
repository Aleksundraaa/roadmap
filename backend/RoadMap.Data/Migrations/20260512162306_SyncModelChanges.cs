using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RoadMap.Data.Migrations
{
    /// <inheritdoc />
    public partial class SyncModelChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_NodeFile_Nodes_NodeId",
                table: "NodeFile");

            migrationBuilder.DropPrimaryKey(
                name: "PK_NodeFile",
                table: "NodeFile");

            migrationBuilder.RenameTable(
                name: "NodeFile",
                newName: "NodeFiles");

            migrationBuilder.RenameIndex(
                name: "IX_NodeFile_NodeId",
                table: "NodeFiles",
                newName: "IX_NodeFiles_NodeId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_NodeFiles",
                table: "NodeFiles",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_NodeFiles_Nodes_NodeId",
                table: "NodeFiles",
                column: "NodeId",
                principalTable: "Nodes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_NodeFiles_Nodes_NodeId",
                table: "NodeFiles");

            migrationBuilder.DropPrimaryKey(
                name: "PK_NodeFiles",
                table: "NodeFiles");

            migrationBuilder.RenameTable(
                name: "NodeFiles",
                newName: "NodeFile");

            migrationBuilder.RenameIndex(
                name: "IX_NodeFiles_NodeId",
                table: "NodeFile",
                newName: "IX_NodeFile_NodeId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_NodeFile",
                table: "NodeFile",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_NodeFile_Nodes_NodeId",
                table: "NodeFile",
                column: "NodeId",
                principalTable: "Nodes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
