using System.ComponentModel.DataAnnotations;

namespace FinalProject.Application.Dto.BorrowingTransaction
{
    public class BorrowBookDto
    {
        [Required]
        public int BookID { get; set; } // Required to identify the book being borrowed.

        [Required]
        public int MemberID { get; set; } // Required to identify the member borrowing the book.

        [Required]
        [DataType(DataType.Date)]
        public DateTime BorrowDate { get; set; } // Required to record the borrowing date.
    }
}
