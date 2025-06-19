using FinalProject.Domain;

namespace FinalProject.Application.Interfaces
{
    public interface IFineRepository
    {
        Task<IEnumerable<Fine>> GetAllFinesAsync();
        Task<Fine> GetFineByIdAsync(int fineId);
        Task AddFineAsync(Fine fine);
        Task UpdateFineAsync(Fine fine);
        Task<IEnumerable<Fine>> GetFinesForMemberAsync(int memberId);
        Task DeleteFineAsync(int fineId);

        Task<IEnumerable<Fine>> GetOutstandingFinesForMemberAsync(int memberId);
        Task<IEnumerable<Fine>> GetFinesByMemberNameAsync(string name);
    
    }
}
