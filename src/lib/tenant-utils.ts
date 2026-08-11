export const EXTRA_OCCUPANT_FEE = 500_000;
export const LATE_PENALTY_PER_DAY = 50_000;

export const LEASE_OPTIONS = [
  { value: "1 Hari", label: "1 Hari", months: 0, days: 1 },
  { value: "1 Bulan", label: "1 Bulan", months: 1, days: 0 },
  { value: "2 Bulan", label: "2 Bulan", months: 2, days: 0 },
  { value: "3 Bulan", label: "3 Bulan", months: 3, days: 0 },
  { value: "6 Bulan", label: "6 Bulan", months: 6, days: 0 },
  { value: "12 Bulan", label: "12 Bulan", months: 12, days: 0 },
  { value: "1 Tahun", label: "1 Tahun", months: 12, days: 0 },
];

export const LEASE_MONTH_CHOICES = [1, 2, 3, 6, 12] as const;

export interface LeasePackage {
  months: number;
  gift: string;
  bonusMonths: number;
}

export const DEFAULT_LEASE_PACKAGES: LeasePackage[] = [
  { months: 1, gift: "", bonusMonths: 0 },
  { months: 3, gift: "", bonusMonths: 0 },
  { months: 6, gift: "Gratis 1 bulan", bonusMonths: 1 },
  { months: 12, gift: "Gratis 1 bulan", bonusMonths: 1 },
];

export function leaseValueFromMonths(months: number): string {
  return `${months} Bulan`;
}

export function leaseLabelFromMonths(months: number): string {
  return months === 12 ? "12 Bulan (1 Tahun)" : `${months} Bulan`;
}

export function monthsFromLeaseValue(value: string): number {
  const legacy = LEASE_OPTIONS.find((o) => o.value === value);
  if (legacy) {
    if (legacy.days > 0) return 0;
    return legacy.months;
  }
  const m = value.match(/^(\d+)\s*Bulan$/i);
  if (m) return parseInt(m[1], 10);
  return 1;
}

export function parseLeasePackages(
  raw: unknown,
  legacy?: {
    leaseBonusRules?: unknown;
    yearlyLeaseBonusEnabled?: boolean;
    yearlyLeaseBonusMonths?: number;
  }
): LeasePackage[] {
  if (raw && Array.isArray(raw) && raw.length > 0) {
    const parsed = raw
      .filter((p) => p && (typeof p.months === "number" || p.months))
      .map((p) => ({
        months: Math.max(1, parseInt(String(p.months), 10) || 1),
        gift: String(p.gift || "").trim(),
        bonusMonths: Math.max(0, parseInt(String(p.bonusMonths)) || 0),
      }))
      .filter((p) => LEASE_MONTH_CHOICES.includes(p.months as (typeof LEASE_MONTH_CHOICES)[number]));
    if (parsed.length > 0) {
      return parsed.sort((a, b) => a.months - b.months);
    }
  }

  const rules = parseLeaseBonusRules(legacy?.leaseBonusRules, {
    yearlyLeaseBonusEnabled: legacy?.yearlyLeaseBonusEnabled,
    yearlyLeaseBonusMonths: legacy?.yearlyLeaseBonusMonths,
  });

  return DEFAULT_LEASE_PACKAGES.map((pkg) => {
    const rule = rules.find((r) => monthsFromLeaseValue(r.leaseDuration) === pkg.months);
    if (rule?.enabled && rule.bonusMonths > 0) {
      return {
        months: pkg.months,
        gift: `Gratis ${rule.bonusMonths} bulan`,
        bonusMonths: rule.bonusMonths,
      };
    }
    return pkg;
  });
}

export function findLeasePackage(
  leaseDuration: string,
  packages: LeasePackage[]
): LeasePackage | undefined {
  const months = monthsFromLeaseValue(leaseDuration);
  return packages.find((p) => p.months === months);
}

export function formatLeasePackageOption(
  pkg: LeasePackage,
  paymentType: TenantPaymentType
): string {
  const label = leaseLabelFromMonths(pkg.months);
  if (!pkg.gift) return label;
  if (paymentType === "FULL") return `${label} — ${pkg.gift}`;
  return label;
}

export function formatLeaseDurationLabel(
  leaseDuration: string,
  bonusMonths: number,
  gift?: string | null
): string {
  if (gift) return `${leaseDuration} (${gift})`;
  if (bonusMonths > 0) {
    return `${leaseDuration} (+ ${bonusMonths} Bulan Gratis)`;
  }
  return leaseDuration;
}

