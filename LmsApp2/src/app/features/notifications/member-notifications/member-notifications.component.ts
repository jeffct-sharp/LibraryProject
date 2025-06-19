import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationService } from '../notification.service';
import { NotificationDetailsDto } from '../../../models/dtos/notification-dtos';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-member-notifications',
  templateUrl: './member-notifications.component.html',
  styleUrls: ['./member-notifications.component.css']
})
export class MemberNotificationsComponent implements OnInit {
  notifications: NotificationDetailsDto[] = [];
  filteredNotifications: NotificationDetailsDto[] = [];
  loading = false;
  error: string | null = null;
  
  // Filter options
  showOlderNotifications = false;
  
  // Pagination
  itemsPerPage = 10;
  currentPage = 1;
  totalPages = 1;

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.getCurrentMemberNotifications();
  }

  getCurrentMemberNotifications(): void {
    const memberId = this.authService.getMemberId();
    if (memberId) {
      this.loadMemberNotifications(memberId);
    } else {
      this.error = 'Member details not found. Please log in to view your notifications.';
      this.snackBar.open('Authentication required', 'Log In', {
        duration: 5000
      }).onAction().subscribe(() => {
        this.router.navigate(['/auth/login']);
      });
    }
  }

  loadMemberNotifications(memberId: number): void {
    this.loading = true;
    this.error = null;
    
    this.notificationService.getMemberNotifications(memberId).subscribe({
      next: (data) => {
        this.notifications = data;
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load your notifications: ' + (err.message || 'Unknown error');
        this.loading = false;
        this.snackBar.open('Error loading notifications', 'Dismiss', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }
  
  applyFilters(): void {
    // Filter by date if showOlderNotifications is false
    if (!this.showOlderNotifications) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      this.filteredNotifications = this.notifications.filter(notification => {
        const notificationDate = new Date(notification.dateSent);
        return notificationDate >= thirtyDaysAgo;
      });
    } else {
      this.filteredNotifications = [...this.notifications];
    }
    
    // Sort by date (newest first)
    this.filteredNotifications.sort((a, b) => {
      return new Date(b.dateSent).getTime() - new Date(a.dateSent).getTime();
    });
    
    // Calculate pagination
    this.calculatePagination();
  }
  
  calculatePagination(): void {
    this.totalPages = Math.ceil(this.filteredNotifications.length / this.itemsPerPage);
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    } else if (this.totalPages === 0) {
      this.currentPage = 1;
    }
  }
  
  getCurrentPageItems(): NotificationDetailsDto[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredNotifications.slice(startIndex, endIndex);
  }
  
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }
  
  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }
  
  toggleOlderNotifications(): void {
    this.showOlderNotifications = !this.showOlderNotifications;
    this.applyFilters();
  }
  
  refreshNotifications(): void {
    this.getCurrentMemberNotifications();
  }
  
  formatDate(date: string): string {
    if (!date) return 'N/A';
    
    const now = new Date();
    const notificationDate = new Date(date);
    
    // If it's today, show time
    if (notificationDate.toDateString() === now.toDateString()) {
      return 'Today at ' + notificationDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If it's yesterday, show "Yesterday"
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (notificationDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday at ' + notificationDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Otherwise show the full date
    return notificationDate.toLocaleDateString() + ' at ' + 
           notificationDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // Calculate if notification is recent (within last 24 hours)
  isRecent(date: string): boolean {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffTime = Math.abs(now.getTime() - notificationDate.getTime());
    const diffHours = diffTime / (1000 * 60 * 60);
    return diffHours < 24;
  }
  
  // Returns timestamp in relative format
  getTimeAgo(date: string): string {
    return this.notificationService.getTimeAgo(date);
  }
  
  // Navigate to dashboard
  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
