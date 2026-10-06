import { computed, signal } from '@angular/core';

export type ToastColor = 'success' | 'danger' | 'warning';

/**
 * Signal-backed state for a page's inline `<ion-toast>`.
 * Bind `[isOpen]="toast.isOpen()"`, `[message]="toast.message()"`,
 * `[color]="toast.color()"` and `(didDismiss)="toast.dismiss()"`.
 */
export class ToastState {
  private readonly _message = signal('');
  private readonly _color = signal<ToastColor>('success');

  public readonly message = this._message.asReadonly();
  public readonly color = this._color.asReadonly();
  public readonly isOpen = computed(() => this._message() !== '');

  public show(message: string, color: ToastColor = 'success'): void {
    this._color.set(color);
    this._message.set(message);
  }

  public dismiss(): void {
    this._message.set('');
  }
}
