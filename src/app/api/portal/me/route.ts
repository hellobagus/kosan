import { NextResponse } from "next/server";
import { isAuthFailure, requireSession } from "@/lib/api-auth";
import { requireTenantPortalSession } from "@/lib/tenant-portal-service";

export async function GET() {
  try {
    const session = await requireSession();
    if (isAuthFailure(session)) {
      return NextResponse.json({ error: session.error }, { status: session.status });
    }

    const auth = await requireTenantPortalSession(session);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { tenant } = auth;
    const project = tenant.room.floorRef?.building.project;

    return NextResponse.json({
      user: {
        id: tenant.user.id,
        name: tenant.user.name,
        email: tenant.user.email,
        phone: tenant.user.phone,
        address: tenant.user.address,
        gender: tenant.user.gender,
        ktp: tenant.user.ktp,
        occupation: tenant.user.occupation,
      },
      tenancy: {
        id: tenant.id,
        status: tenant.status,
        checkIn: tenant.checkIn,
        dueDate: tenant.dueDate,
        monthlyRent: tenant.monthlyRent,
        deposit: tenant.deposit,
        leaseDuration: tenant.leaseDuration,
        paymentStatus: tenant.paymentStatus,
        invoiceNumber: tenant.invoiceNumber,
        roomNumber: tenant.room.roomNumber,
        floor: tenant.room.floor,
        projectName: project?.name,
        projectCode: project?.code,
      },
    });
  } catch (error) {
    console.error("Portal me GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
