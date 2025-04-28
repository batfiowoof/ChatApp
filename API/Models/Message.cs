namespace ChatApp.API.Models;

public class Message
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Content { get; set; } = string.Empty;
    public Guid SenderId { get; set; }
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
}