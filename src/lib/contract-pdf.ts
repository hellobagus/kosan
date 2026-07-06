import { execFile } from "child_process";
import { randomBytes } from "crypto";
import { unlink, writeFile, readFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/** Margin standar Microsoft Word (Normal): 2.54 cm / 1 inch */
export const PDF_MARGIN_MM = "25.4";

export async function htmlToPdfBuffer(html: string): Promise<Buffer> {
  const id = randomBytes(8).toString("hex");
  const htmlPath = join(tmpdir(), `kosanku-contract-${id}.html`);
  const pdfPath = join(tmpdir(), `kosanku-contract-${id}.pdf`);

  try {
    await writeFile(htmlPath, html, "utf-8");
    await execFileAsync(
      "wkhtmltopdf",
      [
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
      ],
      { timeout: 60_000 }
    );
    return await readFile(pdfPath);
  } finally {
    await unlink(htmlPath).catch(() => {});
    await unlink(pdfPath).catch(() => {});
  }
}

export function isPdfGenerationAvailable(): boolean {
  return true;
}
