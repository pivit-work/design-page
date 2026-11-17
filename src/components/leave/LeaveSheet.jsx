import ChipFold from '../shared/ChipFold.jsx';
import { NoteText, SectionTitle } from '../shared/SharedText.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';

/**
 * «내 휴가» 화면의 흰 카드 한 장 (pivit-work PW-2930 · 기획 시안 leave-app.jsx MyLeaveScreen «한판 UX(단일 카드 + 디바이더)»).
 *
 * 디자이너 휴가 화면 원본이 없어 개발이 만든 틀이다(design-review). 카드 값은 디자이너 카드(테두리 `--border-secondary` ·
 * 바탕 `--bg-quaternary` · 둥근 12 · 안쪽 20/24)를 따른다. 바로 아래 자식끼리는 가는 선으로 나뉜다 — 자식이 묶음 하나다.
 * 그리지 않는 묶음(null)은 선도 남기지 않는다.
 *
 *   <LeaveSheet testId>
 *     <LeaveAnnualCard … />                 ← 연차
 *     <LeaveSheetPart title="다가오는 휴가" aside="2건">…</LeaveSheetPart>
 *   </LeaveSheet>
 */
export default function LeaveSheet({ testId, children }) {
  return (
    <section className="leave-sheet" data-testid={testId}>
      {children}
    </section>
  );
}

/** 카드 안 한 묶음 — 제목(«연차» 제목과 같은 SectionTitle) · 오른쪽 회색 보조 · 아래 내용. */
export function LeaveSheetPart({ title, aside, testId, children }) {
  return (
    <div className="leave-sheet-part" data-testid={testId}>
      {title && (
        <div className="leave-card-head">
          <SectionTitle as="h2">{title}</SectionTitle>
          {aside && <NoteText className="leave-card-aside">{aside}</NoteText>}
        </div>
      )}
      {children}
    </div>
  );
}

/**
 * 이름만 늘어놓는 묶음 — «그 밖에 신청할 수 있는 휴가»(PW-2816 · PW-2930).
 * 머리 한 줄: 제목 · 개수 · 옅은 안내. 아래 회색 딱지(`StatusBadge neutral`)를 공용 칩 줄 접기(`ChipFold`)로
 * 앞 `max` 개(두 줄 안)만 보이고 «더 보기»로 전부 연다.
 */
export function LeaveNameFold({ title, count, note, items = [], max = 8, moreLabel, lessLabel, testId }) {
  return (
    <div className="leave-name-fold" data-testid={testId}>
      <div className="leave-name-fold-head">
        <span className="leave-name-fold-title">{title}</span>
        <span className="leave-name-fold-count">{count}</span>
        {note && <span className="leave-name-fold-note">{note}</span>}
      </div>
      <ChipFold
        className="leave-name-fold-items"
        testId={testId ? `${testId}-items` : undefined}
        items={items}
        getKey={(i) => i.key}
        maxItems={max}
        fallbackCount={max}
        moreLabel={moreLabel}
        lessLabel={lessLabel}
        renderItem={(i) => (
          <StatusBadge key={i.key} tone="neutral" className="evc-status-badge">
            {i.label}
          </StatusBadge>
        )}
      />
    </div>
  );
}
