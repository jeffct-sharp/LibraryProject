import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BookListComponent } from './book-list/book-list.component';
import { BookFormComponent } from './book-form/book-form.component';
import { BookDetailsComponent } from './book-details/book-details.component';
import { RoleGuard } from '../../core/guards/role.guard';

const routes: Routes = [
  { 
    path: '', 
    component: BookListComponent,
    data: { title: 'Book Catalog' }
  },
  { 
    path: 'add', 
    component: BookFormComponent, 
    canActivate: [RoleGuard], 
    data: { roles: ['Admin', 'Librarian'], title: 'Add New Book' } 
  },
  { 
    path: 'edit/:id', 
    component: BookFormComponent, 
    canActivate: [RoleGuard], 
    data: { roles: ['Admin', 'Librarian'], title: 'Edit Book', isEditMode: true } 
  },
  { 
    path: ':id', 
    component: BookDetailsComponent,
    data: { title: 'Book Details' }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BooksRoutingModule { }
