using Microsoft.AspNetCore.Mvc;
using FinalProject.Application.Interfaces;
using FinalProject.Application.Dto.BorrowingTransaction;
using Microsoft.AspNetCore.Authorization;
using FinalProject.Domain;

namespace FinalProject.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BorrowingController : ControllerBase
    {
        private readonly IBorrowingTransactionService _borrowingService;

        public BorrowingController(IBorrowingTransactionService borrowingService)
        {
            _borrowingService = borrowingService;
        }

        [Authorize(Roles = "Admin,Librarian")]
        [HttpGet]
        public async Task<IActionResult> GetAllTransactions()
        {
            var transactions = await _borrowingService.GetAllTransactionsAsync();
            return Ok(transactions);
        }

        [Authorize(Roles = "Admin,Librarian,User")]
        [HttpGet("{id}")]
        public async Task<IActionResult> GetTransactionById(int id)
        {
            var transaction = await _borrowingService.GetTransactionByIdAsync(id);
            if (transaction == null) return NotFound();
            return Ok(transaction);
        }

        [Authorize(Roles = "Admin,Librarian,User")]
        [HttpPost("borrow")]
        public async Task<IActionResult> BorrowBook([FromBody] BorrowBookDto borrowDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            await _borrowingService.AddTransactionAsync(borrowDto);
            return Ok(new { Message = "Book borrowed successfully." });
        }

        [Authorize(Roles = "Admin,Librarian,User")]
        [HttpPost("return")]
        public async Task<IActionResult> ReturnBook([FromBody] ReturnBookDto returnDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            await _borrowingService.ReturnBookAsync(returnDto);
            return Ok(new { Message = "Book returned successfully." });
        }

        [Authorize(Roles = "Admin,Librarian")]
        [HttpGet("overdue")]
        public async Task<IActionResult> GetOverdueBooks()
        {
            var overdueBooks = await _borrowingService.GetOverdueBooksAsync();
            return Ok(overdueBooks);
        }

        [Authorize(Roles = "Admin,Librarian,User")]
        [HttpGet("member/{memberId}")]
        public async Task<IActionResult> GetMemberBorrowHistory(int memberId)
        {
            var borrowHistory = await _borrowingService.GetMemberBorrowHistoryAsync(memberId);
            return Ok(borrowHistory);
        }

        //[Authorize(Roles = "Admin,Librarian")]
        //[HttpDelete("member/{memberId}")]
        //public async Task<IActionResult> DeleteTransactionbyId(int memberId)
        //{
        //    await _borrowingService.DeleteTransactionByIdAsync(memberId);
        //    return NoContent();
        //}

        [Authorize(Roles ="Admin,Librarian")]
        [HttpDelete("{transactionId}")]
        public async Task<IActionResult> DeleteTransaction(int transactionId)
        {
            await _borrowingService.DeleteTransactionAsync(transactionId);
            return Ok(new { Message = "Transaction deleted successfully." });
        }


    }
}