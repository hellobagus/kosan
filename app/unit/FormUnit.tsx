'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const FASILITAS_OPTIONS = [
  'AC',
  'Kamar mandi dalam',
  'WiFi',
  'Laundry',
  'Parkir',
  'Lemari',
  'Meja belajar',
  'Dapur bersama',
];

type Tempat = { id: number; nama: string };
type Props = {
  item?: {
    id: number;
    tempat_id: number;
    nama_unit: string;
    harga_bulanan: string;
    keterangan: string | null;
    lantai?: string | null;
    fasilitas?: string | null;
  } | null;
  tempatList: Tempat[];
};

export default function FormUnit({ item, tempatList }: Props) {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const isEdit = !!item;
  const selectedFasilitas = (item?.fasilitas || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const fasilitasArr = fd.getAll('fasilitas');
    fd.delete('fasilitas');
    fd.set('fasilitas', Array.isArray(fasilitasArr) ? fasilitasArr.join(', ') : String(fasilitasArr || ''));
    const res = await fetch(isEdit ? `/api/unit/${item.id}/edit` : '/api/unit/tambah', {
      method: 'POST',
      body: fd,
    });
    const data = await res.json();
    if (!data.ok) {
      setError(data.error || 'Gagal menyimpan.');
      return;
    }
    router.push('/unit');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <p className="error">{error}</p>}
      <div className="form-group">
        <label htmlFor="tempat_id">Tempat Kos *</label>
        <select id="tempat_id" name="tempat_id" required defaultValue={item?.tempat_id ?? ''}>
          <option value="">-- Pilih Tempat --</option>
          {tempatList.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nama}
            </option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="nama_unit">Nama Unit *</label>
        <input
          type="text"
          id="nama_unit"
          name="nama_unit"
          defaultValue={item?.nama_unit ?? ''}
          required
          placeholder="Contoh: A-101"
        />
      </div>
      <div className="form-group">
        <label htmlFor="lantai">Lantai</label>
        <input
          type="text"
          id="lantai"
          name="lantai"
          defaultValue={item?.lantai ?? ''}
          placeholder="Contoh: 1, 2, Lantai 1"
        />
      </div>
      <div className="form-group">
        <label>Fasilitas</label>
        <div className="fasilitas-checkboxes">
          {FASILITAS_OPTIONS.map((f) => (
            <label key={f} className="checkbox-label">
              <input
                type="checkbox"
                name="fasilitas"
                value={f}
                defaultChecked={selectedFasilitas.includes(f)}
              />
              <span>{f}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="harga_bulanan">Harga per Bulan (Rp)</label>
        <input
          type="number"
          id="harga_bulanan"
          name="harga_bulanan"
          defaultValue={item?.harga_bulanan ?? ''}
          min={0}
          step={1000}
        />
      </div>
      <div className="form-group">
        <label htmlFor="keterangan">Keterangan</label>
        <textarea id="keterangan" name="keterangan" defaultValue={item?.keterangan ?? ''} />
      </div>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary">
          Simpan
        </button>
      </div>
    </form>
  );
}
