const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const iconDir = path.join(__dirname, "../src/assets/icon");
const svgPath = path.join(iconDir, "favicon.svg");

const sizes = [
  { name: "favicon.png", size: 32 },
  { name: "favicon-192.png", size: 192 },
  { name: "apple-touch-icon.png", size: 180 },
];

function renderWithResvg(size, outputPath) {
  execSync(
    `npx --yes @resvg/resvg-js-cli --fit-width ${size} --fit-height ${size} "${svgPath}" "${outputPath}"`,
    { stdio: "pipe" },
  );
}

if (!fs.existsSync(svgPath)) {
  console.error("Missing favicon.svg");
  process.exit(1);
}

for (const { name, size } of sizes) {
  const outputPath = path.join(iconDir, name);
  renderWithResvg(size, outputPath);
  console.log(`Generated ${name} (${size}x${size})`);
}
