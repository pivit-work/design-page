import { useState, useEffect } from 'react';

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
 * pivit-work 가 시안을 보고 직접 그렸고, 그 과정에서 `#3D5AFE`·`DM Mono` 같은
 * 자체 토큰이 박혀 나머지 화면과 팔레트가 갈렸다. 이 캔버스가 그 빈자리다.
 *
 * ## 색은 이 도메인이 이미 쓰던 토큰을 따른다
 *
 * 시안의 하드코딩 색을 그대로 옮기지 않고 `one_on_one.css` 가 쓰는 토큰
 * (`--utility-blue-*` · `--utility-purple-*` · `--text-brand-*`) 으로 매핑했다.
 * 매니저 1on1 화면과 같은 팔레트를 쓰는 것이 목적이다.
 *
 * ## 호스트가 소유하는 것
 *
 * 날짜/기간 포맷(사용자 시간대)·i18n 라벨·아바타 컴포넌트·마감 배지 색은
 * 전부 호스트가 계산해 넣는다(`oneonone/MemberCard` 와 같은 규약 —
 * "All color decisions are pre-computed by the caller").
 */

const C = {
  page: 'var(--bg-primary, #F4F5F9)',
  surface: 'var(--bg-quaternary, #FFFFFF)',
  panel: 'var(--bg-secondary, #F4F5F9)',
  border: 'var(--border-secondary, #E4E7EE)',
  text: 'var(--text-primary, #111827)',
  sub: 'var(--text-secondary, #6B7280)',
  muted: 'var(--text-tertiary, #9CA3AF)',
  accent: 'var(--utility-blue-500, #3D5AFE)',
  accentBg: 'var(--utility-blue-50, #EEF1FF)',
  ok: 'var(--utility-green-600, #059669)',
  okBg: 'var(--utility-green-50, #ECFDF5)',
  live: 'var(--utility-green-500, #10B981)',
  warn: 'var(--colors-warning-600, #D97706)',
  warnBg: 'var(--colors-warning-50, #FFFBEB)',
  danger: 'var(--colors-error-600, #DC2626)',
  dangerBg: 'var(--utility-error-50, #FEF2F2)',
  purple: 'var(--utility-purple-500, #7C3AED)',
  purpleBg: 'var(--utility-purple-50, #F5F3FF)',
  font: 'var(--font-family-body, Pretendard, sans-serif)',
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

const card = {
  background: C.surface,
  borderRadius: 12,
  border: `1px solid ${C.border}`,
  padding: '20px 24px',
};
const btn = {
  padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600,
  cursor: 'pointer', border: 'none', fontFamily: 'inherit', transition: 'all .15s',
};
const input = {
  width: '100%', padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: 8,
  fontSize: 14, color: C.text, background: C.panel, outline: 'none',
  fontFamily: 'inherit', boxSizing: 'border-box',
};

/* ── 공통 조각 ─────────────────────────────────────────── */
function StatusBadge({ status, L }) {
  const map = {
    ready: [L.badgeReady, C.accent, C.accentBg],
    live: [L.badgeLive, C.live, C.okBg],
    done: [L.badgeDone, C.sub, C.panel],
  };
  const [label, color, bg] = map[status] || map.ready;
  return (
    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: bg, color, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {status === 'live' && (
        <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: C.live, animation: 'ono-pulse 1.5s infinite' }} />
      )}
      {label}
    </span>
  );
}

function Readiness({ value, L }) {
  const c = value >= 80 ? C.ok : value >= 50 ? C.warn : C.danger;
  const label = value >= 80 ? L.readinessComplete : value >= 50 ? L.readinessInProgress : L.readinessNeeded;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: C.sub }}>{L.myReadiness}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: c, padding: '2px 8px', background: C.panel, borderRadius: 10 }}>{label}</span>
      </div>
      <div style={{ height: 6, background: C.border, borderRadius: 3 }}>
        <div style={{ height: '100%', width: `${value}%`, background: c, borderRadius: 3, transition: 'width .5s' }} />
      </div>
      <p style={{ fontSize: 11, color: C.muted, textAlign: 'right', marginTop: 2 }}>{value}%</p>
    </div>
  );
}

