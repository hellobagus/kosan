import { NextRequest, NextResponse } from "next/server";
import { AccountType, NormalBalance } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStaffModule } from "@/lib/api-auth";
import { ensureChartOfAccounts } from "@/lib/accounting-service";

export async function GET() {
  try {
    const auth = await requireStaffModule("billing", "view");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const projectId = auth.context.projectId;
    if (!projectId) {
      return NextResponse.json({ error: "Project belum dipilih" }, { status: 400 });
    }

    await ensureChartOfAccounts(projectId);
    const accounts = await prisma.account.findMany({
      where: { projectId },
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
    });

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("Accounts GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireStaffModule("billing", "create");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const projectId = auth.context.projectId;
    if (!projectId) {
      return NextResponse.json({ error: "Project belum dipilih" }, { status: 400 });
    }

    await ensureChartOfAccounts(projectId);
    const body = await request.json();
    const { code, name, type, normalBalance, description } = body;

    if (!code || !name || !type) {
      return NextResponse.json({ error: "Kode, nama, dan tipe wajib diisi" }, { status: 400 });
    }

    if (!Object.values(AccountType).includes(type)) {
      return NextResponse.json({ error: "Tipe akun tidak valid" }, { status: 400 });
    }

    const nb: NormalBalance =
      normalBalance ||
      (type === "ASSET" || type === "EXPENSE" ? "DEBIT" : "CREDIT");

    const account = await prisma.account.create({
      data: {
        projectId,
        code: String(code).trim(),
        name: String(name).trim(),
        type,
        normalBalance: nb,
        description: description || null,
        isSystem: false,
        isActive: true,
        sortOrder: 999,
      },
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    console.error("Accounts POST error:", error);
    const message = error instanceof Error ? error.message : "Server error";
    if (message.includes("Unique constraint")) {
      return NextResponse.json({ error: "Kode akun sudah dipakai" }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireStaffModule("billing", "create");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const projectId = auth.context.projectId;
    const body = await request.json();
    const { id, name, isActive, description } = body;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const existing = await prisma.account.findFirst({
      where: { id: Number(id), projectId },
    });
    if (!existing) return NextResponse.json({ error: "Akun tidak ditemukan" }, { status: 404 });

    const account = await prisma.account.update({
      where: { id: existing.id },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
        ...(description !== undefined ? { description: description || null } : {}),
      },
    });

    return NextResponse.json(account);
  } catch (error) {
    console.error("Accounts PATCH error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
