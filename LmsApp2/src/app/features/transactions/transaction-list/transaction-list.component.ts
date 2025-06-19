import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TransactionService } from '../transaction.service';
import { BorrowingTransactionDto } from '../../../models/dtos/transaction-dtos';
import { TransactionDisplayUiModel, TransactionFilterUiModel } from '../../../models/ui-models/transaction-ui-models';
import { AuthService } from '../../auth/auth.service';
import { ConfirmationDialogService } from '../../../core/confirmation-dialog.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-transaction-list',
  templateUrl: './transaction-list.component.html',
  styleUrls: ['./transaction-list.component.scss']
})
export class TransactionListComponent implements OnInit, AfterViewInit, OnDestroy {
  dataSource = new MatTableDataSource<TransactionDisplayUiModel>([]);
  filterForm!: FormGroup;
  loading = false;
  error: string | null = null;
  
  // For cleanup
  private destroy$ = new Subject<void>();
  
  // Dashboard summary data
  summaryData = {
    total: 0,
    active: 0,
    overdue: 0,
    returned: 0
  };
  
  // Columns for the table
  displayedColumns: string[] = [
    'transactionID', 
    'bookName', 
    'memberID', 
    'borrowDate', 
    'dueDate', 
    'returnDate', 
    'status', 
    'actions'
  ];
  
  // Current columns being displayed (may change based on screen size)
  currentDisplayColumns: string[] = [...this.displayedColumns];
  
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  transactions: TransactionDisplayUiModel[] = [];

  constructor(
    private transactionService: TransactionService,
    private authService: AuthService,
    private fb: FormBuilder,
    private router: Router,
    private snackBar: MatSnackBar,
    private confirmationService: ConfirmationDialogService
  ) {
    this.initFilterForm();
  }

  ngOnInit(): void {
    this.loadTransactions();
    this.loadSummaryData();
    
    // Adjust displayed columns for smaller screens
    this.adjustColumnsForScreenSize();
    window.addEventListener('resize', () => this.adjustColumnsForScreenSize());
  }
  
  ngAfterViewInit(): void {
    // Fix for "ExpressionChangedAfterItHasBeenCheckedError"
    setTimeout(() => {
      // Make sure paginator and sort are attached to the dataSource
      if (this.paginator) {
        this.dataSource.paginator = this.paginator;
      }
      
      if (this.sort) {
        this.dataSource.sort = this.sort;
        
        // Set custom sort data accessor for dates
        this.dataSource.sortingDataAccessor = (item, property) => {
          switch(property) {
            case 'borrowDate': return new Date(item.borrowDate).getTime();
            case 'dueDate': return item.dueDate ? new Date(item.dueDate).getTime() : 0;
            case 'returnDate': return item.returnDate ? new Date(item.returnDate).getTime() : 0;
            default: return item[property as keyof TransactionDisplayUiModel] as string;
          }
        };
      }
    });
  }
  
  ngOnDestroy(): void {
    // Clean up event listeners and subscriptions
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('resize', () => this.adjustColumnsForScreenSize());
  }
  
