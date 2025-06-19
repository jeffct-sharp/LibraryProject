namespace FinalProject.Application.Interfaces
{
    public interface IJwtSettings
    {
        string Issuer { get; set; }
        string Audience { get; set; }
        string Key { get; set; }
    }
}
