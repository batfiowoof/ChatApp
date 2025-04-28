using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using ChatApp.API.Models;
using System.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using ChatApp.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace ChatApp.Infrastructure.Auth;

public class AuthService : IAuthService
{
    private readonly ApplicationDbContext _db;
    private readonly IConfiguration _configuration;
    
    public AuthService(ApplicationDbContext db, IConfiguration configuration)
    {
        _db = db;
        _configuration = configuration;
    }

    public async Task RegisterAsync(string username, string password)
    {
        if (string.IsNullOrWhiteSpace(username))
            throw new ArgumentException("Username cannot be empty", nameof(username));
        
        if (await _db .Users.AnyAsync(u => u.Username == username))
            throw new InvalidOperationException("Username already exists");

        // hash with HMACSHA512
        using var hmac = new HMACSHA512();
        
        var user = new User
        {
            Username = username,
            PasswordHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(password)),
            PasswordSalt = hmac.Key
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();
    }
    
    public async Task<string> LoginAsync(string username, string password)
    {
        var user = await _db.Users.SingleOrDefaultAsync(u => u.Username == username);
        if (user == null)
            throw new InvalidOperationException("Invalid username or password");

        using var hmac = new HMACSHA512(user.PasswordSalt);
        var computedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(password));

        if (!computedHash.SequenceEqual(user.PasswordHash))
            throw new InvalidOperationException("Invalid username or password");

        // Generate JWT token
        return GenerateToken(user);
    }

    private string GenerateToken(User user)
    {
        // Create claims for the token to identify the user
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username)
        };
        
        // Create a symmetric security key using the secret key from configuration
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha512Signature);

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.Now.AddHours(8),
            signingCredentials: creds
        );
        
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}