import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { MemberService } from '../member.service';
import { MemberResponseDto } from '../../../models/dtos/member-dtos';
import { MemberFilterUiModel } from '../../../models/ui-models/member-ui-models';
import { ConfirmationDialogService } from '../../../core/confirmation-dialog.service';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-member-list',
  templateUrl: './member-list.component.html',
  styleUrls: ['./member-list.component.scss']
})
export class MemberListComponent implements OnInit {
  members: MemberResponseDto[] = [];
  dataSource = new MatTableDataSource<MemberResponseDto>([]);
  loading = false;
  error: string | null = null;
  filterForm: FormGroup;
  
  nameFilter = new FormControl('');
  hasOverdueControl = new FormControl(false);
  hasFinesControl = new FormControl(false);
  
  displayedColumns = ['memberID', 'name', 'email', 'phone', 'membershipStatus', 'actions'];
  
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  currentFilters: MemberFilterUiModel = {
    page: 1,
    pageSize: 10
  };

  searchTerm: string = '';
  filteredMembers: MemberResponseDto[] = [];

  constructor(
    private memberService: MemberService,
    private confirmationService: ConfirmationDialogService,
    private authService: AuthService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.filterForm = this.fb.group({
      name: [''],
      email: [''],
      status: [''],
      hasOverdue: [false],
      hasFines: [false]
    });
  }

  ngOnInit() {
    this.loadMembers();
    
    // Subscribe to filter changes
    this.nameFilter.valueChanges.subscribe(() => {
      this.applyFilters();
    });
    
    this.hasOverdueControl.valueChanges.subscribe(() => {
      this.applyFilters();
    });
    
    this.hasFinesControl.valueChanges.subscribe(() => {
      this.applyFilters();
    });
    
    this.filterForm.valueChanges.subscribe(() => {
      this.applyFilters();
    });
  }
  
  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadMembers() {
    this.loading = true;
    this.memberService.getMembers().subscribe({
      next: data => {
        this.members = data;
        this.dataSource.data = this.members;
        this.loading = false;
      },
      error: err => {
        this.error = 'Failed to load members: ' + (err.message || 'Unknown error');
        this.loading = false;
      }
    });
  }

  applyFilters() {
    const nameValue = this.nameFilter.value || '';
    const hasOverdue = this.hasOverdueControl.value;
    const hasFines = this.hasFinesControl.value;
    const filterValues = this.filterForm.value as MemberFilterUiModel;
    
    this.dataSource.filterPredicate = (data: MemberResponseDto, filter: string) => {
      // Name filter - only apply if the filter value exists and the property exists
      if (nameValue.trim() !== '' && data.name && typeof data.name === 'string') {
        if (!data.name.toLowerCase().includes(nameValue.toLowerCase())) {
          return false;
        }
      }
      
      // Email filter - only apply if the filter value exists and the property exists
      if (filterValues.email && filterValues.email.trim() !== '' &&
          data.email && typeof data.email === 'string') {
        if (!data.email.toLowerCase().includes(filterValues.email.toLowerCase())) {
          return false;
        }
      }
      
      // Status filter - only apply if the filter value exists and the property exists
      if (filterValues.status && filterValues.status.trim() !== '' &&
          data.membershipStatus && typeof data.membershipStatus === 'string') {
        if (data.membershipStatus !== filterValues.status) {
          return false;
        }
      }
      
      // For the overdue and fines filters, we'll check if properties exist in the object
      // using type assertion and handle the case where they might not be available
      
      // Overdue filter - check if the property exists before filtering
      if (hasOverdue === true) {
        const member = data as any; // Use type assertion to access potential properties
        if (typeof member.overdueItems !== 'undefined') {
          if (member.overdueItems <= 0) {
            return false;
          }
        }
        // If the property doesn't exist, we'll skip this filter
      }
      
      // Fines filter - check if the property exists before filtering
      if (hasFines === true) {
        const member = data as any; // Use type assertion to access potential properties
        if (typeof member.outstandingFines !== 'undefined') {
          if (member.outstandingFines <= 0) {
            return false;
          }
        }
        // If the property doesn't exist, we'll skip this filter
      }
      
      return true;
    };
    
    // Trigger filtering
    this.dataSource.filter = 'APPLY_FILTERS';
  }

