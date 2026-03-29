import { Link, useLocation } from 'react-router-dom';

const NAV_LINKS = [
  { label: 'Scan', to: '/' },
  { label: 'History', to: '/history' },
];

export default function Navbar() {
  const { pathname } = useLocation();

  return (
    <nav
      className="w-full sticky top-0 z-50 flex items-center justify-between px-8"
      style={{ backgroundColor: '#111111', height: '60px' }}
    >
      <Link to="/" className="text-white font-bold text-lg select-none">
        🛡️ HerlockHolmes
      </Link>

      <div className="flex items-center gap-6">
        {NAV_LINKS.map(({ label, to }) => {
          const isActive = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className="text-sm font-medium transition-colors"
              style={{ color: isActive ? '#7c3aed' : '#9ca3af' }}
              onMouseEnter={e => { if (!isActive) e.target.style.color = '#ffffff'; }}
              onMouseLeave={e => { if (!isActive) e.target.style.color = '#9ca3af'; }}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
