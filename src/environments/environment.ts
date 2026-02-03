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
  neonDatabaseUrl: 
    typeof window !== "undefined" && (window as any).__ENV__?.NEON_DATABASE_URL
      ? (window as any).__ENV__.NEON_DATABASE_URL
      : "postgresql://neondb_owner:npg_ga9qZ1uUYejM@ep-calm-credit-ahfggcxi-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  // Neon Data API REST endpoint (HTTP) - different from PostgreSQL connection string
  databaseUrl: 
    typeof window !== "undefined" && (window as any).__ENV__?.DATABASE_REST_URL
      ? (window as any).__ENV__.DATABASE_REST_URL
      : "https://ep-calm-credit-ahfggcxi.apirest.c-3.us-east-1.aws.neon.tech/neondb/rest/v1"
};
