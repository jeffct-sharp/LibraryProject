using FinalProject.Application.Interfaces;
using FinalProject.Application.Dto.Book;
using FinalProject.Domain;
using System.Net;

namespace FinalProject.Application.Services
{
    public class BookService : IBookService
    {
        private readonly IBookRepository _bookRepository;

        public BookService(IBookRepository bookRepository)
        {
            _bookRepository = bookRepository;
        }

        public async Task<IEnumerable<BookDetailsDto>> GetAllBooksAsync()
        {
            var books = await _bookRepository.GetAllBooksAsync();
            return books.Select(b => new BookDetailsDto
            {
                BookID = b.BookID,
                Title = b.Title,
                Author = b.Author,
                Genre = b.Genre,
                ISBN = b.ISBN,
                YearPublished = b.YearPublished,
                AvailableCopies = b.AvailableCopies
            });
        }

        public async Task<BookDetailsDto> GetBookByIdAsync(int bookId)
        {
            var book = await _bookRepository.GetBookByIdAsync(bookId);
            if (book == null) return null;

            return new BookDetailsDto
            {
                BookID = book.BookID,
                Title = book.Title,
                Author = book.Author,
                Genre = book.Genre,
                ISBN = book.ISBN,
                YearPublished = book.YearPublished,
                AvailableCopies = book.AvailableCopies
            };
        }

        //Updated Add Book Method **
        public async Task AddBookAsync(CreateBookDto createBookDto)
        {
            var existingBook = await _bookRepository.GetBookByISBNAsync(createBookDto.ISBN);

            if (existingBook != null)
            {
                // Check if the existing book details match the new book details
                if (existingBook.Title == createBookDto.Title && existingBook.Author == createBookDto.Author &&
                    existingBook.Genre == createBookDto.Genre && existingBook.YearPublished == createBookDto.YearPublished)
                {
                    // If details match, increase the available copies
                    existingBook.AvailableCopies += createBookDto.AvailableCopies;
                    await _bookRepository.UpdateBookAsync(existingBook);
                }
                else
                {
                    // If details do not match, throw an exception
                    throw new InvalidOperationException("A book with the same ISBN but different details already exists.");
                }
            }
            else
            {
                // If no existing book, add the new book
                var newBook = new Book
                {
                    Title = createBookDto.Title,
                    Author = createBookDto.Author,
                    Genre = createBookDto.Genre,
                    ISBN = createBookDto.ISBN,
                    YearPublished = createBookDto.YearPublished,
                    AvailableCopies = createBookDto.AvailableCopies
                };

                await _bookRepository.AddBookAsync(newBook);
            }
        }


        public async Task UpdateBookAsync(UpdateBookDto updateBookDto)
        {
            var book = await _bookRepository.GetBookByIdAsync(updateBookDto.BookID);
            if (book == null) return;


            // Check if the updated ISBN already exists for another book
            if (!string.IsNullOrEmpty(updateBookDto.ISBN) && updateBookDto.ISBN != book.ISBN)
            {
                var existingBook = await _bookRepository.GetBookByISBNAsync(updateBookDto.ISBN);
                if (existingBook != null)
                {
                    throw new BadHttpRequestException("A book with the same ISBN already exists.", 409);
                }
            }

            book.Title = updateBookDto.Title ?? book.Title;
            book.Author = updateBookDto.Author ?? book.Author;
            book.Genre = updateBookDto.Genre ?? book.Genre;
            book.ISBN = updateBookDto.ISBN ?? book.ISBN;
            book.YearPublished = updateBookDto.YearPublished;
            book.AvailableCopies = updateBookDto.AvailableCopies;

            await _bookRepository.UpdateBookAsync(book);
        }

