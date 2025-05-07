using System.Security.Claims;
using ChatApp.API.Models;
using ChatApp.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ChatApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GroupController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<GroupController> _logger;

    public GroupController(ApplicationDbContext db, ILogger<GroupController> logger)
    {
        _db = db;
        _logger = logger;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string GetUsername() => User.FindFirstValue(ClaimTypes.Name)!;

    // GET: api/Group
    [HttpGet]
    public async Task<IActionResult> GetGroups()
    {
        var userId = GetUserId();
        
        var groups = await _db.Groups
            .Include(g => g.Members)
            .Select(g => new
            {
                Id = g.Id.ToString(),
                Name = g.Name,
                Description = g.Description,
                ImageUrl = g.ImageUrl,
                CreatorId = g.CreatorId.ToString(),
                CreatorName = _db.Users.Where(u => u.Id == g.CreatorId).Select(u => u.Username).FirstOrDefault(),
                MemberCount = g.Members.Count,
                IsMember = g.Members.Any(m => m.UserId == userId),
                // Fix: Correctly handle the role query by using SingleOrDefault instead of Where + Select + FirstOrDefault
                UserRole = g.Members.Where(m => m.UserId == userId).Select(m => (int?)m.Role).SingleOrDefault() ?? -1,
                CreatedAt = g.CreatedAt
            })
            .OrderByDescending(g => g.IsMember)
            .ThenByDescending(g => g.CreatedAt)
            .ToListAsync();
            
        return Ok(groups);
    }

    // GET: api/Group/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetGroup(string id)
    {
        if (!Guid.TryParse(id, out var groupId))
        {
            return BadRequest("Invalid group ID format");
        }
        
        var userId = GetUserId();
        
        var group = await _db.Groups
            .Include(g => g.Members)
            .Where(g => g.Id == groupId)
            .Select(g => new
            {
                Id = g.Id.ToString(),
                Name = g.Name,
                Description = g.Description,
                ImageUrl = g.ImageUrl,
                CreatorId = g.CreatorId.ToString(),
                CreatorName = _db.Users.Where(u => u.Id == g.CreatorId).Select(u => u.Username).FirstOrDefault(),
                MemberCount = g.Members.Count,
                IsMember = g.Members.Any(m => m.UserId == userId),
                // Fix: Use the same approach as in GetGroups
                UserRole = g.Members.Where(m => m.UserId == userId).Select(m => (int?)m.Role).SingleOrDefault() ?? -1,
                CreatedAt = g.CreatedAt
            })
            .FirstOrDefaultAsync();
            
        if (group == null)
        {
            return NotFound("Group not found");
        }
        
        return Ok(group);
    }

    // POST: api/Group
    [HttpPost]
    public async Task<IActionResult> CreateGroup([FromBody] CreateGroupRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest("Group name is required");
        }
        
        var userId = GetUserId();
        var username = GetUsername();
        
        // Create the group
        var group = new Group
        {
            Name = request.Name,
            Description = request.Description,
            CreatorId = userId,
            CreatedAt = DateTime.UtcNow
        };
        
        _db.Groups.Add(group);
        await _db.SaveChangesAsync();
        
        // Add creator as member with role Owner (2)
        var membership = new GroupMember
        {
            GroupId = group.Id,
            UserId = userId,
            Role = 2, // Owner
            JoinedAt = DateTime.UtcNow
        };
        
        _db.GroupMembers.Add(membership);
        await _db.SaveChangesAsync();
        
        _logger.LogInformation("Group {groupId} created by {username}", group.Id, username);
        
        return Ok(new
        {
            Id = group.Id.ToString(),
            Name = group.Name,
            Description = group.Description,
            CreatorId = group.CreatorId.ToString()
        });
    }

    // PUT: api/Group/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateGroup(string id, [FromBody] UpdateGroupRequest request)
    {
        if (!Guid.TryParse(id, out var groupId))
        {
            return BadRequest("Invalid group ID format");
        }
        
        var userId = GetUserId();
        
        // Check if group exists and user is admin/owner
        var membership = await _db.GroupMembers
            .FirstOrDefaultAsync(gm => gm.GroupId == groupId && gm.UserId == userId);
            
        if (membership == null || membership.Role < 1) // Not admin or owner
        {
            return Forbid("Only admins/owners can update the group");
        }
        
        var group = await _db.Groups.FindAsync(groupId);
        if (group == null)
        {
            return NotFound("Group not found");
        }
        
        // Update properties if provided
        if (!string.IsNullOrWhiteSpace(request.Name))
        {
            group.Name = request.Name;
        }
        
        if (request.Description != null) // Allow empty description
        {
            group.Description = request.Description;
        }
        
        await _db.SaveChangesAsync();
        
        return Ok(new
        {
            Id = group.Id.ToString(),
            Name = group.Name,
            Description = group.Description
        });
    }

    // DELETE: api/Group/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteGroup(string id)
    {
        if (!Guid.TryParse(id, out var groupId))
        {
            return BadRequest("Invalid group ID format");
        }
        
        var userId = GetUserId();
        
        // Check if group exists and user is owner
        var membership = await _db.GroupMembers
            .FirstOrDefaultAsync(gm => gm.GroupId == groupId && gm.UserId == userId);
            
        if (membership == null || membership.Role != 2) // Not owner
        {
            return Forbid("Only the owner can delete the group");
        }
        
        var group = await _db.Groups.FindAsync(groupId);
        if (group == null)
        {
            return NotFound("Group not found");
        }
        
        _db.Groups.Remove(group);
        await _db.SaveChangesAsync();
        
        return NoContent();
    }

    // GET: api/Group/{id}/members
    [HttpGet("{id}/members")]
    public async Task<IActionResult> GetGroupMembers(string id)
    {
        if (!Guid.TryParse(id, out var groupId))
        {
            return BadRequest("Invalid group ID format");
        }
        
        var userId = GetUserId();
        
        // Check if user is a member
        var isMember = await _db.GroupMembers
            .AnyAsync(gm => gm.GroupId == groupId && gm.UserId == userId);
            
        if (!isMember)
        {
            return Forbid("You must be a member to view the member list");
        }
        
        var members = await _db.GroupMembers
            .Include(gm => gm.User)
            .Where(gm => gm.GroupId == groupId)
            .Select(gm => new
            {
                Id = gm.UserId.ToString(),
                Username = gm.User.Username,
                ProfilePictureUrl = gm.User.ProfilePictureUrl,
                Role = (int)gm.Role,
                JoinedAt = gm.JoinedAt
            })
            .OrderByDescending(m => m.Role) // List owners and admins first
            .ThenBy(m => m.Username)
            .ToListAsync();
            
        return Ok(members);
    }
    
    // GET: api/Group/{id}/messages
    [HttpGet("{id}/messages")]
    public async Task<IActionResult> GetGroupMessages(string id)
    {
        if (!Guid.TryParse(id, out var groupId))
        {
            return BadRequest("Invalid group ID format");
        }
        
        var userId = GetUserId();
        
        // Check if user is a member
        var isMember = await _db.GroupMembers
            .AnyAsync(gm => gm.GroupId == groupId && gm.UserId == userId);
            
        if (!isMember)
        {
            return Forbid("You must be a member to view messages");
        }
        
        var messages = await _db.Messages
            .Include(m => m.Sender)
            .Where(m => m.GroupId == groupId)
            .OrderBy(m => m.SentAt)
            .Select(m => new
            {
                Id = m.Id.ToString(),
                Content = m.Content,
                SenderId = m.SenderId.ToString(),
                SenderName = m.Sender.Username,
                SentAt = m.SentAt,
                IsFromCurrentUser = m.SenderId == userId
            })
            .ToListAsync();
            
        return Ok(messages);
    }
    
    // PUT: api/Group/{id}/members/{userId}/role
    [HttpPut("{id}/members/{userId}/role")]
    public async Task<IActionResult> UpdateMemberRole(string id, string userId, [FromBody] UpdateRoleRequest request)
    {
        if (!Guid.TryParse(id, out var groupId) || !Guid.TryParse(userId, out var memberUserId))
        {
            return BadRequest("Invalid ID format");
        }
        
        var currentUserId = GetUserId();
        
        // Check if current user is admin/owner
        var currentUserMembership = await _db.GroupMembers
            .FirstOrDefaultAsync(gm => gm.GroupId == groupId && gm.UserId == currentUserId);
            
        if (currentUserMembership == null || currentUserMembership.Role < 1) // Not admin or owner
        {
            return Forbid("Only admins/owners can modify roles");
        }
        
        // Owner can update anyone, admin can only update regular members
        var targetMembership = await _db.GroupMembers
            .FirstOrDefaultAsync(gm => gm.GroupId == groupId && gm.UserId == memberUserId);
            
        if (targetMembership == null)
        {
            return NotFound("User is not a member of this group");
        }
        
        // Admin can't modify other admins or owner
        if (currentUserMembership.Role == 1 && targetMembership.Role > 0)
        {
            return Forbid("Admins can only modify regular members' roles");
        }
        
        // Owner can't be demoted by anyone but themselves
        if (targetMembership.Role == 2 && currentUserId != memberUserId)
        {
            return Forbid("Only the owner can transfer ownership");
        }
        
        // Cannot have more than one owner
        if (request.Role == 2 && currentUserMembership.Role == 2)
        {
            // Transfer ownership
            currentUserMembership.Role = 1; // Demote current owner to admin
            await _db.SaveChangesAsync();
        }
        
        // Update the role
        targetMembership.Role = request.Role;
        await _db.SaveChangesAsync();
        
        return Ok(new
        {
            UserId = targetMembership.UserId.ToString(),
            Role = (int)targetMembership.Role
        });
    }
}

public class CreateGroupRequest
{
    public string Name { get; set; } = "";
    public string? Description { get; set; }
}

public class UpdateGroupRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
}

public class UpdateRoleRequest
{
    public int Role { get; set; }
}