import { FRAME_ONE_LINE } from './frameValues.js';

/**
 * 숫자 칸 줄 틀 (PW-3139) — 흰 판 하나 안에 숫자 칸 여럿을 나란히, 칸 사이 세로선. 스타일시트: frames.css · okr.css · manager.css.
 *
 * 값:
 *   - 판 — 흰 판 틀과 같은 디자이너 흰 카드(`.okr-h-list` `--bg-quaternary` · 모서리 16)
 *   - 칸 이름 12/18 · 600 `--text-secondary` · 값 30/38 · 500 `--text-primary` — 디자이너 숫자 칸(`.manager-stat-label` · `-value`)
 *   - 칸 안 여백 16/24 · 높이 100 — 디자이너 숫자 칸(`.manager-kpi-card`)
 *   - 칸 사이 세로선 1px `--border-secondary` — 디자이너 매니저 KR 셈 줄(`.mgr-krm-stat:not(:last-child)`)
 *   디자이너가 «큰 숫자 칸을 한 판에 세로선으로 나눈» 화면은 없어 두 디자이너 모양을 합쳤다(design-review).
 * 칸마다 `tone` 을 줄 수 있다(PW-3126) — `muted` 는 «없음 · 0»처럼 읽을 것 없는 값을 흐리게(`--text-tertiary`), `error` 는 고쳐야 할
 * 값(오류 1 이상)을 빨강(`--text-error-primary`)으로. 디자이너 원온원 «주의 필요» 빨강 숫자와 같은 뜻이다. 안 주면 지금 그대로.
 * 칸은 같은 너비로 나눈다. 이름 · 값 모두 짧은 글이라 한 줄이고 넘치면 «…»(마우스를 올리면 전부).
 * 모양을 덮어쓰는 길(className · style)은 두지 않는다.
 *
 * @param {object} props
 * @param {Array<{key: string, label: string, value: string | number, tone?: 'muted' | 'error'}>} props.items
 * @param {string} [props.ariaLabel]
 * @param {string} [props.testId]
 */
export function StatStrip({ items, ariaLabel, testId }) {
  return (
    <section className="okr-h-list dp-frame-stats" style={PANEL_STYLE} aria-label={ariaLabel} data-testid={testId}>
      {items.map((item) => (
        <div key={item.key} className="dp-frame-stat">
          <span className="manager-stat-label" style={FRAME_ONE_LINE} title={item.label}>
            {item.label}
          </span>
          <span
            className="manager-stat-value"
            style={item.tone ? { ...FRAME_ONE_LINE, color: TONE_COLOR[item.tone] } : FRAME_ONE_LINE}
            title={String(item.value)}
            data-tone={item.tone}
          >
            {item.value}
          </span>
        </div>
      ))}
    </section>
  );
}

/** 칸 값 색 — 뜻 하나에 토큰 하나. */
const TONE_COLOR = { muted: 'var(--text-tertiary)', error: 'var(--text-error-primary)' };

/** `.okr-h-list` 의 세로 flex 를 칸 나누기(grid)로 바꾼다 — 판 모양(바탕 · 모서리)만 빌린다. 메뉴가 없어 잘림(overflow)은 그대로. */
const PANEL_STYLE = { display: 'grid', minWidth: 0 };
