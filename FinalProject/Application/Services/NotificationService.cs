using FinalProject.Application.Interfaces;
using FinalProject.Application.Dto.Notification;
using FinalProject.Domain;

namespace FinalProject.Application.Services
{
    public class NotificationService : INotificationService
    {
        private readonly INotificationRepository _notificationRepository;
        private readonly IBorrowingTransactionRepository _borrowingRepository;
        private readonly IFineRepository _fineRepository;

        public NotificationService(
            INotificationRepository notificationRepository,
            IBorrowingTransactionRepository borrowingRepository,
            IFineRepository fineRepository)
        {
            _notificationRepository = notificationRepository;
            _borrowingRepository = borrowingRepository;
            _fineRepository = fineRepository;
        }

        public async Task<IEnumerable<NotificationDetailsDto>> GetAllNotificationsAsync()
        {
            var notifications = await _notificationRepository.GetAllNotificationsAsync();
            return notifications.Select(n => new NotificationDetailsDto
            {
                NotificationID = n.NotificationID,
                MemberID = n.MemberID,
                Message = n.Message,
                DateSent = n.DateSent
            });
        }

        public async Task<NotificationDetailsDto> GetNotificationByIdAsync(int notificationId)
        {
            var notification = await _notificationRepository.GetNotificationByIdAsync(notificationId);
            if (notification == null) return null;

            return new NotificationDetailsDto
            {
                NotificationID = notification.NotificationID,
                MemberID = notification.MemberID,
                Message = notification.Message,
                DateSent = notification.DateSent
            };
        }

        public async Task AddNotificationAsync(CreateNotificationDto createDto)
        {
            var notification = new Notification
            {
                MemberID = createDto.MemberID,
                Message = createDto.Message,
                DateSent = createDto.DateSent
            };
            await _notificationRepository.AddNotificationAsync(notification);
        }

        public async Task DeleteNotificationAsync(int notificationId)
        {
            await _notificationRepository.DeleteNotificationAsync(notificationId);
        }

        public async Task<IEnumerable<NotificationDetailsDto>> GetNotificationsForMemberAsync(int memberId)
        {
            var notifications = await _notificationRepository.GetNotificationsForMemberAsync(memberId);
            return notifications.Select(n => new NotificationDetailsDto
            {
                NotificationID = n.NotificationID,
                MemberID = n.MemberID,
                Message = n.Message,
                DateSent = n.DateSent
            });
        }

        public async Task<IEnumerable<NotificationDetailsDto>> GetNotificationsByMemberNameAsync(string memberName)
        {
            var notifications = await _notificationRepository.GetAllNotificationsAsync();
            var filteredNotifications = notifications
                .Where(n => n.Member != null && n.Member.Name.Equals(memberName, StringComparison.OrdinalIgnoreCase))
                .Select(n => new NotificationDetailsDto
                {
                    NotificationID = n.NotificationID,
                    MemberID = n.MemberID,
                    Message = n.Message,
                    DateSent = n.DateSent
                });

            return filteredNotifications;
        }

        public async Task NotifyForOverdueBooksAsync()
        {
            var overdueTransactions = await _borrowingRepository.GetOverdueBooksAsync();
            foreach (var transaction in overdueTransactions)
            {
                if (transaction.Book == null || transaction.Member == null)
                {
                    continue;
                }

                var overdueDays = (DateTime.Now - transaction.ReturnDate).Days;
                var message = $"Your book '{transaction.Book.Title}' is overdue by {overdueDays} days.";
                await AddNotificationAsync(new CreateNotificationDto
                {
                    MemberID = transaction.MemberID,
                    Message = message,
                    DateSent = DateTime.Now
                });
            }
        }
        public async Task NotifyForFinePaymentAsync(int fineId)
        {
            var fine = await _fineRepository.GetFineByIdAsync(fineId);
            if (fine != null && fine.Status == "Paid")
            {
                var message = $"Your fine of {fine.Amount} has been settled. Thank you!";
                await AddNotificationAsync(new CreateNotificationDto
                {
                    MemberID = fine.MemberID,
                    Message = message,
                    DateSent = DateTime.Now
                });
            }
        }


        public async Task NotifyForUnpaidFinesAsync()
        {
            var fines = await _fineRepository.GetAllFinesAsync(); //Get all fines
            var cutoffDate = DateTime.Now.AddDays(-7);
            foreach (var fine in fines)
            {
                if (fine.Status == "Pending" && fine.TransactionDate <= cutoffDate)
                {
                    var message = $"Reminder: You have unpaid fines totaling ₹{fine.Amount}. Please pay at your earliest convenience.";
                    await AddNotificationAsync(new CreateNotificationDto
                    {
                        MemberID = fine.MemberID,
                        Message = message,
                        DateSent = DateTime.Now
                    });
                }
            }
        }

        public async Task NotifyForMembershipStatusChangeAsync(int memberId, string newStatus)
        {
            var message = $"Your membership status has been updated to '{newStatus}'. Please contact support for more details.";
            await AddNotificationAsync(new CreateNotificationDto
            {
                MemberID = memberId,
                Message = message,
                DateSent = DateTime.Now
            });
        }

        public async Task PerformPeriodicChecksAsync()
        {
            await NotifyForOverdueBooksAsync();
            await NotifyForUnpaidFinesAsync();
            // Add any additional periodic checks here
        }

        public async Task UpdateNotificationAsync(int notificationId, CreateNotificationDto updateDto)
        {
            var notification = await _notificationRepository.GetNotificationByIdAsync(notificationId);
            if (notification == null)
            {
                throw new InvalidOperationException("Notification not found.");
            }

            notification.Message = updateDto.Message ?? notification.Message;
            notification.DateSent = updateDto.DateSent;

            await _notificationRepository.UpdateNotificationAsync(notification);
        }

        public async Task<IEnumerable<ApproachingFineNotificationDto>> GetApproachingFineNotificationsAsync(int memberId)
        {
            var borrowedBooks = await _borrowingRepository.GetMemberBorrowHistoryAsync(memberId);

            var tempresponse = borrowedBooks
                .Where(book => book.Status == "Borrowed" && book.ReturnDate > DateTime.UtcNow) // Filter only active borrowings
                .Select(book => new ApproachingFineNotificationDto
                {
                    BookID = book.BookID,
                    DayLeft = (book.ReturnDate - DateTime.UtcNow).Days
                })
                .Where(n => n.DayLeft > 0); // Stop notifications once the return date is reached

            var tempresponse2 = new List<ApproachingFineNotificationDto>();

                foreach (var book in tempresponse)
                {
                    if (book.DayLeft < 0)
                    {
                        book.FineAmount = 15 * book.DayLeft * -1;
                        book.FineSentence = "Pay fine as soon as possible";
                    }
                    else
                    {
                        book.FineSentence = "No Fines Yet";
                    }
                    tempresponse2.Add(book);
                }

                return tempresponse2;
        }
    }
}
