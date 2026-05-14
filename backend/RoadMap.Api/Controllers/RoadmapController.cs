using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RoadMap.Data.Entities;
using RoadMap.Data.IServices;
using RoadMap.Data.Services;

namespace RoadMap.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class RoadmapController : ControllerBase
{
    private IRoadmapService _roadmapService;

    public RoadmapController(IRoadmapService roadmapService)
    {
        _roadmapService = roadmapService;
    }

    private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet("{urlKey}")]
    public async Task<ActionResult<Roadmap>> GetByKey(string urlKey)
    {
        var userId = GetUserId();
        var roadmap = await _roadmapService.GetRoadmapWithFiles(urlKey, userId);
        return Ok(roadmap);
    }

    public record CreateRoadmapRequest(string Title);

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRoadmapRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            return BadRequest("Название холста не может быть пустым");
        }

        var roadmap = new Roadmap
        {
            Title = request.Title,
            UrlKey = Guid.NewGuid().ToString().Substring(0, 8),
            UserId = GetUserId(),
            Nodes = new List<Node>()
        };

        await _roadmapService.AddRoadmap(roadmap);
        return Ok(roadmap);
    }

    public record AddNodeRequest(string Title, string? Description, double X, double Y);

    [HttpPost("{urlKey}/nodes")]
    public async Task<IActionResult> AddNode(string urlKey, [FromBody] AddNodeRequest request)
    {
        var userId = GetUserId();
        var roadmap = await _roadmapService.GetRoadmapByKey(urlKey, userId);

        var node = new Node
        {
            Title = request.Title,
            Description = request.Description,
            X = request.X,
            Y = request.Y,
            RoadmapId = roadmap.Id
        };

        await _roadmapService.AddNode(node);
        return Ok(node);
    }

    [HttpPut("nodes/{id}")]
    public async Task<IActionResult> UpdateNode(int id, [FromBody] RoadmapService.UpdateNodeRequest request)
    {
        var userId = GetUserId();
        var node = await _roadmapService.GetNodeById(id, userId);
        await _roadmapService.UpdateNodeInfo(node, request);
        return Ok(node);
    }

    [HttpDelete("nodes/{id}")]
    public async Task<IActionResult> DeleteNode(int id)
    {
        var userId = GetUserId();
        var node = await _roadmapService.GetNodeById(id, userId);
        await _roadmapService.RemoveNode(node);
        return Ok();
    }

    [HttpDelete("{key}")]
    public async Task<IActionResult> DeleteRoadmap(string key)
    {
        var userId = GetUserId();
        var roadmap = await _roadmapService.GetRoadmapWithNodes(key, userId);
        await _roadmapService.DeleteRoadmap(roadmap);
        return Ok();
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Roadmap>>> GetMyRoadmaps()
    {
        var userId = GetUserId();
        var roadmaps = await _roadmapService.GetAllRoadmaps(userId);
        return Ok(roadmaps);
    }


    [HttpPost("nodes/{id}/upload-conspect")]
    public async Task<ActionResult> UploadConspect(int id, IFormFile file)
    {
        var userId = GetUserId();
        var newNodeFile = await _roadmapService.UploadNodeFileAsync(id, userId, file);
        return Ok(newNodeFile);
    }
}