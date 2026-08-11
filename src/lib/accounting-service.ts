import {
  AccountType,
  DocumentType,
  JournalSource,
  JournalStatus,
  Prisma,
  TransactionType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ACCOUNT_CODES,
  DEFAULT_CHART_OF_ACCOUNTS,
} from "@/lib/chart-of-accounts";

type TxClient = Prisma.TransactionClient;
type DbClient = TxClient | typeof prisma;

export type JournalLineInput = {
  accountId: number;
  debit?: number;
  credit?: number;
  memo?: string | null;
};

export type CreateFinanceInput = {
  projectId?: number | null;
  type: TransactionType;
  amount: number;
  description: string;
  category?: string | null;
  transactionDate?: Date;
  tenantId?: number | null;
  roomId?: number | null;
  createdBy?: number | null;
  createdByName?: string | null;
  updatedByName?: string | null;
  approvedByName?: string | null;
  approvedAt?: Date | null;
};

function asNum(v: Prisma.Decimal | number | string | null | undefined) {
  return Number(v || 0);
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export async function ensureChartOfAccounts(projectId: number, client: DbClient = prisma) {
  const existing = await client.account.findMany({
    where: { projectId },
    select: { id: true, code: true, isSystem: true },
  });
  const byCode = new Map(existing.map((a) => [a.code, a]));
  const missing = DEFAULT_CHART_OF_ACCOUNTS.filter((a) => !byCode.has(a.code));

  if (missing.length > 0) {
    await client.account.createMany({
      data: missing.map((a) => ({
        projectId,
        code: a.code,
        name: a.name,
        type: a.type,
        normalBalance: a.normalBalance,
        isSystem: true,
        isActive: true,
        sortOrder: a.sortOrder,
        description: a.description || null,
      })),
      skipDuplicates: true,
    });
  }

  // Perbarui nama akun sistem agar mengikuti standar terbaru
  for (const seed of DEFAULT_CHART_OF_ACCOUNTS) {
    const row = byCode.get(seed.code);
    if (!row?.isSystem) continue;
    await client.account.update({
      where: { id: row.id },
      data: {
        name: seed.name,
        description: seed.description || null,
        sortOrder: seed.sortOrder,
        type: seed.type,
        normalBalance: seed.normalBalance,
        isActive: true,
      },
    });
  }
}

export async function ensureChartOfAccountsForAllProjects() {
  const projects = await prisma.project.findMany({ select: { id: true } });
  for (const p of projects) {
    await ensureChartOfAccounts(p.id);
  }
}

async function nextJournalNumber(tx: TxClient, projectId: number, entryDate: Date) {
  const project = await tx.project.findUniqueOrThrow({
    where: { id: projectId },
    select: { code: true, entityId: true, entity: { select: { code: true } } },
  });
  const year = entryDate.getFullYear();

  const seq = await tx.documentSequence.upsert({
    where: {
      entityId_projectId_docType_year: {
        entityId: project.entityId,
        projectId,
        docType: DocumentType.JOURNAL,
        year,
      },
    },
    create: {
      entityId: project.entityId,
      projectId,
      docType: DocumentType.JOURNAL,
      year,
      lastNumber: 1,
    },
    update: { lastNumber: { increment: 1 } },
  });

  return `JU-${project.entity.code}-${project.code}-${year}-${String(seq.lastNumber).padStart(5, "0")}`;
}

async function assertPeriodOpen(tx: TxClient, projectId: number, entryDate: Date) {
  const period = await tx.accountingPeriod.findUnique({
    where: {
      projectId_year_month: {
        projectId,
        year: entryDate.getFullYear(),
        month: entryDate.getMonth() + 1,
      },
    },
  });
  if (period?.status === "CLOSED") {
    throw new Error(
      `Periode akuntansi ${period.month}/${period.year} sudah ditutup. Tidak dapat menambah jurnal.`
    );
  }
}

export async function resolveFinanceProjectId(
  tx: DbClient,
  input: { projectId?: number | null; roomId?: number | null; tenantId?: number | null }
): Promise<number | null> {
  if (input.projectId) return input.projectId;

  if (input.roomId) {
    const room = await tx.room.findUnique({
      where: { id: input.roomId },
      include: {
        floorRef: { include: { building: { select: { projectId: true } } } },
      },
    });
    if (room?.floorRef?.building?.projectId) return room.floorRef.building.projectId;
  }

  if (input.tenantId) {
    const tenant = await tx.tenant.findUnique({
      where: { id: input.tenantId },
      include: {
        room: {
          include: {
            floorRef: { include: { building: { select: { projectId: true } } } },
          },
        },
      },
    });
    if (tenant?.room?.floorRef?.building?.projectId) {
      return tenant.room.floorRef.building.projectId;
    }
  }

  return null;
}

async function getAccountByCode(tx: TxClient, projectId: number, code: string) {
  await ensureChartOfAccounts(projectId, tx);
  const account = await tx.account.findUnique({
    where: { projectId_code: { projectId, code } },
  });
  if (!account) throw new Error(`Akun ${code} tidak ditemukan`);
  return account;
}

function normalizeCategory(category?: string | null) {
  return (category || "").trim().toLowerCase();
}

/** Petakan kategori buku kas → pasangan akun Debit/Kredit. */
export async function mapFinanceToJournalLines(
  tx: TxClient,
  projectId: number,
  type: TransactionType,
  amount: number,
  category?: string | null
): Promise<JournalLineInput[]> {
  const cat = normalizeCategory(category);
  const cash = await getAccountByCode(tx, projectId, ACCOUNT_CODES.CASH);

  if (type === "INCOME") {
    // Potong deposit = pengakuan pendapatan dari hutang deposit (tanpa kas)
    if (cat.includes("potong deposit")) {
      const deposit = await getAccountByCode(tx, projectId, ACCOUNT_CODES.DEPOSIT_LIABILITY);
      const revenue = await getAccountByCode(tx, projectId, ACCOUNT_CODES.REVENUE_OTHER);
      return [
        { accountId: deposit.id, debit: amount, credit: 0 },
        { accountId: revenue.id, debit: 0, credit: amount },
      ];
    }

    let creditCode: string = ACCOUNT_CODES.REVENUE_OTHER;

    if (cat.includes("sewa") || cat === "rent" || cat.includes("pindah kamar")) {
      creditCode = ACCOUNT_CODES.REVENUE_RENT;
    } else if (cat.includes("deposit")) {
      creditCode = ACCOUNT_CODES.DEPOSIT_LIABILITY;
    } else if (cat.includes("listrik")) {
      creditCode = ACCOUNT_CODES.REVENUE_ELECTRICITY;
    } else if (cat.includes("air")) {
      creditCode = ACCOUNT_CODES.REVENUE_WATER;
    } else if (cat.includes("internet") || cat.includes("wifi")) {
      creditCode = ACCOUNT_CODES.REVENUE_INTERNET;
    } else if (cat.includes("gas") || cat.includes("utilitas") || cat.includes("utility")) {
      creditCode = ACCOUNT_CODES.REVENUE_UTILITY;
    } else if (cat.includes("denda") || cat.includes("penalty")) {
      creditCode = ACCOUNT_CODES.REVENUE_PENALTY;
    } else if (cat.includes("parkir") || cat.includes("fasilitas")) {
      creditCode = ACCOUNT_CODES.REVENUE_FACILITY;
    }

    const creditAcc = await getAccountByCode(tx, projectId, creditCode);
    return [
      { accountId: cash.id, debit: amount, credit: 0 },
      { accountId: creditAcc.id, debit: 0, credit: amount },
    ];
  }

  // EXPENSE
  if (cat.includes("deposit") || cat.includes("pengembalian")) {
    const deposit = await getAccountByCode(tx, projectId, ACCOUNT_CODES.DEPOSIT_LIABILITY);
    return [
      { accountId: deposit.id, debit: amount, credit: 0 },
      { accountId: cash.id, debit: 0, credit: amount },
    ];
  }

  let debitCode: string = ACCOUNT_CODES.EXPENSE_OTHER;
  if (cat.includes("listrik")) {
    debitCode = ACCOUNT_CODES.EXPENSE_ELECTRICITY;
  } else if (cat.includes("air")) {
    debitCode = ACCOUNT_CODES.EXPENSE_WATER;
  } else if (cat.includes("internet") || cat.includes("wifi")) {
    debitCode = ACCOUNT_CODES.EXPENSE_INTERNET;
  } else if (cat.includes("utilitas") || cat.includes("utility") || cat.includes("gas")) {
    debitCode = ACCOUNT_CODES.EXPENSE_UTILITY;
  } else if (cat.includes("gaji") || cat.includes("salary") || cat.includes("upah")) {
    debitCode = ACCOUNT_CODES.EXPENSE_SALARY;
  } else if (
    cat.includes("perbaikan") ||
    cat.includes("maintenance") ||
    cat.includes("repair")
  ) {
    debitCode = ACCOUNT_CODES.EXPENSE_MAINTENANCE;
  } else if (cat.includes("pembelian") || cat.includes("inventaris")) {
    debitCode = ACCOUNT_CODES.EXPENSE_PURCHASE;
  } else if (cat.includes("kebersihan") || cat.includes("cleaning")) {
    debitCode = ACCOUNT_CODES.EXPENSE_CLEANING;
  } else if (cat.includes("keamanan") || cat.includes("security")) {
    debitCode = ACCOUNT_CODES.EXPENSE_SECURITY;
  } else if (cat.includes("pajak") || cat.includes("iuran") || cat.includes("pbb")) {
    debitCode = ACCOUNT_CODES.EXPENSE_TAX;
  } else if (cat.includes("marketing") || cat.includes("promosi") || cat.includes("iklan")) {
    debitCode = ACCOUNT_CODES.EXPENSE_MARKETING;
  } else if (cat.includes("operasional") || cat.includes("atk")) {
    debitCode = ACCOUNT_CODES.EXPENSE_OPS;
  }

  const debitAcc = await getAccountByCode(tx, projectId, debitCode);
  return [
    { accountId: debitAcc.id, debit: amount, credit: 0 },
    { accountId: cash.id, debit: 0, credit: amount },
  ];
}

export async function createPostedJournal(
  tx: TxClient,
  params: {
    projectId: number;
    entryDate: Date;
    description: string;
    source: JournalSource;
    lines: JournalLineInput[];
    financeId?: number | null;
    reference?: string | null;
    createdBy?: number | null;
    createdByName?: string | null;
  }
) {
  await assertPeriodOpen(tx, params.projectId, params.entryDate);

  const lines = params.lines
    .map((l, idx) => ({
      accountId: l.accountId,
      debit: Math.round((l.debit || 0) * 100) / 100,
      credit: Math.round((l.credit || 0) * 100) / 100,
      memo: l.memo || null,
      lineOrder: idx + 1,
    }))
    .filter((l) => l.debit > 0 || l.credit > 0);

  if (lines.length < 2) {
    throw new Error("Jurnal minimal 2 baris");
  }

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`Jurnal tidak balance (D ${totalDebit} ≠ C ${totalCredit})`);
  }
  for (const line of lines) {
    if (line.debit > 0 && line.credit > 0) {
      throw new Error("Satu baris jurnal tidak boleh Debit dan Kredit sekaligus");
    }
  }

  const entryNumber = await nextJournalNumber(tx, params.projectId, params.entryDate);

  return tx.journalEntry.create({
    data: {
      projectId: params.projectId,
      entryNumber,
      entryDate: startOfDay(params.entryDate),
      description: params.description,
      status: JournalStatus.POSTED,
      source: params.source,
      financeId: params.financeId ?? null,
      reference: params.reference ?? null,
      createdBy: params.createdBy ?? null,
      createdByName: params.createdByName ?? null,
      postedAt: new Date(),
      lines: { create: lines },
    },
    include: { lines: { include: { account: true }, orderBy: { lineOrder: "asc" } } },
  });
}