  resetFilters() {
    this.filterForm.reset({
      name: '',
      email: '',
      status: '',
      hasOverdue: false,
      hasFines: false
    });
    
    this.nameFilter.setValue('');
    this.hasOverdueControl.setValue(false);
    this.hasFinesControl.setValue(false);
    
    // Clear the filter
    this.dataSource.filter = '';
  }

  /**
   * Search members with the current search term
   */
  searchMembers(): void {
    if (!this.searchTerm || !this.searchTerm.trim()) {
      this.loadMembers();
      return;
    }
    
    this.loading = true;
    this.error = null;
    
    // Client-side filtering approach
    const searchTermLower = this.searchTerm.toLowerCase();
    const filteredMembers = this.dataSource.data.filter(member => 
      (member.name && member.name.toLowerCase().includes(searchTermLower)) || 
      (member.email && member.email.toLowerCase().includes(searchTermLower)) ||
      member.memberID.toString().includes(this.searchTerm)
    );
    
    // Update the data source
    this.dataSource.data = filteredMembers;
    this.filteredMembers = filteredMembers;
    this.loading = false;
    
    // Make sure pagination is updated
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
    
    // Make sure sorting is applied
    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
  }

  // Add client-side filtering as fallback
  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value.toLowerCase();
    
    // If server-side search fails, use client-side filtering
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  delete(id: number) {
    // First check if member can be deleted
    this.memberService.canDeleteMember(id).subscribe({
      next: response => {
        if (!response.canDelete) {
          this.snackBar.open(`Cannot delete member: ${response.reason}`, 'Close', { duration: 5000 });
          return;
        }
        
        // If member can be deleted, show confirmation dialog
        this.confirmationService.confirmDelete('member').subscribe(confirmed => {
          if (confirmed) {
            this.loading = true;
            this.memberService.deleteMember(id).subscribe({
              next: () => {
                this.snackBar.open('Member deleted successfully', 'Close', { duration: 3000 });
                this.loadMembers();
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
  
  getStatusClass(status: string): string {
    return status === 'Active' ? 'status-active' : 'status-suspended';
  }
  
  formatDate(date: string | null | undefined): string {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString();
    } catch (e) {
      return 'N/A';
    }
  }
  
  // Update navigation methods for transaction-related functionality
  viewBorrowings(id: number) {
    // Choose the appropriate route based on user role
    if (this.isAdmin() || this.isLibrarian()) {
      // Admin/Librarian view member's borrowings in the members module
      this.router.navigate(['/members', id, 'borrowings-fines']);
    } else {
      // Regular users view member's transactions in the transactions module
      this.router.navigate(['/transactions/member', id]);
    }
  }
  
  // Add method to navigate to transaction history
  viewTransactionHistory(id: number) {
    this.router.navigate(['/transactions/member', id]);
  }
  
  // Add method to initiate borrowing for a member
  borrowForMember(id: number) {
    if (this.isAdmin() || this.isLibrarian()) {
      this.router.navigate(['/transactions/borrow'], { 
        queryParams: { memberId: id } 
      });
    } else {
      this.snackBar.open('Only administrators and librarians can borrow books for members', 'Close', {
        duration: 3000
      });
    }
  }
  
  // Navigate to member's fines
  viewMemberFines(memberId: number): void {
    this.router.navigate(['/fines/member', memberId]);
  }
  
  isAdmin(): boolean {
    return this.authService.hasRole('Admin');
  }
  
  isLibrarian(): boolean {
    return this.authService.hasRole('Librarian');
  }
}
