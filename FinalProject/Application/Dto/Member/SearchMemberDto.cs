using System.ComponentModel.DataAnnotations;

namespace FinalProject.Application.Dto.Member
{
    public class SearchMemberDto
    {
            [MaxLength(255)]
            public string? Name { get; set; } // Optional, for searching by name.

            [MaxLength(100)]
            public string? Email { get; set; } // Optional, for searching by email.

            [MaxLength(15)]
            public string? Phone { get; set; } // Optional, for searching by phone.

            [MaxLength(50)]
            public string? MembershipStatus { get; set; } // Optional, for searching by membership status.
    }
}
