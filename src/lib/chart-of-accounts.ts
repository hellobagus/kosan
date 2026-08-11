import type { AccountType, NormalBalance } from "@prisma/client";

export type DefaultAccountSeed = {
  code: string;
  name: string;
  type: AccountType;
  normalBalance: NormalBalance;
  sortOrder: number;
  description?: string;
};

/**
 * Bagan akun standar aplikasi manajemen kosan (SAK-ETAP / kas-basis disederhanakan).
 * Kode 1xxx aset, 2xxx kewajiban, 3xxx ekuitas, 4xxx pendapatan, 5xxx beban.
 */
export const DEFAULT_CHART_OF_ACCOUNTS: DefaultAccountSeed[] = [
  // —— Aset ——
  { code: "1100", name: "Kas", type: "ASSET", normalBalance: "DEBIT", sortOrder: 10, description: "Kas tunai operasional kosan" },
  { code: "1110", name: "Kas Kecil", type: "ASSET", normalBalance: "DEBIT", sortOrder: 11, description: "Petty cash untuk pengeluaran harian" },
  { code: "1200", name: "Bank", type: "ASSET", normalBalance: "DEBIT", sortOrder: 20, description: "Rekening bank kosan" },
  { code: "1300", name: "Piutang Sewa", type: "ASSET", normalBalance: "DEBIT", sortOrder: 30, description: "Tagihan sewa penghuni belum dibayar" },
  { code: "1310", name: "Piutang Utilitas", type: "ASSET", normalBalance: "DEBIT", sortOrder: 31, description: "Tagihan listrik/air/internet belum dibayar" },
  { code: "1400", name: "Perlengkapan", type: "ASSET", normalBalance: "DEBIT", sortOrder: 40, description: "Perlengkapan habis pakai" },
  { code: "1500", name: "Inventaris & Aset Tetap", type: "ASSET", normalBalance: "DEBIT", sortOrder: 50, description: "Furniture, AC, elektronik kamar" },
  { code: "1600", name: "Akumulasi Penyusutan", type: "ASSET", normalBalance: "CREDIT", sortOrder: 60, description: "Kontra aset untuk penyusutan inventaris" },

  // —— Kewajiban ——
  { code: "2100", name: "Deposit Penghuni", type: "LIABILITY", normalBalance: "CREDIT", sortOrder: 110, description: "Uang jaminan penghuni yang dapat dikembalikan" },
  { code: "2200", name: "Hutang Usaha", type: "LIABILITY", normalBalance: "CREDIT", sortOrder: 120, description: "Hutang ke supplier / vendor" },
  { code: "2300", name: "Hutang Gaji", type: "LIABILITY", normalBalance: "CREDIT", sortOrder: 130 },
  { code: "2400", name: "Sewa Diterima Dimuka", type: "LIABILITY", normalBalance: "CREDIT", sortOrder: 140, description: "Uang muka sewa belum jatuh tempo" },

  // —— Ekuitas ——
  { code: "3100", name: "Modal Pemilik", type: "EQUITY", normalBalance: "CREDIT", sortOrder: 210 },
  { code: "3200", name: "Laba Ditahan", type: "EQUITY", normalBalance: "CREDIT", sortOrder: 220 },
  { code: "3300", name: "Prive", type: "EQUITY", normalBalance: "DEBIT", sortOrder: 230, description: "Pengambilan pribadi pemilik" },

  // —— Pendapatan ——
  { code: "4100", name: "Pendapatan Sewa Kamar", type: "REVENUE", normalBalance: "CREDIT", sortOrder: 310 },
  { code: "4200", name: "Pendapatan Utilitas", type: "REVENUE", normalBalance: "CREDIT", sortOrder: 320, description: "Pendapatan utilitas gabungan" },
  { code: "4210", name: "Pendapatan Listrik", type: "REVENUE", normalBalance: "CREDIT", sortOrder: 321 },
  { code: "4220", name: "Pendapatan Air", type: "REVENUE", normalBalance: "CREDIT", sortOrder: 322 },
  { code: "4230", name: "Pendapatan Internet", type: "REVENUE", normalBalance: "CREDIT", sortOrder: 323 },
  { code: "4300", name: "Pendapatan Denda Keterlambatan", type: "REVENUE", normalBalance: "CREDIT", sortOrder: 330 },
  { code: "4400", name: "Pendapatan Parkir & Fasilitas", type: "REVENUE", normalBalance: "CREDIT", sortOrder: 340 },
  { code: "4500", name: "Pendapatan Lain-lain", type: "REVENUE", normalBalance: "CREDIT", sortOrder: 350, description: "Termasuk potong deposit kerusakan" },

  // —— Beban ——
  { code: "5100", name: "Beban Utilitas Operasional", type: "EXPENSE", normalBalance: "DEBIT", sortOrder: 410, description: "Biaya utilitas area bersama / operasional" },
  { code: "5110", name: "Beban Listrik", type: "EXPENSE", normalBalance: "DEBIT", sortOrder: 411 },
  { code: "5120", name: "Beban Air", type: "EXPENSE", normalBalance: "DEBIT", sortOrder: 412 },
  { code: "5130", name: "Beban Internet", type: "EXPENSE", normalBalance: "DEBIT", sortOrder: 413 },
  { code: "5200", name: "Beban Gaji & Upah", type: "EXPENSE", normalBalance: "DEBIT", sortOrder: 420, description: "Gaji pengelola, cleaning, security" },
  { code: "5300", name: "Beban Perbaikan & Maintenance", type: "EXPENSE", normalBalance: "DEBIT", sortOrder: 430 },
  { code: "5400", name: "Beban Pembelian Inventaris", type: "EXPENSE", normalBalance: "DEBIT", sortOrder: 440 },
  { code: "5500", name: "Beban Kebersihan", type: "EXPENSE", normalBalance: "DEBIT", sortOrder: 450 },
  { code: "5510", name: "Beban Keamanan", type: "EXPENSE", normalBalance: "DEBIT", sortOrder: 451 },
  { code: "5600", name: "Beban Operasional", type: "EXPENSE", normalBalance: "DEBIT", sortOrder: 460, description: "ATK, konsumsi, transport operasional" },
  { code: "5700", name: "Beban Pajak & Iuran", type: "EXPENSE", normalBalance: "DEBIT", sortOrder: 470, description: "PBB, iuran RT/RW, perizinan" },
  { code: "5800", name: "Beban Marketing & Promosi", type: "EXPENSE", normalBalance: "DEBIT", sortOrder: 480 },
  { code: "5900", name: "Beban Lain-lain", type: "EXPENSE", normalBalance: "DEBIT", sortOrder: 490 },
];

