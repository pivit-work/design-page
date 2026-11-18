import { Fragment } from 'react';
import { CloseGlyph, EyeGlyph } from '../shared/lineIcons.jsx';

/**
 * 구성원 «휴가» 화면의 패널 · 창 · 달력 머리 조각 (pivit-work PW-2983 ⑥ · 시안 worklog/member-leave-designer-2026-11-18).
 *
 * 디자이너 휴가 화면 원본이 없어 개발이 만든 틀이다(design-review). 모양은 leave.css «휴가 현황 창 · 구성원 휴가» 절이 갖고,
 * 값은 디자이너 부품에서 왔다 — 닫기(✕) = 타임라인 회의 창 `.tl-meeting-modal-close`(stesslee) · «누가 보이나» = 원온원
 * «보는 범위» `.ono-filter-notice`(stesslee) · 흰 카드 = 리소스 «팀 현황» 사람 카드 값. 글은 받은 그대로 그리고 줄만 나눈다.
 * 부르는 화면은 `styles/leave.css` · `styles/timeline.css`(닫기) · `styles/one-on-one.css`(범위 줄)를 불러야 한다.
 */

/** 오른쪽 패널 닫기(✕) — 패널(.pw-side-panel) 오른쪽 위 정사각 회색 버튼. */
export function LeavePanelClose({ label, onClose, testId }) {
  return (
    <button type="button" className="tl-meeting-modal-close" aria-label={label} title={label} onClick={onClose} data-testid={testId}>
      <CloseGlyph size={20} aria-hidden="true" />
    </button>
  );
}

/** 패널 머리 — 제목 18/700 + 아래 딱지 줄(없으면 안 그림). */
export function LeavePanelHead({ title, titleId, badges }) {
  return (
    <div className="lv-pnl-head">
      <h2 className="lv-pnl-title" id={titleId}>
        {title}
      </h2>
      {badges && <div className="lv-pnl-badges">{badges}</div>}
    </div>
  );
}

/**
 * 두 단 줄 — 칸 이름 옅게 · 값 진하게. `boxed` 면 테두리 칸 하나 안(통보 내용 창).
 * @param {{ rows: Array<{ key?: string, label: import('react').ReactNode, value: import('react').ReactNode, testId?: string }>, boxed?: boolean, testId?: string }} props
 */
export function LeaveKeyValues({ rows, boxed = false, testId }) {
  return (
    <dl className={boxed ? 'lv-kv is-box' : 'lv-kv'} data-testid={testId}>
      {rows.map((r, i) => (
        <Fragment key={r.key ?? i}>
          <dt className="lv-kv-k">{r.label}</dt>
          <dd className="lv-kv-v" data-testid={r.testId}>
            {r.value}
          </dd>
        </Fragment>
      ))}
    </dl>
  );
}

/** 패널 안 묶음 — 가는 선 아래 14/700 머리 + 줄들. `lines` 는 14 보통 글 한 줄씩. */
export function LeavePanelSection({ title, testId, children }) {
  return (
    <section className="lv-pnl-sec" data-testid={testId}>
      <h3 className="lv-pnl-sec-t">{title}</h3>
      {children}
    </section>
  );
}

/** 묶음 안 글 한 줄(14 보통 글). */
export function LeavePanelLine({ testId, children }) {
  return (
    <div className="lv-pnl-line" data-testid={testId}>
      {children}
    </div>
  );
}

/** 반려 의견 — 옅은 이름 + 옅은 빨강 칸(기획서 RequestDetail «반려 의견» errBg). */
export function LeaveRejectNote({ label, testId, children }) {
  return (
    <div data-testid={testId}>
      <span className="lv-kv-k">{label}</span>
      <div className="lv-pnl-reject">{children}</div>
    </div>
  );
}

/**
 * 문장 여럿을 마침표 뒤에서 줄만 나눠 그린다 — 글은 받은 그대로(구성원 상세 `DetailNoteLines` 와 같은 규칙).
 * 줄 끝 빈칸은 글자로 남겨 읽기 프로그램 · 복사에서 문장이 붙지 않게 한다.
 * tone: 'note' = 패널 아래 12px 안내(둘째 줄부터 더 옅게) · 'body' = 창 본문 14px 보통 글.
 */
