import { useState, useEffect, useRef } from 'react';
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
  feedback: '/icons-solid/message-heart-circle.svg',
  evidence: '/icons-solid/search-md.svg',
  transcript: '/icons-solid/message-text-square-02.svg',
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
  recordingNotice: '녹음 시작과 종료는 매니저 화면에서 진행됩니다',
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
  managerFeedback: '매니저 피드백',
  feedbackStrengths: '관찰한 강점',
  feedbackSbi: '개선 피드백 (SBI)',
  feedbackSupport: '지원 계획',
  evidenceToggle: '근거 발췌 {count}',
  evidenceCaption: '이 피드백의 근거가 된 대화 발췌입니다',
  evidenceEdited: '매니저가 본문을 다듬었습니다 — 발췌는 원본 대화 기준입니다',
  evidenceLoading: '근거 발췌 불러오는 중…',
  evidenceError: '근거를 불러올 수 없습니다.',
  evidenceRetry: '다시 시도',
  evidenceSpeakerManager: '{name} 매니저',
  evidenceSpeakerMe: '나',
  evidenceJump: '전문에서 보기',
  evidenceJumpMissing: '해당 구간을 찾을 수 없습니다',
  viewModeFull: '열람 모드 · 풀버전',
  recheckNeeded: '재점검 필요',
  transcriptTitle: 'STT 스크립트',
  transcriptNotShared: '대화 원문은 매니저가 공개하지 않았습니다',
  transcriptEmpty: '이 회차에는 대화 기록이 없습니다',
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

/**
 * 그 회차를 진행한 호스트(매니저) — **회차가 들고 있는 값이 먼저다** (PW-211).
 *
 * `manager` prop 은 화면 단위로 하나뿐이고 **현재** 매니저를 가리킨다. 그걸 과거
 * 회차에 그대로 쓰면 매니저가 바뀐 구성원은 히스토리가 통째로 현재 매니저 이름으로
 * 보인다 — 제목·아바타뿐 아니라 근거 발췌의 화자까지 남의 이름이 붙는다.
 * (dev 실측: 김우진이 한 말이 `박우진 매니저` 로 표시)
 *
 * 회차에 이름이 없는 응답(구버전)에서는 화면 단위 매니저로 폴백한다.
 */
function hostOf(session, manager) {
  const fallback = manager || {};
  return {
    name: session?.managerName || fallback.name || '',
    avatar: session?.managerAvatar || fallback.avatar || '',
  };
}

/**
 * 그 회차의 헬스체크 — **회차가 들고 있는 값만 쓴다** (PW-213).
 *
 * 예전에는 화면 단위 `healthHistory` 를 회차 목록에 순서로 갖다 붙였다
 * (`healthHistory[healthHistory.length - 1 - i]`). 두 배열은 짝이 아니다 —
 * `healthHistory` 는 최근 30일 스니핏 최대 10개이고 회차 목록은 기간 제한 없는
 * DONE 1on1 전체라, 길이도 시간 축도 다르다. 두 달 전 회차 옆에 어제 점수가 붙었고,
 * 회차가 더 많으면 오래된 행부터 배지가 통째로 사라졌다.
 *
 * 값이 없으면 **숫자를 지어내지 않고 배지를 감춘다**(`null` 반환). 인덱스로 짝짓기는
 * 순서가 어긋나는 순간 조용히 틀리므로, 없는 값은 없는 채로 두는 편이 낫다.
 */
