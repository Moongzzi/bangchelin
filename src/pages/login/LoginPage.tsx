import { PageShell } from '../../shared/components/layout/PageShell';

export function LoginPage() {
  return (
    <PageShell>
      <section className="mx-auto w-[var(--space-content)] py-20">
        <div className="max-w-xl rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-soft)]">
          <p className="text-sm uppercase tracking-[0.24em] text-[var(--color-accent)]">Login</p>
          <h1 className="mt-4 font-[var(--font-display)] text-4xl">로그인</h1>
          <p className="mt-4 leading-7 text-[var(--color-text-muted)]">
            다음 단계에서 공통 Input, Button, validation 흐름을 붙일 예정입니다.
          </p>
        </div>
      </section>
    </PageShell>
  );
}