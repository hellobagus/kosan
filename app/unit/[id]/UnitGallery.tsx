'use client';

import { useState, useCallback } from 'react';

type ImageRow = { id: number; file_path: string; sort_order: number };

export default function UnitGallery({ unitId, initialImages }: { unitId: string; initialImages: ImageRow[] }) {
  const [images, setImages] = useState<ImageRow[]>(initialImages);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/unit/${unitId}/gallery`);
    const data = await res.json();
    if (Array.isArray(data)) setImages(data);
  }, [unitId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set('file', file);
      const res = await fetch(`/api/unit/${unitId}/gallery`, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.ok) {
        await refresh();
      } else {
        setError(data.error || 'Gagal upload.');
      }
    } catch {
      setError('Gagal upload.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleDelete(imageId: number) {
    if (!confirm('Hapus foto ini?')) return;
    setError(null);
    const res = await fetch(`/api/unit/${unitId}/gallery?imageId=${imageId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.ok) await refresh();
    else setError(data.error || 'Gagal hapus.');
  }

  return (
    <div className="unit-gallery">
      <h3 className="unit-gallery-title">Galeri Foto Kamar</h3>
      {error && <p className="error">{error}</p>}
      <div className="unit-gallery-grid">
        {images.map((img) => (
          <div key={img.id} className="unit-gallery-item">
            <img src={img.file_path} alt="" />
            <button
              type="button"
              className="btn btn-danger unit-gallery-delete"
              onClick={() => handleDelete(img.id)}
            >
              Hapus
            </button>
          </div>
        ))}
      </div>
      <div className="unit-gallery-upload">
        <label className="btn btn-secondary">
          {uploading ? 'Mengunggah...' : 'Tambah Foto'}
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            disabled={uploading}
            style={{ display: 'none' }}
          />
        </label>
      </div>
    </div>
  );
}
