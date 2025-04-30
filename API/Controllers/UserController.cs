using System.Security.Claims;
using ChatApp.API.DTO;
using ChatApp.API.Models;
using ChatApp.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ChatApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UserController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<UserController> _logger;
    private readonly IWebHostEnvironment _environment;

    public UserController(ApplicationDbContext db, ILogger<UserController> logger, IWebHostEnvironment environment)
    {
        _db = db;
        _logger = logger;
        _environment = environment;
    }

    private Guid GetUserId()
    {
        var userIdClaim = User?.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
        {
            throw new UnauthorizedAccessException("User ID claim not found.");
        }
        return Guid.Parse(userIdClaim.Value);
    }

    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile()
    {
        try
        {
            var userId = GetUserId();
            var user = await _db.Users.FindAsync(userId);

            if (user == null)
            {
                return NotFound("User not found");
            }

            return Ok(new
            {
                Username = user.Username,
                ProfilePictureUrl = user.ProfilePictureUrl,
                Bio = user.Bio
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving user profile");
            return StatusCode(500, "An error occurred while retrieving your profile");
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetUserById(Guid id)
    {
        try
        {
            var user = await _db.Users.FindAsync(id);

            if (user == null)
            {
                return NotFound("User not found");
            }

            return Ok(new
            {
                Id = user.Id,
                Username = user.Username,
                ProfilePictureUrl = user.ProfilePictureUrl,
                Bio = user.Bio
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving user by ID");
            return StatusCode(500, "An error occurred while retrieving user data");
        }
    }

    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UserProfileUpdateDto profileUpdate)
    {
        try
        {
            var userId = GetUserId();
            var user = await _db.Users.FindAsync(userId);

            if (user == null)
            {
                return NotFound("User not found");
            }

            // Update bio if provided
            if (profileUpdate.Bio != null)
            {
                user.Bio = profileUpdate.Bio;
            }

            await _db.SaveChangesAsync();
            return Ok(new
            {
                Username = user.Username,
                ProfilePictureUrl = user.ProfilePictureUrl,
                Bio = user.Bio
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating user profile");
            return StatusCode(500, "An error occurred while updating your profile");
        }
    }

    [HttpPost("profile-picture")]
    public async Task<IActionResult> UploadProfilePicture(IFormFile file)
    {
        try
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest("No file was uploaded");
            }

            // Validate file is an image
            if (!file.ContentType.StartsWith("image/"))
            {
                return BadRequest("Only image files are allowed");
            }

            // Maximum file size (5MB)
            const int maxFileSize = 5 * 1024 * 1024;
            if (file.Length > maxFileSize)
            {
                return BadRequest("File size exceeds the maximum allowed (5MB)");
            }

            var userId = GetUserId();
            var user = await _db.Users.FindAsync(userId);
            if (user == null)
            {
                return NotFound("User not found");
            }

            // Create uploads directory if it doesn't exist
            var uploadsFolder = Path.Combine(_environment.WebRootPath, "uploads", "profiles");
            Directory.CreateDirectory(uploadsFolder);

            // Generate a unique filename using GUID
            var fileExtension = Path.GetExtension(file.FileName);
            var fileName = $"{userId}{fileExtension}";
            var filePath = Path.Combine(uploadsFolder, fileName);

            // Save the file
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Update user profile picture URL
            user.ProfilePictureUrl = $"/uploads/profiles/{fileName}";
            await _db.SaveChangesAsync();

            return Ok(new { ProfilePictureUrl = user.ProfilePictureUrl });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading profile picture");
            return StatusCode(500, "An error occurred while uploading your profile picture");
        }
    }
}