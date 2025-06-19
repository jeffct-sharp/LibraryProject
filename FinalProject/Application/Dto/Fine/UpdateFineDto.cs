using System.ComponentModel.DataAnnotations;

namespace FinalProject.Application.Dto.Fine
{
    public class UpdateFineDto
    {
        [Required]
        public int FineID { get; set; } // Required to identify the fine.

        [Required]
        public int MemberID { get; set; } // Required to link the fine to a member.

        [Required]
        [Range(0, 300, ErrorMessage = "Fine amount must be between 0 and 300.")]
        public decimal Amount { get; set; } // Fine amount, capped at 5000.

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } // Fine status (e.g., Paid, Pending).

        [Required]
        public DateTime TransactionDate { get; set; } // Date the fine was issued.
    }
}
