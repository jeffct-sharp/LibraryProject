using System.ComponentModel.DataAnnotations;

namespace FinalProject.Application.Dto.Notification
{
    public class ApproachingFineNotificationDto
    {
        public int BookID { get; set; }
        public int DayLeft { get; set; }

        public int FineAmount {  get; set; }

        public string FineSentence { get; set; }
    }
}
