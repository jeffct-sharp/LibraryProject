using Microsoft.AspNetCore.Mvc;
using FinalProject.Application.Interfaces;
using FinalProject.Application.Dto.Member;
using Microsoft.AspNetCore.Authorization;

namespace FinalProject.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MemberController : ControllerBase
    {
        private readonly IMemberService _memberService;

        public MemberController(IMemberService memberService)
        {
            _memberService = memberService;
        }

        [Authorize(Roles = "Admin,Librarian")]
        [HttpGet]
        public async Task<IActionResult> GetAllMembers()
        {
            var members = await _memberService.GetAllMembersAsync();
            return Ok(members);
        }

        [Authorize(Roles = "Admin,Librarian,User")]
        [HttpGet("{id}")]
        public async Task<IActionResult> GetMemberById(int id)
        {
            var member = await _memberService.GetMemberByIdAsync(id);
            if (member == null) return NotFound();
            return Ok(member);
        }
        [HttpGet("by-email")]
        public async Task<IActionResult> GetMemberByEmail([FromQuery] string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return BadRequest(new { Message = "Email is required." });

            var member = await _memberService.GetMemberByEmailAsync(email);
            if (member == null)
                return NotFound(new { Message = "Member not found." });

            return Ok(member);
        }

        [HttpGet("by-name")]
        public async Task<IActionResult> GetMemberByName([FromQuery] string name)
        {
            if (string.IsNullOrWhiteSpace(name))
                return BadRequest(new { Message = "Name is required." });

            var member = await _memberService.GetMemberByNameAsync(name);
            if (member == null)
                return NotFound(new { Message = "Member not found." });
            return Ok(member);
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("register")]
        public async Task<IActionResult> RegisterMember([FromBody] RegisterMemberDto registerDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            await _memberService.RegisterMemberAsync(registerDto);
            return Ok(new { Message = "Member registered successfully." });
        }

        [Authorize(Roles = "Admin,Librarian,User")]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateMember(int id, [FromBody] UpdateMemberDto updateDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            await _memberService.UpdateMemberAsync(id, updateDto);
            return NoContent();
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteMember(int id)
        {
            await _memberService.DeleteMemberAsync(id);
            return Ok(new { Message = "Member deleted successfully." });
        }

        [Authorize(Roles = "Admin,Librarian,User")]
        [HttpGet("{id}/borrowings")]
        public async Task<IActionResult> GetBorrowingsForMember(int id)
        {
            var borrowings = await _memberService.GetBorrowingsForMemberAsync(id);
            return Ok(borrowings);
        }

        [Authorize(Roles = "Admin,Librarian,User")]
        [HttpGet("{id}/fines")]
        public async Task<IActionResult> GetOutstandingFinesForMember(int id)
        {
            var fines = await _memberService.GetOutstandingFinesForMemberAsync(id);
            return Ok(fines);
        }

        [Authorize(Roles = "Admin,Librarian")]
        [HttpPost("check-membership-status")]
        public async Task<IActionResult> CheckAndUpdateMembershipStatus()
        {
            await _memberService.CheckAndUpdateMembershipStatusAsync();
            return Ok(new { Message = "Membership statuses updated successfully." });
        }

        [Authorize(Roles = "Admin,Librarian")]
        [HttpGet("search")]
        public async Task<IActionResult> SearchMembers([FromQuery] SearchMemberDto searchMembersDto)
        {
            var members = await _memberService.SearchMembersAsync(searchMembersDto);
            return Ok(members);
        }
    }
}

