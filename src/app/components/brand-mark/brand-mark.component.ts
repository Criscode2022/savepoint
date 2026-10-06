import { ChangeDetectionStrategy, Component, input } from '@angular/core';

let nextId = 0;

/** Savepoint crystal — the brand mark used in the shell, auth screen and empty states. */
@Component({
  selector: 'app-brand-mark',
  templateUrl: './brand-mark.component.html',
  styleUrl: './brand-mark.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandMarkComponent {
  public readonly size = input(32);
  /** Soft idle glow — reserved for brand moments (auth screen) */
  public readonly glow = input(false);

  protected readonly gradientId = `sp-crystal-${nextId++}`;
}
