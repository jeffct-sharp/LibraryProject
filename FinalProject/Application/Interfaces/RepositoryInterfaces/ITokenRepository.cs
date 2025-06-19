using Microsoft.AspNetCore.Identity;

namespace FinalProject.Application.Interfaces
{
    public interface ITokenRepository
    {
        Task StoreTokenAsync(string userId, string token);
        Task<string> GetTokenAsync(string userId);
        Task DeleteTokenAsync(string userId);
        string CreateJwtToken(IdentityUser user, List<string> roles);
    }
}
