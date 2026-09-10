import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type LibraryViewMode = 'grid' | 'list' | 'shelf';

const VIEW_KEY = 'gv_library_view';
const SIDEBAR_KEY = 'gv_sidebar_collapsed';

@Injectable({ providedIn: 'root' })
export class LibraryPrefsService {
  private readonly viewSubject = new BehaviorSubject<LibraryViewMode>(
    this.readView(),
  );
  private readonly sidebarCollapsedSubject = new BehaviorSubject<boolean>(
    this.readSidebarCollapsed(),
  );

  public readonly viewMode$ = this.viewSubject.asObservable();
  public readonly sidebarCollapsed$ = this.sidebarCollapsedSubject.asObservable();

  public get viewMode(): LibraryViewMode {
    return this.viewSubject.value;
  }

  public get sidebarCollapsed(): boolean {
    return this.sidebarCollapsedSubject.value;
  }

  public setViewMode(mode: LibraryViewMode): void {
    this.viewSubject.next(mode);
    try {
      localStorage.setItem(VIEW_KEY, mode);
    } catch {
      /* ignore */
    }
  }

  public toggleSidebar(): void {
    this.setSidebarCollapsed(!this.sidebarCollapsed);
  }

  public setSidebarCollapsed(collapsed: boolean): void {
    this.sidebarCollapsedSubject.next(collapsed);
    try {
      localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }

  private readView(): LibraryViewMode {
    try {
      const v = localStorage.getItem(VIEW_KEY);
      if (v === 'grid' || v === 'list' || v === 'shelf') {
        return v;
      }
    } catch {
      /* ignore */
    }
    return 'grid';
  }

  private readSidebarCollapsed(): boolean {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === '1';
    } catch {
      return false;
    }
  }
}
