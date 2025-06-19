using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace FinalProject.Domain
{
    public class Book
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int BookID { get; set; }

        public string Title { get; set; }

        public string Author { get; set; }

        public string Genre { get; set; }

        public string ISBN { get; set; }

        public int? YearPublished { get; set; }

        public int AvailableCopies { get; set; }

        // Navigation property for one-to-many relationship with BorrowingTransaction
        public ICollection<BorrowingTransaction> BorrowingTransactions { get; set; }
    }
}