export async function postJournalForFinance(
  tx: TxClient,
  finance: {
    id: number;
    projectId: number | null;
    type: TransactionType;
    amount: Prisma.Decimal | number;
    description: string;
    category: string | null;
    transactionDate: Date;
    roomId: number | null;
    tenantId: number | null;
    createdBy: number | null;
    createdByName: string | null;
  }
) {
  const existing = await tx.journalEntry.findUnique({ where: { financeId: finance.id } });
  if (existing) return existing;

  const projectId =
    finance.projectId ||
    (await resolveFinanceProjectId(tx, {
      projectId: finance.projectId,
      roomId: finance.roomId,
      tenantId: finance.tenantId,
    }));

  if (!projectId) {
    console.warn(`[accounting] Skip jurnal finance #${finance.id}: projectId tidak diketahui`);
    return null;
  }

  if (!finance.projectId) {
    await tx.finance.update({
      where: { id: finance.id },
      data: { projectId },
    });
  }

  const amount = asNum(finance.amount);
  if (amount <= 0) return null;

  const lines = await mapFinanceToJournalLines(
    tx,
    projectId,
    finance.type,
    amount,
    finance.category
  );

  return createPostedJournal(tx, {
    projectId,
    entryDate: finance.transactionDate,
    description: finance.description,
    source: JournalSource.FINANCE,
    lines,
    financeId: finance.id,
    reference: `FIN-${finance.id}`,
    createdBy: finance.createdBy,
    createdByName: finance.createdByName,
  });
}

