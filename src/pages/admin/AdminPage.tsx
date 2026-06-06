import { AdminHeader } from '../../shared/components/layout/AdminHeader';
import { Footer } from '../../shared/components/layout/Footer';

export function AdminPage() {
  return (
    <div className="min-h-screen bg-transparent text-[var(--color-text)]">
      <AdminHeader />
      <main>
        <section className="min-h-[60vh]" aria-label="관리자 페이지" />
      </main>
      <Footer />
    </div>
  );
}
