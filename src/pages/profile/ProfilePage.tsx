import { PageShell } from '../../shared/components/layout/PageShell';

export function ProfilePage() {
  return (
    <PageShell>
      <section className="mx-auto w-[var(--space-content)] py-16">
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-soft)]">
          <p className="text-sm uppercase tracking-[0.22em] text-[var(--color-accent)]">Profile</p>
          <h1 className="mt-4 font-[var(--font-display)] text-4xl">프로필</h1>
          <p className="mt-6 max-w-3xl leading-8 text-[var(--color-text-muted)]">
            사용자 정보 조회와 수정 섹션을 두 단계로 나눠 구성할 예정입니다.
          </p>
        </div>
      </section>
    </PageShell>
  );
}