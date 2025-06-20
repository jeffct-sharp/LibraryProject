import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MemberService } from '../member.service';
import { TransactionService } from '../../transactions/transaction.service';
import { FineService } from '../../fines/fine.service';
import { AuthService } from '../../auth/auth.service';
import { MemberResponseDto } from '../../../models/dtos/member-dtos';
import { BorrowingTransactionDto } from '../../../models/dtos/transaction-dtos';
import { FineDetailsDto } from '../../../models/dtos/fine-dtos';
import { BookService } from '../../books/book.service';
import { ConfirmationDialogService } from '../../../core/confirmation-dialog.service';

@Component({
  selector: 'app-member-borrowings-fines',
  templateUrl: './member-borrowings-fines.component.html',
  styleUrls: ['./member-borrowings-fines.component.scss']
})
export class MemberBorrowingsFinesComponent implements OnInit {
  member: MemberResponseDto | null = null;
  memberId: number | null = null;
  
  // Data sources
  borrowings: BorrowingTransactionDto[] = [];
  bookTitles: { [bookID: number]: string } = {};
  filteredBorrowings: BorrowingTransactionDto[] = [];
  fines: FineDetailsDto[] = [];
  filteredFines: FineDetailsDto[] = [];
  
  // Loading states
  loading = false;
  loadingBorrowings = false;
  loadingFines = false;
  error: string | null = null;
  
  // Filter states
  borrowingFilter = 'all'; // 'all', 'active', 'overdue', 'returned'
  borrowingSearchTerm = '';
  fineFilter = 'all'; // 'all', 'unpaid', 'paid'
  
