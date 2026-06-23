import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";

export function passwordMatchValidator(
  passwordField = "password",
  confirmField = "confirmPassword",
): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const password = group.get(passwordField)?.value;
    const confirm = group.get(confirmField)?.value;

    if (!confirm) {
      return null;
    }

    return password === confirm ? null : { passwordMismatch: true };
  };
}

export type PasswordStrength = "empty" | "weak" | "fair" | "good" | "strong";

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return "empty";
  }

  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return "weak";
  if (score === 2) return "fair";
  if (score === 3) return "good";
  return "strong";
}
