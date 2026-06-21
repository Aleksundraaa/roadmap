namespace RoadMap.Data.Entities;

public class UserRoadmapAccess
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    
    public int RoadmapId { get; set; }
    public Roadmap Roadmap { get; set; } = null!;
}