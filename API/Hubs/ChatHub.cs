using System.Security.Claims;
using ChatApp.API.Models;
using ChatApp.Infrastructure.Data;
using ChatApp.Infrastructure.Notification;
using ChatApp.Shared.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

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

            // Send missed messages to the user who just connected
            await SendMissedMessagesToUser(userId);
            
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
            var senderId = GetUserId();
            
            await Clients.All.SendAsync("ReceiveMessage", username, message);
            
            // Save the public message to the database
            var newMessage = new Message
            {
                SenderId = senderId,
                ReceiverId = Guid.Empty, // Use Guid.Empty to indicate a public message
                Content = message,
                SentAt = DateTime.UtcNow
            };

            _db.Messages.Add(newMessage);
            await _db.SaveChangesAsync();
            
            _logger.LogInformation("Public message saved from user {username}", username);
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
                await Clients.Caller.SendAsync("UserNotConnected", "Recipient is not connected but will still receive your message.");
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
            // Get all users from database
            var allUsers = await _db.Users.Select(u => new 
            {
                UserId = u.Id,
                Username = u.Username
            }).ToListAsync();

            // Create a list of user objects with online status
            var userList = allUsers.Select(u => new
            {
                UserId = u.UserId,
                Username = u.Username,
                IsOnline = _userConnections.ContainsKey(u.UserId)
            }).ToList();

            _logger.LogInformation("Sending updated user list with {total} users ({online} online)", 
                userList.Count, userList.Count(u => u.IsOnline));

            await Clients.All.SendAsync("UpdateUserList", userList);
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

        /// <summary>
        /// Sends missed messages to a user who has just connected
        /// </summary>
        private async Task SendMissedMessagesToUser(Guid userId)
        {
            try
            {
                // Fetch unread notifications for this user
                var unreadNotifications = await _db.Notifications
                    .Where(n => n.ReceiverId == userId && !n.IsRead)
                    .OrderBy(n => n.SentAt)
                    .ToListAsync();
                
                if (unreadNotifications.Any())
                {
                    _logger.LogInformation("User {userId} has {count} unread notifications on connect", 
                        userId, unreadNotifications.Count);
                    
                    // Create a summary notification for missed messages
                    var missedPrivateMessages = unreadNotifications
                        .Count(n => n.Type == NotificationType.PrivateMessage);
                    
                    if (missedPrivateMessages > 0)
                    {
                        // Send a special notification about missed messages
                        var summaryPayload = new 
                        {
                            missedMessageCount = missedPrivateMessages,
                            summaryText = $"You have {missedPrivateMessages} unread message{(missedPrivateMessages > 1 ? "s" : "")} while you were offline"
                        };
                        
                        // Create and send a notification about missed messages
                        await _notificationService.CreateAsync(
                            userId,
                            NotificationType.MissedMessages,
                            summaryPayload
                        );
                        
                        _logger.LogInformation("Sent missed messages summary to user {userId}", userId);
                    }
                }
                else
                {
                    _logger.LogInformation("User {userId} has no unread notifications on connect", userId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending missed messages to user {userId}", userId);
            }
        }
    }
}
