import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FineService } from '../fine.service';
import { MemberService } from '../../members/member.service';
import { AuthService } from '../../auth/auth.service';
import { ConfirmationDialogService } from '../../../core/confirmation-dialog.service';
import { FineDetailsDto } from '../../../models/dtos/fine-dtos';
import { MemberResponseDto } from '../../../models/dtos/member-dtos';
import { catchError, forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-fine-detail',
  templateUrl: './fine-detail.component.html',
  styleUrls: ['./fine-detail.component.css']
})
export class FineDetailComponent implements OnInit {
  fine: FineDetailsDto | null = null;
  member: MemberResponseDto | null = null;
  memberName: string | null = null;
  loading = false;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fineService: FineService,
    private memberService: MemberService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private confirmationService: ConfirmationDialogService
  ) {}

  ngOnInit(): void {
    const fineId = this.route.snapshot.paramMap.get('id');
    if (fineId) {
      this.loadFineDetails(+fineId);
    } else {
      this.error = 'Fine ID is required';
    }
  }
  
  loadFineDetails(fineId: number): void {
    this.loading = true;
    this.error = null;
    
    // First, get the basic fine data
    this.fineService.getFineById(fineId).subscribe({
      next: (fine) => {
        this.fine = fine;
        
        // Always load member details if available
        if (fine.memberID) {
          this.loadMemberDetails(fine.memberID);
        } else {
          this.loading = false;
        }
      },
      error: (err) => {
        this.error = 'Failed to load fine details: ' + (err.message || 'Unknown error');
        this.loading = false;
      }
    });
  }

  loadMemberDetails(memberId: number): void {
    this.memberService.getMember(memberId).subscribe({
      next: (member) => {
        this.member = member;
        this.memberName = member.name;
        this.loading = false;
      },
      error: (err) => {
        // Even if member loading fails, we still have the fine data
        this.loading = false;
        console.error('Failed to load member details:', err);
        // Set a default member name using the ID
        this.memberName = `ID: ${memberId}`;
      }
    });
  }

  editFine(): void {
    if (!this.fine) return;
    
    // Only admins can edit fines
    if (!this.isAdmin()) {
      this.snackBar.open('You do not have permission to edit fines', 'Close', { duration: 3000 });
      return;
    }
    
    this.router.navigate(['/fines/edit', this.fine.fineID]);
  }

  deleteFine(): void {
    if (!this.fine) return;
    
    // Only admins can delete fines
    if (!this.isAdmin()) {
      this.snackBar.open('You do not have permission to delete fines', 'Close', { duration: 3000 });
      return;
    }
    
    // Only paid fines can be deleted
    if (this.fine.status !== 'Paid') {
      this.snackBar.open('Only paid fines can be deleted', 'Close', { duration: 3000 });
      return;
    }
    
    this.confirmationService.confirmDelete('fine').subscribe(confirmed => {
      if (confirmed) {
        this.loading = true;
        this.fineService.deleteFine(this.fine!.fineID).subscribe({
          next: () => {
            this.snackBar.open('Fine deleted successfully', 'Close', { duration: 3000 });
            this.router.navigate(['/fines']);
          },
          error: (err) => {
            this.error = 'Failed to delete fine: ' + (err.message || 'Unknown error');
            this.loading = false;
          }
        });
      }
    });
  }

  payFine(): void {
    if (!this.fine) return;
    
    // Only admins and librarians can process payments
    if (!this.isAdmin() && !this.isLibrarian()) {
      this.snackBar.open('You do not have permission to process payments', 'Close', { duration: 3000 });
      return;
    }
    
    // Only pending fines can be paid
    if (this.fine.status !== 'Pending') {
      this.snackBar.open('This fine has already been paid', 'Close', { duration: 3000 });
      return;
    }
    
    this.router.navigate(['/fines/payment'], { 
      queryParams: { fineId: this.fine.fineID } 
    });
  }

  isAdmin(): boolean {
    return this.authService.hasRole('Admin');
  }

  isLibrarian(): boolean {
    return this.authService.hasRole('Librarian');
  }

  formatDate(date: string | undefined | null): string {
    if (!date) return 'N/A';
    return this.fineService.formatDate(date);
  }
  
  formatCurrency(amount: number): string {
    return '₹' + amount.toFixed(2);
  }
  
  getStatusClass(status: string): string {
    return status === 'Paid' ? 'bg-success' : 'bg-warning';
  }
  
  goToMemberDetails(): void {
    if (this.fine) {
      this.router.navigate(['/members', this.fine.memberID]);
    }
  }

  goBack(): void {
    // Check if we should go back to member-specific fines
    const memberId = this.member?.memberID;
    if (memberId) {
      // Check if we came from member fines
      const navigation = this.router.getCurrentNavigation();
      const fromMember = navigation?.previousNavigation?.finalUrl?.toString().includes(`/members/${memberId}`);
      
      if (fromMember) {
        this.router.navigate(['/members', memberId]);
        return;
      }
      
      // If member context is present, go to member's fines
      this.router.navigate(['/fines/member', memberId]);
      return;
    }
    
    // Default: go to fines list
    this.router.navigate(['/fines']);
  }
}
