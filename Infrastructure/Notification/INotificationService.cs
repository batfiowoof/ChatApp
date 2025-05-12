using ChatApp.Shared.Enums;

namespace ChatApp.Infrastructure.Notification;

public interface INotificationService
{
    Task CreateAsync(Guid receiverId, NotificationType type, object payload);
    Task MarkAsReadAsync(int notificationId, Guid userId);
    Task<IEnumerable<API.Models.Notification>> GetForUserAsync(Guid userId);
    Task<IEnumerable<API.Models.Notification>> GetUnreadForUserAsync(Guid userId);
}