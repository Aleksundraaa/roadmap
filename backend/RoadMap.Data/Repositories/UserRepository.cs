using Microsoft.EntityFrameworkCore;
using RoadMap.Data.Entities;
using RoadMap.Data.IRepositories;

namespace RoadMap.Data.Repositories;

public class UserRepository : IUserRepository
{
    private readonly AppDbContext _context;

    public UserRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<User?> GetByUsernameAsync(string username) =>
        await _context.Users.FirstOrDefaultAsync(u => u.Username == username);

    public async Task AddAsync(User user) => await _context.Users.AddAsync(user);

    public async Task<bool> ExistsAsync(string username) =>
        await _context.Users.AnyAsync(u => u.Username == username);

    public async Task SaveChangesAsync() => await _context.SaveChangesAsync();
}