import type { PropsWithChildren } from 'react';

import { Footer } from './Footer';
import { Header } from './Header';

export function PageShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-transparent text-[var(--color-text)]">
      <Header />
      <main>{children}</main>
      <Footer />
    </div>
  );
}