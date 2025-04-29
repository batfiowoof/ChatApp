using System.Text.Json;
using ChatApp.API.Hubs;
using ChatApp.Infrastructure.Data;
using ChatApp.Shared.Enums;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace ChatApp.Infrastructure.Notification;

public class NotificationService : INotificationService
{
    private readonly ApplicationDbContext _db;
    private readonly IHubContext<ChatHub> _hubContext;
    private readonly ILogger<NotificationService> _logger;
    
    public NotificationService(ApplicationDbContext db, IHubContext<ChatHub> hubContext, ILogger<NotificationService> logger)
    {
        _db = db;
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task CreateAsync(Guid receiverId, NotificationType type, object payload)
    {
        try
        {
            // Ensure we have a proper typed payload
            var typedPayload = new
            {
                type = type.ToString(),
                data = payload
            };
            
            var n = new API.Models.Notification
            {
                ReceiverId = receiverId,
                Type = type,
                PayloadJson = JsonSerializer.Serialize(typedPayload)
            };
            
            _db.Notifications.Add(n);
            await _db.SaveChangesAsync();

            if (ChatHub.TryGetConnection(receiverId, out var connection))
            {
                _logger.LogInformation("Sending new notification to connected user {userId}", receiverId);
                await _hubContext.Clients.Client(connection).SendAsync("NewNotification", n.Id, typedPayload, n.SentAt);
            }
            else
            {
                _logger.LogInformation("User {userId} is not connected, notification saved but not delivered in real-time", receiverId);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating notification for user {receiverId}", receiverId);
            throw;
        }
    }
    
    public async Task MarkAsReadAsync(int notificationId, Guid userId)
    {
        var notification = await _db.Notifications
            .FirstOrDefaultAsync(n => n.Id == notificationId && n.ReceiverId == userId);
        
        if (notification == null)
            throw new InvalidOperationException("Notification not found or does not belong to the user");

        notification.IsRead = true;
        await _db.SaveChangesAsync();
        
        _logger.LogInformation("Marked notification {id} as read for user {userId}", notificationId, userId);
    }
    
    public async Task<IEnumerable<API.Models.Notification>> GetForUserAsync(Guid userId)
    {
        _logger.LogInformation("Fetching notifications for user {userId}", userId);
        
        var notifications = await _db.Notifications
            .Where(n => n.ReceiverId == userId)
            .OrderByDescending(n => n.SentAt)
            .ToListAsync();
            
        _logger.LogInformation("Found {count} notifications for user {userId}", notifications.Count, userId);
        
        return notifications;
    }
}