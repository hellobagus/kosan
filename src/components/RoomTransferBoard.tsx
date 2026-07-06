"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRightLeft, Check, FileText, Printer, RefreshCw, X } from "lucide-react";
import { Button, Card, CardBody, EmptyState, Input, PageHeader, Select } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toDateInput as dateInputUtil } from "@/lib/tenant-utils";

type TransferStatus =
  | "REQUESTED"
  | "APPROVED"
  | "FINANCIAL_CALCULATED"
  | "LETTER_GENERATED"
  | "OLD_ROOM_INSPECTED"
  | "OLD_METER_CLOSED"
  | "NEW_ROOM_HANDOVER"
  | "NEW_METER_OPENED"
  | "CONTRACT_UPDATED"
  | "BILLING_UPDATED"
  | "COMPLETED"
  | "CANCELLED";

const STATUS_LABELS: Record<TransferStatus, string> = {
  REQUESTED: "Pengajuan Pindah",
  APPROVED: "Approval Admin",
  FINANCIAL_CALCULATED: "Selisih Sewa & Deposit",
  LETTER_GENERATED: "Surat Pindah",
  OLD_ROOM_INSPECTED: "Inspeksi Kamar Lama",
  OLD_METER_CLOSED: "Closing Utility Meter Lama",
  NEW_ROOM_HANDOVER: "Serah Terima Kamar Baru",
  NEW_METER_OPENED: "Opening Utility Meter Baru",
  CONTRACT_UPDATED: "Update Kontrak",
  BILLING_UPDATED: "Update Billing",
  COMPLETED: "Pindah Selesai",
  CANCELLED: "Dibatalkan",
};

interface TenantOption {
  id: number;
  monthlyRent: string;
  deposit: string;
  status: string;
  user: { name: string };
  room: { id: number; roomNumber: string };
}

interface RoomOption {
  id: number;
  roomNumber: string;
  floor: number;
  price: string;
  status: string;
}

interface RoomUtilityItem {
  id: number;
  roomId: number;
  utilityId: number;
  lastReading: string | null;
  utility: {
    id: number;
    utilityName: string;
    billingMethod: "METER" | "LUMPSUM";
    unitLabel: string | null;
  };
}

interface CheckoutReadiness {
  requiresInspection: boolean;
  assets: Array<{
    id: number;
    assetCode: string;
    item: { name: string };
  }>;
}

interface TransferItem {
  id: number;
  tenantId: number;
  fromRoomId: number;
  toRoomId: number;
  status: TransferStatus;
  reason: string | null;
  adminNotes: string | null;
  effectiveDate: string;
  currentMonthlyRent: string;
  newMonthlyRent: string;
  currentDeposit: string;
  newDeposit: string;
  prorataDays: number;
  rentDifference: string;
  depositDifference: string;
  financeAdjustmentAmount: string;
  letterNumber: string | null;
  tenant: {
    id: number;
    user: { name: string; phone: string | null };
  };
  fromRoom: { roomNumber: string; floor: number };
  toRoom: { roomNumber: string; floor: number };
  requestedByUser: { name: string } | null;
  approvedByUser: { name: string } | null;
}

