import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NotificationsRoutingModule } from './notifications-routing.module';

// Import all your notification components
import { NotificationListComponent } from './notification-list/notification-list.component';
import { NotificationFormComponent } from './notification-form/notification-form.component';
import { NotificationDetailComponent } from './notification-detail/notification-detail.component';
import { MemberNotificationsComponent } from './member-notifications/member-notifications.component';
import { NotificationDashboardWidgetComponent } from './notification-dashboard-widget/notification-dashboard-widget.component';

// Angular Material Imports
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
// Add this import to fix the DateAdapter error
import { MatNativeDateModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDividerModule } from '@angular/material/divider';

// Services
import { NotificationService } from './notification.service';
import { RealTimeNotificationService } from './real-time-notification.service';

@NgModule({
  declarations: [
    NotificationListComponent,
    NotificationFormComponent,
    NotificationDetailComponent,
    MemberNotificationsComponent,
    NotificationDashboardWidgetComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NotificationsRoutingModule,
    // Material modules
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,  // Add this module to provide DateAdapter
    MatCardModule,
    MatProgressSpinnerModule,
    MatListModule,
    MatChipsModule,
    MatBadgeModule,
    MatTooltipModule,
    MatMenuModule,
    MatExpansionModule,
    MatSlideToggleModule,
    MatDividerModule
  ],
  providers: [
    NotificationService,
    RealTimeNotificationService
  ],
  exports: [
    NotificationDashboardWidgetComponent
  ]
})
export class NotificationsModule { }