function Section({ title, icon, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }} aria-hidden="true">{icon}</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{title}</span>
        </span>
        <span aria-hidden="true" style={{ fontSize: 11, color: C.muted, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▼</span>
      </button>
      {open && <div style={{ padding: '0 24px 24px', borderTop: `1px solid ${C.border}` }}>{children}</div>}
    </div>
  );
}

function OkrBar({ value, forecast }) {
  const colors = { '🟢': C.ok, '🟡': C.warn, '🔴': C.danger };
  const c = (forecast && colors[forecast]) || C.accent;
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
      <span style={{ flex: 1, height: 6, background: C.border, borderRadius: 3, display: 'block' }}>
        <span style={{ display: 'block', height: '100%', width: `${value}%`, background: c, borderRadius: 3 }} />
      </span>
      <span style={{ fontSize: 12, fontWeight: 700, color: c, minWidth: 32, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{value}%</span>
      {forecast && <span style={{ fontSize: 13 }}>{forecast}</span>}
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
    <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: 15, color: C.live }}>
      {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>
      {children}
    </div>
  );
}

function Blockers({ items, L }) {
  if (!items?.length) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {items.map((b) => {
        const high = b.severity === 'high';
        return (
          <div key={b.id} style={{ background: high ? C.dangerBg : C.warnBg, padding: 12, borderRadius: 8, borderLeft: `3px solid ${high ? C.danger : C.warn}` }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: high ? C.danger : C.warn, margin: '0 0 5px' }}>
              {high ? L.blockerHigh : L.blockerMedium}
            </p>
            <p style={{ fontSize: 12, margin: 0, color: C.text }}>{b.text}</p>
          </div>
        );
      })}
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
        <linearGradient id="ono-hg-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.accent} stopOpacity={0.18} />
          <stop offset="100%" stopColor={C.accent} stopOpacity={0.01} />
        </linearGradient>
      </defs>
      {ticks.map((tk) => (
        <g key={tk}>
          <line x1={PL} y1={toY(tk)} x2={W - PR} y2={toY(tk)} stroke={C.border} strokeWidth={0.5} />
          <text x={PL - 6} y={toY(tk) + 3} textAnchor="end" fontSize={9} fill={C.muted}>{tk}</text>
        </g>
      ))}
      <path d={area} fill="url(#ono-hg-grad)" />
      <polyline points={pts} fill="none" stroke={C.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => {
        const x = toX(i), y = toY(clamp(v)), on = hover === i;
        return (
          <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: 'pointer' }}>
            <circle cx={x} cy={y} r={on ? 7 : 3.5} fill={healthColor ? healthColor(v) : C.accent} stroke={C.surface} strokeWidth={on ? 2 : 1} />
            {on && (
              <g>
                <rect x={x - 16} y={y - 24} width={32} height={18} rx={4} fill={C.text} />
                <text x={x} y={y - 12} textAnchor="middle" fontSize={10} fontWeight={700} fill={C.surface}>{v}</text>
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
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px', gap: 10, padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
      {cols.map((h) => (
        <span key={h} style={{ fontSize: 11, fontWeight: 600, color: C.sub, textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</span>
      ))}
    </div>
  );
}

function NoteGrid({ sections, L }) {
  return (
    <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
      <div style={{ padding: '16px 24px', borderBottom: `1px solid ${C.border}` }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>🗒️ {L.meetingNotes}</h2>
      </div>
      <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        {sections.map(({ key, label, content }) => (
          <div key={key}>
            <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 }}>{label}</span>
            <div style={{ padding: '12px 14px', background: C.panel, borderRadius: 8, fontSize: 13, lineHeight: 1.7, color: C.text, minHeight: 60 }}>
              {content || <span style={{ color: C.muted }}>—</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SessionHeader({ title, status, date, duration, avatar, L, gradient, children }) {
  return (
    <div style={{ ...card, background: gradient || C.surface, border: `1px solid ${C.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        {avatar}
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{title}</h1>
        <StatusBadge status={status} L={L} />
        {duration && (
          <span style={{ fontSize: 11, padding: '2px 8px', background: C.panel, color: C.sub, borderRadius: 10 }}>⏱ {duration}</span>
        )}
      </div>
      {date && <p style={{ fontSize: 12, color: C.sub, margin: '4px 0 0' }}>{date}</p>}
      {children}
    </div>
  );
}

/* ── ① 준비 (READY) ───────────────────────────────────── */
function PrepScreen({ session, manager, avatar, okrStatus, healthHistory, isHost, L, formatDate, healthColor, onTopicsChange, onStart }) {
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SessionHeader
        title={fill(L.sessionWith, { name: manager.name })}
        status="ready"
        date={formatDate(session.createdAt)}
        avatar={avatar}
        L={L}
        gradient={`linear-gradient(135deg, ${C.accentBg}, ${C.purpleBg})`}
      >
        <div style={{ marginTop: 14 }}><Readiness value={readiness} L={L} /></div>
      </SessionHeader>

      {prevActions.length > 0 && (
        <Section title={L.prevActionCheck} icon="📋">
          <div style={{ marginTop: 14 }}>
            <ColHeads cols={[L.colAction, L.colAssignee, L.colStatus]} />
            {prevActions.map((item, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px', gap: 8, padding: '10px 0', borderBottom: `1px solid ${C.border}`, alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: C.text }}>{item.text}</span>
                <span style={{ fontSize: 12, color: C.sub }}>{item.owner === 'member' ? L.roleMember : L.roleManager}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: item.done ? C.ok : C.warn, padding: '3px 8px', borderRadius: 10, background: item.done ? C.okBg : C.warnBg }}>
                  {item.done ? L.statusDone : L.statusPending}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {session.aiBriefing && (
        <Section title={L.aiSummary} icon="✨">
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 13, background: C.panel, padding: '12px 14px', borderRadius: 8, lineHeight: 1.7 }}>
              {session.aiBriefing.summary}
            </div>
            {session.aiBriefing.signals?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                {session.aiBriefing.signals.map((s, i) => (
                  <span key={i} style={{ padding: '3px 10px', background: C.okBg, color: C.ok, borderRadius: 20, fontSize: 12, fontWeight: 500 }}>{s}</span>
                ))}
              </div>
            )}
            {session.aiBriefing.unresolvedBlockers?.length > 0 && (
              <div style={{ marginTop: 14 }}><Blockers items={session.aiBriefing.unresolvedBlockers} L={L} /></div>
            )}
          </div>
        </Section>
      )}

      {okrStatus.length > 0 && (
        <Section title={L.okrContribution} icon="🎯">
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {okrStatus.map((kr, ki) => (
              <div key={`${ki}-${kr.id}`} style={{ padding: '11px 14px', background: C.panel, borderRadius: 10, border: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, color: C.muted, minWidth: 18 }}>KR</span>
                  <span style={{ fontSize: 13, flex: 1 }}>{kr.title}</span>
                  <OkrBar value={kr.progress} />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {healthHistory.length >= 2 && (
        <Section title={L.healthCheck} icon="🩺">
          <div style={{ marginTop: 14 }}>
            <HealthGraph data={healthHistory} healthColor={healthColor} ariaLabel={L.healthGraph} />
          </div>
        </Section>
      )}

      <div style={{ ...card, border: `2px solid ${C.accentBg}` }} data-testid="ono-topic-input">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 16 }} aria-hidden="true">💬</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{L.topicInputTitle}</span>
        </div>
        <p style={{ fontSize: 11, color: C.muted, margin: '0 0 12px', lineHeight: 1.6 }}>{L.topicInputDesc}</p>

        {topics.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {topics.map((topic, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: C.accentBg, color: C.accent, borderRadius: 20, fontSize: 13, fontWeight: 500 }}>
                {topic}
                <button type="button" aria-label={`${topic} 삭제`} onClick={() => onTopicsChange(topics.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.accent, padding: 0, fontSize: 14, lineHeight: 1 }}>×</button>
              </span>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTopic(); } }}
            placeholder={L.topicPlaceholder}
            style={{ ...input, flex: 1 }}
          />
          <button type="button" onClick={addTopic} disabled={!draft.trim()} style={{ ...btn, background: draft.trim() ? C.accent : C.border, color: draft.trim() ? C.surface : C.muted, fontSize: 13, padding: '8px 16px' }}>
            {L.addTopic}
          </button>
        </div>
        {topics.length === 0 && <p style={{ marginTop: 10, fontSize: 11, color: C.muted }}>{L.topicExamples}</p>}
      </div>

      {isHost && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0' }}>
          <span style={{ fontSize: 12, color: C.muted }}>{L.prepCompleteHint}</span>
          <button type="button" onClick={onStart} style={{ ...btn, background: C.accent, color: C.surface, minWidth: 140 }}>{L.startMeeting}</button>
        </div>
      )}
    </div>
  );
}

/* ── ② 미팅 (LIVE) ────────────────────────────────────── */
function MeetingScreen({ session, manager, avatar, L, onSaveNotes }) {
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ ...card, background: C.dangerBg, border: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          {avatar}
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{fill(L.liveWith, { name: manager.name })}</h1>
          <StatusBadge status="live" L={L} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 12, color: C.sub }}>{L.elapsed}</span>
          <ElapsedTimer from={startAt} />
        </div>
        <style>{'@keyframes ono-pulse{0%,100%{opacity:1}50%{opacity:.3}}'}</style>
      </div>

      {session.aiBriefing && (
        <div style={card}>
          <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📝 {L.prepSummary}</p>
          <p style={{ fontSize: 13, background: C.panel, padding: '12px 14px', borderRadius: 8, marginBottom: 12, lineHeight: 1.7 }}>
            {session.aiBriefing.summary}
          </p>
          <Blockers items={session.aiBriefing.unresolvedBlockers} L={L} />
        </div>
      )}

      {okrStatus.length > 0 && (
        <div style={card}>
          <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🎯 {L.okrStatus}</p>
          {okrStatus.map((kr, ki) => (
            <div key={`${ki}-${kr.id}`} style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 10, alignItems: 'center', padding: '8px 12px', background: C.panel, borderRadius: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 13 }}>{kr.title}</span>
              <OkrBar value={kr.progress} />
            </div>
          ))}
        </div>
      )}

      {session.agendaItems?.length > 0 && (
        <div style={card}>
          <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📌 {L.agenda}</p>
          {session.agendaItems.map((ag, i) => (
            <div key={ag.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: C.panel, borderRadius: 10, marginBottom: 8, borderLeft: `3px solid ${ag.addedDuring ? C.warn : C.accent}` }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: C.border, minWidth: 24 }}>{i + 1}</span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500, textDecoration: ag.checked ? 'line-through' : 'none', color: ag.checked ? C.muted : C.text }}>{ag.text}</span>
              {ag.checked && <span style={{ fontSize: 11, color: C.ok, fontWeight: 600 }}>✓</span>}
            </div>
          ))}
        </div>
      )}

      {prevActions.length > 0 && (
        <div style={card}>
          <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>⚠️ {L.pendingActions}</p>
          {prevActions.map((a, i) => (
            <div key={i} style={{ padding: '8px 12px', background: C.warnBg, borderRadius: 8, marginBottom: 6, borderLeft: `3px solid ${C.warn}`, fontSize: 13 }}>{a.text}</div>
          ))}
        </div>
      )}

      <div style={{ background: C.warnBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 16px', fontSize: 12, color: C.warn, lineHeight: 1.7 }}>
        <strong>{L.recordingNotice}</strong><br />
        <span style={{ fontWeight: 600 }}>{L.privateMemoLabel}</span>{L.privateMemoGuide}
      </div>

      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 18 }} aria-hidden="true">📝</span>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{L.privateMemo}</span>
        </div>
        <p style={{ fontSize: 11, color: C.muted, margin: '0 0 10px' }}>{L.privateMemoDesc}</p>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder={L.memoPlaceholder}
          rows={8}
          style={{ ...input, resize: 'vertical', lineHeight: 1.6 }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" onClick={save} style={{ ...btn, background: saved ? C.ok : C.accent, color: C.surface, fontSize: 13, padding: '8px 18px' }}>
            {saved ? L.saved : L.save}
          </button>
        </div>
      </div>

      <p style={{ textAlign: 'center', padding: 10, color: C.muted, fontSize: 13 }}>{L.meetingEndByManager}</p>
    </div>
  );
}

/* ── ③ 결과 (DONE) ────────────────────────────────────── */
function ActionRow({ item, L, deadlineOf, onToggle, muted }) {
  const dm = deadlineOf ? deadlineOf(item) : null;
  return (
    <div
      onClick={onToggle ? () => onToggle(item.id) : undefined}
      style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px', gap: 10, padding: '12px 0', borderBottom: `1px solid ${C.border}`, alignItems: 'center', cursor: onToggle ? 'pointer' : 'default', opacity: muted ? 0.7 : 1 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {onToggle && (
          <span style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, background: item.done ? C.ok : 'transparent', border: `2px solid ${item.done ? C.ok : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {item.done && <span style={{ color: C.surface, fontSize: 10, fontWeight: 700 }}>✓</span>}
          </span>
        )}
        <span style={{ fontSize: 13, textDecoration: item.done && onToggle ? 'line-through' : 'none', color: item.done && onToggle ? C.muted : C.text }}>{item.text}</span>
      </div>
      <span style={{ fontSize: 12, color: C.sub }}>{item.owner === 'member' ? L.roleMember : L.roleManager}</span>
      {dm ? (
        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: dm.bg, border: `1px solid ${dm.bd}`, color: dm.color }}>{dm.label}</span>
      ) : (
        <span style={{ fontSize: 12, color: C.muted }}>—</span>
      )}
    </div>
  );
}

function ResultScreen({ session, manager, avatar, L, formatDate, formatDuration, deadlineOf, onToggleAction }) {
  const myActions = session.actionItems.filter((a) => a.owner === 'member');
  const managerActions = session.actionItems.filter((a) => a.owner === 'manager');
  const doneCount = myActions.filter((a) => a.done).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SessionHeader
        title={fill(L.doneWith, { name: manager.name })}
        status="done"
        date={formatDate(session.createdAt)}
        duration={session.durationSec > 0 ? formatDuration(session.durationSec) : null}
        avatar={avatar}
        L={L}
        gradient={`linear-gradient(135deg, ${C.okBg}, ${C.accentBg})`}
      />

      {session.isShared === false ? (
        <div style={card}>
          <div style={{ textAlign: 'center', padding: '32px 16px', color: C.muted }}>
            <div style={{ fontSize: 28, marginBottom: 12 }} aria-hidden="true">📋</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.sub, marginBottom: 4 }}>{L.managerPreparing}</div>
            <div style={{ fontSize: 12 }}>{L.noSummary}</div>
          </div>
        </div>
      ) : (
        <>
          <NoteGrid
            L={L}
            sections={[
              { key: 'summary', label: `💬 ${L.mainDiscussion}`, content: session.aiSummary },
              { key: 'decisions', label: `✅ ${L.keyDecisions}`, content: session.keyDecisions?.join('\n') },
              { key: 'topics', label: `📌 ${L.topicsCovered}`, content: session.topicsCovered?.join(', ') },
              { key: 'nextTopics', label: `📋 ${L.nextAgenda}`, content: session.nextTopics?.join(', ') },
            ]}
          />

          <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>✅ {L.myActionItems}</h2>
              <span style={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>{doneCount}/{myActions.length} {L.completed}</span>
            </div>
            <div style={{ padding: '0 24px' }}>
              <div style={{ height: 5, background: C.panel, borderRadius: 99, margin: '16px 0' }}>
                <div style={{ height: '100%', borderRadius: 99, background: C.accent, width: `${myActions.length ? (doneCount / myActions.length) * 100 : 0}%`, transition: 'width .3s' }} />
              </div>
              <ColHeads cols={[L.colContent, L.colAssignee, L.colDeadline]} />
              {myActions.map((item) => (
                <ActionRow key={item.id} item={item} L={L} deadlineOf={deadlineOf} onToggle={onToggleAction} />
              ))}

              {managerActions.length > 0 && (
                <div style={{ paddingTop: 16, marginTop: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>{L.managerActions}</div>
                  {managerActions.map((item) => (
                    <ActionRow key={item.id} item={item} L={L} deadlineOf={deadlineOf} muted />
                  ))}
                </div>
              )}

              {session.actionItems.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px 0', color: C.muted, fontSize: 12 }}>{L.noActions}</div>
              )}
            </div>
          </div>

          {session.emotionTone && (
            <div style={card}>
              <SectionLabel>{L.emotionTone}</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { key: 'positive', label: L.emotionPositive, value: session.emotionTone.positive, color: C.ok },
                  { key: 'neutral', label: L.emotionNeutral, value: session.emotionTone.neutral, color: C.muted },
                  { key: 'negative', label: L.emotionNegative, value: session.emotionTone.negative, color: C.danger },
                ].map((row) => {
                  const total = session.emotionTone.positive + session.emotionTone.neutral + session.emotionTone.negative;
                  const pct = total > 0 ? Math.round((row.value / total) * 100) : 0;
                  return (
                    <div key={row.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 11, color: C.sub, minWidth: 28 }}>{row.label}</span>
                      <span style={{ flex: 1, height: 8, background: C.panel, borderRadius: 99, display: 'block' }}>
                        <span style={{ display: 'block', height: '100%', borderRadius: 99, background: row.color, width: `${pct}%`, transition: 'width .3s' }} />
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: row.color, fontVariantNumeric: 'tabular-nums', minWidth: 32, textAlign: 'right' }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── ④ 히스토리 (HISTORY) ─────────────────────────────── */
function HistoryDetail({ session, manager, avatar, L, formatDate, formatDuration, onBack, onToggleAction }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ ...card, background: `linear-gradient(135deg, ${C.accentBg}, ${C.purpleBg})`, border: `1px solid ${C.border}` }}>
        <button type="button" onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: C.accent, fontSize: 13, fontWeight: 600, padding: 0, marginBottom: 10 }}>
          ← {L.backToHistory}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          {avatar}
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{fill(L.sessionWith, { name: manager.name })}</h1>
          <StatusBadge status="done" L={L} />
          {session.durationSec > 0 && (
            <span style={{ fontSize: 11, padding: '2px 8px', background: C.panel, color: C.sub, borderRadius: 10 }}>⏱ {formatDuration(session.durationSec)}</span>
          )}
        </div>
        <p style={{ fontSize: 12, color: C.sub, margin: '4px 0 0' }}>{formatDate(session.createdAt)}</p>
      </div>

      {session.aiSummary && (
        <NoteGrid
          L={L}
          sections={[
            { key: 'summary', label: `💬 ${L.mainDiscussion}`, content: session.aiSummary },
            { key: 'decisions', label: `✅ ${L.keyDecisions}`, content: session.keyDecisions?.join('\n') },
            { key: 'topics', label: `📌 ${L.topicsCovered}`, content: session.topicsCovered?.join(', ') },
            { key: 'next', label: `📋 ${L.nextAgenda}`, content: session.nextTopics?.join(', ') },
          ]}
        />
      )}

      {session.actionItems.length > 0 && (
        <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>✅ {L.myActionItems}</h2>
            <span style={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>{session.actionItems.length}{L.count}</span>
          </div>
          <div style={{ padding: '0 24px' }}>
            <ColHeads cols={[L.colContent, L.colAssignee, L.colStatus]} />
            {session.actionItems.map((item) => (
              <div
                key={item.id}
                onClick={() => onToggleAction(item.id)}
                style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px', gap: 10, padding: '12px 0', borderBottom: `1px solid ${C.border}`, alignItems: 'center', cursor: 'pointer' }}
              >
                <span style={{ fontSize: 13, color: C.text }}>{item.text}</span>
                <span style={{ fontSize: 12, color: C.sub }}>{item.owner === 'member' ? L.roleMember : L.roleManager}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: item.done ? C.ok : C.warn }}>{item.done ? L.statusDone : L.statusPending}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryScreen({ sessions, manager, avatar, healthHistory, L, formatDate, formatDuration, healthColor, healthBg, healthBorder, onToggleAction }) {
  const [selectedId, setSelectedId] = useState(null);
  const done = sessions.filter((s) => s.status === 'done');
  const selected = done.find((s) => s.id === selectedId);

  if (selected) {
    return (
      <HistoryDetail
        session={selected} manager={manager} avatar={avatar} L={L}
        formatDate={formatDate} formatDuration={formatDuration}
        onBack={() => setSelectedId(null)} onToggleAction={onToggleAction}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>📂 {L.historyTitle}</h2>
            <p style={{ fontSize: 12, color: C.sub, margin: '4px 0 0' }}>{fill(L.totalCount, { count: done.length })}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {avatar}
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{manager.name}</span>
          </div>
        </div>
      </div>

      {done.length === 0 ? (
        <div style={card}>
          <div style={{ textAlign: 'center', padding: '24px 0', color: C.muted, fontSize: 12 }}>{L.pastSessionsEmpty}</div>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: 19, top: 24, bottom: 24, width: 2, background: C.border, zIndex: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {done.map((s, i) => {
              const mine = s.actionItems.filter((a) => a.owner === 'member');
              const doneCount = mine.filter((a) => a.done).length;
              const hIdx = healthHistory.length - 1 - i;
              const hVal = hIdx >= 0 && hIdx < healthHistory.length ? healthHistory[hIdx] : null;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  data-testid="ono-history-row"
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 14, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 20px', cursor: 'pointer', textAlign: 'left', position: 'relative', zIndex: 1, width: '100%', fontFamily: 'inherit' }}
                >
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: i === 0 ? C.accent : C.border, border: `3px solid ${i === 0 ? C.accentBg : C.panel}`, marginTop: 4, flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{formatDate(s.createdAt, 'short')}</span>
                      {s.durationSec > 0 && (
                        <span style={{ fontSize: 11, padding: '2px 8px', background: C.panel, color: C.sub, borderRadius: 10, marginLeft: 'auto' }}>⏱ {formatDuration(s.durationSec)}</span>
                      )}
                      {hVal != null && (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: healthBg ? healthBg(hVal) : C.panel, border: `1px solid ${healthBorder ? healthBorder(hVal) : C.border}`, color: healthColor ? healthColor(hVal) : C.text }}>HC {hVal}</span>
                      )}
                    </span>
                    {s.aiSummary && (
                      <span style={{ display: 'block', fontSize: 12, color: C.sub, marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.aiSummary.slice(0, 80)}…</span>
                    )}
                    {s.topicsCovered.length > 0 && (
                      <span style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                        {s.topicsCovered.slice(0, 3).map((hl, hi) => (
                          <span key={`${hi}-${hl}`} style={{ padding: '3px 10px', background: C.okBg, color: C.ok, borderRadius: 20, fontSize: 11, fontWeight: 500 }}>✓ {hl}</span>
                        ))}
                      </span>
                    )}
                    <span style={{ display: 'flex', gap: 16 }}>
                      {(s.keyDecisions?.length ?? 0) > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 11, color: C.sub }}>{L.keyDecisions}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: C.accent }}>{s.keyDecisions.length}{L.countUnit}</span>
                        </span>
                      )}
                      {mine.length > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 11, color: C.sub }}>{L.myActionItems}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: doneCount === mine.length ? C.ok : C.warn }}>{doneCount}/{mine.length} {L.completed}</span>
                        </span>
                      )}
                    </span>
                  </span>
                  <span aria-hidden="true" style={{ fontSize: 14, color: C.muted, marginTop: 4, flexShrink: 0 }}>→</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
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
    <div role="tablist" style={{ display: 'flex', background: C.surface, borderBottom: `1px solid ${C.border}`, marginBottom: 16 }}>
      {tabs.map((t) => {
        const on = tab === t.id;
        const can = enabled[t.id];
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => can && onChange(t.id)}
            disabled={!can}
            style={{
              padding: '10px 20px', border: 'none', cursor: can ? 'pointer' : 'default',
              borderBottom: `3px solid ${on ? C.accent : 'transparent'}`,
              background: 'transparent', fontFamily: 'inherit', textAlign: 'left',
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1,
              opacity: can ? 1 : 0.4,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: on ? 700 : 500, color: on ? C.accent : C.sub }}>{t.label}</span>
            <span style={{ fontSize: 10, color: C.muted }}>{t.desc}</span>
          </button>
        );
      })}
    </div>
  );
}

function Empty({ icon, text }) {
  return (
    <div style={card}>
      <div style={{ textAlign: 'center', padding: '32px 16px', color: C.muted }}>
        <div style={{ fontSize: 28, marginBottom: 12 }} aria-hidden="true">{icon}</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.sub }}>{text}</div>
      </div>
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
  const status = session?.status ?? (resultSession ? 'done' : null);
  const enabled = {
    prep: status === 'ready' || status === null,
    meeting: status === 'live',
    result: status === 'done' || !!resultSession,
    history: true,
  };
  const avatar = renderAvatar ? renderAvatar({ name: manager.name, avatar: manager.avatar, size: 32 }) : null;
  const smallAvatar = renderAvatar ? renderAvatar({ name: manager.name, avatar: manager.avatar, size: 28 }) : null;

  return (
    <div style={{ background: C.page, fontFamily: C.font }} data-testid="ono-member-canvas">
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px' }}>
        <TabNav tab={tab} onChange={onTabChange} enabled={enabled} L={L} />

        {tab === 'prep' && (session && session.status === 'ready' ? (
          <PrepScreen
            session={session} manager={manager} avatar={avatar} okrStatus={okrStatus}
            healthHistory={healthHistory} isHost={isHost} L={L}
            formatDate={formatDate} healthColor={healthColor}
            onTopicsChange={onTopicsChange} onStart={onStart}
          />
        ) : <Empty icon="📝" text={L.noPrepSession} />)}

        {tab === 'meeting' && (session && session.status === 'live' ? (
          <MeetingScreen session={session} manager={manager} avatar={avatar} L={L} onSaveNotes={onSaveNotes} />
        ) : <Empty icon="🎙️" text={L.noLiveSession} />)}

        {tab === 'result' && (resultSession ? (
          <ResultScreen
            session={resultSession} manager={manager} avatar={avatar} L={L}
            formatDate={formatDate} formatDuration={formatDuration}
            deadlineOf={deadlineOf} onToggleAction={onToggleAction}
          />
        ) : <Empty icon="📋" text={L.noResultSession} />)}

        {tab === 'history' && (
          <HistoryScreen
            sessions={sessions} manager={manager} avatar={smallAvatar}
            healthHistory={healthHistory} L={L}
            formatDate={formatDate} formatDuration={formatDuration}
            healthColor={healthColor} healthBg={healthBg} healthBorder={healthBorder}
            onToggleAction={onToggleAction}
          />
        )}
      </div>
    </div>
  );
}
