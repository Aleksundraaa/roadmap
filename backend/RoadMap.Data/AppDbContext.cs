using Microsoft.EntityFrameworkCore;
using RoadMap.Data.Entities; 

namespace RoadMap.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }
    
    public DbSet<Roadmap> Roadmaps => Set<Roadmap>();
    public DbSet<Node> Nodes => Set<Node>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<Roadmap>()
            .HasMany(r => r.Nodes)
            .WithOne(n => n.Roadmap)
            .HasForeignKey(n => n.RoadmapId);
    }
}