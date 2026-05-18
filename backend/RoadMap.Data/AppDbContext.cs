using Microsoft.EntityFrameworkCore;
using RoadMap.Data.Entities; 

namespace RoadMap.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }
    public DbSet<User> Users => Set<User>();
    
    public DbSet<Roadmap> Roadmaps => Set<Roadmap>();
    public DbSet<Node> Nodes => Set<Node>();
    public DbSet<NodeFile> NodeFiles => Set<NodeFile>();
    public DbSet<NodeEdge> NodeEdges => Set<NodeEdge>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<Roadmap>()
            .HasMany(r => r.Nodes)
            .WithOne(n => n.Roadmap)
            .HasForeignKey(n => n.RoadmapId);
        modelBuilder.Entity<NodeEdge>()
            .HasOne(e => e.FromNode).WithMany().HasForeignKey(e => e.FromNodeId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<NodeEdge>()
            .HasOne(e => e.ToNode).WithMany().HasForeignKey(e => e.ToNodeId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<NodeEdge>()
            .HasOne(e => e.Roadmap).WithMany(r => r.Edges).HasForeignKey(e => e.RoadmapId).OnDelete(DeleteBehavior.Cascade);
    }
}