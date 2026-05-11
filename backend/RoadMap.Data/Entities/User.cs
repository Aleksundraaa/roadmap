namespace RoadMap.Data.Entities;

public class User
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    
    public List<Roadmap> Roadmaps { get; set; } = new List<Roadmap>();
}