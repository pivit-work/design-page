import { FRAME_NO_SHRINK, FRAME_ONE_LINE } from './frameValues.js';
import { NoticeLines } from './NoticeLines.jsx';

/**
 * 페이지 머리 틀 (PW-3139) — 화면 맨 위 제목 · 설명 · 오른쪽 버튼 자리. 왼쪽 정렬로 시작한다. 스타일시트: okr.css · timeline.css.
 *
 * 값:
 *   - 제목 24/32 굵게 `--fg-primary` — 디자이너 흰 판 제목(`.okr-h-label`). 카드 본문이 정한 크기(24/32)와 같은 디자이너 클래스.
 *     디자이너 페이지 제목(`.tab-nav` · `.manager-tabs` 30/38)은 탭을 겸한 제목이라 쓰지 않았다(design-review).
 *   - 설명 14/20 — 안내 줄 틀의 «흐림»(`NoticeLines tone="muted"` = 디자이너 일정 창 부제 `.tl-event-modal-subtitle` 의 크기 · 굵기에 설명 글 색 `--text-secondary`).
 *     문장마다 한 줄. 제목 ↔ 설명 4(`--spacing-xs` — 안내 줄 사이와 같게).
 *   - 제목 ↔ 버튼 12(`--spacing-lg`) · 버튼끼리 8 — 디자이너 페이지 머리에 버튼이 없어 개발이 정했다(design-review).
 * 제목은 짧은 글이라 한 줄 · 넘치면 «…». 버튼 자리는 줄어들지 않고, 모자라면 다음 줄로 내린다.
 * 모양을 덮어쓰는 길(className · style)은 두지 않는다.
 *
 * @param {object} props
 * @param {string} props.title
 * @param {import('react').ReactNode[]} [props.description] 설명 문장 — 한 줄에 한 문장
 * @param {import('react').ReactNode} [props.titleAside] 제목 바로 옆 작은 것(도움말 단추 하나) — 제목과 사이 8 · 줄어들지 않는다
 * @param {import('react').ReactNode} [props.actions] 오른쪽 버튼 자리
 * @param {string} [props.testId]
 */
export function PageHead({ title, titleAside, description, actions, testId }) {
  const heading = (
    <h1 className="okr-h-label" style={TITLE_STYLE} title={title}>
      {title}
    </h1>
  );
  return (
    <header style={HEAD_STYLE} data-testid={testId}>
      <div style={TEXT_STYLE}>
        {titleAside ? (
          <div style={TITLE_ROW_STYLE}>
            {heading}
            <span style={TITLE_ASIDE_STYLE}>{titleAside}</span>
          </div>
        ) : (
          heading
        )}
        {description && <NoticeLines lines={description} tone="muted" />}
      </div>
      {actions && <div style={ACTIONS_STYLE}>{actions}</div>}
    </header>
  );
}

const HEAD_STYLE = {
  display: 'flex',
  alignItems: 'flex-start',
  flexWrap: 'wrap',
  gap: 'var(--spacing-lg)',
  minWidth: 0,
};
/** 글 쪽 — 남는 폭을 다 받고, 버튼에 밀리면 줄어든다(넘치지 않음). 제목 ↔ 설명 4. */
const TEXT_STYLE = {
  flex: '1 1 320px',
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--spacing-xs)',
};
/** `.okr-h-label` 은 원래 머리 줄 안 글이라 바깥 여백이 없다 — h1 기본 여백을 지운다. */
const TITLE_STYLE = { ...FRAME_ONE_LINE, margin: 0 };
/**
 * 제목 + 옆 도움말 — 사이 8(`--spacing-md`) · 세로 가운데. 권한 기준정보(PW-3121) 제목 옆 도움말 단추 자리와 같은 값.
 * 제목이 길면 제목만 «…»로 줄고 도움말은 제목 바로 옆에 남는다.
 */
const TITLE_ROW_STYLE = { display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', minWidth: 0 };
/** 옆 것의 높이를 그대로 — 글 줄 높이(32)로 늘지 않게 flex 로 감싼다. */
const TITLE_ASIDE_STYLE = { display: 'flex', flex: 'none' };
const ACTIONS_STYLE = {
  ...FRAME_NO_SHRINK,
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 'var(--spacing-md)',
  maxWidth: '100%',
};
