export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[rgba(10,9,7,0.78)]">
      <div className="mx-auto grid w-[var(--space-content)] gap-8 py-12 md:grid-cols-3">
        <div>
          <p className="font-[var(--font-display)] text-2xl text-[var(--color-accent-strong)]">
            Bangchelin Guide
          </p>
          <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
            방탈출 미식 협회 커뮤니티를 위한 프리미엄 정보 허브.
          </p>
        </div>
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
            Community
          </p>
          <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
            문서, 일정, 문의 흐름을 같은 정보 구조 안에서 연결합니다.
          </p>
        </div>
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
            Status
          </p>
          <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
            현재는 mock data 기반 UI 설계 단계입니다.
          </p>
        </div>
      </div>
    </footer>
  );
}