export interface AdditionalFee {
  name: string;
  amount: number;
  utilityBillingId?: number;
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

export function calcDueDate(checkIn: Date, leaseDuration: string, bonusMonths = 0): Date {
  if (leaseDuration === "1 Hari") return addDays(checkIn, 0);
  const months = monthsFromLeaseValue(leaseDuration);
  if (months <= 0) return addDays(checkIn, 0);
  return addDays(addMonths(checkIn, months + bonusMonths), -1);
}

export interface LeaseBonusRule {
  leaseDuration: string;
  bonusMonths: number;
  enabled: boolean;
}

export const CONFIGURABLE_LEASE_DURATIONS = ["1 Bulan", "3 Bulan", "6 Bulan", "1 Tahun"];

export const DEFAULT_LEASE_BONUS_RULES: LeaseBonusRule[] = [
  { leaseDuration: "1 Bulan", bonusMonths: 0, enabled: false },
  { leaseDuration: "3 Bulan", bonusMonths: 0, enabled: false },
  { leaseDuration: "6 Bulan", bonusMonths: 1, enabled: true },
  { leaseDuration: "1 Tahun", bonusMonths: 1, enabled: true },
];

export function parseLeaseBonusRules(
  raw: unknown,
  legacy?: { yearlyLeaseBonusEnabled?: boolean; yearlyLeaseBonusMonths?: number }
): LeaseBonusRule[] {
  if (raw && Array.isArray(raw) && raw.length > 0) {
    const parsed = raw
      .filter((r) => r && typeof r.leaseDuration === "string")
      .map((r) => ({
        leaseDuration: String(r.leaseDuration),
        bonusMonths: Math.max(0, parseInt(String(r.bonusMonths)) || 0),
        enabled: r.enabled === true,
      }));
    if (parsed.length > 0) {
      return CONFIGURABLE_LEASE_DURATIONS.map((dur) => {
        const found = parsed.find((r) => r.leaseDuration === dur);
        return found || { leaseDuration: dur, bonusMonths: 0, enabled: false };
      });
    }
  }

  return DEFAULT_LEASE_BONUS_RULES.map((rule) => {
    if (
      rule.leaseDuration === "1 Tahun" &&
      legacy?.yearlyLeaseBonusEnabled !== false
    ) {
      return {
        ...rule,
        bonusMonths: Math.max(0, legacy?.yearlyLeaseBonusMonths ?? 1),
        enabled: true,
      };
    }
    return rule;
  });
}

export type TenantPaymentType = "FULL" | "INSTALLMENT";

export function getLeaseBonusMonths(
  leaseDuration: string,
  packages: LeasePackage[],
  paymentType: TenantPaymentType
): number {
  if (paymentType !== "FULL") return 0;
  const pkg = findLeasePackage(leaseDuration, packages);
  if (!pkg || pkg.bonusMonths <= 0) return 0;
  return pkg.bonusMonths;
}

/** @deprecated use getLeaseBonusMonths with LeasePackage[] */
export function getLeaseBonusMonthsFromRules(
  leaseDuration: string,
  rules: LeaseBonusRule[],
  paymentType: TenantPaymentType
): number {
  if (paymentType !== "FULL") return 0;
  const rule = rules.find((r) => r.leaseDuration === leaseDuration);
  if (!rule || !rule.enabled || rule.bonusMonths <= 0) return 0;
  return rule.bonusMonths;
}

/** @deprecated use getLeaseBonusMonths */
export function getYearlyLeaseBonusMonths(
  leaseDuration: string,
  settings: { yearlyLeaseBonusEnabled: boolean; yearlyLeaseBonusMonths: number }
): number {
  const packages = parseLeasePackages(null, settings);
  return getLeaseBonusMonths(leaseDuration, packages, "FULL");
}

export interface AdditionalOccupant {
  name: string;
  ktp: string;
}

export function parseAdditionalOccupants(raw: unknown): AdditionalOccupant[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw
    .filter((o) => o && typeof o.name === "string")
    .map((o) => ({
      name: String(o.name).trim(),
      ktp: String(o.ktp || "").replace(/\D/g, "").slice(0, 16),
    }))
    .filter((o) => o.name);
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
      ...(f.utilityBillingId != null && { utilityBillingId: parseInt(String(f.utilityBillingId), 10) }),
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
    const months = monthsFromLeaseValue(leaseDuration);
    if (months > 0) {
      roomTotal = monthlyRent * months;
    } else {
      const days = daysBetween(checkIn, dueDate) + 1;
      roomTotal = calcProrata(monthlyRent, days);
    }
  } else {
    const months = monthsFromLeaseValue(leaseDuration);
    roomTotal = monthlyRent * (months || 1);
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
