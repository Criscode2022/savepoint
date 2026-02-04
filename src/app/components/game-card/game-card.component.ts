import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { 
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonIcon, IonBadge, IonButton, IonChip
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  starOutline, timeOutline, checkmarkCircleOutline, 
  ellipseOutline, trashOutline, createOutline
} from 'ionicons/icons';
import { Game } from '../../models/game.model';

@Component({
  selector: 'app-game-card',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonIcon, IonBadge, IonButton, IonChip
  ],
  template: `
    <ion-card class="game-card" [class.completed]="game.completed">
      <div class="card-image-wrapper">
        <img 
          [src]="coverImage || game.coverImage || '/assets/images/game-placeholder.jpg'" 
          [alt]="game.title"
          class="card-image"
          loading="lazy"
        />
        <div class="image-overlay">
          <div class="overlay-actions">
            <ion-button 
              fill="clear" 
              size="small"
              [routerLink]="['/edit', game.id]"
              class="action-btn">
              <ion-icon name="create-outline"></ion-icon>
            </ion-button>
            
            <ion-button 
              fill="clear" 
              size="small"
              (click)="onDelete.emit(game.id); $event.stopPropagation()"
              class="action-btn delete">
              <ion-icon name="trash-outline"></ion-icon>
            </ion-button>
          </div>
        </div>
        
        <!-- Platform Badge -->
        <ion-badge class="platform-badge" [style.--badge-color]="getPlatformColor()">
          {{game.platform.name}}
        </ion-badge>
        
        <!-- Completed Badge -->
        <div class="completed-badge" *ngIf="game.completed">
          <ion-icon name="checkmark-circle-outline"></ion-icon>
        </div>
      </div>

      <ion-card-header [routerLink]="['/game', game.id]">
        <ion-card-title class="game-title">{{game.title}}</ion-card-title>
        <div class="game-meta">
          <span class="developer">{{game.developer.name}}</span>
          <span class="separator">•</span>
          <span class="year">{{game.releaseYear}}</span>
        </div>
      </ion-card-header>

      <ion-card-content [routerLink]="['/game', game.id]">
        <p class="game-description">{{game.description || '' | slice:0:100}}{{(game.description?.length || 0) > 100 ? '...' : ''}}</p>
        
        <div class="game-stats">
          <div class="stat" *ngIf="game.rating">
            <ion-icon name="star-outline" class="stat-icon"></ion-icon>
            <span>{{game.rating}}</span>
          </div>
          
          <div class="stat" *ngIf="game.playtime">
            <ion-icon name="time-outline" class="stat-icon"></ion-icon>
            <span>{{game.playtime}}h</span>
          </div>
        </div>

        <div class="game-genres" *ngIf="game.genre">
          <ion-chip *ngFor="let genre of (game.genre || []).slice(0, 3)" class="genre-chip">
            {{genre}}
          </ion-chip>
        </div>
      </ion-card-content>

      <div class="card-footer">
        <ion-button 
          fill="clear" 
          size="small"
          (click)="toggleCompleted()"
          [class.completed]="game.completed"
          class="complete-btn">
          <ion-icon [name]="game.completed ? 'checkmark-circle-outline' : 'ellipse-outline'"></ion-icon>
          {{game.completed ? 'Completed' : 'Mark Complete'}}
        </ion-button>
      </div>
    </ion-card>
  `,
  styles: [`
    .game-card {
      background: rgba(22, 22, 42, 0.8);
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid rgba(139, 92, 246, 0.1);
      transition: all 0.3s ease;
      cursor: pointer;
    }

    .game-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.5),
                  0 0 30px rgba(139, 92, 246, 0.15);
      border-color: rgba(139, 92, 246, 0.3);
    }

    .game-card.completed {
      border-color: rgba(34, 197, 94, 0.3);
    }

    .card-image-wrapper {
      position: relative;
      aspect-ratio: 3/4;
      overflow: hidden;
    }

    .card-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.5s ease;
    }

    .game-card:hover .card-image {
      transform: scale(1.05);
    }

    .image-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        to bottom,
        rgba(0, 0, 0, 0) 0%,
        rgba(0, 0, 0, 0) 50%,
        rgba(0, 0, 0, 0.8) 100%
      );
      opacity: 0;
      transition: opacity 0.3s ease;
      display: flex;
      align-items: flex-start;
      justify-content: flex-end;
      padding: 1rem;
    }

    .game-card:hover .image-overlay {
      opacity: 1;
    }

    .overlay-actions {
      display: flex;
      gap: 0.5rem;
    }

    .action-btn {
      --background: rgba(0, 0, 0, 0.6);
      --color: #f8fafc;
      --border-radius: 50%;
      --padding-start: 0;
      --padding-end: 0;
      width: 40px;
      height: 40px;
      margin: 0;
    }

    .action-btn:hover {
      --background: rgba(139, 92, 246, 0.8);
    }

    .action-btn.delete:hover {
      --background: rgba(239, 68, 68, 0.8);
    }

    .platform-badge {
      position: absolute;
      bottom: 12px;
      left: 12px;
      --background: var(--badge-color, #8b5cf6);
      --color: white;
      --padding-start: 12px;
      --padding-end: 12px;
      --padding-top: 6px;
      --padding-bottom: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .completed-badge {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 10px rgba(34, 197, 94, 0.4);
    }

    .completed-badge ion-icon {
      color: white;
      font-size: 18px;
    }

    ion-card-header {
      padding: 1rem 1rem 0.5rem;
    }

    .game-title {
      font-size: 1.125rem;
      font-weight: 700;
      color: #f8fafc;
      margin: 0 0 0.5rem;
      line-height: 1.3;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .game-meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: #94a3b8;
    }

    .developer {
      color: #8b5cf6;
      font-weight: 500;
    }

    .separator {
      color: #475569;
    }

    ion-card-content {
      padding: 0.5rem 1rem 1rem;
    }

    .game-description {
      color: #64748b;
      font-size: 0.875rem;
      line-height: 1.5;
      margin: 0 0 1rem;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .game-stats {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .stat {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      color: #94a3b8;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .stat-icon {
      color: #f59e0b;
      font-size: 16px;
    }

    .game-genres {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
    }

    .genre-chip {
      --background: rgba(139, 92, 246, 0.15);
      --color: #a78bfa;
      margin: 0;
      font-size: 0.75rem;
      height: 24px;
    }

    .card-footer {
      padding: 0 1rem 1rem;
      border-top: 1px solid rgba(139, 92, 246, 0.1);
    }

    .complete-btn {
      --color: #64748b;
      --color-hover: #22c55e;
      font-size: 0.875rem;
      margin: 0;
      width: 100%;
      justify-content: flex-start;
    }

    .complete-btn.completed {
      --color: #22c55e;
    }

    .complete-btn ion-icon {
      margin-right: 0.5rem;
    }
  `]
})
export class GameCardComponent {
  @Input() game!: Game;
  @Input() coverImage?: string;
  @Output() onToggleCompleted = new EventEmitter<string>();
  @Output() onDelete = new EventEmitter<string>();

  constructor() {
    addIcons({
      starOutline, timeOutline, checkmarkCircleOutline,
      ellipseOutline, trashOutline, createOutline
    });
  }

  toggleCompleted(): void {
    this.onToggleCompleted.emit(this.game.id);
  }

  getPlatformColor(): string {
    return this.game.platform.color || '#8b5cf6';
  }
}
