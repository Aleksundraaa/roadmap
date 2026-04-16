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

    [HttpPost]
    public async Task<ActionResult<Roadmap>> Create()
    {
        var roadmap = new Roadmap(); 
        
        _context.Roadmaps.Add(roadmap);
        await _context.SaveChangesAsync();

        return Ok(roadmap);
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
}