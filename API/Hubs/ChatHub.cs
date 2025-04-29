using System.Security.Claims;
using ChatApp.API.Models;
using ChatApp.Infrastructure.Data;
using ChatApp.Infrastructure.Notification;
using ChatApp.Shared.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace ChatApp.API.Hubs
{
    [Authorize]
    public class ChatHub : Hub
    {
        // This dictionary will hold the connection IDs of users
        private static readonly Dictionary<Guid, string> _userConnections = new();
        private static readonly Dictionary<Guid, string> _usernamesById = new();
        private readonly ApplicationDbContext _db;
        private readonly INotificationService _notificationService;
        private readonly ILogger<ChatHub> _logger;
        
        public ChatHub(ApplicationDbContext db, INotificationService notificationService, ILogger<ChatHub> logger)
        {
            _db = db;
            _notificationService = notificationService;
            _logger = logger;
        }
        
        public override async Task OnConnectedAsync()
        {
            var userId = GetUserId();
            var username = GetUsername();

            lock (_userConnections)
            {
                _userConnections[userId] = Context.ConnectionId;
                _usernamesById[userId] = username;
            }

            await UpdateUserList();
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = GetUserId();

            lock (_userConnections)
            {
                _userConnections.Remove(userId);
                _usernamesById.Remove(userId);
            }

            await UpdateUserList();
            await base.OnDisconnectedAsync(exception);
        }

        public async Task SendPublicMessage(string message)
        {
            var username = GetUsername();
            await Clients.All.SendAsync("ReceiveMessage", username, message);
        }

        public async Task SendPrivateMessage(Guid receiverId, string message)
        {
            var senderId = GetUserId();
            var senderUsername = GetUsername();

            if (_userConnections.TryGetValue(receiverId, out var receiverConnectionId))
            {
                await Clients.Client(receiverConnectionId).SendAsync("ReceivePrivateMessage", senderUsername, message);
            }
            else
            {
                await Clients.Caller.SendAsync("UserNotConnected", "Recipient is not connected.");
            }

            // Винаги запазваме съобщението в базата, независимо дали е свързан
            var newMessage = new Message
            {
                SenderId = senderId,
                ReceiverId = receiverId,
                Content = message,
                SentAt = DateTime.UtcNow
            };

            _db.Messages.Add(newMessage);
            await _db.SaveChangesAsync();
            
            // Create a notification for the recipient
            try 
            {
                var notificationPayload = new 
                {
                    senderId = senderId.ToString(),
                    senderName = senderUsername,
                    messagePreview = message.Length > 50 ? message.Substring(0, 47) + "..." : message
                };
                
                await _notificationService.CreateAsync(
                    receiverId, 
                    NotificationType.PrivateMessage, 
                    notificationPayload
                );
                
                _logger.LogInformation("Created notification for private message from {sender} to {receiver}", 
                    senderId, receiverId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create notification for private message");
                // Don't rethrow - we don't want to fail the message send if notification creation fails
            }
        }

        public static bool TryGetConnection(Guid userId, out string connectionId)
        {
            return _userConnections.TryGetValue(userId, out connectionId);
        }
        
        private async Task UpdateUserList()
        {
            var users = _usernamesById.Select(pair => new
            {
                UserId = pair.Key,
                Username = pair.Value
            }).ToList();

            await Clients.All.SendAsync("UpdateUserList", users);
        }

        private Guid GetUserId()
        {
            var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
            {
                throw new HubException("User ID claim not found.");
            }
            return Guid.Parse(userIdClaim.Value);
        }

        private string GetUsername()
        {
            return Context.User?.Identity?.Name ?? "Anonymous";
        }
    }
}