/** Buat baris buku kas + jurnal double-entry sekaligus. */
export async function createFinanceRecord(tx: TxClient, input: CreateFinanceInput) {
  const projectId = await resolveFinanceProjectId(tx, input);
  const finance = await tx.finance.create({
    data: {
      projectId,
      type: input.type,
      amount: input.amount,
      description: input.description,
      category: input.category ?? null,
      transactionDate: input.transactionDate ? startOfDay(input.transactionDate) : startOfDay(new Date()),
      tenantId: input.tenantId ?? null,
      roomId: input.roomId ?? null,
      createdBy: input.createdBy ?? null,
      createdByName: input.createdByName ?? null,
      updatedByName: input.updatedByName ?? input.createdByName ?? null,
      approvedByName: input.approvedByName ?? null,
      approvedAt: input.approvedAt ?? null,
    },
  });

  await postJournalForFinance(tx, finance);
  return finance;
}

export async function voidJournalEntry(
  tx: TxClient,
  journalEntryId: number,
  reason?: string
) {
  const entry = await tx.journalEntry.findUnique({ where: { id: journalEntryId } });
  if (!entry) throw new Error("Jurnal tidak ditemukan");
  if (entry.status === JournalStatus.VOID) return entry;

  await assertPeriodOpen(tx, entry.projectId, entry.entryDate);

  return tx.journalEntry.update({
    where: { id: journalEntryId },
    data: {
      status: JournalStatus.VOID,
      voidedAt: new Date(),
      voidReason: reason || "Dibatalkan",
    },
  });
}

