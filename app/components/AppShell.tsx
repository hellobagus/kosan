import Sidebar from './Sidebar';

export default function AppShell({
  username,
  children,
}: {
  username: string;
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <header className="topbar">
          <div />
          <div className="topbar-actions">
            <span className="topbar-user">Masuk sebagai {username}</span>
            <form action="/api/logout" method="post">
              <button type="submit" className="btn btn-secondary">
                Keluar
              </button>
            </form>
          </div>
        </header>
        <main className="main-content">
          <div className="container">{children}</div>
        </main>
      </div>
    </div>
  );
}

