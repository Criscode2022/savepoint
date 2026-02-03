const { neon } = require("@neondatabase/serverless");
const path = require("path");

// Load .env if present (local dev)
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

async function migrate() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("❌ DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const sql = neon(connectionString);

  try {
    console.log("🔄 Running migrations...");

    // Read and execute migration files
    const fs = require("fs");
    const path = require("path");

    const migrationFiles = fs
      .readdirSync(__dirname)
      .filter((f) => f.endsWith(".sql") && f.match(/^\d+_/))
      .sort();

    for (const file of migrationFiles) {
      console.log(`  📄 ${file}`);
      const content = fs.readFileSync(path.join(__dirname, file), 'utf8');
      // Split by semicolons to handle multiple statements (Neon doesn't support multiple commands in one query)
      const statements = content
        .replace(/--.*$/gm, '') // Remove comments
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      for (const stmt of statements) {
        await sql(stmt + ';');
      }
    }

    console.log("✅ Migrations completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  }
}

migrate();
