import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { MemberService } from '../member.service';
import { TransactionService } from '../../transactions/transaction.service';
import { FineService } from '../../fines/fine.service';
import { AuthService } from '../../auth/auth.service';
import { MemberResponseDto } from '../../../models/dtos/member-dtos';
import { BorrowingTransactionDto } from '../../../models/dtos/transaction-dtos';
import { FineDetailsDto } from '../../../models/dtos/fine-dtos';
import { MemberProfileUiModel } from '../../../models/ui-models/member-ui-models';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ServiceMediatorService, EventTypes } from '../../../core/services/service-mediator.service';

@Component({
  selector: 'app-member-profile',
  templateUrl: './member-profile.component.html',
  styleUrls: ['./member-profile.component.scss']
})
export class MemberProfileComponent implements OnInit, OnDestroy {
  member: MemberResponseDto | null = null;
  profileData: MemberProfileUiModel | null = null;
  transactions: BorrowingTransactionDto[] = [];
  pendingFines: FineDetailsDto[] = [];
  loading = false;
  loadingTransactions = false;
  loadingFines = false;
  error: string | null = null;
  
  // These properties will be derived from other data
  memberActiveBorrowings = 0;
  memberOverdueItems = 0;
  memberOutstandingFines = 0;
  
  private destroy$ = new Subject<void>();
  
  // Constants that match transaction service
  private readonly BORROWING_PERIOD_DAYS = 14;
  private readonly NOT_RETURNED_DATE = '0001-01-01T00:00:00';
  
