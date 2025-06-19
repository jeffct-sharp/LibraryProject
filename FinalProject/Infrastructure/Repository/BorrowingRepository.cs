using FinalProject.Application.Interfaces;
using FinalProject.Infrastructure.DbContexts;
using FinalProject.Domain;
using Microsoft.EntityFrameworkCore;

namespace FinalProject.Infrastructure.Repository
{
    public class BorrowingTransactionRepository : IBorrowingTransactionRepository
    {
        private readonly ApplicationDbContext _context;

        public BorrowingTransactionRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<BorrowingTransaction>> GetAllTransactionsAsync()
        {
            return await _context.BorrowingTransactions.ToListAsync();
        }

        public async Task<BorrowingTransaction> GetTransactionByIdAsync(int transactionId)
        {
            return await _context.BorrowingTransactions.FindAsync(transactionId);
        }

        public async Task AddTransactionAsync(BorrowingTransaction transaction)
        {
            await _context.BorrowingTransactions.AddAsync(transaction);
            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<BorrowingTransaction>> GetOverdueBooksAsync()
        {
            return await _context.BorrowingTransactions
            .Where(t => t.BorrowDate.AddDays(14) < DateTime.Now && t.Status != "Returned")
            .ToListAsync();
        }

        public async Task<IEnumerable<BorrowingTransaction>> GetMemberBorrowHistoryAsync(int memberId)
        {
            return await _context.BorrowingTransactions
                .Where(t => t.MemberID == memberId)
                .ToListAsync();
        }

        public async Task UpdateTransactionAsync(BorrowingTransaction transaction)
        {
            _context.BorrowingTransactions.Update(transaction);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteTransactionAsync(int transactionId)
        {
            var transaction = await _context.BorrowingTransactions.FindAsync(transactionId);
            if (transaction != null)
            {
                _context.BorrowingTransactions.Remove(transaction);
                await _context.SaveChangesAsync();
            }
        }

        public async Task<int> GetMemberBorrowCountAsync(int memberId)
        {
            return await _context.BorrowingTransactions
                .CountAsync(t => t.MemberID == memberId && t.Status == "Borrowed");
        }

        public async Task<BorrowingTransaction> GetActiveBorrowingTransactionAsync(int memberId, int bookId)
        {
            return await _context.BorrowingTransactions.FirstOrDefaultAsync(t => t.MemberID == memberId && t.BookID == bookId && t.Status == "Borrowed");
        }
    }
}