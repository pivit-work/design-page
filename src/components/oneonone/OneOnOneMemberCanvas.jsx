import { useState, useEffect } from 'react';
import Icon from '../shared/Icon.jsx';

/**
 * 1on1 멤버(구성원) 뷰 — READY / LIVE / DONE / HISTORY 통합 캔버스.
 *
 * 정본: `pivit-specs/기획서-UX-UI-UserFlow/D. 1on1-기획/1on1-member-view.jsx`
 * (spec-1on1.md v2). 시안의 4단계 구조를 그대로 옮긴다.
 *
 * ## 왜 뒤늦게 캔버스가 되었나
 *
 * 1on1 도메인은 매니저 쪽만 캔버스화돼 있었다(`OneOnOneCanvasV2` ·
 * `OneOnOneDashboardCanvas` · `StartOneOnOneView`). 정작 `StartOneOnOneView` 는
 * "멤버 준비도: 멤버 READY 화면(**별도**) 의 7 섹션 진행도" 라고 이 화면의 존재를
 * 전제하고 진행률만 prop 으로 받아 표시한다. 그 별도 화면이 정본에 없어서
 * pivit-work 가 시안을 보고 직접 그렸고, 그 과정에서 자체 색 토큰과 이모지
 * 아이콘이 박혀 나머지 1on1 화면과 어긋났다.
 *
 * ## 스타일·아이콘은 이 도메인의 기존 어휘를 따른다
 *
 * - 형태/색: `one_on_one.css` 의 `.ono-start-*`(매니저 진행 준비 뷰)와 같은
 *   토큰·라운드·간격을 재사용한다. 멤버 화면에만 있는 조각(단계 탭·세션 헤더·
 *   노트 그리드·히스토리 타임라인)만 `.ono-mem-*` 로 같은 파일에 추가했다.
 * - 아이콘: 이모지 대신 `shared/Icon` + `/icons-solid/*.svg`. 다른 캔버스와 같은
 *   방식이라 색·크기가 토큰을 따르고, `icons` prop 으로 교체할 수 있다.
 *
 * ## 호스트가 소유하는 것
 *
 * 날짜/기간 포맷(사용자 시간대)·i18n 라벨·아바타 컴포넌트·마감 배지 색은
 * 전부 호스트가 계산해 넣는다(`oneonone/MemberCard` 와 같은 규약 —
 * "All color decisions are pre-computed by the caller").
 */

const DEFAULT_ICONS = {
  prevActions: '/icons-solid/clipboard-check.svg',
  aiSummary: '/icons-solid/ai-chat-01.svg',
  okr: '/icons-solid/target-04.svg',
  health: '/icons-solid/activity-heart.svg',
  topics: '/icons-solid/message-chat-circle.svg',
  notes: '/icons-solid/file-06.svg',
  actions: '/icons-solid/check-square.svg',
  agenda: '/icons-solid/list.svg',
  memo: '/icons-solid/edit-05.svg',
  recording: '/icons-solid/microphone-01.svg',
  alert: '/icons-solid/alert-triangle.svg',
  history: '/icons-solid/clock-rewind.svg',
  clock: '/icons-solid/clock.svg',
  chevron: '/icons-solid/chevron-down.svg',
  arrow: '/icons-solid/arrow-right.svg',
  back: '/icons-solid/arrow-left.svg',
  check: '/icons-solid/check.svg',
  decisions: '/icons-solid/check-circle.svg',
  next: '/icons-solid/calendar.svg',
};

