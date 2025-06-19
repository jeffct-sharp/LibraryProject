using FinalProject.Domain;

namespace FinalProject.Application.Interfaces
{
    public interface INotificationRepository
    {
        Task<IEnumerable<Notification>> GetAllNotificationsAsync();
        Task<Notification> GetNotificationByIdAsync(int notificationId);
        Task AddNotificationAsync(Notification notification);
        Task DeleteNotificationAsync(int notificationId);
        Task<IEnumerable<Notification>> GetNotificationsForMemberAsync(int memberId);
        Task UpdateNotificationAsync(Notification notification);

        Task<IEnumerable<BorrowingTransaction>> GetBorrowedBooksForUserAsync(int memberId);
    }
}