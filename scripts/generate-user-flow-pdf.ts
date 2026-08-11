/**
 * Generate docs/USER-FLOW.pdf from presentasi.html (Mermaid rendered via Puppeteer).
 * Usage: npx tsx scripts/generate-user-flow-pdf.ts
 */
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const CHROME_CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
].filter(Boolean) as string[];

async function main() {
  const require = createRequire(import.meta.url);
  let puppeteer: typeof import("puppeteer-core");
  try {
    puppeteer = require("puppeteer-core");
  } catch {
    console.error("puppeteer-core belum terpasang. Jalankan: npm i -D puppeteer-core");
    process.exit(1);
  }

  const root = path.resolve(__dirname, "..");
  const htmlPath = path.join(root, "docs/user-flow/presentasi.html");
  const pdfPath = path.join(root, "docs/USER-FLOW.pdf");
  const fileUrl = pathToFileURL(htmlPath).href;
  const executablePath = CHROME_CANDIDATES[0];

  if (!executablePath) {
    console.error("Chrome/Chromium tidak ditemukan. Set PUPPETEER_EXECUTABLE_PATH.");
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });
    await page.goto(fileUrl, { waitUntil: "networkidle0", timeout: 120_000 });
    await page.waitForFunction(
      () => document.documentElement.dataset.mermaid === "ready",
      { timeout: 60_000 }
    );
    await new Promise((r) => setTimeout(r, 500));

    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", right: "10mm", bottom: "12mm", left: "10mm" },
    });

    console.log(`PDF written: ${pdfPath}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
