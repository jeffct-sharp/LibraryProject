using FinalProject.Application.Dto.Member;
using FinalProject.Domain;

namespace FinalProject.Application.Interfaces
{
    public interface IMemberRepository
    {
        Task<IEnumerable<Member>> GetAllMembersAsync();
        Task<Member> GetMemberByIdAsync(int memberId);
        Task AddMemberAsync(Member member);
        Task UpdateMemberAsync(Member member);
        Task DeleteMemberAsync(int memberId);
        Task<IEnumerable<Fine>> GetOutstandingFinesForMemberAsync(int memberId);
        Task<IEnumerable<BorrowingTransaction>> GetBorrowingsForMemberAsync(int memberId);

        // Additional methods for membership management
        Task<IEnumerable<Fine>> GetUnpaidFinesOlderThan30DaysAsync(int memberId);
        Task<bool> HasBorrowedBooksInLastYearAsync(int memberId);

        // New: Get member by email
        Task<Member> GetMemberByEmailAsync(string email);

        Task<Member> GetMemberByNameAsync(string name);

    }
}
