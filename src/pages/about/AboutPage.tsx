import { PageShell } from '../../shared/components/layout/PageShell';

export function AboutPage() {
  return (
    <PageShell>
      <section className="mx-auto grid w-[var(--space-content)] gap-8 py-16 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="h-fit rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 lg:sticky lg:top-24">
          <p className="text-sm uppercase tracking-[0.22em] text-[var(--color-accent)]">Docs</p>
          <ul className="mt-6 space-y-3 text-sm text-[var(--color-text-muted)]">
            <li>톡방 이용 가이드</li>
            <li>디스코드 참여 방법</li>
            <li>커뮤니티 운영 원칙</li>
          </ul>
        </aside>
        <article className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-soft)]">
          <p className="text-sm uppercase tracking-[0.22em] text-[var(--color-accent)]">Documentation</p>
          <h1 className="mt-4 font-[var(--font-display)] text-4xl">커뮤니티 문서 허브</h1>
          <p className="mt-6 max-w-3xl leading-8 text-[var(--color-text-muted)]">
            이 페이지는 이후 mock 문서 데이터와 검색, 사이드 트리 메뉴, 본문 섹션 네비게이션으로 확장할 예정입니다.
          </p>
        </article>
      </section>
    </PageShell>
  );
}