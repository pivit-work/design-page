import { FRAME_TEXT_WRAP } from './frameValues.js';

/**
 * 안내 줄 틀 (PW-2994 ③ · PW-3139 에서 design-page 로 옮김) — 안내 문장을 여러 개 받아 한 줄에 한 문장씩 그린다.
 * 스타일시트: modal-shell.css · timeline.css(쓰는 쪽이 불러온다).
 *
 * 문장을 « — »·마침표로 한 문단에 잇지 않는다 — 부르는 쪽이 문장 목록을 넘기면 틀이 줄로 나눈다.
 * 위계는 둘뿐이다 — 디자이너(stesslee) 창 머리 설명 줄에서 꺼냈다:
 *   - 기본 `.tl-group-modal-desc` 14/20 · 600 · `--text-secondary`(«그룹 추가» 창 설명)
 *   - 흐림 `.tl-event-modal-subtitle` 14/20 · 500 · `--text-tertiary`(일정 창 부제)
 * 바탕 · 테두리 · 점 목록은 없다. 긴 문장은 낱말 단위로 줄을 바꾸고 한 글자씩 꺾지 않는다.
 * 모양을 덮어쓰는 길(className · style)은 두지 않는다.
 *
 * @param {object} props
 * @param {import('react').ReactNode[]} props.lines 한 줄에 한 문장 — 빈 값(false · null · 0 · 공백뿐인 글)은 건너뛴다
 *   — `count && '…'` 처럼 넘겨도 «0» 줄이 안 생긴다
 * @param {'default' | 'muted'} [props.tone]
 * @param {string} [props.testId]
 */
export function NoticeLines({ lines, tone = 'default', testId }) {
  const shown = lines.filter(
    (line) =>
      line !== null && line !== undefined && line !== false && line !== 0 && !(typeof line === 'string' && line.trim() === ''),
  );
  if (shown.length === 0) return null;
  const lineClass = tone === 'muted' ? 'tl-event-modal-subtitle' : 'tl-group-modal-desc';
  return (
    <ul style={LIST_STYLE} data-testid={testId} data-tone={tone}>
      {shown.map((line, i) => (
        <li key={i} className={lineClass} style={FRAME_TEXT_WRAP}>
          {line}
        </li>
      ))}
    </ul>
  );
}

/**
 * 줄 사이 4(`--spacing-xs`) — 한 안내의 문장끼리라 디자이너 설명 줄 하나의 줄 간격(20)에 가깝게 붙인다.
 * 디자이너가 여러 줄 안내를 따로 그린 화면이 없어 개발이 정했다(design-review).
 */
const LIST_STYLE = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--spacing-xs)',
  minWidth: 0,
};