  // Selected tab (defaults to borrowings, can be changed via query params)
  selectedTabIndex = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private memberService: MemberService,
    private transactionService: TransactionService,
    private fineService: FineService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private confirmService: ConfirmationDialogService,
    private bookService: BookService
  ) { }

  ngOnInit(): void {
    // Get member ID from route params
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.memberId = +id;
        this.loadMemberDetails(this.memberId);
      } else {
        this.error = 'No member ID provided';
      }
    });
    
    // Check if a specific tab should be shown (from query params)
    this.route.queryParamMap.subscribe(params => {
      const tab = params.get('tab');
      if (tab === 'fines') {
        this.selectedTabIndex = 1;
      } else {
        this.selectedTabIndex = 0;
      }
    });
  }
  
  loadMemberDetails(memberId: number): void {
    this.loading = true;
    this.error = null;
    
    this.memberService.getMember(memberId).subscribe({
      next: (data) => {
        this.member = data;
        this.loading = false;
        
        // Load borrowings and fines
        this.loadBorrowings();
        this.loadFines();
      },
      error: (err) => {
        this.error = `Failed to load member details: ${err.message || 'Unknown error'}`;
        this.loading = false;
      }
    });
  }
  
  loadBorrowings(): void {
    if (!this.memberId) return;
    
    this.loadingBorrowings = true;
    this.memberService.getMemberBorrowings(this.memberId).subscribe({
      next: (data) => {
        this.borrowings = data;
        this.fetchBookTitlesForBorrowings(data); // <-- Add this line
        // Apply initial filter
        this.applyBorrowingFilter();
        this.loadingBorrowings = false;
      },
      error: (err) => {
        this.error = `Failed to load borrowings: ${err.message || 'Unknown error'}`;
        this.loadingBorrowings = false;
      }
    });
  }

  fetchBookTitlesForBorrowings(borrowings: BorrowingTransactionDto[]): void {
    const uniqueBookIds = Array.from(new Set(borrowings.map(b => b.bookID)));
    uniqueBookIds.forEach(bookId => {
      if (bookId && !this.bookTitles[bookId]) {
        this.bookService.getBook(bookId).subscribe({
          next: (book) => {
            this.bookTitles[bookId] = book.title;
          },
          error: () => {
            this.bookTitles[bookId] = 'Unknown Title';
          }
        });
      }
    });
  }
  
  loadFines(): void {
    if (!this.memberId) return;
    
    this.loadingFines = true;
    this.fineService.getMemberFines(this.memberId).subscribe({
      next: (data) => {
        this.fines = data;
        // Apply initial filter
        this.applyFineFilter();
        this.loadingFines = false;
      },
      error: (err) => {
        this.error = `Failed to load fines: ${err.message || 'Unknown error'}`;
        this.loadingFines = false;
      }
    });
  }
  
  applyBorrowingFilter(): void {
    // First filter by status
    let filtered = [...this.borrowings];
    
    if (this.borrowingFilter === 'active') {
      filtered = filtered.filter(b => b.status !== 'Returned' && !this.isOverdue(b));
    } else if (this.borrowingFilter === 'overdue') {
      filtered = filtered.filter(b => this.isOverdue(b));
    } else if (this.borrowingFilter === 'returned') {
      filtered = filtered.filter(b => b.status === 'Returned');
    }
    
    // Then filter by search term if any
    if (this.borrowingSearchTerm.trim()) {
      const term = this.borrowingSearchTerm.toLowerCase().trim();
      filtered = filtered.filter(b => 
        b.bookName?.toLowerCase().includes(term)
      );
    }
    
    this.filteredBorrowings = filtered;

    // Fetch book titles for the filtered list
  this.fetchBookTitlesForBorrowings(this.filteredBorrowings);
  }
  
  applyFineFilter(): void {
    if (this.fineFilter === 'unpaid') {
      this.filteredFines = this.fines.filter(f => f.status === 'Pending');
    } else if (this.fineFilter === 'paid') {
      this.filteredFines = this.fines.filter(f => f.status === 'Paid');
    } else {
      this.filteredFines = [...this.fines];
    }
  }
  
  isOverdue(borrowing: BorrowingTransactionDto): boolean {
    // If already returned, it's not overdue
    if (borrowing.status === 'Returned') return false;

    // Check for special "not returned" date values
    const notReturnedValues = ['0001-01-01T00:00:00', '0001-01-01'];
    if (borrowing.returnDate && !notReturnedValues.includes(borrowing.returnDate)) {
      // If returnDate exists and is not a "not returned" value, this is the actual return date
      return false;
    }

    // Calculate the due date based on borrow date plus the standard borrowing period
    const borrowDate = new Date(borrowing.borrowDate);
    const dueDate = new Date(borrowDate);
    dueDate.setDate(dueDate.getDate() + 14); // Standard 14-day borrowing period

    const today = new Date();
    
    // Strip time for consistent comparison
    dueDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    return dueDate < today;
  }

  calculateDaysOverdue(borrowing: BorrowingTransactionDto): number {
    if (borrowing.status === 'Returned' || !this.isOverdue(borrowing)) {
      return 0;
    }
    
    const today = new Date();
    const borrowDate = new Date(borrowing.borrowDate);
    const dueDate = new Date(borrowDate);
    dueDate.setDate(dueDate.getDate() + 14); // Standard 14-day borrowing period
    
    // Strip time for accurate day calculation
    dueDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = Math.abs(today.getTime() - dueDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  getDisplayStatus(borrowing: BorrowingTransactionDto): string {
    if (borrowing.status === 'Returned') {
      return 'Returned';
    }
    
    return this.isOverdue(borrowing) ? 'Overdue' : 'Active';
  }

  calculatePotentialFine(borrowing: BorrowingTransactionDto): number {
    const overdueDays = this.calculateDaysOverdue(borrowing);
    
    if (overdueDays <= 0) {
      return 0;
    }
    
    // Base fine: ₹10 per day, capped at ₹300
    const baseFine = Math.min(overdueDays * 10, 300);
    
    // Additional suspension fee of ₹200 if more than 30 days overdue
    const suspensionFee = overdueDays > 30 ? 200 : 0;
    
    return baseFine + suspensionFee;
  }

  calculateDueDate(borrowDate: string): Date {
    const borrowDateObj = new Date(borrowDate);
    const dueDate = new Date(borrowDateObj);
    dueDate.setDate(dueDate.getDate() + 14); // Standard 14-day borrowing period
    return dueDate;
  }

  formatDueDate(borrowDate: string): string {
    if (!borrowDate) return 'N/A';
    const dueDate = this.calculateDueDate(borrowDate);
    return dueDate.toLocaleDateString();
  }
  
  getStatusClass(borrowing: BorrowingTransactionDto | string): string {
    if (typeof borrowing === 'string') {
      return borrowing === 'Returned' ? 'bg-success' : 
             borrowing === 'Overdue' ? 'bg-danger' : 'bg-warning';
    }
    
    const status = this.getDisplayStatus(borrowing);
    return status === 'Returned' ? 'bg-success' : 
           status === 'Overdue' ? 'bg-danger' : 'bg-warning';
  }
  
  formatDate(date: string): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  }
  
  getActiveBorrowingsCount(): number {
    return this.borrowings.filter(b => b.status !== 'Returned').length;
  }
  
  getOverdueCount(): number {
    return this.borrowings.filter(b => this.isOverdue(b)).length;
  }
  
  getTotalFines(): number {
    return this.fines
      .filter(f => f.status === 'Pending')
      .reduce((sum, fine) => sum + fine.amount, 0);
  }
  
  returnBook(transactionId: number): void {
    this.confirmService.confirm(
      'Are you sure you want to return this book?',
      'Confirm Return'
    ).subscribe(confirmed => {
      if (confirmed) {
        this.transactionService.returnBook({
          transactionID: transactionId,
          returnDate: new Date().toISOString()
        }).subscribe({
          next: () => {
            this.snackBar.open('Book returned successfully', 'Close', { duration: 3000 });
            this.loadBorrowings(); // Refresh borrowings
          },
          error: (err) => {
            this.snackBar.open(`Failed to return book: ${err.message || 'Unknown error'}`, 'Close', { duration: 5000 });
          }
        });
      }
    });
  }
  
  payFine(fineId: number): void {
    if (!this.memberId) return;
    
    // Navigate to the fine payment page
    this.router.navigate(['/fines/payment'], {
      queryParams: {
        fineId: fineId,
        memberId: this.memberId,
        returnUrl: `/members/${this.memberId}/borrowings-fines`
      }
    });
  }
  
  onTabChange(event: any): void {
    // Update URL with selected tab without reloading the page
    const tab = event.index === 0 ? 'borrowings' : 'fines';
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
      skipLocationChange: false
    });
  }
  
  canReturnBooks(): boolean {
    return this.authService.hasRole('Admin') || this.authService.hasRole('Librarian');
  }
  
  canManageFines(): boolean {
    return this.authService.hasRole('Admin') || this.authService.hasRole('Librarian');
  }
  
  goBack(): void {
    this.router.navigate(['/members']);
  }
}
