using Microsoft.AspNetCore.Identity;
using FinalProject.Application.Dto.Member;
using FinalProject.Application.Interfaces;
using FinalProject.Domain;
using FinalProject.Infrastructure.DbContexts;
using Microsoft.EntityFrameworkCore;

namespace FinalProject.Application.Services
{
    public class AuthService : IAuthService
    {
        private readonly UserManager<IdentityUser> _userManager;
        private readonly ITokenRepository _tokenRepository;
        private readonly IServiceProvider _serviceProvider;

        public AuthService(UserManager<IdentityUser> userManager, ITokenRepository tokenRepository, IServiceProvider serviceProvider)
        {
            _userManager = userManager;
            _tokenRepository = tokenRepository;
            _serviceProvider = serviceProvider;
        }

        public async Task<TokenResponseDto> RegisterAsync(RegisterMemberDto dto)
        {
            // Create the IdentityUser for authentication
            var user = new IdentityUser
            {
                UserName = dto.Email,
                Email = dto.Email
            };

            var result = await _userManager.CreateAsync(user, dto.Password);
            if (!result.Succeeded)
                throw new Exception(string.Join(", ", result.Errors.Select(e => e.Description)));

            // Add the user to the "User" role
            await _userManager.AddToRoleAsync(user, "User");

            // Create the Member instance for application-specific data
            var member = new Member
            {
                Name = dto.Name,
                Email = dto.Email,
                Phone = dto.Phone,
                Address = dto.Address,
                MembershipStatus = "Active"
            };

            // Save the Member instance to the database
            using (var scope = _serviceProvider.CreateScope())
            {
                var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                dbContext.Members.Add(member);
                await dbContext.SaveChangesAsync();
            }

            // Generate a JWT token for the user
            var roles = await _userManager.GetRolesAsync(user);
            var token = _tokenRepository.CreateJwtToken(user, roles.ToList());

            return new TokenResponseDto
            {
                Email = user.Email,
                Roles = roles.ToList(),
                Token = token
            };
        }

        public async Task<TokenResponseDto> LoginAsync(LoginMemberDto dto)
        {
            var user = await _userManager.FindByEmailAsync(dto.Email);
            if (user == null || !await _userManager.CheckPasswordAsync(user, dto.Password))
                throw new Exception("Invalid credentials");

            var roles = await _userManager.GetRolesAsync(user);
            var token = _tokenRepository.CreateJwtToken(user, roles.ToList());

            return new TokenResponseDto
            {
                Email = user.Email,
                Roles = roles.ToList(),
                Token = token
            };
        }


        public async Task LogoutAsync(string userId)
        {
            await _tokenRepository.DeleteTokenAsync(userId);
        }
    }
}
