import { PageShell } from '../../shared/components/layout/PageShell';

export function ReportPage() {
  return (
    <PageShell>
      <section className="mx-auto w-[var(--space-content)] py-16">
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-soft)]">
          <p className="text-sm uppercase tracking-[0.22em] text-[var(--color-accent)]">Support</p>
          <h1 className="mt-4 font-[var(--font-display)] text-4xl">문의 및 신고</h1>
          <p className="mt-6 max-w-3xl leading-8 text-[var(--color-text-muted)]">
            이후 티켓 작성 폼, 상태 배지, 처리 내역 타임라인을 추가합니다.
          </p>
        </div>
      </section>
    </PageShell>
  );
}