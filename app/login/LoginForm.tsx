'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const res = await fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify({
        username: fd.get('username'),
        password: fd.get('password'),
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    if (!data.ok) {
      setError(data.error || 'Login gagal.');
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <form method="post" onSubmit={handleSubmit}>
      {error && <p className="error">{error}</p>}
      <label htmlFor="username">Username</label>
      <input type="text" id="username" name="username" required autoFocus />
      <label htmlFor="password">Password</label>
      <input type="password" id="password" name="password" required />
      <button type="submit">Masuk</button>
    </form>
  );
}
