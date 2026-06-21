using Microsoft.AspNetCore.Http;
using RoadMap.Data.Entities;

namespace RoadMap.Data.IRepositories;

public interface IRoadmapRepository
{
    Task SaveChanges();
    Task<Roadmap?> GetRoadmapWithNodes(string urlKey);
    Task<Roadmap?> GetRoadmapWithoutNodes(string urlKey);
    Task<List<Roadmap>> GetRoadmapList(int userId);
    Task<Node?> GetNodeWithFile(int nodeId, IFormFile file);
    Task<Node?> GetNode(int nodeId);
    Task AddFile(NodeFile file);
    Task AddRoadmap(Roadmap roadmap);
    Task AddNode(Node node);
    Task RemoveNode(Node node);
    Task RemoveRoadmap(Roadmap roadmap);
    Task<bool> CheckRoadmapExists(int roadmapId);
    Task<NodeEdge?> GetEdge(int edgeId);
    Task AddEdge(NodeEdge edge);
    Task RemoveEdge(NodeEdge edge);
    Task<Roadmap> GetRoadmapWithFiles(string urlKey);
    Task AddUserAccessIfNotExist(int userId, int roadmapId);
    Task<List<Roadmap>> GetRoadmapListWithVisited(int userId);
}