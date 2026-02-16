'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Unit = { id: number; nama_unit: string; tempat_nama: string };
type Props = {
  item?: {
    id: number; unit_id: number; nama: string; no_ktp: string | null; no_hp: string | null;
    tanggal_masuk: string; aktif: boolean;
  } | null;
  unitList: Unit[];
};

export default function FormPenghuni({ item, unitList }: Props) {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const isEdit = !!item;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const res = await fetch(isEdit ? `/api/penghuni/${item.id}/edit` : '/api/penghuni/tambah', { method: 'POST', body: fd });
    const data = await res.json();
    if (!data.ok) {
      setError(data.error || 'Gagal menyimpan.');
      return;
    }
    router.push('/penghuni');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <p className="error">{error}</p>}
      <div className="form-group">
        <label htmlFor="unit_id">Unit (Tempat - Unit) *</label>
        <select id="unit_id" name="unit_id" required defaultValue={item?.unit_id ?? ''}>
          <option value="">-- Pilih Unit --</option>
          {unitList.map((u) => (
            <option key={u.id} value={u.id}>{u.tempat_nama} - {u.nama_unit}</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="nama">Nama Lengkap *</label>
        <input type="text" id="nama" name="nama" defaultValue={item?.nama ?? ''} required />
      </div>
      <div className="form-group">
        <label htmlFor="no_ktp">No. KTP</label>
        <input type="text" id="no_ktp" name="no_ktp" defaultValue={item?.no_ktp ?? ''} />
      </div>
      <div className="form-group">
        <label htmlFor="no_hp">No. HP</label>
        <input type="text" id="no_hp" name="no_hp" defaultValue={item?.no_hp ?? ''} />
      </div>
      <div className="form-group">
        <label htmlFor="tanggal_masuk">Tanggal Masuk *</label>
        <input type="date" id="tanggal_masuk" name="tanggal_masuk" defaultValue={item?.tanggal_masuk ?? ''} required />
      </div>
      {item && (
        <div className="form-group">
          <label><input type="checkbox" name="aktif" defaultChecked={item.aktif} /> Aktif</label>
        </div>
      )}
      <div className="form-actions">
        <button type="submit" className="btn btn-primary">Simpan</button>
      </div>
    </form>
  );
}
