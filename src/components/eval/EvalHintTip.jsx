import Button from '../shared/Button.jsx';
import Tooltip from '../shared/Tooltip.jsx';
import { InfoIcon } from './evalIcons.jsx';

/**
 * 이름표·제목 옆 ⓘ — 늘 보이던 회색 설명 문장을 마우스를 올렸을 때만 보이게 옮긴 자리 (PW-2646).
 *
 * 평가 화면이 «글이 너무 촘촘하다»(커트 2026-11-08)는 지적에, 정보는 빼지 않고 이 자리로 옮겼다.
 * 공용 말풍선(`Tooltip`)·공용 버튼(`Button`, 모양은 className)·공용 선 아이콘(InfoGlyph)을 쓴다. Tab 으로도 열린다.
 * 디자이너 원본에 «이름표 옆 ⓘ» 모양이 없어 개발이 더한 자리다 (design-review).
 *
 * @param {string} text  말풍선 글. 비었으면 아무것도 그리지 않는다.
 * @param {string} [label]  화면 읽기 이름 — 기본은 말풍선 글 그대로.
 */
/**
 * 늘 보이던 문장 여럿을 한 말풍선에 이을 때 — 마침표 없이 끝난 문장(«…쓸 수 있습니다», «…(6개)»)
 * 뒤에 마침표를 붙인다. 붙이지 않으면 «…쓸 수 있습니다 평가 유형별…»처럼 한 문장으로 읽힌다(PW-2646).
 */
export function joinHintSentences(parts) {
  return parts
    .filter(Boolean)
    .map((p) => String(p).trim())
    .filter(Boolean)
    .map((p) => (/[.!?…]$/.test(p) ? p : `${p}.`))
    .join(' ');
}

export default function EvalHintTip({ text, label, testId }) {
  if (!text) return null;
  return (
    <Tooltip content={text}>
      <Button
        className="evc-hint-tip"
        aria-label={label || text}
        data-testid={testId}
      >
        <InfoIcon size={14} />
      </Button>
    </Tooltip>
  );
}
