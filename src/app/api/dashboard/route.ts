import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      totalRooms,
      occupiedRooms,
      availableRooms,
      activeTenants,
      monthlyIncome,
      monthlyExpense,
      yearlyIncome,
      recentTenants,
      recentFinances,
    ] = await Promise.all([
      prisma.room.count(),
      prisma.room.count({ where: { status: "OCCUPIED" } }),
      prisma.room.count({ where: { status: "AVAILABLE" } }),
      prisma.tenant.count({ where: { status: "ACTIVE" } }),
      prisma.finance.aggregate({
        where: { type: "INCOME", transactionDate: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.finance.aggregate({
        where: { type: "EXPENSE", transactionDate: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.finance.aggregate({
        where: { type: "INCOME", transactionDate: { gte: startOfYear } },
        _sum: { amount: true },
      }),
      prisma.tenant.findMany({
        where: { status: "ACTIVE" },
        include: { user: true, room: true },
        orderBy: { checkIn: "desc" },
        take: 5,
      }),
      prisma.finance.findMany({
        orderBy: { transactionDate: "desc" },
        take: 5,
        include: { tenant: { include: { user: true } } },
      }),
    ]);

    return NextResponse.json({
      stats: {
        totalRooms,
        occupiedRooms,
        availableRooms,
        activeTenants,
        monthlyIncome: Number(monthlyIncome._sum.amount || 0),
        monthlyExpense: Number(monthlyExpense._sum.amount || 0),
        yearlyIncome: Number(yearlyIncome._sum.amount || 0),
        occupancyRate: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
      },
      recentTenants,
      recentFinances,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
