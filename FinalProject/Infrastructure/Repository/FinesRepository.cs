using FinalProject.Application.Interfaces;
using FinalProject.Infrastructure.DbContexts;
using FinalProject.Domain;
using Microsoft.EntityFrameworkCore;

namespace FinalProject.Infrastructure.Repository
{
    public class FinesRepository : IFineRepository
    {
        private readonly ApplicationDbContext _context;

        public FinesRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Fine>> GetAllFinesAsync()
        {
            return await _context.Fines.ToListAsync();
        }

        public async Task<Fine> GetFineByIdAsync(int fineId)
        {
            return await _context.Fines.FindAsync(fineId);
        }

        public async Task AddFineAsync(Fine fine)
        {
            await _context.Fines.AddAsync(fine);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateFineAsync(Fine fine)
        {
            _context.Fines.Update(fine);
            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<Fine>> GetFinesForMemberAsync(int memberId)
        {
            return await _context.Fines.Where(f => f.MemberID == memberId).ToListAsync();
        }

        public async Task DeleteFineAsync(int fineId)
        {
            var fine = await _context.Fines.FindAsync(fineId);
            if (fine != null)
            {
                _context.Fines.Remove(fine);
                await _context.SaveChangesAsync();
            }
        }


        public async Task<IEnumerable<Fine>> GetOutstandingFinesForMemberAsync(int memberId)
        {
            return await _context.Fines
                .Where(f => f.MemberID == memberId && f.Status == "Pending")
                .ToListAsync();
        }

        public async Task<IEnumerable<Fine>> GetFinesByMemberNameAsync(string name)
        {
            return await _context.Fines
                .Include(f => f.Member)
                .Where(f => f.Member != null && f.Member.Name.Contains(name, StringComparison.OrdinalIgnoreCase))
                .ToListAsync();

        }
    }

}