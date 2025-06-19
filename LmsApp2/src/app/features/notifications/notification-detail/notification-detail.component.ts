import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationService } from '../notification.service';
import { NotificationDetailsDto } from '../../../models/dtos/notification-dtos';
import { ConfirmationDialogService } from '../../../core/confirmation-dialog.service';
import { AuthService } from '../../auth/auth.service';
import { Location } from '@angular/common';
import { MemberService } from '../../members/member.service';

@Component({
  selector: 'app-notification-detail',
  templateUrl: './notification-detail.component.html',
  styleUrls: ['./notification-detail.component.css']
})
export class NotificationDetailComponent implements OnInit {
  notification?: NotificationDetailsDto;
  loading = false;
  error: string | null = null;
  notificationId: number = 0;
  memberName: string | null = null;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private notificationService: NotificationService,
    private memberService: MemberService,
    private snackBar: MatSnackBar,
    private confirmService: ConfirmationDialogService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.notificationId = Number(idParam);
      this.loadNotificationDetails();
    } else {
      this.error = 'No notification ID provided.';
    }
  }

  loadNotificationDetails(): void {
    this.loading = true;
    this.error = null;
    
    this.notificationService.getNotification(this.notificationId).subscribe({
      next: (data) => {
        this.notification = data;
        this.loading = false;
        
        // Try to get member name
        if (data.memberID) {
          this.loadMemberName(data.memberID);
        }
      },
      error: (err) => {
        this.error = 'Failed to load notification: ' + (err.message || 'Unknown error');
        this.loading = false;
        this.snackBar.open('Error loading notification details', 'Dismiss', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }
  
  loadMemberName(memberId: number): void {
    this.memberService.getMember(memberId).subscribe({
      next: (member) => {
        this.memberName = member.name;
      },
      error: () => {
        // Silently fail - not critical
        this.memberName = null;
      }
    });
  }

  deleteNotification(): void {
    if (!this.notification) return;
    
    this.confirmService.confirmDelete('notification').subscribe(confirmed => {
      if (confirmed) {
        this.loading = true;
        this.notificationService.deleteNotification(this.notification!.notificationID).subscribe({
          next: () => {
            this.snackBar.open('Notification deleted successfully', 'Close', { duration: 3000 });
            this.router.navigate(['/notifications']);
          },
          error: (err) => {
            this.error = 'Failed to delete notification: ' + (err.message || 'Unknown error');
            this.loading = false;
            this.snackBar.open('Error deleting notification', 'Dismiss', {
              duration: 5000,
              panelClass: ['error-snackbar']
            });
          }
        });
      }
    });
  }

  goBack(): void {
    // Try to go back to previous page
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/notifications']);
    }
  }

  // Format the date for display
  formatDate(date: any): string {
    return this.notificationService.formatDate(date);
  }
  
  // Get time ago string
  getTimeAgo(date: any): string {
    return this.notificationService.getTimeAgo(date);
  }

  // Check if current user can delete this notification
  canDelete(): boolean {
    // Allow admins and librarians to delete
    return this.authService.hasRole('Admin') || this.authService.hasRole('Librarian');
  }

  // View member details
  viewMember(): void {
    if (!this.notification) return;
    this.router.navigate(['/members', this.notification.memberID]);
  }
  
  // View all notifications for this member
  viewMemberNotifications(): void {
    if (!this.notification) return;
    this.router.navigate(['/notifications/member', this.notification.memberID]);
  }
}
