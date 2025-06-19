using System.ComponentModel.DataAnnotations;

namespace FinalProject.Application.Dto.BorrowingTransaction
{
    public class BorrowingTransactionDto
    {
        public int TransactionID { get; set; }
        public int BookID { get; set; }
        public string BookName { get; set; }
        public int MemberID { get; set; }

        [DataType(DataType.Date)]
        public DateTime BorrowDate { get; set; }

        [DataType(DataType.Date)]
        public DateTime ReturnDate { get; set; }

        [MaxLength(20)]
        public string Status { get; set; }
    }
}
