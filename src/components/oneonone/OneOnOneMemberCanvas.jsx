import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Icon from '../shared/Icon.jsx';
import { fill, hostOf, healthOf } from './sessionHelpers.js';

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
  /* 「준비 완료」 — 상태를 넘기는 버튼이 아니라 **매니저에게 알리는** 버튼이다.
     시안 `1on1-member-view.jsx` READY 푸터의 `준비 완료 → 매니저에게 알림`. */
  memberReady: '준비 완료',
  memberReadyHint: '준비를 마쳤다고 매니저에게 알립니다.',
  memberReadySent: '매니저에게 알렸습니다',
  memberReadySentHint: '작성한 내용이 매니저에게 공유되었습니다.',
  memberReadyFailed: '준비 완료를 보내지 못했습니다.',
  memberReadyRetry: '다시 시도',
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
  transcriptPreviewTitle: 'STT 스크립트 미리보기',
  transcriptNotShared: '대화 원문은 매니저가 공개하지 않았습니다',
  transcriptEmpty: '이 회차에는 대화 기록이 없습니다',
  /* 갈린 회차의 기준점 (PW-556 R6). 인자는 «초»다 — 분 환산은 소비처가 한다. */
  transcriptOffsetNotice: (sec) =>
    `이 전문은 미팅 시작 후 ${Math.ceil(sec / 60)}분부터 기록됐습니다.`,
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

/**
 * 카드 섹션.
 *
 * 접힘은 기본적으로 **섹션이 스스로** 쥔다. 다만 근거 발췌의 「전문에서 보기」처럼
 * 밖에서 펼쳐 줘야 하는 자리가 있어 `open`/`onOpenChange` 로 제어권을 넘길 수 있다
 * (`open` 을 주면 controlled, 안 주면 지금까지와 똑같이 자체 state).
 * `defaultOpen` 은 uncontrolled 일 때의 시작 상태다 — 미리보기는 접힌 채 시작한다.
 */
