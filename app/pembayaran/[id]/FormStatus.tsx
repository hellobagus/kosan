'use client';

import { useRouter } from 'next/navigation';

export default function FormStatus({ id, status }: { id: string; status: string }) {
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    await fetch(`/api/pembayaran/${id}/status`, { method: 'POST', body: fd });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <select name="status" defaultValue={status}>
        <option value="pending">Pending</option>
        <option value="lunas">Lunas</option>
        <option value="sebagian">Sebagian</option>
      </select>
      <button type="submit" className="btn btn-primary" style={{ marginLeft: '0.5rem' }}>Update Status</button>
    </form>
  );
}
