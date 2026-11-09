import Tooltip from '../shared/Tooltip.jsx';
import { InfoIcon } from './evalIcons.jsx';

/**
 * 이름표·제목 옆 ⓘ — 늘 보이던 회색 설명 문장을 마우스를 올렸을 때만 보이게 옮긴 자리 (PW-2646).
 *
 * 평가 화면이 «글이 너무 촘촘하다»(커트 2026-11-08)는 지적에, 정보는 빼지 않고 이 자리로 옮겼다.
 * 공용 말풍선(`Tooltip`)과 공용 선 아이콘(InfoGlyph)을 쓴다. Tab 으로도 열린다(button).
 * 디자이너 원본에 «이름표 옆 ⓘ» 모양이 없어 개발이 더한 자리다 (design-review).
 *
 * @param {string} text  말풍선 글. 비었으면 아무것도 그리지 않는다.
 * @param {string} [label]  화면 읽기 이름 — 기본은 말풍선 글 그대로.
 */
export default function EvalHintTip({ text, label, testId }) {
  if (!text) return null;
  return (
    <Tooltip content={text}>
      <button
        type="button"
        className="evc-hint-tip"
        aria-label={label || text}
        data-testid={testId}
      >
        <InfoIcon size={14} />
      </button>
    </Tooltip>
  );
}
