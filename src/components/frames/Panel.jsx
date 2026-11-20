import { FRAME_NO_SHRINK, FRAME_ONE_LINE } from './frameValues.js';
import { PanelSection } from './PanelSection.jsx';

/**
 * 흰 판 틀 (PW-2994 ② · PW-3139 에서 design-page 로 옮김) — 회색 화면 바탕 위에 칸 · 표를 올리는 흰 판과 그 머리 줄(제목 · 오른쪽 버튼 자리).
 * 스타일시트: okr.css(쓰는 쪽이 불러온다 — pivit-work 는 frames/index.ts 가 부른다).
 *
 * 값은 디자이너(stesslee) 개인 OKR «히스토리» 흰 카드(okr.css)에서 꺼냈다:
 *   - 판 `.okr-h-list` — 흰 바탕(`--bg-quaternary`) · 모서리 16
 *   - 머리 줄 `.okr-h-head` — 제목 왼쪽 · 버튼 오른쪽 · 사이 16 · 여백 32/28 · 제목 `.okr-h-label` 24/32 굵게
 *   - 본문 `.okr-h-body` — 여백 0/28/28 · 줄 사이 24
 *
 * 판은 바깥 폭을 정하지 않는다 — 놓인 자리(화면 · 나란한 두 칸)의 폭을 따르고, 나란히 놓여도 옆 판에 밀려 넘치지 않게 줄어든다.
 * 머리 줄에서 줄어드는 것은 제목뿐이다(넘치면 «…»). 버튼 자리는 줄어들지 않는다.
 * 모양을 덮어쓰는 길(className · style)은 두지 않는다.
 *
 * @param {object} props
 * @param {string} [props.title] 머리 줄 제목. 제목도 버튼도 없으면 머리 줄을 그리지 않는다
 * @param {string} [props.eyebrow] 제목 위 작은 글(갈래 이름 등). 주면 머리가 두 단이 되고 제목은 18/28 굵게(디자이너 OKR 묶음 이름
 *   `.okr-group-name` — 판과 같은 okr.css 라 따로 불러올 것이 없다) · 위 글은 12/18 `.okr-s-sub` — 한 판 안에서 «무엇을 고쳐 보고 있나»를 말하는 판(PW-3127 AI 프롬프트 편집 판)
 * @param {import('react').ReactNode} [props.actions] 머리 줄 오른쪽 버튼 자리
 * @param {string} [props.testId]
 * @param {import('react').ReactNode} props.children
 */
export function Panel({ title, eyebrow, actions, testId, children }) {
  const hasHead = !!title || !!actions;
  return (
    <section className="okr-h-list" style={PANEL_STYLE} data-testid={testId}>
      {hasHead && (
        <div className="okr-h-head" style={HEAD_STYLE}>
          {title && eyebrow ? (
            <div style={STACK_STYLE}>
              <p className="okr-s-sub" style={EYEBROW_STYLE} title={eyebrow}>
                {eyebrow}
              </p>
              <h2 className="okr-group-name" style={SUB_TITLE_STYLE} title={title}>
                {title}
              </h2>
            </div>
          ) : title ? (
            <h2 className="okr-h-label" style={TITLE_STYLE} title={title}>
              {title}
            </h2>
          ) : (
            <span />
          )}
          {actions && <div style={ACTIONS_STYLE}>{actions}</div>}
        </div>
      )}
      <div className="okr-h-body" style={hasHead ? undefined : BODY_NO_HEAD_STYLE}>
        {children}
      </div>
    </section>
  );
}

/**
 * 나란히 놓인 판이 서로를 밀어 넘치지 않게 — 최소 폭 0.
 * 디자이너 `.okr-h-list` 의 `overflow: hidden` 은 푼다 — 판 본문에 붙여 연 메뉴 · 고르기 목록이 판 경계에서 잘린다
 * (표 «안»에 붙인 메뉴는 표의 스크롤 틀에서 잘린다 — 공용 명단 표가 원래 그렇다. 그런 메뉴는 화면 위에 띄우는 부품을 쓴다)
 * (pivit-work frontend-traps «조상의 overflow 는 z-index 로 못 뚫는다»). 안쪽은 여백 28 이라 모서리 밖으로 나오는 것이 없다.
 */
const PANEL_STYLE = { minWidth: 0, overflow: 'visible' };
/**
 * 디자이너 머리는 접고 펴는 줄이라 손가락 모양이다 — 이 틀의 머리 줄은 누르는 곳이 아니다.
 * 좁은 자리(서랍 420)에서 제목과 버튼이 한 줄에 안 들어가면 버튼 자리를 다음 줄로 내린다 — 버튼을 누르거나 넘치게 두지 않는다.
 * 줄 사이는 디자이너 머리 줄의 제목 ↔ 버튼 간격(16)과 같게.
 */
const HEAD_STYLE = { cursor: 'default', flexWrap: 'wrap', rowGap: 'var(--spacing-xl)' };
/** 제목 — 제 글 폭을 바라고, 한 줄에 다 못 들어가면 혼자 한 줄을 차지한 뒤 «…»로 줄어든다. */
const TITLE_STYLE = { ...FRAME_ONE_LINE, flex: '1 1 auto' };
/** 두 단 머리(eyebrow) — 위 작은 글 · 아래 제목, 둘 다 한 줄에 다 못 들어가면 «…». 사이 2(시안 `.aip-eh .eyebrow`). */
const STACK_STYLE = { display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xxs)', minWidth: 0, flex: '1 1 auto' };
const EYEBROW_STYLE = { ...FRAME_ONE_LINE, margin: 0 };
const SUB_TITLE_STYLE = { ...FRAME_ONE_LINE, margin: 0 };
/**
 * 버튼 사이 8 — 디자이너 조직도 판 툴바 항목 간격(`.org-toolbar-left` · `--spacing-md`).
 * 버튼 하나하나는 줄어들지 않는다. 버튼끼리도 한 줄에 다 못 들어가면 다음 줄로 내린다(판 폭을 넘지 않음).
 */
const ACTIONS_STYLE = {
  ...FRAME_NO_SHRINK,
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 'var(--spacing-md)',
  maxWidth: '100%',
};
/** 머리 줄이 없으면 본문 위도 옆과 같은 28 을 띄운다(`.okr-h-body` 옆 · 아래 여백 28 = 24 + 4 토큰). */
const BODY_NO_HEAD_STYLE = { paddingTop: 'calc(var(--spacing-3xl) + var(--spacing-xs))' };

/** 판 안 구역 — `Panel.Section`(PanelSection.jsx). */
Panel.Section = PanelSection;
