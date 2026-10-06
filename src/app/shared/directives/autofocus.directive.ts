import { AfterViewInit, Directive, ElementRef, inject } from '@angular/core';

/** Focuses its host once it is rendered — for fields inside `@if` blocks such as dialogs. */
@Directive({ selector: '[appAutofocus]' })
export class AutofocusDirective implements AfterViewInit {
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  public ngAfterViewInit(): void {
    this.host.nativeElement.focus();
  }
}
