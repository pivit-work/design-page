import { FRAME_ONE_LINE } from './frameValues.js';

/**
 * 판 안 구역 틀 (PW-3139) — 흰 판(`Panel`) 본문을 가는 선으로 나눈다. 스타일시트: frames.css · okr.css.
 *
 * 값:
 *   - 구역 사이 선 — 디자이너 OKR 히스토리 판의 분기 사이 선(`.okr-h-quarter + .okr-h-quarter` 1px `--border-secondary`)
 *   - 선 위 · 아래 24 · 구역 안 줄 사이 24 — 판 본문 줄 사이(`.okr-h-body` gap 24)
 *   - 구역 제목 — 디자이너 OKR 전략 카드 줄 제목(`.okr-s-title` 20/28 굵게 `--fg-primary`) — 판 제목(24/32) 아래 위계.
 *     디자이너가 «판 안 구역 제목»을 따로 그린 화면은 없어 개발이 골랐다(design-review).
 * 첫 구역 위에는 선이 없다. 제목은 짧은 글이라 한 줄이고 넘치면 «…».
 * 모양을 덮어쓰는 길(className · style)은 두지 않는다.
 *
 * @param {object} props
 * @param {string} [props.title] 구역 제목 — 없으면 선만 긋는다
 * @param {import('react').ReactNode} [props.actions] 제목 줄 오른쪽 버튼 자리(제목이 있을 때만)
 * @param {string} [props.testId]
 * @param {import('react').ReactNode} props.children
 */
export function PanelSection({ title, actions, testId, children }) {
  return (
    <section className="dp-frame-section" data-testid={testId}>
      {title && (
        <div style={HEAD_STYLE}>
          <h3 className="okr-s-title" style={TITLE_STYLE} title={title}>
            {title}
          </h3>
          {actions && <div style={ACTIONS_STYLE}>{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/** 제목 줄 — 판 머리 줄과 같은 짜임(제목 왼쪽 · 버튼 오른쪽 · 사이 16 · 모자라면 버튼이 다음 줄). */
const HEAD_STYLE = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: 'var(--spacing-xl)',
  minWidth: 0,
};
const TITLE_STYLE = { ...FRAME_ONE_LINE, margin: 0, flex: '1 1 auto' };
/** 버튼 사이 8 — 판 머리 버튼 자리와 같다(조직도 판 툴바 `--spacing-md`). */
const ACTIONS_STYLE = {
  flex: 'none',
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 'var(--spacing-md)',
  maxWidth: '100%',
};
