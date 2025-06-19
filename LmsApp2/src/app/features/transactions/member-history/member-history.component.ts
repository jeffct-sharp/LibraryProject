import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Location } from '@angular/common';
import { TransactionService } from '../transaction.service';
import { MemberService } from '../../members/member.service';
import { BorrowingTransactionDto } from '../../../models/dtos/transaction-dtos';
import { MemberResponseDto } from '../../../models/dtos/member-dtos';
import { AuthService } from '../../auth/auth.service';
import { TransactionDisplayUiModel } from '../../../models/ui-models/transaction-ui-models';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, takeUntil, debounceTime } from 'rxjs/operators';
import { Sort } from '@angular/material/sort';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-member-history',
  templateUrl: './member-history.component.html',
  styleUrls: ['./member-history.component.scss'],
  animations: [
    trigger('expandCollapse', [
      state('expanded', style({ height: '*', opacity: 1 })),
      state('collapsed', style({ height: '0', opacity: 0, overflow: 'hidden' })),
      transition('expanded <=> collapsed', animate('300ms ease-in-out'))
    ])
  ]
})
export class MemberHistoryComponent implements OnInit, OnDestroy {
  memberId: number = 0;
  member: MemberResponseDto | null = null;
  transactions: TransactionDisplayUiModel[] = [];
  filteredTransactions: TransactionDisplayUiModel[] = [];
  filterForm: FormGroup;
  
  loading = {
    member: false,
    transactions: false
  };
  
  error: string | null = null;
  
  statuses = ['All', 'Active', 'Overdue', 'Returned'];
  
  // Summary metrics
  summaryMetrics = {
    totalBooks: 0,
    currentlyBorrowed: 0,
    overdue: 0,
    returned: 0,
    averageBorrowingDays: 0
  };
  
  // For cleanup
  private destroy$ = new Subject<void>();

  // Track filter panel state
  isFilterPanelExpanded = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private fb: FormBuilder,
    private memberService: MemberService,
    private transactionService: TransactionService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {
    this.filterForm = this.fb.group({
      status: ['All'],
      dateFrom: [''],
      dateTo: [''],
      searchTerm: [''],
      showReturned: [true],
      sortBy: ['borrowDate'],
      sortDirection: ['desc']
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id && !isNaN(+id) && +id > 0) {
        this.memberId = +id;
        console.log('Loading member history for ID:', this.memberId);
        this.loadData();
      } else {
        // If ID is not provided in route or is invalid, try to get from auth service
        const authMemberId = this.authService.memberId;
        if (authMemberId && !isNaN(authMemberId) && authMemberId > 0) {
          this.memberId = authMemberId;
          console.log('Using member ID from auth service:', this.memberId);
          this.loadData();
        } else {
          this.error = 'Valid member ID is required. Please check your account settings.';
          console.error('Invalid member ID:', { 
            routeId: id, 
            parsedId: id ? +id : null,
            authMemberId: authMemberId
          });
        }
      }
    });
    
