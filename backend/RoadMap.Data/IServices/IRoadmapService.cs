using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using RoadMap.Data.Entities;
using RoadMap.Data.Services;

namespace RoadMap.Data.IServices;

public interface IRoadmapService
{
    Task<Roadmap> GetRoadmapWithNodes(string urlKey, int userId);
    Task<Roadmap?> GetRoadmapByKey(string urlKey, int userId);
    Task<NodeFile> UploadNodeFileAsync(int nodeId, int userId, IFormFile file);
    Task<Roadmap> GetRoadmapWithFiles(string urlKey, int userId);
    Task AddRoadmap(Roadmap roadmap);
    Task AddNode(Node node);
    Task RemoveNode(Node node);
    Task DeleteRoadmap(Roadmap roadmap);
    Task<Node> GetNodeById(int id, int userId);
    Task UpdateNodeInfo(Node node, RoadmapService.UpdateNodeRequest request);
    Task<List<Roadmap>> GetAllRoadmaps(int userId);
    Task AddEdge(NodeEdge edge);
    Task RemoveEdge(NodeEdge edge);
    Task<NodeEdge> GetEdgeById(int edgeId, int userId);
    Task UpdateRoadmapTitle(string urlKey, int userId, string newTitle);
}