'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = { item?: { id: number; nama: string; alamat: string | null } | null };

export default function FormTempat({ item }: Props) {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const isEdit = !!item;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const res = await fetch(isEdit ? `/api/tempat/${item.id}/edit` : '/api/tempat/tambah', {
      method: 'POST',
      body: fd,
    });
    const data = await res.json();
    if (!data.ok) {
      setError(data.error || 'Gagal menyimpan.');
      return;
    }
    router.push('/tempat');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <p className="error">{error}</p>}
      <div className="form-group">
        <label htmlFor="nama">Nama Tempat *</label>
        <input type="text" id="nama" name="nama" defaultValue={item?.nama ?? ''} required />
      </div>
      <div className="form-group">
        <label htmlFor="alamat">Alamat</label>
        <textarea id="alamat" name="alamat" defaultValue={item?.alamat ?? ''} />
      </div>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary">Simpan</button>
      </div>
    </form>
  );
}
