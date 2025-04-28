using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace ChatApp.API.Hubs
{
    [Authorize]
    public class ChatHub : Hub
    {
        // This dictionary will hold the connection IDs of users
        private static readonly Dictionary<Guid, string> _userConnections = new();
        
        public override async Task OnConnectedAsync()
        {
            var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim != null)
            {
                var userId = Guid.Parse(userIdClaim.Value);
                // Store the connection ID for the user, locking to prevent
                lock (_userConnections)
                    _userConnections[userId] = Context.ConnectionId;
            }
            await base.OnConnectedAsync();
        }
        
        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim != null)
            {
                var userId = Guid.Parse(userIdClaim.Value);
                // Remove the connection ID for the user, locking to prevent
                lock (_userConnections)
                    _userConnections.Remove(userId);
            }
            await base.OnDisconnectedAsync(exception);
        }
        public async Task SendPublicMessage(string message)
        {
            var username = Context.User?.Identity?.Name ?? "Anonymous";
            
            await Clients.All.SendAsync("ReceiveMessage", username, message);
        }

        public async Task SendPrivateMessage(Guid recipientId, string message)
        {
            var senderUsername = Context.User?.Identity?.Name ?? "Anonymous";
            
            // Check if the recipient is connected
            if (_userConnections.TryGetValue(recipientId, out var recipientConnectionId))
            {
                // Send the message to the recipient
                await Clients.Client(recipientConnectionId).SendAsync("ReceivePrivateMessage", senderUsername, message);
            }
            else
            {
                // Handle the case where the recipient is not connected (e.g., store the message for later delivery)
                await Clients.Caller.SendAsync("UserNotConnected", "Recipient is not connected.");
            }
        }
    }
}
