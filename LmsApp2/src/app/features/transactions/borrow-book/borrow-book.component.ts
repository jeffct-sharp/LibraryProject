import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, of, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError, map, startWith } from 'rxjs/operators';
import { TransactionService } from '../transaction.service';
import { BookService } from '../../books/book.service';
import { MemberService } from '../../members/member.service';
import { AuthService } from '../../auth/auth.service';
import { BorrowBookDto } from '../../../models/dtos/transaction-dtos';
import { BookDetailsDto } from '../../../models/dtos/book-dtos';
import { MemberResponseDto } from '../../../models/dtos/member-dtos';
import { MemberBorrowingStatusUiModel } from '../../../models/ui-models/transaction-ui-models';

@Component({
  selector: 'app-borrow-book',
  templateUrl: './borrow-book.component.html',
  styleUrls: ['./borrow-book.component.scss']
})
export class BorrowBookComponent implements OnInit {
  borrowForm: FormGroup;
  selectedBook: BookDetailsDto | null = null;
  selectedMember: MemberResponseDto | null = null;
  memberBorrowingStatus: MemberBorrowingStatusUiModel | null = null;
  
  loading = false;
  submitting = false;
  error: string | null = null;
  success: boolean | null = null;
  
  // Book search
  filteredBooks: BookDetailsDto[] = [];
  bookSearchLoading = false;
  
  // Member search
  filteredMembers: MemberResponseDto[] = [];
  memberSearchLoading = false;
  
  // Today's date for default value
  today = new Date();
  minDate = new Date(); // Can't borrow in the past

  // Calculate due date (14 days from borrow date)
  get dueDate(): Date {
    const borrowDate = this.borrowForm.get('borrowDate')?.value;
    if (!borrowDate) return new Date();
    
    const borrowDateObj = new Date(borrowDate);
    const dueDate = new Date(borrowDateObj);
    dueDate.setDate(dueDate.getDate() + 14); // 14-day loan period
    return dueDate;
  }

  private allBooks: BookDetailsDto[] = [];
  private allMembers: MemberResponseDto[] = [];

  showBookDetails = false;
  showMemberDetails = false;

  constructor(
    private fb: FormBuilder,
    private transactionService: TransactionService,
    private bookService: BookService,
    private memberService: MemberService,
    public authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    // Initialize form
    this.borrowForm = this.fb.group({
      bookId: ['', Validators.required],
      bookSearchTerm: [''],
      memberId: ['', Validators.required],
      memberSearchTerm: [''],
      borrowDate: [this.today, Validators.required]
    });
  }

  ngOnInit(): void {
    this.initForm();
    this.loadBooks();

    this.route.queryParams.subscribe(params => {
      const bookId = params['bookId'];
      if (bookId) {
        this.bookService.getBook(+bookId).subscribe({
          next: (book) => {
            this.selectedBook = book;
            this.borrowForm.patchValue({
              bookId: book.bookID ?? '',
              bookSearchTerm: book // Pass the full book object for autocomplete
            });
            this.showBookDetails = true;
          },
          error: (err) => {
            this.error = 'Failed to load book details: ' + (err.message || 'Unknown error');
          }
        });
      }
    });
    
    if (this.isAdminOrLibrarian()) {
      this.loadMembers();
    }else if (this.authService.hasRole('User')) {
      // Automatically populate memberId for 'User' role
      const currentUser = this.authService.currentUserValue;
      const memberID = currentUser?.memberId;
      if (currentUser && currentUser.memberId) {
        this.memberService.getMember(currentUser.memberId).subscribe({
          next: (member) => {
            this.selectedMember = member;
            this.borrowForm.patchValue({
              memberId: member.memberID ?? '',
              memberSearchTerm: member ?? ''
            });
            this.showMemberDetails = true;
          },
          error: (err) => {
            this.error = 'Failed to load your member details: ' + (err.message || 'Unknown error');
          }
        });
      }
    }
  }

