import { DOCUMENT } from '@angular/common';
import { Injectable, RendererFactory2, inject, signal } from '@angular/core';

export type Theme = 'dark' | 'light' | 'system';

const STORAGE_KEY = 'gamevault_theme';
const THEME_COLORS = { dark: '#070b17', light: '#f5f8ff' } as const;

/** Applies the stored theme class to <body> and keeps the browser theme-color in sync. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly renderer = inject(RendererFactory2).createRenderer(null, null);

  private readonly _theme = signal<Theme>(readStoredTheme());
  public readonly theme = this._theme.asReadonly();

  private readonly _isDarkMode = signal(true);
  public readonly isDarkMode = this._isDarkMode.asReadonly();

  constructor() {
    this.applyTheme(this._theme());
    if (typeof window !== 'undefined') {
      window
        .matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', () => this._theme() === 'system' && this.applyTheme('system'));
    }
  }

  public setTheme(theme: Theme): void {
    this._theme.set(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* storage unavailable */
    }
    this.applyTheme(theme);
  }

  private applyTheme(theme: Theme): void {
    const dark =
      theme === 'system' ? window.matchMedia('(prefers-color-scheme: dark)').matches : theme === 'dark';
    this._isDarkMode.set(dark);

    const body = this.document.body;
    this.renderer.addClass(body, dark ? 'dark' : 'light');
    this.renderer.removeClass(body, dark ? 'light' : 'dark');

    this.document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', dark ? THEME_COLORS.dark : THEME_COLORS.light);
  }
}

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'system' ? stored : 'dark';
  } catch {
    return 'dark';
  }
}
