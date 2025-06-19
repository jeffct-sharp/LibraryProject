using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace FinalProject.Domain
{
    public class Notification
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int NotificationID { get; set; }

        public int MemberID { get; set; }

        public string Message { get; set; }

        public DateTime DateSent { get; set; }

        // Foreign key for Member
        public Member Member { get; set; }
    }
}