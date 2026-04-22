import { useState } from 'react';
import Icon from '../shared/Icon.jsx';
import DatePickerPopover from '../timeline/DatePickerPopover.jsx';
import ActionPersonPopover from './ActionPersonPopover.jsx';

/**
 * MeetingRecordContent — 회의 종료 후 "생성된 회의록" 본문.
 * MeetingInProgressModal 이 phase='record' 일 때 frame 내부에 렌더.
 *
 * Figma node-id=16708-33213.
 *
 * props 가 없으면 Figma 시안 그대로 demo 데이터를 사용 (backward compat).
 */

const DEFAULT_MEMBER_POOL = [
  { name: 'SH' },
  { name: 'David' },
  { name: 'Juliet' },
  { name: 'Kurt' },
  { name: 'Ernest' },
];

const DEFAULT_DISCUSSIONS = [
  {
    title: 'Daily Snippet AI 기능 완료 검토',
    body:
      'AI 요약에는 버튼 manual trigger 방식 구현 완료. 자동 트리거 방식은 의도적으로 배제한 제품 철학 결정.\n\n• 현재 QA 미진행, 이번 주 내 완료 목표.\n• Claude API 오류 시 버튼 비활성화 + 메시지 UX 필요 (이재영).',
  },
  {
    title: '1on1 준비화면 QA 일정 확정',
    body:
      '이번 주 금요일까지 QA 1차 완료, 주말 회귀 테스트 후 월요일 스테이징 배포로 합의.\n\n• SH 담당, 이슈는 Linear 티켓으로 즉시 기록.\n• QA 체크리스트는 Notion 에 공유.',
  },
  {
    title: 'Eve 온보딩 및 UI 리뷰 계획',
    body:
      'Eve 첫 주 온보딩 일정 확정 — 4/10 전체 제품 데모, 4/11 코드베이스 투어, 4/12 첫 UI 리뷰 세션.\n\n• Kurt 가 멘토로 스케줄 조율.\n• 리뷰 세션은 녹화해서 이후 팀 공유.',
  },
  {
    title: 'Discord QA 채널 운영 방식',
    body:
      'QA 전용 Discord 채널 생성 후 아래 규칙으로 운영:\n\n• 버그 리포트는 스레드로 묶어 제보자·재현 단계·스크린샷 필수.\n• 데일리 리마인더 봇으로 미해결 이슈 하이라이트.\n• 채널 owner: Kurt, 백업: David.',
  },
];

const DEFAULT_DECISIONS = [
  '4월 30일 Phase 1 런치 일정 유지 확정',
  'Discord QA 채널 이번 주 내 생성 (Kurt 담당)',
];

const DEFAULT_ACTION_ITEMS = [
  { title: '1on1 준비화면 QA 완료', person: 'SH', date: '04/09' },
  { title: 'Discord QA 채널 생성', person: 'David', date: '04/09' },
  { title: 'Jon 첫 UI 리뷰 일정 조율', person: 'Kurt', date: '04/09' },
];

const DEFAULT_LABELS = {
  title: '생성된 회의록',
  aiBanner: 'AI 회의록이 생성되었습니다. 검토 후 공유해 주세요.',
  metaMeeting: '회의',
  metaDateTime: '일시',
  metaAttendees: '참석',
  summary: '요약',
  discussions: '주요논의',
  decisions: '결정 사항',
  actionItems: '액션 아이템',
  addActionItem: '액션 아이템 추가',
  newActionItemTitle: '새 액션 아이템',
  removeLabel: '제거',
};

const DEFAULT_SUMMARY =
  'Daily Snippet AI 기능 완료 확인. 1on1 준비화면 QA 이번 주 목표. 4월 30일 Phase 1 런치 일정 재확인. Jon 온보딩 완료.';

