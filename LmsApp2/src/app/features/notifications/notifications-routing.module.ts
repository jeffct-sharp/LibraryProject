import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NotificationListComponent } from './notification-list/notification-list.component';
import { NotificationFormComponent } from './notification-form/notification-form.component';
import { NotificationDetailComponent } from './notification-detail/notification-detail.component';
import { MemberNotificationsComponent } from './member-notifications/member-notifications.component';
import { AuthGuard } from '../../core/guards/auth.guard';
import { RoleGuard } from '../../core/guards/role.guard';

const routes: Routes = [
  {
    path: '',
    component: NotificationListComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['Admin', 'Librarian'], title: 'Notification Management' }
  },
  {
    path: 'add',
    component: NotificationFormComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['Admin', 'Librarian'], title: 'Create Notification' }
  },
  {
    path: 'edit/:id',
    component: NotificationFormComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['Admin', 'Librarian'], title: 'Edit Notification', isEditMode: true }
  },
  {
    path: 'member/:id',
    component: NotificationListComponent,
    canActivate: [AuthGuard],
    data: { isMemberSpecific: true, title: 'Member Notifications' }
  },
  {
    path: 'my-notifications',
    component: MemberNotificationsComponent,
    canActivate: [AuthGuard],
    data: { title: 'My Notifications' }
  },
  {
    path: ':id',
    component: NotificationDetailComponent,
    canActivate: [AuthGuard],
    data: { title: 'Notification Details' }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class NotificationsRoutingModule { }
