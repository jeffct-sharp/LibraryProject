import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TransactionService } from '../transaction.service';
import { BorrowingTransactionDto } from '../../../models/dtos/transaction-dtos';
import { TransactionDisplayUiModel } from '../../../models/ui-models/transaction-ui-models';
import { AuthService } from '../../auth/auth.service';
import { ConfirmationDialogService } from '../../../core/confirmation-dialog.service';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-overdue-transactions',
  templateUrl: './overdue-transactions.component.html',
  styleUrls: ['./overdue-transactions.component.scss']
})
export class OverdueTransactionsComponent implements OnInit, OnDestroy {
  dataSource = new MatTableDataSource<TransactionDisplayUiModel>([]);
  displayedColumns = ['transactionID', 'bookName', 'memberID', 'borrowDate', 'dueDate', 'overdueDays', 'potentialFine', 'actions'];
  loading = false;
  error: string | null = null;
  overdueTransactions: TransactionDisplayUiModel[] = [];
  filterForm: FormGroup;
  
  // Summary data
  overdueStats = {
    totalOverdue: 0,
    totalFines: 0,
    averageDaysOverdue: 0,
    mostOverdueDays: 0
  };
  
  private destroy$ = new Subject<void>();
  
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  
  constructor(
    private transactionService: TransactionService,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private confirmationService: ConfirmationDialogService,
    private fb: FormBuilder
  ) {
    this.filterForm = this.fb.group({
      includeReturned: [false],
      minDaysOverdue: [null],
      maxDaysOverdue: [null],
      memberNameFilter: [''],
      bookTitleFilter: ['']
    });
  }
  
