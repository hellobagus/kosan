'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Penghuni = { id: number; nama: string; nama_unit: string; harga_bulanan: string; tempat_nama: string };
const PERIODE_OPTIONS = [
  { value: '3_bulan', label: '3 Bulan (Watermint)' },
  { value: '6_bulan', label: '6 Bulan (Watermint)' },
  { value: '1_tahun', label: '1 Tahun (Watermint)' },
  { value: 'bebas', label: 'Bebas (Custom)' },
];

export default function FormPembayaran({ penghuniList }: { penghuniList: Penghuni[] }) {
  const [error, setError] = useState<string | null>(null);
  const [showBebas, setShowBebas] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const res = await fetch('/api/pembayaran/tambah', { method: 'POST', body: fd });
    const data = await res.json();
    if (!data.ok) {
      setError(data.error || 'Gagal menyimpan.');
      return;
    }
    router.push('/pembayaran');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <p className="error">{error}</p>}
      <div className="form-group">
        <label htmlFor="penghuni_id">Penghuni *</label>
        <select id="penghuni_id" name="penghuni_id" required>
          <option value="">-- Pilih Penghuni --</option>
          {penghuniList.map((p) => (
            <option key={p.id} value={p.id}>
              {p.tempat_nama} - {p.nama_unit} - {p.nama} (Rp {Number(p.harga_bulanan).toLocaleString('id-ID')}/bln)
            </option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="periode_awal">Periode Awal *</label>
        <input type="date" id="periode_awal" name="periode_awal" required />
      </div>
      <div className="form-group">
        <label htmlFor="periode_tipe">Tipe Pembayaran (Watermint / Bebas) *</label>
        <select id="periode_tipe" name="periode_tipe" required onChange={(e) => setShowBebas(e.target.value === 'bebas')}>
          {PERIODE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      {showBebas && (
        <div className="form-group">
          <label htmlFor="bulan_bebas">Jumlah Bulan (bebas)</label>
          <input type="number" id="bulan_bebas" name="bulan_bebas" min={1} defaultValue={1} />
        </div>
      )}
      <div className="form-group">
        <label htmlFor="diskon_persen">Diskon (%)</label>
        <input type="number" id="diskon_persen" name="diskon_persen" min={0} max={100} step={0.01} defaultValue={0} />
      </div>
      <div className="form-group">
        <label htmlFor="diskon_nominal">Diskon Nominal (Rp)</label>
        <input type="number" id="diskon_nominal" name="diskon_nominal" min={0} defaultValue={0} />
      </div>
      <div className="tambahan-list">
        <h4>Biaya Tambahan (sampah, listrik, wifi, dll)</h4>
        <div className="tambahan-item">
          <label style={{ margin: 0, color: 'var(--text-muted)' }}>Sampah</label>
          <input type="number" name="tambahan_sampah" placeholder="Rp" min={0} defaultValue={0} />
        </div>
        <div className="tambahan-item">
          <label style={{ margin: 0, color: 'var(--text-muted)' }}>Listrik</label>
          <input type="number" name="tambahan_listrik" placeholder="Rp" min={0} defaultValue={0} />
        </div>
        <div className="tambahan-item">
          <label style={{ margin: 0, color: 'var(--text-muted)' }}>Wifi</label>
          <input type="number" name="tambahan_wifi" placeholder="Rp" min={0} defaultValue={0} />
        </div>
        <div className="tambahan-item">
          <input type="text" name="tambahan_lain_nama" placeholder="Lain-lain (nama)" />
          <input type="number" name="tambahan_lain_nominal" placeholder="Rp" min={0} defaultValue={0} />
        </div>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary">Simpan</button>
      </div>
    </form>
  );
}
