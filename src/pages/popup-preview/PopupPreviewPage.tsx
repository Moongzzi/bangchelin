import { PopupExamples } from '../../shared/components/popup';
import { PageShell } from '../../shared/components/layout/PageShell';

export function PopupPreviewPage() {
  return (
    <PageShell>
      <section className="mx-auto w-[var(--space-content)] py-16">
        <div className="max-w-3xl">
          <p className="text-sm uppercase tracking-[0.22em] text-[var(--color-accent)]">
            Component Preview
          </p>
          <h1 className="mt-4 font-[var(--font-display)] text-4xl text-[var(--color-text)]">
            Popup Preview
          </h1>
          <p className="mt-4 leading-7 text-[var(--color-text-muted)]">
            확인형, 단일 액션형, outline, text, custom content까지 현재 Popup variation을 한 화면에서 검증할 수 있습니다.
          </p>
        </div>
        <div className="mt-10">
          <PopupExamples />
        </div>
      </section>
    </PageShell>
  );
}