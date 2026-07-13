const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { neon } = require("@neondatabase/serverless");

async function main() {
  const connectionString =
    process.env.DATABASE_CONNECTION_STRING || process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("DATABASE_URL / DATABASE_CONNECTION_STRING is required");
    process.exit(1);
  }

  // Neon serverless driver needs a direct postgres URL, not REST
  if (connectionString.startsWith("http")) {
    console.error(
      "DATABASE_URL looks like a REST endpoint. Set DATABASE_CONNECTION_STRING to the postgresql:// connection string.",
    );
    process.exit(1);
  }

  const sql = neon(connectionString);

  console.log("Adding games.tags column if missing...");
  await sql`ALTER TABLE games ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'`;
  await sql`CREATE INDEX IF NOT EXISTS idx_games_tags ON games USING GIN (tags)`;

  const cols = await sql`
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'games'
      AND column_name = 'tags'
  `;

  console.log("tags column:", cols);
  console.log("Done. If Data API still errors, run: npm run db:refresh-api-schema");
}

main().catch((error) => {
  console.error("Failed:", error.message);
  process.exit(1);
});
