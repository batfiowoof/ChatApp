using ChatApp.Shared.Enums;

namespace ChatApp.API.Models;

public class Notification
{
    public int Id { get; set; }
    public Guid ReceiverId { get; set; }
    public NotificationType Type { get; set; }
    public string PayloadJson { get; set; } = null;
    public bool IsRead { get; set; }
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
}