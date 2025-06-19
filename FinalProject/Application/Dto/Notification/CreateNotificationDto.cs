using System.ComponentModel.DataAnnotations;

namespace FinalProject.Application.Dto.Notification
{
    public class CreateNotificationDto
    {
        [Required]
        public int MemberID { get; set; } // Required to identify the member receiving the notification.

        [Required]
        [MaxLength(500)]
        public string Message { get; set; } // Required to specify the notification message.

        [Required]
        public DateTime DateSent { get; set; } // Required to record when the notification was sent.
    }
}
