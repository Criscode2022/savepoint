import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
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
  private readonly subject = new BehaviorSubject<SavedCollection[]>(this.read());
  public readonly collections$ = this.subject.asObservable();

  public list(): SavedCollection[] {
    return this.subject.value;
  }

  public add(name: string, filter: SavedCollection['filter'], tag?: string): SavedCollection {
    const collection: SavedCollection = {
      id: `col_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      filter,
      tag: tag?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    const next = [...this.subject.value, collection];
    this.write(next);
    return collection;
  }

  public remove(id: string): void {
    this.write(this.subject.value.filter((c) => c.id !== id));
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
    this.subject.next(items);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore quota */
    }
  }
}
