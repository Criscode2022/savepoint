import { Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { interval, map } from 'rxjs';

const MINUTE = 60_000;

/** A minute-resolution "now" shared by release countdowns, so they refresh without manual ticks. */
@Injectable({ providedIn: 'root' })
export class ClockService {
  public readonly now = toSignal(interval(MINUTE).pipe(map(() => new Date())), {
    initialValue: new Date(),
  });
}
