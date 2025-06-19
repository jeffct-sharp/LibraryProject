using Microsoft.AspNetCore.Mvc;
using FinalProject.Application.Interfaces;
using FinalProject.Application.Dto.Member;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace FinalProject.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        // POST: {apibaseurl}/api/auth/login
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginMemberDto request)
        {
            try
            {
                var tokenResponse = await _authService.LoginAsync(request);
                return Ok(tokenResponse);
            }
            catch (Exception ex)
            {
                ModelState.AddModelError("", ex.Message);
                return ValidationProblem(ModelState);
            }
        }

        // POST: {apibaseurl}/api/auth/register
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterMemberDto request)
        {
            try
            {
                var tokenResponse = await _authService.RegisterAsync(request);
                return Ok(new { Message = "Registration successful", Token = tokenResponse.Token });
            }
            catch (Exception ex)
            {
                ModelState.AddModelError("", ex.Message);
                return ValidationProblem(ModelState);
            }
        }


        // POST: {apibaseurl}/api/auth/logout
        [HttpPost("logout")]
        [Authorize(Roles = "Admin,User,Librarian")] // Only authenticated users with these roles can logout
        public async Task<IActionResult> Logout()
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                    return Unauthorized(new { Message = "User is not authenticated" });

                await _authService.LogoutAsync(userId);
                return Ok(new { Message = "Logout successful" });
            }
            catch (Exception ex)
            {
                ModelState.AddModelError("", ex.Message);
                return ValidationProblem(ModelState);
            }
        }


    }
}
