import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { generatePurchaseNumber, receivePurchase } from "@/lib/inventory-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where = status ? { status: status as "DRAFT" | "ORDERED" | "RECEIVED" | "CANCELLED" } : {};

    const purchases = await prisma.purchase.findMany({
      where,
      include: {
        supplier: true,
        items: { include: { item: true } },
        createdByUser: true,
      },
      orderBy: { purchaseDate: "desc" },
    });
    return NextResponse.json(purchases);
  } catch (error) {
    console.error("Purchases GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { supplierId, purchaseDate, notes, items, action } = await request.json();
    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Minimal 1 item pembelian" }, { status: 400 });
    }

    let totalAmount = 0;
    const purchaseItems = items.map((it: { itemId: number; quantity: number; unitPrice: number }) => {
      const totalPrice = it.quantity * it.unitPrice;
      totalAmount += totalPrice;
      return {
        itemId: parseInt(String(it.itemId)),
        quantity: parseInt(String(it.quantity)),
        unitPrice: parseFloat(String(it.unitPrice)),
        totalPrice,
      };
    });

    const purchase = await prisma.purchase.create({
      data: {
        purchaseNumber: generatePurchaseNumber(),
        supplierId: supplierId ? parseInt(supplierId) : null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        totalAmount,
        status: "ORDERED",
        notes: notes || null,
        createdBy: session.userId,
        items: { create: purchaseItems },
      },
      include: {
        supplier: true,
        items: { include: { item: true } },
      },
    });

    if (action === "receive") {
      await receivePurchase(purchase.id, session.userId);
      const updated = await prisma.purchase.findUnique({
        where: { id: purchase.id },
        include: { supplier: true, items: { include: { item: true } } },
      });
      return NextResponse.json(updated, { status: 201 });
    }

    return NextResponse.json(purchase, { status: 201 });
  } catch (error) {
    console.error("Purchases POST error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, action } = await request.json();
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    if (action === "receive") {
      await receivePurchase(parseInt(id), session.userId);
      const purchase = await prisma.purchase.findUnique({
        where: { id: parseInt(id) },
        include: { supplier: true, items: { include: { item: true } } },
      });
      return NextResponse.json(purchase);
    }

    if (action === "cancel") {
      const purchase = await prisma.purchase.update({
        where: { id: parseInt(id) },
        data: { status: "CANCELLED" },
        include: { supplier: true, items: { include: { item: true } } },
      });
      return NextResponse.json(purchase);
    }

    return NextResponse.json({ error: "Action tidak valid" }, { status: 400 });
  } catch (error) {
    console.error("Purchases PUT error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Server error" }, { status: 500 });
  }
}
