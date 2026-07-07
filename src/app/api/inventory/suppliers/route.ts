import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffModule } from "@/lib/api-auth";

export async function GET() {
  try {
    const auth = await requireStaffModule("inventory", "view");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const suppliers = await prisma.supplier.findMany({
      include: { _count: { select: { purchases: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(suppliers);
  } catch (error) {
    console.error("Suppliers GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireStaffModule("inventory", "create");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { name, phone, email, address, active } = await request.json();
    if (!name) return NextResponse.json({ error: "Nama supplier wajib diisi" }, { status: 400 });

    const supplier = await prisma.supplier.create({
      data: { name, phone: phone || null, email: email || null, address: address || null, active: active !== false },
    });
    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    console.error("Suppliers POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireStaffModule("inventory", "create");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id, name, phone, email, address, active } = await request.json();
    if (!id || !name) return NextResponse.json({ error: "Data wajib belum lengkap" }, { status: 400 });

    const supplier = await prisma.supplier.update({
      where: { id: parseInt(id) },
      data: { name, phone: phone || null, email: email || null, address: address || null, active: active !== false },
    });
    return NextResponse.json(supplier);
  } catch (error) {
    console.error("Suppliers PUT error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireStaffModule("inventory", "full");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await prisma.supplier.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ message: "Supplier berhasil dihapus" });
  } catch (error) {
    console.error("Suppliers DELETE error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