function healthOf(session) {
  const v = session?.healthScore;
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

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

/**
 * 발화 한 줄의 앵커 id — 서버가 발췌에 붙이는 `anchor` 와 **같은 규칙**이다
 * (`feedback-evidence.util.ts#toAnchor`: `stt-` + timestamp 의 `:` 를 `-` 로).
 * 규칙이 갈리면 「전문에서 보기」가 조용히 아무 데도 못 간다.
 */
const transcriptAnchor = (line) =>
  `stt-${String(line?.timestamp ?? '').replace(/:/g, '-')}`;

/**
 * 대화 원문(STT 스크립트) — 회의록 풀버전의 "원본" (PW-81 · policy §10.7.2).
 *
 * 요약이 원문의 자리를 대신하지 않도록, 공개된 회차는 발화를 **전량** 그린다.
 * 잘라 놓고 "미리보기" 라고 부르지 않는다.
 *
 * 공개되지 않은 회차에서도 **섹션 자체는 그린다.** 숨기면 구성원은 "원문이 원래
 * 없는 것" 과 "매니저가 공개하지 않은 것" 을 구분할 수 없다.
 */
function TranscriptSection({ session, managerName, L, icons, baseUrl, hit, containerRef }) {
  const lines = session.sttTranscript ?? [];
  const shared = session.sttShared === true;
  const speakerLabel = (line) =>
    line.speaker === 'host'
      ? fill(L.evidenceSpeakerManager, { name: managerName })
      : L.evidenceSpeakerMe;

  return (
    <Section
      title={L.transcriptTitle}
      icon={icons.transcript}
      icons={icons}
      baseUrl={baseUrl}
      collapsible={false}
    >
      <div className="ono-mem-transcript" ref={containerRef} data-testid="ono-transcript">
        {!shared ? (
          <p className="ono-mem-transcript-note" data-testid="ono-transcript-locked">
            {L.transcriptNotShared}
          </p>
        ) : lines.length === 0 ? (
          <p className="ono-mem-transcript-note">{L.transcriptEmpty}</p>
        ) : (
          lines.map((line, i) => {
            const anchor = transcriptAnchor(line);
            return (
              <div
                key={`${anchor}-${i}`}
                data-anchor={anchor}
                data-testid="ono-transcript-line"
                className={`ono-mem-transcript-line${hit === anchor ? ' is-hit' : ''}`}
              >
                <span className="ono-mem-transcript-meta">
                  <span className="ono-mem-evidence-speaker">{speakerLabel(line)}</span>
                  {line.timestamp && <span>· {line.timestamp}</span>}
                </span>
                <p className="ono-mem-transcript-text">{line.text}</p>
              </div>
            );
          })
        )}
      </div>
    </Section>
  );
}

/**
 * 근거 발췌 토글 (PW-103 · `screen-oneonone-session.policy.md` §6.5.1).
 *
 * 공개된 매니저 피드백은 AI 가 대화를 압축한 결과물이라, 멤버는 결과만 받고
 * "왜 이런 피드백인지"를 확인할 수 없었다. 항목마다 근거가 된 대화 원문을
 * 펼쳐 볼 수 있게 한다.
 *
 * - 발췌 0건이면 **토글 자체를 그리지 않는다** — 빈 패널도, "근거 없음" 문구도 없다.
 * - 항목별로 독립 토글이다. 한 항목을 펼쳐도 나머지는 접힌 채로 둔다.
 * - 어떤 발췌가 보이는지는 서버가 이미 걸러 보낸다. 여기서 출처를 거르지 않는다.
 */
function EvidenceToggle({ items, managerName, edited, L, icons, baseUrl, jump }) {
  const [open, setOpen] = useState(false);
  if (!items || items.length === 0) return null;

  const speakerLabel = (ev) =>
    ev.speaker === 'host'
      ? fill(L.evidenceSpeakerManager, { name: managerName })
      : L.evidenceSpeakerMe;

  return (
    <div className="ono-mem-evidence">
      <button
        type="button"
        className="ono-mem-evidence-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <Icon src={icons.evidence} size={12} color="currentColor" baseUrl={baseUrl} />
        {fill(L.evidenceToggle, { count: items.length })}
        <Icon src={icons.chevron} size={12} color="currentColor" baseUrl={baseUrl} />
      </button>

      {open && (
        <div className="ono-mem-evidence-body">
          <p className="ono-mem-evidence-caption">{L.evidenceCaption}</p>
          {items.map((ev, i) => (
            <div className="ono-mem-evidence-row" key={`${ev.timestamp ?? 'x'}-${i}`}>
              <div className="ono-mem-evidence-meta">
                <span className="ono-mem-evidence-speaker">{speakerLabel(ev)}</span>
                {ev.timestamp && <span>· {ev.timestamp}</span>}
              </div>
              <p className="ono-mem-evidence-text">{ev.text}</p>
              {/* 전문 공개(PW-81)된 회차에서만 원문의 그 자리로 보낸다. 앵커에 해당하는
                  발화가 전문에 없으면 비활성으로 그린다 — 눌러 놓고 아무 일도 안
                  일어나면 화면이 고장 난 것처럼 보인다. */}
              {jump?.enabled && (
                <button
                  type="button"
                  className="ono-mem-evidence-jump"
                  data-testid="ono-evidence-jump"
                  disabled={!jump.has(ev.anchor)}
                  title={jump.has(ev.anchor) ? undefined : L.evidenceJumpMissing}
                  onClick={() => jump.to(ev.anchor)}
                >
                  {L.evidenceJump}
                  <Icon src={icons.arrow} size={12} color="currentColor" baseUrl={baseUrl} />
                </button>
              )}
            </div>
          ))}
          {edited && <p className="ono-mem-evidence-caption">{L.evidenceEdited}</p>}
        </div>
      )}
    </div>
  );
}

/**
 * 공개된 매니저 피드백 3항목 + 항목별 근거 발췌 (PW-103 · policy §6.5).
 *
 * 발췌 로딩·실패가 **본문 표시를 막지 않는다.** 본문은 먼저 그리고, 발췌 자리에만
 * 상태 문구를 둔다 — 근거를 못 불러왔다고 피드백을 못 읽게 되면 안 된다.
 */
function ManagerFeedback({ session, evidence, loading, error, onRetry, managerName, L, icons, baseUrl, jump }) {
  const items = session.managerFeedback ?? [];
  if (items.length === 0) return null;

  const titleOf = (key) =>
    ({
      strengths: L.feedbackStrengths,
      sbi: L.feedbackSbi,
      support: L.feedbackSupport,
    }[key] ?? key);

  const evidenceOf = (key) => (evidence?.items ?? []).find((e) => e.key === key);

  return (
    <Section
      title={L.managerFeedback}
      icon={icons.feedback}
      icons={icons}
      baseUrl={baseUrl}
      collapsible={false}
    >
      <div className="ono-mem-feedback">
        {items.map((item) => (
          <div className="ono-mem-feedback-box" key={item.key}>
            <div className="ono-mem-note-label">{titleOf(item.key)}</div>
            <p className="ono-mem-feedback-text">{item.text}</p>

            {loading && <p className="ono-mem-evidence-status">{L.evidenceLoading}</p>}
            {!loading && error && (
              <p className="ono-mem-evidence-status">
                {L.evidenceError}{' '}
                <button type="button" className="ono-mem-evidence-retry" onClick={onRetry}>
                  {L.evidenceRetry}
                </button>
              </p>
            )}
            {!loading && !error && (
              <EvidenceToggle
                items={evidenceOf(item.key)?.evidence}
                managerName={managerName}
                edited={evidenceOf(item.key)?.edited}
                L={L}
                icons={icons}
                baseUrl={baseUrl}
                jump={jump}
              />
            )}
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
          <div className="ono-start-briefing-text-box">
            <p className="ono-start-briefing-text">{session.aiBriefing.summary}</p>
          </div>
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
          <div className="ono-start-briefing-text-box">
            <p className="ono-start-briefing-text">{session.aiBriefing.summary}</p>
          </div>
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
        <Icon src={icons.alert} size={12} color="currentColor" baseUrl={baseUrl} />
        <span>{L.recordingNotice}</span>
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

/**
 * 대화 분위기 — 결과 탭과 회의록 풀버전(PW-81)이 같은 규격으로 그린다.
 * 두 화면이 각자 그리면 한쪽만 고쳐지는 일이 생긴다.
 */
function EmotionTone({ session, L, icons, baseUrl }) {
  const tone = session.emotionTone;
  const total = tone.positive + tone.neutral + tone.negative;
  const rows = [
    { key: 'positive', label: L.emotionPositive, value: tone.positive, color: 'var(--utility-green-600)' },
    { key: 'neutral', label: L.emotionNeutral, value: tone.neutral, color: 'var(--text-tertiary)' },
    { key: 'negative', label: L.emotionNegative, value: tone.negative, color: 'var(--colors-error-600)' },
  ];
  return (
    <Section title={L.emotionTone} icon={icons.health} icons={icons} baseUrl={baseUrl}>
      {rows.map((row) => {
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
  );
}

function ResultScreen({ session, manager, avatar, renderAvatar, L, icons, baseUrl, formatDate, formatDuration, deadlineOf, onToggleAction, feedbackEvidence }) {
  const myActions = session.actionItems.filter((a) => a.owner === 'member');
  const managerActions = session.actionItems.filter((a) => a.owner === 'manager');
  const doneCount = myActions.filter((a) => a.done).length;

  // 결과 탭이 늘 최신 회차인 것은 아니다 — 호스트가 지난 완료 회차를 넘길 수 있다.
  const host = hostOf(session, manager);
  const hostAvatar = renderAvatar
    ? renderAvatar({ name: host.name, avatar: host.avatar, size: 32 })
    : avatar;

  return (
    <>
      <SessionHeader
        title={fill(L.doneWith, { name: host.name })}
        status="done"
        date={formatDate(session.createdAt)}
        duration={session.durationSec > 0 ? formatDuration(session.durationSec) : null}
        avatar={hostAvatar}
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

          {/* 공개된 매니저 피드백 + 근거 발췌 (PW-103) */}
          <ManagerFeedback
            session={session}
            managerName={host.name}
            L={L} icons={icons} baseUrl={baseUrl}
            {...(feedbackEvidence || {})}
          />

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
            <EmotionTone session={session} L={L} icons={icons} baseUrl={baseUrl} />
          )}
        </>
      )}
    </>
  );
}

/* ── ④ 히스토리 (HISTORY) ─────────────────────────────── */
/**
 * 회의록 **풀버전** 상세 (PW-81 · policy §10.7.2 · TC-1ON1-115).
 *
 * 예전에는 여기가 목록 행에 이미 보이던 AI 요약을 상자 몇 개로 되풀이하는
 * **요약 발췌본**이었다. 지난 회의를 열어도 실제로 오간 대화는 어디에도 없었다.
 * 기획은 이 화면을 "DONE 회의록 전체" 로 정의한다 — 요약 전문 · 결정사항 ·
 * 재점검 필요 · 대화 분위기 · OKR 당시 스냅샷 · 피드백 · 액션 · **대화 원문**.
 *
 * 코칭 지표(발화 비율·반복 패턴·대화 분석)는 여기 넣지 않는다 — 멤버 공개 범위 밖이다.
 */
function HistoryDetail({ session, manager, avatar, renderAvatar, L, icons, baseUrl, formatDate, formatDuration, onBack, onToggleAction, feedbackEvidence }) {
  // 지난 회차는 지금 매니저가 아니라 **그때 그 매니저**의 것이다 (PW-211).
  const host = hostOf(session, manager);
  const hostAvatar = renderAvatar
    ? renderAvatar({ name: host.name, avatar: host.avatar, size: 24 })
    : avatar;

  // 근거 발췌 → 전문 딥링크 (PW-103 이 대상이 없어 남겨 둔 것).
  const transcriptRef = useRef(null);
  const [hit, setHit] = useState(null);
  const anchors = new Set((session.sttTranscript ?? []).map(transcriptAnchor));
  const jump = {
    enabled: session.sttShared === true,
    has: (anchor) => !!anchor && anchors.has(anchor),
    to: (anchor) => {
      if (!anchor || !anchors.has(anchor)) return;
      setHit(anchor);
      transcriptRef.current
        ?.querySelector(`[data-anchor="${anchor}"]`)
        ?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    },
  };
  // 하이라이트는 1.5초 뒤 스스로 꺼진다 — 어디로 왔는지 알리는 게 목적이지
  // 그 줄을 계속 표시해 두려는 게 아니다.
  useEffect(() => {
    if (!hit) return undefined;
    const id = setTimeout(() => setHit(null), 1500);
    return () => clearTimeout(id);
  }, [hit]);

  const okrSnapshot = session.aiBriefing?.okrStatus ?? [];
  const blockers = session.aiBriefing?.unresolvedBlockers ?? [];

  return (
    <>
      <SessionHeader
        title={fill(L.sessionWith, { name: host.name })}
        status="done"
        date={formatDate(session.createdAt)}
        duration={session.durationSec > 0 ? formatDuration(session.durationSec) : null}
        avatar={hostAvatar}
        L={L} icons={icons} baseUrl={baseUrl}
        extra={
          <span className="ono-mem-chip" data-testid="ono-view-mode">{L.viewModeFull}</span>
        }
      >
        <button type="button" className="ono-mem-back" onClick={onBack}>
          <Icon src={icons.back} size={14} color="currentColor" baseUrl={baseUrl} />
          {L.backToHistory}
        </button>
      </SessionHeader>

      {session.aiSummary && <NoteGrid session={session} L={L} icons={icons} baseUrl={baseUrl} />}

      {blockers.length > 0 && (
        <Section title={L.recheckNeeded} icon={icons.alert} icons={icons} baseUrl={baseUrl}>
          <Blockers items={blockers} L={L} icons={icons} baseUrl={baseUrl} />
        </Section>
      )}

      {session.emotionTone && (
        <EmotionTone session={session} L={L} icons={icons} baseUrl={baseUrl} />
      )}

      {okrSnapshot.length > 0 && (
        <Section title={L.okrStatus} icon={icons.okr} icons={icons} baseUrl={baseUrl}>
          {okrSnapshot.map((kr, ki) => (
            <div className="ono-start-okr-row" key={`${ki}-${kr.id}`}>
              <span className="ono-start-okr-kr">{kr.title}</span>
              <OkrBar value={kr.progress} />
            </div>
          ))}
        </Section>
      )}

      {/* 지난 회의록에서도 같은 규칙으로 근거 발췌를 연다 (policy §10.2·§10.7.2) */}
      <ManagerFeedback
        session={session}
        managerName={host.name}
        L={L} icons={icons} baseUrl={baseUrl}
        jump={jump}
        {...(feedbackEvidence || {})}
      />


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

      {/* 회의록의 "원본" — 요약이 원문의 자리를 대신하지 않게 (PW-81) */}
      <TranscriptSection
        session={session}
        managerName={host.name}
        L={L} icons={icons} baseUrl={baseUrl}
        hit={hit}
        containerRef={transcriptRef}
      />
    </>
  );
}

function HistoryScreen({ sessions, manager, avatar, renderAvatar, L, icons, baseUrl, formatDate, formatDuration, healthColor, healthBg, healthBorder, onToggleAction, feedbackEvidence, onHistorySelect }) {
  const [selectedId, setSelectedId] = useState(null);
  const done = sessions.filter((s) => s.status === 'done');
  const selected = done.find((s) => s.id === selectedId);

  // 어떤 회차를 펼쳤는지 호스트에 알린다 — 그 회차의 근거 발췌를 불러오게 하려면
  // 선택 상태(여기 안에 있다)를 밖에서도 알아야 한다.
  const select = (id) => {
    setSelectedId(id);
    if (onHistorySelect) onHistorySelect(id);
  };

  if (selected) {
    return (
      <HistoryDetail
        session={selected} manager={manager} avatar={avatar} renderAvatar={renderAvatar}
        L={L} icons={icons} baseUrl={baseUrl}
        formatDate={formatDate} formatDuration={formatDuration}
        onBack={() => select(null)} onToggleAction={onToggleAction}
        feedbackEvidence={feedbackEvidence}
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
            const hVal = healthOf(s);
            return (
              <button
                key={s.id}
                type="button"
                className="ono-mem-hist"
                data-testid="ono-history-row"
                onClick={() => select(s.id)}
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
                        HC {hVal.toFixed(1)}
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
/**
 * 단계 탭 — design-page 공용 탭(.tabs-row / .tab-slider / .tab-btn).
 *
 * 처음엔 흰 카드 + 밑줄로 그렸는데, 카드 폭 720px 중 탭이 313px 만 채워
 * 오른쪽이 휑하게 비었다. 공용 탭은 **배경 없는 pill 슬라이더**라 애초에
 * 채울 상자가 없다 — 1on1 대시보드·매니저·타임라인이 모두 이걸 쓴다.
 * 부제(사전 작성/진행 중…)는 공용 탭에 자리가 없고 시안에도 없어 뺐다.
 */
function TabNav({ tab, onChange, enabled, L }) {
  const rowRef = useRef(null);
  const [slider, setSlider] = useState({ left: 0, width: 0 });
  const tabs = [
    { id: 'prep', label: L.tabPrep },
    { id: 'meeting', label: L.tabMeeting },
    { id: 'result', label: L.tabResult },
    { id: 'history', label: L.tabHistory },
  ];

  useEffect(() => {
    requestAnimationFrame(() => {
      if (!rowRef.current) return;
      const active = rowRef.current.querySelector('.tab-btn.tab-active');
      if (!active) return;
      const row = rowRef.current.getBoundingClientRect();
      const btn = active.getBoundingClientRect();
      setSlider({ left: btn.left - row.left, width: btn.width });
    });
  }, [tab]);

  return (
    <div role="tablist" className="tabs-row ono-mem-tabs" ref={rowRef}>
      <span className="tab-slider" style={{ left: slider.left, width: slider.width }} />
      {tabs.map((t) => {
        const on = tab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={on}
            className={`tab-btn ${on ? 'tab-active' : 'tab-inactive'}`}
            onClick={() => enabled[t.id] && onChange(t.id)}
            disabled={!enabled[t.id]}
          >
            {t.label}
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
  /**
   * **현재** 매니저 — 화면 단위 폴백이다. 회차별 사람 이름은 회차 페이로드의
   * `managerName`·`managerAvatar` 가 먼저다 (PW-211, `hostOf` 참고).
   */
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
  /**
   * 공개된 매니저 피드백의 근거 발췌 (PW-103).
   * `{ evidence: { items: [{ key, edited, evidence: [...] }] }, loading, error, onRetry }`.
   * 발췌만 여기서 오고 **본문은 세션에 이미 실려 있다** — 발췌 로딩이 본문 표시를
   * 막지 않게 하려는 분리다 (policy §6.5.1).
   */
  feedbackEvidence = null,
  /** 히스토리에서 펼친 회차 id (없으면 null) — 호스트가 그 회차 발췌를 불러오게 한다. */
  onHistorySelect,
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
          session={resultSession} manager={manager} avatar={avatar} renderAvatar={renderAvatar}
          deadlineOf={deadlineOf} onToggleAction={onToggleAction}
          feedbackEvidence={feedbackEvidence}
        />
      ) : <div className="ono-mem-empty">{L.noResultSession}</div>)}

      {/* HistoryScreen 에는 healthHistory 를 넘기지 않는다 — 회차 배지는 회차가 들고
          있는 값(`session.healthScore`)만 쓴다 (PW-213). 화면 단위 추이는 준비 화면
          그래프(PrepScreen)에서 계속 쓴다. */}
      {tab === 'history' && (
        <HistoryScreen
          {...shared}
          sessions={sessions} manager={manager} avatar={smallAvatar} renderAvatar={renderAvatar}
          healthColor={healthColor} healthBg={healthBg} healthBorder={healthBorder}
          onToggleAction={onToggleAction}
          feedbackEvidence={feedbackEvidence}
          onHistorySelect={onHistorySelect}
        />
      )}
    </div>
  );
}
