import { FRAME_NO_SHRINK, FRAME_TEXT_WRAP } from './frameValues.js';

/**
 * 판 아래 저장 줄 틀 (PW-3139) — 왼쪽 안내 한 줄 + 오른쪽 [저장] 자리. 판 바깥(아래)에 바탕 · 선 없이 놓는다. 스타일시트: okr.css.
 *
 * 값:
 *   - 안내 14/20 · 400 `--text-tertiary` · 왼쪽에 펼침 — 디자이너 창 발 줄 안내(`.okr-wz-footer-hint`)
 *   - 안내 ↔ 버튼 12 — 디자이너 창 발 줄 버튼 사이(`.tl-group-modal-actions` 12)
 *   - 판과의 간격은 틀이 정하지 않는다 — 놓인 화면의 줄 사이(Stack gap)가 띄운다.
 *   디자이너가 «페이지 판 아래 저장 줄»을 따로 그린 화면은 없어 창 발 줄 값을 옮겼다(design-review).
 * 안내는 긴 글이라 낱말 단위로 꺾고, 버튼 자리는 줄어들지 않는다(긴 안내에 [저장]이 눌리지 않음). 안내가 없으면 버튼만 오른쪽.
 * 버튼은 부르는 쪽이 공용 `Button` 으로 넣는다. 모양을 덮어쓰는 길(className · style)은 두지 않는다.
 *
 * @param {object} props
 * @param {import('react').ReactNode} [props.hint] 안내 한 줄(바뀐 칸 수 · 저장 전 알림 등)
 * @param {import('react').ReactNode} props.actions [저장] · [되돌리기] 자리
 * @param {string} [props.testId]
 */
export function SaveBar({ hint, actions, testId }) {
  return (
    <div style={BAR_STYLE} data-testid={testId}>
      {hint ? (
        <p className="okr-wz-footer-hint" style={HINT_STYLE}>
          {hint}
        </p>
      ) : (
        <span style={SPACER_STYLE} />
      )}
      <div style={ACTIONS_STYLE}>{actions}</div>
    </div>
  );
}

const BAR_STYLE = { display: 'flex', alignItems: 'center', gap: 'var(--spacing-lg)', minWidth: 0 };
const HINT_STYLE = { ...FRAME_TEXT_WRAP, margin: 0 };
const SPACER_STYLE = { flex: 1 };
const ACTIONS_STYLE = { ...FRAME_NO_SHRINK, display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' };
