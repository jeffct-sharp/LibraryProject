using System.ComponentModel.DataAnnotations;

namespace FinalProject.Application.Dto.Fine
{
    public class PayFineDto
    {
        [Required]
        public int FineID { get; set; } // Required to identify the fine being paid.

        [Required]
        public decimal Amount { get; set; } // Required to record the payment amount.
    }
}
