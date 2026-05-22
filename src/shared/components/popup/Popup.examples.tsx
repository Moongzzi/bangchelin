import { useState } from 'react';

import { Popup, type PopupAction } from './Popup';

type DemoId = 'filled-double' | 'filled-single' | 'outline-double' | 'outline-single' | 'text-action' | 'custom';

const triggerGridStyle = {
  display: 'grid',
  gap: '1rem',
  gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))',
} as const;

const triggerCardStyle = {
  display: 'grid',
  gap: '0.75rem',
  padding: '1.25rem',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'color-mix(in srgb, var(--color-surface) 92%, white)',
} as const;

const triggerButtonStyle = {
  minHeight: '2.75rem',
  border: '1px solid var(--color-border-strong)',
  borderRadius: '0.75rem',
  background: 'white',
  color: 'var(--color-text)',
  fontWeight: 700,
  cursor: 'pointer',
} as const;

export function PopupExamples() {
  const [activeDemo, setActiveDemo] = useState<DemoId | null>(null);

  const closePopup = () => setActiveDemo(null);

  const dismissAction: PopupAction = {
    label: '취소',
    variant: 'text',
    tone: 'neutral',
    closeOnClick: true,
  };

  return (
    <>
      <div style={triggerGridStyle}>
        <DemoCard
          title="취소 + filled"
          description="기본 확인형 액션 조합"
          onOpen={() => setActiveDemo('filled-double')}
        />
        <DemoCard
          title="단일 filled"
          description="단독 확인 버튼 배치"
          onOpen={() => setActiveDemo('filled-single')}
        />
        <DemoCard
          title="취소 + outline"
          description="보조 확인용 outline 액션"
          onOpen={() => setActiveDemo('outline-double')}
        />
        <DemoCard
          title="단일 outline"
          description="주의 안내나 가이드 확인용"
          onOpen={() => setActiveDemo('outline-single')}
        />
        <DemoCard
          title="text action"
          description="텍스트 액션 중심의 최소형"
          onOpen={() => setActiveDemo('text-action')}
        />
        <DemoCard
          title="custom content"
          description="children 기반 확장 + 모바일 대응"
          onOpen={() => setActiveDemo('custom')}
        />
      </div>

      <Popup
        open={activeDemo === 'filled-double'}
        onClose={closePopup}
        title="로그아웃"
        description={"로그아웃하시겠습니까?\n서비스 이용이 제한될 수 있습니다."}
        actions={[
          dismissAction,
          {
            label: '로그아웃',
            variant: 'filled',
            closeOnClick: true,
          },
        ]}
        role="alertdialog"
      />

      <Popup
        open={activeDemo === 'filled-single'}
        onClose={closePopup}
        title="로그아웃"
        description={"로그아웃하시겠습니까?\n서비스 이용이 제한될 수 있습니다."}
        actions={[
          {
            label: '확인',
            variant: 'filled',
            closeOnClick: true,
            autoFocus: true,
          },
        ]}
        role="alertdialog"
      />

      <Popup
        open={activeDemo === 'outline-double'}
        onClose={closePopup}
        title="로그아웃"
        description={"로그아웃하시겠습니까?\n서비스 이용이 제한될 수 있습니다."}
        actions={[
          dismissAction,
          {
            label: '로그아웃',
            variant: 'outline',
            closeOnClick: true,
          },
        ]}
        role="alertdialog"
      />

      <Popup
        open={activeDemo === 'outline-single'}
        onClose={closePopup}
        title="로그아웃"
        description={"로그아웃하시겠습니까?\n서비스 이용이 제한될 수 있습니다."}
        actions={[
          {
            label: '확인',
            variant: 'outline',
            closeOnClick: true,
            autoFocus: true,
          },
        ]}
      />

      <Popup
        open={activeDemo === 'text-action'}
        onClose={closePopup}
        title="로그아웃"
        description={"로그아웃하시겠습니까?\n서비스 이용이 제한될 수 있습니다."}
        actions={[
          dismissAction,
          {
            label: '로그아웃',
            variant: 'text',
            closeOnClick: true,
          },
        ]}
      />

      <Popup
        open={activeDemo === 'custom'}
        onClose={closePopup}
        title="예약 상태 확인"
        description="팝업 본문이 길어질 때도 패널이 viewport를 넘지 않도록 내부 스크롤을 유지합니다."
        size="lg"
        maxWidth="36rem"
        closeOnOverlayClick={false}
        actions={[
          dismissAction,
          {
            label: '확인했어요',
            variant: 'filled',
            onClick: () => undefined,
            closeOnClick: true,
          },
        ]}
      >
        <div style={{ display: 'grid', gap: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
          <p style={{ margin: 0 }}>
            캘린더 일정, 가이드 안내, 간단한 폼 검토처럼 본문이 두세 단락으로 늘어나는 경우를 가정한 예시입니다.
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
            <li>overlay 클릭 닫기 비활성화</li>
            <li>본문 길이가 길어지면 body만 스크롤</li>
            <li>모바일에서는 좌우 여백과 패딩 자동 축소</li>
          </ul>
          <p style={{ margin: 0 }}>
            실제 서비스에서는 children 자리에 폼, 체크리스트, 안내 문구 블록을 그대로 삽입할 수 있습니다.
          </p>
        </div>
      </Popup>
    </>
  );
}

type DemoCardProps = {
  title: string;
  description: string;
  onOpen: () => void;
};

function DemoCard({ title, description, onOpen }: DemoCardProps) {
  return (
    <article style={triggerCardStyle}>
      <div>
        <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-text)' }}>{title}</h3>
        <p style={{ margin: '0.5rem 0 0', color: 'var(--color-text-muted)', lineHeight: 1.55 }}>{description}</p>
      </div>
      <button type="button" style={triggerButtonStyle} onClick={onOpen}>
        팝업 열기
      </button>
    </article>
  );
}