// 'MM/DD' → Date 로 변환 (이번 해 기준).
function parseMMDD(s) {
  const now = new Date();
  const [m, d] = s.split('/').map(Number);
  return new Date(now.getFullYear(), (m || 1) - 1, d || 1);
}
function formatMMDD(date) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${m}/${d}`;
}

export default function MeetingRecordContent({
  meeting,
  baseUrl = '',
  // 외부 주입 데이터
  title: titleProp,
  summary: summaryProp,
  dateTimeLabel,
  attendeeLabel,
  discussions: discussionsProp,
  decisions: decisionsProp,
  actionItems: actionItemsProp,
  memberPool,
  labels = {},
  onActionItemsChange,
}) {
  const mergedLabels = { ...DEFAULT_LABELS, ...labels };
  const discussions = discussionsProp ?? DEFAULT_DISCUSSIONS;
  const decisions = decisionsProp ?? DEFAULT_DECISIONS;
  const resolvedMemberPool = memberPool ?? DEFAULT_MEMBER_POOL;
  const resolvedTitle = titleProp ?? meeting?.title ?? '스프린트 리뷰';
  const resolvedSummary = summaryProp ?? DEFAULT_SUMMARY;
  const resolvedDateTime = dateTimeLabel ?? '2026.04.07 · 10:00–11:03';
  const resolvedAttendeeLabel = attendeeLabel ?? '5명';

  // 여러 항목 동시 펼침 허용 — Set 기반.
  const [expanded, setExpanded] = useState(() => new Set([0]));
  const toggleExpanded = (i) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };
  // controlled/uncontrolled 패턴: prop 이 주어지면 prop 이 원천, 아니면 내부 state.
  const [internalActions, setInternalActions] = useState(DEFAULT_ACTION_ITEMS);
  const actions = actionItemsProp ?? internalActions;
  // { idx, field: 'person' | 'date', rect, el } | null
  const [openPicker, setOpenPicker] = useState(null);

  const updateActions = (next) => {
    if (actionItemsProp === undefined) setInternalActions(next);
    onActionItemsChange?.(next);
  };
  const updateAction = (idx, patch) => {
    updateActions(actions.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  };

  return (
    <>
      <div className="mtg-record-header-block">
        <h2 id="mtg-progress-title" className="mtg-progress-title">{mergedLabels.title}</h2>
        <div className="mtg-record-ai-banner">
          <Icon
            src="/icons-solid/ai-chat-01.svg"
            size={14}
            color="#ad00fe"
            baseUrl={baseUrl}
          />
          <span className="mtg-record-ai-banner-text">
            {mergedLabels.aiBanner}
          </span>
        </div>
      </div>

      {/* 메타 3컬럼: 회의 / 일시 / 참석 */}
      <div className="mtg-record-meta">
        <div className="mtg-record-meta-col mtg-record-meta-col-grow">
          <span className="mtg-record-meta-label">{mergedLabels.metaMeeting}</span>
          <span className="mtg-record-meta-value">{resolvedTitle}</span>
        </div>
        <div className="mtg-record-meta-col">
          <span className="mtg-record-meta-label">{mergedLabels.metaDateTime}</span>
          <span className="mtg-record-meta-value">{resolvedDateTime}</span>
        </div>
        <div className="mtg-record-meta-col">
          <span className="mtg-record-meta-label">{mergedLabels.metaAttendees}</span>
          <span className="mtg-record-meta-value">{resolvedAttendeeLabel}</span>
        </div>
      </div>

      {/* 요약 */}
      <section className="mtg-progress-section mtg-record-section">
        <span className="mtg-progress-section-label">{mergedLabels.summary}</span>
        <div className="tl-snippet-textarea mtg-record-readonly">
          {resolvedSummary}
        </div>
      </section>

      {/* 주요논의 — accordion */}
      <section className="mtg-progress-section mtg-record-section">
        <span className="mtg-progress-section-label">{mergedLabels.discussions}</span>
        <ul className="mtg-record-discussion-list">
          {discussions.map((d, i) => {
            const open = expanded.has(i);
            return (
              <li key={d.title + i} className={`mtg-record-discussion-item ${open ? 'is-open' : ''}`}>
                <button
                  type="button"
                  className="mtg-record-discussion-head"
                  onClick={() => toggleExpanded(i)}
                  aria-expanded={open}
                >
                  <span className="mtg-record-discussion-title">
                    {i + 1}. {d.title}
                  </span>
                  <Icon
                    src="/icons/chevron-down.svg"
                    size={20}
                    color="var(--text-tertiary)"
                    baseUrl={baseUrl}
                    className={open ? 'mtg-record-chevron is-open' : 'mtg-record-chevron'}
                  />
                </button>
                {open && d.body && (
                  <div className="mtg-record-discussion-body">{d.body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* 결정 사항 */}
      <section className="mtg-progress-section mtg-record-section">
        <span className="mtg-progress-section-label">{mergedLabels.decisions}</span>
        <div className="tl-snippet-textarea mtg-record-readonly">
          <ul className="mtg-record-bullet-list">
            {decisions.map((d, i) => (<li key={`${d}-${i}`}>{d}</li>))}
          </ul>
        </div>
      </section>

      {/* 액션 아이템 */}
      <section className="mtg-progress-section mtg-record-section">
        <span className="mtg-progress-section-label">{mergedLabels.actionItems}</span>
        <ul className="mtg-record-action-list">
          {actions.map((a, idx) => (
            <li key={idx} className="mtg-record-action-item">
              <span className="mtg-record-action-title">{a.title}</span>
              <button
                type="button"
                className="mtg-record-action-person"
                onClick={(e) => setOpenPicker({
                  idx,
                  field: 'person',
                  rect: e.currentTarget.getBoundingClientRect(),
                })}
              >
                <span className="mtg-record-action-avatar">{a.person.charAt(0)}</span>
                <span className="mtg-record-action-name">{a.person}</span>
              </button>
              <button
                type="button"
                className="mtg-record-action-date"
                onClick={(e) => setOpenPicker({
                  idx,
                  field: 'date',
                  rect: e.currentTarget.getBoundingClientRect(),
                })}
              >
                {a.date}
              </button>
              <button
                type="button"
                className="mtg-record-action-remove"
                aria-label={mergedLabels.removeLabel}
                onClick={() => updateActions(actions.filter((_, i) => i !== idx))}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M10.5 3.5l-7 7M3.5 3.5l7 7"
                    stroke="var(--text-tertiary)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              className="mtg-record-action-add"
              onClick={() => {
                const defaultPerson = resolvedMemberPool[0]?.name ?? '';
                updateActions([
                  ...actions,
                  {
                    title: mergedLabels.newActionItemTitle,
                    person: defaultPerson,
                    date: formatMMDD(new Date()),
                  },
                ]);
              }}
            >
              <Icon src="/icons/plus.svg" size={20} color="var(--text-secondary)" baseUrl={baseUrl} />
              <span>{mergedLabels.addActionItem}</span>
            </button>
          </li>
        </ul>
      </section>

      {openPicker?.field === 'person' && (
        <ActionPersonPopover
          anchorRect={openPicker.rect}
          members={resolvedMemberPool}
          selected={actions[openPicker.idx]?.person}
          onSelect={(name) => {
            updateAction(openPicker.idx, { person: name });
            setOpenPicker(null);
          }}
          onClose={() => setOpenPicker(null)}
        />
      )}

      {openPicker?.field === 'date' && (
        <DatePickerPopover
          anchorRect={openPicker.rect}
          anchorEl={null}
          selectedDate={parseMMDD(actions[openPicker.idx]?.date ?? '04/09')}
          onSelect={(d) => {
            updateAction(openPicker.idx, { date: formatMMDD(d) });
            setOpenPicker(null);
          }}
          onClose={() => setOpenPicker(null)}
        />
      )}
    </>
  );
}
