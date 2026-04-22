import { Link, NavLink } from 'react-router-dom';

import { ROUTES } from '../../constants/routes';

const navigationItems = [
  { label: 'Documentation', to: ROUTES.about },
  { label: 'Calendar', to: ROUTES.calendar },
  { label: 'Report', to: ROUTES.report },
  { label: 'Profile', to: ROUTES.profile },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[rgba(15,13,10,0.84)] backdrop-blur-md">
      <div className="mx-auto flex w-[var(--space-content)] items-center justify-between gap-6 py-4">
        <Link to={ROUTES.home} className="flex flex-col">
          <span className="font-[var(--font-display)] text-2xl tracking-[0.16em] text-[var(--color-accent-strong)] uppercase">
            Bangchelin
          </span>
          <span className="text-xs tracking-[0.3em] text-[var(--color-text-muted)] uppercase">
            Escape Community Guide
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-[var(--color-text-muted)] md:flex">
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? 'text-[var(--color-text)]' : 'hover:text-[var(--color-text)]'
              }
            >
              {item.label}
            </NavLink>
          ))}
          <Link
            to={ROUTES.login}
            className="rounded-full border border-[var(--color-border)] px-4 py-2 text-[var(--color-text)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent-strong)]"
          >
            Login
          </Link>
        </nav>
      </div>
    </header>
  );
}