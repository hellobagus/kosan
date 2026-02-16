'use client';

import { useState } from 'react';
import Link from 'next/link';
import DeleteForm from '../components/DeleteForm';

type Tempat = { id: number; nama: string };
type Unit = {
  id: number;
  nama_unit: string;
  harga_bulanan: string;
  lantai?: string | null;
  fasilitas?: string | null;
  tempat_nama: string;
  tempat_id: number;
  thumb_path?: string | null;
};

export default function UnitList({ units, tempatList }: { units: Unit[]; tempatList: Tempat[] }) {
  const [filterTempatId, setFilterTempatId] = useState<string>('');
  const filtered =
    filterTempatId === ''
      ? units
      : units.filter((u) => String(u.tempat_id) === filterTempatId);

  return (
    <>
      <div className="unit-filter-bar">
        <label htmlFor="filter-tempat">Filter by tempat:</label>
        <select
          id="filter-tempat"
          value={filterTempatId}
          onChange={(e) => setFilterTempatId(e.target.value)}
        >
          <option value="">Semua tempat</option>
          {tempatList.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nama}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="unit-empty">Belum ada data unit.</p>
      ) : (
        <div className="unit-cards">
          {filtered.map((u) => (
            <div key={u.id} className="unit-card">
              {u.thumb_path ? (
                <img
                  src={u.thumb_path}
                  alt=""
                  className="unit-card-thumb"
                />
              ) : (
                <div
                  className="unit-card-thumb"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '0.9rem',
                  }}
                >
                  Tidak ada foto
                </div>
              )}
              <div className="unit-card-body">
                <span className="unit-card-tempat">{u.tempat_nama}</span>
                <span className="unit-card-name">{u.nama_unit}</span>
                {u.lantai && (
                  <span className="unit-card-meta">Lantai: {u.lantai}</span>
                )}
                {u.fasilitas && (
                  <div className="unit-card-tags">
                    {u.fasilitas.split(',').map((f, i) => (
                      <span key={i} className="unit-card-tag">
                        {f.trim()}
                      </span>
                    ))}
                  </div>
                )}
                <span className="unit-card-price">
                  Rp {Number(u.harga_bulanan).toLocaleString('id-ID')}/bulan
                </span>
                <div className="unit-card-actions">
                  <Link href={`/unit/${u.id}/edit`} className="btn btn-primary">
                    Edit
                  </Link>
                  <DeleteForm action={`/api/unit/${u.id}/hapus`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
