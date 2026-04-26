import { useRef, useState } from 'react';
import Icon from '../shared/Icon.jsx';
import DatePickerPopover from '../timeline/DatePickerPopover.jsx';
import ActionPersonPopover from './ActionPersonPopover.jsx';

/**
 * MeetingRecordContent — 회의 종료 후 "생성된 회의록" 본문.
 * MeetingInProgressModal 이 phase='record' 일 때 frame 내부에 렌더.
 *
 * Figma node-id=16708-33213.
 *
 * 모든 데이터/라벨은 caller 가 주입한다. 패키지 내부에는 fallback 이 없다.
 */

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
  // 외부 주입 데이터 (모두 caller 필수)
  title,
  summary,
  dateTimeLabel,
  attendeeLabel,
  discussions,
  decisions,
  actionItems,
  memberPool,
  labels,
  onActionItemsChange,
  // caller 가 메타 섹션 바로 아래(요약 위)에 끼워넣을 수 있는 임의 노드.
  // 녹음 플레이어, 외부 위젯 등. 패키지는 도메인을 알지 않는다.
  headerExtra,
}) {
  // controlled/uncontrolled 패턴: prop 이 주어지면 prop 이 원천, 아니면 내부 state.
  const [internalActions, setInternalActions] = useState([]);
  const actions = actionItems ?? internalActions;
  // { idx, field: 'person' | 'date', rect, el } | null
  const [openPicker, setOpenPicker] = useState(null);
  // 갓 추가된 항목의 인덱스 — title input 의 ref callback 이 마운트 시 한 번
  // focus 한 뒤 null 로 비우는 imperative 핸들. (state 로 두면 effect 안에서
  // setState → cascading re-render lint 룰에 걸린다.)
  const justAddedIdxRef = useRef(null);

  const updateActions = (next) => {
    if (actionItems === undefined) setInternalActions(next);
    onActionItemsChange?.(next);
  };
  const updateAction = (idx, patch) => {
    updateActions(actions.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  };

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

  return (
    <>
      <div className="mtg-record-header-block">
        <h2 id="mtg-progress-title" className="mtg-progress-title">{labels.title}</h2>
        <div className="mtg-record-ai-banner">
          <Icon
            src="/icons-solid/ai-chat-01.svg"
            size={14}
            color="#ad00fe"
            baseUrl={baseUrl}
          />
          <span className="mtg-record-ai-banner-text">{labels.aiBanner}</span>
        </div>
      </div>

      {/* 메타 3컬럼: 회의 / 일시 / 참석 */}
      <div className="mtg-record-meta">
        <div className="mtg-record-meta-col mtg-record-meta-col-grow">
          <span className="mtg-record-meta-label">{labels.metaMeeting}</span>
          <span className="mtg-record-meta-value">{title}</span>
        </div>
        <div className="mtg-record-meta-col">
          <span className="mtg-record-meta-label">{labels.metaDateTime}</span>
          <span className="mtg-record-meta-value">{dateTimeLabel}</span>
        </div>
        <div className="mtg-record-meta-col">
          <span className="mtg-record-meta-label">{labels.metaAttendees}</span>
          <span className="mtg-record-meta-value">{attendeeLabel}</span>
        </div>
      </div>

      {headerExtra}

      {/* 요약 */}
      <section className="mtg-progress-section mtg-record-section">
        <span className="mtg-progress-section-label">{labels.summary}</span>
        <div className="tl-snippet-textarea mtg-record-readonly">{summary}</div>
      </section>

      {/* 주요논의 — accordion */}
      <section className="mtg-progress-section mtg-record-section">
        <span className="mtg-progress-section-label">{labels.discussions}</span>
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
        <span className="mtg-progress-section-label">{labels.decisions}</span>
        <div className="tl-snippet-textarea mtg-record-readonly">
          <ul className="mtg-record-bullet-list">
            {decisions.map((d, i) => (<li key={`${d}-${i}`}>{d}</li>))}
          </ul>
        </div>
      </section>

      {/* 액션 아이템 */}
      <section className="mtg-progress-section mtg-record-section">
        <span className="mtg-progress-section-label">{labels.actionItems}</span>
        <ul className="mtg-record-action-list">
          {actions.map((a, idx) => (
            <li key={idx} className="mtg-record-action-item">
              <input
                type="text"
                className="mtg-record-action-title"
                value={a.title}
                placeholder={labels.actionItemTitlePlaceholder ?? labels.newActionItemTitle ?? ''}
                onChange={(e) => updateAction(idx, { title: e.target.value })}
                ref={(el) => {
                  if (el && justAddedIdxRef.current === idx) {
                    justAddedIdxRef.current = null;
                    el.focus();
                  }
                }}
              />
              <button
                type="button"
                className={`mtg-record-action-person${a.person ? '' : ' is-empty'}`}
                onClick={(e) => setOpenPicker({
                  idx,
                  field: 'person',
                  rect: e.currentTarget.getBoundingClientRect(),
                })}
              >
                {a.person ? (
                  <>
                    <span className="mtg-record-action-avatar">{a.person.charAt(0)}</span>
                    <span className="mtg-record-action-name">{a.person}</span>
                  </>
                ) : (
                  <span className="mtg-record-action-name mtg-record-action-name--placeholder">
                    {labels.actionItemPersonPlaceholder ?? '담당자'}
                  </span>
                )}
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
                aria-label={labels.removeLabel}
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
                // 신규 항목은 빈 title + 담당자 미설정 으로 시작 — 하드코딩
                // placeholder 가 그대로 저장돼 모든 신규가 "새 액션 아이템" 으로
                // 보이는 회귀를 방지. ref 콜백이 마운트 시 한 번 focus 한다.
                const newIdx = actions.length;
                justAddedIdxRef.current = newIdx;
                updateActions([
                  ...actions,
                  {
                    title: '',
                    person: '',
                    date: formatMMDD(new Date()),
                  },
                ]);
              }}
            >
              <Icon src="/icons/plus.svg" size={20} color="var(--text-secondary)" baseUrl={baseUrl} />
              <span>{labels.addActionItem}</span>
            </button>
          </li>
        </ul>
      </section>

      {openPicker?.field === 'person' && (
        <ActionPersonPopover
          anchorRect={openPicker.rect}
          members={memberPool}
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
          selectedDate={parseMMDD(actions[openPicker.idx]?.date ?? formatMMDD(new Date()))}
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