  constructor(
    private memberService: MemberService,
    private transactionService: TransactionService,
    private fineService: FineService,
    private authService: AuthService,
    private serviceMediator: ServiceMediatorService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadMemberProfile();
    
    // Subscribe to member updates with event type checking
    this.serviceMediator.on(EventTypes.MEMBER_UPDATED)
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        // Check the event type to determine the appropriate action
        if (event && event.type) {
          if (event.type === 'fine_paid' || event.type === 'fine_created') {
            this.refreshFines();
          } else if (event.type === 'book_borrowed' || event.type === 'book_returned') {
            this.refreshBorrowings();
          }
        }
      });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMemberProfile(): void {
    this.loading = true;
    this.error = null;
    
    // Use the getCurrentMemberProfile method from the member service
    this.memberService.getCurrentMemberProfile().subscribe({
      next: (data) => {
        this.member = data;
        this.loading = false;
        
        // Once the profile is loaded, load borrowing history and fines
        if (this.member && this.member.memberID) {
          this.loadTransactions(this.member.memberID);
          this.loadFines(this.member.memberID);
        }
      },
      error: (err) => {
        this.error = err.message || 'Failed to load profile';
        this.loading = false;
        console.error('Profile loading error:', err);
      }
    });
  }
  
  loadTransactions(memberId: number): void {
    this.loadingTransactions = true;
    this.memberService.getMemberBorrowings(memberId).subscribe({
      next: transactions => {
        this.transactions = transactions;
        
        // Calculate active borrowings and overdue items
        this.memberActiveBorrowings = transactions.filter(t => t.status !== 'Returned').length;
        this.memberOverdueItems = transactions.filter(t => this.isOverdue(t)).length;
        
        // Now we can build the profile data with correct statistics
        this.updateProfileData();
        this.loadingTransactions = false;
      },
      error: err => {
        this.error = 'Failed to load transactions: ' + (err.message || 'Unknown error');
        this.loadingTransactions = false;
      }
    });
  }
  
  loadFines(memberId: number): void {
    this.loadingFines = true;
    this.memberService.getMemberFines(memberId).subscribe({
      next: fines => {
        this.pendingFines = fines.filter(fine => fine.status === 'Pending');
        // Calculate outstanding fines
        this.memberOutstandingFines = this.getTotalFineAmount();
        
        // Update profile data with fines info
        this.updateProfileData();
        this.loadingFines = false;
      },
      error: err => {
        this.error = 'Failed to load fines: ' + (err.message || 'Unknown error');
        this.loadingFines = false;
      }
    });
  }
  
  refreshFines(): void {
    if (this.member?.memberID) {
      this.loadFines(this.member.memberID);
    }
  }
  
  refreshBorrowings(): void {
    if (this.member?.memberID) {
      this.loadTransactions(this.member.memberID);
    }
  }
  
  // Build or update the profile data UI model with all stats
  private updateProfileData(): void {
    if (!this.member) return;
    
    // Only update if we have loaded both transactions and fines
    if (!this.loadingTransactions && !this.loadingFines) {
      this.profileData = {
        memberInfo: {
          id: this.member.memberID,
          name: this.member.name,
          email: this.member.email,
          phone: this.member.phone || '',
          address: this.member.address || '',
          status: this.member.membershipStatus
        },
        borrowingStats: {
          totalBorrowed: this.transactions.length,
          currentlyBorrowed: this.memberActiveBorrowings,
          overdue: this.memberOverdueItems,
          fines: this.getTotalFineAmount()
        }
      };
      
      this.loading = false;
    }
  }
  
  editProfile(): void {
    if (!this.member) return;
    this.router.navigate(['/members/edit', this.member.memberID]);
  }
  
  viewAllTransactions(): void {
    if (!this.member) return;
    
    // Navigate to the member's borrowings-fines component
    this.router.navigate(['/members', this.member.memberID, 'borrowings-fines']);
  }
  
  viewFines(): void {
    if (!this.member) return;
    
    // Navigate to borrowings-fines component with the fines tab active
    this.router.navigate(['/members', this.member.memberID, 'borrowings-fines'], { 
      queryParams: { tab: 'fines' } 
    });
  }
  
  borrowBook(): void {
    // Navigate to the books list to select a book to borrow
    this.router.navigate(['/books']);
  }
  
  getTotalFineAmount(): number {
    return this.pendingFines.reduce((total, fine) => total + fine.amount, 0);
  }
  
  getStatusClass(status: string): string {
    return status === 'Returned' ? 'bg-success' : 
           status === 'Overdue' ? 'bg-danger' : 'bg-warning';
  }
  
  isOverdue(transaction: BorrowingTransactionDto): boolean {
    // If already returned, it's not overdue
    if (transaction.status === 'Returned') return false;

    // Check for special "not returned" date values
    const notReturnedValues = ['0001-01-01T00:00:00', '0001-01-01'];
    if (transaction.returnDate && !notReturnedValues.includes(transaction.returnDate)) {
      // If returnDate exists and is not a "not returned" value, this is the actual return date
      return false;
    }

    // Calculate the due date based on borrow date plus the standard borrowing period
    const borrowDate = new Date(transaction.borrowDate);
    const dueDate = new Date(borrowDate);
    dueDate.setDate(dueDate.getDate() + this.BORROWING_PERIOD_DAYS); // Standard 14-day borrowing period

    const today = new Date();
    
    // Strip time for consistent comparison
    dueDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    return dueDate < today;
  }

  calculateDaysOverdue(transaction: BorrowingTransactionDto): number {
    if (transaction.status === 'Returned' || !this.isOverdue(transaction)) {
      return 0;
    }
    
    const today = new Date();
    const borrowDate = new Date(transaction.borrowDate);
    const dueDate = new Date(borrowDate);
    dueDate.setDate(dueDate.getDate() + this.BORROWING_PERIOD_DAYS); // Standard 14-day borrowing period
    
    // Strip time for accurate day calculation
    dueDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = Math.abs(today.getTime() - dueDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  getTransactionStatus(transaction: BorrowingTransactionDto): string {
    if (transaction.status === 'Returned') {
      return 'Returned';
    }
    
    return this.isOverdue(transaction) ? 'Overdue' : 'Active';
  }
  
  calculateDueDate(borrowDate: string): Date {
    const borrowDateObj = new Date(borrowDate);
    const dueDate = new Date(borrowDateObj);
    dueDate.setDate(dueDate.getDate() + this.BORROWING_PERIOD_DAYS);
    return dueDate;
  }

  formatDueDate(borrowDate: string): string {
    if (!borrowDate) return 'N/A';
    const dueDate = this.calculateDueDate(borrowDate);
    return dueDate.toLocaleDateString();
  }
  
  calculatePotentialFine(transaction: BorrowingTransactionDto): number {
    const overdueDays = this.calculateDaysOverdue(transaction);
    
    if (overdueDays <= 0) {
      return 0;
    }
    
    // Base fine: ₹10 per day, capped at ₹300
    const baseFine = Math.min(overdueDays * 10, 300);
    
    // Additional suspension fee of ₹200 if more than 30 days overdue
    const suspensionFee = overdueDays > 30 ? 200 : 0;
    
    return baseFine + suspensionFee;
  }
  
  formatDate(date: string): string {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString();
    } catch (e) {
      return 'Invalid Date';
    }
  }
  
  formatCurrency(amount: number): string {
    return '₹' + amount.toFixed(2);
  }
}
