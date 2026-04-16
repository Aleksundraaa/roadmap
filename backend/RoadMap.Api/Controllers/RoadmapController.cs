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

    public record CreateRoadmapRequest(string Title);
}