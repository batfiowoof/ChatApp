using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Serialization;
using ChatApp.API.Models;
using ChatApp.Infrastructure.Data;
using ChatApp.Infrastructure.Notification;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ChatApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly INotificationService _notificationService;
    private readonly ILogger<NotificationController> _logger;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };
    
    public NotificationController(ApplicationDbContext db, INotificationService notificationService, ILogger<NotificationController> logger)
    {
        _db = db;
        _notificationService = notificationService;
        _logger = logger;
    }

    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier) ?? 
                          User.FindFirst("Id") ?? 
                          User.Claims.FirstOrDefault(c => c.Type.Contains("nameidentifier"));

        if (userIdClaim == null)
        {
            _logger.LogWarning("User ID claim not found! Available claims: {claims}", 
                string.Join(", ", User.Claims.Select(c => $"{c.Type}: {c.Value}")));
            throw new InvalidOperationException("User ID claim not found in token");
        }

        _logger.LogInformation("Found user ID claim: {type} with value {value}", userIdClaim.Type, userIdClaim.Value);
        return Guid.Parse(userIdClaim.Value);
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        try
        {
            var userId = GetUserId();
            _logger.LogInformation("Fetching notifications for user {userId}", userId);
            var notifications = await _notificationService.GetForUserAsync(userId);
            
            // Format the notifications to include the deserialized PayloadJson
            var formattedNotifications = notifications.Select<Notification, object>(n =>
            {
                try
                {
                    // Try to deserialize the PayloadJson into a dynamic object
                    var payload = string.IsNullOrEmpty(n.PayloadJson) 
                        ? null 
                        : JsonSerializer.Deserialize<object>(n.PayloadJson);
                    
                    // Return an anonymous object with all properties including the deserialized payload
                    return new
                    {
                        n.Id,
                        n.ReceiverId,
                        Type = n.Type.ToString(),
                        n.IsRead,
                        n.SentAt,
                        Payload = payload
                    };
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing notification JSON for notification {id}", n.Id);
                    // Return the notification with raw PayloadJson if deserialization fails
                    return new
                    {
                        n.Id,
                        n.ReceiverId,
                        Type = n.Type.ToString(),
                        n.IsRead,
                        n.SentAt,
                        PayloadJson = n.PayloadJson
                    };
                }
            });
            
            return Ok(formattedNotifications);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching notifications");
            return BadRequest(ex.Message);
        }
    }
    
    [HttpGet("unread")]
    public async Task<IActionResult> GetUnread()
    {
        try
        {
            var userId = GetUserId();
            var notifications = await _db.Notifications
                .Where(n => n.ReceiverId == userId && !n.IsRead)
                .OrderByDescending(n => n.SentAt)
                .ToListAsync();
            
            return Ok(notifications);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching unread notifications");
            return BadRequest(ex.Message);
        }
    }
    
    [HttpPut("{id}/read")]
    public async Task<IActionResult> MarkAsRead(int id)
    {
        try
        {
            var userId = GetUserId();
            await _notificationService.MarkAsReadAsync(id, userId);
            return Ok();
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Invalid operation when marking notification as read");
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking notification as read");
            return StatusCode(500, "An error occurred while processing your request");
        }
    }
    
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            var userId = GetUserId();
            
            var notification = await _db.Notifications
                .FirstOrDefaultAsync(n => n.Id == id && n.ReceiverId == userId);
                
            if (notification == null)
                return NotFound();
                
            _db.Notifications.Remove(notification);
            await _db.SaveChangesAsync();
            
            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting notification");
            return StatusCode(500, "An error occurred while processing your request");
        }
    }
    
    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        try
        {
            var userId = GetUserId();
            
            var notifications = await _db.Notifications
                .Where(n => n.ReceiverId == userId && !n.IsRead)
                .ToListAsync();
                
            foreach (var notification in notifications)
            {
                notification.IsRead = true;
            }
            
            await _db.SaveChangesAsync();
            
            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking all notifications as read");
            return StatusCode(500, "An error occurred while processing your request");
        }
    }
}