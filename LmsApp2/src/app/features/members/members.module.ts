import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MembersRoutingModule } from './members-routing.module';
import { MemberListComponent } from './member-list/member-list.component';
import { MemberProfileComponent } from './member-profile/member-profile.component';
import { MemberBorrowingsFinesComponent } from './member-borrowings-fines/member-borrowings-fines.component';
import { MemberDetailsComponent } from './member-details/member-details.component';
import { MemberFormComponent } from './member-form/member-form.component';
import { MemberService } from './member.service';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
// Angular Material modules
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';

@NgModule({
  declarations: [
    MemberListComponent,
    MemberProfileComponent,
    MemberBorrowingsFinesComponent,
    MemberDetailsComponent,
    MemberFormComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MembersRoutingModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatExpansionModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatOptionModule,
    MatSelectModule,
    MatInputModule
  ],
  providers: [
    MemberService
  ],
  exports: [
    MemberListComponent,
    MemberProfileComponent,
    MemberBorrowingsFinesComponent,
    MemberDetailsComponent,
    MemberFormComponent
  ]
})
export class MembersModule { }