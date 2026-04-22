import { PageShell } from '../../shared/components/layout/PageShell';

export function RegisterPage() {
  return (
    <PageShell>
      <section className="mx-auto w-[var(--space-content)] py-20">
        <div className="max-w-xl rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-soft)]">
          <p className="text-sm uppercase tracking-[0.24em] text-[var(--color-accent)]">Register</p>
          <h1 className="mt-4 font-[var(--font-display)] text-4xl">회원가입</h1>
          <p className="mt-4 leading-7 text-[var(--color-text-muted)]">
            경로는 문서 오타를 정리해 /register 로 통일했습니다.
          </p>
        </div>
      </section>
    </PageShell>
  );
}