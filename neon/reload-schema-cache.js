const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { neon } = require("@neondatabase/serverless");

async function main() {
  const connectionString =
    process.env.DATABASE_CONNECTION_STRING || process.env.DATABASE_URL;
  if (!connectionString || connectionString.startsWith("http")) {
    console.error("Need a postgresql:// DATABASE_CONNECTION_STRING");
    process.exit(1);
  }

  const sql = neon(connectionString);

  // PostgREST / some Data API stacks listen for this
  try {
    await sql`SELECT pg_notify('pgrst', 'reload schema')`;
    console.log("Sent pg_notify pgrst reload schema");
  } catch (e) {
    console.warn("pg_notify failed:", e.message);
  }

  // Verify column is visible
  const cols = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'games' AND column_name = 'tags'
  `;
  console.log("DB has tags:", cols.length > 0);

  const apiKey = process.env.NEON_API_KEY;
  const projectId = process.env.NEON_PROJECT_ID || "steep-breeze-35386493";
  const branchId = process.env.NEON_BRANCH_ID || "br-dawn-wind-ahlb6iv7";
  const databaseName = process.env.NEON_DATABASE || "neondb";

  if (!apiKey) {
    console.log(
      "NEON_API_KEY not set — Data API cache may still be stale until refreshed in Neon console or with npm run db:refresh-api-schema",
    );
    return;
  }

  const url = `https://console.neon.tech/api/v2/projects/${projectId}/branches/${branchId}/data-api/${databaseName}`;
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });

  if (!response.ok) {
    console.error(`Schema refresh failed (${response.status}):`, await response.text());
    process.exit(1);
  }
  console.log("Data API schema cache refreshed successfully.");
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
