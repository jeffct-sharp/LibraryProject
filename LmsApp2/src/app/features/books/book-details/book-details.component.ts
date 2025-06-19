import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BookService } from '../book.service';
import { BookDetailsDto } from '../../../models/dtos/book-dtos';
import { AuthService } from '../../auth/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmationDialogService } from '../../../core/confirmation-dialog.service';

@Component({
  selector: 'app-book-details',
  templateUrl: './book-details.component.html',
  styleUrls: ['./book-details.component.css']
})
export class BookDetailsComponent implements OnInit {
  book: BookDetailsDto | null = null;
  loading = false;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private bookService: BookService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private confirmationService: ConfirmationDialogService
  ) {}

  ngOnInit(): void {
    this.loading = true;
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.bookService.getBook(+id).subscribe({
        next: (book: BookDetailsDto) => {
          this.book = book;
          this.loading = false;
        },
        error: (err: any) => {
          this.error = 'Failed to load book details.';
          this.loading = false;
        }
      });
    } else {
      this.error = 'Book ID not provided';
      this.loading = false;
    }
  }

  canEditOrDelete(): boolean {
    return this.authService.hasRole('Admin') || this.authService.hasRole('Librarian');
  }

  isBookAvailable(): boolean {
    return !!this.book && this.book.availableCopies > 0;
  }

  borrowBook(): void {
    if (!this.book) return;
    
    if (!this.authService.isAuthenticated()) {
      this.snackBar.open('Please log in to borrow books', 'Login', { 
        duration: 5000 
      }).onAction().subscribe(() => {
        this.router.navigate(['/login'], { 
          queryParams: { returnUrl: this.router.url } 
        });
      });
      return;
    }

    // Check if the book is available
    if (!this.isBookAvailable()) {
      this.snackBar.open('Sorry, this book is not available for borrowing.', 'Close', { duration: 3000 });
      return;
    }
    
    // Using confirmationService instead of BorrowDialogComponent
    this.confirmationService.confirmBorrow(this.book).subscribe(result => {
      if (result) {
        // Navigate to borrowing page with book ID
        this.router.navigate(['/transactions/borrow'], { 
          queryParams: { bookId: this.book?.bookID } 
        });
      }
    });
  }
}
