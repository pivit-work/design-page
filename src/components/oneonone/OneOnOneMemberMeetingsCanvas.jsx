import Icon from '../shared/Icon.jsx';
import { fill, hostOf, healthOf } from './sessionHelpers.js';
import {
  Section,
  ColHeads,
  NoteGrid,
  ManagerFeedback,
  SessionHeader,
  EmotionTone,
  transcriptAnchor,
  useTranscriptJump,
} from './OneOnOneMemberCanvas.jsx';

/**
 * 매니저가 보는 **한 팀원의 지난 1on1** — 리스트 / 회의록 / 대화 분석 3뷰.
 *
 * 정본: `pivit-specs/기획서-UX-UI-UserFlow/D. 1on1-기획/oneonone-spec.md` §3-4·§14
 * (v2.12·v2.15) + 시안 `1on1-detail.jsx` · `1on1-talk-analysis.jsx`.
 *
 * ## 왜 팀원 한 명짜리 화면인가
 *
 * 진입점이 **팀원 카드 안**이라서다. 상단 메뉴에 "지난 회의" 를 두면 들어와서 다시
 * 팀원을 고르게 되는데, 매니저는 이미 특정 팀원의 카드를 보다가 눌렀다. 그래서 전체
 * 팀원 선택 페이지를 두지 않는다 — 다른 팀원은 그 팀원의 카드에서 들어온다.
 *
 * ## 멤버 히스토리와 무엇이 다른가
 *
 * `OneOnOneMemberCanvas` 의 히스토리 탭은 **본인이 본인 회차**를 보는 화면이다.
 * 여기는 매니저가 남의 회차를 보는 화면이라, 멤버에게 가리는 코칭 지표(발화 비율)가
 * 오히려 주인공이다. 공통 조각(섹션·회의록 그리드·피드백·감정 톤)은 그 파일에서
 * 그대로 가져다 쓰고, 리스트 행과 대화 분석만 여기서 그린다.
 *
 * ## 호스트가 소유하는 것
 *
 * 라우팅(`view`·`session`)·날짜 포맷(사용자 시간대)·i18n 라벨·아바타 컴포넌트·
 * 헬스 색 토큰·**발화 비율 계산**. 캔버스는 계산하지 않고 받은 값을 그린다.
 */

const DEFAULT_ICONS = {
  back: '/icons-solid/arrow-left.svg',
  clock: '/icons-solid/clock.svg',
  history: '/icons-solid/clock-rewind.svg',
  pattern: '/icons-solid/refresh-ccw-01.svg',
  record: '/icons-solid/file-06.svg',
  analysis: '/icons-solid/message-chat-circle.svg',
  notes: '/icons-solid/file-06.svg',
  topics: '/icons-solid/message-chat-circle.svg',
  decisions: '/icons-solid/check-circle.svg',
  agenda: '/icons-solid/list.svg',
  next: '/icons-solid/calendar.svg',
  actions: '/icons-solid/check-square.svg',
  feedback: '/icons-solid/message-heart-circle.svg',
  evidence: '/icons-solid/search-md.svg',
  transcript: '/icons-solid/message-text-square-02.svg',
  health: '/icons-solid/activity-heart.svg',
  alert: '/icons-solid/alert-triangle.svg',
  chevron: '/icons-solid/chevron-down.svg',
  arrow: '/icons-solid/arrow-right.svg',
};

