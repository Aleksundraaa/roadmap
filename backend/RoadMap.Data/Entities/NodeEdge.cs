using System.Text.Json.Serialization;

namespace RoadMap.Data.Entities;

public class NodeEdge
{
    public int Id { get; set; }
    public int FromNodeId { get; set; }
    public int ToNodeId { get; set; }
    public int RoadmapId { get; set; }

    [JsonIgnore] public Node FromNode { get; set; } = null!;
    [JsonIgnore] public Node ToNode { get; set; } = null!;
    [JsonIgnore] public Roadmap Roadmap { get; set; } = null!;
}
