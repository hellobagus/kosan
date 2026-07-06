import { formatCurrency, formatDate } from "@/lib/utils";
import { paymentStatusLabel } from "@/lib/tenant-utils";

export interface InvoiceProfile {
  name: string;
  code?: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  paymentNotes: string | null;
}

export interface InvoiceBankAccount {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export interface InvoiceBreakdown {
  tenant: {
    id: number;
    name: string;
    roomNumber: string;
    invoiceNumber: string | null;
    paymentStatus: string;
  };
  lines: {
    rent: number;
    deposit: number;
    discount: number;
    manualFees: Array<{ name: string; amount: number }>;
    utilityFees: Array<{ name: string; amount: number; utilityBillingId?: number }>;
    utilityBillings: Array<{
      id: number;
      name: string;
      amount: number;
      paidAmount: number;
      paymentStatus: string;
      usage: number | null;
      unitLabel: string | null;
    }>;
  };
  total: number;
  paid: number;
  remaining: number;
  profile?: InvoiceProfile;
  bankAccounts?: InvoiceBankAccount[];
}

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function nl2br(s: string): string {
  return esc(s).replace(/\n/g, "<br>");
}

export function printInvoiceHtml(
  tenant: {
    checkIn: string;
    dueDate: string | null;
    leaseDuration: string | null;
    paymentStatus: string;
    paidAmount: string | number;
  },
  breakdown: InvoiceBreakdown
) {
  const inv = breakdown.tenant.invoiceNumber || `#${breakdown.tenant.id}`;
  const profile = breakdown.profile;
  const bankAccounts = breakdown.bankAccounts || [];

  const feeRows = [
    ...breakdown.lines.manualFees.map((f) =>
      `<tr><td>${esc(f.name)}</td><td style="text-align:right">${formatCurrency(f.amount)}</td></tr>`
    ),
    ...breakdown.lines.utilityFees.map((f) =>
      `<tr><td>${esc(f.name)}</td><td style="text-align:right">${formatCurrency(f.amount)}</td></tr>`
    ),
  ].join("");

  const headerBlock = profile
    ? `<div class="header">
      ${profile.logoUrl ? `<img src="${esc(profile.logoUrl)}" alt="Logo" class="logo" />` : ""}
      <div class="kosan-name">${esc(profile.name)}</div>
      ${profile.address ? `<div class="kosan-address">${nl2br(profile.address)}</div>` : ""}
      <div class="kosan-contact">
        ${profile.phone ? `<span>Telp: ${esc(profile.phone)}</span>` : ""}
        ${profile.email ? `<span> · ${esc(profile.email)}</span>` : ""}
      </div>
    </div>`
    : "";

  const bankBlock =
    bankAccounts.length > 0
      ? `<div class="bank-section">
      <strong>Rekening Pembayaran:</strong>
      <ul>${bankAccounts
        .map(
          (b) =>
            `<li><strong>${esc(b.bankName)}</strong> — ${esc(b.accountNumber)} a.n. ${esc(b.accountHolder)}</li>`
        )
        .join("")}</ul>
    </div>`
      : "";

  const paymentNotesBlock = profile?.paymentNotes
    ? `<div class="notes-section"><strong>Catatan Pembayaran:</strong><p>${nl2br(profile.paymentNotes)}</p></div>`
    : "";

  const html = `<!DOCTYPE html><html><head><title>Invoice ${esc(inv)}</title>
    <style>
    body{font-family:sans-serif;padding:40px;max-width:640px;margin:0 auto;color:#1e293b}
    .header{text-align:center;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #0d9488}
    .logo{max-height:64px;max-width:200px;margin-bottom:8px}
    .kosan-name{font-size:1.25em;font-weight:bold;color:#0f766e}
    .kosan-address{font-size:0.9em;color:#475569;margin-top:6px;line-height:1.4}
    .kosan-contact{font-size:0.85em;color:#64748b;margin-top:4px}
    h1{text-align:center;color:#0d9488;font-size:1.1em;margin:20px 0 4px}
    .inv-no{text-align:center;font-weight:bold;margin-bottom:16px}
    table{width:100%;border-collapse:collapse;margin:16px 0}
    td,th{padding:8px;border-bottom:1px solid #eee}
    .total{font-size:1.1em;font-weight:bold}
    .stamp{color:green;font-size:1.4em;text-align:center;margin:20px}
    .section{margin-top:20px;font-size:0.9em;color:#555}
    .bank-section,.notes-section{margin-top:20px;padding:12px;background:#f8fafc;border-radius:8px;font-size:0.9em}
    .bank-section ul,.notes-section p{margin:8px 0 0;padding-left:20px}
    .notes-section p{padding-left:0;white-space:pre-wrap;line-height:1.5}
    </style></head><body>
    ${headerBlock}
    <h1>INVOICE PEMBAYARAN</h1>
    <p class="inv-no">${esc(inv)}</p>
    <table>
      <tr><td>Nama</td><td>${esc(breakdown.tenant.name)}</td></tr>
      <tr><td>Kamar</td><td>${esc(breakdown.tenant.roomNumber)}</td></tr>
      <tr><td>Tanggal Masuk</td><td>${formatDate(tenant.checkIn)}</td></tr>
      <tr><td>Berakhir</td><td>${tenant.dueDate ? formatDate(tenant.dueDate) : "-"}</td></tr>
      <tr><td>Lama Sewa</td><td>${esc(tenant.leaseDuration) || "-"}</td></tr>
    </table>
    <h3 style="margin-top:24px;font-size:14px;color:#334155">Rincian Tagihan</h3>
    <table>
      <tr><td>Sewa Kamar</td><td style="text-align:right">${formatCurrency(breakdown.lines.rent)}</td></tr>
      ${breakdown.lines.deposit > 0 ? `<tr><td>Deposit</td><td style="text-align:right">${formatCurrency(breakdown.lines.deposit)}</td></tr>` : ""}
      ${feeRows}
      ${breakdown.lines.discount > 0 ? `<tr><td>Diskon</td><td style="text-align:right">-${formatCurrency(breakdown.lines.discount)}</td></tr>` : ""}
      <tr><td class="total">Total</td><td class="total" style="text-align:right">${formatCurrency(breakdown.total)}</td></tr>
      <tr><td>Terbayar</td><td style="text-align:right">${formatCurrency(breakdown.paid)}</td></tr>
      <tr><td>Sisa</td><td style="text-align:right;font-weight:bold;color:#dc2626">${formatCurrency(breakdown.remaining)}</td></tr>
    </table>
    ${breakdown.lines.utilityBillings.length > 0 ? `
    <div class="section">
      <strong>Status Utility:</strong>
      <ul>${breakdown.lines.utilityBillings
        .map(
          (b) =>
            `<li>${esc(b.name)}: ${paymentStatusLabel(b.paymentStatus)} (${formatCurrency(b.paidAmount)}/${formatCurrency(b.amount)})</li>`
        )
        .join("")}</ul>
    </div>` : ""}
    ${bankBlock}
    ${paymentNotesBlock}
    ${tenant.paymentStatus === "PAID" ? `<div class="stamp">[ LUNAS ]</div>` : ""}
    <p class="section" style="text-align:center;margin-top:32px">Terima kasih atas pembayaran Anda.</p>
    </body></html>`;

  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
    w.print();
  }
}
