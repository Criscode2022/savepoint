import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(process.cwd());
const envPath = path.join(projectRoot, ".env");
const outputPath = path.join(projectRoot, "src", "assets", "env.js");

if (!fs.existsSync(envPath)) {
  console.warn("[env] .env not found; skipping env.js generation");
  process.exit(0);
}

const envRaw = fs.readFileSync(envPath, "utf8");
const parsed = dotenv.parse(envRaw);

const DATABASE_URL = parsed.DATABASE_URL ?? "";
const NEON_AUTH_URL = parsed.NEON_AUTH_URL ?? "";

const payload = {
  DATABASE_URL,
  NEON_AUTH_URL,
};

// Generate a tiny script that runs before Angular bootstraps.
// Keep it simple so it works in any browser.
const contents = `// Auto-generated from .env. Do not commit.\nwindow.__ENV__ = ${JSON.stringify(payload, null, 2)};\n`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, contents, "utf8");

console.log(`[env] Wrote ${path.relative(projectRoot, outputPath)}`);
