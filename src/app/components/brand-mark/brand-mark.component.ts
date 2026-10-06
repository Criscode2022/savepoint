import { Component, Input } from '@angular/core';

let nextId = 0;

/** Savepoint crystal — the brand mark used in the shell, auth screen and empty states. */
@Component({
  selector: 'app-brand-mark',
  standalone: true,
  templateUrl: './brand-mark.component.html',
  styleUrl: './brand-mark.component.scss',
})
export class BrandMarkComponent {
  @Input() size = 32;
  /** Soft idle glow — reserved for brand moments (auth screen) */
  @Input() glow = false;

  protected readonly gradientId = `sp-crystal-${nextId++}`;
}