    // React to filter changes with debounce to improve performance
    this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.applyFilters();
      });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  loadData(): void {
    // Validate member ID before making API calls
    if (!this.memberId || isNaN(this.memberId) || this.memberId <= 0) {
      this.error = 'Invalid member ID: ' + this.memberId;
      console.error('Invalid member ID in loadData:', this.memberId);
      return;
    }
    
    // Reset error
    this.error = null;
    
    // Set loading states
    this.loading.member = true;
    this.loading.transactions = true;
    
    console.log('Loading transactions for member ID:', this.memberId);
    
    // Load member data and transactions in parallel
    forkJoin({
      member: this.memberService.getMember(this.memberId).pipe(
        catchError(err => {
          this.error = 'Failed to load member details: ' + (err.message || 'Unknown error');
          return of(null);
        })
      ),
      transactions: this.transactionService.getMemberTransactions(this.memberId).pipe(
        catchError(err => {
          this.error = 'Failed to load transaction history: ' + (err.message || 'Unknown error');
          return of([]);
        })
      )
    }).subscribe(result => {
      // Update member info
      this.member = result.member;
      this.loading.member = false;
      
      // Process transactions for display
      if (result.transactions.length > 0) {
        this.transactions = result.transactions.map(t => 
          this.transactionService.mapToTransactionDisplayUiModel(t)
        );
        
        // Calculate summary metrics
        this.calculateSummaryMetrics();
        
        // Apply initial filters
        this.applyFilters();
      } else {
        this.filteredTransactions = [];
      }
      
      this.loading.transactions = false;
    });
  }
  
  calculateSummaryMetrics(): void {
    if (!this.transactions.length) {
      return;
    }
    
    // Count different status types
    const currentlyBorrowed = this.transactions.filter(t => 
      t.status !== 'Returned'
    ).length;
    
    const overdue = this.transactions.filter(t => 
      t.status !== 'Returned' && t.isOverdue
    ).length;
    
    const returned = this.transactions.filter(t => 
      t.status === 'Returned'
    ).length;
    
    // Calculate average borrowing duration for returned books
    let totalDays = 0;
    let countForAverage = 0;
    
    for (const t of this.transactions) {
      if (t.status === 'Returned' && t.borrowDate && t.returnDate) {
        const borrowDate = new Date(t.borrowDate);
        const returnDate = new Date(t.returnDate);
        const days = Math.round((returnDate.getTime() - borrowDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (days >= 0) {
          totalDays += days;
          countForAverage++;
        }
      }
    }
    
    this.summaryMetrics = {
      totalBooks: this.transactions.length,
      currentlyBorrowed,
      overdue,
      returned,
      averageBorrowingDays: countForAverage > 0 ? Math.round(totalDays / countForAverage) : 0
    };
  }
  
  refreshData(): void {
    this.loadData();
  }
  
  applyFilters(): void {
    const filters = this.filterForm.value;
    
    // Start with all transactions
    let filtered = [...this.transactions];
    
    // Filter by status
    if (filters.status !== 'All') {
      if (filters.status === 'Active') {
        filtered = filtered.filter(t => t.status === 'Borrowed');
      } else if (filters.status === 'Overdue') {
        filtered = filtered.filter(t => t.isOverdue);
      } else if (filters.status === 'Returned') {
        filtered = filtered.filter(t => t.status === 'Returned');
      }
    }
    
    // Filter by show/hide returned
    if (!filters.showReturned) {
      filtered = filtered.filter(t => t.status !== 'Returned');
    }
    
    // Filter by date range - from date
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(t => {
        const borrowDate = new Date(t.borrowDate);
        return borrowDate >= fromDate;
      });
    }
    
    // Filter by date range - to date
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      // Set to end of day
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(t => {
        const borrowDate = new Date(t.borrowDate);
        return borrowDate <= toDate;
      });
    }
    
    // Filter by search term
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(t => 
        (t.bookName && t.bookName.toLowerCase().includes(term)) ||
        (t.bookTitle && t.bookTitle.toLowerCase().includes(term))
      );
    }
    
    // Sort results
    filtered = this.sortTransactions(filtered, filters.sortBy, filters.sortDirection);
    
    // Update filtered transactions
    this.filteredTransactions = filtered;
  }
  
  sortTransactions(transactions: TransactionDisplayUiModel[], sortBy: string, direction: 'asc' | 'desc'): TransactionDisplayUiModel[] {
    return [...transactions].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'borrowDate':
          comparison = new Date(a.borrowDate).getTime() - new Date(b.borrowDate).getTime();
          break;
        case 'dueDate':
          const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
          const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
          comparison = aDate - bDate;
          break;
        case 'returnDate':
          const aReturnDate = a.returnDate ? new Date(a.returnDate).getTime() : Number.MAX_SAFE_INTEGER;
          const bReturnDate = b.returnDate ? new Date(b.returnDate).getTime() : Number.MAX_SAFE_INTEGER;
          comparison = aReturnDate - bReturnDate;
          break;
        case 'status':
          const statusA = a.status || '';
          const statusB = b.status || '';
          comparison = statusA.localeCompare(statusB);
          break;
        default:
          comparison = 0;
      }
      
      return direction === 'asc' ? comparison : -comparison;
    });
  }
  
  clearFilters(): void {
    this.filterForm.reset({
      status: 'All',
      dateFrom: '',
      dateTo: '',
      searchTerm: '',
      showReturned: true,
      sortBy: 'borrowDate',
      sortDirection: 'desc'
    });
  }
  
  calculateStatus(transaction: TransactionDisplayUiModel): string {
    if (transaction.status === 'Returned') {
      return 'Returned';
    }
    
    return transaction.isOverdue ? 'Overdue' : 'Borrowed';
  }
  
  getStatusClass(transaction: TransactionDisplayUiModel): string {
    const status = this.calculateStatus(transaction);
    switch (status) {
      case 'Borrowed': return 'primary';
      case 'Returned': return 'success';
      case 'Overdue': return 'danger';
      default: return 'secondary';
    }
  }
  
  formatDate(date: string | null | undefined): string {
    if (!date) return 'N/A';
    if (date === '0001-01-01T00:00:00' || date === '0001-01-01') return 'N/A';
    
    return this.transactionService.formatDate(date);
  }
  
  viewTransactionDetails(transactionId: number): void {
    this.router.navigate(['/transactions', transactionId]);
  }
  
  returnBook(transactionId: number): void {
    this.router.navigate(['/transactions/return'], { 
      queryParams: { transactionId } 
    });
  }
  
  goBack(): void {
    this.location.back();
  }
  
  isAdminOrLibrarian(): boolean {
    return this.authService.hasRole('Admin') || this.authService.hasRole('Librarian');
  }
  
  // Calculate percentage for progress bar
  getPercentage(value: number, total: number): number {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }
  
  // Get formatted fine amount if transaction is overdue
  getFineAmount(transaction: TransactionDisplayUiModel): string {
    if (!transaction.isOverdue) return 'N/A';
    
    const fineAmount = transaction.fineAmount || 0;
    return `₹${fineAmount.toFixed(2)}`;
  }
  
  // Export transaction history to CSV
  exportToCSV(): void {
    if (this.filteredTransactions.length === 0) {
      this.snackBar.open('No data to export', 'Close', { duration: 3000 });
      return;
    }
    
    // Define CSV columns
    const headers = [
      'Transaction ID',
      'Book Title',
      'Borrow Date',
      'Due Date',
      'Return Date',
      'Status',
      'Days Overdue',
      'Fine Amount'
    ];
    
    // Map transactions to CSV rows
    const csvData = this.filteredTransactions.map(t => [
      t.transactionID,
      t.bookName,
      this.formatDate(t.borrowDate),
      this.formatDate(t.dueDate || ''),
      this.formatDate(t.returnDate || ''),
      this.calculateStatus(t),
      t.daysOverdue || 0,
      t.fineAmount ? `₹${t.fineAmount.toFixed(2)}` : 'N/A'
    ]);
    
    // Add headers row
    csvData.unshift(headers);
    
    // Convert to CSV string
    const csvContent = csvData.map(row => 
      row.map(cell => typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell).join(',')
    ).join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Set file name with member name or ID - Fix property references
    const memberName = this.member?.name 
      ? this.member.name.replace(/\s+/g, '_')
      : `member_${this.memberId}`;
    
    const fileName = `borrowing_history_${memberName}_${new Date().toISOString().slice(0, 10)}.csv`;
    
    // Download file
    link.href = url;
    link.download = fileName;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    this.snackBar.open('Export successful', 'Close', { duration: 3000 });
  }

  // Toggle filter panel
  toggleFilterPanel(): void {
    this.isFilterPanelExpanded = !this.isFilterPanelExpanded;
  }
}
