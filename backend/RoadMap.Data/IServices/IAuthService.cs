namespace RoadMap.Data.IServices;

public interface IAuthService
{
    Task<string?> LoginAsync(string username, string password);
    Task<string> RegisterAsync(string username, string password);
}