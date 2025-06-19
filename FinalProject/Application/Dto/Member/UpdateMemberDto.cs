using System.ComponentModel.DataAnnotations;

namespace FinalProject.Application.Dto.Member
{
    public class UpdateMemberDto
    {
        [Required]
        public int MemberID { get; set; } // Required to identify the member.

        [MaxLength(100)]
        public string Name { get; set; } // Optional, for updating the name.

        [MaxLength(20)]
        public string Phone { get; set; } // Optional, for updating the phone.

        [MaxLength(255)]
        public string Address { get; set; } // Optional, for updating the address.
    }
}
