import { FRAME_ONE_LINE } from './frameValues.js';
import { isEnterKey } from '../shared/enterKey.js';

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
 *   - 값 아래 작은 줄(`sub`, PW-3134) 12/18 · 400 `--text-secondary` — 같은 KR 셈 줄의 칸 아래 글(`.mgr-krm-stat span`)
 *   - 값이 «—»(모름 · 기록 없음)면 회색 `--text-tertiary`(PW-3134) — 0 이 아니라 «값 없음»이 숫자처럼 진하게 보이지 않게
 * 칸은 같은 너비로 나눈다. 이름 · 값 · 작은 줄 모두 짧은 글이라 한 줄이고 넘치면 «…»(마우스를 올리면 전부).
 * 모양을 덮어쓰는 길(className · style)은 두지 않는다.
 *
 * @param {object} props
 * @param {Array<{key: string, label: string, value: string | number, sub?: string, tone?: 'muted' | 'error',
 *   onClick?: Function, hint?: string, testId?: string}>} props.items
 *   `onClick` 을 주면 칸 전체가 누르는 곳이 된다(손가락 · Enter) · `hint` 는 마우스를 올리면 보이는 글
 * @param {string} [props.ariaLabel]
 * @param {string} [props.testId]
 */
export function StatStrip({ items, ariaLabel, testId }) {
  return (
    <section className="okr-h-list dp-frame-stats" style={PANEL_STYLE} aria-label={ariaLabel} data-testid={testId}>
      {items.map((item) => {
        const press = item.onClick
          ? {
              role: 'button',
              tabIndex: 0,
              title: item.hint,
              onClick: () => item.onClick(),
              onKeyDown: (e) => { if (isEnterKey(e)) item.onClick(); },
              style: PRESS_STYLE,
            }
          : {};
        const empty = item.value === '—';
        return (
          <div key={item.key} className="dp-frame-stat" data-testid={item.testId} {...press}>
            <span className="manager-stat-label" style={FRAME_ONE_LINE} title={item.label}>
              {item.label}
            </span>
            <span
              className="manager-stat-value"
              style={item.tone ? { ...FRAME_ONE_LINE, color: TONE_COLOR[item.tone] } : empty ? EMPTY_VALUE_STYLE : FRAME_ONE_LINE}
              // 불러오는 중 자리(부품)는 말풍선 글이 없다 — «[object Object]»가 뜨지 않게
              title={typeof item.value === 'object' ? undefined : String(item.value)}
              data-tone={item.tone}
            >
              {item.value}
            </span>
            {item.sub ? (
              <span style={SUB_STYLE} title={item.sub}>
                {item.sub}
              </span>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}

/** 칸 값 색 — 뜻 하나에 토큰 하나. */
const TONE_COLOR = { muted: 'var(--text-tertiary)', error: 'var(--text-error-primary)' };

/** `.okr-h-list` 의 세로 flex 를 칸 나누기(grid)로 바꾼다 — 판 모양(바탕 · 모서리)만 빌린다. 메뉴가 없어 잘림(overflow)은 그대로. */
const PANEL_STYLE = { display: 'grid', minWidth: 0 };
/** 값이 «—» — 모르는 값은 회색(정한 값이 없을 때 쓰는 `--text-tertiary`). */
const EMPTY_VALUE_STYLE = { ...FRAME_ONE_LINE, color: 'var(--text-tertiary)' };
/** 값 아래 작은 줄 — 디자이너 KR 셈 줄의 칸 아래 글(`.mgr-krm-stat span` 12/18 · 400 · `--text-secondary`). */
const SUB_STYLE = {
  ...FRAME_ONE_LINE,
  fontSize: 'var(--font-size-text-xs)',
  lineHeight: 'var(--line-height-text-xs)',
  fontWeight: 400,
  color: 'var(--text-secondary)',
};
/** 누르는 칸 — 손가락 모양만. 모양은 그대로다. */
const PRESS_STYLE = { cursor: 'pointer' };
