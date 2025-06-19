using System.ComponentModel.DataAnnotations;

namespace FinalProject.Application.Dto.Notification
{
    public class NotificationDetailsDto
    {
        public int NotificationID { get; set; }
        public int MemberID { get; set; }
        public string Message { get; set; }
        public DateTime DateSent { get; set; }
    }
}
