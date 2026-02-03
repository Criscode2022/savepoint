export const environment = {
  production: false,
  apiBaseUrl:
    typeof window !== "undefined" && (window as any).__ENV__?.API_BASE_URL
      ? (window as any).__ENV__.API_BASE_URL
      : "http://localhost:3000/api",
  neonAuthUrl:
    typeof window !== "undefined" && (window as any).__ENV__?.NEON_AUTH_URL
      ? (window as any).__ENV__.NEON_AUTH_URL
      : "http://localhost:3000/auth",
  // Neon Data API REST endpoint (HTTP)
  databaseUrl: 
    typeof window !== "undefined" && (window as any).__ENV__?.DATABASE_URL
      ? (window as any).__ENV__.DATABASE_URL
      : "https://ep-calm-credit-ahfggcxi.apirest.c-3.us-east-1.aws.neon.tech/neondb/rest/v1"
};
