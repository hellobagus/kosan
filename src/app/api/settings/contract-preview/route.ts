import { NextRequest, NextResponse } from "next/server";
import { getSession, isStaff } from "@/lib/auth";
import { getKosanProfile } from "@/lib/settings-service";
import { kosanProfileToContractProfile } from "@/lib/contract-profile";
import {
  SAMPLE_TENANT,
  buildBaMergeVars,
  buildContractMergeVars,
  getBaTemplateBody,
  getContractTemplateBody,
  mergeTemplate,
} from "@/lib/contract-template";

const CONTRACT_STYLES = `
  body { font-family: "Times New Roman", Times, serif; font-size: 11pt; line-height: 1.5; color: #000; max-width: 21cm; margin: 0 auto; padding: 20px; }
  h1 { text-align: center; font-size: 13pt; margin: 0; }
  .kosan-name { text-align: center; font-size: 14pt; font-weight: bold; margin: 8px 0 16px; }
  h2 { font-size: 11pt; margin: 16px 0 8px; }
  p { margin: 6px 0; text-align: justify; }
  .field-table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  .field-table td { padding: 3px 6px; vertical-align: top; }
  .field-table .label { width: 180px; font-weight: normal; }
  .party-label { font-weight: bold; margin-top: 12px; }
  ol { padding-left: 20px; }
  ol li { margin-bottom: 4px; text-align: justify; }
  .signature { margin-top: 40px; display: flex; justify-content: space-between; }
  .signature-box { width: 45%; text-align: center; }
  .signature-line { margin-top: 60px; border-top: 1px solid #000; display: inline-block; min-width: 200px; }
  .materai { color: #c00; font-style: italic; font-size: 10pt; }
  .checklist { list-style: none; padding: 0; }
  .checklist li::before { content: "☐ "; }
  .checklist li.checked::before { content: "☑ "; }
  .page-break { page-break-before: always; }
`;

function wrapHtml(title: string, body: string): string {
  return `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8" /><title>${title}</title><style>${CONTRACT_STYLES}</style></head><body>${body}</body></html>`;
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !isStaff(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { type, template } = body as { type?: string; template?: string };

  const profileRow = await getKosanProfile();
  const profile = kosanProfileToContractProfile(profileRow);

  if (type === "ba") {
    const templateBody = template?.trim() || getBaTemplateBody(null);
    const sampleItems = [
      { name: "Kunci kamar", quantity: 1, checked: true },
      { name: "Kasur", quantity: 1, checked: true },
      { name: "AC", quantity: 1, checked: true },
    ];
    const vars = buildBaMergeVars(profile, SAMPLE_TENANT, sampleItems, "checkin");
    const html = wrapHtml("Preview BA Inventaris", mergeTemplate(templateBody, vars));
    return NextResponse.json({ html });
  }

  const templateBody = template?.trim() || getContractTemplateBody(null);
  const vars = buildContractMergeVars(profile, SAMPLE_TENANT);
  const html = wrapHtml("Preview Kontrak", mergeTemplate(templateBody, vars));
  return NextResponse.json({ html });
}
