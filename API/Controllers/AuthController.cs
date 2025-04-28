using ChatApp.API.DTO;
using ChatApp.Infrastructure.Auth;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    
    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] UserRegisterDto request)
    {
        await _authService.RegisterAsync(request.Username, request.Password);
        return Ok(new { Message = "User registered successfully" });
    }
    
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] UserLoginDto request)
    {
        var token = await _authService.LoginAsync(request.Username, request.Password);
        return Ok(new { Token = token });
    }
}