const DEFAULT_LABELS = {
  listTitle: '{name}님과의 지난 1on1',
  /** 이름을 못 얻었을 때 (권한 밖 팀원을 URL 로 직접 연 경우 등). */
  listTitleNoName: '지난 1on1',
  backToDashboard: '대시보드',
  totalCount: '총 {count}회',
  empty: '완료된 1on1 회차가 없습니다',
  emptyHint: '1on1을 진행하고 종료하면 회차별 회의록과 대화 분석이 여기에 쌓입니다',
  loading: '불러오는 중…',
  error: '지난 1on1을 불러올 수 없습니다.',
  retry: '다시 시도',
  openRecord: '회의록',
  openAnalysis: '대화 분석',
  backToList: '목록으로',
  memberTalk: '멤버 발화',
  actionsDone: '액션 {done}/{total}',
  noRatio: '대화 기록 없음',

  /* 반복 패턴 감지 — 매니저 화면에만 있는 DONE 산출물 (PW-370). */
  recurringPatterns: '반복 패턴 감지',
  recurringPatternsDesc: '여러 회차에 걸쳐 되풀이되는 것만 모았습니다',

  recordTitle: '{name}님과의 1on1',
  recordTitleNoName: '1on1 회의록',
  readOnly: '열람 전용',
  meetingNotes: '미팅 내용',
  mainDiscussion: '주요 논의',
  keyDecisions: '결정 사항',
  topicsCovered: '다룬 주제',
  nextAgenda: '다음 아젠다',
  actionItems: '액션아이템',
  colContent: '내용',
  colAssignee: '담당',
  colStatus: '상태',
  roleMember: '멤버',
  roleManager: '매니저',
  statusDone: '완료',
  statusPending: '진행 중',
  noActions: '액션아이템이 없습니다',
  transcriptTitle: '대화 원문',
  transcriptEmpty: '이 회차에는 대화 기록이 없습니다',
  /* 갈린 회차의 기준점 (PW-556 R6). 인자는 «초»다 — 분 환산은 소비처가 한다. */
  transcriptOffsetNotice: (sec) =>
    `이 전문은 미팅 시작 후 ${Math.ceil(sec / 60)}분부터 기록됐습니다.`,
  transcriptProcessing: '대화 원문을 만드는 중입니다',
  transcriptFailed: '대화 원문을 만들지 못했습니다.',
  transcriptRetry: '다시 시도',
  transcriptRetrying: '다시 시도하는 중…',
  transcriptRetryError: '다시 시도하지 못했습니다.',
  transcriptNoRecording: '녹음되지 않아 대화 원문이 없습니다',

  analysisTitle: '대화 분석',
  analysisDesc: '대화 기록 기반 발화 비율 · 회차별 추이',
  ratioTitle: '이번 세션 발화 비율',
  minutes: '{count}분',
  guideTitle: '이상적인 발화 비율 가이드라인',
  guideBody:
    '매니저 30~40% / 멤버 60~70%가 코칭 효과가 높은 비율입니다. 멤버가 충분히 이야기하고 스스로 해결책을 찾도록 질문 중심으로 대화를 이끌어주세요.',
  overWarn: '매니저 발화 비율이 높습니다. 다음 1on1에서 열린 질문을 더 활용해보세요.',
  ratioUnavailable: '이 회차에는 대화 기록이 없어 발화 비율을 낼 수 없습니다',
  trendTitle: '회차별 발화 비율 추이 (최근 {count}회)',
  trendEmpty: '대화 기록이 있는 회차가 아직 없습니다',

  emotionTone: '대화 톤',
  emotionPositive: '긍정',
  emotionNeutral: '중립',
  emotionNegative: '부정',

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
  evidenceSpeakerMe: '멤버',
  evidenceJump: '전문에서 보기',
  evidenceJumpMissing: '해당 구간을 찾을 수 없습니다',
  badgeReady: '준비 중',
  badgeLive: '진행 중',
  badgeDone: '완료',
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

/* ── 발화 비율 도넛 ────────────────────────────────────── */
/**
 * 두 값짜리 도넛. `stroke-dasharray` 로 그려 라이브러리를 끌어오지 않는다.
 * 색은 토큰만 쓴다 — 리터럴 색을 넣으면 다크 테마에서 혼자 튄다.
 */
function RatioDonut({ managerPct, memberPct, L }) {
  const R = 34;
  const C = 2 * Math.PI * R;
  const mgr = Math.max(0, Math.min(100, managerPct));
  return (
    <svg
      className="ono-past-donut"
      viewBox="0 0 90 90"
      role="img"
      aria-label={`${L.roleManager} ${managerPct}% · ${L.roleMember} ${memberPct}%`}
    >
      <circle cx="45" cy="45" r={R} fill="none" stroke="var(--utility-green-600)" strokeWidth="14" />
      <circle
        cx="45"
        cy="45"
        r={R}
        fill="none"
        stroke="var(--utility-blue-500)"
        strokeWidth="14"
        strokeDasharray={`${(C * mgr) / 100} ${C}`}
        transform="rotate(-90 45 45)"
      />
    </svg>
  );
}

function RatioRow({ label, pct, minutes, color, L }) {
  return (
    <div className="ono-start-okr-bar-line">
      <span className="ono-mem-cell is-sub ono-past-ratio-label">{label}</span>
      <span className="ono-start-progress-track">
        <span
          className="ono-start-progress-fill"
          style={{ display: 'block', width: `${pct}%`, background: color }}
        />
      </span>
      <span className="ono-start-okr-bar-pct" style={{ color }}>
        {pct}%
      </span>
      {minutes != null && (
        <span className="ono-mem-hint ono-past-ratio-min">{fill(L.minutes, { count: minutes })}</span>
      )}
    </div>
  );
}

/* ── 회차별 추이 ──────────────────────────────────────── */
/**
 * 회차별 매니저 발화 비율 막대. 0~100% 를 세로로 잡고 40% 가이드선을 긋는다 —
 * 숫자만 늘어놓으면 "이번이 높은 편인가" 를 매니저가 스스로 계산해야 한다.
 */
function TalkTrend({ trend, L, icons, baseUrl }) {
  return (
    <Section
      title={fill(L.trendTitle, { count: trend.length })}
      icon={icons.history}
      icons={icons}
      baseUrl={baseUrl}
    >
      {trend.length === 0 ? (
        <p className="ono-mem-hint ono-mem-center">{L.trendEmpty}</p>
      ) : (
        <div className="ono-past-trend" data-testid="ono-past-trend">
          <div className="ono-past-trend-guide" style={{ bottom: '40%' }}>
            <span className="ono-past-trend-guide-label">40%</span>
          </div>
          {trend.map((t) => (
            <div className="ono-past-trend-col" key={t.id}>
              <div className="ono-past-trend-bars">
                <span
                  className={`ono-past-trend-bar is-manager${t.managerPct > 40 ? ' is-over' : ''}`}
                  style={{ height: `${t.managerPct}%` }}
                  title={`${L.roleManager} ${t.managerPct}%`}
                />
                <span
                  className="ono-past-trend-bar is-member"
                  style={{ height: `${t.memberPct}%` }}
                  title={`${L.roleMember} ${t.memberPct}%`}
                />
              </div>
              <span className="ono-past-trend-label">{t.label}</span>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

/* ── ① 리스트 ─────────────────────────────────────────── */
function ListScreen({
  memberName,
  sessions,
  talkRatioOf,
  L,
  icons,
  baseUrl,
  formatDate,
  formatDuration,
  healthColor,
  healthBg,
  healthBorder,
  onOpenRecord,
  onOpenAnalysis,
}) {
  return (
    <>
      <header className="ono-mem-head">
        <div className="ono-mem-head-row">
          <Icon src={icons.history} size={18} color="var(--utility-blue-500)" baseUrl={baseUrl} />
          <h1 className="ono-mem-head-title">
            {memberName ? fill(L.listTitle, { name: memberName }) : L.listTitleNoName}
          </h1>
        </div>
        <p className="ono-mem-head-date">{fill(L.totalCount, { count: sessions.length })}</p>
      </header>

      {sessions.length === 0 ? (
        <div className="ono-mem-empty" data-testid="ono-past-empty">
          {L.empty}
          <div className="ono-mem-hint">{L.emptyHint}</div>
        </div>
      ) : (
        <div className="ono-mem-timeline">
          {sessions.map((s, i) => {
            const ratio = talkRatioOf ? talkRatioOf(s) : null;
            const actions = s.actionItems ?? [];
            const doneCount = actions.filter((a) => a.done).length;
            const hVal = healthOf(s);
            return (
              <div className="ono-mem-hist is-static" data-testid="ono-past-row" key={s.id}>
                <span className={`ono-mem-hist-dot${i === 0 ? ' is-latest' : ''}`} />
                <span className="ono-mem-hist-body">
                  <span className="ono-mem-hist-top">
                    <span className="ono-mem-hist-date">{formatDate(s.createdAt, 'short')}</span>
                    {s.durationSec > 0 && (
                      <span className="ono-mem-chip">
                        <Icon src={icons.clock} size={12} color="currentColor" baseUrl={baseUrl} />
                        {formatDuration(s.durationSec)}
                      </span>
                    )}
                    <span className="ono-start-topic-badge">
                      {ratio
                        ? `${L.memberTalk} ${ratio.memberPct}%`
                        : L.noRatio}
                    </span>
                    {hVal != null && (
                      <span
                        className="ono-start-flag ono-mem-push"
                        style={{
                          background: healthBg ? healthBg(hVal) : undefined,
                          borderColor: healthBorder ? healthBorder(hVal) : undefined,
                          color: healthColor ? healthColor(hVal) : undefined,
                        }}
                      >
                        HC {hVal.toFixed(1)}
                      </span>
                    )}
                  </span>
                  {s.aiSummary && <span className="ono-mem-hist-summary">{s.aiSummary}</span>}
                  <span className="ono-mem-hist-meta">
                    <span>{fill(L.actionsDone, { done: doneCount, total: actions.length })}</span>
                  </span>
                  <span className="ono-past-row-actions">
                    <button
                      type="button"
                      className="ono-past-link"
                      data-testid="ono-past-open-record"
                      onClick={() => onOpenRecord(s.id)}
                    >
                      <Icon src={icons.record} size={13} color="currentColor" baseUrl={baseUrl} />
                      {L.openRecord}
                    </button>
                    <button
                      type="button"
                      className="ono-past-link"
                      data-testid="ono-past-open-analysis"
                      onClick={() => onOpenAnalysis(s.id)}
                    >
                      <Icon src={icons.analysis} size={13} color="currentColor" baseUrl={baseUrl} />
                      {L.openAnalysis}
                    </button>
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ── ② 회의록 (읽기 전용) ─────────────────────────────── */
/**
 * 대화 원문이 비어 있는 이유를 말한다 (PW-329).
 *
 * 예전엔 셋을 모두 "이 회차에는 대화 기록이 없습니다" 로 보여줬다. 그러면 매니저는
 * 기다려야 하는지(전사 중), 다시 눌러야 하는지(실패), 아무 일도 없었던 것인지
 * (녹음 없음) 구분할 수 없다. 표시 형태는 같은 캔버스의 근거 발췌 상태 표시
 * (`ono-mem-evidence-*`)를 그대로 쓴다 — 새 시각 요소를 만들지 않는다.
 */
function TranscriptStatus({ status, retrying, error, onRetry, L }) {
  if (status === 'processing' || retrying) {
    return (
      <p className="ono-mem-evidence-status ono-mem-center" role="status" data-testid="ono-past-stt-processing">
        {retrying ? L.transcriptRetrying : L.transcriptProcessing}
      </p>
    );
  }

  if (status === 'failed') {
    return (
      <p className="ono-mem-evidence-status ono-mem-center" data-testid="ono-past-stt-failed">
        {error ? L.transcriptRetryError : L.transcriptFailed}{' '}
        {onRetry && (
          <button
            type="button"
            className="ono-mem-evidence-retry"
            onClick={onRetry}
            data-testid="ono-past-stt-retry"
          >
            {L.transcriptRetry}
          </button>
        )}
      </p>
    );
  }

  // 녹음이 올라온 적 없음 — 마이크 권한 거부도 여기다 (기획 §15-4 의 정상 동작).
  if (!status) {
    return (
      <p className="ono-mem-hint ono-mem-center" data-testid="ono-past-stt-none">
        {L.transcriptNoRecording}
      </p>
    );
  }

  // completed 인데 발화가 없는 경우 — 조용한 녹음 등.
  return <p className="ono-mem-hint ono-mem-center">{L.transcriptEmpty}</p>;
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
 * 대화 원문 — 매니저는 자기 회차의 전문을 그대로 본다. 멤버 화면의
 * `TranscriptSection` 은 공개 여부(`sttShared`)로 가리지만, 여기서는 가릴 대상이
 * 없다(본인이 공개 여부를 정하는 쪽이다).
 */
function PastTranscript({ session, L, icons, baseUrl, transcription, hit, containerRef }) {
  const lines = session.sttTranscript ?? [];
  const { retrying = false, error = false, onRetry } = transcription || {};
  return (
    <Section title={L.transcriptTitle} icon={icons.transcript} icons={icons} baseUrl={baseUrl}>
      {lines.length === 0 ? (
        <TranscriptStatus
          status={session.sttStatus ?? null}
          retrying={retrying}
          error={error}
          onRetry={onRetry}
          L={L}
        />
      ) : (
        /* 발화마다 앵커를 단다 — 근거 발췌의 「전문에서 보기」가 여기로 온다(PW-327).
           앵커 규칙은 서버(`feedback-evidence.util.ts#toAnchor`)와 같아야 한다. */
        <>
        <TranscriptOffsetNotice session={session} L={L} />
        <div className="ono-mem-transcript" ref={containerRef} data-testid="ono-transcript">
          {lines.map((line, i) => {
            const anchor = transcriptAnchor(line);
            return (
              <div
                className={`ono-mem-transcript-line${hit === anchor ? ' is-hit' : ''}`}
                data-anchor={anchor}
                data-testid="ono-transcript-line"
                key={`${anchor}-${i}`}
              >
                <div className="ono-mem-transcript-meta">
                  <span>{line.speaker === 'host' ? L.roleManager : L.roleMember}</span>
                  <span>{line.timestamp}</span>
                </div>
                <p className="ono-mem-transcript-text">{line.text}</p>
              </div>
            );
          })}
        </div>
        </>
      )}
    </Section>
  );
}

/**
 * 반복 패턴 감지 (PW-370) — **매니저 화면에만 있는** DONE 산출물.
 *
 * 이 화면이 곧 매니저 전용이라 여기 두는 것으로 수신자 구분이 성립한다. 서버도
 * 멤버 응답에서 `recurringPatterns` 를 제거하므로 이중으로 막힌다.
 *
 * 패턴이 없으면 **섹션 자체를 그리지 않는다.** 빈 섹션은 「아직 안 돌았다」와
 * 「반복이 없다」를 구분해 주지 못한다.
 */
function RecurringPatterns({ session, L, icons, baseUrl }) {
  const patterns = session.recurringPatterns ?? [];
  if (patterns.length === 0) return null;
  return (
    <Section
      title={L.recurringPatterns}
      icon={icons.pattern}
      icons={icons}
      baseUrl={baseUrl}
    >
      <p className="ono-mem-hint">{L.recurringPatternsDesc}</p>
      <div className="ono-past-patterns" data-testid="ono-past-patterns">
        {patterns.map((text, i) => (
          <div className="ono-past-pattern" key={i}>
            <Icon src={icons.pattern} size={14} color="currentColor" baseUrl={baseUrl} />
            <span className="ono-past-pattern-text">{text}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

function RecordScreen({
  session,
  memberName,
  managerName,
  renderAvatar,
  L,
  icons,
  baseUrl,
  formatDate,
  formatDuration,
  feedbackEvidence,
  transcription,
  onBackToList,
  renderRecordingPlayer,
}) {
  const host = hostOf(session, { name: managerName });
  const actions = session.actionItems ?? [];
  // 근거 발췌 → 대화 원문 딥링크 (PW-327).
  // 여기서는 `sttShared` 로 잠그지 않는다 — 전문 공개는 **멤버에게** 보일지의 스위치이고,
  // 매니저는 자기 회차의 전문을 늘 본다(바로 아래 PastTranscript 가 그대로 그린다).
  // 같은 조건을 여기 걸면 자기가 공개하지 않은 회차에서 자기 화면의 딥링크가 사라진다.
  const transcript = useTranscriptJump(session, { alwaysEnabled: true });
  return (
    <>
      <SessionHeader
        title={memberName ? fill(L.recordTitle, { name: memberName }) : L.recordTitleNoName}
        status="done"
        date={formatDate(session.createdAt)}
        duration={session.durationSec > 0 ? formatDuration(session.durationSec) : null}
        avatar={renderAvatar ? renderAvatar({ name: memberName, avatar: session.memberAvatar || '', size: 24 }) : null}
        L={L}
        icons={icons}
        baseUrl={baseUrl}
        extra={<span className="ono-start-flag ono-start-flag-blue">{L.readOnly}</span>}
      >
        <button type="button" className="ono-mem-back" onClick={onBackToList}>
          <Icon src={icons.back} size={14} color="currentColor" baseUrl={baseUrl} />
          {L.backToList}
        </button>
      </SessionHeader>

      <NoteGrid
        session={session}
        L={L}
        icons={icons}
        baseUrl={baseUrl}
        recordingPlayer={renderRecordingPlayer?.(session)}
      />

      <RecurringPatterns session={session} L={L} icons={icons} baseUrl={baseUrl} />

      <ManagerFeedback
        session={session}
        managerName={host.name}
        L={L}
        icons={icons}
        baseUrl={baseUrl}
        jump={transcript.jump}
        {...(feedbackEvidence || {})}
      />

      <Section
        title={L.actionItems}
        icon={icons.actions}
        icons={icons}
        baseUrl={baseUrl}
        collapsible={false}
      >
        {actions.length === 0 ? (
          <p className="ono-mem-hint ono-mem-center">{L.noActions}</p>
        ) : (
          <div className="ono-mem-table">
            <ColHeads cols={[L.colContent, L.colAssignee, L.colStatus]} />
            {actions.map((item) => (
              /* 열람 전용 — 행에 onClick 을 달지 않는다. 체크는 상태 표시일 뿐이다. */
              <div className="ono-mem-row" data-testid="ono-past-action-row" key={item.id}>
                <span className="ono-mem-cell">{item.text}</span>
                <span className="ono-mem-cell is-sub">
                  {item.owner === 'member' ? L.roleMember : L.roleManager}
                </span>
                <span className={`ono-start-flag ono-start-flag-${item.done ? 'blue' : 'warning'}`}>
                  {item.done ? L.statusDone : L.statusPending}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <PastTranscript
        session={session}
        L={L}
        icons={icons}
        baseUrl={baseUrl}
        transcription={transcription}
        hit={transcript.hit}
        containerRef={transcript.containerRef}
      />
    </>
  );
}

/* ── ③ 대화 분석 ──────────────────────────────────────── */
function AnalysisScreen({
  session,
  memberName,
  ratio,
  trend,
  L,
  icons,
  baseUrl,
  formatDate,
  onBackToList,
}) {
  return (
    <>
      <header className="ono-mem-head is-done">
        <div className="ono-mem-head-row">
          <Icon src={icons.analysis} size={18} color="var(--utility-blue-500)" baseUrl={baseUrl} />
          <h1 className="ono-mem-head-title">{L.analysisTitle}</h1>
          <span className="ono-mem-chip">{memberName}</span>
        </div>
        <p className="ono-mem-head-date">
          {formatDate(session.createdAt)} · {L.analysisDesc}
        </p>
        <button type="button" className="ono-mem-back" onClick={onBackToList}>
          <Icon src={icons.back} size={14} color="currentColor" baseUrl={baseUrl} />
          {L.backToList}
        </button>
      </header>

      <Section title={L.ratioTitle} icon={icons.analysis} icons={icons} baseUrl={baseUrl} collapsible={false}>
        {!ratio ? (
          /* 대화 기록이 없으면 0% 도, 50:50 도 그리지 않는다 — 없는 값을 그리면
             매니저는 "정말 반반이었다" 로 읽는다. */
          <p className="ono-mem-hint ono-mem-center" data-testid="ono-past-ratio-none">
            {L.ratioUnavailable}
          </p>
        ) : (
          <>
            <div className="ono-past-ratio" data-testid="ono-past-ratio">
              <RatioDonut managerPct={ratio.managerPct} memberPct={ratio.memberPct} L={L} />
              <div className="ono-past-ratio-rows">
                <RatioRow
                  label={L.roleManager}
                  pct={ratio.managerPct}
                  minutes={ratio.managerMinutes}
                  color="var(--utility-blue-500)"
                  L={L}
                />
                <RatioRow
                  label={L.roleMember}
                  pct={ratio.memberPct}
                  minutes={ratio.memberMinutes}
                  color="var(--utility-green-600)"
                  L={L}
                />
              </div>
            </div>

            <div className="ono-past-guide">
              <div className="ono-past-guide-title">{L.guideTitle}</div>
              <p className="ono-past-guide-body">{L.guideBody}</p>
              {ratio.managerPct > 40 && (
                <div className="ono-past-guide-warn" data-testid="ono-past-over-warn">
                  <Icon src={icons.alert} size={12} color="currentColor" baseUrl={baseUrl} />
                  {L.overWarn}
                </div>
              )}
            </div>
          </>
        )}
      </Section>

      <TalkTrend trend={trend} L={L} icons={icons} baseUrl={baseUrl} />

      {session.emotionTone && <EmotionTone session={session} L={L} icons={icons} baseUrl={baseUrl} />}
    </>
  );
}

/* ── 캔버스 ───────────────────────────────────────────── */
export default function OneOnOneMemberMeetingsCanvas({
  memberName = '',
  /**
   * 지금 보고 있는 매니저의 이름 — 근거 발췌 화자 라벨("{name} 매니저")에 쓴다.
   * 매니저 자기 목록 응답에는 `managerName` 이 비어 오므로(자기 자신이라 서버가
   * 채우지 않는다) 호스트가 넘긴다. 회차에 이름이 실려 있으면 그쪽이 먼저다(PW-211).
   */
  managerName = '',
  /** 'list' | 'record' | 'analysis'. 라우팅은 호스트가 쥔다 — 뒤로가기가 동작해야 한다. */
  view = 'list',
  /** 완료 회차만, 최신이 먼저. 필터·정렬은 호스트가 한다. */
  sessions = [],
  /** record/analysis 대상 회차. 없으면 리스트로 떨어뜨린다. */
  session = null,
  /** (session) => { managerPct, memberPct, managerMinutes, memberMinutes } | null */
  talkRatioOf,
  /** [{ id, label, managerPct, memberPct }] — 오래된 회차가 먼저 */
  trend = [],
  labels,
  icons,
  baseUrl = '',
  formatDate,
  formatDuration,
  healthColor,
  healthBg,
  healthBorder,
  renderAvatar,
  feedbackEvidence,
  transcription,
  loading = false,
  error = false,
  onRetry,
  onBack,
  onBackToList,
  onOpenRecord,
  onOpenAnalysis,
  /**
   * `(session) => node | null` — 그 회차의 **녹음 재생기** (PW-584).
   *
   * 회의록 카드 안 첫 행에 그린다(policy §19.2 · `arch-design-tokens.md` §9-P-4 ⓑ).
   * 노드가 아니라 함수인 것은 `OneOnOneMemberCanvas` 와 같은 이유다 — 「누가 이 회차를
   * 들을 수 있는가」는 회차 단위로 갈린다. `null` 이면 자리 자체가 생기지 않는다.
   */
  renderRecordingPlayer,
}) {
  const L = mergeLabels(DEFAULT_LABELS, labels);
  const I = { ...DEFAULT_ICONS, ...(icons || {}) };
  const ratio = session && talkRatioOf ? talkRatioOf(session) : null;
  // 선택 회차가 없는 record/analysis 는 리스트로 떨어뜨린다 — 새로고침으로 사라진
  // 회차를 가리키면 빈 화면이 남는다.
  const screen = view !== 'list' && session ? view : 'list';

  return (
    <main className="ono-mem ono-past">
      {onBack && (
        <button type="button" className="ono-mem-back ono-past-top-back" onClick={onBack}>
          <Icon src={I.back} size={14} color="currentColor" baseUrl={baseUrl} />
          {L.backToDashboard}
        </button>
      )}

      {loading ? (
        <div className="ono-mem-empty" role="status">
          {L.loading}
        </div>
      ) : error ? (
        // 목록 조회 실패는 이 자리에서 말한다 — 전역 에러 페이지로 튕기면 매니저는
        // 어느 팀원을 보다 실패했는지조차 잃는다.
        <div className="ono-mem-empty" data-testid="ono-past-error">
          {L.error}
          <div className="ono-mem-actions-end">
            <button type="button" className="ono-mem-btn" onClick={onRetry}>
              {L.retry}
            </button>
          </div>
        </div>
      ) : screen === 'record' ? (
        <RecordScreen
          session={session}
          memberName={memberName}
          managerName={managerName}
          renderAvatar={renderAvatar}
          L={L}
          icons={I}
          baseUrl={baseUrl}
          formatDate={formatDate}
          formatDuration={formatDuration}
          feedbackEvidence={feedbackEvidence}
          transcription={transcription}
          onBackToList={onBackToList}
          renderRecordingPlayer={renderRecordingPlayer}
        />
      ) : screen === 'analysis' ? (
        <AnalysisScreen
          session={session}
          memberName={memberName}
          ratio={ratio}
          trend={trend}
          L={L}
          icons={I}
          baseUrl={baseUrl}
          formatDate={formatDate}
          onBackToList={onBackToList}
        />
      ) : (
        <ListScreen
          memberName={memberName}
          sessions={sessions}
          talkRatioOf={talkRatioOf}
          L={L}
          icons={I}
          baseUrl={baseUrl}
          formatDate={formatDate}
          formatDuration={formatDuration}
          healthColor={healthColor}
          healthBg={healthBg}
          healthBorder={healthBorder}
          onOpenRecord={onOpenRecord}
          onOpenAnalysis={onOpenAnalysis}
        />
      )}
    </main>
  );
}
