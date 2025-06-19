import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BookService } from '../books/book.service';
import { AuthService } from '../auth/auth.service';
import { BookDetailsDto } from '../../models/dtos/book-dtos';
import { FineService } from '../fines/fine.service';
import { FineDetailsDto } from '../../models/dtos/fine-dtos';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  books: BookDetailsDto[] = [];
  featuredBooks: BookDetailsDto[] = [];
  featuredBooksGroups: BookDetailsDto[][] = [];
  filteredBooks: BookDetailsDto[] = [];
  loading = true;
  isLoggedIn = false;
  isAdmin = false;
  searchTerm = '';
  title = 'Library Management System';
  error: string | null = null;
  selectedGenre: string = '';
  genres: string[] = [];
  selectedBook: any = null;
  isAuthenticated = false;
  userRole: string | null = null;
  userName: string | null = null;
  pendingFines: FineDetailsDto[] = [];
  loadingFines = false;

  // New properties for search results
  searchResults: BookDetailsDto[] = [];
  showSearchResults: boolean = false;

  constructor(
    private bookService: BookService,
    private authService: AuthService,
    private router: Router,
    private fineService: FineService
  ) {}

  ngOnInit(): void {
    this.loadBooks();
    
    this.isAuthenticated = this.authService.isAuthenticated();
    if (this.isAuthenticated) {
      this.userRole = this.authService.getUserRoles()[0] || null;
      this.userName = this.authService.getUsernameFromStorage();
      this.loadMyFines();
    }
  }

  loadBooks(): void {
    this.bookService.getBooks().subscribe({
      next: (books: any[]) => {
        this.books = books.map(book => {
          // Ensure consistent property names
          return {
            ...book,
            yearPublished: book.yearPublished || book.publishedYear
          };
        }) as BookDetailsDto[];
        
        // Extract unique genres
        this.genres = Array.from(new Set(this.books.map(book => book.genre)));
        
        // Select featured books (first 12 books with available copies)
        this.featuredBooks = this.books
          .filter(book => book.availableCopies > 0)
          .slice(0, 12);
        
        // Group featured books for carousel (4 per group)
        this.featuredBooksGroups = [];
        for (let i = 0; i < this.featuredBooks.length; i += 4) {
          this.featuredBooksGroups.push(this.featuredBooks.slice(i, i + 4));
        }
        
        this.filteredBooks = [...this.books];
        
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading books', error);
        this.error = 'Failed to load books. Please try again.';
        this.loading = false;
      }
    });
  }

  // Improved method to directly get member ID from auth service
  getMemberIdFromAuth(): number {
    const userData = this.authService.currentUserValue;
    if (userData && userData.member && userData.member.memberID) {
      const memberId = userData.member.memberID;
      if (!isNaN(Number(memberId))) {
        return Number(memberId);
      }
    }
    return 0;
  }

  // Updated method to check if member ID exists
  memberIdExists(): boolean {
    return this.getMemberIdFromAuth() > 0;
  }

  // Deprecated - this method should now use getMemberIdFromAuth instead
  getUserMemberId(): number {
    return this.getMemberIdFromAuth();
  }

  loadMyFines(): void {
    const memberId = this.getMemberIdFromAuth();
    if (memberId <= 0) return;
    
    this.loadingFines = true;
    this.fineService.getMemberFines(memberId).subscribe({
      next: fines => {
        this.pendingFines = fines.filter(fine => fine.status === 'Pending');
        this.loadingFines = false;
      },
      error: err => {
        console.error('Error loading fines:', err);
        this.loadingFines = false;
      }
    });
  }

  getTotalFineAmount(): number {
    return this.pendingFines.reduce((total, fine) => total + fine.amount, 0);
  }

  viewMyFines(): void {
    const memberId = this.getMemberIdFromAuth();
    if (memberId > 0) {
      this.router.navigate(['/fines/member', memberId]);
    }
  }

  formatDate(date: string | undefined | null): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  }

  searchBooks(): void {
    this.error = null;
    const search = this.searchTerm.trim().toLowerCase();
    if (!search) {
      // Show all featured books if no search term
      this.featuredBooks = this.books.filter(book => book.availableCopies > 0).slice(0, 12);
      this.showSearchResults = false;
      return;
    }
    
    // Find matching books
    this.searchResults = this.books.filter(book =>
      (book.title && book.title.toLowerCase().includes(search)) ||
      (book.author && book.author.toLowerCase().includes(search)) ||
      (book.isbn && book.isbn.toLowerCase().includes(search))
    );
    
    // Show search results section
    this.showSearchResults = true;
  }

  // New method to clear search results
  clearSearchResults(): void {
    this.searchTerm = '';
    this.searchResults = [];
    this.showSearchResults = false;
  }

  filterByGenre(genre: string): void {
    this.selectedGenre = genre;
    this.searchBooks();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedGenre = '';
    this.filteredBooks = [...this.books];
  }

  isBookAvailable(book: BookDetailsDto): boolean {
    return book.availableCopies > 0;
  }

  viewBookDetails(bookId: number | undefined): void {
    if (!bookId) {
      console.error('Invalid book ID');
      return;
    }
    this.router.navigate(['/books', bookId]);
  }

  goToBooks(): void {
    this.router.navigate(['/books']);
  }

  selectBook(book: any): void {
    this.selectedBook = book;
  }

  borrowBook(book: any): void {
    // Implement borrow logic or show login prompt if not authenticated
    if (!this.authService.isAuthenticated()) {
      // Show login/register prompt or redirect
      this.router.navigate(['/auth/login']);
      return;
    }
    // Borrow logic here
  }

  navigateToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  navigateToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  navigateToRegister(): void {
    this.router.navigate(['/auth/register']);
  }
}