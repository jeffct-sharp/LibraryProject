using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FinalProject.Domain
{
    public class BorrowingTransaction
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int TransactionID { get; set; }

        // Navigation properties  
        [ForeignKey("BookID")]
        public int BookID { get; set; }
        public Book Book { get; set; }

        [ForeignKey("MemberID")]
        public int MemberID { get; set; }
        public Member Member { get; set; }

        public DateTime BorrowDate { get; set; }

        public DateTime ReturnDate { get; set; }

        public string Status { get; set; }
    }
}