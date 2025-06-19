import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationService } from '../notification.service';
import { NotificationDetailsDto } from '../../../models/dtos/notification-dtos';
import { AuthService } from '../../auth/auth.service';
import { Subscription, interval } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-notification-dashboard-widget',
  templateUrl: './notification-dashboard-widget.component.html',
  styleUrls: ['./notification-dashboard-widget.component.css']
})
export class NotificationDashboardWidgetComponent implements OnInit, OnDestroy {
  recentNotifications: NotificationDetailsDto[] = [];
  loading = true;
  error: string | null = null;
  currentUserId: number | null = null;
  
  // Auto-refresh subscriptions
  private refreshSubscription?: Subscription;
  private readonly REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.currentUserId = this.getCurrentMemberId();
    this.loadRecentNotifications();
    this.setupAutoRefresh();
  }
  
  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  private getCurrentMemberId(): number | null {
    return this.authService.getCurrentUser()?.memberId || null;
  }
  
  private setupAutoRefresh(): void {
    // Auto-refresh notifications every 5 minutes
    this.refreshSubscription = interval(this.REFRESH_INTERVAL)
      .pipe(
        startWith(0),
        switchMap(() => {
          // Only refresh if we have a user ID and we're not already loading
          if (this.currentUserId && !this.loading) {
            this.loading = true;
            return this.notificationService.getMemberNotifications(this.currentUserId);
          }
          return [];
        })
      )
      .subscribe({
        next: (notifications) => {
          if (notifications.length > 0) {
            this.updateNotifications(notifications);
          }
          this.loading = false;
        },
        error: () => {
          // Silent fail on auto-refresh
          this.loading = false;
        }
      });
  }

  loadRecentNotifications(): void {
    if (!this.currentUserId) {
      this.loading = false;
      this.recentNotifications = [];
      return;
    }

    this.loading = true;
    this.error = null;
    
    this.notificationService.getMemberNotifications(this.currentUserId).subscribe({
      next: (notifications) => {
        this.updateNotifications(notifications);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading recent notifications:', err);
        this.error = 'Failed to load notifications';
        this.loading = false;
      }
    });
  }
  
  private updateNotifications(notifications: NotificationDetailsDto[]): void {
    // Sort by date (newest first) and take the most recent ones
    this.recentNotifications = notifications
      .sort((a, b) => new Date(b.dateSent).getTime() - new Date(a.dateSent).getTime())
      .slice(0, 5); // Only show 5 most recent
  }

  navigateToNotificationCenter(): void {
    this.router.navigate(['/notifications/my-notifications']);
  }

  refreshNotifications(): void {
    if (this.currentUserId) {
      this.loading = true;
      this.error = null;
      this.loadRecentNotifications();
    }
  }

  formatTimeAgo(date: string): string {
    return this.notificationService.getTimeAgo(date);
  }
  
  formatDate(date: string): string {
    return this.notificationService.formatDate(date);
  }
  
  // Check if notification is from today
  isToday(date: string): boolean {
    const today = new Date();
    const notificationDate = new Date(date);
    return today.toDateString() === notificationDate.toDateString();
  }
  
  // Check if notification is from yesterday
  isYesterday(date: string): boolean {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    const notificationDate = new Date(date);
    return yesterday.toDateString() === notificationDate.toDateString();
  }
  
  // Check if notification is recent (last 24 hours)
  isRecent(date: string): boolean {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffMs = now.getTime() - notificationDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours < 24;
  }
}
