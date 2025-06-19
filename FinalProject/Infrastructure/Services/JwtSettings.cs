using FinalProject.Application.Interfaces;

namespace FinalProject.Infrastructure.Settings
{
    public class JwtSettings : IJwtSettings
    {
        public string Issuer { get; set; }
        public string Audience { get; set; }
        public string Key { get; set; }
    }
}