export function Section({
  title, icon, icons, baseUrl, badge, collapsible = true,
  defaultOpen = true, open: openProp, onOpenChange, children,
}) {
  const [selfOpen, setSelfOpen] = useState(defaultOpen);
  const open = openProp === undefined ? selfOpen : openProp;
  const setOpen = (next) => {
    if (openProp === undefined) setSelfOpen(next);
    if (onOpenChange) onOpenChange(next);
  };
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

export function ColHeads({ cols }) {
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

/**
 * 회의록 카드. `recordingPlayer` 를 받으면 **카드 안 첫 행**에 그린다 (PW-584).
 *
 * 정본: `screen-oneonone-session.policy.md` §19.2 「STT 완료 배너 바로 아래 · AI 미팅
 * 요약 카드 «위» … 카드를 새로 만들지 않고 Divider 로 나눈다」 ·
 * `arch-design-tokens.md` §9-P-4 ⓑ. 원음은 요약의 **근거**라 요약보다 앞에 온다.
 *
 * 🔴 재생기 자체는 이 캔버스가 그리지 않는다 — 자리만 연다. 무엇을 그릴지(재생기 ·
 * 「녹음되지 않았습니다」 · 아무것도 안 그림)는 «누가 들을 수 있는가» 판정이라
 * 소비처가 소유한다. 안 넘기면 지금까지처럼 회의록만 나온다.
 */
export function NoteGrid({ session, L, icons, baseUrl, recordingPlayer }) {
  return (
    <Section title={L.meetingNotes} icon={icons.notes} icons={icons} baseUrl={baseUrl} collapsible={false}>
      {recordingPlayer}
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
export const transcriptAnchor = (line) =>
  `stt-${String(line?.timestamp ?? '').replace(/:/g, '-')}`;

/**
 * 근거 발췌 → 대화 원문 딥링크의 배선 한 벌 (PW-103 · PW-327).
 *
 * 앵커 집합·하이라이트·스크롤·접힌 섹션 펼치기가 화면마다 따로 적혀 있으면 한 곳만
 * 고쳐지고 나머지는 조용히 어긋난다. 실제로 결과 탭은 이 배선이 통째로 빠져 있어
 * 「전문에서 보기」가 렌더조차 되지 않았다(PW-327).
 *
 * - `alwaysEnabled` — 매니저 화면용. 매니저는 자기 회차의 전문을 늘 보므로
 *   `sttShared` 로 잠그지 않는다(공개 여부를 정하는 쪽이 본인이다). 대신 전사가
 *   아예 없는 회차에서는 갈 곳이 없으니 그대로 끈다.
 * - `collapsed` — 미리보기처럼 접힌 채 시작하는 섹션. 딥링크는 **펼치고 나서** 간다.
 *
 * 주의: 스크롤을 `to()` 안에서 바로 하면 안 된다. 접힌 섹션은 그 시점에 본문이 DOM 에
 * 없어 `querySelector` 가 null 이다. 앵커를 state 에 넣고 **렌더 뒤 effect** 에서
 * 옮긴다.
 */
export function useTranscriptJump(session, { alwaysEnabled = false, collapsed = false } = {}) {
  const containerRef = useRef(null);
  const [hit, setHit] = useState(null);
  const [open, setOpen] = useState(!collapsed);

  const lines = session?.sttTranscript;
  const anchors = useMemo(
    () => new Set((lines ?? []).map(transcriptAnchor)),
    [lines],
  );
  const has = useCallback((anchor) => !!anchor && anchors.has(anchor), [anchors]);
  const to = useCallback((anchor) => {
    if (!anchor || !anchors.has(anchor)) return;
    setOpen(true);
    setHit(anchor);
  }, [anchors]);

  // 하이라이트는 1.5초 뒤 스스로 꺼진다 — 어디로 왔는지 알리는 게 목적이지
  // 그 줄을 계속 표시해 두려는 게 아니다.
  useEffect(() => {
    if (!hit) return undefined;
    containerRef.current
      ?.querySelector(`[data-anchor="${hit}"]`)
      ?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    const id = setTimeout(() => setHit(null), 1500);
    return () => clearTimeout(id);
  }, [hit]);

  const enabled = alwaysEnabled
    ? (lines ?? []).length > 0
    : session?.sttShared === true;

  return { hit, open, setOpen, containerRef, jump: { enabled, has, to } };
}

/**
 * 저장된 소리가 미팅 시작보다 늦게 시작된 회차의 기준점 한 줄 (PW-556 · policy §5.4.4 R6).
 *
 * 새로고침·탭 재진입으로 녹음이 한 번 끊긴 회차는 **복귀 이후만** 파일로 남는다. 그런데
 * 화면의 경과는 서버 t0 에서 이어 세므로(§5.0 T5) 두 축이 갈린 채로 남고, 근거 발췌의
 * 「전문에서 보기」를 읽는 사람은 그 사실을 알 길이 없다. 감추지 않고 적는다.
 *
 * **갈리지 않은 회차에는 그리지 않는다.** 「0분부터」를 적으면 그것이 「갈렸다」는
 * 뜻이 되어 읽는 사람을 속인다.
 *
 * 분 환산은 소비처가 한다 — 올림/반올림은 로케일이 아니라 문구의 뜻에 걸린 판단이라
 * 라벨 함수와 같은 곳에 있어야 한다.
 */
function TranscriptOffsetNotice({ session, L }) {
  const offset = session?.audioStartOffsetSec;
  if (!offset || offset <= 0) return null;
  if (typeof L?.transcriptOffsetNotice !== 'function') return null;
  return (
    <p
      className="ono-mem-transcript-offset"
      role="status"
      data-testid="ono-transcript-offset"
    >
      {L.transcriptOffsetNotice(offset)}
    </p>
  );
}

/**
 * 대화 원문(STT 스크립트) — 회의록 풀버전의 "원본" (PW-81 · policy §10.7.2).
 *
 * 요약이 원문의 자리를 대신하지 않도록, 공개된 회차는 발화를 **전량** 그린다.
 * 잘라 놓고 "미리보기" 라고 부르지 않는다.
 *
 * 공개되지 않은 회차에서도 **섹션 자체는 그린다.** 숨기면 구성원은 "원문이 원래
 * 없는 것" 과 "매니저가 공개하지 않은 것" 을 구분할 수 없다.
 *
 * `preview` 는 결과 탭(DONE)용이다 — 기획서 §4-4·§5-3 이 그 자리를 "스크립트
 * 미리보기(접기/펼치기 · maxHeight 160 · overflowY auto)" 로 정의한다. 히스토리
 * 탭의 회의록 상세는 계속 풀버전이다(policy §10.7.2) — 서로 다른 화면이라 충돌이
 * 아니다. 미리보기라고 해서 **발화를 잘라 내지는 않는다.** 높이를 줄여 접어 둘 뿐,
 * 스크롤하면 전량이 그대로 있다.
 */
function TranscriptSection({
  session, managerName, L, icons, baseUrl, hit, containerRef,
  preview = false, open, onOpenChange,
}) {
  const lines = session.sttTranscript ?? [];
  const shared = session.sttShared === true;
  const speakerLabel = (line) =>
    line.speaker === 'host'
      ? fill(L.evidenceSpeakerManager, { name: managerName })
      : L.evidenceSpeakerMe;

  return (
    <Section
      title={preview ? L.transcriptPreviewTitle : L.transcriptTitle}
      icon={icons.transcript}
      icons={icons}
      baseUrl={baseUrl}
      collapsible={preview}
      open={preview ? open : undefined}
      onOpenChange={preview ? onOpenChange : undefined}
    >
      {shared && <TranscriptOffsetNotice session={session} L={L} />}
      <div
        className={`ono-mem-transcript${preview ? ' is-preview' : ''}`}
        ref={containerRef}
        data-testid="ono-transcript"
      >
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
export function ManagerFeedback({ session, evidence, loading, error, onRetry, managerName, L, icons, baseUrl, jump }) {
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

export function SessionHeader({ title, status, date, duration, avatar, L, icons, baseUrl, children, extra }) {
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
function PrepScreen({ session, manager, avatar, okrStatus, healthHistory, isHost, L, icons, baseUrl, formatDate, healthColor, onTopicsChange, onStart, onMemberReady, memberReady }) {
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

      {/* 🔴 푸터의 버튼은 «누가 보고 있는가» 로 갈린다.
          호스트(매니저가 자기 회차를 열었을 때)는 「미팅 시작」 — 상태를 넘긴다.
          멤버는 「준비 완료」 — **상태를 넘기지 않고 매니저에게 알린다.**
          두 사람이 같은 버튼을 나눠 갖지 않는다는 규칙이 여기서 지켜진다. */}
      {isHost ? (
        <div className="ono-mem-footer">
          <span className="ono-mem-hint">{L.prepCompleteHint}</span>
          <button type="button" className="ono-mem-btn" onClick={onStart}>{L.startMeeting}</button>
        </div>
      ) : (
        <MemberReadyFooter
          sent={!!session.memberReadyAt}
          state={memberReady}
          onClick={onMemberReady}
          L={L}
        />
      )}
    </>
  );
}

/**
 * 멤버 READY 푸터 — 「준비 완료」.
 *
 * 이미 보낸 회차에서는 비활성으로 두고 문구를 바꾼다. 눌러도 아무 변화가 없으면
 * 사용자는 버튼이 고장난 것으로 읽는다.
 *
 * 실패는 **이 자리 안에서** 말한다 — 준비 화면에는 사용자가 방금 적은 주제가 있어,
 * 전역 오류 화면으로 보내면 그것을 날린다 (PW-321 과 같은 규칙, 같은 실패 박스).
 */
function MemberReadyFooter({ sent, state, onClick, L }) {
  const busy = !!state?.busy;
  const error = state?.error;
  return (
    <>
      {error && (
        <div className="ono-start-failbox" role="alert" data-testid="ono-mem-ready-error">
          <span className="ono-start-failbox-title">{L.memberReadyFailed}</span>
          <div className="ono-start-failbox-actions">
            <button
              type="button"
              className="ono-start-failbox-retry"
              onClick={onClick}
              disabled={busy}
            >
              {L.memberReadyRetry}
            </button>
          </div>
        </div>
      )}
      <div className="ono-mem-footer">
        <span className="ono-mem-hint">
          {sent ? L.memberReadySentHint : L.memberReadyHint}
        </span>
        <button
          type="button"
          className={`ono-mem-btn${sent ? ' is-ok' : ''}`}
          onClick={onClick}
          disabled={sent || busy}
          data-testid="ono-mem-ready-btn"
        >
          {sent ? L.memberReadySent : L.memberReady}
        </button>
      </div>
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
export function EmotionTone({ session, L, icons, baseUrl }) {
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

function ResultScreen({ session, manager, avatar, renderAvatar, L, icons, baseUrl, formatDate, formatDuration, deadlineOf, onToggleAction, feedbackEvidence, renderRecordingPlayer }) {
  const myActions = session.actionItems.filter((a) => a.owner === 'member');
  const managerActions = session.actionItems.filter((a) => a.owner === 'manager');
  const doneCount = myActions.filter((a) => a.done).length;

  // 결과 탭이 늘 최신 회차인 것은 아니다 — 호스트가 지난 완료 회차를 넘길 수 있다.
  const host = hostOf(session, manager);
  // 근거 발췌 → 전문 딥링크 (PW-327). 결과 탭의 전문은 **접힌 미리보기**라
  // `collapsed` 로 시작하고, 딥링크가 펼친 뒤 그 발화로 옮긴다.
  const transcript = useTranscriptJump(session, { collapsed: true });
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
          <NoteGrid
            session={session}
            L={L}
            icons={icons}
            baseUrl={baseUrl}
            recordingPlayer={renderRecordingPlayer?.(session)}
          />

          {/* 공개된 매니저 피드백 + 근거 발췌 (PW-103) + 전문 딥링크 (PW-327) */}
          <ManagerFeedback
            session={session}
            managerName={host.name}
            L={L} icons={icons} baseUrl={baseUrl}
            jump={transcript.jump}
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

          {/* 대화 전문 미리보기 — 발췌의 「전문에서 보기」가 갈 곳 (기획서 §5-3) */}
          <TranscriptSection
            session={session}
            managerName={host.name}
            L={L} icons={icons} baseUrl={baseUrl}
            preview
            hit={transcript.hit}
            containerRef={transcript.containerRef}
            open={transcript.open}
            onOpenChange={transcript.setOpen}
          />
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
function HistoryDetail({ session, manager, avatar, renderAvatar, L, icons, baseUrl, formatDate, formatDuration, onBack, onToggleAction, feedbackEvidence, renderRecordingPlayer }) {
  // 지난 회차는 지금 매니저가 아니라 **그때 그 매니저**의 것이다 (PW-211).
  const host = hostOf(session, manager);
  const hostAvatar = renderAvatar
    ? renderAvatar({ name: host.name, avatar: host.avatar, size: 24 })
    : avatar;

  // 근거 발췌 → 전문 딥링크 (PW-103 이 대상이 없어 남겨 둔 것).
  // 여기는 풀버전이라 전문이 늘 펼쳐져 있다 — 결과 탭과 배선만 공유한다(PW-327).
  const transcript = useTranscriptJump(session);

  const okrSnapshot = session.aiBriefing?.okrStatus ?? [];
  const blockers = session.aiBriefing?.unresolvedBlockers ?? [];
  const player = renderRecordingPlayer ? renderRecordingPlayer(session) : null;

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

      {/* 요약이 없어도 재생기가 있으면 카드를 그린다 (PW-584) — 그러지 않으면
          「요약은 못 만들었는데 녹음은 있는」 회차에서 원음을 들을 자리가 사라진다. */}
      {(session.aiSummary || player) && (
        <NoteGrid
          session={session}
          L={L}
          icons={icons}
          baseUrl={baseUrl}
          recordingPlayer={player}
        />
      )}

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
        jump={transcript.jump}
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
        hit={transcript.hit}
        containerRef={transcript.containerRef}
      />
    </>
  );
}

function HistoryScreen({ sessions, manager, avatar, renderAvatar, L, icons, baseUrl, formatDate, formatDuration, healthColor, healthBg, healthBorder, onToggleAction, feedbackEvidence, onHistorySelect, renderRecordingPlayer }) {
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
        renderRecordingPlayer={renderRecordingPlayer}
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
  /** 멤버 「준비 완료」 — 매니저에게 알림만 간다. 상태는 바뀌지 않는다. */
  onMemberReady = () => {},
  /** 「준비 완료」 진행/실패 상태 — `{ busy, error }`. 호스트가 소유한다. */
  memberReady = null,
  /**
   * 공개된 매니저 피드백의 근거 발췌 (PW-103).
   * `{ evidence: { items: [{ key, edited, evidence: [...] }] }, loading, error, onRetry }`.
   * 발췌만 여기서 오고 **본문은 세션에 이미 실려 있다** — 발췌 로딩이 본문 표시를
   * 막지 않게 하려는 분리다 (policy §6.5.1).
   */
  feedbackEvidence = null,
  /** 히스토리에서 펼친 회차 id (없으면 null) — 호스트가 그 회차 발췌를 불러오게 한다. */
  onHistorySelect,
  /**
   * `(session) => node | null` — 그 회차의 **녹음 재생기** (PW-584).
   *
   * 회의록 카드 안 첫 행에 그린다(policy §19.2 · `arch-design-tokens.md` §9-P-4 ⓑ).
   * 회차마다 답이 달라서 노드가 아니라 **함수**로 받는다 — 결과 탭과 히스토리 상세가
   * 서로 다른 회차를 그리고, 「누가 이 회차를 들을 수 있는가」는 회차 단위로 갈린다
   * (`oneonone-spec.md` §9-B 확정 ②': 매니저는 언제나 · 팀원은 그 회차의 `sttShared`
   * 가 켜진 때만).
   *
   * 🔴 `null` 을 돌려주면 **자리 자체가 생기지 않는다** — 「들을 수 없습니다」류의
   * 안내를 두면 녹음이 있다는 사실이 새기 때문이다(INV-P5). 안 넘기면 지금까지처럼
   * 재생기 없이 그린다.
   */
  renderRecordingPlayer,
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
          onMemberReady={onMemberReady} memberReady={memberReady}
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
          renderRecordingPlayer={renderRecordingPlayer}
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
          renderRecordingPlayer={renderRecordingPlayer}
        />
      )}
    </div>
  );
}