const DEFAULT_LABELS = {
  tabPrep: '준비', tabPrepDesc: '사전 작성',
  tabMeeting: '미팅', tabMeetingDesc: '진행 중',
  tabResult: '결과', tabResultDesc: '완료',
  tabHistory: '히스토리', tabHistoryDesc: '지난 기록',
  badgeReady: '준비 중', badgeLive: '진행 중', badgeDone: '완료',
  myReadiness: '내 준비도',
  readinessComplete: '준비 완료', readinessInProgress: '준비 중', readinessNeeded: '준비 필요',
  sessionWith: '{name}님과의 1on1', liveWith: '{name}님과 1on1 진행 중', doneWith: '{name}님과의 1on1 완료',
  prevActionCheck: '이전 액션아이템 점검',
  aiSummary: 'AI 요약 — 최근 2주 내 활동',
  okrContribution: 'OKR 기여 & 진행 현황',
  healthCheck: 'Health Check', healthGraph: '헬스체크 트렌드',
  topicInputTitle: '이번 1on1에서 나누고 싶은 주제',
  topicInputDesc: '미리 적어두면 매니저가 준비해서 옵니다.',
  topicPlaceholder: '예: 다음 분기 목표 조정',
  addTopic: '추가', topicExamples: '예) 커리어 방향 · 업무 부하 · 협업 이슈',
  prepCompleteHint: '준비가 끝나면 매니저가 미팅을 시작합니다.',
  startMeeting: '미팅 시작',
  elapsed: '경과', prepSummary: '준비 요약', okrStatus: 'OKR 현황', agenda: '논의 아젠다',
  pendingActions: '미완료 액션아이템',
  recordingNotice: '이 미팅은 매니저가 녹음할 수 있습니다.',
  privateMemoLabel: '개인 메모',
  privateMemoGuide: '는 나만 볼 수 있습니다.',
  privateMemo: '개인 메모',
  privateMemoDesc: '매니저에게 공유되지 않습니다.',
  memoPlaceholder: '기억하고 싶은 내용을 적어두세요',
  save: '저장', saved: '저장됨',
  meetingEndByManager: '미팅 종료는 매니저가 진행합니다.',
  meetingNotes: '미팅 내용',
  mainDiscussion: '주요 논의', keyDecisions: '결정 사항',
  topicsCovered: '다룬 주제', nextAgenda: '다음 아젠다',
  myActionItems: '내 액션아이템', completed: '완료', managerActions: '매니저 액션 (참고)',
  noActions: '액션아이템이 없습니다',
  colAction: '항목', colContent: '내용', colAssignee: '담당', colStatus: '상태', colDeadline: '마감',
  roleMember: '나', roleManager: '매니저',
  statusDone: '완료', statusPending: '진행 중',
  blockerHigh: '높음', blockerMedium: '보통',
  emotionTone: '대화 톤', emotionPositive: '긍정', emotionNeutral: '중립', emotionNegative: '부정',
  historyTitle: '지난 1on1', totalCount: '총 {count}회',
  pastSessionsEmpty: '지난 1on1 기록이 없습니다',
  backToHistory: '목록으로',
  highlights: '하이라이트', count: '건', countUnit: '건',
  managerPreparing: '매니저가 정리 중입니다',
  noSummary: '요약이 공유되면 여기에 표시됩니다',
  noPrepSession: '준비 중인 1on1이 없습니다',
  noLiveSession: '진행 중인 1on1이 없습니다',
  noResultSession: '완료된 1on1이 없습니다',
};

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
function mergeLabels(base, provided) {
  if (!provided) return base;
  const out = { ...base };
  for (const k of Object.keys(provided)) {
    if (isObj(provided[k])) out[k] = mergeLabels(base[k] || {}, provided[k]);
    else if (provided[k] !== undefined) out[k] = provided[k];
  }
  return out;
}
/** `{name}` 자리표시자 치환 — 호스트가 i18n 보간을 이미 했으면 그대로 지나간다. */
const fill = (tpl, vars) =>
  String(tpl ?? '').replace(/\{(\w+)\}/g, (m, k) => (vars && k in vars ? vars[k] : m));

/* ── 공통 조각 ─────────────────────────────────────────── */
function StatusBadge({ status, L }) {
  const label = status === 'live' ? L.badgeLive : status === 'done' ? L.badgeDone : L.badgeReady;
  return (
    <span className={`ono-mem-badge is-${status}`}>
      {status === 'live' && <span className="ono-mem-badge-dot" />}
      {label}
    </span>
  );
}

function Readiness({ value, L }) {
  // 준비도 톤 — 매니저 뷰의 flag 어휘를 그대로 쓴다(blue/warning/error).
  const tone = value >= 80 ? 'blue' : value >= 50 ? 'warning' : 'error';
  const label = value >= 80 ? L.readinessComplete : value >= 50 ? L.readinessInProgress : L.readinessNeeded;
  return (
    <div className="ono-start-prep">
      {/* .ono-start-prep-row 는 세로 배치라 배지가 폭을 다 먹는다 — 가로 행은 따로 둔다. */}
      <div className="ono-mem-readiness-top">
        <span className="ono-start-prep-who">{L.myReadiness}</span>
        <span className={`ono-start-flag ono-start-flag-${tone}`}>{label}</span>
      </div>
      <div className="ono-start-progress-track">
        <div className="ono-start-progress-fill" style={{ width: `${value}%` }} />
      </div>
      <span className="ono-start-prep-pct">{value}%</span>
    </div>
  );
}

function Section({ title, icon, icons, baseUrl, badge, collapsible = true, children }) {
  const [open, setOpen] = useState(true);
  const head = (
    <>
      <span className="ono-mem-card-title">
        <Icon src={icon} size={16} color="var(--utility-blue-500)" baseUrl={baseUrl} />
        {title}
      </span>
      {badge}
      {collapsible && (
        <Icon src={icons.chevron} size={16} color="var(--text-tertiary)" baseUrl={baseUrl} />
      )}
    </>
  );
  return (
    <section className="ono-mem-card">
      {collapsible ? (
        <button type="button" className="ono-mem-card-head" onClick={() => setOpen(!open)} aria-expanded={open}>
          {head}
        </button>
      ) : (
        <div className="ono-mem-card-head is-static">{head}</div>
      )}
      {(!collapsible || open) && <div className="ono-mem-card-body is-bordered">{children}</div>}
    </section>
  );
}

