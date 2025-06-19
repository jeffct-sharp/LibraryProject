using FinalProject.Application.Dto.Notification;

namespace FinalProject.Application.Interfaces
{
    public interface INotificationService
    {
        Task<IEnumerable<NotificationDetailsDto>> GetAllNotificationsAsync();
        Task<NotificationDetailsDto> GetNotificationByIdAsync(int notificationId);
        Task AddNotificationAsync(CreateNotificationDto createDto);
        Task DeleteNotificationAsync(int notificationId);
        Task<IEnumerable<NotificationDetailsDto>> GetNotificationsForMemberAsync(int memberId);

        // Rule-based notification methods
        //Task NotifyForDueBooksAsync(); // Notify members when books are due in less than 4 days
        Task NotifyForOverdueBooksAsync(); // Notify members when books are overdue
        Task NotifyForFinePaymentAsync(int fineId); // Notify members when a fine is paid
        Task NotifyForMembershipStatusChangeAsync(int memberID, string v);
        Task<IEnumerable<ApproachingFineNotificationDto>>GetApproachingFineNotificationsAsync(int memberId);
    }
}
