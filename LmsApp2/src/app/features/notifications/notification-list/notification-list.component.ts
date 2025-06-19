import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationService } from '../notification.service';
import { ConfirmationDialogService } from '../../../core/confirmation-dialog.service';
import { NotificationDetailsDto } from '../../../models/dtos/notification-dtos';
import { NotificationFilterUiModel, NotificationSummaryUiModel } from '../../../models/ui-models/notification-ui-models';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-notification-list',
  templateUrl: './notification-list.component.html',
  styleUrls: ['./notification-list.component.scss']
})
export class NotificationListComponent implements OnInit {
  dataSource = new MatTableDataSource<NotificationDetailsDto>();
  displayedColumns: string[] = ['notificationId', 'memberId', 'message', 'dateSent', 'actions'];
  filterForm: FormGroup;
  loading = false;
  error: string | null = null;
  searchName = '';
  
  // Card view mode
  viewMode: 'table' | 'card' = 'table';
  
  // Notification summary
  summary: NotificationSummaryUiModel = { total: 0, recent: 0 };
  
  // Member-specific mode
  isMemberSpecific = false;
  memberId: number | null = null;
  memberName: string | null = null;
  
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  
  // For notification actions
  actionStates = {
    dueBooks: false,
    overdueBooks: false,
    finePayment: false,
    periodicChecks: false
  };
  
  // For fine payment prompt
  showFineIdPrompt = false;
  fineIdForPayment: number | null = null;
  
  constructor(
    private notificationService: NotificationService,
    private authService: AuthService,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private confirmationService: ConfirmationDialogService
  ) {
    this.filterForm = this.fb.group({
      memberName: [''],
      fromDate: [null],
      toDate: [null],
      searchTerm: ['']
    });
  }

  ngOnInit(): void {
    // Check if we're in member-specific mode
    this.route.data.subscribe(data => {
      this.isMemberSpecific = !!data['isMemberSpecific'];
    });

    this.route.params.subscribe(params => {
      if (params['id']) {
        this.memberId = +params['id'];
        this.loadMemberNotifications(this.memberId);
      } else {
        this.loadNotifications();
        this.loadSummary();
      }
    });
    
    // Subscribe to filter changes
    this.filterForm.valueChanges.subscribe(() => {
      this.applyFilters();
    });
  }
  
  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadNotifications(): void {
    this.loading = true;
    this.error = null;
    
    const filter: NotificationFilterUiModel = this.getFilterValues();
    
    this.notificationService.getAllNotifications(filter).subscribe({
      next: (data) => {
        this.dataSource.data = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load notifications: ' + (err.message || 'Unknown error');
        this.loading = false;
      }
    });
  }
  
  loadMemberNotifications(memberId: number): void {
    this.loading = true;
    this.error = null;
    
    this.notificationService.getMemberNotifications(memberId).subscribe({
      next: (data) => {
        this.dataSource.data = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load member notifications: ' + (err.message || 'Unknown error');
        this.loading = false;
      }
    });
  }
  
  loadSummary(): void {
    this.notificationService.getNotificationSummary().subscribe({
      next: (summary) => {
        this.summary = summary;
      },
      error: () => {
        // Silently fail - not critical
        this.summary = { total: 0, recent: 0 };
      }
    });
  }
  
  getFilterValues(): NotificationFilterUiModel {
    const values = this.filterForm.value;
    const filter: NotificationFilterUiModel = {};
    
    if (values.memberName) filter.memberName = values.memberName;
    if (values.fromDate) filter.fromDate = values.fromDate;
    if (values.toDate) filter.toDate = values.toDate;
    if (values.searchTerm) filter.searchTerm = values.searchTerm;
    
    return filter;
  }
  
  applyFilters(): void {
    const filterValues = this.filterForm.value;
    
    this.dataSource.filterPredicate = (data: NotificationDetailsDto, filter: string) => {
      // Member name/ID filter
      if (filterValues.memberName && 
          !String(data.memberID).includes(filterValues.memberName.toLowerCase())) {
        return false;
      }
      
      // Message search
      if (filterValues.searchTerm && 
          !data.message.toLowerCase().includes(filterValues.searchTerm.toLowerCase())) {
        return false;
      }
      
      // Date range - from date
      if (filterValues.fromDate) {
        const fromDate = new Date(filterValues.fromDate);
        const dateSent = new Date(data.dateSent);
        if (dateSent < fromDate) {
          return false;
        }
      }
      
      // Date range - to date
      if (filterValues.toDate) {
        const toDate = new Date(filterValues.toDate);
        toDate.setHours(23, 59, 59, 999); // End of day
        const dateSent = new Date(data.dateSent);
        if (dateSent > toDate) {
          return false;
        }
      }
      
      return true;
    };
    
    this.dataSource.filter = 'APPLY_FILTERS';
  }
  
  resetFilters(): void {
    this.filterForm.reset();
    this.dataSource.filter = '';
  }

  searchByMemberName(): void {
    if (!this.searchName.trim()) {
      this.loadNotifications();
      return;
    }
    
    this.filterForm.patchValue({
      memberName: this.searchName.trim()
    });
  }
  
