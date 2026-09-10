import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CommandPaletteService {
  private readonly openSubject = new BehaviorSubject<boolean>(false);
  public readonly open$ = this.openSubject.asObservable();

  public get isOpen(): boolean {
    return this.openSubject.value;
  }

  public open(): void {
    this.openSubject.next(true);
  }

  public close(): void {
    this.openSubject.next(false);
  }

  public toggle(): void {
    this.openSubject.next(!this.openSubject.value);
  }
}
