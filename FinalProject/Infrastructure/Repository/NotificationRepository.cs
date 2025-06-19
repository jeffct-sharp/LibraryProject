using FinalProject.Application.Interfaces;
using FinalProject.Infrastructure.DbContexts;
using FinalProject.Domain;
using Microsoft.EntityFrameworkCore;

namespace FinalProject.Infrastructure.Repository
{
    public class NotificationRepository : INotificationRepository
    {
        private readonly ApplicationDbContext _context;

        public NotificationRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Notification>> GetAllNotificationsAsync()
        {
            return await _context.Notifications.ToListAsync();
        }

        public async Task<Notification> GetNotificationByIdAsync(int notificationId)
        {
            return await _context.Notifications.FindAsync(notificationId);
        }

        public async Task AddNotificationAsync(Notification notification)
        {
            await _context.Notifications.AddAsync(notification);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteNotificationAsync(int notificationId)
        {
            var notification = await _context.Notifications.FindAsync(notificationId);
            if (notification != null)
            {
                _context.Notifications.Remove(notification);
                await _context.SaveChangesAsync();
            }
        }

        public async Task<IEnumerable<Notification>> GetNotificationsForMemberAsync(int memberId)
        {
            return await _context.Notifications.Where(n => n.MemberID == memberId).ToListAsync();
        }

        public async Task UpdateNotificationAsync(Notification notification)
        {
            _context.Notifications.Update(notification);
            await _context.SaveChangesAsync();
        }



        public async Task<IEnumerable<BorrowingTransaction>> GetBorrowedBooksForUserAsync(int memberId)
        {
            return await _context.BorrowingTransactions
                .Where(bt => bt.MemberID == memberId && bt.Status == "Borrowed" && bt.ReturnDate > DateTime.UtcNow) // Direct DB query
                .ToListAsync();
        }
    }
}