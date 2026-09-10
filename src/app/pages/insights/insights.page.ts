import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonBackButton,
  IonIcon,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  checkmarkCircleOutline,
  flameOutline,
  gameControllerOutline,
  heartOutline,
  starOutline,
  statsChartOutline,
  timeOutline,
  trophyOutline,
} from 'ionicons/icons';
import { Subject, takeUntil } from 'rxjs';
import { GameService } from '../../services/game.service';
import { GameCoverComponent } from '../../components/game-cover/game-cover.component';
import {
  computeLibraryInsights,
  LibraryInsights,
} from '../../shared/utils/insights.utils';

@Component({
  selector: 'app-insights',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    GameCoverComponent,
    IonContent,
    IonHeader,
    IonToolbar,
    IonBackButton,
    IonIcon,
    IonSpinner,
  ],
  templateUrl: './insights.page.html',
  styleUrl: './insights.page.scss',
})
export class InsightsPage implements OnInit, OnDestroy {
  protected loading = true;
  protected insights: LibraryInsights | null = null;

  private readonly destroy$ = new Subject<void>();

  constructor(private readonly gameService: GameService) {
    addIcons({
      arrowBackOutline,
      checkmarkCircleOutline,
      flameOutline,
      gameControllerOutline,
      heartOutline,
      starOutline,
      statsChartOutline,
      timeOutline,
      trophyOutline,
    });
  }

  public ngOnInit(): void {
    this.gameService.games$.pipe(takeUntil(this.destroy$)).subscribe((games) => {
      this.insights = computeLibraryInsights(games);
      this.loading = false;
    });

    this.gameService.getGames().pipe(takeUntil(this.destroy$)).subscribe({
      error: () => {
        this.loading = false;
      },
    });
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected pct(count: number): number {
    if (!this.insights || this.insights.total === 0) {
      return 0;
    }
    return Math.min(100, Math.round((count / this.insights.total) * 100));
  }

  protected statusLabel(status: string): string {
    return status.replace(/_/g, ' ');
  }
}
