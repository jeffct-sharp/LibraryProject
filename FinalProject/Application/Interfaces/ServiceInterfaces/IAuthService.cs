using FinalProject.Application.Dto.Member;

namespace FinalProject.Application.Interfaces
{
    public interface IAuthService
    {
        Task<TokenResponseDto> RegisterAsync(RegisterMemberDto dto);
        Task<TokenResponseDto> LoginAsync(LoginMemberDto dto);

        Task LogoutAsync(string userId);
    }
}
