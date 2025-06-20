import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MemberListComponent } from './member-list/member-list.component';
import { MemberDetailsComponent } from './member-details/member-details.component';
import { MemberFormComponent } from './member-form/member-form.component';
import { MemberProfileComponent } from './member-profile/member-profile.component';
import { MemberBorrowingsFinesComponent } from './member-borrowings-fines/member-borrowings-fines.component';
import { AuthGuard } from '../../core/guards/auth.guard';
import { RoleGuard } from '../../core/guards/role.guard';

const routes: Routes = [
  { 
    path: '', 
    component: MemberListComponent, 
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['Admin', 'Librarian'], title: 'Member Management' } 
  },
  { 
    path: 'new', 
    component: MemberFormComponent, 
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['Admin'], title: 'Add New Member' } 
  },
  { 
    path: 'profile', 
    component: MemberProfileComponent, 
    canActivate: [AuthGuard],
    data: { title: 'My Profile' } 
  },
  { 
    path: 'edit/:id', 
    component: MemberFormComponent, 
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['Admin','Librarian','User'], title: 'Edit Member', isEditMode: true } 
  },
  { 
    path: ':id', 
    component: MemberDetailsComponent, 
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['Admin', 'Librarian'], title: 'Member Details' } 
  },
  { 
    path: ':id/borrowings-fines', 
    component: MemberBorrowingsFinesComponent, 
    canActivate: [AuthGuard],
    data: { title: 'Member Borrowings & Fines' } 
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MembersRoutingModule { }
