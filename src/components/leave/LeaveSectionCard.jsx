import { NoteText, SectionTitle } from '../shared/SharedText.jsx';

/**
 * 칸으로 나뉜 휴가 카드 — «내 휴가» 연차 사용 촉진 카드(pivit-work PW-2688 · 카드 첨부 시안).
 *
 * 디자이너 휴가 화면 원본이 없어 개발이 만든 틀이다(design-review). 상자는 같은 화면 «연차» 카드(`.leave-card` —
 * 바탕 · 둥근 모서리 · 회색 테두리)와 같고, 안을 회색 가름선으로 칸을 나누며 맨 아래는 연회색 바닥 띠(왼쪽 안내 · 오른쪽 단추)다.
 * 급하다는 표시는 테두리가 아니라 안의 딱지 · 숫자 색으로만 한다(PW-2547 의 주황 테두리를 걷었다).
 *
 *   <LeaveSectionCard id testId>
 *     <LeaveCardSection>
 *       <LeaveCardHead title badge meta action />
 *       …
 *     </LeaveCardSection>
 *     <LeaveCardSection>
 *       <LeaveSectionHead title aside />
 *       …
 *     </LeaveCardSection>
 *     <LeaveCardFoot note="계획 확인자 …">{단추}</LeaveCardFoot>
 *   </LeaveSectionCard>
 */
export default function LeaveSectionCard({ id, testId, children }) {
  return (
    <section id={id} className="leave-card is-sectioned" data-testid={testId}>
      {children}
    </section>
  );
}

/** 칸 하나 — 안쪽 16 · 줄 사이 12. 칸 사이는 회색 가름선. */
export function LeaveCardSection({ testId, children }) {
  return (
    <div className="leave-card-section" data-testid={testId}>
      {children}
    </div>
  );
}

/** 카드 머리 — 왼쪽 제목 · 딱지 · 회색 정보 줄, 오른쪽 단추. */
export function LeaveCardHead({ title, titleTestId, badge, meta, action, testId }) {
  return (
    <div className="leave-card-head is-top" data-testid={testId}>
      <div className="leave-card-head-main">
        <div className="leave-card-title-row">
          <SectionTitle as="h2" data-testid={titleTestId}>
            {title}
          </SectionTitle>
          {badge}
        </div>
        {meta && <NoteText>{meta}</NoteText>}
      </div>
      {action}
    </div>
  );
}

/** 칸 제목 줄 — 왼쪽 14px 굵은 제목(«날짜 고르기» · «연차 사용 계획»), 오른쪽 보조(고른 양 · 제출 시각 · 딱지). */
export function LeaveSectionHead({ title, aside, testId }) {
  return (
    <div className="leave-section-head" data-testid={testId}>
      <SectionTitle as="h3" className="leave-section-title">
        {title}
      </SectionTitle>
      {aside && <div className="leave-section-aside">{aside}</div>}
    </div>
  );
}

/** 카드 바닥 띠 — 연회색 면 · 위 가름선. 왼쪽 회색 안내, 오른쪽 단추. */
export function LeaveCardFoot({ note, noteTestId, testId, children }) {
  return (
    <div className="leave-card-foot-band" data-testid={testId}>
      <NoteText as="span" className="leave-card-foot-note" data-testid={noteTestId}>
        {note}
      </NoteText>
      {children && <div className="leave-card-foot-actions">{children}</div>}
    </div>
  );
}

/** 칸 안 도구 줄 — 왼쪽 고르기 단추들, 오른쪽 `end`(고른 양). 좁으면 줄을 바꾼다. */
export function LeaveToolbar({ end, testId, children }) {
  return (
    <div className="leave-toolbar" data-testid={testId}>
      <div className="leave-toolbar-start">{children}</div>
      {end && <div className="leave-toolbar-end">{end}</div>}
    </div>
  );
}

/** «3일 / 17일 4시간 골랐습니다» — 앞 값만 굵게. */
export function LeaveCount({ strong, rest, testId }) {
  return (
    <span className="leave-count" data-testid={testId}>
      <strong className="leave-count-strong">{strong}</strong> {rest}
    </span>
  );
}
