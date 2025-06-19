using FinalProject.Application.Interfaces;
using FinalProject.Domain;
using FinalProject.Infrastructure.DbContexts;
using Microsoft.EntityFrameworkCore;

namespace FinalProject.Infrastructure.Repository
{
    public class MemberRepository : IMemberRepository
    {
        private readonly ApplicationDbContext _context;

        public MemberRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Member>> GetAllMembersAsync()
        {
            return await _context.Members.ToListAsync();
        }

        public async Task<Member> GetMemberByIdAsync(int memberId)
        {
            return await _context.Members.FindAsync(memberId);
        }

        public async Task<Member> GetMemberByEmailAsync(string email)
        {
            return await _context.Members.FirstOrDefaultAsync(m => m.Email == email);
        }

        public async Task<Member> GetMemberByNameAsync(string name)
        {
            return await _context.Members.FirstOrDefaultAsync(m => m.Name == name);
        }

        public async Task AddMemberAsync(Member member)
        {
            await _context.Members.AddAsync(member);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateMemberAsync(Member member)
        {
            _context.Members.Update(member);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteMemberAsync(int memberId)
        {
            var member = await _context.Members.FindAsync(memberId);
            if (member != null)
            {
                _context.Members.Remove(member);
                await _context.SaveChangesAsync();
            }


        }

        public async Task<IEnumerable<Fine>> GetOutstandingFinesForMemberAsync(int memberId)
        {
            return await _context.Fines
                .Where(f => f.MemberID == memberId && f.Status == "Pending")
                .ToListAsync();
        }

        public async Task<IEnumerable<BorrowingTransaction>> GetBorrowingsForMemberAsync(int memberId)
        {
            return await _context.BorrowingTransactions
                .Where(t => t.MemberID == memberId)
                .ToListAsync();
        }

        public async Task<IEnumerable<Fine>> GetUnpaidFinesOlderThan30DaysAsync(int memberId)
        {
            var thirtyDaysAgo = DateTime.Now.AddDays(-30);
            return await _context.Fines
                .Where(f => f.MemberID == memberId && f.Status == "Pending" && f.TransactionDate < thirtyDaysAgo)
                .ToListAsync();
        }

        public async Task<bool> HasBorrowedBooksInLastYearAsync(int memberId)
        {
            var oneYearAgo = DateTime.Now.AddYears(-1);
            return await _context.BorrowingTransactions
                .AnyAsync(t => t.MemberID == memberId && t.BorrowDate > oneYearAgo);
        }
    }
}
