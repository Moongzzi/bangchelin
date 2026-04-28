import { SearchBoxExamples } from '../../shared/components/search-box';
import { PageShell } from '../../shared/components/layout/PageShell';

export function SearchPreviewPage() {
  return (
    <PageShell>
      <section className="mx-auto w-[var(--space-content)] py-16">
        <div className="max-w-3xl">
          <p className="text-sm uppercase tracking-[0.22em] text-[var(--color-accent)]">
            Component Preview
          </p>
          <h1 className="mt-4 font-[var(--font-display)] text-4xl text-[var(--color-text)]">
            SearchBox Preview
          </h1>
          <p className="mt-4 leading-7 text-[var(--color-text-muted)]">
            현재 구현된 SearchBox 상태들을 한 화면에서 확인할 수 있습니다.
          </p>
        </div>
        <div className="mt-10">
          <SearchBoxExamples />
        </div>
      </section>
    </PageShell>
  );
}