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

const environmentFileContent = `// This file is auto-generated from .env - do not edit directly
export const environment = {
  production: false,
  neonAuthUrl: '${neonAuthUrl}',
  databaseUrl: '${databaseUrl}',
  databaseSchema: '${databaseSchema}'
};
`;

const environmentProdFileContent = `// This file is auto-generated from .env - do not edit directly
export const environment = {
  production: true,
  neonAuthUrl: '${neonAuthUrl}',
  databaseUrl: '${databaseUrl}',
  databaseSchema: '${databaseSchema}'
};
`;

fs.writeFileSync(path.join(envDir, "environment.ts"), environmentFileContent);
fs.writeFileSync(
  path.join(envDir, "environment.prod.ts"),
  environmentProdFileContent,
);

console.log("Environment files generated successfully");
