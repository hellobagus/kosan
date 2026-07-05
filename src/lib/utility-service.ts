import { BillingMethod, UtilityType } from "@prisma/client";
import { parseAmount } from "./tenant-utils";

export const UTILITY_TYPE_LABELS: Record<UtilityType, string> = {
  ELECTRICITY: "Listrik",
  WATER: "Air",
  INTERNET: "Internet",
  GAS: "Gas",
  OTHER: "Lainnya",
};

export const BILLING_METHOD_LABELS: Record<BillingMethod, string> = {
  METER: "Meter",
  LUMPSUM: "Lump Sum",
};

export const DEFAULT_UNIT_LABELS: Partial<Record<UtilityType, string>> = {
  ELECTRICITY: "kWh",
  WATER: "m³",
};

export interface UtilityCalcInput {
  billingMethod: BillingMethod;
  ratePerUnit: number;
  prevReading?: number | null;
  currReading?: number | null;
}

export interface UtilityCalcResult {
  prevReading: number | null;
  currReading: number | null;
  usage: number | null;
  totalAmount: number;
}

/** Hitung tagihan utility berdasarkan metode billing */
export function calcUtilityAmount(input: UtilityCalcInput): UtilityCalcResult {
  const rate = parseAmount(input.ratePerUnit);

  if (input.billingMethod === "LUMPSUM") {
    return {
      prevReading: null,
      currReading: null,
      usage: null,
      totalAmount: Math.max(0, rate),
    };
  }

  const prev = input.prevReading != null ? parseAmount(input.prevReading) : 0;
  const curr = input.currReading != null ? parseAmount(input.currReading) : 0;
  const usage = Math.max(0, curr - prev);

  return {
    prevReading: prev,
    currReading: curr,
    usage,
    totalAmount: Math.round(usage * rate),
  };
}

export function resolveRate(utilityAmount: number, customAmount?: number | null): number {
  if (customAmount != null && customAmount > 0) return parseAmount(customAmount);
  return parseAmount(utilityAmount);
}

export function formatUtilityRate(
  billingMethod: BillingMethod,
  amount: number,
  unitLabel?: string | null
): string {
  const formatted = new Intl.NumberFormat("id-ID").format(amount);
  if (billingMethod === "METER" && unitLabel) {
    return `Rp ${formatted}/${unitLabel}`;
  }
  return `Rp ${formatted}/bulan`;
}

/** Bulan sebelumnya (untuk periode pemakaian) */
export function getPreviousMonth(month: number, year: number): { month: number; year: number } {
  if (month <= 1) return { month: 12, year: year - 1 };
  return { month: month - 1, year };
}

/** Bulan berikutnya (untuk periode penagihan) */
export function getNextMonth(month: number, year: number): { month: number; year: number } {
  if (month >= 12) return { month: 1, year: year + 1 };
  return { month: month + 1, year };
}

/** Hari terakhir bulan kalender (month = 1-12) */
export function endOfCalendarMonth(month: number, year: number): Date {
  return new Date(year, month, 0);
}

/** Hari pertama bulan kalender */
export function startOfCalendarMonth(month: number, year: number): Date {
  return new Date(year, month - 1, 1);
}
