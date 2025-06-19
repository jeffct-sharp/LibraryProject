import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TransactionService } from '../transaction.service';
import { AuthService } from '../../auth/auth.service';
import { BorrowingTransactionDto, ReturnBookDto } from '../../../models/dtos/transaction-dtos';
import { TransactionDisplayUiModel } from '../../../models/ui-models/transaction-ui-models';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'app-return-book',
  templateUrl: './return-book.component.html',
  styleUrls: ['./return-book.component.scss']
})
export class ReturnBookComponent implements OnInit {
  returnForm: FormGroup;
  searchForm: FormGroup;
  returnBookForm: FormGroup;
  
  loading = false;
  loadingTransactions = false;
  submitting = false;
  error: string | null = null;
  success: string | null = null;
  
  transactions: TransactionDisplayUiModel[] = [];
  filteredTransactions: TransactionDisplayUiModel[] = [];
  selectedTransaction: BorrowingTransactionDto | null = null;
  borrowedBooks: TransactionDisplayUiModel[] = [];
  
  // Add these for table display
  displayedColumns: string[] = ['transactionID', 'bookName', 'memberName', 'borrowDate', 'dueDate', 'status', 'actions'];
  dataSource = new MatTableDataSource<TransactionDisplayUiModel>([]);
  
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  
  // Flag to indicate if dates can be changed (admin/librarian only)
  canChangeDate = false;
  today = new Date();
  minDate = new Date(); // Can't return in the past
  
  // For fine information display
  overdueDetails = {
    isOverdue: false,
    daysOverdue: 0,
    fineAmount: 0
  };

  constructor(
    private fb: FormBuilder,
    private transactionService: TransactionService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.returnForm = this.fb.group({
      transactionID: ['', Validators.required],
      returnDate: [this.today, Validators.required]
    });
    
    this.searchForm = this.fb.group({
      searchTerm: ['']
    });
    
    this.returnBookForm = this.fb.group({
      transactionId: ['', Validators.required],
      returnDate: [this.today, Validators.required],
      notes: ['']
    });
  }

  ngOnInit(): void {
    // Check if user can change dates
    this.canChangeDate = this.transactionService.canChangeDate();
    
    // If user can't change date, disable the date field
    if (!this.canChangeDate) {
      this.returnForm.get('returnDate')?.disable();
      this.returnBookForm.get('returnDate')?.disable();
    }
    
    // Get transaction ID from query parameter if available
    this.route.queryParams.subscribe(params => {
      if (params['transactionId']) {
        const transactionId = +params['transactionId'];
        this.loadTransaction(transactionId);
      } else {
        // Load active transactions that can be returned
        this.loadActiveTransactions();
      }
    });
  }
  
  ngAfterViewInit() {
    if (this.dataSource) {
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
    }
  }
  
