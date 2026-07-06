import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  approveRoomTransfer,
  calculateRoomTransferFinancials,
  cancelRoomTransfer,
  completeRoomTransfer,
  closeOldRoomMeters,
  generateRoomTransferLetter,
  handoverNewRoom,
  inspectOldRoomForTransfer,
  openNewRoomMeters,
  updateTransferBilling,
  updateTransferContract,
} from "@/lib/room-transfer-service";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const transferId = parseInt(id, 10);
    const body = await request.json();
    const action = String(body.action || "");

    if (!action) {
      return NextResponse.json({ error: "Aksi wajib diisi" }, { status: 400 });
    }

    if (action === "approve") {
      const transfer = await approveRoomTransfer(transferId, session.userId, body.adminNotes);
      return NextResponse.json(transfer);
    }
    if (action === "calculate_financials") {
      const transfer = await calculateRoomTransferFinancials(transferId);
      return NextResponse.json(transfer);
    }
    if (action === "generate_letter") {
      const transfer = await generateRoomTransferLetter(transferId);
      return NextResponse.json(transfer);
    }
    if (action === "inspect_old_room") {
      const result = await inspectOldRoomForTransfer(transferId, body.inspections || [], session.userId);
      return NextResponse.json(result);
    }
    if (action === "close_old_meters") {
      const transfer = await closeOldRoomMeters(transferId, body.readings || []);
      return NextResponse.json(transfer);
    }
    if (action === "handover_new_room") {
      const transfer = await handoverNewRoom(transferId, session.userId);
      return NextResponse.json(transfer);
    }
    if (action === "open_new_meters") {
      const transfer = await openNewRoomMeters(transferId, body.readings || []);
      return NextResponse.json(transfer);
    }
    if (action === "update_contract") {
      const transfer = await updateTransferContract(transferId);
      return NextResponse.json(transfer);
    }
    if (action === "update_billing") {
      const transfer = await updateTransferBilling(transferId, session.userId);
      return NextResponse.json(transfer);
    }
    if (action === "complete") {
      const transfer = await completeRoomTransfer(transferId);
      return NextResponse.json(transfer);
    }
    if (action === "cancel") {
      const transfer = await cancelRoomTransfer(transferId, body.notes);
      return NextResponse.json(transfer);
    }

    return NextResponse.json({ error: "Aksi tidak valid" }, { status: 400 });
  } catch (error) {
    console.error("RoomTransfers PUT error:", error);
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
