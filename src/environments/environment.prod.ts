export const environment = {
  production: true,
  neonDatabaseUrl: process.env['NG_APP_NEON_DATABASE_URL'] || '',
  neonAuthUrl: process.env['NG_APP_NEON_AUTH_URL'] || '',
  apiBaseUrl: '/api'
};
