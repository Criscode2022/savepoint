export const environment = {
  production: true,
  apiBaseUrl: '/api',
  neonAuthUrl: '/auth',
  neonDatabaseUrl: "postgresql://neondb_owner:npg_ga9qZ1uUYejM@ep-calm-credit-ahfggcxi-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  // Neon Data API REST endpoint (HTTP) - different from PostgreSQL connection string
  databaseUrl: "https://ep-calm-credit-ahfggcxi.apirest.c-3.us-east-1.aws.neon.tech/neondb/rest/v1"
};
