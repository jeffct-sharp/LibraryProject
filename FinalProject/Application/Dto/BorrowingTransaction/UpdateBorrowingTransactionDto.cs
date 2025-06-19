using System.ComponentModel.DataAnnotations;

namespace FinalProject.Application.Dto.BorrowingTransaction
{
    public class UpdateBorrowingTransactionDto
    {
        [Required]
        public int TransactionID { get; set; }

        [Required]
        public int BookID { get; set; }

        [Required]
        public int MemberID { get; set; }

        [Required]
        [DataType(DataType.Date)]
        public DateTime BorrowDate { get; set; }

        [Required]
        [DataType(DataType.Date)]
        public DateTime ReturnDate { get; set; }

        [Required]
        [MaxLength(20)]
        public string Status { get; set; }
    }
}
