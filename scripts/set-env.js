const fs = require("fs");
const path = require("path");
require("dotenv").config();

const envDir = path.join(__dirname, "../src/environments");

if (!fs.existsSync(envDir)) {
  fs.mkdirSync(envDir, { recursive: true });
}

const neonAuthUrl = process.env.NEON_AUTH_URL || "";
const databaseUrl = process.env.DATABASE_URL || "";
const databaseSchema = process.env.DATABASE_SCHEMA || "public";

// Convert PostgreSQL URL to Neon REST API URL
// From: postgresql://user:pass@host-pooler.region.aws.neon.tech/dbname?...
// To: https://host.region.aws.neon.tech/rest/v1
function getRestApiUrl(pgUrl) {
  if (!pgUrl) return "";
  
  // If it's already an HTTP URL, return as-is
  if (pgUrl.startsWith('http://') || pgUrl.startsWith('https://')) {
    return pgUrl;
  }
  
  // Parse PostgreSQL URL
  const match = pgUrl.match(/postgresql:\/\/[^@]+@([^/]+)\/([^?]+)/);
  if (!match) return "";
  
  const host = match[1];
  // Remove -pooler suffix if present for the REST API endpoint
  const restHost = host.replace('-pooler.', '.');
  
  return `https://${restHost}/rest/v1`;
}

const restApiUrl = getRestApiUrl(databaseUrl);

const environmentFileContent = `// This file is auto-generated from .env - do not edit directly
export const environment = {
  production: false,
  neonAuthUrl: '${neonAuthUrl}',
  databaseUrl: '${restApiUrl}',
  databaseSchema: '${databaseSchema}'
};
`;

const environmentProdFileContent = `// This file is auto-generated from .env - do not edit directly
export const environment = {
  production: true,
  neonAuthUrl: '${neonAuthUrl}',
  databaseUrl: '${restApiUrl}',
  databaseSchema: '${databaseSchema}'
};
`;

fs.writeFileSync(path.join(envDir, "environment.ts"), environmentFileContent);
fs.writeFileSync(
  path.join(envDir, "environment.prod.ts"),
  environmentProdFileContent
);

console.log("Environment files generated successfully");
console.log("REST API URL:", restApiUrl);