  // Initialize the filter form
  private initFilterForm(): void {
    this.filterForm = this.fb.group({
      status: [''],
      bookTitle: [''],
      fromDate: [null],
      toDate: [null],
      overdueOnly: [false],
      includeReturned: [true]
    });
    
    // Subscribe to form changes for filtering
    this.filterForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.applyFilters();
      });
  }
  
  // Load all transactions
  loadTransactions(filters?: TransactionFilterUiModel): void {
    this.loading = true;
    this.error = null;
    
    this.transactionService.getTransactions(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: BorrowingTransactionDto[]) => {
          // Transform DTOs to UI models
          this.transactions = data.map(t => this.transactionService.mapToTransactionDisplayUiModel(t));
          
          // Update data source with new data
          this.dataSource = new MatTableDataSource(this.transactions);
          
          // Re-attach the paginator and sort after updating data
          setTimeout(() => {
            if (this.paginator) {
              this.dataSource.paginator = this.paginator;
            }
            
            if (this.sort) {
              this.dataSource.sort = this.sort;
              
              // Set custom sort data accessor for dates
              this.dataSource.sortingDataAccessor = (item, property) => {
                switch(property) {
                  case 'borrowDate': return new Date(item.borrowDate).getTime();
                  case 'dueDate': return item.dueDate ? new Date(item.dueDate).getTime() : 0;
                  case 'returnDate': return item.returnDate ? new Date(item.returnDate).getTime() : 0;
                  default: return item[property as keyof TransactionDisplayUiModel] as string;
                }
              };
            }
            
            // Make sure to reset to first page when filter changes
            if (this.paginator) {
              this.paginator.firstPage();
            }
          });
          
          this.loading = false;
        },
        error: (err: any) => {
          this.error = 'Failed to load transactions: ' + (err.message || 'Unknown error');
          this.loading = false;
        }
      });
  }
  
  // Load summary data for dashboard
  loadSummaryData(): void {
    this.transactionService.getTransactionSummary()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (summary) => {
          this.summaryData = {
            total: summary.totalTransactions,
            active: summary.activeBorrowings,
            overdue: summary.overdueItems,
            returned: summary.returnedItems
          };
        },
        error: () => {
          // In case of error, we'll keep the defaults (all zeros)
        }
      });
  }
  
  // Apply filters to the table
  applyFilters(): void {
    const formValues = this.filterForm.value;
    
    // Create filter object from form values
    const filters: TransactionFilterUiModel = {
      status: formValues.status || undefined,
      bookTitle: formValues.bookTitle || undefined,
      fromDate: formValues.fromDate || undefined,
      toDate: formValues.toDate || undefined,
      overdueOnly: formValues.overdueOnly || undefined,
      includeReturned: formValues.includeReturned
    };
    
    // Apply filters by reloading transactions
    this.loadTransactions(filters);
  }
  
  // Reset all filters
  resetFilters(): void {
    this.filterForm.reset({
      status: '',
      bookTitle: '',
      fromDate: null,
      toDate: null,
      overdueOnly: false,
      includeReturned: true
    });
    
    // Reload all transactions
    this.loadTransactions();
  }
  
  // Get CSS class for status badge
  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'borrowed': return 'status-borrowed';
      case 'returned': return 'status-returned';
      case 'overdue': return 'status-overdue';
      default: return '';
    }
  }
  
  // Format date for display using transaction service
  formatDate(date: string | null): string {
    if (!date) return 'N/A';
    return this.transactionService.formatDate(date);
  }
  
  // Return a book
  returnBook(transactionId: number): void {
    this.confirmationService.confirm('Are you sure you want to return this book?', 'Confirm Return').subscribe(result => {
      if (result) {
        this.router.navigate(['/transactions/return'], { 
          queryParams: { transactionId } 
        });
      }
    });
  }
  
  // Delete a transaction with confirmation
  delete(transactionId: number): void {
    const transaction = this.transactions.find(t => t.transactionID === transactionId);
    if (!transaction) return;
    
    this.confirmationService.confirmDelete(`Transaction #${transactionId} for book "${transaction.bookName}"`).subscribe(result => {
      if (result) {
        this.loading = true;
        
        this.transactionService.deleteTransaction(transactionId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.snackBar.open('Transaction deleted successfully', 'Close', { duration: 3000 });
              this.loadTransactions();
              this.loadSummaryData();
            },
            error: (err: any) => {
              this.error = 'Failed to delete transaction: ' + (err.message || 'Unknown error');
              this.loading = false;
            }
          });
      }
    });
  }
  
  // Export transactions to CSV
  exportToCSV(): void {
    // Get current filtered data
    const data = this.dataSource.filteredData;
    if (data.length === 0) {
      this.snackBar.open('No data to export', 'Close', { duration: 3000 });
      return;
    }
    
    // Define columns to export - removed Member Name
    const headers = [
      'Transaction ID',
      'Book',
      'Member ID',
      'Borrow Date',
      'Due Date',
      'Return Date',
      'Status',
      'Days Overdue',
      'Fine Amount'
    ];
    
    // Map data to CSV format - removed member name
    const csvData = data.map(item => [
      item.transactionID,
      item.bookName,
      item.memberID,
      this.formatDate(item.borrowDate),
      this.formatDate(item.dueDate || ''),
      item.returnDate ? this.formatDate(item.returnDate) : 'Not Returned',
      item.status,
      item.daysOverdue || 0,
      item.fineAmount ? `₹${item.fineAmount.toFixed(2)}` : '₹0.00'
    ]);
    
    // Add headers
    csvData.unshift(headers);
    
    // Convert to CSV string
    const csvString = csvData.map(row => 
      row.map(cell => typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell)
         .join(',')
    ).join('\n');
    
    // Create a download link
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    // Create file name with current date
    const date = new Date().toISOString().split('T')[0];
    const fileName = `transactions_${date}.csv`;
    
    // Trigger download
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = fileName;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    this.snackBar.open('Export successful', 'Close', { duration: 3000 });
  }
  
  // Role-based access checks
  isAdmin(): boolean {
    return this.authService.hasRole('Admin');
  }
  
  isLibrarian(): boolean {
    return this.authService.hasRole('Librarian');
  }
  
  // Adjust columns based on screen size
  private adjustColumnsForScreenSize(): void {
    const width = window.innerWidth;
    
    if (width < 768) {
      // For smaller screens, show fewer columns
      this.currentDisplayColumns = [
        'transactionID',
        'bookName',
        'borrowDate',
        'status',
        'actions'
      ];
    } else if (width < 992) {
      // For medium screens
      this.currentDisplayColumns = [
        'transactionID',
        'bookName',
        'memberID',
        'borrowDate',
        'dueDate',
        'status',
        'actions'
      ];
    } else {
      // For large screens, show all columns
      this.currentDisplayColumns = [...this.displayedColumns];
    }
  }
}
