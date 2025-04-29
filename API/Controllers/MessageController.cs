using System.Security.Claims;
using ChatApp.API.DTO;
using ChatApp.API.Models;
using ChatApp.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ChatApp.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class MessageController : ControllerBase
    {
        private readonly ApplicationDbContext _dbContext;

        public MessageController(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        [HttpGet("history/{userId:guid}")]
        public async Task<IActionResult> GetMessageHistory(Guid userId)
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == Guid.Empty)
            {
                return Unauthorized();
            }

            // Fetch messages between the current user and the specified user
            var messages = await _dbContext.Messages
                .Where(m => 
                    // Messages sent by current user to selected user
                    (m.SenderId == currentUserId && m.ReceiverId == userId) ||
                    // Messages received by current user from selected user
                    (m.SenderId == userId && m.ReceiverId == currentUserId))
                .OrderBy(m => m.SentAt)
                .ToListAsync();

            // Map to a DTO to prevent exposing any sensitive data
            var result = messages.Select(m => new
            {
                m.Id,
                m.Content,
                m.SentAt,
                SenderId = m.SenderId,
                ReceiverId = m.ReceiverId,
                IsFromCurrentUser = m.SenderId == currentUserId
            });

            return Ok(result);
        }

        [HttpGet("public")]
        public async Task<IActionResult> GetPublicMessages()
        {
            try
            {
                // Get all users to resolve sender names
                var users = await _dbContext.Users.ToDictionaryAsync(u => u.Id, u => u.Username);
                
                // Public messages are identified by Guid.Empty as the receiver ID
                var publicMessages = await _dbContext.Messages
                    .Where(m => m.ReceiverId == Guid.Empty)
                    .OrderBy(m => m.SentAt)
                    .ToListAsync();

                // Log the count of public messages found
                Console.WriteLine($"Found {publicMessages.Count} public messages");
                
                var result = publicMessages.Select(m => new
                {
                    m.Id,
                    m.Content,
                    m.SentAt,
                    SenderId = m.SenderId,
                    // Find the username of the sender
                    SenderName = users.ContainsKey(m.SenderId) ? users[m.SenderId] : "Unknown"
                }).ToList();

                return Ok(result);
            }
            catch (Exception ex)
            {
                // Log the exception
                Console.WriteLine($"Error retrieving public messages: {ex.Message}");
                return StatusCode(500, "An error occurred while retrieving public messages");
            }
        }

        private Guid GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return Guid.Empty;
            }
            return userId;
        }
    }
}