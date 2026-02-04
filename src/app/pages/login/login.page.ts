import { CommonModule } from "@angular/common";
import { Component, inject, signal } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { Router, RouterModule } from "@angular/router";
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonSpinner,
  IonText,
  ToastController,
} from "@ionic/angular/standalone";
import { addIcons } from "ionicons";
import {
  arrowForward,
  gameController,
  lockClosedOutline,
  mail,
  person,
} from "ionicons/icons";
import { AuthService } from "../../services/auth.service";

@Component({
  selector: "app-login",
  template: `
    <ion-content class="ion-padding" [fullscreen]="true">
      <div class="min-h-screen flex items-center justify-center">
        <div class="w-full max-w-md">
          <!-- Logo -->
          <div class="text-center mb-8 animate-slide-up">
            <div
              class="w-24 h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#a855f7] to-[#06b6d4] flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.4)]"
            >
              <ion-icon
                name="game-controller"
                class="text-5xl text-white"
              ></ion-icon>
            </div>
            <h1 class="text-4xl font-bold mb-2 gaming-gradient-text">
              GameVault
            </h1>
            <p class="text-white font-medium drop-shadow-sm">Your ultimate game collection manager</p>
          </div>

          <!-- Login Card -->
          <ion-card class="gaming-card overflow-hidden mt-6" style="padding: 1.5rem;">
            <ion-card-header class="pb-0" style="padding: 0 0 1rem 0;">
              <ion-card-title 
                class="text-2xl text-center" 
                style="color: white; font-weight: 700; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">
                {{ isRegisterMode() ? "Create Account" : "Welcome Back" }}
              </ion-card-title>
            </ion-card-header>

            <ion-card-content>
              <form
                [formGroup]="authForm"
                (ngSubmit)="onSubmit()"
                class="space-y-4"
              >
                <!-- Username (Register only) -->
                @if (isRegisterMode()) {
                  <ion-item class="gaming-input">
                    <ion-icon
                      name="person"
                      slot="start"
                      class="text-white drop-shadow-md mr-3"
                    ></ion-icon>
                    <ion-input
                      formControlName="username"
                      placeholder="Username"
                      type="text"
                    ></ion-input>
                  </ion-item>
                }

                <!-- Email -->
                <ion-item class="gaming-input">
                  <ion-icon
                    name="mail"
                    slot="start"
                    class="text-white drop-shadow-md mr-3"
                  ></ion-icon>
                  <ion-input
                    formControlName="email"
                    placeholder="Email"
                    type="email"
                  ></ion-input>
                </ion-item>

                <!-- Password -->
                <ion-item class="gaming-input">
                  <ion-icon
                    name="lock-closed-outline"
                    slot="start"
                    class="text-white drop-shadow-md mr-3"
                  ></ion-icon>
                  <ion-input
                    formControlName="password"
                    placeholder="Password"
                    type="password"
                  ></ion-input>
                </ion-item>

                <!-- Error Message -->
                @if (errorMessage()) {
                  <ion-text color="danger" class="block text-center">
                    <p class="text-sm">{{ errorMessage() }}</p>
                  </ion-text>
                }

                <!-- Submit Button -->
                <ion-button
                  expand="block"
                  type="submit"
                  [disabled]="authForm.invalid || isLoading()"
                  class="mt-6"
                >
                  @if (isLoading()) {
                    <ion-spinner name="crescent" slot="start"></ion-spinner>
                  } @else {
                    <ion-icon name="arrow-forward" slot="end"></ion-icon>
                  }
                  {{ isRegisterMode() ? "Create Account" : "Sign In" }}
                </ion-button>

                <!-- Toggle Mode -->
                <div class="text-center mt-4">
                  <p class="text-white font-medium">
                    {{
                      isRegisterMode()
                        ? "Already have an account?"
                        : "Don't have an account?"
                    }}
                    <a
                      (click)="toggleMode()"
                      class="text-[#d8b4fe] cursor-pointer ml-1 hover:underline font-semibold"
                    >
                      {{ isRegisterMode() ? "Sign In" : "Create one" }}
                    </a>
                  </p>
                </div>
              </form>
            </ion-card-content>
          </ion-card>
        </div>
      </div>
    </ion-content>
  `,
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonInput,
    IonButton,
    IonIcon,
    IonText,
    IonSpinner,
  ],
})
export class LoginPage {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastCtrl = inject(ToastController);

  isRegisterMode = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  authForm: FormGroup = this.fb.group({
    email: ["", [Validators.required, Validators.email]],
    password: ["", [Validators.required, Validators.minLength(6)]],
    username: [""],
  });

  constructor() {
    addIcons({ gameController, mail, lockClosedOutline, person, arrowForward });
  }

  toggleMode(): void {
    this.isRegisterMode.update((v) => !v);
    this.errorMessage.set(null);
    this.authForm.reset();
  }

  async onSubmit(): Promise<void> {
    if (this.authForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { email, password, username } = this.authForm.value;

    try {
      if (this.isRegisterMode()) {
        await this.authService.register({ email, password, username });
        this.showToast("Account created successfully!", "success");
      } else {
        await this.authService.login({ email, password });
        this.showToast("Welcome back!", "success");
      }
      this.router.navigate(["/home"]);
    } catch (error: any) {
      this.errorMessage.set(error.message || "Authentication failed");
      this.showToast(error.message || "Authentication failed", "danger");
    } finally {
      this.isLoading.set(false);
    }
  }

  private async showToast(
    message: string,
    color: "success" | "danger",
  ): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: "bottom",
    });
    await toast.present();
  }
}
