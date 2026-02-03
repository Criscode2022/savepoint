export const environment = {
  production: false,
  apiBaseUrl:
    typeof window !== "undefined" && (window as any).__ENV__?.DATABASE_URL
      ? (window as any).__ENV__.DATABASE_URL
      : "http://localhost:3000/api",
  neonAuthUrl:
    typeof window !== "undefined" && (window as any).__ENV__?.NEON_AUTH_URL
      ? (window as any).__ENV__.NEON_AUTH_URL
      : "http://localhost:3000/auth",
};
