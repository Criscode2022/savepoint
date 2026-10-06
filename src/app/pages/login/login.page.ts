import { CommonModule } from "@angular/common";
import { Component, computed, DestroyRef, inject, OnInit, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
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
  lockClosedOutline,
  mailOutline,
  personOutline,
} from "ionicons/icons";
import { AuthService } from "../../services/auth.service";
import { mapAuthError } from "../../shared/utils/auth-errors";
import { shouldShowFieldError } from "../../shared/utils/form-field-error";
import {
  getPasswordStrength,
  passwordMatchValidator,
  PasswordStrength,
} from "../../shared/validators/auth.validators";
import { BrandMarkComponent } from "../../components/brand-mark/brand-mark.component";
import { APP_NAME, APP_TAGLINE } from "../../shared/brand";

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
    BrandMarkComponent,
  ],
})
export class LoginPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toastCtrl = inject(ToastController);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly appName = APP_NAME;
  protected readonly tagline = APP_TAGLINE;
  protected readonly isRegisterMode = signal(false);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly showPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);
  protected readonly submitted = signal(false);
  protected readonly focusedField = signal<string | null>(null);
  private readonly revealedErrors = signal<ReadonlySet<string>>(new Set());
  private readonly authFields = [
    "username",
    "email",
    "password",
    "confirmPassword",
  ] as const;

  protected readonly authForm: FormGroup = this.fb.group(
    {
      username: [""],
      email: ["", [Validators.required, Validators.email]],
      password: ["", [Validators.required, Validators.minLength(8)]],
      confirmPassword: [""],
    },
    { validators: passwordMatchValidator() },
  );

  protected readonly passwordStrength = computed<PasswordStrength>(() =>
    getPasswordStrength(this.authForm.get("password")?.value ?? ""),
  );

  protected readonly strengthLabel = computed(() => {
    const labels: Record<PasswordStrength, string> = {
      empty: "",
      weak: "Weak — add more characters and mix types",
      fair: "Fair — try adding numbers or symbols",
      good: "Good — almost there",
      strong: "Strong password",
    };
    return labels[this.passwordStrength()];
  });

  protected readonly strengthBars = computed(() => {
    const levels: Record<PasswordStrength, number> = {
      empty: 0,
      weak: 1,
      fair: 2,
      good: 3,
      strong: 4,
    };
    return levels[this.passwordStrength()];
  });

  public ngOnInit(): void {
    addIcons({
      mailOutline,
      lockClosedOutline,
      personOutline,
      arrowForward,
      eyeOutline,
      eyeOffOutline,
      alertCircleOutline,
    });

    this.route.data.subscribe((data) => {
      const registerMode = data["authMode"] === "register";
      this.isRegisterMode.set(registerMode);
      this.applyModeValidators(registerMode);
      this.errorMessage.set(null);
      this.submitted.set(false);
      this.focusedField.set(null);
      this.revealedErrors.set(new Set());
    });

    this.authForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.syncVisibleErrors();
      });
  }

  protected onFieldFocus(controlName: string): void {
    this.focusedField.set(controlName);
  }

  protected onFieldBlur(controlName: string): void {
    this.focusedField.update((current) =>
      current === controlName ? null : current,
    );
    this.syncFieldError(controlName);
    if (controlName === "password") {
      this.syncFieldError("confirmPassword");
    }
  }

  protected isInvalid(controlName: string): boolean {
    return this.revealedErrors().has(controlName);
  }

  protected fieldError(controlName: string): string | null {
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

  protected hasPasswordMismatch(): boolean {
    return (
      this.isRegisterMode() &&
      this.authForm.hasError("passwordMismatch") &&
      this.revealedErrors().has("confirmPassword")
    );
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update((value) => !value);
  }

  protected toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((value) => !value);
  }

  protected async onSubmit(): Promise<void> {
    this.submitted.set(true);
    this.authForm.markAllAsTouched();
    this.revealInvalidFields();

    if (this.authForm.invalid) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { email, password, username } = this.authForm.value;

    try {
      if (this.isRegisterMode()) {
        await this.authService.register({ email, password, username });
        await this.showToast(`Welcome to ${APP_NAME}! Your library is ready.`, "success");
      } else {
        await this.authService.login({ email, password });
        await this.showToast("Welcome back — save loaded.", "success");
      }
      await this.router.navigate(["/home"]);
    } catch (error: unknown) {
      const message = mapAuthError(
        error instanceof Error ? error.message : undefined,
      );
      this.errorMessage.set(message);
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

  private syncVisibleErrors(): void {
    for (const name of this.authFields) {
      this.syncFieldError(name);
    }
  }

  private revealInvalidFields(): void {
    for (const name of this.authFields) {
      if (this.controlHasError(name)) {
        this.setRevealed(name, true);
      }
    }
  }

  private syncFieldError(controlName: string): void {
    const control = this.authForm.get(controlName);
    const show = shouldShowFieldError(
      {
        invalid: this.controlHasError(controlName),
        dirty: !!control?.dirty,
      },
      this.revealedErrors().has(controlName),
      this.focusedField() === controlName,
    );
    this.setRevealed(controlName, show);
  }

  private controlHasError(controlName: string): boolean {
    const control = this.authForm.get(controlName);
    if (controlName === "confirmPassword") {
      return !!(
        control?.invalid ||
        (this.isRegisterMode() && this.authForm.hasError("passwordMismatch"))
      );
    }
    return !!control?.invalid;
  }

  private setRevealed(controlName: string, show: boolean): void {
    this.revealedErrors.update((current) => {
      const has = current.has(controlName);
      if (show === has) {
        return current;
      }
      const next = new Set(current);
      if (show) {
        next.add(controlName);
      } else {
        next.delete(controlName);
      }
      return next;
    });
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
