using FinalProject.Application.Dto.Fine;
using FinalProject.Domain;

namespace FinalProject.Application.Interfaces
{
    public interface IFineService
    {
        Task<IEnumerable<FineDetailsDto>> GetAllFinesAsync();
        Task<FineDetailsDto> GetFineByIdAsync(int fineId);
        Task AddFineForMemberAsync(int memberId, CreateFineDto createDto);
        Task UpdateFineByIdAsync(UpdateFineDto updateDto);
       
        //Task UpdateFineForMemberAsync(int memberId, UpdateFineDto updateDto);
        //Task<IEnumerable<FineDetailsDto>> GetFinesByMemberNameAsync(string name);
       
        
        Task<IEnumerable<FineDetailsDto>> GetFinesForMemberAsync(int memberId);
        Task DeleteFineByIdAsync(int fineId);


        // New method to detect and apply overdue fines
        Task DetectAndApplyOverdueFinesAsync();

        // Add method for paying fines
        Task PayFineAsync(PayFineDto payFineDto);
    }
}
