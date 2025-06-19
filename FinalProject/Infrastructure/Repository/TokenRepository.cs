using System.Collections.Concurrent;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using FinalProject.Application.Interfaces;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;

namespace FinalProject.Infrastructure.Repository
{
    public class TokenRepository : ITokenRepository
    {
        private readonly IJwtSettings _jwtSettings;
        private readonly ConcurrentDictionary<string, string> _tokenStore = new(); // In-memory token store

        public TokenRepository(IJwtSettings jwtSettings)
        {
            _jwtSettings = jwtSettings;
        }

        // Store token in memory (can be replaced with a database or distributed cache)
        public Task StoreTokenAsync(string userId, string token)
        {
            _tokenStore[userId] = token;
            return Task.CompletedTask;
        }

        // Retrieve token from memory
        public Task<string> GetTokenAsync(string userId)
        {
            _tokenStore.TryGetValue(userId, out var token);
            return Task.FromResult(token);
        }

        // Delete token from memory
        public Task DeleteTokenAsync(string userId)
        {
            _tokenStore.TryRemove(userId, out _);
            return Task.CompletedTask;
        }

        // Create a JWT token
        public string CreateJwtToken(IdentityUser user, List<string> roles)
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.NameIdentifier, user.Id)
            };

            claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.Key));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _jwtSettings.Issuer,
                audience: _jwtSettings.Audience,
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(60),
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
