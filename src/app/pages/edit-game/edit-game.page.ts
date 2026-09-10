import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { 
  IonContent, IonHeader, IonToolbar, IonBackButton,
  IonButton, IonIcon, IonCard, IonCardHeader, IonCardTitle,
  IonCardContent, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
  IonTextarea, IonToggle, IonToast
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, saveOutline, imageOutline } from 'ionicons/icons';
import { PLATFORMS, GENRES, Game, Platform } from '../../models/game.model';
import { GameService } from '../../services/game.service';

@Component({
  selector: 'app-edit-game',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    IonContent, IonHeader, IonToolbar, IonBackButton,
    IonButton, IonIcon, IonCard, IonCardHeader, IonCardTitle,
    IonCardContent, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
    IonTextarea, IonToggle, IonToast
  ],
  templateUrl: './edit-game.page.html',
  styleUrl: './edit-game.page.scss',
})
export class EditGamePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly gameService = inject(GameService);

  protected readonly platforms = PLATFORMS;
  protected readonly genres = GENRES;
  protected readonly currentYear = new Date().getFullYear();
  
  protected game: Game | null = null;
  private originalGame: Game | null = null;
  protected selectedPlatformId = '';
  protected developerName = '';
  
  protected isSubmitting = false;
  protected toastMessage = '';
  protected toastColor: 'success' | 'danger' = 'success';

  public ngOnInit(): void {
    addIcons({ arrowBackOutline, saveOutline, imageOutline });

    const gameId = this.route.snapshot.paramMap.get('id');
    if (gameId) {
      this.loadGame(gameId);
    } else {
      this.router.navigate(['/home']);
    }
  }

  private loadGame(id: string): void {
    this.gameService.getGameById(id).subscribe({
      next: (game) => {
        if (game) {
          this.originalGame = game;
          this.game = { ...game };
          this.selectedPlatformId = game.platform.id;
          this.developerName = game.developer.name;
        } else {
          this.router.navigate(['/home']);
        }
      },
      error: () => {
        this.router.navigate(['/home']);
      }
    });
  }

  protected onPlatformChange(): void {
    const platform = this.platforms.find(p => p.id === this.selectedPlatformId);
    if (platform && this.game) {
      this.game.platform = platform;
    }
  }

  protected isGenreSelected(genre: string): boolean {
    return this.game?.genre?.includes(genre) || false;
  }

  protected toggleGenre(genre: string): void {
    if (!this.game) return;
    
    if (!this.game.genre) {
      this.game.genre = [];
    }
    const index = this.game.genre.indexOf(genre);
    if (index > -1) {
      this.game.genre.splice(index, 1);
    } else {
      this.game.genre.push(genre);
    }
  }

  protected onSubmit(): void {
    if (!this.game || !this.developerName) {
      this.showToast('Please fill in all required fields', 'danger');
      return;
    }

    this.isSubmitting = true;

    const updates: Partial<Game> = {
      title: this.game.title,
      description: this.game.description,
      coverImage: this.game.coverImage,
      platform: this.game.platform,
      releaseYear: Number(this.game.releaseYear),
      developer: { ...this.game.developer, name: this.developerName },
      director: this.game.director,
      genre: this.game.genre,
      rating: this.game.rating ? Number(this.game.rating) : undefined,
      playtime: this.game.playtime ? Number(this.game.playtime) : undefined,
      completed: this.game.completed,
      notes: this.game.notes
    };

    this.gameService.updateGame(this.game.id, updates).subscribe({
      next: () => {
        this.showToast('Game updated successfully!', 'success');
        setTimeout(() => {
          this.router.navigate(['/game', this.game!.id]);
        }, 1000);
      },
      error: (error) => {
        this.showToast(error.message || 'Failed to update game', 'danger');
        this.isSubmitting = false;
      }
    });
  }

  private showToast(message: string, color: 'success' | 'danger'): void {
    this.toastMessage = message;
    this.toastColor = color;
  }
}
