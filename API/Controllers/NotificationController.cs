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
                    // Try to deserialize the PayloadJson into a proper object
                    object payload = null;
                    
                    if (!string.IsNullOrEmpty(n.PayloadJson))
                    {
                        // First, try to deserialize as JsonDocument to handle both direct and nested payloads
                        using (var jsonDoc = JsonSerializer.Deserialize<JsonDocument>(n.PayloadJson))
                        {
                            JsonElement root = jsonDoc.RootElement;
                            
                            // Check if this is a typed payload with data property (from newer notifications)
                            if (root.TryGetProperty("data", out var dataElement)) 
                            {
                                // This is a nested payload, extract the data
                                var dataJson = dataElement.GetRawText();
                                payload = JsonSerializer.Deserialize<Dictionary<string, object>>(dataJson, JsonOptions);
                            }
                            else
                            {
                                // This is a direct payload from older notifications
                                payload = JsonSerializer.Deserialize<Dictionary<string, object>>(n.PayloadJson, JsonOptions);
                            }
                        }

                        // Log if we found the critical senderName property
                        if (payload is Dictionary<string, object> dictPayload && 
                            dictPayload.ContainsKey("senderName"))
                        {
                            _logger.LogInformation("Notification {id} has senderName: {name}", 
                                n.Id, dictPayload["senderName"]);
                        }
                    }
                    
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
                    _logger.LogError(ex, "Error processing notification JSON for notification {id}: {error}", 
                        n.Id, ex.Message);
                    
                    // Fallback - try to manually extract the senderName if possible
                    try 
                    {
                        if (!string.IsNullOrEmpty(n.PayloadJson))
                        {
                            using (var jsonDoc = JsonSerializer.Deserialize<JsonDocument>(n.PayloadJson))
                            {
                                var root = jsonDoc.RootElement;
                                var fallbackPayload = new Dictionary<string, object>();
                                
                                // Check for nested payload
                                JsonElement targetElement = root;
                                if (root.TryGetProperty("data", out var dataElement))
                                {
                                    targetElement = dataElement;
                                }
                                
                                // Extract critical fields
                                foreach (var prop in targetElement.EnumerateObject())
                                {
                                    if (prop.Name.Equals("senderName", StringComparison.OrdinalIgnoreCase) || 
                                        prop.Name.Equals("senderId", StringComparison.OrdinalIgnoreCase) ||
                                        prop.Name.Equals("messagePreview", StringComparison.OrdinalIgnoreCase))
                                    {
                                        fallbackPayload[prop.Name] = prop.Value.ToString();
                                    }
                                }
                                
                                if (fallbackPayload.Count > 0)
                                {
                                    return new
                                    {
                                        n.Id,
                                        n.ReceiverId,
                                        Type = n.Type.ToString(),
                                        n.IsRead,
                                        n.SentAt,
                                        Payload = fallbackPayload
                                    };
                                }
                            }
                        }
                    }
                    catch (Exception innerEx) 
                    {
                        _logger.LogError(innerEx, "Error in fallback JSON processing for notification {id}", n.Id);
                    }
                    
                    // Return the notification with raw PayloadJson if all deserialization fails
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
    
    [HttpDelete("delete-all")]
    public async Task<IActionResult> DeleteAll()
    {
        try
        {
            var userId = GetUserId();
            
            var notifications = await _db.Notifications
                .Where(n => n.ReceiverId == userId)
                .ToListAsync();
                
            if (notifications.Any())
            {
                _db.Notifications.RemoveRange(notifications);
                await _db.SaveChangesAsync();
                _logger.LogInformation("Deleted {count} notifications for user {userId}", notifications.Count, userId);
            }
            
            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting all notifications");
            return StatusCode(500, "An error occurred while processing your request");
        }
    }
}