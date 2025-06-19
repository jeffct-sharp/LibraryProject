using Microsoft.AspNetCore.Mvc;
using FinalProject.Application.Interfaces;
using FinalProject.Application.Dto.Fine;
using Microsoft.AspNetCore.Authorization;

namespace FinalProject.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FinesController : ControllerBase
    {
        private readonly IFineService _fineService;

        public FinesController(IFineService fineService)
        {
            _fineService = fineService;
        }

        [Authorize(Roles = "Admin,Librarian")]
        [HttpGet]
        public async Task<IActionResult> GetAllFines()
        {
            var fines = await _fineService.GetAllFinesAsync();
            return Ok(fines);
        }

        [Authorize(Roles = "Admin,Librarian,User")]
        [HttpGet("{id}")]
        public async Task<IActionResult> GetFineById(int id)
        {
            var fine = await _fineService.GetFineByIdAsync(id);
            if (fine == null) return NotFound();
            return Ok(fine);
        }

        [Authorize(Roles = "Admin,Librarian,User")]     //ds Doubt
        [HttpGet("member/{memberId}")]
        public async Task<IActionResult> GetFinesForMember(int memberId)
        {
            var fines = await _fineService.GetFinesForMemberAsync(memberId);
            return Ok(fines);
        }

        [Authorize(Roles = "Admin,Librarian")]
        [HttpPost("apply-overdue-fines")]
        public async Task<IActionResult> ApplyOverdueFines()
        {
            await _fineService.DetectAndApplyOverdueFinesAsync();
            return Ok(new { Message = "Overdue fines applied successfully." });
        }

        [Authorize(Roles = "Admin,Librarian")]
        [HttpPost]
        public async Task<IActionResult> AddFine([FromBody] CreateFineDto createDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            await _fineService.AddFineForMemberAsync(createDto.MemberID, createDto);
            return Ok(new { Message = "Fine added successfully." });
        }

        [Authorize(Roles = "Admin,Librarian")]
        [HttpPut]
        public async Task<IActionResult> UpdateFine([FromBody] UpdateFineDto updateDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            await _fineService.UpdateFineByIdAsync(updateDto);
            return Ok(new { Message = "Fine updated successfully." });
        }

        [Authorize(Roles = "Admin,Librarian,User")]
        [HttpPost("PayFine")]
        //[HttpGet("member/{memberId}")]
        public async Task<IActionResult> PayFine([FromBody] PayFineDto payDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                await _fineService.PayFineAsync(payDto);
                return Ok(new { Message = "Fine paid successfully." });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteFine(int id)
        {
            await _fineService.DeleteFineByIdAsync(id);
            return Ok(new { Message = "Fine deleted successfully." });
        }
    }
}
