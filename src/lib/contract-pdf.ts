import { execFile } from "child_process";
import { randomBytes } from "crypto";
import { access } from "fs/promises";
import { unlink, writeFile, readFile } from "fs/promises";
import { constants } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/** Margin standar Microsoft Word (Normal): 2.54 cm / 1 inch */
export const PDF_MARGIN_MM = "25.4";

const WKHTMLTOPDF_CANDIDATES = [
  "/usr/bin/wkhtmltopdf",
  "/usr/local/bin/wkhtmltopdf",
  "wkhtmltopdf",
];

const XVFB_RUN = "/usr/bin/xvfb-run";

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function resolveWkhtmltopdf(): Promise<string> {
  for (const candidate of WKHTMLTOPDF_CANDIDATES) {
    if (candidate.startsWith("/")) {
      if (await pathExists(candidate)) return candidate;
    } else {
      try {
        await execFileAsync("which", [candidate]);
        return candidate;
      } catch {
        /* try next */
      }
    }
  }
  throw new Error(
    "wkhtmltopdf tidak ditemukan. Install: sudo apt install -y wkhtmltopdf"
  );
}

function buildPdfArgs(htmlPath: string, pdfPath: string): string[] {
  return [
    "--quiet",
    "--page-size",
    "A4",
    "--margin-top",
    `${PDF_MARGIN_MM}mm`,
    "--margin-bottom",
    `${PDF_MARGIN_MM}mm`,
    "--margin-left",
    `${PDF_MARGIN_MM}mm`,
    "--margin-right",
    `${PDF_MARGIN_MM}mm`,
    "--encoding",
    "UTF-8",
    "--enable-local-file-access",
    htmlPath,
    pdfPath,
  ];
}

export async function htmlToPdfBuffer(html: string): Promise<Buffer> {
  const id = randomBytes(8).toString("hex");
  const htmlPath = join(tmpdir(), `kosanku-contract-${id}.html`);
  const pdfPath = join(tmpdir(), `kosanku-contract-${id}.pdf`);

  try {
    await writeFile(htmlPath, html, "utf-8");
    const wkhtmltopdf = await resolveWkhtmltopdf();
    const pdfArgs = buildPdfArgs(htmlPath, pdfPath);
    const useXvfb = await pathExists(XVFB_RUN);

    try {
      if (useXvfb) {
        // Headless server: Qt/wkhtmltopdf butuh virtual display
        await execFileAsync(
          XVFB_RUN,
          ["-a", "--", wkhtmltopdf, ...pdfArgs],
          { timeout: 60_000 }
        );
      } else {
        await execFileAsync(wkhtmltopdf, pdfArgs, { timeout: 60_000 });
      }
    } catch (err) {
      const detail =
        err instanceof Error
          ? `${err.message}${"stderr" in err && err.stderr ? `\n${String(err.stderr)}` : ""}`
          : String(err);
      throw new Error(
        `Gagal menjalankan wkhtmltopdf${useXvfb ? " (via xvfb-run)" : ""}. ` +
          `Jika server tanpa GUI, install: sudo apt install -y xvfb. Detail: ${detail}`
      );
    }

    return await readFile(pdfPath);
  } finally {
    await unlink(htmlPath).catch(() => {});
    await unlink(pdfPath).catch(() => {});
  }
}

export function isPdfGenerationAvailable(): boolean {
  return true;
}
