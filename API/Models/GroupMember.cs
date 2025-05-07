using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ChatApp.API.Models;

public class GroupMember
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid GroupId { get; set; }
    
    [ForeignKey("GroupId")]
    public Group Group { get; set; }
    
    [Required]
    public Guid UserId { get; set; }
    
    [ForeignKey("UserId")]
    public User User { get; set; }
    
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    
    // Role within the group - 0: Member, 1: Admin, 2: Owner
    public int Role { get; set; } = 0;
}