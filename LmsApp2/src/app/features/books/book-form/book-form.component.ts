import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BookService } from '../book.service';
import { CreateBookDto, UpdateBookDto, BookDetailsDto } from '../../../models/dtos/book-dtos';
import { AuthService } from '../../auth/auth.service';
import { ConfirmationDialogService } from '../../../core/confirmation-dialog.service';

// Custom ISBN validator
function isbnValidator(control: FormControl): {[key: string]: any} | null {
  const value = control.value;
  if (!value) return null;
  
  // Remove hyphens and spaces
  const cleanedValue = value.replace(/[-\s]/g, '');
  
  // Check if it's a valid ISBN-13
  if (cleanedValue.length !== 13 ) {
    return { 'invalidIsbn': true };
  }
  
  // ISBN-13 checksum validation
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanedValue[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  
  if (parseInt(cleanedValue[12]) !== checkDigit) {
    return { 'invalidChecksum': true };
  }
  
  return null;
}

@Component({
  selector: 'app-book-form',
  templateUrl: './book-form.component.html',
  styleUrls: ['./book-form.component.scss']
})
export class BookFormComponent implements OnInit {
  bookForm!: FormGroup;
  bookID: number | null = null;
  isEditMode = false;
  loading = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private bookService: BookService,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private confirmationService: ConfirmationDialogService
  ) {}

  ngOnInit(): void {
    if (!this.authService.hasRole('Admin') && !this.authService.hasRole('Librarian')) {
      this.router.navigate(['/access-denied']);
      return;
    }
    
    this.initForm();
    
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.bookID = +params['id'];
        this.isEditMode = true;
        this.loadBookData();
      }
    });
  }

  private initForm(): void {
    this.bookForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(255)]],
      author: ['', [Validators.required, Validators.maxLength(100)]],
      genre: ['', [Validators.maxLength(50)]],
      isbn: ['', [
        Validators.required, 
        Validators.pattern(/^\d{13}$/) // Simplified to just accept 13 digits
      ]],
      yearPublished: ['', [
        Validators.required, 
        Validators.min(1000), 
        Validators.max(new Date().getFullYear())
      ]],
      availableCopies: ['', [Validators.required, Validators.min(0)]]
    });
  }

  loadBookData(): void {
    if (this.bookID) {
      this.loading = true;
      this.bookService.getBook(this.bookID).subscribe({
        next: (book: BookDetailsDto) => {
          this.bookForm.patchValue(book);
          this.loading = false;
        },
        error: () => {
          this.error = 'Failed to load book details.';
          this.loading = false;
        }
      });
    }
  }

  onSubmit(): void {
    if (this.bookForm.invalid) {
      this.bookForm.markAllAsTouched();
      return;
    }
    
    this.loading = true;
    this.error = null;
    
    if (!this.isEditMode) {
      this.checkForDuplicateIsbn();
    } else if (this.bookID) {
      this.updateExistingBook();
    }
  }
  
  private checkForDuplicateIsbn(): void {
    const isbn = this.bookForm.get('isbn')?.value.replace(/[-\s]/g, '');

    this.bookService.searchBooks({ isbn }).subscribe({
      next: (books) => {
        // Filter for exact ISBN match (in case backend returns partial matches)
        const exactMatches = books.filter(
          b => b.isbn.replace(/[-\s]/g, '') === isbn
        );

        if (exactMatches.length > 0) {
          const existingBook = exactMatches[0];
          const currentForm = this.bookForm.value;

          const detailsMatch =
            existingBook.title.toLowerCase() === currentForm.title.toLowerCase() &&
            existingBook.author.toLowerCase() === currentForm.author.toLowerCase() &&
            existingBook.genre.toLowerCase() === currentForm.genre.toLowerCase();

          if (detailsMatch) {
            this.showIncreaseCopiesDialog(existingBook);
          } else {
            this.error = 'A book with this ISBN already exists with different details. ISBN should be unique.';
            this.loading = false;
          }
        } else {
          this.addNewBook();
        }
      },
      error: (err) => {
        this.error = 'Error checking for duplicate ISBN.';
        this.loading = false;
      }
    });
  }
  
  private showIncreaseCopiesDialog(existingBook: BookDetailsDto): void {
    const copiesToAdd = parseInt(this.bookForm.get('availableCopies')?.value || '0');
    
    this.confirmationService.confirmIncreaseCopies(existingBook, copiesToAdd).subscribe(result => {
      if (result) {
        const newCopies = existingBook.availableCopies + copiesToAdd;
        
        const updateDto: UpdateBookDto = {
          bookID: existingBook.bookID,
          availableCopies: newCopies
        };
        
        this.bookService.updateBook(updateDto).subscribe({
          next: () => {
            this.snackBar.open(`Added ${copiesToAdd} copies to existing book.`, 'Close', {
              duration: 3000
            });
            this.router.navigate(['/books']);
          },
          error: () => {
            this.error = 'Failed to update book copies.';
            this.loading = false;
          }
        });
      } else {
        this.loading = false;
      }
    });
  }
  
  private addNewBook(): void {
    const createDto: CreateBookDto = this.bookForm.value;
    createDto.isbn = createDto.isbn.replace(/[-\s]/g, ''); // Clean ISBN format
    
    this.bookService.addBook(createDto).subscribe({
      next: () => {
        this.snackBar.open('Book added successfully!', 'Close', {
          duration: 3000
        });
        this.router.navigate(['/books']);
      },
      error: (error) => {
        this.error = error?.error?.message || 'Failed to add book.';
        this.loading = false;
      }
    });
  }
  
  private updateExistingBook(): void {
    if (!this.bookID) return;
    
    const updateDto: UpdateBookDto = { 
      bookID: this.bookID,
      ...this.bookForm.value
    };
    updateDto.isbn = updateDto.isbn?.replace(/[-\s]/g, '') || ''; // Clean ISBN format
    
    this.bookService.updateBook(updateDto).subscribe({
      next: () => {
        this.snackBar.open('Book updated successfully!', 'Close', {
          duration: 3000
        });
        this.router.navigate(['/books']);
      },
      error: (error) => {
        this.error = error?.error?.message || 'Failed to update book.';
        this.loading = false;
      }
    });
  }

  // Format ISBN as user types (adding hyphens)
  formatIsbn(event: any): void {
    const input = event.target;
    let value = input.value.replace(/[^0-9]/g, '');
    
    if (value.length > 13) {
      value = value.substr(0, 13);
    }
    
    // Format with hyphens (typical ISBN-13 format: 978-3-16-148410-0)
    if (value.length > 3) {
      value = value.substr(0, 3) + '-' + value.substr(3);
    }
    if (value.length > 5) {
      value = value.substr(0, 5) + '-' + value.substr(5);
    }
    if (value.length > 8) {
      value = value.substr(0, 8) + '-' + value.substr(8);
    }
    if (value.length > 15) {
      value = value.substr(0, 15) + '-' + value.substr(15);
    }
    
    this.bookForm.get('isbn')?.setValue(value, { emitEvent: false });
  }
}
