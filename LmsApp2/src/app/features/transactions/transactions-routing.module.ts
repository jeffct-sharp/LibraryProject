import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TransactionListComponent } from './transaction-list/transaction-list.component';
import { TransactionDetailComponent } from './transaction-detail/transaction-detail.component';
import { BorrowBookComponent } from './borrow-book/borrow-book.component';
import { ReturnBookComponent } from './return-book/return-book.component';
import { MemberHistoryComponent } from './member-history/member-history.component';
import { OverdueTransactionsComponent } from './overdue-transactions/overdue-transactions.component';
import { AuthGuard } from '../../core/guards/auth.guard';
import { RoleGuard } from '../../core/guards/role.guard';

const routes: Routes = [
  { 
    path: '', 
    component: TransactionListComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['Admin', 'Librarian'], title: 'Transactions' }
  },
  { 
    path: 'borrow', 
    component: BorrowBookComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['Admin', 'Librarian','User'], title: 'Borrow Book' }
  },
  { 
    path: 'return', 
    component: ReturnBookComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['Admin', 'Librarian','User'], title: 'Return Book' }
  },
  { 
    path: 'overdue', 
    component: OverdueTransactionsComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['Admin', 'Librarian'], title: 'Overdue Books' }
  },
  { 
    path: 'member-history/:id', 
    component: MemberHistoryComponent,
    canActivate: [AuthGuard],
    data: { title: 'Member Borrowing History' }
  },
  { 
    path: ':id', 
    component: TransactionDetailComponent,
    canActivate: [AuthGuard],
    data: { title: 'Transaction Details' }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TransactionsRoutingModule { }
