using FinalProject.Application.Dto.Member;
using FinalProject.Domain;

namespace FinalProject.Application.Interfaces
{
    public interface IMemberService
    {
        Task<IEnumerable<MemberResponseDto>> GetAllMembersAsync();
        Task<MemberResponseDto> GetMemberByIdAsync(int memberId);
        Task RegisterMemberAsync(RegisterMemberDto createDto);
        Task UpdateMemberAsync(int memberId, UpdateMemberDto updateDto);
        Task DeleteMemberAsync(int memberId);
        Task<IEnumerable<BorrowingTransaction>> GetBorrowingsForMemberAsync(int memberId);
        Task<IEnumerable<Fine>> GetOutstandingFinesForMemberAsync(int memberId);

        // Membership management rules
        Task CheckAndUpdateMembershipStatusAsync();

        // New: Get member by email
        Task<MemberResponseDto> GetMemberByEmailAsync(string email);

        Task<MemberResponseDto> GetMemberByNameAsync(string name);

        Task<IEnumerable<MemberResponseDto>> SearchMembersAsync(SearchMemberDto searchMemberDto);

    }
}
