using System.ComponentModel.DataAnnotations;

namespace FinalProject.Application.Dto.Book
{
    public class SearchBooksDto
    {
        [MaxLength(255)]
        public string? Title { get; set; } // Optional, for searching by title.

        [MaxLength(100)]
        public string? Author { get; set; } // Optional, for searching by author.

        [MaxLength(50)]
        public string? Genre { get; set; } // Optional, for searching by genre.
    }
}
