using System.ComponentModel.DataAnnotations;

namespace FinalProject.Application.Dto.Book
{
    public class CreateBookDto
    {
        [Required]
        [MaxLength(255)]
        public string Title { get; set; } // Required to identify the book.

        [Required]
        [MaxLength(100)]
        public string Author { get; set; } // Required to identify the author.

        [MaxLength(50)]
        public string Genre { get; set; } // Optional, as not all books may have a genre.

        [MaxLength(20)]
        public string ISBN { get; set; } // Optional, as not all books may have an ISBN.

        public int YearPublished { get; set; }

        [Range(0, int.MaxValue)]
        public int AvailableCopies { get; set; } // Required to track inventory.
    }
}
