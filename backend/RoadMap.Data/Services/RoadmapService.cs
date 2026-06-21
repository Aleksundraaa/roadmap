using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RoadMap.Data.Entities;
using RoadMap.Data.IRepositories;
using RoadMap.Data.IServices;

namespace RoadMap.Data.Services;

public class RoadmapService : IRoadmapService
{
    private readonly IRoadmapRepository _repository;

    public RoadmapService(IRoadmapRepository repository)
    {
        _repository = repository;
    }

    public record UpdateNodeRequest(
        string Title,
        string? Description,
        double X,
        double Y,
        int? ParentNodeId,
        string Status);


    public async Task<Roadmap> GetRoadmapWithNodes(string urlKey)
    {
        var roadmap = await _repository.GetRoadmapWithNodes(urlKey);
        if (roadmap == null)
        {
            throw new Exception("Дорожная карта не найдена");
        }

        return roadmap;
    }

    public async Task<Roadmap?> GetRoadmapByKey(string urlKey)
    {
        var roadmap = await _repository.GetRoadmapWithNodes(urlKey);
        return roadmap;
    }

    public async Task<List<Roadmap>> GetAllRoadmaps(int userId)
    {
        return await _repository.GetRoadmapList(userId);
    }

    public async Task<Roadmap> GetRoadmapWithFiles(string urlKey)
    {
        return await _repository.GetRoadmapWithFiles(urlKey);
    }

    private async Task<Node> GetNodeWithFile(int nodeId, IFormFile file)
    {
        var node = await _repository.GetNodeWithFile(nodeId, file);
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
        await _repository.AddRoadmap(roadmap);
    }

    public async Task AddNode(Node node)
    {
        var roadMapExists = await _repository.CheckRoadmapExists(node.RoadmapId);
        if (!roadMapExists)
        {
            throw new Exception("Указанный холст не найден");
        }

        await _repository.AddNode(node);
    }

    public async Task RemoveNode(Node node)
    {
        await _repository.RemoveNode(node);
    }

    public async Task DeleteRoadmap(Roadmap roadmap)
    {
        await _repository.RemoveRoadmap(roadmap);
    }

    public async Task<Node> GetNodeById(int id, int userId)
    {
        var node = await _repository.GetNode(id);
        if (node == null) throw new Exception("Узел не найден");
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
        await _repository.SaveChanges();
    }

    public async Task AddEdge(NodeEdge edge) => await _repository.AddEdge(edge);

    public async Task RemoveEdge(NodeEdge edge) => await _repository.RemoveEdge(edge);

    public async Task<NodeEdge> GetEdgeById(int edgeId, int userId)
    {
        var edge = await _repository.GetEdge(edgeId);
        if (edge == null || edge.Roadmap.UserId != userId)
            throw new Exception("Связь не найдена или нет прав");
        return edge;
    }

    public async Task UpdateRoadmapTitle(string urlKey, int userId, string newTitle)
    {
        var roadmap = await _repository.GetRoadmapWithoutNodes(urlKey);

        if (roadmap == null)
        {
            throw new Exception("Дорожная карта не найдена или у вас нет прав");
        }

        roadmap.Title = newTitle;
        await _repository.SaveChanges();
    }

    public async Task RecordUserVisit(int userId, int roadmapId)
    {
        await _repository.AddUserAccessIfNotExist(userId, roadmapId);
    }


    public async Task<NodeFile> UploadNodeFileAsync(int nodeId, int userId, IFormFile file)
    {
        var node = await _repository.GetNodeWithFile(nodeId, file);

        if (node == null)
        {
            throw new Exception("Нет узла");
        }

        if (file == null || file.Length == 0)
        {
            throw new Exception("Файл не выбран");
        }

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

        await _repository.AddFile(newNodeFile);
        return newNodeFile;
    }
}