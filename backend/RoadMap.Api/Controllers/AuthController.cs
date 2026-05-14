using Microsoft.AspNetCore.Mvc;
using RoadMap.Api.DTOs;
using RoadMap.Data.IRepositories;
using RoadMap.Data.IServices;

namespace RoadMap.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IUserRepository _userRepository;
    private readonly IConfiguration _configuration;
    private readonly IAuthService _authService;

    public AuthController(IConfiguration configuration, IAuthService authService)
    {
        _configuration = configuration;
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<ActionResult> Register([FromBody] UserRegisterDto request)
    {
        try 
        {
            var token = await _authService.RegisterAsync(request.Username, request.Password);
            return Ok(new { token });
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("login")]
    public async Task<ActionResult> Login([FromBody] UserLoginDto request)
    {
        var token = await _authService.LoginAsync(request.Username, request.Password);
        
        if (token == null)
            return BadRequest("Неверное имя пользователя или пароль");

        return Ok(new { token });
    }
}