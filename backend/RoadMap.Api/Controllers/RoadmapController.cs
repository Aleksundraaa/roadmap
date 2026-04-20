using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RoadMap.Data;
using RoadMap.Data.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RoadMap.Data;
using RoadMap.Data.Entities;

namespace RoadMap.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RoadmapController : ControllerBase
{
    private readonly AppDbContext _context;

    public RoadmapController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("{urlKey}")]
    public async Task<ActionResult<Roadmap>> GetByKey(string urlKey)
    {
        var roadmap = await _context.Roadmaps
            .Include(r => r.Nodes)
            .FirstOrDefaultAsync(r => r.UrlKey == urlKey);

        if (roadmap == null) return NotFound();

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
            Nodes = new List<Node>()
        };

        _context.Roadmaps.Add(roadmap);
        await _context.SaveChangesAsync();

        return Ok(roadmap);
    }
    
    public record AddNodeRequest(string Title, string? Description, double X, double Y);

    [HttpPost("{urlKey}/nodes")]
    public async Task<IActionResult> AddNode(string urlKey, [FromBody] AddNodeRequest request)
    {
        var roadmap = await _context.Roadmaps.FirstOrDefaultAsync(r => r.UrlKey == urlKey);
        if (roadmap == null) return NotFound("Карта не найдена");

        var node = new Node
        {
            Title = request.Title,
            Description = request.Description,
            X = request.X,
            Y = request.Y,
            RoadmapId = roadmap.Id 
        };

        _context.Nodes.Add(node);
        await _context.SaveChangesAsync();

        return Ok(node);
    }

    public record UpdateNodeRequest(string Title, string? Description, double X, double Y, int? ParentNodeId);

    [HttpPut("nodes/{id}")]
    public async Task<IActionResult> UpdateNode(int id, [FromBody] UpdateNodeRequest request)
    {
        var node = await _context.Nodes.FindAsync(id);
        if (node == null) return NotFound();

        node.Title = request.Title;
        node.Description = request.Description;
        node.X = request.X;
        node.Y = request.Y;
        node.ParentNodeId = request.ParentNodeId;

        await _context.SaveChangesAsync();
        return Ok(node);
    }
    
    [HttpDelete("nodes/{id}")]
    public async Task<IActionResult> DeleteNode(int id)
    {
        var node = await _context.Nodes.FindAsync(id);
        if (node == null) return NotFound();

        _context.Nodes.Remove(node);
        await _context.SaveChangesAsync();

        return NoContent(); 
    }
}