  ngOnInit(): void {
    this.loadOverdueTransactions();
    
    // Subscribe to filter changes
    this.filterForm.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.applyFilters();
    });
  }
  
  ngAfterViewInit() {
    setTimeout(() => {
      if (this.paginator) {
        this.dataSource.paginator = this.paginator;
      }
      
      if (this.sort) {
        this.dataSource.sort = this.sort;
        
        // Set custom sort accessor for dates
        this.dataSource.sortingDataAccessor = (item, property) => {
          switch(property) {
            case 'borrowDate': return new Date(item.borrowDate).getTime();
            case 'dueDate': return item.dueDate ? new Date(item.dueDate).getTime() : 0;
            case 'overdueDays': return item.daysOverdue || 0;
            case 'potentialFine': return item.fineAmount || 0;
            default: return item[property as keyof TransactionDisplayUiModel] as string;
          }
        };
      }
    });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  loadOverdueTransactions(): void {
    this.loading = true;
    this.error = null;
    
    // Use the dedicated method for overdue transactions
    this.transactionService.getOverdueTransactions().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (data) => {
        // Transform the data to UI models with additional details
        this.overdueTransactions = data.map(t => 
          this.transactionService.mapToTransactionDisplayUiModel(t)
        );
        
        // Update the data source
        this.dataSource.data = this.overdueTransactions;
        
        // Calculate summary stats
        this.calculateOverdueStats();
        
        this.loading = false;
        
        // Apply default sorting - sort by days overdue descending
        if (this.sort) {
          this.sort.sort({ id: 'overdueDays', start: 'desc', disableClear: false });
        }
      },
      error: (err) => {
        this.error = 'Failed to load overdue transactions: ' + (err.message || 'Unknown error');
        this.loading = false;
      }
    });
  }
  
  calculateOverdueStats(): void {
    if (!this.overdueTransactions.length) {
      this.overdueStats = {
        totalOverdue: 0,
        totalFines: 0,
        averageDaysOverdue: 0,
        mostOverdueDays: 0
      };
      return;
    }
    
    let totalDaysOverdue = 0;
    let totalFines = 0;
    let maxDaysOverdue = 0;
    
    this.overdueTransactions.forEach(transaction => {
      const daysOverdue = transaction.daysOverdue || 0;
      const fineAmount = transaction.fineAmount || 0;
      
      totalDaysOverdue += daysOverdue;
      totalFines += fineAmount;
      
      if (daysOverdue > maxDaysOverdue) {
        maxDaysOverdue = daysOverdue;
      }
    });
    
    this.overdueStats = {
      totalOverdue: this.overdueTransactions.length,
      totalFines: totalFines,
      averageDaysOverdue: totalDaysOverdue / this.overdueTransactions.length,
      mostOverdueDays: maxDaysOverdue
    };
  }
  
  applyFilters(): void {
    const filterValue = this.filterForm.value;
    
    // Filter the transactions based on the form values
    this.dataSource.data = this.overdueTransactions.filter(transaction => {
      // Include/exclude returned books
      if (!filterValue.includeReturned && transaction.status === 'Returned') {
        return false;
      }
      
      // Filter by days overdue range
      if (filterValue.minDaysOverdue && (!transaction.daysOverdue || transaction.daysOverdue < filterValue.minDaysOverdue)) {
        return false;
      }
      
      if (filterValue.maxDaysOverdue && (!transaction.daysOverdue || transaction.daysOverdue > filterValue.maxDaysOverdue)) {
        return false;
      }
      
      // Filter by member name
      if (filterValue.memberNameFilter && transaction.memberName) {
        if (!transaction.memberName.toLowerCase().includes(filterValue.memberNameFilter.toLowerCase())) {
          return false;
        }
      }
      
      // Filter by book title
      if (filterValue.bookTitleFilter && transaction.bookName) {
        if (!transaction.bookName.toLowerCase().includes(filterValue.bookTitleFilter.toLowerCase())) {
          return false;
        }
      }
      
      return true;
    });
    
    // Go back to the first page when filters change
    if (this.paginator) {
      this.paginator.firstPage();
    }
  }
  
  resetFilters(): void {
    this.filterForm.reset({
      includeReturned: false,
      minDaysOverdue: null,
      maxDaysOverdue: null,
      memberNameFilter: '',
      bookTitleFilter: ''
    });
    
    // Reset the data source to show all overdue transactions
    this.dataSource.data = this.overdueTransactions;
  }
  
  returnBook(transactionId: number): void {
    this.confirmationService.confirm(
      'Are you sure you want to return this book?',
      'Confirm Return'
    ).subscribe(result => {
      if (result) {
        this.router.navigate(['/transactions/return'], { 
          queryParams: { transactionId } 
        });
      }
    });
  }
  
  notifyMember(transactionId: number): void {
    // Get the transaction
    const transaction = this.overdueTransactions.find(t => t.transactionID === transactionId);
    
    if (!transaction) {
      this.snackBar.open('Transaction not found', 'Close', { duration: 3000 });
      return;
    }
    
    this.confirmationService.confirm(
      `Send an overdue notification to ${transaction.memberName || 'this member'}?`,
      'Confirm Notification'
    ).subscribe(result => {
      if (result) {
        // Logic to send notification would go here
        // For now, just show a success message
        this.snackBar.open('Notification sent successfully', 'Close', { duration: 3000 });
      }
    });
  }
  
  viewDetails(transactionId: number): void {
    this.router.navigate(['/transactions', transactionId]);
  }
  
  exportOverdueList(): void {
    // Get current filtered data
    const data = this.dataSource.filteredData;
    if (data.length === 0) {
      this.snackBar.open('No data to export', 'Close', { duration: 3000 });
      return;
    }
    
    // Define columns to export
    const headers = [
      'Transaction ID',
      'Book',
      'Member ID',
      'Member Name',
      'Borrow Date',
      'Due Date',
      'Days Overdue',
      'Potential Fine'
    ];
    
    // Map data to CSV format
    const csvData = data.map(item => [
      item.transactionID,
      item.bookName,
      item.memberID,
      item.memberName || 'N/A',
      this.formatDate(item.borrowDate),
      this.formatDate(item.dueDate || ''),
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
    const fileName = `overdue_transactions_${date}.csv`;
    
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
  
  calculateOverdueDays(transaction: BorrowingTransactionDto): number {
    return this.transactionService.calculateOverdueDays(transaction);
  }
  
  calculatePotentialFine(transaction: BorrowingTransactionDto): number {
    return this.transactionService.calculatePotentialFine(transaction);
  }
  
  formatDate(date: string | Date): string {
    return this.transactionService.formatDate(date);
  }
  
  formatCurrency(amount: number): string {
    return `₹${amount.toFixed(2)}`;
  }
  
  isAdmin(): boolean {
    return this.authService.hasRole('Admin');
  }
  
  isLibrarian(): boolean {
    return this.authService.hasRole('Librarian');
  }
  
  canManage(): boolean {
    return this.isAdmin() || this.isLibrarian();
  }
  
  // Apply a class based on how overdue the transaction is
  getOverdueClass(days: number): string {
    if (days > 30) return 'severe-overdue';
    if (days > 14) return 'moderate-overdue';
    return 'mild-overdue';
  }
}
