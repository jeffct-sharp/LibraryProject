import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { 
  FineDetailsDto, 
  CreateFineDto, 
  UpdateFineDto, 
  PayFineDto,
} from '../../models/dtos/fine-dtos';
import { 
  FineFilterUiModel, 
  FineSummaryUiModel, 
  OverdueFineApplicationResultUiModel, 
  FineDisplayUiModel,
  FinePaymentUiModel
} from '../../models/ui-models/fine-ui-models';
import { ServiceMediatorService, EventTypes } from '../../core/services/service-mediator.service';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class FineService {
  private apiBaseUrl = environment.apiBaseUrl;
  private endpoints = environment.apiEndpoints.fines || {
    getAll: '/api/Fines',
    getById: '/api/Fines/',
    create: '/api/Fines',
    update: '/api/Fines/',
    delete: '/api/Fines/',
    getMemberFines: '/api/Fines/member/',
    getMemberFinesByName: '/api/Fines/member-name/',
    pay: '/api/Fines/PayFine/',
    applyOverdueFines: '/api/Fines/apply-overdue-fines'
  };

  constructor(
    private http: HttpClient,
    private serviceMediator: ServiceMediatorService,
    private authService: AuthService
  ) { 
    // Subscribe to member events
    this.serviceMediator.on(EventTypes.MEMBER_UPDATED).subscribe(member => {
      console.log('Member updated, checking fine implications', member);
      // Handle member update event
    });
    
    this.serviceMediator.on(EventTypes.MEMBER_STATUS_CHANGED).subscribe(data => {
      console.log('Member status changed', data);
      // Handle member status change event
    });
  }

  // Get all fines with optional filtering
  getAllFines(filter?: FineFilterUiModel): Observable<FineDetailsDto[]> {
    let params = new HttpParams();
    
    if (filter) {
      Object.keys(filter).forEach(key => {
        const value = filter[key as keyof FineFilterUiModel];
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }
    
    return this.http.get<FineDetailsDto[]>(`${this.apiBaseUrl}${this.endpoints.getAll}`, { params })
      .pipe(catchError(error => this.handleError(error)));
  }

  // Get fine by ID
  getFineById(id: number): Observable<FineDetailsDto> {
    return this.http.get<FineDetailsDto>(`${this.apiBaseUrl}${this.endpoints.getById}${id}`)
      .pipe(catchError(error => this.handleError(error)));
  }

  // Get fines for a specific member
  getMemberFines(memberId: number): Observable<FineDetailsDto[]> {
    return this.http.get<FineDetailsDto[]>(`${this.apiBaseUrl}${this.endpoints.getMemberFines}${memberId}`)
      .pipe(catchError(this.handleError));
  }
  
  // Get fines for a member by name
  getMemberFinesByName(memberName: string): Observable<FineDetailsDto[]> {
    return this.http.get<FineDetailsDto[]>(`${this.apiBaseUrl}${this.endpoints.getMemberFinesByName}${memberName}`)
      .pipe(catchError(this.handleError));
  }

  // Apply fines for overdue books
  applyOverdueFines(): Observable<{ finesCreated: number, totalAmount: number }> {
    return this.http.post<{ finesCreated: number, totalAmount: number }>(
      `${this.apiBaseUrl}${this.endpoints.applyOverdueFines}`, {})
      .pipe(catchError(this.handleError));
  }

  // Process a fine payment
  payFine(paymentData: PayFineDto): Observable<any> {
    return this.http.post<any>(`${this.apiBaseUrl}${this.endpoints.pay}`, paymentData)
      .pipe(
        tap(response => {
          console.log('Fine payment successful:', response);
          // If you have any mediator service events, publish them here
        }),
        catchError(error => {
          console.error('Error paying fine:', error);
          return this.handleError('Failed to pay fine' + error);
        })
      );
  }

  // Create a new fine
  createFine(fineData: any): Observable<any> {
    return this.http.post(`${this.apiBaseUrl}${this.endpoints.create}`, fineData).pipe(
      tap(newFine => {
        // Notify other services about fine creation
        this.serviceMediator.publish(EventTypes.FINE_CREATED, newFine);
      }),
      catchError(this.handleError)
    );
  }

  // Update an existing fine
  updateFine(fine: UpdateFineDto): Observable<FineDetailsDto> {
    return this.http.put<FineDetailsDto>(
      `${this.apiBaseUrl}${this.endpoints.update}`, fine)
      .pipe(catchError(error => this.handleError(error)));
  }

  // Delete a fine
  deleteFine(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiBaseUrl}${this.endpoints.delete}${id}`)
      .pipe(catchError(error => this.handleError(error)));
  }

  // Generate a summary of fines
  getSummary(): Observable<FineSummaryUiModel> {
    return this.getAllFines().pipe(
      map(fines => {
        const summary: FineSummaryUiModel = {
          totalFines: fines.length,
          pendingFines: 0,
          paidFines: 0,
          totalAmount: 0,
          pendingAmount: 0,
          paidAmount: 0,
          averageAmount: 0
        };
        
        fines.forEach(fine => {
          if (fine.status === 'Pending') {
            summary.pendingFines++;
            summary.pendingAmount += fine.amount;
          } else if (fine.status === 'Paid') {
            summary.paidFines++;
            summary.paidAmount += fine.amount;
          }
          summary.totalAmount += fine.amount;
        });
        
        summary.averageAmount = summary.totalFines > 0 ? 
          summary.totalAmount / summary.totalFines : 0;
        
        // For backward compatibility
        summary.averageFineAmount = summary.averageAmount;
        
        return summary;
      }),
      catchError(error => this.handleError(error))
    );
  }

  // Check if user has permission to manage fines
  canManageFines(): boolean {
    return this.authService.hasRole('Admin') || this.authService.hasRole('Librarian');
  }

  // Format date for display
  formatDate(date: string): string {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString();
    } catch (e) {
      return 'Invalid Date';
    }
  }

  // Update this mapper method to map DTO to UI model
  mapToFineDisplayUiModel(fineDto: FineDetailsDto, memberName?: string): FineDisplayUiModel {
    return {
      fineID: fineDto.fineID,
      memberID: fineDto.memberID,
      memberName: memberName,
      amount: fineDto.amount,
      status: fineDto.status,
      transactionDate: fineDto.transactionDate,
      formattedTransactionDate: this.formatDate(fineDto.transactionDate),
      formattedAmount: `₹${fineDto.amount.toFixed(2)}`,
      daysOverdue: this.calculateDaysOverdue(fineDto)
    };
  }

  // Add this method to get fine details
  getFineDetails(id: number): Observable<any> {
    return this.getFineById(id).pipe(
      map(fine => {
        // Return the fine as is without trying to load member details
        return {
          ...fine,
          memberName: null // Client will need to handle displaying member name separately
        };
      }),
      catchError(this.handleError)
    );
  }

  // Add helper method to calculate days overdue
  private calculateDaysOverdue(fine: FineDetailsDto): number | undefined {
    if (fine.status === 'Pending') {
      const creationDate = new Date(fine.transactionDate);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - creationDate.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    return undefined;
  }

  // Handle API errors
  private handleError(error: any) {
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else if (error.status) {
      // Server-side error
      switch (error.status) {
        case 400:
          errorMessage = error.error?.message || 'Bad request';
          break;
        case 401:
          errorMessage = 'Unauthorized. Please log in again.';
          break;
        case 403:
          errorMessage = 'You do not have permission to perform this action.';
          break;
        case 404:
          errorMessage = 'The requested resource was not found.';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later.';
          break;
        default:
          errorMessage = `Error ${error.status}: ${error.error?.message || error.statusText}`;
      }
    }
    
    console.error('FineService Error:', errorMessage, error);
    return throwError(() => ({ message: errorMessage, original: error }));
  }
}
