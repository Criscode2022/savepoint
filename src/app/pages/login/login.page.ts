import { CommonModule } from "@angular/common";
import { Component, computed, inject, OnInit, signal } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import {
  ActivatedRoute,
  Router,
  RouterLink,
} from "@angular/router";
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonSpinner,
  ToastController,
} from "@ionic/angular/standalone";
import { addIcons } from "ionicons";
import {
  alertCircleOutline,
  arrowForward,
  eyeOffOutline,
  eyeOutline,
  gameController,
  lockClosedOutline,
  mailOutline,
  personOutline,
} from "ionicons/icons";
import { AuthService } from "../../services/auth.service";
import { mapAuthError } from "../../shared/utils/auth-errors";
import {
  getPasswordStrength,
  passwordMatchValidator,
  PasswordStrength,
} from "../../shared/validators/auth.validators";

@Component({
  selector: "app-login",
  templateUrl: "./login.page.html",
  styleUrl: "./login.page.scss",
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardContent,
    IonItem,
    IonInput,
    IonButton,
    IonIcon,
    IonSpinner,
  ],
})
export class LoginPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toastCtrl = inject(ToastController);

  isRegisterMode = signal(false);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  showPassword = signal(false);
  showConfirmPassword = signal(false);

  authForm: FormGroup = this.fb.group(
    {
      username: [""],
      email: ["", [Validators.required, Validators.email]],
      password: ["", [Validators.required, Validators.minLength(8)]],
      confirmPassword: [""],
    },
    { validators: passwordMatchValidator() },
  );

  passwordStrength = computed<PasswordStrength>(() =>
    getPasswordStrength(this.authForm.get("password")?.value ?? ""),
  );

  strengthLabel = computed(() => {
    const labels: Record<PasswordStrength, string> = {
      empty: "",
      weak: "Weak — add more characters and mix types",
      fair: "Fair — try adding numbers or symbols",
      good: "Good — almost there",
      strong: "Strong password",
    };
    return labels[this.passwordStrength()];
  });

  strengthBars = computed(() => {
    const levels: Record<PasswordStrength, number> = {
      empty: 0,
      weak: 1,
      fair: 2,
      good: 3,
      strong: 4,
    };
    return levels[this.passwordStrength()];
  });

  constructor() {
    addIcons({
      gameController,
      mailOutline,
      lockClosedOutline,
      personOutline,
      arrowForward,
      eyeOutline,
      eyeOffOutline,
      alertCircleOutline,
    });
  }

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      const registerMode = data["authMode"] === "register";
      this.isRegisterMode.set(registerMode);
      this.applyModeValidators(registerMode);
      this.errorMessage.set(null);
    });
  }

  isInvalid(controlName: string): boolean {
    const control = this.authForm.get(controlName);
    return !!(
      control &&
      control.invalid &&
      (control.dirty || control.touched)
    );
  }

  fieldError(controlName: string): string | null {
    const control = this.authForm.get(controlName);
    if (!control || !this.isInvalid(controlName)) {
      return null;
    }

    if (control.hasError("required")) {
      const labels: Record<string, string> = {
        username: "Username is required",
        email: "Email is required",
        password: "Password is required",
        confirmPassword: "Please confirm your password",
      };
      return labels[controlName] ?? "This field is required";
    }

    if (control.hasError("email")) {
      return "Enter a valid email address";
    }

    if (control.hasError("minlength")) {
      if (controlName === "username") {
        return "Username must be at least 3 characters";
      }
      return "Password must be at least 8 characters";
    }

    return null;
  }

  hasPasswordMismatch(): boolean {
    return (
      this.isRegisterMode() &&
      this.authForm.hasError("passwordMismatch") &&
      !!this.authForm.get("confirmPassword")?.touched
    );
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((value) => !value);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((value) => !value);
  }

  async onSubmit(): Promise<void> {
    this.authForm.markAllAsTouched();

    if (this.authForm.invalid) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { email, password, username } = this.authForm.value;

    try {
      if (this.isRegisterMode()) {
        await this.authService.register({ email, password, username });
        await this.showToast("Welcome to GameVault! Your account is ready.", "success");
      } else {
        await this.authService.login({ email, password });
        await this.showToast("Welcome back, gamer!", "success");
      }
      await this.router.navigate(["/home"]);
    } catch (error: unknown) {
      const message = mapAuthError(
        error instanceof Error ? error.message : undefined,
      );
      this.errorMessage.set(message);
      await this.showToast(message, "danger");
    } finally {
      this.isLoading.set(false);
    }
  }

  private applyModeValidators(registerMode: boolean): void {
    const username = this.authForm.get("username");
    const confirmPassword = this.authForm.get("confirmPassword");

    if (registerMode) {
      username?.setValidators([
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(24),
        Validators.pattern(/^[a-zA-Z0-9_\- ]+$/),
      ]);
      confirmPassword?.setValidators([Validators.required]);
    } else {
      username?.clearValidators();
      confirmPassword?.clearValidators();
    }

    username?.updateValueAndValidity({ emitEvent: false });
    confirmPassword?.updateValueAndValidity({ emitEvent: false });
  }

  private async showToast(
    message: string,
    color: "success" | "danger",
  ): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3200,
      color,
      position: "top",
      cssClass: "auth-toast",
    });
    await toast.present();
  }
}