export default function RoomTransferBoard() {
  const searchParams = useSearchParams();
  const preselectedTenantId = searchParams.get("tenantId");
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [roomUtilities, setRoomUtilities] = useState<RoomUtilityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [createForm, setCreateForm] = useState({
    tenantId: "",
    toRoomId: "",
    effectiveDate: dateInputUtil(new Date()),
    reason: "",
  });
  const [inspectionRows, setInspectionRows] = useState<Array<{ assetId: number; result: string; damageCost: string; notes: string }>>([]);
  const [oldMeterRows, setOldMeterRows] = useState<Array<{ utilityId: number; reading: string; notes: string }>>([]);
  const [newMeterRows, setNewMeterRows] = useState<Array<{ utilityId: number; reading: string; notes: string }>>([]);

  const selected = useMemo(
    () => transfers.find((item) => item.id === selectedId) || null,
    [transfers, selectedId]
  );

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [transferRes, tenantRes, roomRes, utilityRes] = await Promise.all([
        fetch("/api/room-transfers"),
        fetch("/api/tenants?status=ACTIVE"),
        fetch("/api/rooms"),
        fetch("/api/room-utilities"),
      ]);
      const [transferData, tenantData, roomData, utilityData] = await Promise.all([
        transferRes.json(),
        tenantRes.json(),
        roomRes.json(),
        utilityRes.json(),
      ]);
      setTransfers(Array.isArray(transferData) ? transferData : []);
      setTenants(Array.isArray(tenantData) ? tenantData : []);
      setRooms(Array.isArray(roomData) ? roomData : []);
      setRoomUtilities(Array.isArray(utilityData) ? utilityData : []);
      if (!selectedId && Array.isArray(transferData) && transferData.length > 0) {
        setSelectedId(transferData[0].id);
      }
    } catch {
      setError("Gagal memuat data pindah kamar");
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (preselectedTenantId && tenants.some((t) => String(t.id) === preselectedTenantId)) {
      setCreateForm((prev) => ({
        ...prev,
        tenantId: preselectedTenantId,
        toRoomId: "",
      }));
    }
  }, [preselectedTenantId, tenants]);

  useEffect(() => {
    if (!selected) return;
    const oldMeters = roomUtilities
      .filter((item) => item.roomId === selected.fromRoomId && item.utility.billingMethod === "METER")
      .map((item) => ({
        utilityId: item.utilityId,
        reading: item.lastReading || "",
        notes: "",
      }));
    const newMeters = roomUtilities
      .filter((item) => item.roomId === selected.toRoomId && item.utility.billingMethod === "METER")
      .map((item) => ({
        utilityId: item.utilityId,
        reading: item.lastReading || "0",
        notes: "",
      }));
    setOldMeterRows(oldMeters);
    setNewMeterRows(newMeters);

    if (["LETTER_GENERATED", "OLD_ROOM_INSPECTED"].includes(selected.status)) {
      fetch(`/api/inventory/checkout-readiness?tenantId=${selected.tenantId}`)
        .then((r) => r.json())
        .then((data: CheckoutReadiness) => {
          const assets = Array.isArray(data.assets) ? data.assets : [];
          setInspectionRows(
            assets.map((asset) => ({
              assetId: asset.id,
              result: "OK",
              damageCost: "0",
              notes: "",
            }))
          );
        })
        .catch(() => {
          setInspectionRows([]);
        });
    } else {
      setInspectionRows([]);
    }
  }, [selected, roomUtilities]);

  const availableRooms = useMemo(() => {
    const tenant = tenants.find((item) => String(item.id) === createForm.tenantId);
    return rooms.filter((room) => room.status !== "MAINTENANCE" && room.id !== tenant?.room.id);
  }, [createForm.tenantId, rooms, tenants]);

  const submitCreate = async () => {
    if (!createForm.tenantId || !createForm.toRoomId || !createForm.effectiveDate) {
      setError("Penghuni, kamar tujuan, dan tanggal efektif wajib diisi");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/room-transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal membuat pengajuan");
        setSaving(false);
        return;
      }
      setCreateForm({
        tenantId: "",
        toRoomId: "",
        effectiveDate: dateInputUtil(new Date()),
        reason: "",
      });
      await fetchAll();
      setSelectedId(data.id);
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (action: string, body?: Record<string, unknown>) => {
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/room-transfers/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...(body || {}) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Aksi gagal diproses");
        setSaving(false);
        return;
      }
      await fetchAll();
      setSelectedId(selected.id);
      if (action === "generate_letter") {
        window.open(`/api/room-transfers/${selected.id}/letter?format=pdf`, "_blank");
      }
    } finally {
      setSaving(false);
    }
  };

  const selectedOldUtilities = roomUtilities.filter(
    (item) => item.roomId === selected?.fromRoomId && item.utility.billingMethod === "METER"
  );
  const selectedNewUtilities = roomUtilities.filter(
    (item) => item.roomId === selected?.toRoomId && item.utility.billingMethod === "METER"
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pindah Unit / Kamar"
        description="Workflow lengkap pengajuan pindah, approval, inspeksi, meter, kontrak, billing, sampai pindah selesai."
        action={
          <Button variant="secondary" onClick={fetchAll}>
            <RefreshCw className="w-4 h-4" /> Muat Ulang
          </Button>
        }
      />

      <Card>
        <CardBody>
          <h3 className="font-semibold text-slate-900 mb-4">Buat Pengajuan Pindah</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Select
              label="Penghuni Aktif"
              value={createForm.tenantId}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, tenantId: e.target.value, toRoomId: "" }))}
            >
              <option value="">Pilih penghuni...</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.user.name} - Kamar {tenant.room.roomNumber}
                </option>
              ))}
            </Select>
            <Select
              label="Kamar Tujuan"
              value={createForm.toRoomId}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, toRoomId: e.target.value }))}
            >
              <option value="">Pilih kamar...</option>
              {availableRooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.roomNumber} - Lantai {room.floor} - {formatCurrency(room.price)}
                </option>
              ))}
            </Select>
            <Input
              label="Tanggal Efektif"
              type="date"
              value={createForm.effectiveDate}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, effectiveDate: e.target.value }))}
            />
            <Input
              label="Alasan"
              value={createForm.reason}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder="Contoh: pindah ke kamar lebih besar"
            />
          </div>
          <div className="mt-4 flex gap-3">
            <Button onClick={submitCreate} disabled={saving}>
              <ArrowRightLeft className="w-4 h-4" /> Ajukan Pindah
            </Button>
            {error && <p className="text-sm text-red-600 self-center">{error}</p>}
          </div>
        </CardBody>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
        </div>
      ) : transfers.length === 0 ? (
        <Card><CardBody><EmptyState message="Belum ada proses pindah kamar." /></CardBody></Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
          <Card>
            <CardBody className="p-0">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">Daftar Transfer</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {transfers.map((transfer) => (
                  <button
                    key={transfer.id}
                    onClick={() => setSelectedId(transfer.id)}
                    className={`w-full text-left px-5 py-4 hover:bg-slate-50 ${selectedId === transfer.id ? "bg-teal-50" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{transfer.tenant.user.name}</p>
                        <p className="text-sm text-slate-500">
                          {transfer.fromRoom.roomNumber} {"->"} {transfer.toRoom.roomNumber}
                        </p>
                      </div>
                      <span className="text-[11px] font-semibold px-2 py-1 rounded bg-slate-100 text-slate-700">
                        {STATUS_LABELS[transfer.status]}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Efektif {formatDate(transfer.effectiveDate)}
                    </p>
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>

          {selected && (
            <Card>
              <CardBody className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{selected.tenant.user.name}</h3>
                    <p className="text-sm text-slate-500">
                      {selected.fromRoom.roomNumber} {"->"} {selected.toRoom.roomNumber} | Efektif {formatDate(selected.effectiveDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex px-3 py-1.5 rounded-full bg-teal-50 text-teal-700 text-sm font-semibold">
                      {STATUS_LABELS[selected.status]}
                    </div>
                    {selected.letterNumber && (
                      <p className="text-xs text-slate-500 mt-2">No Surat: {selected.letterNumber}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-lg border border-slate-200 p-4">
                    <p className="text-xs text-slate-500">Sewa Lama</p>
                    <p className="font-semibold">{formatCurrency(selected.currentMonthlyRent)}</p>
                    <p className="text-xs text-slate-500 mt-2">Deposit Lama</p>
                    <p className="font-semibold">{formatCurrency(selected.currentDeposit)}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-4">
                    <p className="text-xs text-slate-500">Sewa Baru</p>
                    <p className="font-semibold">{formatCurrency(selected.newMonthlyRent)}</p>
                    <p className="text-xs text-slate-500 mt-2">Deposit Baru</p>
                    <p className="font-semibold">{formatCurrency(selected.newDeposit)}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-4">
                    <p className="text-xs text-slate-500">Penyesuaian</p>
                    <p className="font-semibold">{formatCurrency(selected.financeAdjustmentAmount)}</p>
                    <p className="text-xs text-slate-500 mt-2">Prorata Hari</p>
                    <p className="font-semibold">{selected.prorataDays || 0} hari</p>
                  </div>
                </div>

                <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
                  <p className="text-sm text-slate-600">{selected.reason || "Tanpa catatan alasan pindah."}</p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {selected.status === "REQUESTED" && (
                    <Button disabled={saving} onClick={() => runAction("approve")}>
                      <Check className="w-4 h-4" /> Approval Admin
                    </Button>
                  )}
                  {selected.status === "APPROVED" && (
                    <Button disabled={saving} onClick={() => runAction("calculate_financials")}>
                      <Check className="w-4 h-4" /> Hitung Selisih
                    </Button>
                  )}
                  {selected.status === "FINANCIAL_CALCULATED" && (
                    <Button disabled={saving} onClick={() => runAction("generate_letter")}>
                      <FileText className="w-4 h-4" /> Generate Surat PDF
                    </Button>
                  )}
                  {selected.letterNumber && selected.status !== "REQUESTED" && selected.status !== "APPROVED" && selected.status !== "FINANCIAL_CALCULATED" && selected.status !== "CANCELLED" && (
                    <Button
                      variant="secondary"
                      disabled={saving}
                      onClick={() => window.open(`/api/room-transfers/${selected.id}/letter?format=pdf`, "_blank")}
                    >
                      <Printer className="w-4 h-4" /> Cetak Surat
                    </Button>
                  )}
                  {selected.status !== "COMPLETED" && selected.status !== "CANCELLED" && (
                    <Button variant="secondary" disabled={saving} onClick={() => runAction("cancel")}>
                      <X className="w-4 h-4" /> Batalkan
                    </Button>
                  )}
                </div>

                {(selected.status === "LETTER_GENERATED" || selected.status === "OLD_ROOM_INSPECTED") && (
                  <div className="border-t border-slate-100 pt-6">
                    <h4 className="font-semibold text-slate-900 mb-3">Inspeksi Kamar Lama</h4>
                    {inspectionRows.length === 0 ? (
                      <p className="text-sm text-slate-500">Tidak ada asset inventaris yang perlu diinspeksi.</p>
                    ) : (
                      <div className="space-y-3">
                        {inspectionRows.map((row) => (
                          <div key={row.assetId} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <Select
                              value={row.result}
                              onChange={(e) =>
                                setInspectionRows((prev) =>
                                  prev.map((item) => item.assetId === row.assetId ? { ...item, result: e.target.value } : item)
                                )
                              }
                            >
                              <option value="OK">Baik</option>
                              <option value="DAMAGED">Rusak</option>
                              <option value="MISSING">Hilang</option>
                            </Select>
                            <Input
                              type="number"
                              placeholder="Biaya kerusakan"
                              value={row.damageCost}
                              onChange={(e) =>
                                setInspectionRows((prev) =>
                                  prev.map((item) => item.assetId === row.assetId ? { ...item, damageCost: e.target.value } : item)
                                )
                              }
                            />
                            <Input
                              className="md:col-span-2"
                              placeholder="Catatan inspeksi"
                              value={row.notes}
                              onChange={(e) =>
                                setInspectionRows((prev) =>
                                  prev.map((item) => item.assetId === row.assetId ? { ...item, notes: e.target.value } : item)
                                )
                              }
                            />
                          </div>
                        ))}
                        <Button
                          disabled={saving}
                          onClick={() =>
                            runAction("inspect_old_room", {
                              inspections: inspectionRows.map((row) => ({
                                assetId: row.assetId,
                                result: row.result,
                                damageCost: parseFloat(row.damageCost || "0"),
                                notes: row.notes || undefined,
                              })),
                            })
                          }
                        >
                          <Check className="w-4 h-4" /> Simpan Inspeksi
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {(selected.status === "OLD_ROOM_INSPECTED" || selected.status === "OLD_METER_CLOSED") && (
                  <div className="border-t border-slate-100 pt-6">
                    <h4 className="font-semibold text-slate-900 mb-3">Closing Utility Meter Lama</h4>
                    {selectedOldUtilities.length === 0 ? (
                      <div>
                        <p className="text-sm text-slate-500 mb-3">Kamar lama tidak memiliki utility meter aktif.</p>
                        {selected.status === "OLD_ROOM_INSPECTED" && (
                          <Button disabled={saving} onClick={() => runAction("close_old_meters", { readings: [] })}>
                            <Check className="w-4 h-4" /> Lewati Closing Meter
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedOldUtilities.map((utility) => {
                          const row = oldMeterRows.find((item) => item.utilityId === utility.utilityId);
                          return (
                            <div key={utility.utilityId} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <Input value={utility.utility.utilityName} disabled />
                              <Input
                                type="number"
                                value={row?.reading || ""}
                                onChange={(e) =>
                                  setOldMeterRows((prev) =>
                                    prev.map((item) =>
                                      item.utilityId === utility.utilityId ? { ...item, reading: e.target.value } : item
                                    )
                                  )
                                }
                              />
                              <Input
                                placeholder="Catatan"
                                value={row?.notes || ""}
                                onChange={(e) =>
                                  setOldMeterRows((prev) =>
                                    prev.map((item) =>
                                      item.utilityId === utility.utilityId ? { ...item, notes: e.target.value } : item
                                    )
                                  )
                                }
                              />
                            </div>
                          );
                        })}
                        {selected.status === "OLD_ROOM_INSPECTED" && (
                          <Button
                            disabled={saving}
                            onClick={() =>
                              runAction("close_old_meters", {
                                readings: oldMeterRows.map((row) => ({
                                  utilityId: row.utilityId,
                                  reading: parseFloat(row.reading || "0"),
                                  notes: row.notes || undefined,
                                })),
                              })
                            }
                          >
                            <Check className="w-4 h-4" /> Simpan Closing Meter
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {(selected.status === "OLD_METER_CLOSED" || selected.status === "NEW_ROOM_HANDOVER") && (
                  <div className="border-t border-slate-100 pt-6">
                    <h4 className="font-semibold text-slate-900 mb-3">Serah Terima Kamar Baru</h4>
                    <p className="text-sm text-slate-500 mb-3">
                      Aktivasi inventaris kamar baru untuk penghuni yang dipindahkan.
                    </p>
                    {selected.status === "OLD_METER_CLOSED" && (
                      <Button disabled={saving} onClick={() => runAction("handover_new_room")}>
                        <Check className="w-4 h-4" /> Proses Serah Terima
                      </Button>
                    )}
                  </div>
                )}

                {(selected.status === "NEW_ROOM_HANDOVER" || selected.status === "NEW_METER_OPENED") && (
                  <div className="border-t border-slate-100 pt-6">
                    <h4 className="font-semibold text-slate-900 mb-3">Opening Utility Meter Baru</h4>
                    {selectedNewUtilities.length === 0 ? (
                      <div>
                        <p className="text-sm text-slate-500 mb-3">Kamar baru tidak memiliki utility meter aktif.</p>
                        {selected.status === "NEW_ROOM_HANDOVER" && (
                          <Button disabled={saving} onClick={() => runAction("open_new_meters", { readings: [] })}>
                            <Check className="w-4 h-4" /> Lewati Opening Meter
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedNewUtilities.map((utility) => {
                          const row = newMeterRows.find((item) => item.utilityId === utility.utilityId);
                          return (
                            <div key={utility.utilityId} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <Input value={utility.utility.utilityName} disabled />
                              <Input
                                type="number"
                                value={row?.reading || ""}
                                onChange={(e) =>
                                  setNewMeterRows((prev) =>
                                    prev.map((item) =>
                                      item.utilityId === utility.utilityId ? { ...item, reading: e.target.value } : item
                                    )
                                  )
                                }
                              />
                              <Input
                                placeholder="Catatan"
                                value={row?.notes || ""}
                                onChange={(e) =>
                                  setNewMeterRows((prev) =>
                                    prev.map((item) =>
                                      item.utilityId === utility.utilityId ? { ...item, notes: e.target.value } : item
                                    )
                                  )
                                }
                              />
                            </div>
                          );
                        })}
                        {selected.status === "NEW_ROOM_HANDOVER" && (
                          <Button
                            disabled={saving}
                            onClick={() =>
                              runAction("open_new_meters", {
                                readings: newMeterRows.map((row) => ({
                                  utilityId: row.utilityId,
                                  reading: parseFloat(row.reading || "0"),
                                  notes: row.notes || undefined,
                                })),
                              })
                            }
                          >
                            <Check className="w-4 h-4" /> Simpan Opening Meter
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {(selected.status === "NEW_METER_OPENED" || selected.status === "CONTRACT_UPDATED") && (
                  <div className="border-t border-slate-100 pt-6">
                    <h4 className="font-semibold text-slate-900 mb-3">Update Kontrak</h4>
                    <p className="text-sm text-slate-500 mb-3">
                      Tandai bahwa addendum / surat pindah sudah menjadi dasar perubahan kontrak.
                    </p>
                    {selected.status === "NEW_METER_OPENED" && (
                      <Button disabled={saving} onClick={() => runAction("update_contract")}>
                        <Check className="w-4 h-4" /> Update Kontrak
                      </Button>
                    )}
                  </div>
                )}

                {(selected.status === "CONTRACT_UPDATED" || selected.status === "BILLING_UPDATED") && (
                  <div className="border-t border-slate-100 pt-6">
                    <h4 className="font-semibold text-slate-900 mb-3">Update Billing</h4>
                    <p className="text-sm text-slate-500 mb-3">
                      Buat penyesuaian keuangan otomatis berdasarkan selisih sewa dan deposit.
                    </p>
                    {selected.status === "CONTRACT_UPDATED" && (
                      <Button disabled={saving} onClick={() => runAction("update_billing")}>
                        <Check className="w-4 h-4" /> Update Billing
                      </Button>
                    )}
                  </div>
                )}

                {selected.status === "BILLING_UPDATED" && (
                  <div className="border-t border-slate-100 pt-6">
                    <h4 className="font-semibold text-slate-900 mb-3">Pindah Selesai</h4>
                    <p className="text-sm text-slate-500 mb-3">
                      Tahap ini akan memindahkan tenant ke kamar baru, menutup kamar lama, dan memperbarui status kamar.
                    </p>
                    <Button disabled={saving} onClick={() => runAction("complete")}>
                      <Check className="w-4 h-4" /> Selesaikan Pindah
                    </Button>
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