  clearSearch(): void {
    this.searchName = '';
    this.resetFilters();
    this.loadNotifications();
  }

  refresh(): void {
    this.resetFilters();
    if (this.isMemberSpecific && this.memberId) {
      this.loadMemberNotifications(this.memberId);
    } else {
      this.loadNotifications();
      this.loadSummary();
    }
  }

  viewNotification(id: number): void {
    this.router.navigate(['/notifications', id]);
  }

  deleteNotification(id: number): void {
    this.confirmationService.confirmDelete('notification').subscribe(confirmed => {
      if (confirmed) {
        this.loading = true;
        this.notificationService.deleteNotification(id).subscribe({
          next: () => {
            if (this.isMemberSpecific && this.memberId) {
              this.loadMemberNotifications(this.memberId);
            } else {
              this.loadNotifications();
              this.loadSummary();
            }
            this.snackBar.open('Notification deleted successfully', 'Close', { duration: 3000 });
          },
          error: (err) => {
            this.error = 'Failed to delete notification: ' + (err.message || 'Unknown error');
            this.loading = false;
          }
        });
      }
    });
  }
  
  notifyDueBooks(): void {
    this.confirmationService.confirm(
      'This will send notifications to all members with books due soon. Continue?',
      'Confirm Action'
    ).subscribe(confirmed => {
      if (confirmed) {
        this.loading = true;
        this.actionStates.dueBooks = true;
        
        this.notificationService.notifyDueBooks().subscribe({
          next: () => {
            this.snackBar.open('Due book notifications sent successfully', 'Close', { duration: 3000 });
            this.loading = false;
            this.actionStates.dueBooks = false;
            this.refresh();
          },
          error: (err) => {
            this.error = 'Failed to send due book notifications: ' + (err.message || 'Unknown error');
            this.loading = false;
            this.actionStates.dueBooks = false;
          }
        });
      }
    });
  }
  
  notifyOverdueBooks(): void {
    this.confirmationService.confirm(
      'This will send notifications to all members with overdue books. Continue?',
      'Confirm Action',
      'warning'
    ).subscribe(confirmed => {
      if (confirmed) {
        this.loading = true;
        this.actionStates.overdueBooks = true;
        
        this.notificationService.notifyOverdueBooks().subscribe({
          next: () => {
            this.snackBar.open('Overdue book notifications sent successfully', 'Close', { duration: 3000 });
            this.loading = false;
            this.actionStates.overdueBooks = false;
            this.refresh();
          },
          error: (err) => {
            this.error = 'Failed to send overdue book notifications: ' + (err.message || 'Unknown error');
            this.loading = false;
            this.actionStates.overdueBooks = false;
          }
        });
      }
    });
  }
  
  promptForFinePayment(): void {
    this.showFineIdPrompt = true;
    this.fineIdForPayment = null;
  }
  
  cancelFineIdPrompt(): void {
    this.showFineIdPrompt = false;
    this.fineIdForPayment = null;
  }
  
  sendFinePaymentNotification(): void {
    if (!this.fineIdForPayment) return;
    
    this.showFineIdPrompt = false;
    this.loading = true;
    this.actionStates.finePayment = true;
    
    this.notificationService.notifyFinePayment(this.fineIdForPayment).subscribe({
      next: () => {
        this.snackBar.open(`Fine payment notification sent successfully`, 'Close', { duration: 3000 });
        this.loading = false;
        this.actionStates.finePayment = false;
        this.refresh();
      },
      error: (err) => {
        this.error = 'Failed to send fine payment notification: ' + (err.message || 'Unknown error');
        this.loading = false;
        this.actionStates.finePayment = false;
      }
    });
  }
  
  performPeriodicChecks(): void {
    this.confirmationService.confirm(
      'This will perform all periodic checks and send relevant notifications. Continue?',
      'Confirm Action'
    ).subscribe(confirmed => {
      if (confirmed) {
        this.loading = true;
        this.actionStates.periodicChecks = true;
        
        this.notificationService.performPeriodicChecks().subscribe({
          next: () => {
            this.snackBar.open('Periodic checks completed successfully', 'Close', { duration: 3000 });
            this.loading = false;
            this.actionStates.periodicChecks = false;
            this.loadNotifications();
            this.loadSummary();
          },
          error: (err) => {
            this.error = 'Failed to perform checks: ' + (err.message || 'Unknown error');
            this.loading = false;
            this.actionStates.periodicChecks = false;
          }
        });
      }
    });
  }
  
  toggleView(): void {
    this.viewMode = this.viewMode === 'table' ? 'card' : 'table';
  }
  
  navigateToCreate(): void {
    this.router.navigate(['/notifications/add']);
  }
  
  isAdmin(): boolean {
    return this.authService.hasRole('Admin');
  }
  
  isLibrarian(): boolean {
    return this.authService.hasRole('Librarian');
  }
  
  canManageNotifications(): boolean {
    return this.isAdmin() || this.isLibrarian();
  }
  
  formatDate(date: string): string {
    return this.notificationService.formatDate(date);
  }
  
  getTimeAgo(date: string): string {
    return this.notificationService.getTimeAgo(date);
  }
}
