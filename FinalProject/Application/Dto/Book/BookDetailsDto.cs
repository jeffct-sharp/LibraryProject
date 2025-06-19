using System.ComponentModel.DataAnnotations;

namespace FinalProject.Application.Dto.Book
{
    public class BookDetailsDto
    {
        public int BookID { get; set; }
        public string Title { get; set; }
        public string Author { get; set; }
        public string Genre { get; set; }
        public string ISBN { get; set; }
        public int? YearPublished { get; set; }
        public int AvailableCopies { get; set; }
    }
}
