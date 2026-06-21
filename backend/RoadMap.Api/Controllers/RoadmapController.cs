using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
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
    private readonly ILogger<RoadmapController> _logger;

    public RoadmapController(IRoadmapService roadmapService, ILogger<RoadmapController> logger)
    {
        _roadmapService = roadmapService;
        _logger = logger;
    }

    private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [Authorize]
    [HttpGet("{urlKey}")]
    public async Task<ActionResult<Roadmap>> GetByKey(string urlKey)
    {
        if (string.IsNullOrWhiteSpace(urlKey))
        {
            return BadRequest(new { message = "Key cannot be null" });
        }

        var userId = GetUserId();
        var roadmap = await _roadmapService.GetRoadmapWithFiles(urlKey, userId);

        if (roadmap == null)
        {
            return NotFound(new { message = "Roadmap not found or access denied" });
        }

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

    public record AddEdgeRequest(int FromNodeId, int ToNodeId);

    [HttpPost("{urlKey}/edges")]
    public async Task<IActionResult> AddEdge(string urlKey, [FromBody] AddEdgeRequest request)
    {
        var userId = GetUserId();
        var roadmap = await _roadmapService.GetRoadmapByKey(urlKey, userId);
        var edge = new NodeEdge
        {
            FromNodeId = request.FromNodeId,
            ToNodeId = request.ToNodeId,
            RoadmapId = roadmap.Id
        };
        await _roadmapService.AddEdge(edge);
        return Ok(edge);
    }

    [HttpDelete("edges/{edgeId}")]
    public async Task<IActionResult> DeleteEdge(int edgeId)
    {
        var userId = GetUserId();
        var edge = await _roadmapService.GetEdgeById(edgeId, userId);
        await _roadmapService.RemoveEdge(edge);
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

    public record UpdateTitleRequest(string Title);

    [Authorize]
    [HttpPatch("{urlKey}/update")]
    public async Task<IActionResult> UpdateRoadmap(string urlKey, [FromBody] UpdateTitleRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            return BadRequest(new { message = "Название не может быть пустым" });

        var userId = GetUserId();

        try
        {
            await _roadmapService.UpdateRoadmapTitle(urlKey, userId, request.Title);
            return Ok(new { title = request.Title });
        }
        catch (Exception e)
        {
            return NotFound(new { message = e.Message });
        }
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

    [HttpPost("{urlKey}/ai-hint")]
    public async Task<IActionResult> GetAiHint(
        string urlKey,
        [FromServices] IHttpClientFactory httpClientFactory,
        [FromServices] IConfiguration configuration)
    {
        var userId = GetUserId();
        var roadmap = await _roadmapService.GetRoadmapWithNodes(urlKey, userId);

        var apiKey = configuration["OpenRouter:ApiKey"];
        var model = configuration["OpenRouter:Model"] ?? "openai/gpt-4o-mini";

        if (string.IsNullOrEmpty(apiKey))
            return BadRequest(new
                { error = "OpenRouter API ключ не настроен. Добавьте его в appsettings.Development.json." });

        var nodesText = string.Join("\n", roadmap.Nodes
            .Take(100)
            .Select(n =>
                $"- {n.Title}: {(string.IsNullOrEmpty(n.Description) ? "без описания" : n.Description)} (статус: {n.Status})"));

        var userPrompt = $$"""
                           Пользователь создал учебный роадмап "{{roadmap.Title}}".

                           Существующие узлы:
                           {{nodesText}}

                           Дай практичный совет на русском языке:
                           1. Напиши 2-3 абзаца о том, что ещё можно изучить или добавить в этот роадмап.
                           2. Предложи ровно 3 новых узла.

                           Ответь строго в формате JSON (без markdown, без обёрток):
                           {"advice": "текстовый совет", "suggestedNodes": [{"title": "название", "description": "краткое описание"}]}
                           """;

        var requestBody = new
        {
            model,
            messages = new[]
            {
                new
                {
                    role = "system",
                    content =
                        "Ты помощник для создания учебных роадмапов. Отвечай строго на русском языке. Возвращай только валидный JSON без markdown-обёрток."
                },
                new { role = "user", content = userPrompt }
            },
            response_format = new { type = "json_object" },
            max_tokens = 800
        };

        var client = httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");
        client.DefaultRequestHeaders.Add("HTTP-Referer", "https://roadmap-app.local");
        client.DefaultRequestHeaders.Add("X-Title", "RoadMap App");

        var jsonContent = new StringContent(
            JsonSerializer.Serialize(requestBody),
            Encoding.UTF8,
            "application/json");

        var response = await client.PostAsync("https://openrouter.ai/api/v1/chat/completions", jsonContent);

        if (!response.IsSuccessStatusCode)
        {
            var errorText = await response.Content.ReadAsStringAsync();
            return StatusCode((int)response.StatusCode, new { error = "Ошибка OpenRouter: " + errorText });
        }

        var responseJson = await response.Content.ReadAsStringAsync();
        _logger.LogInformation("[AI-Hint] Raw OpenRouter response: {ResponseJson}", responseJson);

        using var doc = JsonDocument.Parse(responseJson);
        var content = doc.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString();

        _logger.LogInformation("[AI-Hint] Model content: {Content}", content);

        var cleanContent = content!.Trim();
        if (cleanContent.StartsWith("```"))
        {
            var firstNewline = cleanContent.IndexOf('\n');
            var lastFence = cleanContent.LastIndexOf("```");
            if (firstNewline >= 0 && lastFence > firstNewline)
                cleanContent = cleanContent[(firstNewline + 1)..lastFence].Trim();
        }

        try
        {
            using var contentDoc = JsonDocument.Parse(cleanContent);
            return Ok(contentDoc.RootElement.Clone());
        }
        catch (JsonException ex)
        {
            _logger.LogError("[AI-Hint] Failed to parse model content as JSON. Content: {Content}", cleanContent);
            return StatusCode(502,
                new { error = $"ИИ вернул некорректный JSON: {ex.Message}", rawContent = cleanContent });
        }
    }
}