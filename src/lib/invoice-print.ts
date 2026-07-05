import { formatCurrency, formatDate } from "@/lib/utils";
import { paymentStatusLabel } from "@/lib/tenant-utils";

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
  const feeRows = [
    ...breakdown.lines.manualFees.map((f) =>
      `<tr><td>${f.name}</td><td style="text-align:right">${formatCurrency(f.amount)}</td></tr>`
    ),
    ...breakdown.lines.utilityFees.map((f) =>
      `<tr><td>${f.name}</td><td style="text-align:right">${formatCurrency(f.amount)}</td></tr>`
    ),
  ].join("");

  const html = `<!DOCTYPE html><html><head><title>Invoice ${inv}</title>
    <style>body{font-family:sans-serif;padding:40px;max-width:640px;margin:0 auto}
    h1{text-align:center;color:#0d9488}table{width:100%;border-collapse:collapse;margin:16px 0}
    td,th{padding:8px;border-bottom:1px solid #eee}.total{font-size:1.1em;font-weight:bold}
    .stamp{color:green;font-size:1.4em;text-align:center;margin:20px}
    .section{margin-top:20px;font-size:0.9em;color:#555}</style></head><body>
    <h1>INVOICE PEMBAYARAN</h1><p style="text-align:center;font-weight:bold">${inv}</p>
    <table>
      <tr><td>Nama</td><td>${breakdown.tenant.name}</td></tr>
      <tr><td>Kamar</td><td>${breakdown.tenant.roomNumber}</td></tr>
      <tr><td>Tanggal Masuk</td><td>${formatDate(tenant.checkIn)}</td></tr>
      <tr><td>Berakhir</td><td>${tenant.dueDate ? formatDate(tenant.dueDate) : "-"}</td></tr>
      <tr><td>Lama Sewa</td><td>${tenant.leaseDuration || "-"}</td></tr>
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
      <ul>${breakdown.lines.utilityBillings.map((b) =>
        `<li>${b.name}: ${paymentStatusLabel(b.paymentStatus)} (${formatCurrency(b.paidAmount)}/${formatCurrency(b.amount)})</li>`
      ).join("")}</ul>
    </div>` : ""}
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
