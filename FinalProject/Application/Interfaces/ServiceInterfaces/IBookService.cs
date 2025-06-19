using FinalProject.Application.Dto.Book;

namespace FinalProject.Application.Interfaces
{
    public interface IBookService
    {
        Task<IEnumerable<BookDetailsDto>> GetAllBooksAsync();
        Task<BookDetailsDto> GetBookByIdAsync(int id);
        Task<IEnumerable<BookDetailsDto>> SearchBooksAsync(SearchBooksDto searchBooksDto);
        Task AddBookAsync(CreateBookDto createBookDto);
        Task UpdateBookAsync(UpdateBookDto updateBookDto);
        Task DeleteBookAsync(int id);
    }
}
