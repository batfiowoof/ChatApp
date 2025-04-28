namespace ChatApp.Infrastructure.Auth;

public interface IAuthService
{
    Task RegisterAsync(string username, string password);
    Task<string> LoginAsync(string username, string password);
}