export const ACCOUNT_CODES = {
  CASH: "1100",
  PETTY_CASH: "1110",
  BANK: "1200",
  AR_RENT: "1300",
  AR_UTILITY: "1310",
  SUPPLIES: "1400",
  FIXED_ASSETS: "1500",
  ACCUM_DEPRECIATION: "1600",
  DEPOSIT_LIABILITY: "2100",
  AP: "2200",
  SALARY_PAYABLE: "2300",
  UNEARNED_RENT: "2400",
  CAPITAL: "3100",
  RETAINED_EARNINGS: "3200",
  DRAWINGS: "3300",
  REVENUE_RENT: "4100",
  REVENUE_UTILITY: "4200",
  REVENUE_ELECTRICITY: "4210",
  REVENUE_WATER: "4220",
  REVENUE_INTERNET: "4230",
  REVENUE_PENALTY: "4300",
  REVENUE_FACILITY: "4400",
  REVENUE_OTHER: "4500",
  EXPENSE_UTILITY: "5100",
  EXPENSE_ELECTRICITY: "5110",
  EXPENSE_WATER: "5120",
  EXPENSE_INTERNET: "5130",
  EXPENSE_SALARY: "5200",
  EXPENSE_MAINTENANCE: "5300",
  EXPENSE_PURCHASE: "5400",
  EXPENSE_CLEANING: "5500",
  EXPENSE_SECURITY: "5510",
  EXPENSE_OPS: "5600",
  EXPENSE_TAX: "5700",
  EXPENSE_MARKETING: "5800",
  EXPENSE_OTHER: "5900",
} as const;

export function accountTypeLabel(type: AccountType) {
  const labels: Record<AccountType, string> = {
    ASSET: "Aset",
    LIABILITY: "Kewajiban",
    EQUITY: "Ekuitas",
    REVENUE: "Pendapatan",
    EXPENSE: "Beban",
  };
  return labels[type];
}