export function LeaveNoteLines({ text, tone = 'note', testId }) {
  const lines = String(text ?? '')
    .split(/(?<=\.)\s+/)
    .filter(Boolean);
  return (
    <div className={tone === 'body' ? 'lv-nv-body' : 'lv-pnl-note'} data-testid={testId}>
      {lines.map((line, i) => (
        <span key={i} className={tone === 'note' && i > 0 ? 'lv-soft' : undefined}>
          {line}
          {i < lines.length - 1 ? ' ' : ''}
        </span>
      ))}
    </div>
  );
}

/** 창 아래 줄 — 오른쪽 끝에 버튼 하나(통보 내용 창 [닫기]). */
export function LeaveModalFootEnd({ children }) {
  return <div className="lv-nv-foot">{children}</div>;
}

/**
 * 계획 한 사람 = 흰 카드 하나 — 이름 + 오른쪽 확인 상태 · «계획일» 아래 날짜 딱지(부르는 쪽이 딱지를 그려 넘긴다) · 맨 아래 제출 줄 + 버튼.
 * @param {{ name: string, status: import('react').ReactNode, datesLabel: string, dates: import('react').ReactNode, foot: string[], action?: import('react').ReactNode, testId?: string, datesTestId?: string }} props
 */
export function LeavePlanCard({ name, status, datesLabel, dates, foot, action, testId, datesTestId }) {
  return (
    <div className="lv-plan" data-testid={testId}>
      <div className="lv-plan-head">
        <span className="lv-plan-name">{name}</span>
        {status}
      </div>
      <div className="lv-plan-sub">
        <span className="lv-plan-k">{datesLabel}</span>
        <div className="lv-plan-dates" data-testid={datesTestId}>
          {dates}
        </div>
      </div>
      <div className="lv-plan-foot">
        {foot.map((f) => (
          <span key={f}>{f}</span>
        ))}
        {action}
      </div>
    </div>
  );
}

/** 계획 카드 묶음 — 14/700 묶음 이름 + 카드 사이 8. */
export function LeavePlanGroup({ title, testId, children }) {
  return (
    <div className="lv-plan-group" data-testid={testId}>
      <h3 className="lv-pnl-sec-t">{title}</h3>
      <div className="lv-plans">{children}</div>
    </div>
  );
}

/** 머리 오른쪽 버튼 묶음 — 제목 탭 줄 오른쪽 끝(기획서 MemberLeavePage 머리 오른쪽 묶음). */
export function LeaveHeadActions({ testId, children }) {
  return (
    <div className="lv-head-actions" data-testid={testId}>
      {children}
    </div>
  );
}

/** «누가 보이나» 한 줄 — 눈 아이콘 + 12px 초록 글, 바탕 없음(원온원 «보는 범위» .ono-filter-notice). */
export function LeaveScopeNotice({ testId, children }) {
  return (
    <span className="ono-filter-notice" data-testid={testId}>
      <EyeGlyph size={16} aria-hidden="true" />
      {children}
    </span>
  );
}

/**
 * 달력 안내 줄 — 범위 문장 13 · 끝의 범례(«점선 = 결재 중»)는 떼어 점선 칸 보기와 함께 · 빈 달 안내는 같은 줄 오른쪽.
 * 이은 글은 받은 안내 그대로다(`guide` 가 `legend` 로 끝날 때만 뗀다).
 */
export function LeaveCalendarGuide({ guide, legend, empty, testId, legendTestId, emptyTestId }) {
  const split = !!guide && !!legend && guide.endsWith(legend);
  const head = split ? guide.slice(0, guide.length - legend.length) : guide;
  return (
    <div className="lv-cal-guide">
      {guide && (
        <span className="lv-cal-guide" data-testid={testId}>
          <span className="lv-cal-guide-t">{head}</span>
          {split && (
            <span className="lv-cal-legend" data-testid={legendTestId}>
              <span className="lv-cal-legend-chip" aria-hidden="true" />
              {legend}
            </span>
          )}
        </span>
      )}
      {empty && (
        <span className="lv-cal-empty" data-testid={emptyTestId}>
          {empty}
        </span>
      )}
    </div>
  );
}

/** 목록 표 이름 칸 — 이름 14/600 + 아래 12 소속(조직도 명단 두 줄). */
export function LeaveWho({ name, sub }) {
  return (
    <span className="lv-who2">
      <span className="lv-who2-name">{name}</span>
      {sub && <span className="lv-who2-sub">{sub}</span>}
    </span>
  );
}
