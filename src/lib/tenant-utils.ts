export const EXTRA_OCCUPANT_FEE = 200_000;
export const LATE_PENALTY_PER_DAY = 50_000;

export const LEASE_OPTIONS = [
  { value: "1 Hari", label: "1 Hari", months: 0, days: 1 },
  { value: "1 Bulan", label: "1 Bulan", months: 1, days: 0 },
  { value: "3 Bulan", label: "3 Bulan", months: 3, days: 0 },
  { value: "6 Bulan", label: "6 Bulan", months: 6, days: 0 },
  { value: "1 Tahun", label: "1 Tahun", months: 12, days: 0 },
];

export interface AdditionalFee {
  name: string;
  amount: number;
}

export function parseAmount(v: string | number | { toString(): string } | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === "object" && "toString" in v) return parseFloat(v.toString());
  return typeof v === "string" ? parseFloat(v) : v;
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function calcDueDate(checkIn: Date, leaseDuration: string): Date {
  const opt = LEASE_OPTIONS.find((o) => o.value === leaseDuration);
  if (!opt) return addMonths(checkIn, 1);
  if (opt.days > 0) return addDays(checkIn, opt.days - 1);
  return addDays(addMonths(checkIn, opt.months), -1);
}

export function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function calcLatePenalty(dueDate: Date | null, today = new Date()): { days: number; amount: number } {
  if (!dueDate) return { days: 0, amount: 0 };
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const now = new Date(today);
  now.setHours(0, 0, 0, 0);
  const days = daysBetween(due, now);
  if (days <= 0) return { days: 0, amount: 0 };
  return { days, amount: days * LATE_PENALTY_PER_DAY };
}

export function calcExtraOccupantFee(count: number): number {
  if (count <= 1) return 0;
  return (count - 1) * EXTRA_OCCUPANT_FEE;
}

export function calcProrata(monthlyRent: number, days: number): number {
  return Math.round((monthlyRent / 30) * days);
}

export function parseAdditionalFees(raw: unknown): AdditionalFee[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw
    .filter((f) => f && typeof f.name === "string")
    .map((f) => ({
      name: String(f.name).trim(),
      amount: typeof f.amount === "number" ? f.amount : parseFloat(String(f.amount)) || 0,
    }))
    .filter((f) => f.name);
}

export function normalizeAdditionalFees(fees: AdditionalFee[]): AdditionalFee[] {
  return fees
    .map((f) => ({ name: f.name.trim(), amount: Number(f.amount) || 0 }))
    .filter((f) => f.name && f.amount > 0);
}

export function calcTotalAmount(params: {
  monthlyRent: number;
  dailyPrice?: number | null;
  isDaily?: boolean;
  leaseDuration: string;
  occupantCount: number;
  discount: number;
  deposit: number;
  additionalFees: AdditionalFee[];
  checkIn?: Date;
  dueDate?: Date | null;
}): number {
  const {
    monthlyRent,
    dailyPrice,
    isDaily,
    leaseDuration,
    occupantCount,
    discount,
    deposit,
    additionalFees,
    checkIn,
    dueDate,
  } = params;

  let roomTotal: number;
  if (isDaily || leaseDuration === "1 Hari") {
    roomTotal = dailyPrice ?? monthlyRent;
  } else if (checkIn && dueDate) {
    const days = daysBetween(checkIn, dueDate) + 1;
    const opt = LEASE_OPTIONS.find((o) => o.value === leaseDuration);
    if (opt && opt.months > 0) {
      roomTotal = monthlyRent * opt.months;
    } else {
      roomTotal = calcProrata(monthlyRent, days);
    }
  } else {
    const opt = LEASE_OPTIONS.find((o) => o.value === leaseDuration);
    roomTotal = monthlyRent * (opt?.months || 1);
  }

  const extraOccupant = calcExtraOccupantFee(occupantCount);
  const otherFees = additionalFees.reduce((s, f) => s + f.amount, 0);
  return Math.max(0, roomTotal + extraOccupant + otherFees + deposit - discount);
}

export function generateInvoiceNumber(tenantId: number): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `#${yy}${mm}${dd}${String(tenantId).padStart(4, "0")}`;
}

export function formatGender(g?: string | null): string {
  if (g === "MALE" || g === "Pria") return "Pria";
  if (g === "FEMALE" || g === "Wanita") return "Wanita";
  return g || "-";
}

export function formatMarital(s?: string | null): string {
  const map: Record<string, string> = {
    SINGLE: "Belum Menikah",
    MARRIED: "Menikah",
  };
  return map[s || ""] || s || "-";
}

export function paymentStatusLabel(status: string): string {
  const map: Record<string, string> = {
    PAID: "Lunas",
    PARTIAL: "Sebagian",
    UNPAID: "Belum Lunas",
  };
  return map[status] || status;
}

export function toDateInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().split("T")[0];
}
