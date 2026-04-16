namespace RoadMap.Data.Entities;

public class Roadmap
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;   
    public string UrlKey { get; set; } = Guid.NewGuid().ToString().Substring(0, 8);
    public List<Node> Nodes { get; set; } = new();
}