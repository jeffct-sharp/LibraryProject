using System.ComponentModel.DataAnnotations;

namespace FinalProject.Application.Dto.Member
{
    public class RegisterMemberDto
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } // Required for member identification.

        [Required]
        [EmailAddress]
        [MaxLength(255)]
        public string Email { get; set; } // Required for communication.

        [Required]
        [MinLength(8)]
        public string Password { get; set; }

        [MaxLength(10)]
        public string Phone { get; set; } // Optional, for contact purposes.

        [MaxLength(255)]
        public string Address { get; set; } // Optional, for mailing purposes.
    }
}
