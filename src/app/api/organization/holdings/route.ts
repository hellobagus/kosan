import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureDefaultOrganization } from "@/lib/organization-service";
import { isSuperAdmin } from "@/lib/rbac";

export async function GET() {
  const session = await getSession();
  if (!session || !isSuperAdmin(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureDefaultOrganization();
  const holdings = await prisma.holding.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(holdings);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !isSuperAdmin(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  if (!body.name || !body.code) {
    return NextResponse.json({ error: "Nama dan kode wajib diisi" }, { status: 400 });
  }

  const holding = await prisma.holding.create({
    data: {
      name: body.name,
      code: String(body.code).toUpperCase(),
      description: body.description || null,
    },
  });

  return NextResponse.json(holding, { status: 201 });
}
