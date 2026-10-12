/**
 * 글씨와 칸 공용 부품 — 디자이너가 그린 모양을 값 그대로 꺼냈다 (2026-10-12).
 * 맨 아래 HintText·KeyHint 는 디자이너 원본이 아니라 pivit-work 화면 값을 옮긴 것이다 — 디자이너 검수 필요.
 *
 * 화면마다 같은 모양을 맨 `<p>`·`<span>` 이나 직접 스타일로 다시 그리지 않게 둔다.
 * 스타일은 `shared-text.css`(index.css 가 끌어온다). 원래 클래스는 각 부품 설명에 적었다.
 *
 *   <SectionTitle>요약</SectionTitle>
 *   <MetaLabel>회의</MetaLabel>
 *   <NoteText>참고한 자료: 녹음 · 메모</NoteText>
 *   <ReadonlyBox>{summary}</ReadonlyBox>
 *   <NoticeCard>…</NoticeCard>
 *
 * 모두 `as`(태그)·`className`·나머지 속성(`data-testid`, `id`, `aria-*` …)을 그대로 넘긴다.
 * 여백은 놓이는 자리가 정한다 — 부품은 margin 0 이다.
 */

function renderText(baseClass, defaultTag, { as: Tag = defaultTag, className = '', children, ...rest }) {
  const classes = [baseClass, className].filter(Boolean).join(' ');
  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  );
}

/** 섹션 제목 — 18/28 굵게 본문색 (`.mtg-progress-section-label`). 입력칸 제목이면 `as="label"` + `htmlFor`. */
export function SectionTitle(props) {
  return renderText('dp-section-title', 'h3', props);
}

/** 이름표 — 14/20 600 흐린 글씨 (`.mtg-record-meta-label`). */
export function MetaLabel(props) {
  return renderText('dp-meta-label', 'span', props);
}

/** 작은 보조 글씨 — 12/18 흐린 글씨, 긴 낱말도 줄바꿈 (`.mtg-record-summary-note`). */
export function NoteText(props) {
  return renderText('dp-note-text', 'p', props);
}

/** 회색 칸 — 읽기 전용 글 칸, 줄바꿈 보존 (`.tl-snippet-textarea` + `.mtg-record-readonly`). */
export function ReadonlyBox(props) {
  return renderText('dp-readonly-box', 'div', props);
}

/** 연두 안내 카드 — 바탕·모서리·여백·줄 사이 (`.mtg-progress-rec-card`). 안의 글씨는 위 부품으로 채운다. */
export function NoticeCard(props) {
  return renderText('dp-notice-card', 'div', props);
}

/** 창 본문 설명 글씨 — 14/20 600 2단계 글씨 (`.tl-group-modal-desc`, ModalShell 머리 설명과 같은 모양). 기본 `p`. */
export function ModalDescription(props) {
  return renderText('dp-modal-description', 'p', props);
}

// ── 화면에 있던 모양을 옮긴 부품 — 디자이너 검수 필요 (2026-10-12) ──

/** 안내 문장 한 줄 — 14/20 2단계 글씨 (pivit-work `.login-notice p` 에서 옮김). 기본 `p`. */
export function HintText(props) {
  return renderText('dp-hint-text', 'p', props);
}

/**
 * 키 안내 한 칸 — 키 표시 + 글 (pivit-work 명령 팔레트 아래 줄에서 옮김).
 *
 *   <KeyHint keys="ESC">닫기</KeyHint>
 */
export function KeyHint({ keys, className = '', children, ...rest }) {
  const classes = ['dp-key-hint', className].filter(Boolean).join(' ');
  return (
    <span className={classes} {...rest}>
      <kbd className="dp-key-hint__key">{keys}</kbd> {children}
    </span>
  );
}
