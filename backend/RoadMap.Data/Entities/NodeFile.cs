namespace RoadMap.Data.Entities;

public class NodeFile
{
    public int Id { get; set; }
    public string FileName { get; set; } 
    public string StoragePath { get; set; }
    public int NodeId { get; set; }
    public Node Node { get; set; }
}