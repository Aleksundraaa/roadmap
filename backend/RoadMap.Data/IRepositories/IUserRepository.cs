using RoadMap.Data.Entities;

namespace RoadMap.Data.IRepositories;

public interface IUserRepository
{
    Task<User?> GetByUsernameAsync(string username);
    Task AddAsync(User user);
    Task<bool> ExistsAsync(string username);
    Task SaveChangesAsync();
}