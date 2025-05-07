using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ChatApp.API.Models;

public class Message
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public string Content { get; set; } = string.Empty;
    
    [Required]
    public Guid SenderId { get; set; }
    
    [ForeignKey("SenderId")]
    public User Sender { get; set; }
    
    // For private messages, this will contain the recipient's ID
    // For group messages, this will be Guid.Empty
    public Guid ReceiverId { get; set; }
    
    // For group messages, this will contain the group ID
    // For private messages, this will be null/Guid.Empty
    public Guid? GroupId { get; set; }
    
    [ForeignKey("GroupId")]
    public Group Group { get; set; }
    
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
    
    // Flag to indicate if this is a private message
    public bool IsPrivate { get; set; }
    
    // Helper property to determine message type
    [NotMapped]
    public bool IsGroupMessage => GroupId.HasValue && GroupId.Value != Guid.Empty;
}