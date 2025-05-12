using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ChatApp.API.Models;

public class Group
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    
    public string Description { get; set; } = string.Empty;
    
    public string ImageUrl { get; set; } = "/images/default-group.png";
    
    [Required]
    public Guid CreatorId { get; set; }
    
    [ForeignKey("CreatorId")]
    public User Creator { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Determines if the group is private (invite-only) or public
    public bool IsPrivate { get; set; } = false;
    
    // Navigation property for group members
    public ICollection<GroupMember> Members { get; set; } = new List<GroupMember>();
}