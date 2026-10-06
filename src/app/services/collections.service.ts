import { Injectable, signal } from '@angular/core';
import { LibraryCollection } from '../shared/library-collections';

export interface SavedCollection {
  id: string;
  name: string;
  /** Smart collection key or 'all' */
  filter: LibraryCollection;
  /** Optional tag filter */
  tag?: string;
  createdAt: string;
}

const STORAGE_KEY = 'gv_saved_collections';

@Injectable({ providedIn: 'root' })
export class CollectionsService {
  private readonly _collections = signal<SavedCollection[]>(this.read());
  public readonly collections = this._collections.asReadonly();

  public add(name: string, filter: SavedCollection['filter'], tag?: string): SavedCollection {
    const collection: SavedCollection = {
      id: `col_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      filter,
      tag: tag?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    this.write([...this._collections(), collection]);
    return collection;
  }

  public remove(id: string): void {
    this.write(this._collections().filter((c) => c.id !== id));
  }

  private read(): SavedCollection[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw) as SavedCollection[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private write(items: SavedCollection[]): void {
    this._collections.set(items);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore quota */
    }
  }
}
