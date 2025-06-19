import { NgModule, forwardRef, Injector } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CoreModule } from './core/core.module';
import { AppRoutingModule } from './app-routing.module';
import { SharedModule } from './shared/shared.module';

// Angular Material Modules - Primary UI Framework
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';

// PrimeNG Modules - Used for specialized components
import { CarouselModule } from 'primeng/carousel';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';

// App Components
import { AppComponent } from './app.component';
import { HomeComponent } from './features/home/home.component';
import { AccessDeniedComponent } from './core/components/access-denied/access-denied.component';
import { PageNotFoundComponent } from './core/components/page-not-found/page-not-found.component';
import { LayoutComponent } from './layout/layout.component';
import { SideNavbarComponent } from './layout/side-navbar/side-navbar.component';
import { NavbarComponent } from './layout/navbar/navbar.component';

// Services
import { FineService } from './features/fines/fine.service';
import { MemberService } from './features/members/member.service';

@NgModule({
  declarations: [
    AppComponent,
    NavbarComponent,
    HomeComponent,
    AccessDeniedComponent,
    PageNotFoundComponent,
    LayoutComponent,
    SideNavbarComponent
  ],
  imports: [
    // Core Angular modules
    BrowserModule,
    BrowserAnimationsModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    HttpClientModule,
    AppRoutingModule,
    // Angular Material modules
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatListModule,
    MatButtonModule,
    MatMenuModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatBadgeModule,
    MatDividerModule,
    MatTooltipModule,
    
    // PrimeNG modules (only what's necessary)
    CarouselModule,
    ToastModule,
    ConfirmDialogModule,
    
    CoreModule,
    SharedModule
  ],
  providers: [
    MessageService,
    ConfirmationService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
