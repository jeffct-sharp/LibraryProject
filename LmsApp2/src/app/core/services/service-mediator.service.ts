import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

/**
 * Event interface for service communication
 */
export interface ServiceEvent {
  type: string;
  payload: any;
}

/**
 * Event types constants for better type safety
 */
export enum EventTypes {
  // Fine events
  FINE_CREATED = 'fine:created',
  FINE_UPDATED = 'fine:updated',
  FINE_PAID = 'fine:paid',
  
  // Member events
  MEMBER_UPDATED = 'member:updated',
  MEMBER_STATUS_CHANGED = 'member:statusChanged',
  
  // Transaction events
  BOOK_BORROWED = 'transaction:bookBorrowed',
  BOOK_RETURNED = 'transaction:bookReturned'
}

/**
 * Mediator service to break circular dependencies between services
 */
@Injectable({
  providedIn: 'root'
})
export class ServiceMediatorService {
  private eventBus = new Subject<ServiceEvent>();
  
  // Public observable for components/services to subscribe to
  public events$ = this.eventBus.asObservable();
  
  /**
   * Publish an event to the event bus
   * @param eventType The type of event (use EventTypes enum for type safety)
   * @param payload The data payload for the event
   */
  publish(eventType: string, payload: any): void {
    this.eventBus.next({ type: eventType, payload });
  }
  
  /**
   * Subscribe to specific event types
   * @param eventType The event type to filter for
   * @returns Observable of filtered events
   */
  on(eventType: string): Observable<any> {
    return new Observable(observer => {
      const subscription = this.events$.subscribe(event => {
        if (event.type === eventType) {
          observer.next(event.payload);
        }
      });
      
      return () => subscription.unsubscribe();
    });
  }
}
