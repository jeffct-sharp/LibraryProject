using System.ComponentModel.DataAnnotations;

namespace FinalProject.Application.Dto.Fine
{
    public class FineDetailsDto
    {
        public int FineID { get; set; } // Fine identifier.

        public int MemberID { get; set; } // Member associated with the fine.

        public decimal Amount { get; set; } // Fine amount.

        public string Status { get; set; } // Fine status (e.g., Paid, Pending).

        public DateTime TransactionDate { get; set; } // Date the fine was issued.
    }
}
