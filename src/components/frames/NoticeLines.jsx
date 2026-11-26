import { FRAME_TEXT_WRAP } from './frameValues.js';

/**
 * 안내 줄 틀 (PW-2994 ③ · PW-3139 에서 design-page 로 옮김) — 안내 문장을 여러 개 받아 한 줄에 한 문장씩 그린다.
 * 스타일시트: modal-shell.css · timeline.css(쓰는 쪽이 불러온다).
 *
 * 문장을 « — »·마침표로 한 문단에 잇지 않는다 — 부르는 쪽이 문장 목록을 넘기면 틀이 줄로 나눈다.
 * 위계는 둘뿐이다 — 디자이너(stesslee) 창 머리 설명 줄에서 꺼냈다:
 *   - 기본 `.tl-group-modal-desc` 14/20 · 600 · `--text-secondary`(«그룹 추가» 창 설명)
 *   - 흐림 `.tl-event-modal-subtitle` 14/20 · 500(일정 창 부제) — 색만 `--text-secondary`(`.dp-frame-notice-muted`).
 *     이 틀이 그리는 줄은 페이지 설명 · 칸 설명 · 창 아래 안내처럼 늘 꼭 읽을 글이라, 디자이너가 날짜 같은 덧붙임에 쓰는
 *     흐린 회색(--text-tertiary · 흰 바탕 대비 약 2:1)이 아니라 설명 글 색을 쓴다(2026-11-26). 기본과는 굵기(600 · 500)로 갈린다.
 * 바탕 · 테두리 · 점 목록은 없다. 긴 문장은 낱말 단위로 줄을 바꾸고 한 글자씩 꺾지 않는다.
 * 모양을 덮어쓰는 길(className · style)은 두지 않는다.
 *
 * @param {object} props
 * @param {import('react').ReactNode[]} props.lines 한 줄에 한 문장 — 빈 값(false · null · 0 · 공백뿐인 글)은 건너뛴다
 *   — `count && '…'` 처럼 넘겨도 «0» 줄이 안 생긴다
 * @param {'default' | 'muted'} [props.tone]
 * @param {boolean} [props.divided] 줄 사이에 가는 선 — 경고처럼 따로 읽어야 하는 문장이 여러 줄 쌓일 때만 켠다(PW-3111).
 *   선은 디자이너 OKR 히스토리 판의 분기 사이 선(`.okr-h-quarter + .okr-h-quarter` 1px `--border-secondary`)과 같고,
 *   선 위 · 아래는 8(`--spacing-md`). 첫 줄 위 · 끝 줄 아래에는 선이 없어 바깥 간격은 끈 때와 같다. 끄면(기본) 종전 모양 그대로.
 * @param {string} [props.testId]
 */
export function NoticeLines({ lines, tone = 'default', divided = false, testId }) {
  const shown = lines.filter(
    (line) =>
      line !== null && line !== undefined && line !== false && line !== 0 && !(typeof line === 'string' && line.trim() === ''),
  );
  if (shown.length === 0) return null;
  const lineClass = tone === 'muted' ? 'tl-event-modal-subtitle dp-frame-notice-muted' : 'tl-group-modal-desc';
  return (
    <ul style={divided ? DIVIDED_LIST_STYLE : LIST_STYLE} data-testid={testId} data-tone={tone} data-divided={divided || undefined}>
      {shown.map((line, i) => (
        <li key={i} className={divided ? `${lineClass} dp-frame-notice-divided` : lineClass} style={FRAME_TEXT_WRAP}>
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

/** 줄 사이 선을 켜면 간격은 선 위 · 아래 여백(frames.css `.dp-frame-notice-divided`)이 맡는다. */
const DIVIDED_LIST_STYLE = { ...LIST_STYLE, gap: 0 };