export async function deleteFinanceWithJournal(tx: TxClient, financeId: number) {
  const journal = await tx.journalEntry.findUnique({ where: { financeId } });
  if (journal) {
    await voidJournalEntry(tx, journal.id, "Transaksi buku kas dihapus");
    await tx.journalEntry.update({
      where: { id: journal.id },
      data: { financeId: null },
    });
  }
  await tx.finance.delete({ where: { id: financeId } });
}

export async function backfillFinanceJournals(projectId?: number) {
  const where: Prisma.FinanceWhereInput = {
    journalEntry: null,
    ...(projectId ? { projectId } : {}),
  };

  const finances = await prisma.finance.findMany({
    where,
    orderBy: { transactionDate: "asc" },
  });

  let posted = 0;
  let skipped = 0;

  for (const finance of finances) {
    try {
      await prisma.$transaction(async (tx) => {
        const result = await postJournalForFinance(tx, finance);
        if (result) posted += 1;
        else skipped += 1;
      });
    } catch (err) {
      skipped += 1;
      console.warn(`[backfill] finance #${finance.id}`, err);
    }
  }

  return { total: finances.length, posted, skipped };
}

function dateRangeFilter(startDate?: Date | null, endDate?: Date | null) {
  if (!startDate && !endDate) return undefined;
  return {
    ...(startDate ? { gte: startOfDay(startDate) } : {}),
    ...(endDate ? { lte: startOfDay(endDate) } : {}),
  };
}

