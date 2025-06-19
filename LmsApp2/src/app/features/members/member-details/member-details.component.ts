import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MemberService } from '../member.service';
import { TransactionService } from '../../transactions/transaction.service';
import { AuthService } from '../../auth/auth.service';
import { ConfirmationDialogService } from '../../../core/confirmation-dialog.service';
import { MemberResponseDto } from '../../../models/dtos/member-dtos';
import { BorrowingTransactionDto } from '../../../models/dtos/transaction-dtos';
import { NotificationService } from '../../notifications/notification.service';

@Component({
  selector: 'app-member-details',
  templateUrl: './member-details.component.html',
  styleUrls: ['./member-details.component.scss']
})
export class MemberDetailsComponent implements OnInit {
  member: MemberResponseDto | null = null;
  transactions: BorrowingTransactionDto[] = [];
  loading = false;
  loadingTransactions = false;
  error: string | null = null;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private memberService: MemberService,
    private transactionService: TransactionService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private confirmationService: ConfirmationDialogService,
    private notificationService: NotificationService
  ) {}
  
  ngOnInit() {
    // Only allow admins and librarians to view member details
    if (!this.authService.hasRole('Admin') && !this.authService.hasRole('Librarian')) {
      this.router.navigate(['/access-denied']);
      return;
    }
    
    this.loading = true;
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadMemberDetails(+id);
    } else {
      this.error = 'Member ID is required';
      this.loading = false;
    }
  }
  
  private loadMemberDetails(memberId: number) {
    this.memberService.getMember(memberId).subscribe({
      next: member => {
        this.member = member;
        this.loading = false;
        this.loadTransactionHistory(memberId);
      },
      error: err => {
        this.error = 'Failed to load member details: ' + (err.message || 'Unknown error');
        this.loading = false;
      }
    });
  }
  
  private loadTransactionHistory(memberId: number) {
    this.loadingTransactions = true;
    this.memberService.getMemberBorrowings(memberId).subscribe({
      next: transactions => {
        this.transactions = transactions;
        this.loadingTransactions = false;
      },
      error: err => {
        this.error = 'Failed to load transaction history: ' + (err.message || 'Unknown error');
        this.loadingTransactions = false;
      }
    });
  }
  
  isAdmin(): boolean {
    return this.authService.hasRole('Admin');
  }
  
  editMember() {
    if (!this.member) return;
    this.router.navigate(['/members/edit', this.member.memberID]);
  }
  
  viewFines(): void {
    if (!this.member) return;
    
    // Navigate to member-borrowings-fines component with fines tab active
    this.router.navigate(['/members', this.member.memberID, 'borrowings-fines'], { 
      queryParams: { tab: 'fines' } 
    });
  }

  viewBorrowings(): void {
    if (!this.member) return;
    
    // Navigate to member-borrowings-fines component
    this.router.navigate(['/members', this.member.memberID, 'borrowings-fines']);
  }
  
  // Add method to navigate to transaction history
  viewTransactionHistory(): void {
    if (!this.member) return;
    
    // Navigate to the member history component in the transactions module
    this.router.navigate(['/transactions/member', this.member.memberID]);
  }
  
  // Add method to initiate borrowing for this member
  borrowBook(): void {
    if (!this.member) return;
    
    // Navigate to borrow book component with member ID prefilled
    this.router.navigate(['/transactions/borrow'], { 
      queryParams: { memberId: this.member.memberID } 
    });
  }
  
  // Method to navigate to member's fines
  viewMemberFines(): void {
    if (this.member) {
      this.router.navigate(['/fines/member', this.member.memberID]);
    }
  }

  // Navigate to pay specific fine
  payFine(fineId: number): void {
    if (this.member) {
      this.router.navigate(['/fines/payment'], { 
        queryParams: { 
          fineId: fineId,
          memberId: this.member.memberID,
          returnUrl: `/members/${this.member.memberID}`
        } 
      });
    }
  }

  deleteMember() {
    if (!this.member) return;
    
    // Check if member can be deleted
    this.memberService.canDeleteMember(this.member.memberID).subscribe({
      next: response => {
        if (!response.canDelete) {
          this.snackBar.open(`Cannot delete member: ${response.reason}`, 'Close', { duration: 5000 });
          return;
        }
        
        // If member can be deleted, show confirmation dialog
        this.confirmationService.confirmDelete('member').subscribe(confirmed => {
          if (confirmed) {
            this.loading = true;
            this.memberService.deleteMember(this.member!.memberID).subscribe({
              next: () => {
                this.snackBar.open('Member deleted successfully', 'Close', { duration: 3000 });
                this.router.navigate(['/members']);
              },
              error: (err) => {
                this.error = 'Failed to delete member: ' + (err.message || 'Unknown error');
                this.loading = false;
              }
            });
          }
        });
      },
      error: err => {
        this.error = 'Failed to check if member can be deleted: ' + (err.message || 'Unknown error');
      }
    });
  }
  
  formatDate(date: string | null | undefined): string {
    if (!date) return 'N/A';
    // Parse as UTC to avoid timezone offset issues
    const d = new Date(date);
    // Use getUTC* methods to get the correct date parts
    const year = d.getUTCFullYear();
    const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = d.getUTCDate().toString().padStart(2, '0');
    return `${day}/${month}/${year}`;
  }
  
  isOverdue(transaction: BorrowingTransactionDto): boolean {
    if (transaction.status === 'Returned') return false;
    
    const dueDate = new Date(transaction.returnDate);
    const today = new Date();
    
    dueDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    return dueDate < today;
  }
  
  getTransactionStatus(transaction: BorrowingTransactionDto): string {
    if (transaction.status === 'Returned') {
      return 'Returned';
    }
    
    return this.isOverdue(transaction) ? 'Overdue' : 'Active';
  }

  // Add method to send membership status notification
  sendMembershipStatusNotification(): void {
    if (!this.member) return;
    
    this.confirmationService.confirm(
      `Send notification about membership status to ${this.member.name}?`,
      'Confirm Notification'
    ).subscribe(confirmed => {
      if (confirmed) {
        this.loading = true;
        this.notificationService.notifyMembershipStatus(
          this.member!.memberID, 
          this.member!.membershipStatus
        ).subscribe({
          next: () => {
            this.snackBar.open('Membership status notification sent successfully', 'Close', { duration: 3000 });
            this.loading = false;
          },
          error: (err) => {
            this.snackBar.open('Failed to send notification: ' + (err.message || 'Unknown error'), 'Close', {
              duration: 5000,
              panelClass: ['error-snackbar']
            });
            this.loading = false;
          }
        });
      }
    });
  }
}