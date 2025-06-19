import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FineListComponent } from './fine-list/fine-list.component';
import { FineDetailComponent } from './fine-detail/fine-detail.component';
import { FineCreateComponent } from './fine-create/fine-create.component';
import { FinePaymentComponent } from './fine-payment/fine-payment.component';
import { AuthGuard } from '../../core/guards/auth.guard';
import { RoleGuard } from '../../core/guards/role.guard';

const routes: Routes = [
  { 
    path: '', 
    component: FineListComponent,
    canActivate: [AuthGuard],
    data: { title: 'Fines Management' }
  },
  { 
    path: 'new', 
    component: FineCreateComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['Admin'], title: 'Create Fine' }
  },
  { 
    path: 'edit/:id', 
    component: FineCreateComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['Admin'], title: 'Edit Fine', isEditMode: true }
  },
  { 
    path: 'payment', 
    component: FinePaymentComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['Admin', 'Librarian'], title: 'Process Fine Payment' }
  },
  { 
    path: 'member/:id', 
    component: FineListComponent,
    canActivate: [AuthGuard],
    data: { 
      title: 'Member Fines',
      isMemberSpecific: true 
    }
  },
  { 
    path: ':id', 
    component: FineDetailComponent,
    canActivate: [AuthGuard],
    data: { title: 'Fine Details' }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FinesRoutingModule { }
