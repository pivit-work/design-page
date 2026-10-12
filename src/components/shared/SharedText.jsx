/**
 * 글씨와 칸 공용 부품 다섯 — 디자이너가 회의 화면에 그린 모양을 값 그대로 꺼냈다 (2026-10-12).
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

function make(baseClass, defaultTag, displayName) {
  function SharedText({ as: Tag = defaultTag, className = '', children, ...rest }) {
    const classes = [baseClass, className].filter(Boolean).join(' ');
    return (
      <Tag className={classes} {...rest}>
        {children}
      </Tag>
    );
  }
  SharedText.displayName = displayName;
  return SharedText;
}

/** 섹션 제목 — 18/28 굵게 본문색 (`.mtg-progress-section-label`). 입력칸 제목이면 `as="label"` + `htmlFor`. */
export const SectionTitle = make('dp-section-title', 'h3', 'SectionTitle');

/** 이름표 — 14/20 600 흐린 글씨 (`.mtg-record-meta-label`). */
export const MetaLabel = make('dp-meta-label', 'span', 'MetaLabel');

/** 작은 보조 글씨 — 12/18 흐린 글씨, 긴 낱말도 줄바꿈 (`.mtg-record-summary-note`). */
export const NoteText = make('dp-note-text', 'p', 'NoteText');

/** 회색 칸 — 읽기 전용 글 칸, 줄바꿈 보존 (`.tl-snippet-textarea` + `.mtg-record-readonly`). */
export const ReadonlyBox = make('dp-readonly-box', 'div', 'ReadonlyBox');

/** 연두 안내 카드 — 바탕·모서리·여백·줄 사이 (`.mtg-progress-rec-card`). 안의 글씨는 위 부품으로 채운다. */
export const NoticeCard = make('dp-notice-card', 'div', 'NoticeCard');