  // Load a specific transaction
  loadTransaction(transactionId: number): void {
    this.loading = true;
    this.transactionService.getTransaction(transactionId).subscribe({
      next: (transaction) => {
        if (transaction.status === 'Returned') {
          this.error = 'This book has already been returned.';
          this.returnForm.get('transactionID')?.setErrors({ 'alreadyReturned': true });
        } else {
          this.selectedTransaction = transaction;
          this.returnBookForm.patchValue({ 
            transactionId: transaction.transactionID
          });
          
          // Calculate overdue information
          this.updateOverdueDetails(transaction);
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load transaction: ' + (err.message || 'Unknown error');
        this.loading = false;
      }
    });
  }
  
  // Update overdue details for a transaction
  updateOverdueDetails(transaction: BorrowingTransactionDto): void {
    const isOverdue = this.transactionService.isOverdue(transaction);
    const daysOverdue = this.transactionService.calculateOverdueDays(transaction);
    const fineAmount = this.transactionService.calculatePotentialFine(transaction);
    
    this.overdueDetails = {
      isOverdue,
      daysOverdue,
      fineAmount
    };
  }
  
  // Load all active transactions
  loadActiveTransactions(): void {
    this.loadingTransactions = true;
    this.error = null;
    
    let activeTransactionsObservable: Observable<BorrowingTransactionDto[]>;
    
    // If regular user, only load their transactions
    // Use authService.getCurrentUser() or subscribe to currentUser$ observable
    this.authService.currentUser$.subscribe(user => {
      if (!this.canChangeDate && user?.memberId) {
        // Regular user - only see their transactions
        activeTransactionsObservable = this.transactionService.getMemberTransactions(user.memberId);
      } else {
        // Admin/librarian can see all transactions
        activeTransactionsObservable = this.transactionService.getTransactions({
          includeReturned: false
        });
      }
      
      // Process transactions
      activeTransactionsObservable.pipe(
        catchError(err => {
          this.error = 'Failed to load transactions: ' + (err.message || 'Unknown error');
          return of([]);
        })
      ).subscribe(transactions => {
        // Filter out returned books
        const activeTransactions = transactions.filter(t => t.status !== 'Returned');
        
        // Convert to UI models
        this.transactions = activeTransactions.map(t => 
          this.transactionService.mapToTransactionDisplayUiModel(t)
        );
        
        this.filteredTransactions = [...this.transactions];
        this.dataSource.data = this.filteredTransactions;
        
        this.loadingTransactions = false;
      });
    });
  }
  
  // Search transactions
  searchTransactions(): void {
    const term = this.searchForm.get('searchTerm')?.value?.trim();
    this.filterTransactions(term);
  }
  
  // Filter transactions
  filterTransactions(searchTerm: string): void {
    if (!searchTerm) {
      this.filteredTransactions = [...this.transactions];
      this.dataSource.data = this.filteredTransactions;
      return;
    }
    
    const term = searchTerm.toLowerCase().trim();
    
    this.filteredTransactions = this.transactions.filter(t => 
      (t.bookName && t.bookName.toLowerCase().includes(term)) ||
      (t.memberName && t.memberName.toLowerCase().includes(term)) ||
      (t.transactionID && t.transactionID.toString().includes(term)) ||
      (t.status && t.status.toLowerCase().includes(term))
    );
    
    this.dataSource.data = this.filteredTransactions;
  }
  
  // Reset search
  resetSearch(): void {
    this.searchForm.reset();
    this.filteredTransactions = [...this.transactions];
    this.dataSource.data = this.filteredTransactions;
  }
  
  // Select a transaction from the list
  selectTransaction(transaction: BorrowingTransactionDto): void {
    this.transactionService.getTransaction(transaction.transactionID).subscribe({
      next: (fullTransaction) => {
        this.selectedTransaction = fullTransaction;
        this.returnBookForm.patchValue({ 
          transactionId: fullTransaction.transactionID
        });
        
        // Calculate overdue information
        this.updateOverdueDetails(fullTransaction);
      },
      error: (err) => {
        this.error = 'Failed to load transaction details: ' + (err.message || 'Unknown error');
      }
    });
  }
  
  // Clear selection and go back to list
  clearSelection(): void {
    this.selectedTransaction = null;
    this.returnBookForm.reset({
      returnDate: this.today
    });
    
    // Reset overdue details
    this.overdueDetails = {
      isOverdue: false,
      daysOverdue: 0,
      fineAmount: 0
    };
  }
  
  // Process return book action
  returnBook(transaction?: TransactionDisplayUiModel): void {
    // Case 1: Return a specific transaction from the list view
    if (transaction) {
      const returnData: ReturnBookDto = {
        transactionID: transaction.transactionID,
        returnDate: new Date().toISOString()
      };
      
      this.processReturn(returnData);
    } 
    // Case 2: Return book from the form submission
    else {
      if (this.returnBookForm.invalid) {
        this.markFormGroupTouched(this.returnBookForm);
        return;
      }
      
      this.submitting = true;
      this.error = null;
      
      // Get form values
      const formValues = this.returnBookForm.getRawValue();
      
      // Create return DTO
      const returnDto: ReturnBookDto = {
        transactionID: formValues.transactionId,
        returnDate: formValues.returnDate instanceof Date ? 
          formValues.returnDate.toISOString() :
          new Date(formValues.returnDate).toISOString()
      };
      
      this.processReturn(returnDto);
    }
  }
  
  // Process return with ReturnBookDto
  private processReturn(returnDto: ReturnBookDto): void {
    this.submitting = true;
    this.error = null;
    
    this.transactionService.returnBook(returnDto).subscribe({
      next: (transaction) => {
        this.success = 'Book returned successfully!';
        
        // Show success message with snackbar
        this.snackBar.open('Book returned successfully!', 'View Transactions', { 
          duration: 3000 
        }).onAction().subscribe(() => {
          this.router.navigate(['/transactions']);
        });
        
        this.submitting = false;
        
        // After 1.5 seconds, navigate back to transactions list
        setTimeout(() => {
          this.router.navigate(['/transactions']);
        }, 1500);
      },
      error: (err) => {
        this.submitting = false;
        
        // Handle specific backend error messages
        if (err.error?.message) {
          this.error = err.error.message;
        } else {
          this.error = 'Failed to return book: ' + (err.message || 'Unknown error');
        }
      }
    });
  }
  
  // Helper to check if a transaction is overdue
  isOverdue(transaction: BorrowingTransactionDto): boolean {
    return this.transactionService.isOverdue(transaction);
  }
  
  // Get CSS class for overdue status
  getOverdueClass(transaction: BorrowingTransactionDto): string {
    return this.isOverdue(transaction) ? 'table-danger' : '';
  }
  
  // Get display status for a transaction
  getDisplayStatus(transaction: TransactionDisplayUiModel): string {
    if (transaction.status === 'Returned') {
      return 'Returned';
    } else if (transaction.isOverdue) {
      return 'Overdue';
    } else {
      return 'Borrowed';
    }
  }
  
  // Format date for display
  formatDate(date: Date | string): string {
    return this.transactionService.formatDate(date);
  }
  
  // Calculate due date from borrow date
  calculateDueDate(borrowDate: string): Date {
    return this.transactionService.calculateDueDate(borrowDate);
  }
  
  // Helper to mark all form controls as touched for validation
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
  
  // Get formatted fine amount
  getFormattedFineAmount(amount: number): string {
    return `₹${amount.toFixed(2)}`;
  }
}
