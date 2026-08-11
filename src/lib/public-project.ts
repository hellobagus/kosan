import { prisma } from "@/lib/prisma";
import type { ProjectProfile } from "@/lib/settings-service";

/** Project yang ditampilkan di situs publik (landing calon penghuni). */
export async function resolvePublicProject(code?: string | null): Promise<ProjectProfile | null> {
  const preferred =
    (code || "").trim() ||
    process.env.PUBLIC_PROJECT_CODE ||
    process.env.NEXT_PUBLIC_PROJECT_CODE ||
    "";

  if (preferred) {
    const byCode = await prisma.project.findFirst({
      where: { code: preferred, active: true },
    });
    if (byCode) return byCode;
  }

  return prisma.project.findFirst({
    where: { active: true },
    orderBy: { id: "asc" },
  });
}

export function parseFacilityLines(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\r?\n|,|·/)
    .map((s) => s.replace(/^\d+\.\s*/, "").trim())
    .filter((s) => s.length > 1 && !/^fasilitas/i.test(s) && !/^promo/i.test(s));
}

/** Ambil daftar fasilitas umum dari paymentNotes (bagian setelah "Fasilitas"). */
export function extractCommonFacilities(paymentNotes: string | null | undefined): string[] {
  if (!paymentNotes) return [];
  const lines = paymentNotes.split(/\r?\n/).map((l) => l.trim());
  const start = lines.findIndex((l) => /fasilitas/i.test(l));
  if (start < 0) {
    return parseFacilityLines(paymentNotes).slice(0, 8);
  }
  const items: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    if (/^promo/i.test(line) || /^catatan/i.test(line)) break;
    items.push(line.replace(/^\d+\.\s*/, "").trim());
  }
  return items.filter(Boolean);
}

export function parseSuggestedDeposit(equipment: string | null | undefined): number {
  if (!equipment) return 0;
  const m = equipment.match(/deposit[^0-9]*([\d.,]+)/i);
  if (!m) return 0;
  const n = parseFloat(m[1].replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}