        //updated **
        public async Task DeleteBookAsync(int bookId)
        {
            var book = await _bookRepository.GetBookByIdAsync(bookId);

            if (book == null)
            {
                throw new InvalidOperationException("Book not found.");
            }

            // Check for pending borrowing transactions, handle null BorrowingTransactions
            var hasPendingBorrowingTransactions = book.BorrowingTransactions?.Any(bt => bt.Status == "Pending") ?? false;

            if (hasPendingBorrowingTransactions)
            {
                throw new InvalidOperationException("Cannot delete the book as it has pending borrowing transactions.");
            }

            await _bookRepository.DeleteBookAsync(bookId);
        }

        public async Task<IEnumerable<BookDetailsDto>> SearchBooksAsync(SearchBooksDto searchBooksDto)
        {
            var allBooks = await _bookRepository.GetAllBooksAsync();
            //var filteredBooks = allBooks.Where(b =>
            //    (string.IsNullOrEmpty(searchBooksDto.Title) || b.Title.Contains(searchBooksDto.Title, StringComparison.OrdinalIgnoreCase)) &&
            //    (string.IsNullOrEmpty(searchBooksDto.Author) || b.Author.Contains(searchBooksDto.Author, StringComparison.OrdinalIgnoreCase)) &&
            //    (string.IsNullOrEmpty(searchBooksDto.Genre) || b.Genre.Contains(searchBooksDto.Genre, StringComparison.OrdinalIgnoreCase)));

            //return filteredBooks.Select(b => new BookDetailsDto
            //{
            //    BookID = b.BookID,
            //    Title = b.Title,
            //    Author = b.Author,
            //    Genre = b.Genre,
            //    ISBN = b.ISBN,
            //    YearPublished = b.YearPublished,
            //    AvailableCopies = b.AvailableCopies
            //});


            var searchTitle = searchBooksDto.Title?.Trim().ToLower() ?? string.Empty;
            var searchAuthor = searchBooksDto.Author?.Trim().ToLower() ?? string.Empty;
            var searchGenre = searchBooksDto.Genre?.Trim().ToLower() ?? string.Empty;

            // Flags to indicate if a specific search field was provided by the user
            bool hasTitleQuery = !string.IsNullOrEmpty(searchTitle);
            bool hasAuthorQuery = !string.IsNullOrEmpty(searchAuthor);
            bool hasGenreQuery = !string.IsNullOrEmpty(searchGenre);

            // 3. Apply filtering logic based on the presence of terms
            var filteredBooks = allBooks.Where(b =>
            {
                // Case 1: No search terms provided at all --> return all books
                // This is effectively handled by the conditions below if all 'hasXQuery' are false
                // but for clarity, you could add an explicit check here:
                // if (!hasTitleQuery && !hasAuthorQuery && !hasGenreQuery) return true;

                // Individual match conditions, only true if the query term exists AND the book property matches
                bool matchesTitle = hasTitleQuery && b.Title != null && b.Title.ToLower().Contains(searchTitle);
                bool matchesAuthor = hasAuthorQuery && b.Author != null && b.Author.ToLower().Contains(searchAuthor);
                bool matchesGenre = hasGenreQuery && b.Genre != null && b.Genre.ToLower().Contains(searchGenre);

                // Now, combine these.
                // If NO search terms were provided, we want to return ALL books.
                // If AT LEAST ONE search term was provided, we want to return books that match ANY of those terms.

                if (!hasTitleQuery && !hasAuthorQuery && !hasGenreQuery)
                {
                    // If no search terms were provided, effectively return all books (no filter applied)
                    return true;
                }
                else
                {
                    // If at least one search term was provided,
                    // return true if it matches ANY of the *active* search conditions
                    return matchesTitle || matchesAuthor || matchesGenre;
                }
            });

            // 4. Project to DTOs and return
            return filteredBooks.Select(b => new BookDetailsDto
            {
                BookID = b.BookID,
                Title = b.Title,
                Author = b.Author,
                Genre = b.Genre,
                ISBN = b.ISBN,
                YearPublished = b.YearPublished,
                AvailableCopies = b.AvailableCopies
            });
        }
    }
}
