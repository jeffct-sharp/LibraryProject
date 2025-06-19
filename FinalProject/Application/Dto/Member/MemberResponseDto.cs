using System.ComponentModel.DataAnnotations;

namespace FinalProject.Application.Dto.Member
{
    public class MemberResponseDto
    {
        public int MemberID { get; set; }
        public string Name { get; set; }
        public string Email { get; set; }
        public string Phone { get; set; }
        public string Address { get; set; }
        public string MembershipStatus { get; set; }
    }
}
