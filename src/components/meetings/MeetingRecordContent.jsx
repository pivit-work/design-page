import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Icon from '../shared/Icon.jsx';
import Tabs from '../shared/Tabs.jsx';
import Tooltip from '../shared/Tooltip.jsx';
import { CheckGlyph, CloseGlyph } from '../shared/lineIcons.jsx';
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

// 액션 아이템 기한. 화면에는 'MM/DD' 만 보이지만 연도를 잃으면 안 된다 — 12월 회의에서
// 다음 해 1월을 고르면 호출부가 연도를 짐작해 붙이다 이미 지난 1월로 저장했다 (PW-1060).
// 그래서 항목은 연도까지 든 `dueDate`('YYYY-MM-DD')를 함께 들고, 달력도 그 연도로 연다.
// `dueDate` 가 없는 옛 항목은 예전처럼 'MM/DD' 를 올해로 읽는다.
function parseISODate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s ?? '');
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}
function parseMMDD(s) {
  const now = new Date();
  const [m, d] = (s ?? '').split('/').map(Number);
  return new Date(now.getFullYear(), (m || 1) - 1, d || 1);
}
function formatMMDD(date) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${m}/${d}`;
}
function formatISODate(date) {
  return `${date.getFullYear()}-${formatMMDD(date).replace('/', '-')}`;
}
function dueDateOf(item) {
  return parseISODate(item?.dueDate) ?? (item?.date ? parseMMDD(item.date) : new Date());
}

/**
 * 섹션이 비었을 때 제목 아래 한 줄 (pivit-work PW-1511 · 회의록 검토 정책서 §4.3·§8).
 * 이 창의 읽기 전용 회색 칸(`.mtg-record-readonly`)에 빈 입력칸 안내 글씨 색(`.tl-snippet-textarea::placeholder`)을 쓴다.
 * 문구를 안 주면 종전처럼 아무것도 그리지 않는다.
 */
function EmptyBox({ children }) {
  return (
    <div className="tl-snippet-textarea mtg-record-readonly mtg-record-empty" data-testid="mtg-record-empty">
      {children}
    </div>
  );
}

/**
 * 요약 칸 (pivit-work PW-2435 · 회의록 검토 정책서 §3.4·§4.2·§5.3·§6).
 * 디자이너가 그린 읽기 전용 회색 칸(`.tl-snippet-textarea.mtg-record-readonly`)을 회의 담당자에게는 같은 모양의
 * 입력칸으로 바꾼다 — 누르면 디자이너 입력칸의 초점 테두리가 생기고, 글 길이만큼 높이가 늘어 회색 칸과 같은 높이다.
 * 칸을 벗어나면 바뀐 글만 `onSave(value)` 로 넘긴다. 그 프로미스를 붙들어 머리 줄 오른쪽에 「저장 중...」,
 * 끝나면 「저장됨 ✓」(체크는 아이콘)를 2초 보인다. 실패하면 상태만 지우고 친 글은 그대로 둔다 — 실패 안내는 caller 가 띄운다.
 * `summaryMaxLength` 를 넘게 치면 더 넣지 않고 칸 아래에 안내한다. 이미 한도보다 긴 글(AI 가 만든 요약)은 지우는 것만 받는다.
 * 바깥 `summary` 가 바뀌면(다시 만들기) 칸을 벗어나 있을 때 새 값으로 바꾼다.
 */
const SAVED_VISIBLE_MS = 2000;

function useSummaryDraft({ summary, onSave, summaryMaxLength }) {
  const [draft, setDraft] = useState(summary);
  const [prevSummary, setPrevSummary] = useState(summary);
  const [focused, setFocused] = useState(false);
  const [status, setStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'
  const [tooLong, setTooLong] = useState(false);
  const seqRef = useRef(0);
  const timerRef = useRef(null);
  // 마지막으로 보낸 글 — 칸을 벗어나 보낸 것을 창이 닫힐 때 또 보내지 않는다.
  const sentRef = useRef(summary);
  const latestRef = useRef(null);
  useEffect(() => {
    latestRef.current = { draft, summary, onSave };
  });
  // Esc 처럼 칸을 벗어나지 않고 창이 닫히면 blur 가 오지 않는다 — 닫힐 때 고친 글을 보낸다.
  useEffect(
    () => () => {
      clearTimeout(timerRef.current);
      if (!latestRef.current) return;
      const { draft: last, summary: saved, onSave: save } = latestRef.current;
      if (last !== saved && last !== sentRef.current) Promise.resolve(save?.(last)).catch(() => {});
    },
    [],
  );

  // 바깥 값이 바뀌었다 — 고치는 중이 아니면 따라간다 (render 중 갱신 — effect 안 setState 를 피한다).
  if (summary !== prevSummary) {
    setPrevSummary(summary);
    if (!focused) setDraft(summary);
  }

  const onChange = (e) => {
    const next = e.target.value;
    if (summaryMaxLength && next.length > summaryMaxLength && next.length > draft.length) {
      setTooLong(true);
      return;
    }
    setTooLong(false);
    setDraft(next);
  };

  const onBlur = () => {
    setFocused(false);
    if (draft === summary || draft === sentRef.current) return;
    sentRef.current = draft;
    const seq = ++seqRef.current;
    clearTimeout(timerRef.current);
    setStatus('saving');
    Promise.resolve(onSave?.(draft)).then(
      () => {
        if (seq !== seqRef.current) return;
        setStatus('saved');
        timerRef.current = setTimeout(() => setStatus('idle'), SAVED_VISIBLE_MS);
      },
      () => {
        // 실패한 글은 다시 벗어날 때 또 보낸다.
        if (sentRef.current === draft) sentRef.current = summary;
        if (seq === seqRef.current) setStatus('idle');
      },
    );
  };

  return { draft, status, tooLong, onChange, onBlur, onFocus: () => setFocused(true) };
}

function SummaryStatus({ status, labels }) {
  if (status === 'idle') return null;
  return (
    <span className="mtg-record-save-status" role="status" data-testid="meeting-summary-status">
      {status === 'saving' ? (
        labels.summarySaving
      ) : (
        <>
          {labels.summarySaved}
          {/* 「저장됨 ✓」의 체크 — 글자 기호 대신 선 아이콘 (번역 문구에 기호를 넣지 않는다) */}
          <CheckGlyph size={12} aria-hidden />
        </>
      )}
    </span>
  );
}

function SummaryInput({ field, labels }) {
  const ref = useRef(null);
  // 글 길이만큼 높이를 늘린다 — 읽기 전용 회색 칸처럼 내용만큼 보이고 칸 안에 스크롤이 생기지 않는다.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    // 칸은 테두리까지 높이에 넣는 상자다 — scrollHeight 에 위아래 테두리를 더해야 칸 안에 스크롤이 안 남는다.
    el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`;
  }, [field.draft]);
  return (
    <>
      <textarea
        ref={ref}
        className="tl-snippet-textarea mtg-record-summary-input"
        aria-label={labels.summary}
        data-testid="meeting-summary-input"
        rows={1}
        value={field.draft}
        onChange={field.onChange}
        onFocus={field.onFocus}
        onBlur={field.onBlur}
      />
      {field.tooLong && labels.summaryTooLong && (
        <p className="mtg-record-summary-note is-error" role="alert" data-testid="meeting-summary-too-long">
          {labels.summaryTooLong}
        </p>
      )}
    </>
  );
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
  // 요약 자리를 「요약 | 발언 기록」 탭으로 나눈다 (PW-1704). { label, content } — label 은 탭 이름
  // (개수까지 caller 가 넣는다), content 는 탭 안에 그릴 노드(`MeetingTranscript` 또는 안내).
  // 두 탭이 같은 높이 칸을 번갈아 써서, 발언이 길어도 창 길이·아래 버튼 자리가 그대로다.
  // 주지 않으면 지금처럼 요약 섹션만 그린다.
  transcriptTab,
  // 요약 바로 아래 작은 글씨 한 줄 (PW-1705) — 예: 「참고한 자료: 받아쓰기 · 10월 안건」. 문구는 caller 가
  // 만든다. 탭이 있으면 요약 탭에서만 보인다. 주지 않으면 그리지 않는다.
  summaryNote,
  // 읽기 전용 — 회의 담당자가 아닌 참석자 (기획 screen-minutes-review §4.4).
  // 할 일 입력·담당자·기한을 잠그고 추가·삭제 버튼을 숨긴다. 모양은 그대로다.
  readOnly = false,
  // 잠긴 칸에 마우스를 올렸을 때 보이는 안내 (caller 주입, 예: "회의 담당자만 수정할 수 있습니다.")
  readOnlyHint,
  // 새 액션 아이템의 기본 기한 'YYYY-MM-DD'. 주지 않으면 브라우저 기준 오늘이다 —
  // 사용자 시간대의 오늘을 쓰려면 caller 가 넘긴다.
  defaultDueDate,
  // 할 일 한 줄 최대 글자 수 · 최대 개수 (기획 screen-minutes-review §7 「100자」·§8 「30개」).
  // 다 찬 뒤 [추가]를 누르면 줄을 더하지 않고 onActionItemLimit 을 부른다 — 안내는 caller 가 띄운다.
  actionItemMaxLength,
  actionItemMaxCount,
  onActionItemLimit,
  // 회의록을 아직 만들지 않은 회의 (PW-1832) — 요약·주요 논의·결정 사항·액션 아이템 섹션을 그리지 않는다.
  // 만들지 않은 것을 빈 섹션으로 보이지 않는다. 머리·메타·headerExtra 는 그대로다. 기본은 지금처럼 다 그린다.
  minutesHidden = false,
  // 회의 담당자가 요약을 고친다 (PW-2435 · review §3.4) — true 면 요약 칸이 입력칸이다. 칸을 벗어나면 바뀐 글로
  // onSummarySave(value) 를 부르고, 그 프로미스로 「저장 중...」·「저장됨 ✓」(labels.summarySaving·summarySaved)를 그린다.
  // 실패 안내는 caller 가 띄운다. summaryMaxLength 를 넘게 치면 막고 labels.summaryTooLong 을 보인다.
  summaryEditable = false,
  onSummarySave,
  summaryMaxLength,
}) {
  const summaryField = useSummaryDraft({ summary, onSave: onSummarySave, summaryMaxLength });
  const summaryBody = summaryEditable ? (
    <SummaryInput field={summaryField} labels={labels} />
  ) : (
    <Tooltip content={readOnly ? readOnlyHint : undefined}>
      <div className="tl-snippet-textarea mtg-record-readonly">{summary}</div>
    </Tooltip>
  );
  const summaryStatus = summaryEditable ? <SummaryStatus status={summaryField.status} labels={labels} /> : null;
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
  const [tab, setTab] = useState('summary');

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

      {!minutesHidden && (
      <>
      {/* 요약 — 발언 기록이 있으면 「요약 | 발언 기록」 탭 (PW-1704). 처음은 요약 탭이다. */}
      {transcriptTab ? (
        <section className="mtg-progress-section mtg-record-section">
          <div className="tl-tabs-row mtg-record-tabs-row">
            <Tabs
              items={[
                { value: 'summary', label: labels.summary },
                { value: 'transcript', label: transcriptTab.label },
              ]}
              value={tab}
              onChange={setTab}
            />
            {tab === 'summary' && summaryStatus}
          </div>
          <div className="mtg-record-tab-pane" role="tabpanel" data-testid={`meeting-record-tab-${tab}`}>
            {tab === 'summary' ? (
              <>
                {summaryBody}
                {summaryNote && <p className="mtg-record-summary-note">{summaryNote}</p>}
              </>
            ) : (
              transcriptTab.content
            )}
          </div>
        </section>
      ) : (
        <section className="mtg-progress-section mtg-record-section">
          {summaryStatus ? (
            <div className="mtg-record-section-head">
              <span className="mtg-progress-section-label">{labels.summary}</span>
              {summaryStatus}
            </div>
          ) : (
            <span className="mtg-progress-section-label">{labels.summary}</span>
          )}
          {summaryBody}
          {summaryNote && <p className="mtg-record-summary-note">{summaryNote}</p>}
        </section>
      )}

      {/* 주요논의 — accordion */}
      <section className="mtg-progress-section mtg-record-section">
        <span className="mtg-progress-section-label">{labels.discussions}</span>
        {discussions.length === 0 && labels.discussionsEmpty ? (
          <EmptyBox>{labels.discussionsEmpty}</EmptyBox>
        ) : (
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
        )}
      </section>

      {/* 결정 사항 */}
      <section className="mtg-progress-section mtg-record-section">
        <span className="mtg-progress-section-label">{labels.decisions}</span>
        {decisions.length === 0 && labels.decisionsEmpty ? (
          <EmptyBox>{labels.decisionsEmpty}</EmptyBox>
        ) : (
        <div className="tl-snippet-textarea mtg-record-readonly">
          <ul className="mtg-record-bullet-list">
            {decisions.map((d, i) => (<li key={`${d}-${i}`}>{d}</li>))}
          </ul>
        </div>
        )}
      </section>

      {/* 액션 아이템 */}
      <section className="mtg-progress-section mtg-record-section">
        <span className="mtg-progress-section-label">{labels.actionItems}</span>
        {actions.length === 0 && labels.actionItemsEmpty && (
          <EmptyBox>{labels.actionItemsEmpty}</EmptyBox>
        )}
        <ul className="mtg-record-action-list">
          {actions.map((a, idx) => (
            <li key={idx} className="mtg-record-action-item">
              <Tooltip content={readOnly ? readOnlyHint : undefined} className="mtg-record-action-title-tip">
              <input
                type="text"
                className="mtg-record-action-title"
                value={a.title}
                maxLength={actionItemMaxLength}
                placeholder={labels.actionItemTitlePlaceholder ?? labels.newActionItemTitle ?? ''}
                onChange={(e) => updateAction(idx, { title: e.target.value })}
                readOnly={readOnly}
                disabled={readOnly}
                ref={(el) => {
                  if (el && justAddedIdxRef.current === idx) {
                    justAddedIdxRef.current = null;
                    el.focus();
                  }
                }}
              />
              </Tooltip>
              <Tooltip content={readOnly ? readOnlyHint : undefined}>
              <button
                type="button"
                className={`mtg-record-action-person${a.person ? '' : ' is-empty'}`}
                disabled={readOnly}
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
              </Tooltip>
              <Tooltip content={readOnly ? readOnlyHint : undefined}>
              <button
                type="button"
                className="mtg-record-action-date"
                disabled={readOnly}
                onClick={(e) => setOpenPicker({
                  idx,
                  field: 'date',
                  rect: e.currentTarget.getBoundingClientRect(),
                })}
              >
                {a.date}
              </button>
              </Tooltip>
              {!readOnly && <button
                type="button"
                className="mtg-record-action-remove"
                aria-label={labels.removeLabel}
                onClick={() => updateActions(actions.filter((_, i) => i !== idx))}
              >
                <CloseGlyph size={14} strokeWidth={2.571} color="var(--text-tertiary)" />
              </button>}
            </li>
          ))}
          {!readOnly && <li>
            <button
              type="button"
              className="mtg-record-action-add"
              onClick={() => {
                if (actionItemMaxCount != null && actions.length >= actionItemMaxCount) {
                  onActionItemLimit?.();
                  return;
                }
                // 신규 항목은 빈 title + 담당자 미설정 으로 시작 — 하드코딩
                // placeholder 가 그대로 저장돼 모든 신규가 "새 액션 아이템" 으로
                // 보이는 회귀를 방지. ref 콜백이 마운트 시 한 번 focus 한다.
                const newIdx = actions.length;
                justAddedIdxRef.current = newIdx;
                const due = parseISODate(defaultDueDate) ?? new Date();
                updateActions([
                  ...actions,
                  {
                    title: '',
                    person: '',
                    date: formatMMDD(due),
                    dueDate: formatISODate(due),
                  },
                ]);
              }}
            >
              <Icon src="/icons/plus.svg" size={20} color="var(--text-secondary)" baseUrl={baseUrl} />
              <span>{labels.addActionItem}</span>
            </button>
          </li>}
        </ul>
      </section>
      </>
      )}

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
          selectedDate={dueDateOf(actions[openPicker.idx])}
          onSelect={(d) => {
            updateAction(openPicker.idx, { date: formatMMDD(d), dueDate: formatISODate(d) });
            setOpenPicker(null);
          }}
          onClose={() => setOpenPicker(null)}
        />
      )}
    </>
  );
}
