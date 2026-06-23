export function mapAuthError(message: string | undefined): string {
  if (!message) {
    return "Something went wrong. Please try again.";
  }

  const lower = message.toLowerCase();

  if (
    lower.includes("invalid") &&
    (lower.includes("credential") || lower.includes("password"))
  ) {
    return "Invalid email or password. Please try again.";
  }

  if (
    lower.includes("already") ||
    lower.includes("exists") ||
    lower.includes("duplicate")
  ) {
    return "An account with this email already exists.";
  }

  if (lower.includes("too many") || lower.includes("rate limit")) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  if (lower.includes("network") || lower.includes("fetch")) {
    return "Connection error. Check your internet and try again.";
  }

  return message;
}
