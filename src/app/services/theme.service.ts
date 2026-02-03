import { Injectable, inject, signal, effect, Renderer2, RendererFactory2 } from '@angular/core';
import { DOCUMENT } from '@angular/common';

export type Theme = 'dark' | 'light' | 'system';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private document = inject(DOCUMENT);
  private rendererFactory = inject(RendererFactory2);
  private renderer: Renderer2;

  private readonly STORAGE_KEY = 'gamevault_theme';
  
  readonly currentTheme = signal<Theme>(this.getStoredTheme());
  readonly isDarkMode = signal<boolean>(true);

  constructor() {
    this.renderer = this.rendererFactory.createRenderer(null, null);
    this.initializeTheme();
    
    // Watch for system theme changes
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', () => {
        if (this.currentTheme() === 'system') {
          this.applyTheme('system');
        }
      });
    }
  }

  private getStoredTheme(): Theme {
    if (typeof window === 'undefined') return 'dark';
    return (localStorage.getItem(this.STORAGE_KEY) as Theme) || 'dark';
  }

  private storeTheme(theme: Theme): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.STORAGE_KEY, theme);
  }

  private initializeTheme(): void {
    this.applyTheme(this.currentTheme());
  }

  setTheme(theme: Theme): void {
    this.currentTheme.set(theme);
    this.storeTheme(theme);
    this.applyTheme(theme);
  }

  toggleTheme(): void {
    const newTheme = this.isDarkMode() ? 'light' : 'dark';
    this.setTheme(newTheme);
  }

  private applyTheme(theme: Theme): void {
    const body = this.document.body;
    
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.isDarkMode.set(prefersDark);
      
      if (prefersDark) {
        this.renderer.addClass(body, 'dark');
        this.renderer.removeClass(body, 'light');
      } else {
        this.renderer.addClass(body, 'light');
        this.renderer.removeClass(body, 'dark');
      }
    } else {
      this.isDarkMode.set(theme === 'dark');
      
      if (theme === 'dark') {
        this.renderer.addClass(body, 'dark');
        this.renderer.removeClass(body, 'light');
      } else {
        this.renderer.addClass(body, 'light');
        this.renderer.removeClass(body, 'dark');
      }
    }

    // Update meta theme-color
    const metaThemeColor = this.document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      const color = this.isDarkMode() ? '#0a0a0f' : '#f8fafc';
      metaThemeColor.setAttribute('content', color);
    }
  }

  // Gaming aesthetic effects
  enableNeonEffects(): void {
    const body = this.document.body;
    this.renderer.addClass(body, 'neon-effects');
  }

  disableNeonEffects(): void {
    const body = this.document.body;
    this.renderer.removeClass(body, 'neon-effects');
  }

  toggleNeonEffects(): void {
    const body = this.document.body;
    if (body.classList.contains('neon-effects')) {
      this.disableNeonEffects();
    } else {
      this.enableNeonEffects();
    }
  }
}