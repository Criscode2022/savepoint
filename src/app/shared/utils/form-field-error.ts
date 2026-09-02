/** Shape shared by reactive AbstractControl and template-driven NgModel. */
export interface FieldErrorControl {
  invalid: boolean;
  dirty: boolean;
}

/**
 * Persist a field error until the value is valid.
 * The first reveal waits until the control is dirty and unfocused;
 * after that it stays visible even while focused.
 * Submit should add invalid fields to `alreadyShown` so they appear immediately.
 */
export function shouldShowFieldError(
  control: FieldErrorControl | null | undefined,
  alreadyShown: boolean,
  focused: boolean,
): boolean {
  if (!control?.invalid) {
    return false;
  }

  if (alreadyShown) {
    return true;
  }

  return control.dirty && !focused;
}
