namespace ChatApp.API.Models;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Username { get; set; } = string.Empty;
    public byte[] PasswordHash { get; set; } = Array.Empty<byte>();
    public byte[] PasswordSalt { get; set; } = Array.Empty<byte>();
    public string ProfilePictureUrl { get; set; } = "/images/default-avatar.png";
    public string Bio { get; set; } = string.Empty;
    public bool IsOnline { get; set; } = false;
    public DateTime LastActive { get; set; } = DateTime.UtcNow;
}