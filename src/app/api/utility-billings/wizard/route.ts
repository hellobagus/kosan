import { NextRequest, NextResponse } from "next/server";
import { requireStaffModule } from "@/lib/api-auth";
import {
  bulkSaveMeterReadings,
  generateLumpSumForPeriod,
  getWizardData,
  applyAllToInvoiceForPeriod,
  getBillingPeriods,
} from "@/lib/utility-wizard-service";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireStaffModule("billing", "view");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const invoiceMonth = parseInt(searchParams.get("invoiceMonth") || String(new Date().getMonth() + 1));
    const invoiceYear = parseInt(searchParams.get("invoiceYear") || String(new Date().getFullYear()));

    const data = await getWizardData(invoiceMonth, invoiceYear);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Wizard GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireStaffModule("billing", "create");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { action, invoiceMonth, invoiceYear } = body;

    if (!invoiceMonth || !invoiceYear) {
      return NextResponse.json({ error: "Periode invoice wajib diisi" }, { status: 400 });
    }

    const { usagePeriod } = getBillingPeriods(
      parseInt(String(invoiceMonth)),
      parseInt(String(invoiceYear))
    );

    if (action === "bulk_meter") {
      const { readings } = body as {
        readings: Array<{ roomId: number; utilityId: number; currReading: number }>;
      };
      if (!readings?.length) {
        return NextResponse.json({ error: "Tidak ada data meter" }, { status: 400 });
      }
      const result = await bulkSaveMeterReadings({
        usageMonth: usagePeriod.month,
        usageYear: usagePeriod.year,
        readings,
      });
      return NextResponse.json({
        message: `Berhasil simpan ${result.saved} meter${result.failed ? `, ${result.failed} gagal` : ""}`,
        ...result,
      });
    }

    if (action === "generate_lump_sum") {
      const result = await generateLumpSumForPeriod(usagePeriod.month, usagePeriod.year);
      return NextResponse.json({
        message: `Lump sum: ${result.created} dibuat, ${result.skipped} dilewati`,
        ...result,
      });
    }

    if (action === "apply_invoice") {
      const result = await applyAllToInvoiceForPeriod(usagePeriod.month, usagePeriod.year);
      return NextResponse.json({
        message: `Invoice ${result.invoicePeriodLabel}: ${result.applied} penghuni diperbarui, ${result.skipped} dilewati`,
        ...result,
      });
    }

    return NextResponse.json({ error: "Aksi tidak valid" }, { status: 400 });
  } catch (error) {
    console.error("Wizard POST error:", error);
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