export async function getAccountBalances(
  projectId: number,
  opts?: { startDate?: Date | null; endDate?: Date | null; types?: AccountType[] }
) {
  await ensureChartOfAccounts(projectId);

  const accounts = await prisma.account.findMany({
    where: {
      projectId,
      isActive: true,
      ...(opts?.types ? { type: { in: opts.types } } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
  });

  const lines = await prisma.journalLine.findMany({
    where: {
      account: { projectId },
      journalEntry: {
        projectId,
        status: JournalStatus.POSTED,
        ...(opts?.startDate || opts?.endDate
          ? { entryDate: dateRangeFilter(opts.startDate, opts.endDate) }
          : {}),
      },
    },
    select: {
      accountId: true,
      debit: true,
      credit: true,
    },
  });

  const agg = new Map<number, { debit: number; credit: number }>();
  for (const line of lines) {
    const cur = agg.get(line.accountId) || { debit: 0, credit: 0 };
    cur.debit += asNum(line.debit);
    cur.credit += asNum(line.credit);
    agg.set(line.accountId, cur);
  }

  return accounts.map((acc) => {
    const t = agg.get(acc.id) || { debit: 0, credit: 0 };
    const balance =
      acc.normalBalance === "DEBIT" ? t.debit - t.credit : t.credit - t.debit;
    return {
      ...acc,
      totalDebit: t.debit,
      totalCredit: t.credit,
      balance,
    };
  });
}

export async function getTrialBalance(
  projectId: number,
  startDate?: Date | null,
  endDate?: Date | null
) {
  const rows = await getAccountBalances(projectId, { startDate, endDate });
  const withMovement = rows.filter((r) => r.totalDebit > 0 || r.totalCredit > 0 || Math.abs(r.balance) > 0.009);
  const totalDebit = withMovement.reduce((s, r) => s + r.totalDebit, 0);
  const totalCredit = withMovement.reduce((s, r) => s + r.totalCredit, 0);
  return { rows: withMovement, totalDebit, totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 0.01 };
}

export async function getIncomeStatement(
  projectId: number,
  startDate: Date,
  endDate: Date
) {
  const rows = await getAccountBalances(projectId, {
    startDate,
    endDate,
    types: ["REVENUE", "EXPENSE"],
  });

  const revenues = rows.filter((r) => r.type === "REVENUE");
  const expenses = rows.filter((r) => r.type === "EXPENSE");
  const totalRevenue = revenues.reduce((s, r) => s + r.balance, 0);
  const totalExpense = expenses.reduce((s, r) => s + r.balance, 0);

  return {
    revenues,
    expenses,
    totalRevenue,
    totalExpense,
    netIncome: totalRevenue - totalExpense,
  };
}

export async function getBalanceSheet(projectId: number, asOfDate: Date) {
  const ytdStart = new Date(asOfDate.getFullYear(), 0, 1);
  const rows = await getAccountBalances(projectId, { endDate: asOfDate });

  const assets = rows.filter((r) => r.type === "ASSET");
  const liabilities = rows.filter((r) => r.type === "LIABILITY");
  const equity = rows.filter((r) => r.type === "EQUITY");

  const pl = await getIncomeStatement(projectId, ytdStart, asOfDate);

  const totalAssets = assets.reduce((s, r) => s + r.balance, 0);
  const totalLiabilities = liabilities.reduce((s, r) => s + r.balance, 0);
  const totalEquityBook = equity.reduce((s, r) => s + r.balance, 0);
  const totalEquity = totalEquityBook + pl.netIncome;
  const totalLiabilitiesEquity = totalLiabilities + totalEquity;

  return {
    asOfDate,
    assets,
    liabilities,
    equity,
    netIncomeYtd: pl.netIncome,
    totalAssets,
    totalLiabilities,
    totalEquity,
    totalLiabilitiesEquity,
    balanced: Math.abs(totalAssets - totalLiabilitiesEquity) < 0.01,
  };
}

export async function getGeneralLedger(
  projectId: number,
  accountId: number,
  startDate?: Date | null,
  endDate?: Date | null
) {
  const account = await prisma.account.findFirst({
    where: { id: accountId, projectId },
  });
  if (!account) throw new Error("Akun tidak ditemukan");

  const openingLines = startDate
    ? await prisma.journalLine.findMany({
        where: {
          accountId,
          journalEntry: {
            projectId,
            status: JournalStatus.POSTED,
            entryDate: { lt: startOfDay(startDate) },
          },
        },
        select: { debit: true, credit: true },
      })
    : [];

  const openingDebit = openingLines.reduce((s, l) => s + asNum(l.debit), 0);
  const openingCredit = openingLines.reduce((s, l) => s + asNum(l.credit), 0);
  let running =
    account.normalBalance === "DEBIT"
      ? openingDebit - openingCredit
      : openingCredit - openingDebit;

  const lines = await prisma.journalLine.findMany({
    where: {
      accountId,
      journalEntry: {
        projectId,
        status: JournalStatus.POSTED,
        ...(startDate || endDate
          ? { entryDate: dateRangeFilter(startDate, endDate) }
          : {}),
      },
    },
    include: {
      journalEntry: true,
    },
    orderBy: [{ journalEntry: { entryDate: "asc" } }, { id: "asc" }],
  });

  const movements = lines.map((line) => {
    const debit = asNum(line.debit);
    const credit = asNum(line.credit);
    if (account.normalBalance === "DEBIT") {
      running += debit - credit;
    } else {
      running += credit - debit;
    }
    return {
      id: line.id,
      entryDate: line.journalEntry.entryDate,
      entryNumber: line.journalEntry.entryNumber,
      description: line.journalEntry.description,
      memo: line.memo,
      debit,
      credit,
      balance: running,
      journalEntryId: line.journalEntryId,
    };
  });

  const openingBalance =
    account.normalBalance === "DEBIT"
      ? openingDebit - openingCredit
      : openingCredit - openingDebit;

  return {
    account,
    openingBalance,
    movements,
    closingBalance: running,
    totalDebit: movements.reduce((s, m) => s + m.debit, 0),
    totalCredit: movements.reduce((s, m) => s + m.credit, 0),
  };
}

export async function closeAccountingPeriod(
  projectId: number,
  year: number,
  month: number,
  closedByName?: string
) {
  return prisma.accountingPeriod.upsert({
    where: { projectId_year_month: { projectId, year, month } },
    create: {
      projectId,
      year,
      month,
      status: "CLOSED",
      closedAt: new Date(),
      closedByName: closedByName || null,
    },
    update: {
      status: "CLOSED",
      closedAt: new Date(),
      closedByName: closedByName || null,
    },
  });
}

export async function reopenAccountingPeriod(projectId: number, year: number, month: number) {
  return prisma.accountingPeriod.upsert({
    where: { projectId_year_month: { projectId, year, month } },
    create: { projectId, year, month, status: "OPEN" },
    update: { status: "OPEN", closedAt: null, closedByName: null },
  });
}

export { endOfDay, startOfDay, asNum };
