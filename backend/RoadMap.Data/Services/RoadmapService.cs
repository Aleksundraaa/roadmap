using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RoadMap.Data.Entities;
using RoadMap.Data.IServices;

namespace RoadMap.Data.Services;

public class RoadmapService : IRoadmapService
{
    private readonly AppDbContext _context;

    public RoadmapService(AppDbContext context)
    {
        _context = context;
    }

    public record UpdateNodeRequest(
        string Title,
        string? Description,
        double X,
        double Y,
        int? ParentNodeId,
        string Status);

    public async Task<Roadmap> GetRoadmapWithNodes(string urlKey, int userId)
    {
        var roadmap = await _context.Roadmaps
            .Include(n => n.Nodes)
            .FirstOrDefaultAsync(r => r.UrlKey == urlKey && r.UserId == userId);
        if (roadmap == null)
        {
            throw new Exception("Дорожная карта не найдена или не вы ее владелец");
        }

        return roadmap;
    }

    public async Task<Roadmap?> GetRoadmapByKey(string urlKey, int userId)
    {
        var roadmap = await _context.Roadmaps
            .FirstOrDefaultAsync(r => r.UrlKey == urlKey && r.UserId == userId);
        if (roadmap == null)
        {
            throw new Exception("Дорожная карта не найдена или не вы ее владелец");
        }

        return roadmap;
    }

    public async Task<List<Roadmap>> GetAllRoadmaps(int userId)
    {
        var roadmapList = await _context.Roadmaps
            .Where(r => r.UserId == userId)
            .ToListAsync();
        return roadmapList;
    }

    public async Task<Roadmap> GetRoadmapWithFiles(string urlKey, int userId)
    {
        var roadmap = await _context.Roadmaps
            .Include(n => n.Nodes)
            .ThenInclude(n => n.Files)
            .FirstOrDefaultAsync(r => r.UrlKey == urlKey && r.UserId == userId);
        if (roadmap == null)
        {
            throw new Exception("Не найдена дорожная карта или не вы владелец");
        }

        return roadmap;
    }

    private async Task<Node> GetNodeByFile(int nodeId, IFormFile file)
    {
        var node = await _context.Nodes
            .Include(n => n.Roadmap)
            .Include(n => n.Files)
            .FirstOrDefaultAsync(n => n.Id == nodeId);
        if (node == null)
        {
            throw new Exception("Нет узла");
        }

        if (file == null || file.Length == 0)
        {
            throw new Exception("Файл не выбран");
        }

        return node;
    }

    public async Task AddRoadmap(Roadmap roadmap)
    {
        _context.Roadmaps.Add(roadmap);
        await _context.SaveChangesAsync();
    }

    public async Task AddNode(Node node)
    {
        var roadMapExists = await _context.Roadmaps.AnyAsync(r => r.Id == node.RoadmapId);
        if (!roadMapExists)
        {
            throw new Exception("Указанный холст не найден");
        }
        _context.Nodes.Add(node);
        await _context.SaveChangesAsync();
    }

    public async Task RemoveNode(Node node)
    {
        _context.Nodes.Remove(node);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteRoadmap(Roadmap roadmap)
    {
        _context.Roadmaps.Remove(roadmap);
        await _context.SaveChangesAsync();
    }

    public async Task<Node> GetNodeById(int id, int userId)
    {
        var node = await _context.Nodes
            .Include(n => n.Roadmap)
            .FirstOrDefaultAsync(n => n.Id == id);

        if (node == null || node.Roadmap.UserId != userId)
        {
            throw new Exception("Дорожная карта не найдена или не вы ее владелец");
        }

        return node;
    }

    public async Task UpdateNodeInfo(Node node, UpdateNodeRequest request)
    {
        node.Title = request.Title;
        node.Description = request.Description;
        node.X = request.X;
        node.Y = request.Y;
        node.ParentNodeId = request.ParentNodeId;
        node.Status = request.Status;
        await _context.SaveChangesAsync();
    }

    public async Task<NodeFile> UploadNodeFileAsync(int nodeId, int userId, IFormFile file)
    {
        var node = await GetNodeByFile(nodeId, file);
        if (node.Roadmap.UserId != userId)
        {
            throw new Exception("У вас нет прав");
        }

        var storageName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
        var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");

        if (!Directory.Exists(uploadsFolder))
            Directory.CreateDirectory(uploadsFolder);

        var filePath = Path.Combine(uploadsFolder, storageName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var newNodeFile = new NodeFile
        {
            FileName = file.FileName,
            StoragePath = storageName,
            NodeId = nodeId
        };
        
        _context.NodeFiles.Add(newNodeFile);
        await _context.SaveChangesAsync();

        return newNodeFile;
    }
}