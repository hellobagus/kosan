'use client';

export default function DeleteForm({ action, label = 'Hapus', className }: { action: string; label?: string; className?: string }) {
  return (
    <form action={action} method="post" style={{ display: 'inline' }} onSubmit={(e) => !confirm('Yakin hapus?') && e.preventDefault()}>
      <button type="submit" className={className ?? 'btn btn-danger'}>{label}</button>
    </form>
  );
}
