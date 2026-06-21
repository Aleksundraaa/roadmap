using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using RoadMap.Data.Entities;
using RoadMap.Data.IRepositories;

namespace RoadMap.Data.Repositories;

public class RoadmapRepository : IRoadmapRepository
{
    private readonly AppDbContext _context;

    public RoadmapRepository(AppDbContext context)
    {
        _context = context;
    }


    public async Task SaveChanges()
    {
        await _context.SaveChangesAsync();
    }

    public async Task<Roadmap?> GetRoadmapWithNodes(string urlKey)
    {
        var roadmap = await _context.Roadmaps
            .Include(n => n.Nodes)
            .Include(r => r.Edges)
            .FirstOrDefaultAsync(r => r.UrlKey == urlKey);
        return roadmap;
    }

    public async Task<Roadmap?> GetRoadmapWithFiles(string urlKey)
    {
        var roadmap = await _context.Roadmaps
            .Include(n => n.Nodes)
            .ThenInclude(n => n.Files)
            .Include(r => r.Edges)
            .FirstOrDefaultAsync(r => r.UrlKey == urlKey);
        return roadmap;
    }

    public async Task AddUserAccessIfNotExist(int userId, int roadmapId)
    {
        var exists = await _context.UserRoadmapAccesses
            .AnyAsync(a => a.UserId == userId && a.RoadmapId == roadmapId);

        if (!exists)
        {
            _context.UserRoadmapAccesses.Add(new UserRoadmapAccess 
            { 
                UserId = userId, 
                RoadmapId = roadmapId 
            });
            await _context.SaveChangesAsync();
        }
    }

    public async Task<List<Roadmap>> GetRoadmapListWithVisited(int userId)
    {
        return await _context.Roadmaps
            .Where(r => r.UserId == userId || 
                        _context.UserRoadmapAccesses.Any(a => a.RoadmapId == r.Id && a.UserId == userId))
            .ToListAsync();
    }

    public async Task<Roadmap?> GetRoadmapWithoutNodes(string urlKey)
    {
        var roadmap = await _context.Roadmaps
            .FirstOrDefaultAsync(r => r.UrlKey == urlKey);
        return roadmap;
    }

    public async Task<List<Roadmap>> GetRoadmapList(int userId)
    {
        return await _context.Roadmaps
            .Where(r => r.UserId == userId || 
                        _context.UserRoadmapAccesses.Any(a => a.RoadmapId == r.Id && a.UserId == userId))
            .ToListAsync();
    }

    public async Task<Node?> GetNodeWithFile(int nodeId, IFormFile file)
    {
        var node = await _context.Nodes
            .Include(n => n.Roadmap)
            .Include(n => n.Files)
            .FirstOrDefaultAsync(n => n.Id == nodeId);
        return node;
    }

    public async Task<Node?> GetNode(int nodeId)
    {
        var node = await _context.Nodes
            .Include(n => n.Roadmap)
            .FirstOrDefaultAsync(n => n.Id == nodeId);
        return node;
    }

    public async Task AddFile(NodeFile file)
    {
        _context.NodeFiles.Add(file);
        await _context.SaveChangesAsync();
    }

    public async Task AddRoadmap(Roadmap roadmap)
    {
        _context.Roadmaps.Add(roadmap);
        await _context.SaveChangesAsync();
    }

    public async Task AddNode(Node node)
    { 
        _context.Nodes.Add(node);
        await _context.SaveChangesAsync();
    }

    public async Task RemoveNode(Node node)
    {
        _context.Nodes.Remove(node);
        await _context.SaveChangesAsync();
    }

    public async Task RemoveRoadmap(Roadmap roadmap)
    {
        _context.Roadmaps.Remove(roadmap);
        await _context.SaveChangesAsync();
    }

    public async Task<bool> CheckRoadmapExists(int roadMapId)
    {
        var roadMapExists = await _context.Roadmaps.AnyAsync(r => r.Id == roadMapId);
        return roadMapExists;
    }

    public async Task<NodeEdge?> GetEdge(int edgeId) =>
        await _context.NodeEdges.Include(e => e.Roadmap).FirstOrDefaultAsync(e => e.Id == edgeId);

    public async Task AddEdge(NodeEdge edge)
    {
        _context.NodeEdges.Add(edge);
        await _context.SaveChangesAsync();
    }

    public async Task RemoveEdge(NodeEdge edge)
    {
        _context.NodeEdges.Remove(edge);
        await _context.SaveChangesAsync();
    }
}