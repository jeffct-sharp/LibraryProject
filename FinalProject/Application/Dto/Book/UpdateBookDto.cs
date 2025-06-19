using System.ComponentModel.DataAnnotations;

namespace FinalProject.Application.Dto.Book
{
    public class UpdateBookDto
    {
        [Required]
        public int BookID { get; set; } // Required to identify the book being updated.

        [MaxLength(255)]
        public string Title { get; set; } // Optional, as not all fields may be updated.

        [MaxLength(100)]
        public string Author { get; set; } // Optional.

        [MaxLength(50)]
        public string Genre { get; set; } // Optional.

        [MaxLength(20)]
        public string ISBN { get; set; } // Optional.

        public int YearPublished { get; set; }

        [Range(0, int.MaxValue)]
        public int AvailableCopies { get; set; } // Optional.
    }
}
