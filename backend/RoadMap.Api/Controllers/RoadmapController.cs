using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RoadMap.Data;
using RoadMap.Data.Entities;

namespace RoadMap.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class RoadmapController : ControllerBase
{
    private readonly AppDbContext _context;

    public RoadmapController(AppDbContext context)
    {
        _context = context;
    }

    private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet("{urlKey}")]
    public async Task<ActionResult<Roadmap>> GetByKey(string urlKey)
    {
        var userId = GetUserId();
        var roadmap = await _context.Roadmaps
            .Include(r => r.Nodes)
            .ThenInclude(f => f.Files)
            .FirstOrDefaultAsync(r => r.UrlKey == urlKey && r.UserId == userId);

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
            UserId = GetUserId(),
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
        var userId = GetUserId();
        var roadmap = await _context.Roadmaps.FirstOrDefaultAsync(r => r.UrlKey == urlKey
                                                                       && r.UserId == userId);
        if (roadmap == null) return NotFound("Дорожная карта не найдена или не вы ее владелец");

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

    public record UpdateNodeRequest(
        string Title,
        string? Description,
        double X,
        double Y,
        int? ParentNodeId,
        string Status);

    [HttpPut("nodes/{id}")]
    public async Task<IActionResult> UpdateNode(int id, [FromBody] UpdateNodeRequest request)
    {
        var userId = GetUserId();
        var node = await _context.Nodes
            .Include(n => n.Roadmap)
            .FirstOrDefaultAsync(n => n.Id == id);

        if (node == null || node.Roadmap.UserId != userId)
            return NotFound("Дорожная карта не найдена или не вы ее владелец");

        node.Title = request.Title;
        node.Description = request.Description;
        node.X = request.X;
        node.Y = request.Y;
        node.ParentNodeId = request.ParentNodeId;
        node.Status = request.Status;

        await _context.SaveChangesAsync();
        return Ok(node);
    }

    [HttpDelete("nodes/{id}")]
    public async Task<IActionResult> DeleteNode(int id)
    {
        var userId = GetUserId();
        var node = await _context.Nodes
            .Include(n => n.Roadmap)
            .FirstOrDefaultAsync(n => n.Id == id);

        if (node == null || node.Roadmap.UserId != userId)
            return NotFound("Дорожная карта не найдена или не вы ее владелец");

        _context.Nodes.Remove(node);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{key}")]
    public async Task<IActionResult> DeleteRoadmap(string key)
    {
        var userId = GetUserId();
        var roadmap = await _context.Roadmaps
            .Include(r => r.Nodes)
            .FirstOrDefaultAsync(r => r.UrlKey == key && r.UserId == userId);

        if (roadmap == null) return NotFound("Дорожная карта не найдена или не вы ее владелец");
        _context.Roadmaps.Remove(roadmap);
        await _context.SaveChangesAsync();

        return Ok();
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Roadmap>>> GetMyRoadmaps()
    {
        var userId = GetUserId();
        return await _context.Roadmaps
            .Where(r => r.UserId == userId)
            .ToListAsync();
    }


    [HttpPost("nodes/{id}/upload-conspect")]
    public async Task<ActionResult> UploadConspect(int id, IFormFile file)
    {
        var userId = GetUserId();
        var node = await _context.Nodes
            .Include(n => n.Roadmap)
            .Include(n => n.Files)
            .FirstOrDefaultAsync(n => n.Id == id);

        if (node == null || node.Roadmap.UserId != userId)
        {
            return NotFound("Нет узла или у вас нет прав");
        }

        if (file == null || file.Length == 0)
        {
            return BadRequest("Файл не выбран");
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
            NodeId = id
        };
        _context.NodeFiles.Add(newNodeFile);
        await _context.SaveChangesAsync();
        return Ok(newNodeFile);
    }
}