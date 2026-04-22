import { Link } from 'react-router-dom';

import { ROUTES } from '../../shared/constants/routes';
import { PageShell } from '../../shared/components/layout/PageShell';

export function HomePage() {
  return (
    <PageShell>
      <section className="mx-auto flex min-h-[calc(100vh-12rem)] w-[var(--space-content)] flex-col justify-center py-20">
        <p className="text-sm uppercase tracking-[0.32em] text-[var(--color-accent)]">
          Premium Escape Community
        </p>
        <h1 className="mt-6 max-w-4xl font-[var(--font-display)] text-5xl leading-tight md:text-7xl">
          방탈출 플레이를 더 깊게 즐기기 위한 커뮤니티 가이드.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--color-text-muted)] md:text-lg">
          톡방과 디스코드 가이드, 일정 관리, 문의 흐름을 한 곳에서 정돈된 구조로 제공합니다.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            to={ROUTES.about}
            className="rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-medium text-[#16110b] transition hover:bg-[var(--color-accent-strong)]"
          >
            Documentation 보기
          </Link>
          <Link
            to={ROUTES.calendar}
            className="rounded-full border border-[var(--color-border)] px-6 py-3 text-sm font-medium text-[var(--color-text)] transition hover:border-[var(--color-accent)]"
          >
            일정 관리 확인
          </Link>
        </div>
      </section>
    </PageShell>
  );
}