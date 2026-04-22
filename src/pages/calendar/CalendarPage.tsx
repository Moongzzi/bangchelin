import { PageShell } from '../../shared/components/layout/PageShell';

export function CalendarPage() {
  return (
    <PageShell>
      <section className="mx-auto grid w-[var(--space-content)] gap-6 py-16 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
        <aside className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="font-[var(--font-display)] text-2xl">요약 일정</h2>
        </aside>
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-soft)]">
          <h1 className="font-[var(--font-display)] text-4xl">메인 달력</h1>
        </div>
        <aside className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="font-[var(--font-display)] text-2xl">상세 일정</h2>
        </aside>
      </section>
    </PageShell>
  );
}