function OkrBar({ value }) {
  return (
    <span className="ono-start-okr-bar-line">
      <span className="ono-start-progress-track">
        <span className="ono-start-progress-fill" style={{ display: 'block', width: `${value}%` }} />
      </span>
      <span className="ono-start-okr-bar-pct">{value}%</span>
    </span>
  );
}

function ElapsedTimer({ from }) {
  const [elapsed, setElapsed] = useState(() => Math.floor((Date.now() - from) / 1000));
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - from) / 1000)), 1000);
    return () => clearInterval(id);
  }, [from]);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return (
    <span className="ono-mem-elapsed-value">
      {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
}

function Blockers({ items, L, icons, baseUrl }) {
  if (!items?.length) return null;
  return (
    <div className="ono-start-briefing-badges">
      {items.map((b) => (
        <span key={b.id} className={`ono-start-flag ono-start-flag-${b.severity === 'high' ? 'error' : 'warning'}`}>
          <Icon src={icons.alert} size={12} color="currentColor" baseUrl={baseUrl} />
          {b.severity === 'high' ? L.blockerHigh : L.blockerMedium} · {b.text}
        </span>
      ))}
    </div>
  );
}

/** 헬스 추이 꺾은선. 색 결정은 호스트가 준 healthColor 로 위임한다. */
function HealthGraph({ data, healthColor, ariaLabel }) {
  const [hover, setHover] = useState(null);
  if (!data || data.length < 2) return null;

  const W = 520, H = 140, PL = 28, PR = 24, PT = 16, PB = 28;
  const plotW = W - PL - PR;
  const plotH = H - PT - PB;
  const ticks = [6, 7, 8, 9, 10];
  const toX = (i) => PL + (i / (data.length - 1)) * plotW;
  const toY = (v) => PT + plotH - ((v - 6) / 4) * plotH;
  const clamp = (v) => Math.max(6, Math.min(10, v));
  const pts = data.map((v, i) => `${toX(i)},${toY(clamp(v))}`).join(' ');
  const area =
    data.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(clamp(v))}`).join('') +
    `L${toX(data.length - 1)},${PT + plotH}L${toX(0)},${PT + plotH}Z`;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="ono-mem-hg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--utility-blue-500)" stopOpacity={0.18} />
          <stop offset="100%" stopColor="var(--utility-blue-500)" stopOpacity={0.01} />
        </linearGradient>
      </defs>
      {ticks.map((tk) => (
        <g key={tk}>
          <line x1={PL} y1={toY(tk)} x2={W - PR} y2={toY(tk)} stroke="var(--border-secondary)" strokeWidth={0.5} />
          <text x={PL - 6} y={toY(tk) + 3} textAnchor="end" fontSize={9} fill="var(--text-tertiary)">{tk}</text>
        </g>
      ))}
      <path d={area} fill="url(#ono-mem-hg)" />
      <polyline points={pts} fill="none" stroke="var(--utility-blue-500)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => {
        const x = toX(i), y = toY(clamp(v)), on = hover === i;
        return (
          <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: 'pointer' }}>
            <circle cx={x} cy={y} r={on ? 7 : 3.5} fill={healthColor ? healthColor(v) : 'var(--utility-blue-500)'} stroke="var(--bg-quaternary)" strokeWidth={on ? 2 : 1} />
            {on && (
              <g>
                <rect x={x - 16} y={y - 24} width={32} height={18} rx={4} fill="var(--text-primary)" />
                <text x={x} y={y - 12} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--bg-quaternary)">{v}</text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function ColHeads({ cols }) {
  return (
    <div className="ono-mem-row is-head">
      {cols.map((h) => (
        <span key={h} className="ono-mem-col-head">{h}</span>
      ))}
    </div>
  );
}

function noteSectionsOf(session, L, icons) {
  return [
    { key: 'summary', label: L.mainDiscussion, icon: icons.topics, content: session.aiSummary },
    { key: 'decisions', label: L.keyDecisions, icon: icons.decisions, content: session.keyDecisions?.join('\n') },
    { key: 'topics', label: L.topicsCovered, icon: icons.agenda, content: session.topicsCovered?.join(', ') },
    { key: 'next', label: L.nextAgenda, icon: icons.next, content: session.nextTopics?.join(', ') },
  ];
}

function NoteGrid({ session, L, icons, baseUrl }) {
  return (
    <Section title={L.meetingNotes} icon={icons.notes} icons={icons} baseUrl={baseUrl} collapsible={false}>
      <div className="ono-mem-notes">
        {noteSectionsOf(session, L, icons).map(({ key, label, icon, content }) => (
          <div key={key}>
            <span className="ono-mem-note-label">
              <Icon src={icon} size={14} color="var(--text-tertiary)" baseUrl={baseUrl} />
              {label}
            </span>
            <div className="ono-mem-note-box">{content || '—'}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function SessionHeader({ title, status, date, duration, avatar, L, icons, baseUrl, children, extra }) {
  return (
    <header className={`ono-mem-head is-${status}`}>
      <div className="ono-mem-head-row">
        {avatar}
        <h1 className="ono-mem-head-title">{title}</h1>
        <StatusBadge status={status} L={L} />
        {duration && (
          <span className="ono-mem-chip">
            <Icon src={icons.clock} size={12} color="currentColor" baseUrl={baseUrl} />
            {duration}
          </span>
        )}
        {extra}
      </div>
      {date && <p className="ono-mem-head-date">{date}</p>}
      {children}
    </header>
  );
}

/* ── ① 준비 (READY) ───────────────────────────────────── */
function PrepScreen({ session, manager, avatar, okrStatus, healthHistory, isHost, L, icons, baseUrl, formatDate, healthColor, onTopicsChange, onStart }) {
  const [draft, setDraft] = useState('');
  const topics = session.memberTopics ?? [];
  const prevActions = session.aiBriefing?.prevActions ?? [];
  const readiness =
    [topics.length > 0, prevActions.length > 0, !!session.aiBriefing?.summary, okrStatus.length > 0]
      .filter(Boolean).length * 25;

  const addTopic = () => {
    if (!draft.trim()) return;
    onTopicsChange([...topics, draft.trim()]);
    setDraft('');
  };

  return (
    <>
      <SessionHeader
        title={fill(L.sessionWith, { name: manager.name })}
        status="ready"
        date={formatDate(session.createdAt)}
        avatar={avatar}
        L={L} icons={icons} baseUrl={baseUrl}
      >
        <Readiness value={readiness} L={L} />
      </SessionHeader>

      {prevActions.length > 0 && (
        <Section title={L.prevActionCheck} icon={icons.prevActions} icons={icons} baseUrl={baseUrl}>
          <div className="ono-mem-table">
            <ColHeads cols={[L.colAction, L.colAssignee, L.colStatus]} />
            {prevActions.map((item, i) => (
              <div className="ono-mem-row" key={i}>
                <span className="ono-mem-cell">{item.text}</span>
                <span className="ono-mem-cell is-sub">{item.owner === 'member' ? L.roleMember : L.roleManager}</span>
                <span className={`ono-start-flag ono-start-flag-${item.done ? 'blue' : 'warning'}`}>
                  {item.done ? L.statusDone : L.statusPending}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {session.aiBriefing && (
        <Section title={L.aiSummary} icon={icons.aiSummary} icons={icons} baseUrl={baseUrl}>
          <div className="ono-start-briefing-text-box">{session.aiBriefing.summary}</div>
          {session.aiBriefing.signals?.length > 0 && (
            <div className="ono-start-briefing-badges">
              {session.aiBriefing.signals.map((s, i) => (
                <span key={i} className="ono-start-topic-badge">{s}</span>
              ))}
            </div>
          )}
          <Blockers items={session.aiBriefing.unresolvedBlockers} L={L} icons={icons} baseUrl={baseUrl} />
        </Section>
      )}

      {okrStatus.length > 0 && (
        <Section title={L.okrContribution} icon={icons.okr} icons={icons} baseUrl={baseUrl}>
          {okrStatus.map((kr, ki) => (
            <div className="ono-start-okr-row" key={`${ki}-${kr.id}`}>
              <span className="ono-start-okr-kr">{kr.title}</span>
              <OkrBar value={kr.progress} />
            </div>
          ))}
        </Section>
      )}

      {healthHistory.length >= 2 && (
        <Section title={L.healthCheck} icon={icons.health} icons={icons} baseUrl={baseUrl}>
          <HealthGraph data={healthHistory} healthColor={healthColor} ariaLabel={L.healthGraph} />
        </Section>
      )}

      <Section title={L.topicInputTitle} icon={icons.topics} icons={icons} baseUrl={baseUrl} collapsible={false}>
        <p className="ono-mem-hint">{L.topicInputDesc}</p>
        {topics.length > 0 && (
          <div className="ono-mem-topics" data-testid="ono-topic-input">
            {topics.map((topic, i) => (
              <span key={i} className="ono-mem-topic">
                {topic}
                <button
                  type="button"
                  className="ono-mem-topic-x"
                  aria-label={`${topic} 삭제`}
                  onClick={() => onTopicsChange(topics.filter((_, idx) => idx !== i))}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="ono-mem-input-row">
          <input
            className="ono-mem-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTopic(); } }}
            placeholder={L.topicPlaceholder}
          />
          <button type="button" className="ono-mem-btn" onClick={addTopic} disabled={!draft.trim()}>
            {L.addTopic}
          </button>
        </div>
        {topics.length === 0 && <p className="ono-mem-hint">{L.topicExamples}</p>}
      </Section>

      {isHost && (
        <div className="ono-mem-footer">
          <span className="ono-mem-hint">{L.prepCompleteHint}</span>
          <button type="button" className="ono-mem-btn" onClick={onStart}>{L.startMeeting}</button>
        </div>
      )}
    </>
  );
}

/* ── ② 미팅 (LIVE) ────────────────────────────────────── */
function MeetingScreen({ session, manager, avatar, L, icons, baseUrl, onSaveNotes }) {
  const [memo, setMemo] = useState(session.memberNotes ?? '');
  const [saved, setSaved] = useState(false);
  const [startAt] = useState(() => (session.startedAt ? new Date(session.startedAt).getTime() : Date.now()));
  const prevActions = (session.aiBriefing?.prevActions ?? []).filter((a) => !a.done);
  const okrStatus = session.aiBriefing?.okrStatus ?? [];

  const save = () => {
    onSaveNotes(memo);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <>
      <SessionHeader
        title={fill(L.liveWith, { name: manager.name })}
        status="live"
        avatar={avatar}
        L={L} icons={icons} baseUrl={baseUrl}
        extra={
          <span className="ono-mem-elapsed">
            {L.elapsed}
            <ElapsedTimer from={startAt} />
          </span>
        }
      />

      {session.aiBriefing && (
        <Section title={L.prepSummary} icon={icons.aiSummary} icons={icons} baseUrl={baseUrl}>
          <div className="ono-start-briefing-text-box">{session.aiBriefing.summary}</div>
          <Blockers items={session.aiBriefing.unresolvedBlockers} L={L} icons={icons} baseUrl={baseUrl} />
        </Section>
      )}

      {okrStatus.length > 0 && (
        <Section title={L.okrStatus} icon={icons.okr} icons={icons} baseUrl={baseUrl}>
          {okrStatus.map((kr, ki) => (
            <div className="ono-start-okr-row" key={`${ki}-${kr.id}`}>
              <span className="ono-start-okr-kr">{kr.title}</span>
              <OkrBar value={kr.progress} />
            </div>
          ))}
        </Section>
      )}

      {session.agendaItems?.length > 0 && (
        <Section title={L.agenda} icon={icons.agenda} icons={icons} baseUrl={baseUrl}>
          {session.agendaItems.map((ag) => (
            <div className="ono-start-agenda-item" key={ag.id}>
              <span className="ono-start-agenda-text">{ag.text}</span>
              {ag.checked && <Icon src={icons.check} size={14} color="var(--utility-green-600)" baseUrl={baseUrl} />}
            </div>
          ))}
        </Section>
      )}

      {prevActions.length > 0 && (
        <Section title={L.pendingActions} icon={icons.alert} icons={icons} baseUrl={baseUrl}>
          {prevActions.map((a, i) => (
            <div className="ono-start-action-item" key={i}>
              <span className="ono-start-action-text">{a.text}</span>
            </div>
          ))}
        </Section>
      )}

      <div className="ono-mem-notice">
        <Icon src={icons.recording} size={14} color="currentColor" baseUrl={baseUrl} />
        <span>
          {L.recordingNotice} <strong>{L.privateMemoLabel}</strong>{L.privateMemoGuide}
        </span>
      </div>

      <Section title={L.privateMemo} icon={icons.memo} icons={icons} baseUrl={baseUrl}>
        <p className="ono-mem-hint">{L.privateMemoDesc}</p>
        <textarea
          className="ono-start-textarea"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder={L.memoPlaceholder}
          rows={8}
        />
        <div className="ono-mem-actions-end">
          <button type="button" className={`ono-mem-btn${saved ? ' is-ok' : ''}`} onClick={save}>
            {saved ? L.saved : L.save}
          </button>
        </div>
      </Section>

      <p className="ono-mem-hint ono-mem-center">{L.meetingEndByManager}</p>
    </>
  );
}

/* ── ③ 결과 (DONE) ────────────────────────────────────── */
function ActionRow({ item, L, deadlineOf, onToggle, muted, icons, baseUrl }) {
  const dm = deadlineOf ? deadlineOf(item) : null;
  return (
    <div
      className={`ono-mem-row${onToggle ? ' is-clickable' : ''}${muted ? ' is-muted' : ''}`}
      onClick={onToggle ? () => onToggle(item.id) : undefined}
    >
      <span className="ono-mem-cell ono-mem-cell-check">
        {onToggle && (
          <span className={`ono-mem-check${item.done ? ' is-on' : ''}`}>
            {item.done && <Icon src={icons.check} size={11} color="var(--text-white)" baseUrl={baseUrl} />}
          </span>
        )}
        <span className={item.done && onToggle ? 'is-done' : ''}>{item.text}</span>
      </span>
      <span className="ono-mem-cell is-sub">{item.owner === 'member' ? L.roleMember : L.roleManager}</span>
      {dm ? (
        <span className="ono-start-flag" style={{ background: dm.bg, borderColor: dm.bd, color: dm.color }}>
          {dm.label}
        </span>
      ) : (
        <span className="ono-mem-cell is-sub">—</span>
      )}
    </div>
  );
}

function ResultScreen({ session, manager, avatar, L, icons, baseUrl, formatDate, formatDuration, deadlineOf, onToggleAction }) {
  const myActions = session.actionItems.filter((a) => a.owner === 'member');
  const managerActions = session.actionItems.filter((a) => a.owner === 'manager');
  const doneCount = myActions.filter((a) => a.done).length;

  return (
    <>
      <SessionHeader
        title={fill(L.doneWith, { name: manager.name })}
        status="done"
        date={formatDate(session.createdAt)}
        duration={session.durationSec > 0 ? formatDuration(session.durationSec) : null}
        avatar={avatar}
        L={L} icons={icons} baseUrl={baseUrl}
      />

      {session.isShared === false ? (
        <div className="ono-mem-empty">
          {L.managerPreparing}
          <div className="ono-mem-hint">{L.noSummary}</div>
        </div>
      ) : (
        <>
          <NoteGrid session={session} L={L} icons={icons} baseUrl={baseUrl} />

          <Section
            title={L.myActionItems}
            icon={icons.actions}
            icons={icons}
            baseUrl={baseUrl}
            collapsible={false}
            badge={<span className="ono-start-topic-badge">{doneCount}/{myActions.length} {L.completed}</span>}
          >
            <div className="ono-start-progress-track">
              <div className="ono-start-progress-fill" style={{ width: `${myActions.length ? (doneCount / myActions.length) * 100 : 0}%` }} />
            </div>
            <div className="ono-mem-table">
              <ColHeads cols={[L.colContent, L.colAssignee, L.colDeadline]} />
              {myActions.map((item) => (
                <ActionRow key={item.id} item={item} L={L} deadlineOf={deadlineOf} onToggle={onToggleAction} icons={icons} baseUrl={baseUrl} />
              ))}
              {managerActions.length > 0 && (
                <>
                  <div className="ono-mem-group-label">{L.managerActions}</div>
                  {managerActions.map((item) => (
                    <ActionRow key={item.id} item={item} L={L} deadlineOf={deadlineOf} muted icons={icons} baseUrl={baseUrl} />
                  ))}
                </>
              )}
              {session.actionItems.length === 0 && (
                <p className="ono-mem-hint ono-mem-center">{L.noActions}</p>
              )}
            </div>
          </Section>

          {session.emotionTone && (
            <Section title={L.emotionTone} icon={icons.health} icons={icons} baseUrl={baseUrl}>
              {[
                { key: 'positive', label: L.emotionPositive, value: session.emotionTone.positive, color: 'var(--utility-green-600)' },
                { key: 'neutral', label: L.emotionNeutral, value: session.emotionTone.neutral, color: 'var(--text-tertiary)' },
                { key: 'negative', label: L.emotionNegative, value: session.emotionTone.negative, color: 'var(--colors-error-600)' },
              ].map((row) => {
                const total = session.emotionTone.positive + session.emotionTone.neutral + session.emotionTone.negative;
                const pct = total > 0 ? Math.round((row.value / total) * 100) : 0;
                return (
                  <div className="ono-start-okr-bar-line" key={row.key}>
                    <span className="ono-mem-cell is-sub ono-mem-tone-label">{row.label}</span>
                    <span className="ono-start-progress-track">
                      <span className="ono-start-progress-fill" style={{ display: 'block', width: `${pct}%`, background: row.color }} />
                    </span>
                    <span className="ono-start-okr-bar-pct" style={{ color: row.color }}>{pct}%</span>
                  </div>
                );
              })}
            </Section>
          )}
        </>
      )}
    </>
  );
}

/* ── ④ 히스토리 (HISTORY) ─────────────────────────────── */
function HistoryDetail({ session, manager, avatar, L, icons, baseUrl, formatDate, formatDuration, onBack, onToggleAction }) {
  return (
    <>
      <SessionHeader
        title={fill(L.sessionWith, { name: manager.name })}
        status="done"
        date={formatDate(session.createdAt)}
        duration={session.durationSec > 0 ? formatDuration(session.durationSec) : null}
        avatar={avatar}
        L={L} icons={icons} baseUrl={baseUrl}
      >
        <button type="button" className="ono-mem-back" onClick={onBack}>
          <Icon src={icons.back} size={14} color="currentColor" baseUrl={baseUrl} />
          {L.backToHistory}
        </button>
      </SessionHeader>

      {session.aiSummary && <NoteGrid session={session} L={L} icons={icons} baseUrl={baseUrl} />}

      {session.actionItems.length > 0 && (
        <Section
          title={L.myActionItems}
          icon={icons.actions}
          icons={icons}
          baseUrl={baseUrl}
          collapsible={false}
          badge={<span className="ono-start-topic-badge">{session.actionItems.length}{L.count}</span>}
        >
          <div className="ono-mem-table">
            <ColHeads cols={[L.colContent, L.colAssignee, L.colStatus]} />
            {session.actionItems.map((item) => (
              <div className="ono-mem-row is-clickable" key={item.id} onClick={() => onToggleAction(item.id)}>
                <span className="ono-mem-cell">{item.text}</span>
                <span className="ono-mem-cell is-sub">{item.owner === 'member' ? L.roleMember : L.roleManager}</span>
                <span className={`ono-start-flag ono-start-flag-${item.done ? 'blue' : 'warning'}`}>
                  {item.done ? L.statusDone : L.statusPending}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

function HistoryScreen({ sessions, manager, avatar, healthHistory, L, icons, baseUrl, formatDate, formatDuration, healthColor, healthBg, healthBorder, onToggleAction }) {
  const [selectedId, setSelectedId] = useState(null);
  const done = sessions.filter((s) => s.status === 'done');
  const selected = done.find((s) => s.id === selectedId);

  if (selected) {
    return (
      <HistoryDetail
        session={selected} manager={manager} avatar={avatar} L={L} icons={icons} baseUrl={baseUrl}
        formatDate={formatDate} formatDuration={formatDuration}
        onBack={() => setSelectedId(null)} onToggleAction={onToggleAction}
      />
    );
  }

  return (
    <>
      <header className="ono-mem-head">
        <div className="ono-mem-head-row">
          <Icon src={icons.history} size={18} color="var(--utility-blue-500)" baseUrl={baseUrl} />
          <h1 className="ono-mem-head-title">{L.historyTitle}</h1>
          <span className="ono-mem-elapsed">
            {avatar}
            <span className="ono-mem-cell">{manager.name}</span>
          </span>
        </div>
        <p className="ono-mem-head-date">{fill(L.totalCount, { count: done.length })}</p>
      </header>

      {done.length === 0 ? (
        <div className="ono-mem-empty">{L.pastSessionsEmpty}</div>
      ) : (
        <div className="ono-mem-timeline">
          {done.map((s, i) => {
            const mine = s.actionItems.filter((a) => a.owner === 'member');
            const doneCount = mine.filter((a) => a.done).length;
            const hIdx = healthHistory.length - 1 - i;
            const hVal = hIdx >= 0 && hIdx < healthHistory.length ? healthHistory[hIdx] : null;
            return (
              <button
                key={s.id}
                type="button"
                className="ono-mem-hist"
                data-testid="ono-history-row"
                onClick={() => setSelectedId(s.id)}
              >
                <span className={`ono-mem-hist-dot${i === 0 ? ' is-latest' : ''}`} />
                <span className="ono-mem-hist-body">
                  <span className="ono-mem-hist-top">
                    <span className="ono-mem-hist-date">{formatDate(s.createdAt, 'short')}</span>
                    {s.durationSec > 0 && (
                      <span className="ono-mem-chip ono-mem-push">
                        <Icon src={icons.clock} size={12} color="currentColor" baseUrl={baseUrl} />
                        {formatDuration(s.durationSec)}
                      </span>
                    )}
                    {hVal != null && (
                      <span
                        className="ono-start-flag"
                        style={{ background: healthBg ? healthBg(hVal) : undefined, borderColor: healthBorder ? healthBorder(hVal) : undefined, color: healthColor ? healthColor(hVal) : undefined }}
                      >
                        HC {hVal}
                      </span>
                    )}
                  </span>
                  {s.aiSummary && <span className="ono-mem-hist-summary">{s.aiSummary}</span>}
                  {s.topicsCovered.length > 0 && (
                    <span className="ono-start-briefing-badges">
                      {s.topicsCovered.slice(0, 3).map((hl, hi) => (
                        <span key={`${hi}-${hl}`} className="ono-start-topic-badge">{hl}</span>
                      ))}
                    </span>
                  )}
                  <span className="ono-mem-hist-meta">
                    {(s.keyDecisions?.length ?? 0) > 0 && (
                      <span>{L.keyDecisions} <strong>{s.keyDecisions.length}{L.countUnit}</strong></span>
                    )}
                    {mine.length > 0 && (
                      <span>{L.myActionItems} <strong>{doneCount}/{mine.length} {L.completed}</strong></span>
                    )}
                  </span>
                </span>
                <Icon src={icons.arrow} size={14} color="var(--text-tertiary)" baseUrl={baseUrl} />
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ── 탭 ───────────────────────────────────────────────── */
function TabNav({ tab, onChange, enabled, L }) {
  const tabs = [
    { id: 'prep', label: L.tabPrep, desc: L.tabPrepDesc },
    { id: 'meeting', label: L.tabMeeting, desc: L.tabMeetingDesc },
    { id: 'result', label: L.tabResult, desc: L.tabResultDesc },
    { id: 'history', label: L.tabHistory, desc: L.tabHistoryDesc },
  ];
  return (
    <div role="tablist" className="ono-mem-tabs">
      {tabs.map((t) => {
        const on = tab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={on}
            className={`ono-mem-tab${on ? ' is-active' : ''}`}
            onClick={() => enabled[t.id] && onChange(t.id)}
            disabled={!enabled[t.id]}
          >
            <span className="ono-mem-tab-label">{t.label}</span>
            <span className="ono-mem-tab-desc">{t.desc}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ── 캔버스 ───────────────────────────────────────────── */
export default function OneOnOneMemberCanvas({
  tab = 'prep',
  onTabChange,
  manager = { name: '', avatar: '' },
  /** 진행 중인 세션(ready|live). 없으면 null. */
  session = null,
  /** 결과 탭에 보여줄 완료 세션. */
  resultSession = null,
  sessions = [],
  healthHistory = [],
  okrStatus = [],
  isHost = false,
  labels: providedLabels,
  icons: providedIcons,
  baseUrl = '',
  /** 날짜/기간 포맷·헬스 색은 호스트가 소유한다(시간대·i18n). */
  formatDate = (v) => String(v ?? ''),
  formatDuration = (s) => `${Math.round(s / 60)}m`,
  healthColor,
  healthBg,
  healthBorder,
  deadlineOf,
  /** 아바타 렌더 콜백 — 호스트 Avatar 주입. */
  renderAvatar,
  onTopicsChange = () => {},
  onSaveNotes = () => {},
  onToggleAction = () => {},
  onStart = () => {},
}) {
  const L = mergeLabels(DEFAULT_LABELS, providedLabels);
  const icons = { ...DEFAULT_ICONS, ...(providedIcons || {}) };
  const status = session?.status ?? (resultSession ? 'done' : null);
  const enabled = {
    prep: status === 'ready' || status === null,
    meeting: status === 'live',
    result: status === 'done' || !!resultSession,
    history: true,
  };
  const avatar = renderAvatar ? renderAvatar({ name: manager.name, avatar: manager.avatar, size: 32 }) : null;
  const smallAvatar = renderAvatar ? renderAvatar({ name: manager.name, avatar: manager.avatar, size: 24 }) : null;
  const shared = { L, icons, baseUrl, formatDate, formatDuration };

  return (
    <div className="ono-mem" data-testid="ono-member-canvas">
      <TabNav tab={tab} onChange={onTabChange} enabled={enabled} L={L} />

      {tab === 'prep' && (session && session.status === 'ready' ? (
        <PrepScreen
          {...shared}
          session={session} manager={manager} avatar={avatar} okrStatus={okrStatus}
          healthHistory={healthHistory} isHost={isHost} healthColor={healthColor}
          onTopicsChange={onTopicsChange} onStart={onStart}
        />
      ) : <div className="ono-mem-empty">{L.noPrepSession}</div>)}

      {tab === 'meeting' && (session && session.status === 'live' ? (
        <MeetingScreen {...shared} session={session} manager={manager} avatar={avatar} onSaveNotes={onSaveNotes} />
      ) : <div className="ono-mem-empty">{L.noLiveSession}</div>)}

      {tab === 'result' && (resultSession ? (
        <ResultScreen
          {...shared}
          session={resultSession} manager={manager} avatar={avatar}
          deadlineOf={deadlineOf} onToggleAction={onToggleAction}
        />
      ) : <div className="ono-mem-empty">{L.noResultSession}</div>)}

      {tab === 'history' && (
        <HistoryScreen
          {...shared}
          sessions={sessions} manager={manager} avatar={smallAvatar}
          healthHistory={healthHistory}
          healthColor={healthColor} healthBg={healthBg} healthBorder={healthBorder}
          onToggleAction={onToggleAction}
        />
      )}
    </div>
  );
}
