using System.Text.Json.Serialization; 

namespace RoadMap.Data.Entities;

public class Node
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public double X { get; set; }
    public double Y { get; set; }
    public int RoadmapId { get; set; }
    public string Status { get; set; } = "todo"; // todo, doing, done

    [JsonIgnore] 
    public Roadmap Roadmap { get; set; } = null!;

    public int? ParentNodeId { get; set; }
}