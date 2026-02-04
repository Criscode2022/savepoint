import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { 
  IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonItem, IonLabel, IonInput, IonButton, IonIcon, IonText, IonToast
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { gameControllerOutline, mailOutline, lockClosedOutline, personOutline } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonItem, IonLabel, IonInput, IonButton, IonIcon, IonText, IonToast
  ],
  template: `
    <ion-content class="register-content" fullscreen>
      <div class="register-container">
        <div class="bg-grid"></div>
        <div class="glow-orb orb-1"></div>
        <div class="glow-orb orb-2"></div>

        <div class="logo-section animate-fade-in">
          <div class="logo-icon">
            <ion-icon name="game-controller-outline"></ion-icon>
          </div>
          <h1 class="logo-title gaming-font">Join <span class="text-gradient">GameVault</span></h1>
          <p class="logo-subtitle">Start building your game collection</p>
        </div>

        <ion-card class="register-card animate-slide-in">
          <ion-card-header>
            <ion-card-title class="gaming-font">Create Account</ion-card-title>
          </ion-card-header>

          <ion-card-content>
            <form (ngSubmit)="onRegister()" #registerForm="ngForm">
              <ion-item class="input-item">
                <ion-icon slot="start" name="person-outline"></ion-icon>
                <ion-input
                  type="text"
                  placeholder="Username"
                  [(ngModel)]="username"
                  name="username"
                  required></ion-input>
              </ion-item>

              <ion-item class="input-item">
                <ion-icon slot="start" name="mail-outline"></ion-icon>
                <ion-input
                  type="email"
                  placeholder="Email"
                  [(ngModel)]="email"
                  name="email"
                  required
                  email></ion-input>
              </ion-item>

              <ion-item class="input-item">
                <ion-icon slot="start" name="lock-closed-outline"></ion-icon>
                <ion-input
                  type="password"
                  placeholder="Password"
                  [(ngModel)]="password"
                  name="password"
                  required
                  minlength="6"></ion-input>
              </ion-item>

              <ion-item class="input-item">
                <ion-icon slot="start" name="lock-closed-outline"></ion-icon>
                <ion-input
                  type="password"
                  placeholder="Confirm Password"
                  [(ngModel)]="confirmPassword"
                  name="confirmPassword"
                  required></ion-input>
              </ion-item>

              <ion-button 
                expand="block" 
                type="submit"
                [disabled]="isLoading || !registerForm.valid"
                class="register-button">
                <span *ngIf="!isLoading">Create Account</span>
                <span *ngIf="isLoading">Creating... </span>
              </ion-button>
            </form>

            <div class="login-link">
              <ion-text>
                Already have an account? 
                <a routerLink="/login" class="text-gradient">Sign in</a>
              </ion-text>
            </div>
          </ion-card-content>
        </ion-card>

        <ion-toast
          [isOpen]="!!errorMessage"
          [message]="errorMessage"
          duration="3000"
          position="top"
          color="danger"
          (didDismiss)="errorMessage = ''">
        </ion-toast>
      </div>
    </ion-content>
  `,
  styles: [`
    .register-content {
      --background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #252542 100%);
    }

    .register-container {
      min-height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 2rem;
      position: relative;
      overflow: hidden;
    }

    .bg-grid {
      position: absolute;
      inset: 0;
      background-image: 
        linear-gradient(rgba(139, 92, 246, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(139, 92, 246, 0.03) 1px, transparent 1px);
      background-size: 50px 50px;
      pointer-events: none;
    }

    .glow-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(100px);
      opacity: 0.3;
      pointer-events: none;
    }

    .orb-1 {
      width: 400px;
      height: 400px;
      background: #f472b6;
      top: -100px;
      left: -100px;
      animation: pulse-glow 4s ease-in-out infinite;
    }

    .orb-2 {
      width: 300px;
      height: 300px;
      background: #8b5cf6;
      bottom: -50px;
      right: -50px;
      animation: pulse-glow 4s ease-in-out infinite 2s;
    }

    .logo-section {
      text-align: center;
      margin-bottom: 2rem;
      z-index: 1;
    }

    .logo-icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 1rem;
      background: linear-gradient(135deg, #f472b6 0%, #8b5cf6 100%);
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 30px rgba(244, 114, 182, 0.4);
      animation: float 3s ease-in-out infinite;
    }

    .logo-icon ion-icon {
      font-size: 40px;
      color: white;
    }

    .logo-title {
      font-size: 2.5rem;
      font-weight: 800;
      color: #f8fafc;
      margin: 0;
      letter-spacing: 2px;
    }

    .logo-subtitle {
      color: #ffffff;
      margin-top: 0.5rem;
      font-size: 1rem;
      font-weight: 500;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    }

    .register-card {
      width: 100%;
      max-width: 420px;
      background: rgba(22, 22, 42, 0.9);
      backdrop-filter: blur(20px);
      border-radius: 24px;
      border: 1px solid rgba(139, 92, 246, 0.2);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      z-index: 1;
    }

    ion-card-header {
      text-align: center;
      padding: 2rem 2rem 1rem;
    }

    ion-card-title {
      font-size: 1.5rem;
      color: #f8fafc;
    }

    ion-card-content {
      padding: 0 2rem 2rem;
    }

    .input-item {
      --background: rgba(30, 30, 54, 0.8);
      --border-color: rgba(139, 92, 246, 0.2);
      --border-radius: 12px;
      --padding-start: 16px;
      --padding-end: 16px;
      margin-bottom: 1rem;
      border-radius: 12px;
      border: 1px solid rgba(139, 92, 246, 0.2);
    }

    .input-item ion-icon {
      color: #ffffff;
      font-size: 20px;
      margin-right: 12px;
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
    }

    .input-item:focus-within {
      border-color: #8b5cf6;
      box-shadow: 0 0 15px rgba(139, 92, 246, 0.2);
    }

    .register-button {
      margin-top: 1.5rem;
      --background: linear-gradient(135deg, #f472b6 0%, #8b5cf6 100%);
      --background-hover: linear-gradient(135deg, #f9a8d4 0%, #a78bfa 100%);
      --border-radius: 12px;
      height: 52px;
      font-size: 1rem;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: none;
      box-shadow: 0 4px 15px rgba(244, 114, 182, 0.4);
    }

    .register-button::part(native) {
      border-radius: 12px;
    }

    .login-link {
      text-align: center;
      margin-top: 1.5rem;
      color: #ffffff;
      font-weight: 500;
    }

    .login-link a {
      text-decoration: none;
      font-weight: 600;
    }

    @keyframes pulse-glow {
      0%, 100% { opacity: 0.3; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.1); }
    }

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }

    .animate-fade-in {
      animation: fadeIn 0.6s ease-out;
    }

    .animate-slide-in {
      animation: slideIn 0.6s ease-out 0.2s both;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideIn {
      from { 
        opacity: 0;
        transform: translateY(30px);
      }
      to { 
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 480px) {
      .register-container {
        padding: 1rem;
      }

      .logo-title {
        font-size: 2rem;
      }

      .register-card {
        border-radius: 20px;
      }

      ion-card-content {
        padding: 0 1.5rem 1.5rem;
      }
    }
  `]
})
export class RegisterPage {
  username = '';
  email = '';
  password = '';
  confirmPassword = '';
  isLoading = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    addIcons({ 
      gameControllerOutline, 
      mailOutline, 
      lockClosedOutline, 
      personOutline 
    });
  }

  async onRegister(): Promise<void> {
    if (!this.username || !this.email || !this.password) return;

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      await this.authService.register({
        email: this.email,
        password: this.password,
        username: this.username
      });
      this.router.navigate(['/home']);
    } catch (error: any) {
      this.errorMessage = error.message || 'Registration failed. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }
}
