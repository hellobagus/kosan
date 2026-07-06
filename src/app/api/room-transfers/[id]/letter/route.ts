import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildRoomTransferLetterHtml, generateRoomTransferLetter } from "@/lib/room-transfer-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const transferId = parseInt(id, 10);

    const transfer = await prisma.roomTransfer.findUnique({ where: { id: transferId } });
    if (!transfer) return NextResponse.json({ error: "Data pindah tidak ditemukan" }, { status: 404 });

    if (transfer.status === "FINANCIAL_CALCULATED") {
      await generateRoomTransferLetter(transferId);
    } else if (
      !["LETTER_GENERATED", "OLD_ROOM_INSPECTED", "OLD_METER_CLOSED", "NEW_ROOM_HANDOVER",
        "NEW_METER_OPENED", "CONTRACT_UPDATED", "BILLING_UPDATED", "COMPLETED"].includes(transfer.status)
    ) {
      return NextResponse.json(
        { error: "Surat pindah belum tersedia. Selesaikan perhitungan selisih terlebih dahulu." },
        { status: 400 }
      );
    }

    const html = await buildRoomTransferLetterHtml(transferId);
    const safeName = `surat-pindah-${transferId}`;

    const format = request.nextUrl.searchParams.get("format");

    if (format === "pdf") {
      const { htmlToPdfBuffer } = await import("@/lib/contract-pdf");
      try {
        const pdf = await htmlToPdfBuffer(html);
        return new NextResponse(new Uint8Array(pdf), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="${safeName}.pdf"`,
          },
        });
      } catch (err) {
        console.error("Transfer letter PDF error:", err);
        return NextResponse.json(
          { error: "Gagal membuat PDF surat pindah. Pastikan wkhtmltopdf terpasang di server." },
          { status: 500 }
        );
      }
    }

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="${safeName}.html"`,
      },
    });
  } catch (error) {
    console.error("RoomTransferLetter GET error:", error);
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
