namespace FinalProject.Application.Dto.Member
{
    public class TokenResponseDto
    {
        public string Email { get; set; }
        public List<string> Roles { get; set; } 
        public string Token { get; set; } 
    }
}
