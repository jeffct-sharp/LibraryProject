import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TransactionService } from '../transaction.service';
import { ConfirmationDialogService } from '../../../core/confirmation-dialog.service';
import { TransactionDisplayUiModel } from '../../../models/ui-models/transaction-ui-models';
import { BorrowingTransactionDto } from '../../../models/dtos/transaction-dtos';
import { BookService } from '../../books/book.service';
import { MemberService } from '../../members/member.service';
import { AuthService } from '../../auth/auth.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-transaction-detail',
  templateUrl: './transaction-detail.component.html',
  styleUrls: ['./transaction-detail.component.scss']
})
export class TransactionDetailComponent implements OnInit, OnDestroy {
  transaction: TransactionDisplayUiModel | null = null;
  rawTransaction: BorrowingTransactionDto | null = null;
  transactionId: number = 0;
  loading = false;
  error: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private transactionService: TransactionService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private confirmationService: ConfirmationDialogService,
    private bookService: BookService,
    private memberService: MemberService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id && !isNaN(+id) && +id > 0) {
        this.transactionId = +id;
        this.loadTransactionDetails();
      } else {
        this.error = 'Invalid transaction ID provided';
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTransactionDetails(): void {
    this.loading = true;
    this.error = null;
    
    // Double-check that we have a valid ID before making the API call
    if (!this.transactionId || isNaN(this.transactionId) || this.transactionId <= 0) {
      this.error = 'Invalid transaction ID: ' + this.transactionId;
      this.loading = false;
      return;
    }
    
    this.transactionService.getTransaction(this.transactionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.rawTransaction = data;
          this.transaction = this.transactionService.mapToTransactionDisplayUiModel(data);
          this.loading = false;
          
          // Load related book and member details if needed
          if (data.bookID) {
            this.loadBookDetails(data.bookID);
          }
          if (data.memberID) {
            this.loadMemberDetails(data.memberID);
          }
        },
        error: (err) => {
          this.error = 'Failed to load transaction: ' + (err.message || 'Unknown error');
          this.loading = false;
        }
      });
  }

  loadBookDetails(bookId: number): void {
    this.bookService.getBook(bookId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (book) => {
          if (this.transaction) {
            this.transaction.bookTitle = book.title;
          }
        },
        error: () => {
          // Silently fail - not critical
        }
      });
  }

  loadMemberDetails(memberId: number): void {
    this.memberService.getMember(memberId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (member) => {
          if (this.transaction) {
            this.transaction.memberName = member.name;
          }
        },
        error: () => {
          // Silently fail - not critical
        }
      });
  }

  // For displaying the correct status
  determineStatus(transaction: BorrowingTransactionDto): string {
    if (transaction.status === 'Returned') {
      return 'Returned';
    }

    return this.isOverdue(transaction) ? 'Overdue' : 'Borrowed';
  }

  // Check if transaction is overdue
  isOverdue(transaction: BorrowingTransactionDto): boolean {
    return this.transactionService.isOverdue(transaction);
  }

  // Calculate days overdue
  calculateOverdueDays(transaction: BorrowingTransactionDto): number {
    return this.transactionService.calculateOverdueDays(transaction);
  }

  // Calculate potential fine
  calculatePotentialFine(transaction: BorrowingTransactionDto): number {
    return this.transactionService.calculatePotentialFine(transaction);
  }

  // Format date for display
  formatDate(date: string | null | undefined): string {
    if (!date) return 'N/A';
    
    // Special "not returned" date from backend
    if (date === '0001-01-01T00:00:00' || date === '0001-01-01') {
      return 'Not Returned';
    }

    return this.transactionService.formatDate(date);
  }

  // Navigate to return book page
  returnBook(): void {
    if (!this.transaction) return;

    this.confirmationService.confirm('Are you sure you want to return this book?', 'Confirm Return')
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.router.navigate(['/transactions/return'], {
            queryParams: { transactionId: this.transaction?.transactionID }
          });
        }
      });
  }

  // Delete transaction with confirmation
  delete(): void {
    if (!this.transaction) return;

    this.confirmationService.confirmDelete(`Transaction #${this.transaction.transactionID}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe(confirmed => {
        if (confirmed && this.transaction) {
          this.loading = true;
          this.transactionService.deleteTransaction(this.transaction.transactionID)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                this.snackBar.open('Transaction deleted successfully', 'Close', { duration: 3000 });
                this.router.navigate(['/transactions']);
              },
              error: (err) => {
                this.error = 'Failed to delete transaction: ' + (err.message || 'Unknown error');
                this.loading = false;
              }
            });
        }
      });
  }

  // Check if user can delete transactions
  canDelete(): boolean {
    return this.isAdmin();
  }

  // Role-based authorization checks
  isAdmin(): boolean {
    return this.authService.hasRole('Admin');
  }

  isLibrarian(): boolean {
    return this.authService.hasRole('Librarian');
  }
}
