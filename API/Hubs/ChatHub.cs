using System.Security.Claims;
using ChatApp.API.Models;
using ChatApp.Infrastructure.Data;
using ChatApp.Infrastructure.Notification;
using ChatApp.Shared.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace ChatApp.API.Hubs;

[Authorize]
public class ChatHub : Hub
{
    private static readonly Dictionary<string, string> _userConnectionMap = new();
    private readonly ApplicationDbContext _db;
    private readonly INotificationService _notificationService;
    private readonly ILogger<ChatHub> _logger;

    public ChatHub(ApplicationDbContext db, INotificationService notificationService, ILogger<ChatHub> logger)
    {
        _db = db;
        _notificationService = notificationService;
        _logger = logger;
    }

    // Static method to check if a user is connected and get their connection ID
    public static bool TryGetConnection(Guid userId, out string connectionId)
    {
        return _userConnectionMap.TryGetValue(userId.ToString(), out connectionId);
    }

    // Get the current user ID from the JWT token claims
    private Guid GetUserId() => Guid.Parse(Context.User!.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string GetUserName() => Context.User!.FindFirstValue(ClaimTypes.Name)!;

    public override async Task OnConnectedAsync()
    {
        var userId = GetUserId();
        var username = GetUserName();

        // Add to connection mapping
        _userConnectionMap[userId.ToString()] = Context.ConnectionId;

        // Update user online status
        var user = await _db.Users.FindAsync(userId);
        if (user != null)
        {
            user.IsOnline = true;
            user.LastActive = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        // Send updated user list to all clients
        await UpdateUserList();

        await base.OnConnectedAsync();

        _logger.LogInformation("User {username} ({userId}) connected", username, userId);
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetUserId();
        var username = GetUserName();

        // Remove from connection mapping
        _userConnectionMap.Remove(userId.ToString());

        // Update user online status
        var user = await _db.Users.FindAsync(userId);
        if (user != null)
        {
            user.IsOnline = false;
            user.LastActive = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        // Send updated user list to all clients
        await UpdateUserList();

        await base.OnDisconnectedAsync(exception);

        _logger.LogInformation("User {username} ({userId}) disconnected", username, userId);
    }

    private async Task UpdateUserList()
    {
        var currentUserId = GetUserId();
        var users = await _db.Users
            .Select(u => new
            {
                UserId = u.Id,
                Username = u.Username,
                IsOnline = u.IsOnline,
                ProfilePictureUrl = u.ProfilePictureUrl,
                Bio = u.Bio
            })
            .ToListAsync();

        await Clients.All.SendAsync("UpdateUserList", users);
    }

    // PUBLIC MESSAGES
    public async Task SendPublicMessage(string message)
    {
        var userId = GetUserId();
        var username = GetUserName();

        // Store the message in the database
        var newMessage = new Message
        {
            SenderId = userId,
            Content = message,
            SentAt = DateTime.UtcNow,
            IsPrivate = false
        };

        _db.Messages.Add(newMessage);
        await _db.SaveChangesAsync();

        // Broadcast to all connected clients
        await Clients.All.SendAsync("ReceiveMessage", username, message);
    }

    // PRIVATE MESSAGES
    public async Task SendPrivateMessage(string receiverUserId, string message)
    {
        var senderId = GetUserId();
        var senderUsername = GetUserName();

        if (!Guid.TryParse(receiverUserId, out var receiverId))
        {
            await Clients.Caller.SendAsync("UserNotConnected", "Invalid user ID.");
            return;
        }

        // Check if receiver exists
        var receiver = await _db.Users.FindAsync(receiverId);
        if (receiver == null)
        {
            await Clients.Caller.SendAsync("UserNotConnected", "User does not exist.");
            return;
        }

        // Store the message
        var newMessage = new Message
        {
            SenderId = senderId,
            ReceiverId = receiverId,
            Content = message,
            SentAt = DateTime.UtcNow,
            IsPrivate = true
        };

        _db.Messages.Add(newMessage);
        await _db.SaveChangesAsync();

        // Send to receiver if connected
        if (_userConnectionMap.TryGetValue(receiverUserId, out var receiverConnectionId))
        {
            await Clients.Client(receiverConnectionId).SendAsync("ReceivePrivateMessage", senderUsername, message);
        }

        // Send notification to the receiver
        await _notificationService.CreateAsync(
            receiverId,
            NotificationType.PrivateMessage,
            new
            {
                senderId = senderId.ToString(),
                senderName = senderUsername,
                message
            });

        _logger.LogInformation("Private message sent from {senderUsername} to {receiverId}", senderUsername, receiverId);
    }

    // GROUP CHAT FUNCTIONS
    
    public async Task SendGroupMessage(string groupId, string message)
    {
        if (!Guid.TryParse(groupId, out var groupIdGuid))
        {
            await Clients.Caller.SendAsync("Error", "Invalid group ID");
            return;
        }

        var userId = GetUserId();
        var username = GetUserName();

        // Verify user is a member of the group
        var isMember = await _db.GroupMembers
            .AnyAsync(gm => gm.GroupId == groupIdGuid && gm.UserId == userId);

        if (!isMember)
        {
            await Clients.Caller.SendAsync("Error", "You are not a member of this group");
            return;
        }

        // Get group info
        var group = await _db.Groups.FindAsync(groupIdGuid);
        if (group == null)
        {
            await Clients.Caller.SendAsync("Error", "Group does not exist");
            return;
        }

        // Store the message
        var newMessage = new Message
        {
            SenderId = userId,
            GroupId = groupIdGuid,
            Content = message,
            SentAt = DateTime.UtcNow,
            IsPrivate = false
        };

        _db.Messages.Add(newMessage);
        await _db.SaveChangesAsync();

        // Get all group members except the sender
        var groupMembers = await _db.GroupMembers
            .Where(gm => gm.GroupId == groupIdGuid && gm.UserId != userId)
            .Select(gm => gm.UserId)
            .ToListAsync();

        // Send to all online group members (via SignalR group)
        await Clients.Group(groupId).SendAsync("ReceiveGroupMessage", groupId, group.Name, username, message);

        // Send notification to offline group members
        foreach (var memberId in groupMembers)
        {
            // Check if the user is online and in the group chat
            var memberConnectionId = _userConnectionMap.GetValueOrDefault(memberId.ToString());
            if (string.IsNullOrEmpty(memberConnectionId))
            {
                // User is offline, send notification
                await _notificationService.CreateAsync(
                    memberId,
                    NotificationType.GroupMessage,
                    new
                    {
                        senderId = userId.ToString(),
                        senderName = username,
                        groupId = groupId,
                        groupName = group.Name,
                        message
                    });
            }
        }

        _logger.LogInformation("Group message sent to group {groupId} by {username}", groupId, username);
    }

    public async Task JoinGroup(string groupId)
    {
        if (!Guid.TryParse(groupId, out var groupIdGuid))
        {
            await Clients.Caller.SendAsync("Error", "Invalid group ID");
            return;
        }

        var userId = GetUserId();
        var username = GetUserName();

        // Check if group exists
        var group = await _db.Groups.FindAsync(groupIdGuid);
        if (group == null)
        {
            await Clients.Caller.SendAsync("Error", "Group does not exist");
            return;
        }

        // Check if already a member
        var existingMembership = await _db.GroupMembers
            .FirstOrDefaultAsync(gm => gm.GroupId == groupIdGuid && gm.UserId == userId);

        if (existingMembership != null)
        {
            await Clients.Caller.SendAsync("Error", "Already a member of this group");
            return;
        }

        // Add to group
        var membership = new GroupMember
        {
            GroupId = groupIdGuid,
            UserId = userId,
            JoinedAt = DateTime.UtcNow,
            Role = 0 // Regular member
        };

        _db.GroupMembers.Add(membership);
        await _db.SaveChangesAsync();

        // Add to SignalR group
        await Groups.AddToGroupAsync(Context.ConnectionId, groupId);

        // Notify the client they've joined
        await Clients.Caller.SendAsync("JoinedGroup", new { GroupId = groupId, GroupName = group.Name });

        // Notify other group members
        await Clients.Group(groupId).SendAsync("GroupMemberJoined", groupId, group.Name, userId.ToString(), username);

        // Update group list for all users (to reflect new member count)
        await UpdateGroupList();

        _logger.LogInformation("User {username} joined group {groupId}", username, groupId);
    }

    public async Task LeaveGroup(string groupId)
    {
        if (!Guid.TryParse(groupId, out var groupIdGuid))
        {
            await Clients.Caller.SendAsync("Error", "Invalid group ID");
            return;
        }

        var userId = GetUserId();
        var username = GetUserName();

        // Check if member of the group
        var membership = await _db.GroupMembers
            .FirstOrDefaultAsync(gm => gm.GroupId == groupIdGuid && gm.UserId == userId);

        if (membership == null)
        {
            await Clients.Caller.SendAsync("Error", "Not a member of this group");
            return;
        }

        // Check if owner
        if (membership.Role == 2) // Owner
        {
            var memberCount = await _db.GroupMembers.CountAsync(gm => gm.GroupId == groupIdGuid);
            
            if (memberCount > 1)
            {
                await Clients.Caller.SendAsync("Error", "Cannot leave the group as owner. Transfer ownership first or delete the group.");
                return;
            }
            
            // Last member and owner, delete the group
            var group = await _db.Groups.FindAsync(groupIdGuid);
            if (group != null)
            {
                _db.Groups.Remove(group);
                await _db.SaveChangesAsync();
                
                // Remove from SignalR group
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupId);
                
                // Notify the client they've left
                await Clients.Caller.SendAsync("LeftGroup", groupId);
                
                // Notify all users that the group was deleted
                await Clients.All.SendAsync("GroupDeleted", groupId);
                
                // Update group list
                await UpdateGroupList();
                
                _logger.LogInformation("Group {groupId} deleted by last member {username}", groupId, username);
                return;
            }
        }

        // Regular leave
        _db.GroupMembers.Remove(membership);
        await _db.SaveChangesAsync();

        // Remove from SignalR group
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupId);

        // Get group name
        var groupName = await _db.Groups
            .Where(g => g.Id == groupIdGuid)
            .Select(g => g.Name)
            .FirstOrDefaultAsync() ?? "Unknown Group";

        // Notify the client they've left
        await Clients.Caller.SendAsync("LeftGroup", groupId);

        // Notify other group members
        await Clients.Group(groupId).SendAsync("GroupMemberLeft", groupId, groupName, userId.ToString(), username);

        // Update group list for all users (to reflect new member count)
        await UpdateGroupList();

        _logger.LogInformation("User {username} left group {groupId}", username, groupId);
    }

    public async Task DeleteGroup(string groupId)
    {
        if (!Guid.TryParse(groupId, out var groupIdGuid))
        {
            await Clients.Caller.SendAsync("Error", "Invalid group ID");
            return;
        }

        var userId = GetUserId();
        var username = GetUserName();

        // Check if owner
        var membership = await _db.GroupMembers
            .FirstOrDefaultAsync(gm => gm.GroupId == groupIdGuid && gm.UserId == userId);

        if (membership == null || membership.Role != 2) // Not owner
        {
            await Clients.Caller.SendAsync("Error", "Only the owner can delete the group");
            return;
        }

        // Delete the group
        var group = await _db.Groups.FindAsync(groupIdGuid);
        if (group == null)
        {
            await Clients.Caller.SendAsync("Error", "Group not found");
            return;
        }

        // Keep track of members to notify
        var members = await _db.GroupMembers
            .Where(gm => gm.GroupId == groupIdGuid)
            .Select(gm => new { gm.UserId, ConnectionId = _userConnectionMap.GetValueOrDefault(gm.UserId.ToString()) })
            .ToListAsync();

        _db.Groups.Remove(group);
        await _db.SaveChangesAsync();

        // Notify all group members
        foreach (var member in members)
        {
            // If online, remove from SignalR group
            if (!string.IsNullOrEmpty(member.ConnectionId))
            {
                await Groups.RemoveFromGroupAsync(member.ConnectionId, groupId);
            }
        }

        // Notify all clients that the group was deleted
        await Clients.All.SendAsync("GroupDeleted", groupId);

        // Update group list
        await UpdateGroupList();

        _logger.LogInformation("Group {groupId} deleted by {username}", groupId, username);
    }

    private async Task UpdateGroupList()
    {
        var userId = GetUserId();
        
        var groups = await _db.Groups
            .Select(g => new
            {
                Id = g.Id,
                Name = g.Name,
                Description = g.Description,
                CreatorId = g.CreatorId,
                MemberCount = g.Members.Count,
                IsMember = g.Members.Any(m => m.UserId == userId)
            })
            .ToListAsync();
            
        await Clients.All.SendAsync("UpdateGroupList", groups);
    }
}
