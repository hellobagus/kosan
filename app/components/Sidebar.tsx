'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Dashboard', icon: '🏠' },
  { href: '/tempat', label: 'Tempat Kos', icon: '📍' },
  { href: '/unit', label: 'Unit', icon: '🏢' },
  { href: '/penghuni', label: 'Penghuni', icon: '👥' },
  { href: '/pembayaran', label: 'Pembayaran', icon: '💳' },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">Kos-Kosan</div>
      <nav className="sidebar-nav">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`sidebar-link ${isActive(link.href) ? 'sidebar-link--active' : ''}`}
          >
            <span className="sidebar-link-icon" aria-hidden="true">
              {link.icon}
            </span>
            <span>{link.label}</span>
          </Link>
        ))}
      </nav>
      <div className="sidebar-footer">Admin panel kos-kosan</div>
    </aside>
  );
}

