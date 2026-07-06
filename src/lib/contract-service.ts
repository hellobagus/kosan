import {
  buildBaMergeVars,
  buildContractMergeVars,
  getBaTemplateBody,
  getContractTemplateBody,
  mergeTemplate,
  type ContractProfile,
  type ContractTenant,
  type InventoryItem,
} from "@/lib/contract-template";

export type { ContractProfile, ContractTenant, InventoryItem };
export {
  CONTRACT_PLACEHOLDERS,
  BA_PLACEHOLDERS,
  DEFAULT_CONTRACT_TEMPLATE,
  DEFAULT_BA_TEMPLATE,
  SAMPLE_PROFILE,
  SAMPLE_TENANT,
} from "@/lib/contract-template";

export function toContractTenant(tenant: {
  id: number;
  checkIn: Date;
  dueDate: Date | null;
  monthlyRent: { toString(): string } | number | string;
  deposit: { toString(): string } | number | string;
  leaseDuration: string | null;
  emergencyPhone: string | null;
  additionalOccupants: unknown;
  user: ContractTenant["user"];
  room: { roomNumber: string; floor: number };
}): ContractTenant {
  return {
    ...tenant,
    monthlyRent: Number(tenant.monthlyRent),
    deposit: Number(tenant.deposit),
    checkIn: tenant.checkIn,
    dueDate: tenant.dueDate,
  };
}

const CONTRACT_STYLES = `
  @page { size: A4; margin: 2.54cm; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    font-family: "Times New Roman", Times, serif;
    font-size: 11pt;
    line-height: 1.5;
    color: #000;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  h1 { text-align: center; font-size: 13pt; font-weight: bold; margin: 0 0 14px; }
  .kosan-name { text-align: center; font-size: 14pt; font-weight: bold; margin: 0 0 18px; letter-spacing: 0.5px; }
  h2 { font-size: 11pt; font-weight: bold; margin: 20px 0 10px; }
  p { margin: 8px 0; text-align: justify; }
  .field-table { width: 100%; border-collapse: collapse; margin: 6px 0 14px; }
  .field-table td { padding: 3px 0; vertical-align: top; line-height: 1.45; }
  .field-table .label { width: 200px; padding-right: 16px; white-space: nowrap; }
  .party-label { font-weight: bold; margin: 12px 0 16px; }
  ol { padding-left: 24px; margin: 8px 0 12px; }
  ol li { margin-bottom: 6px; text-align: justify; }
  .signature { margin-top: 48px; display: table; width: 100%; table-layout: fixed; }
  .signature-box { display: table-cell; width: 50%; text-align: center; vertical-align: top; padding: 0 12px; }
  .signature-line { margin-top: 72px; border-top: 1px solid #000; display: inline-block; min-width: 200px; }
  .materai { color: #c00; font-style: italic; font-size: 10pt; }
  .checklist { list-style: none; padding: 0; margin: 8px 0; }
  .checklist li { margin-bottom: 4px; }
  .checklist li::before { content: "☐ "; }
  .checklist li.checked::before { content: "☑ "; }
  .page-break { page-break-before: always; }
  @media print {
    html, body { margin: 0; padding: 0; }
  }
`;

export function buildContractHtml(
  profile: ContractProfile,
  tenant: ContractTenant,
  signDate?: Date
): string {
  const template = getContractTemplateBody(profile.contractTemplate);
  const vars = buildContractMergeVars(profile, tenant, signDate);
  const body = mergeTemplate(template, vars);

  return wrapDocumentHtml(
    `Perjanjian Sewa Kamar - ${tenant.user.name}`,
    body
  );
}

export function buildInventoryBaHtml(
  profile: ContractProfile,
  tenant: ContractTenant,
  items: InventoryItem[],
  type: "checkin" | "checkout" = "checkin"
): string {
  const template = getBaTemplateBody(profile.inventoryBaTemplate);
  const vars = buildBaMergeVars(profile, tenant, items, type);
  const body = mergeTemplate(template, vars);
  const title = type === "checkin"
    ? "BA Serah Terima Inventaris"
    : "BA Inspeksi Inventaris";

  return wrapDocumentHtml(`${title} - ${tenant.user.name}`, body);
}

function wrapDocumentHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>${CONTRACT_STYLES}</style>
</head>
<body>
${body}
</body>
</html>`;
}

export async function getRoomInventoryItems(roomId: number): Promise<InventoryItem[]> {
  const { prisma } = await import("@/lib/prisma");
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      template: { include: { items: { include: { item: true } } } },
      roomAssets: { include: { item: true }, where: { status: { in: ["DEPLOYED", "IN_USE"] } } },
    },
  });
  if (!room) return [];

  if (room.template?.items.length) {
    return room.template.items.map((ti) => ({
      name: ti.item.name,
      quantity: ti.quantity,
      checked: true,
    }));
  }

  const grouped = new Map<string, number>();
  for (const a of room.roomAssets) {
    const n = a.item.name;
    grouped.set(n, (grouped.get(n) || 0) + 1);
  }
  return Array.from(grouped.entries()).map(([name, quantity]) => ({
    name,
    quantity,
    checked: true,
  }));
}
