import { Injectable, signal } from '@angular/core';

export type LibraryViewMode = 'grid' | 'list' | 'shelf';

const VIEW_KEY = 'gv_library_view';
const SIDEBAR_KEY = 'gv_sidebar_collapsed';

/** Per-device UI preferences, persisted to localStorage when they change. */
@Injectable({ providedIn: 'root' })
export class LibraryPrefsService {
  private readonly _viewMode = signal<LibraryViewMode>(readView());
  public readonly viewMode = this._viewMode.asReadonly();

  private readonly _sidebarCollapsed = signal(readFlag(SIDEBAR_KEY));
  public readonly sidebarCollapsed = this._sidebarCollapsed.asReadonly();

  public setViewMode(mode: LibraryViewMode): void {
    this._viewMode.set(mode);
    persist(VIEW_KEY, mode);
  }

  public toggleSidebar(): void {
    const collapsed = !this._sidebarCollapsed();
    this._sidebarCollapsed.set(collapsed);
    persist(SIDEBAR_KEY, collapsed ? '1' : '0');
  }
}

function readView(): LibraryViewMode {
  try {
    const value = localStorage.getItem(VIEW_KEY);
    if (value === 'grid' || value === 'list' || value === 'shelf') {
      return value;
    }
  } catch {
    /* storage unavailable */
  }
  return 'grid';
}

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function persist(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable or full */
  }
}
