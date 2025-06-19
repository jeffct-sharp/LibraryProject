using Microsoft.AspNetCore.Mvc;
using FinalProject.Application.Interfaces;
using FinalProject.Application.Dto.Book;
using Microsoft.AspNetCore.Authorization;

namespace FinalProject.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class BooksController : ControllerBase
    {
        private readonly IBookService _bookService;

        public BooksController(IBookService bookService)
        {
            _bookService = bookService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllBooks()
        {
            var books = await _bookService.GetAllBooksAsync();
            return Ok(books);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetBookById(int id)
        {
            var book = await _bookService.GetBookByIdAsync(id);
            if (book == null) return NotFound();
            return Ok(book);
        }

        [Authorize(Roles = "Admin")]
        [HttpPost]
        public async Task<IActionResult> AddBook([FromBody] CreateBookDto createBookDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            await _bookService.AddBookAsync(createBookDto);
            return CreatedAtAction(nameof(GetBookById), new { id = createBookDto.Title }, createBookDto);
        }

        [Authorize(Roles = "Admin,Librarian")]
        [HttpPut]
        public async Task<IActionResult> UpdateBook([FromBody] UpdateBookDto updateBookDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            await _bookService.UpdateBookAsync(updateBookDto);
            return NoContent();
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteBook(int id)
        {
            await _bookService.DeleteBookAsync(id);
            return Ok(new { Message = "Book deleted successfully." });
        }

        [Authorize(Roles = "Admin,Librarian,User")]
        [HttpGet("search")]
        public async Task<IActionResult> SearchBooks([FromQuery] SearchBooksDto searchBooksDto)
        {
            var books = await _bookService.SearchBooksAsync(searchBooksDto);
            return Ok(books);
        }
    }
}
