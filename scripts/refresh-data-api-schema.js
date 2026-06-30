const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const apiKey = process.env.NEON_API_KEY;
const projectId = process.env.NEON_PROJECT_ID || "steep-breeze-35386493";
const branchId = process.env.NEON_BRANCH_ID || "br-dawn-wind-ahlb6iv7";
const databaseName = process.env.NEON_DATABASE || "neondb";

async function refreshSchemaCache() {
  if (!apiKey) {
    console.error(
      "NEON_API_KEY is required. Create one at https://console.neon.tech/app/settings/api-keys",
    );
    process.exit(1);
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
    const body = await response.text();
    console.error(`Schema refresh failed (${response.status}): ${body}`);
    process.exit(1);
  }

  console.log("Data API schema cache refreshed successfully.");
}

refreshSchemaCache().catch((error) => {
  console.error("Schema refresh failed:", error.message);
  process.exit(1);
});
