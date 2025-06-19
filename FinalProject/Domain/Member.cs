using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace FinalProject.Domain
{

    public class Member
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int MemberID { get; set; }

        public string Name { get; set; }

        public string Email { get; set; }

        public string Phone { get; set; }

        public string Address { get; set; }

        public string MembershipStatus { get; set; }


        // Navigation property for one-to-one relationship with User

        // One-to-many relationship with Fine
        public ICollection<Fine> Fines { get; set; }

        // One-to-many relationship with Notification
        public ICollection<Notification> Notifications { get; set; }

        // one-to-many relationship with BorrowingTransaction
        public ICollection<BorrowingTransaction> BorrowingTransactions { get; set; }
    }

}