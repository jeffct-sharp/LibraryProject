import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-book-availability',
  templateUrl: './book-availability.component.html',
  styleUrls: ['./book-availability.component.scss']
})
export class BookAvailabilityComponent implements OnChanges {
  @Input() availableCopies: number = 0;
  @Input() totalCopies?: number;
  @Input() size: 'small' | 'medium' | 'large' = 'small';
  @Input() showCount: boolean = true;
  
  statusText: string = '';
  badgeClass: string = '';
  customStyle: any = {};
  
  ngOnChanges(changes: SimpleChanges): void {
    this.updateStatus();
    this.updateSize();
  }
  
  private updateStatus(): void {
    if (this.availableCopies <= 0) {
      this.statusText = 'Not Available';
      this.badgeClass = 'badge-unavailable';
    } else if (this.totalCopies && this.availableCopies < this.totalCopies * 0.2) {
      this.statusText = 'Limited Availability';
      this.badgeClass = 'badge-limited';
    } else {
      this.statusText = 'Available';
      this.badgeClass = 'badge-available';
    }
    
    // Add copy count if available and requested
    if (this.showCount && this.availableCopies > 0) {
      this.statusText += ` (${this.availableCopies}${this.totalCopies ? '/' + this.totalCopies : ''})`;
    }
  }
  
  private updateSize(): void {
    switch(this.size) {
      case 'large':
        this.customStyle = { 'font-size': '1rem', 'padding': '0.5em 0.8em' };
        break;
      case 'medium':
        this.customStyle = { 'font-size': '0.85rem', 'padding': '0.4em 0.7em' };
        break;
      default:
        this.customStyle = {}; // Use default styling
    }
  }
}
