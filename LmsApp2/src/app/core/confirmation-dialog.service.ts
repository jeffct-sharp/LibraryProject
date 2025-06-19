import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConfirmDialogComponent, ConfirmDialogData } from '../shared/confirm-dialog/confirm-dialog.component';
import { BookDetailsDto } from '../models/dtos/book-dtos';

@Injectable({
  providedIn: 'root'
})
export class ConfirmationDialogService {
  constructor(private dialog: MatDialog) {}

  /**
   * Shows a confirmation dialog
   * @param message The message to display
   * @param header The header text
   * @param icon The icon to display (default: 'warning')
   * @returns Observable that resolves to true if confirmed, false otherwise
   */
  confirm(message: string, header = 'Confirmation', icon = 'warning'): Observable<boolean> {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: header,
        message: message,
        confirmText: 'Yes',
        cancelText: 'No',
        icon: icon
      }
    });

    return dialogRef.afterClosed().pipe(
      map(result => !!result)
    );
  }

  /**
   * Shows a delete confirmation dialog
   * @param itemName The name of the item to delete
   * @returns Observable that resolves to true if confirmed, false otherwise
   */
  confirmDelete(itemName: string): Observable<boolean> {
    return this.confirm(
      `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
      'Confirm Deletion',
      'delete'
    );
  }

  /**
   * Shows a borrow confirmation dialog
   * @param book The book to borrow
   * @returns Observable that resolves to true if confirmed, false otherwise
   */
  confirmBorrow(book: BookDetailsDto): Observable<boolean> {
    const message = `
      <p>You are about to borrow:</p>
      <p><strong>${book.title}</strong> by ${book.author}</p>
      <p>Are you sure you want to proceed?</p>
    `;
    
    return this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Borrow Book',
        message: message,
        confirmText: 'Proceed',
        cancelText: 'Cancel',
        icon: 'menu_book'
      }
    }).afterClosed().pipe(
      map(result => !!result)
    );
  }

  /**
   * Shows a save confirmation dialog for adding/updating records
   * @param isUpdate Whether this is an update operation
   * @param itemType The type of item being saved (e.g., 'book', 'transaction')
   * @returns Observable that resolves to true if confirmed, false otherwise
   */
  confirmSave(isUpdate: boolean, itemType: string): Observable<boolean> {
    const action = isUpdate ? 'update' : 'add';
    return this.confirm(
      `Are you sure you want to ${action} this ${itemType}?`,
      `Confirm ${isUpdate ? 'Update' : 'Creation'}`,
      'check_circle'
    );
  }
  
  /**
   * Shows a dialog to confirm increasing copies of an existing book
   * @param existingBook The book that already exists
   * @param copiesToAdd Number of copies to add
   * @returns Observable that resolves to true if confirmed, false otherwise
   */
  confirmIncreaseCopies(existingBook: BookDetailsDto, copiesToAdd: number): Observable<boolean> {
    const message = `
      A book with this ISBN already exists: "${existingBook.title}" by ${existingBook.author}.
      Would you like to increase the available copies by ${copiesToAdd} instead?
    `;
    
    return this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Book Already Exists',
        message: message,
        confirmText: 'Increase Copies',
        cancelText: 'Cancel',
        icon: 'library_add'
      }
    }).afterClosed().pipe(
      map(result => !!result)
    );
  }
}
