import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FinesRoutingModule } from './fines-routing.module';
import { FineListComponent } from './fine-list/fine-list.component';
import { FineDetailComponent } from './fine-detail/fine-detail.component';
import { FinePaymentComponent } from './fine-payment/fine-payment.component';
import { FineCreateComponent } from './fine-create/fine-create.component';
import { FineService } from './fine.service';
// Import MatNativeDateModule to ensure DateAdapter is available
import { MatNativeDateModule } from '@angular/material/core';
// Add MatAutocompleteModule to your imports
import { MatAutocompleteModule } from '@angular/material/autocomplete';

// Material Imports
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';

@NgModule({
  declarations: [
    FineListComponent,
    FineDetailComponent,
    FinePaymentComponent,
    FineCreateComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    FinesRoutingModule,
    // Add MatNativeDateModule to provide DateAdapter
    MatNativeDateModule,
    // Material modules
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDatepickerModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatChipsModule,
    MatDialogModule,
    MatTabsModule,
    MatTooltipModule,
    MatAutocompleteModule
  ],
  providers: [
    FineService
  ]
})
export class FinesModule { }