  // Fix the initForm method to include borrowDate control
  private initForm(): void {
    this.borrowForm = this.fb.group({
      bookId: [null, Validators.required],
      bookSearchTerm: [''],
      memberId: [null, Validators.required],
      memberSearchTerm: [''],
      borrowDate: [new Date(), Validators.required],
      dueDate: [this.calculateDefaultDueDate(), Validators.required]
    });
    
    // Listen for changes to update search results
    this.borrowForm.get('bookSearchTerm')?.valueChanges
      .pipe(debounceTime(300))
      .subscribe(value => {
        if (typeof value === 'string') {
          this.searchBooks();
        }
      });
      
    this.borrowForm.get('memberSearchTerm')?.valueChanges
      .pipe(debounceTime(300))
      .subscribe(value => {
        if (typeof value === 'string') {
          this.searchMembers();
        }
      });
  }
  
  // Search books
  searchBooks(): void {
    const searchTerm = this.borrowForm.get('bookSearchTerm')?.value;
    
    if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.length < 2) {
      this.filteredBooks = this.allBooks?.filter(book => book.availableCopies > 0) || [];
      return;
    }
    
    const searchTermLower = searchTerm.toLowerCase();
    this.filteredBooks = (this.allBooks || []).filter(book => 
      (book.title.toLowerCase().includes(searchTermLower) || 
       book.author.toLowerCase().includes(searchTermLower) || 
       book.isbn.includes(searchTerm)) && 
      book.availableCopies > 0
    );
  }
  
  // Search members
  searchMembers(): void {
    const searchTerm = this.borrowForm.get('memberSearchTerm')?.value;
    
    if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.length < 2) {
      this.filteredMembers = this.allMembers?.filter(member => member.membershipStatus === 'Active') || [];
      return;
    }
    
    const searchTermLower = searchTerm.toLowerCase();
    this.filteredMembers = (this.allMembers || []).filter(member => 
      (member.name.toLowerCase().includes(searchTermLower) || 
       (member.email && member.email.toLowerCase().includes(searchTermLower)) || 
       member.memberID.toString().includes(searchTerm)) && 
      member.membershipStatus === 'Active'
    );
  }
  
  // Display functions for autocomplete
  displayBookFn(book: BookDetailsDto): string {
    return book ? `${book.title} by ${book.author}` : '';
  }
  
  displayMemberFn(member: MemberResponseDto): string {
    return member ? `${member.name} (ID: ${member.memberID})` : '';
  }
  
  // Load book details
  loadBook(bookId: number): void {
    this.loading = true;
    this.bookService.getBook(bookId).subscribe({
      next: (book) => {
        this.selectedBook = book;
        this.borrowForm.patchValue({ 
          bookId: book.bookID,
          bookSearchTerm: book.title
        });
        
        if (book.availableCopies <= 0) {
          this.error = 'This book is not available for borrowing.';
          this.borrowForm.get('bookId')?.setErrors({ 'notAvailable': true });
        }
        
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load book details: ' + (err.message || 'Unknown error');
        this.loading = false;
      }
    });
  }
  
  // Load member details
  loadMember(memberId: number): void {
    this.loading = true;
    this.memberService.getMember(memberId).subscribe({
      next: (member) => {
        this.selectedMember = member;
        this.borrowForm.patchValue({ 
          memberId: member.memberID,
          memberSearchTerm: member.name
        });
        
        this.checkMemberBorrowingStatus(memberId);
        
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load member details: ' + (err.message || 'Unknown error');
        this.loading = false;
      }
    });
  }
  
  // Check member borrowing status
  checkMemberBorrowingStatus(memberId: number): void {
    this.transactionService.checkMemberBorrowingStatus(memberId, this.selectedMember?.name || '').subscribe({
      next: (status) => {
        this.memberBorrowingStatus = status;
        
        if (!status.canBorrow) {
          this.borrowForm.get('memberId')?.setErrors({ 'cannotBorrow': true });
        }
      },
      error: () => {
        this.memberBorrowingStatus = null;
      }
    });
  }
  
  // Select a book from autocomplete
  selectBook(book: BookDetailsDto): void {
    this.selectedBook = book;
    this.borrowForm.patchValue({ bookId: book.bookID });
    
    if (book.availableCopies <= 0) {
      this.error = 'This book is not available for borrowing.';
      this.borrowForm.get('bookId')?.setErrors({ 'notAvailable': true });
    } else {
      this.error = null;
    }
    this.showBookDetails = true;
  }
  
  // Select a member from autocomplete
  selectMember(member: MemberResponseDto): void {
    this.selectedMember = member;
    this.borrowForm.patchValue({ memberId: member.memberID });
    
    this.checkMemberBorrowingStatus(member.memberID);
    this.showMemberDetails = true;
  }
  
  // Check if current user can change dates (admin/librarian only)
  canChangeDate(): boolean {
    return this.authService.hasRole('Admin') || this.authService.hasRole('Librarian');
  }
  
  // Reset form
  resetForm(): void {
    this.borrowForm.reset({
      borrowDate: this.today
    });
    this.selectedBook = null;
    this.selectedMember = null;
    this.memberBorrowingStatus = null;
    this.error = null;
    this.success = false;
  }
  
  // Update the onSubmit method to utilize more features from our improved TransactionService
  onSubmit(): void {
    if (this.borrowForm.invalid) {
      this.markFormGroupTouched(this.borrowForm);
      return;
    }
    
    if (!this.selectedBook || !this.selectedMember) {
      this.error = 'Please select both a book and a member.';
      return;
    }
    
    // Additional validation based on backend rules
    if (this.selectedBook.availableCopies <= 0) {
      this.error = 'This book is not available for borrowing.';
      return;
    }
    
    // First check if the member has already borrowed this specific book
    this.transactionService.hasAlreadyBorrowedBook(this.selectedMember.memberID, this.selectedBook.bookID)
      .subscribe({
        next: (alreadyBorrowed: boolean) => {
          if (alreadyBorrowed) {
            this.error = 'This member has already borrowed this book and not returned it yet.';
            return;
          }
          
          // Then check general borrowing eligibility
          this.checkBorrowingEligibility();
        },
        error: (err: any) => {
          this.error = 'Error checking if book is already borrowed: ' + (err.message || 'Unknown error');
        }
      });
  }

  // Add a new method to check borrowing eligibility after confirming book isn't already borrowed
  private checkBorrowingEligibility(): void {
    if (!this.selectedMember) {
      this.error = 'No member selected.';
      return;
    }
    
    this.transactionService.canMemberBorrow(this.selectedMember.memberID).subscribe({
      next: (canBorrow: boolean) => {
        if (!canBorrow) {
          this.error = 'Member cannot borrow more books. They may have reached the limit of 5 books or have overdue items.';
          return;
        }
        
        // Continue with borrow process
        this.processBorrow();
      },
      error: (err: any) => {
        this.error = 'Error checking member borrow eligibility: ' + (err.message || 'Unknown error');
      }
    });
  }

  private processBorrow(): void {
    const formValues = this.borrowForm.getRawValue();
    
    let borrowDateStr: string;
    if (formValues.borrowDate instanceof Date) {
      // Fix: Use local date at midnight to avoid timezone shift
      const d = formValues.borrowDate;
      borrowDateStr = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0)).toISOString();
    } else if (typeof formValues.borrowDate === 'string') {
      const dateObj = new Date(formValues.borrowDate);
      borrowDateStr = new Date(Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 0, 0, 0)).toISOString();
    } else {
      const now = new Date();
      borrowDateStr = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)).toISOString();
    }
    
    // Add null checks to avoid "object possibly null" errors
    if (!this.selectedBook || !this.selectedMember) {
      this.error = 'Please select both a book and a member.';
      return;
    }
    
    const borrowDto = {
      bookID: this.selectedBook.bookID,
      memberID: this.selectedMember.memberID,
      borrowDate: borrowDateStr
    };
    
    this.loading = true;
    this.error = null;
    
    this.transactionService.borrowBook(borrowDto).subscribe({
      next: (transaction) => {
        this.loading = false;
        this.success = true;
        this.snackBar.open('Book borrowed successfully!', 'Close', { duration: 3000 });
        
        setTimeout(() => {
          this.router.navigate(['/transactions']);
        }, 1500);
      },
      error: (err) => {
        this.loading = false;
        
        // Handle specific backend error messages
        if (err.error?.message) {
          this.error = err.error.message;
        } else {
          this.error = 'Failed to borrow book: ' + (err.message || 'Unknown error');
        }
        console.error('Error borrowing book:', err);
      }
    });
  }

  // Replace searchBooks with method to load all books
  loadBooks(): void {
    this.bookSearchLoading = true;
    
    this.bookService.getBooks().subscribe({
      next: (books) => {
        this.allBooks = books;
        this.filteredBooks = books.filter(book => book.availableCopies > 0);
        this.bookSearchLoading = false;
      },
      error: (err) => {
        console.error('Error loading books:', err);
        this.filteredBooks = [];
        this.bookSearchLoading = false;
      }
    });
  }

  // Update the loadMembers method to filter out inactive members
  loadMembers(): void {
    this.memberSearchLoading = true;
    
    this.memberService.getMembers().subscribe({
      next: (members) => {
        this.allMembers = members;
        // Only show active members in the dropdown
        this.filteredMembers = members.filter(member => 
          member.membershipStatus === 'Active'
        );
        this.memberSearchLoading = false;
      },
      error: (err) => {
        console.error('Error loading members:', err);
        this.filteredMembers = [];
        this.memberSearchLoading = false;
        this.error = 'Failed to load members: ' + (err.message || 'Unknown error');
      }
    });
  }

  // Helper method to check if user is admin or librarian
  isAdminOrLibrarian(): boolean {
    return this.authService.hasRole('Admin')||this.authService.hasRole('Librarian');
  }

  // Helper to format date for API
  private formatDate(date: Date): string {
    return this.transactionService.formatDate(date);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // Update or add these methods to fix the selected book/member display issue
  onBookSelected(book: any): void {
    console.log('Book selected:', book);
    this.selectedBook = book;
    this.borrowForm.patchValue({
      bookId: book.bookID
    });
    
    this.showBookDetails = true;
    this.checkFormValidity();
  }

  onMemberSelected(member: any): void {
    console.log('Member selected:', member);
    this.selectedMember = member;
    this.borrowForm.patchValue({
      memberId: member.memberID
    });
    
    this.showMemberDetails = true;
    this.checkFormValidity();
  }

  // Helper methods to fetch book/member by ID if needed
  private fetchBookById(bookId: number): void {
    if (!bookId) return;
    
    this.bookService.getBook(bookId).subscribe({
      next: (book) => {
        this.selectedBook = book;
        this.showBookDetails = true;
      },
      error: (err) => {
        console.error('Error fetching book:', err);
      }
    });
  }

  private fetchMemberById(memberId: number): void {
    if (!memberId) return;
    
    this.memberService.getMember(memberId).subscribe({
      next: (member) => {
        this.selectedMember = member;
        this.showMemberDetails = true;
      },
      error: (err) => {
        console.error('Error fetching member:', err);
      }
    });
  }

  // Add this method to check form validity
  checkFormValidity(): void {
    const formValid = !!this.selectedBook && !!this.selectedMember && this.borrowForm.valid;
    
    if (formValid) {
      console.log('Form is valid. Book and member are selected.');
    } else {
      console.log('Form is not valid yet. Missing book or member selection.');
    }
  }

  // Helper method to calculate default due date (14 days from today)
  private calculateDefaultDueDate(): Date {
    const date = new Date();
    date.setDate(date.getDate() + 14);
    return date;
  }
}
