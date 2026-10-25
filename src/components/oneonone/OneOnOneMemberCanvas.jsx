import { useAiDraftLifecycle } from '../shared/useAiDraftLifecycle.js';
import Button from '../shared/Button.jsx';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import DpStatusBadge from '../shared/StatusBadge.jsx';
import Tooltip from '../shared/Tooltip.jsx';
import EmptyState from '../shared/EmptyState.jsx';
import Icon from '../shared/Icon.jsx';
import Tabs from '../shared/Tabs.jsx';
import Spinner from '../shared/Spinner.jsx';
import { fill, hostOf, healthOf, heldAtOf, ownerLabelOf } from './sessionHelpers.js';
import {
  doneBannerState,
  dominantSentiment,
  isDonePending,
  SENTIMENT_BADGE_TONE,
} from './doneViewHelpers.js';
import OneOnOnePastSessionList from './OneOnOnePastSessionList.jsx';
import { RatingBar } from './StartOneOnOneView.jsx';
import { isEnterKey } from '../shared/enterKey.js';

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
  info: '/icons-solid/info-circle.svg',
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
  /* 팀원 자기 보고 (PW-1262 ②) — 시안 `1on1-app.jsx` 멤버 READY 의 S3·S6·S7 중
     매니저 준비 화면 «멤버 작성 내용»이 받아 보이는 세 칸. */
  selfReportTitle: '매니저에게 전하는 자기 보고',
  selfReportDesc: '저장하면 매니저의 1on1 준비 화면에 보입니다.',
  selfManualBadge: '직접 입력',
  selfOkrTitle: 'OKR 자가 평가',
  selfOkrActual: '실제',
  selfOkrSelf: '자가 평가',
  selfOkrSliderLabel: '{kr} 자가 평가',
  selfCapsTitle: '역량 자가진단',
  selfCapPoint: '{label} {n}점',
  selfUpwardTitle: '매니저에게 피드백 (Upward Feedback)',
  selfUpwardPlaceholder: '매니저가 더 잘할 수 있는 것, 감사한 것',
  selfSave: '저장',
  selfSaved: '저장됨',
  selfSaveFailed: '저장하지 못했습니다. 적은 내용은 그대로 남아 있습니다.',
  /* 멤버 AI 보고서 (PW-1397) — 시안 `1on1-app.jsx` 멤버 READY 「한판 보고서 카드」 S2. */
  aiReportTitle: 'AI 보고서 — 업무·OKR·블로커 통합',
  aiReportEmpty: '위의 버튼을 눌러 AI 보고서를 생성하세요. 업무 요약, OKR 현황, 블로커 및 지원 요청이 하나의 보고서로 통합됩니다.',
  aiReportGenerate: 'AI 보고서 생성 — Daily Snippet·회의록·피드백 기반',
  aiReportGenerating: 'AI가 데이터를 분석하는 중...',
  aiReportRegenerate: '재생성',
  aiReportSource: '출처: {source}',
  aiReportFailed: 'AI 보고서 생성에 실패했습니다',
  aiReportFailTimeout: '생성이 30초를 넘겨 중단됐습니다. 잠시 후 다시 시도해 주세요.',
  aiReportFailModel: 'AI 응답을 받지 못했습니다. 잠시 후 다시 시도해 주세요.',
  aiReportFailQuota: 'AI 사용 한도를 모두 썼습니다. 워크스페이스 관리자에게 문의해 주세요.',
  aiReportFailExhausted: '여러 번 시도했지만 생성하지 못했습니다. 직접 입력해 주세요.',
  aiReportFailManual: '직접 입력해도 됩니다 — AI 없이 저장·제출할 수 있습니다.',
  aiReportRetry: '다시 시도',
  aiReportPlaceholder: '이번 기간 업무·OKR·블로커를 직접 적거나, AI 보고서를 생성해 고쳐 쓰세요.',
  aiReportSave: '저장',
  aiReportSaved: '저장됨',
  aiReportSaveFailed: '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  aiReportOverwrite: '고친 글이 새 AI 보고서로 바뀝니다. 다시 생성할까요?',
  aiReportOverwriteYes: '다시 생성',
  aiReportOverwriteCancel: '취소',
  elapsed: '경과', prepSummary: '준비 요약', okrStatus: 'OKR 현황', agenda: '논의 아젠다',
  pendingActions: '미완료 액션아이템',
  recordingNotice: '녹음 시작과 종료는 매니저 화면에서 진행됩니다',
  privateMemo: '개인 메모',
  privateMemoDesc: '매니저에게 공유되지 않습니다.',
  privateMemoOnlyMe: '나에게만 보임',
  memoSaving: '저장 중…',
  memoSaveError: '메모를 저장하지 못했습니다. 이어서 쓰면 다시 저장합니다.',
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
  // 지난 회차 목록 머리·행 (Figma 17556:23218)
  historyWith: '{name} 매니저와의 지난 원온원',
  historySubtitle: '총 {count}회 · 회차를 선택해 기록을 확인하세요',
  historyEmptyTitle: '아직 지난 원온원이 없습니다',
  historyOpen: '기록보기', historyAnalyzing: 'AI 분석 중', historyAction: '액션',
  pastSessionsEmpty: '지난 1on1 기록이 없습니다',
  historyCurrent: '현재 진행 중',
  backToHistory: '목록으로',
  highlights: '하이라이트', count: '건', countUnit: '건',
  managerFeedback: '매니저 피드백',
  feedbackStrengths: '관찰한 강점',
  feedbackSbi: '개선 피드백 (SBI)',
  feedbackSupport: '지원 계획',
  /* 공개 뒤 매니저가 본문을 고쳤다 (PW-1046 · 커트 2026-09-25 (다)). 근거 발췌 안의
     「본문을 다듬었습니다」(evidenceEdited)와 다른 사실이다 — 그쪽은 «발췌를 뽑은 뒤»,
     이쪽은 «팀원에게 공개한 뒤»다. */
  feedbackEditedAfterShare: '공개 후 수정됨',
  feedbackDoneShared: 'DONE 공개',
  /* 끝난 1on1 을 30일 동안 고치는 자리 (PW-1046) — 결과 탭의 개인 메모. */
  edit: '편집',
  editCancel: '취소',
  editSaving: '저장하는 중…',
  editSaveError: '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  editUntil: '{date}까지 고칠 수 있습니다',
  notesEmpty: '적어 둔 메모가 없습니다',
  evidenceToggle: '근거 발췌 {count}',
  evidenceCaption: '이 피드백의 근거가 된 대화 발췌입니다',
  evidenceMemberHidden: '멤버 비공개',
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
  /* 녹음은 있었고 받아쓰기도 돌았는데 유효 발화가 0건 (PW-627 · policy §11.7 EC-S6).
     「대화 기록이 없다」로 쓰면 매니저가 녹음을 안 한 것으로 읽힌다 — 녹음은 있었다. */
  transcriptSkipped: '이 녹음에서 대화 내용이 확인되지 않았습니다.',
  /* 갈린 회차의 기준점 (PW-556 R6). 인자는 «초»다 — 분 환산은 소비처가 한다. */
  transcriptOffsetNotice: (sec) =>
    `이 전문은 미팅 시작 후 ${Math.ceil(sec / 60)}분부터 기록됐습니다.`,
  managerPreparing: '매니저가 정리 중입니다',
  /* ── AI 분석 상태 띠 (policy §6.1 멤버 열) ── */
  analysisBusy: 'AI가 녹음을 분석 중입니다',
  analysisBusyDesc: 'STT 변환 → 요약 생성 → 액션아이템 추출 순으로 처리됩니다.',
  analysisDone: 'AI 분석 완료',
  analysisDoneDesc: '요약 및 액션아이템이 자동 생성되었습니다.',
  analysisSkipped: '이 녹음에서 대화 내용이 확인되지 않았습니다.',
  analysisSkippedDesc: '요약은 메모와 준비 항목으로 만들어졌습니다.',
  analysisSummarizing: '미팅 요약을 만들고 있습니다…',
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
    <DpStatusBadge className={`ono-mem-badge is-${status}`}>
      {status === 'live' && <span className="ono-mem-badge-dot" />}
      {label}
    </DpStatusBadge>
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

// 결정 사항은 예전엔 문자열, 매니저 끝난 화면 시안은 `{ title, badge, text }` 도 받는다 — 여기선 글만 쓴다.
const decisionText = (d) => (typeof d === 'string' ? d : d?.text ?? d?.title ?? '');

function noteSectionsOf(session, L) {
  const lines = (list) => (list ?? []).map((v) => String(v ?? '')).filter((v) => v.trim());
  return [
    { key: 'summary', label: L.mainDiscussion, items: lines([session.aiSummary]), summary: true },
    { key: 'decisions', label: L.keyDecisions, items: lines((session.keyDecisions ?? []).map(decisionText)) },
    { key: 'topics', label: L.topicsCovered, items: lines(session.topicsCovered) },
    { key: 'next', label: L.nextAgenda, items: lines(session.nextTopics) },
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
      {/* 같은 회의록을 매니저는 끝난 1on1 화면의 AI 요약 칸(`ono-done-ai` · 디자이너 시안)으로 본다 —
          팀원 결과 탭·매니저의 지난 회의록도 그 모양을 쓴다: 소제목 + 한 건마다 흰 블록 (PW-2190).
          예전엔 결정 사항을 한 덩어리 글로, 다룬 주제·다음 아젠다를 쉼표로 이어 붙였다. */}
      <section className="ono-done-ai" data-testid="ono-mem-notes">
        {recordingPlayer}
        {noteSectionsOf(session, L).map(({ key, label, items, summary }) => (
          <div className="ono-done-block" key={key} data-testid={`ono-mem-notes-${key}`}>
            <span className="ono-done-block-label">{label}</span>
            {items.length === 0 ? (
              <div className="ono-done-item">—</div>
            ) : (
              items.map((text, i) => (
                <div className={summary ? 'ono-done-item ono-done-summary' : 'ono-done-item'} key={`${key}-${i}`}>
                  <span className="ono-done-item-text">{text}</span>
                </div>
              ))
            )}
          </div>
        ))}
      </section>
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
        ) : session.sttStatus === 'skipped' ? (
          /* 받아썼는데 유효 발화가 0건 (PW-627 · policy §6.1 · EC-S6). 공개된 회차에서만
             온다 — 서버가 전사 상태를 녹음 재생과 같은 관문으로 싣는다(INV-P5). */
          <p className="ono-mem-transcript-note" data-testid="ono-transcript-skipped">
            {L.transcriptSkipped}
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
export function EvidenceToggle({ items, managerName, edited, L, icons, baseUrl, jump }) {
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
                {/* 대화 원문이 아닌 발췌(매니저 메모·요약·할 일)는 서버가 팀원에게 보내지 않는다 —
                    매니저가 «공개하면 이것도 간다»로 오해하지 않게 표시한다 (policy §6.5.1). */}
                {ev.source && ev.source !== 'stt' && (
                  <DpStatusBadge tone="neutral" className="ono-start-topic-badge" data-testid="ono-evidence-member-hidden">
                    {L.evidenceMemberHidden}
                  </DpStatusBadge>
                )}
              </div>
              <p className="ono-mem-evidence-text">{ev.text}</p>
              {/* 전문 공개(PW-81)된 회차에서만 원문의 그 자리로 보낸다. 앵커에 해당하는
                  발화가 전문에 없으면 비활성으로 그린다 — 눌러 놓고 아무 일도 안
                  일어나면 화면이 고장 난 것처럼 보인다. */}
              {jump?.enabled && (
                <Tooltip content={jump.has(ev.anchor) ? undefined : L.evidenceJumpMissing}>
                  <button
                    type="button"
                    className="ono-mem-evidence-jump"
                    data-testid="ono-evidence-jump"
                    disabled={!jump.has(ev.anchor)}
                    onClick={() => jump.to(ev.anchor)}
                  >
                    {L.evidenceJump}
                    <Icon src={icons.arrow} size={12} color="currentColor" baseUrl={baseUrl} />
                  </button>
                </Tooltip>
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
/**
 * `confirm` — 매니저 끝난 화면만 넘긴다 (PW-1551 · oneonone-spec §8-2). 항목마다 AI 초안의
 * 미확정(노랑 + «AI 미확정» + [확정]) / 확정(초록) 상태를 그린다. 공개하면 확정한 항목만 팀원에게 간다.
 * `{ confirmed: { strengths, sbi, support }, onConfirm(key), busyKey, error }`. 팀원 화면은 넘기지 않는다.
 */
export function ManagerFeedback({ session, evidence, loading, error, onRetry, managerName, L, icons, baseUrl, jump, headerExtra, confirm, sharedTag = false }) {
  const items = session.managerFeedback ?? [];
  if (items.length === 0) return null;
  // 공개 뒤 고쳤는가 (PW-1046) — 서버가 공개된 회차에만 싣는다. 매니저·팀원 화면 공통.
  const editedAfterShare = !!session.feedbackEditedAfterShareAt;
  // 「DONE 공개」 — 팀원 화면만 켠다 (`sharedTag`). 매니저가 공개해 팀원에게 온 피드백임을 밝힌다 (spec §5-3).
  const doneShared = sharedTag && !!session.isShared;

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
      badge={
        doneShared || editedAfterShare || headerExtra ? (
          <>
            {doneShared && (
              <DpStatusBadge className="ono-start-topic-badge" data-testid="ono-feedback-done-shared">
                {L.feedbackDoneShared}
              </DpStatusBadge>
            )}
            {editedAfterShare && (
              <DpStatusBadge className="ono-start-topic-badge" data-testid="ono-feedback-edited-after-share">
                {L.feedbackEditedAfterShare}
              </DpStatusBadge>
            )}
            {headerExtra}
          </>
        ) : undefined
      }
    >
      {/* 매니저 끝난 1on1 화면의 피드백 목록(`DoneFeedbackList` · 디자이너)과 같은 모양 — 굵은 소제목 + 본문.
          예전엔 소제목과 본문이 같은 회색 글씨로 똑같은 회색 상자에 들어 있었다 (PW-2190). */}
      <div className="ono-done-fb-list">
        {items.map((item) => {
          const confirmed = !!confirm?.confirmed?.[item.key];
          const aiState = confirm ? (confirmed ? ' is-ai-confirmed' : ' is-ai-unconfirmed') : '';
          return (
          <div
            className={`ono-done-fb${aiState}`}
            key={item.key}
            data-testid={confirm ? `ono-feedback-item-${item.key}` : undefined}
            data-confirmed={confirm ? String(confirmed) : undefined}
          >
            <div className="ono-done-fb-head">
              <span className="ono-done-fb-title">{titleOf(item.key)}</span>
              {confirm && !confirmed && (
                <DpStatusBadge className="ono-feedback-ai-badge" data-testid={`ono-feedback-unconfirmed-${item.key}`}>
                  {L.feedbackUnconfirmed}
                </DpStatusBadge>
              )}
            </div>
            <p className="ono-done-fb-text">{item.text}</p>

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
            {confirm && !confirmed && (
              <div className="ono-feedback-confirm-row">
                <button
                  type="button"
                  className="ono-feedback-confirm"
                  onClick={() => confirm.onConfirm?.(item.key)}
                  disabled={!!confirm.busyKey}
                  data-testid={`ono-feedback-confirm-${item.key}`}
                >
                  {confirm.busyKey === item.key ? L.feedbackConfirmBusy : L.feedbackConfirm}
                </button>
              </div>
            )}
          </div>
          );
        })}
      </div>
      {confirm?.error && (
        <p className="ono-done-inline-error" role="alert" data-testid="ono-feedback-confirm-error">
          {L.feedbackConfirmFailed}
        </p>
      )}
    </Section>
  );
}

/**
 * 끝난 1on1 에서 **30일 동안** 고치는 글 한 칸 (PW-1046 · 기획 §12 「DONE 후 30일」).
 *
 * 매니저 끝난 화면의 「매니저 메모」와 팀원 결과 탭의 「개인 메모」가 같은 모양을 쓴다.
 * 평소엔 읽기 전용 글이고, `edit.onSave` 가 오면 제목 줄에 «언제까지» 와 [편집]이 붙는다.
 * 기간이 지나 소비처가 `edit` 을 안 넘기면 [편집]이 사라진다 — 판정은 소비처가 한다
 * (서버와 같은 규칙을 소비처가 들고 있다).
 *
 * 자동저장이 아니다. 끝난 회차의 글은 팀원·매니저가 이미 읽었을 수 있어 [저장]을
 * 눌러야 나간다. `onSave` 가 거절(reject)하면 편집을 연 채로 두고 쓰던 글을 지우지
 * 않는다. 실패 문구는 `edit.error` 로 받는다.
 *
 * `edit.maxLength` 를 주면 그 글자 수까지만 쓸 수 있다 (pivit-work PW-1487 — 기획 메모 정책 «최대 10,000자»).
 */
export function EditableNotesCard({
  title, value, placeholder, emptyText, icon, L, icons, baseUrl, edit, testid = 'ono-notes',
}) {
  const [editOpen, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const canEdit = typeof edit?.onSave === 'function';
  const saving = !!edit?.saving;
  // 기간이 닫히면(소비처가 edit 을 거둠) 열려 있던 편집도 접힌다.
  const editing = editOpen && canEdit;

  const save = async () => {
    try {
      await edit.onSave(draft);
      setEditing(false);
    } catch {
      /* 실패 문구는 edit.error 가 그린다 — 쓰던 글은 그대로 둔다. */
    }
  };

  return (
    <Section
      title={title}
      icon={icon}
      icons={icons}
      baseUrl={baseUrl}
      collapsible={false}
      badge={
        canEdit && !editing ? (
          <EditBadge L={L} until={edit.until} testid={`${testid}-edit`} onEdit={() => {
            setDraft(value ?? '');
            setEditing(true);
          }} />
        ) : undefined
      }
    >
      {editing ? (
        <>
          <textarea
            className="ono-start-textarea"
            rows={6}
            value={draft}
            placeholder={placeholder}
            disabled={saving}
            maxLength={edit?.maxLength}
            aria-label={title}
            data-testid={`${testid}-input`}
            onChange={(e) => setDraft(e.target.value)}
          />
          {edit?.error && (
            <p className="ono-done-inline-error" role="alert" data-testid={`${testid}-error`}>
              {L.editSaveError}
            </p>
          )}
          <EditActions L={L} saving={saving} testid={testid} onCancel={() => setEditing(false)} onSave={save} />
        </>
      ) : (
        <p className="ono-mem-feedback-text" data-testid={`${testid}-text`}>
          {value?.trim() ? value : emptyText}
        </p>
      )}
    </Section>
  );
}

/** 제목 줄 오른쪽 — «언제까지» 와 [편집] (PW-1046). */
export function EditBadge({ L, until, onEdit, testid }) {
  return (
    <span className="ono-done-banner-actions ono-done-edit-badge">
      {until && <span className="ono-done-count">{fill(L.editUntil, { date: until })}</span>}
      <Button type="button" variant="secondary" size="sm" className="ono-done-banner-btn" onClick={onEdit} data-testid={testid}>
        {L.edit}
      </Button>
    </span>
  );
}

/** 편집 중 [취소]·[저장] (PW-1046). 저장 중에는 둘 다 잠근다 — 두 번 나가지 않게. */
export function EditActions({ L, saving, onCancel, onSave, testid, disabled = false }) {
  return (
    <div className="ono-done-manual-actions">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="ono-done-banner-btn"
        onClick={onCancel}
        disabled={saving}
        data-testid={`${testid}-cancel`}
      >
        {L.editCancel}
      </Button>
      <Button
        type="button"
        variant="primary"
        size="sm"
        className="ono-done-action-add-btn"
        onClick={onSave}
        disabled={saving || disabled}
        data-testid={`${testid}-save`}
      >
        {saving ? L.editSaving : L.save}
      </Button>
    </div>
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
          <DpStatusBadge className="ono-mem-chip">
            <Icon src={icons.clock} size={12} color="currentColor" baseUrl={baseUrl} />
            {duration}
          </DpStatusBadge>
        )}
        {extra}
      </div>
      {date && <p className="ono-mem-head-date">{date}</p>}
      {children}
    </header>
  );
}

/* ── ① 준비 (READY) ───────────────────────────────────── */
/**
 * 팀원 자기 보고 — OKR 자가 평가 · 역량 자가진단 · Upward Feedback (PW-1262 ②).
 *
 * 정본: 시안 `1on1-app.jsx` 멤버 READY 「한판 보고서 카드」의 S3(OKR 자가 평가) ·
 * S6(역량 자가진단) · S7(Upward Feedback) — 기획 원온원 §4.2.6 · §4.2.9 · §4.2.10.
 * 매니저 준비 화면(`StartOneOnOneView` «멤버 작성 내용»)이 받아 보이는 세 칸만 옮겼다.
 *
 * `value` = `{ okr: [{ id, title, actual, self }], capabilities: [{ key, label, value }],
 *   upwardFeedback, maxUpwardLength, onSave(patch) }`.
 * - OKR 슬라이더는 저장한 값이 없으면 실제 진행률에서 시작하고, 저장하면 KR 전부를 보낸다.
 * - 역량은 0 = 아직 안 고름이다. 고른 것만 보낸다.
 * - `onSave` 가 거절하면 「저장됨」을 띄우지 않고 실패를 이 카드 안에 말한다 — 적은 값은 그대로 둔다.
 */
function SelfAssessmentSection({ value, L, icons, baseUrl }) {
  const [okr, setOkr] = useState(() =>
    Object.fromEntries(value.okr.map((k) => [k.id, k.self ?? k.actual ?? 0])),
  );
  const [caps, setCaps] = useState(() =>
    Object.fromEntries(value.capabilities.filter((c) => c.value > 0).map((c) => [c.key, c.value])),
  );
  const [upward, setUpward] = useState(value.upwardFeedback ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState(false);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setFailed(false);
    try {
      await value.onSave({
        ...(value.okr.length > 0 && { okrSelf: okr }),
        capabilities: caps,
        upwardFeedback: upward,
      });
    } catch {
      setSaving(false);
      setFailed(true);
      return;
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const badge = <DpStatusBadge tone="neutral">{L.selfManualBadge}</DpStatusBadge>;

  return (
    <Section title={L.selfReportTitle} icon={icons.memo} icons={icons} baseUrl={baseUrl} collapsible={false}>
      <p className="ono-mem-hint">{L.selfReportDesc}</p>

      {value.okr.length > 0 && (
        <div className="ono-mem-self-block" data-testid="ono-self-okr">
          <div className="ono-mem-self-head">
            <span className="ono-start-field-label">{L.selfOkrTitle}</span>
            {badge}
          </div>
          {value.okr.map((kr) => (
            <div className="ono-start-okr-row" key={kr.id}>
              <span className="ono-start-okr-kr">{kr.title}</span>
              <span className="ono-mem-self-line">
                <span className="ono-start-okr-bar-label">{L.selfOkrActual}</span>
                <OkrBar value={kr.actual ?? 0} />
              </span>
              <span className="ono-mem-self-line">
                <span className="ono-start-okr-bar-label">{L.selfOkrSelf}</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  className="ono-mem-range"
                  value={okr[kr.id] ?? 0}
                  aria-label={fill(L.selfOkrSliderLabel, { kr: kr.title })}
                  onChange={(e) => setOkr((prev) => ({ ...prev, [kr.id]: Number(e.target.value) }))}
                />
                <span className="ono-start-okr-bar-pct">{okr[kr.id] ?? 0}%</span>
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="ono-mem-self-block" data-testid="ono-self-caps">
        <div className="ono-mem-self-head">
          <span className="ono-start-field-label">{L.selfCapsTitle}</span>
          {badge}
        </div>
        <div className="ono-start-caps">
          {value.capabilities.map((c) => (
            <div key={c.key} className="ono-start-cap-row">
              <span className="ono-start-cap-label">{c.label}</span>
              <RatingBar
                self
                value={caps[c.key] ?? 0}
                labelOf={(n) => fill(L.selfCapPoint, { label: c.label, n })}
                onChange={(n) => setCaps((prev) => ({ ...prev, [c.key]: n }))}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="ono-mem-self-block" data-testid="ono-self-upward">
        <div className="ono-mem-self-head">
          <span className="ono-start-field-label">{L.selfUpwardTitle}</span>
          {badge}
        </div>
        <textarea
          className="ono-start-textarea"
          value={upward}
          maxLength={value.maxUpwardLength}
          onChange={(e) => setUpward(e.target.value)}
          placeholder={L.selfUpwardPlaceholder}
          aria-label={L.selfUpwardTitle}
          rows={3}
        />
      </div>

      {failed && (
        <div className="ono-start-failbox" role="alert" data-testid="ono-self-save-error">
          <span className="ono-start-failbox-title">{L.selfSaveFailed}</span>
        </div>
      )}
      <div className="ono-mem-actions-end">
        <button
          type="button"
          className={`ono-mem-btn${saved ? ' is-ok' : ''}`}
          onClick={save}
          disabled={saving}
          data-testid="ono-self-save"
        >
          {saved ? L.selfSaved : L.selfSave}
        </button>
      </div>
    </Section>
  );
}

/**
 * 멤버 AI 보고서 (PW-1397) — 팀원이 버튼을 누르면 AI 가 이번 기간 스니핏·회의록·피드백으로
 * 업무·OKR·블로커를 한 편의 글로 쓴다. 매니저 준비 화면 «멤버 AI 보고서»가 같은 글을 보인다.
 *
 * 정본: 시안 `1on1-app.jsx` 멤버 READY 「한판 보고서 카드」 S2 · 실패 §7.5.
 * - 팀원이 글을 고치거나 AI 없이 처음부터 써서 [저장]할 수 있다(2026-10-08 커트 결정). 고치지 않은
 *   AI 글만 미확인 노랑(§7.2)으로 감싼다.
 * - 고친 글이 있는데 [재생성]·[AI 보고서 생성]을 누르면 덮어쓰기 전에 카드 안에서 한 번 묻는다.
 * - 실패는 이 카드 안에서 말한다. 이미 있던 글은 지우지 않는다(§7.5.2) — 호스트가 `text` 를 그대로 넘긴다.
 * - 한도 초과는 다시 눌러도 같아서 `다시 시도` 를 잠근다. 연속 실패 횟수는 호스트가 센다(`retryLeft`).
 *
 * `value` = `{ text, sourceLabel, edited, maxLength, busy, failure: { reason, retryLeft } | null,
 *   onGenerate(), onSave(text) → Promise }`.
 */
const AI_REPORT_FAIL_LABEL = {
  timeout: 'aiReportFailTimeout',
  model_error: 'aiReportFailModel',
  quota_exceeded: 'aiReportFailQuota',
};

export function AiReportSection({ value, L, icons, baseUrl, readOnly = false }) {
  const { text, sourceLabel, edited = false, maxLength, busy = false, failure = null, onGenerate, onSave } = value;
  const [draft, setDraft] = useState(text ?? '');
  useAiDraftLifecycle('oneonone_member_report', value.generatedAt ? [{
    key: 'report', original: null, text: draft, revision: value.generatedAt, confirmed: edited,
  }] : []);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  // 생성·재생성·저장으로 서버 글이 바뀌면 입력란을 그 글로 맞춘다 (렌더 중 맞춤 — effect 로 하면 한 번 더 그린다).
  const [syncedText, setSyncedText] = useState(text ?? '');
  if ((text ?? '') !== syncedText) {
    setSyncedText(text ?? '');
    setDraft(text ?? '');
  }

  const reason = AI_REPORT_FAIL_LABEL[failure?.reason] ? failure.reason : 'model_error';
  const quota = reason === 'quota_exceeded';
  const exhausted = !!failure && !quota && (failure.retryLeft ?? 0) <= 0;
  const dirty = draft !== (text ?? '');
  // 팀원이 손댄 글이 있으면 AI 글로 덮기 전에 묻는다 — 고치지 않은 AI 글은 묻지 않고 바꾼다.
  const needsConfirm = draft.trim() !== '' && (edited || dirty);
  const generate = () => {
    if (needsConfirm) setConfirming(true);
    else onGenerate?.();
  };
  const confirmOverwrite = () => {
    setConfirming(false);
    onGenerate?.();
  };
  const save = async () => {
    if (saving || !dirty) return;
    setSaving(true);
    setSaveFailed(false);
    try {
      await onSave?.(draft);
    } catch {
      setSaving(false);
      setSaveFailed(true);
      return;
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  if (readOnly) {
    return <Section title={L.aiReportTitle} icon={icons.aiSummary} icons={icons} baseUrl={baseUrl} collapsible={false}>
      <p className="ono-my-readbox">{text || L.aiReportEmpty}</p>
    </Section>;
  }

  const regenerate = text && (
    <button
      type="button"
      className="ono-mem-ai-regen"
      onClick={generate}
      disabled={busy || confirming}
      data-testid="ono-ai-report-regenerate"
    >
      {busy ? L.aiReportGenerating : L.aiReportRegenerate}
    </button>
  );
  const textarea = (
    <textarea
      className="ono-start-textarea"
      value={draft}
      maxLength={maxLength}
      onChange={(e) => setDraft(e.target.value)}
      placeholder={L.aiReportPlaceholder}
      aria-label={L.aiReportTitle}
      disabled={busy}
      rows={8}
      data-testid="ono-ai-report-input"
    />
  );
  const source = text && sourceLabel && (
    <p className="ono-start-report-source">{fill(L.aiReportSource, { source: sourceLabel })}</p>
  );

  return (
    <Section title={L.aiReportTitle} icon={icons.aiSummary} icons={icons} baseUrl={baseUrl} badge={regenerate} collapsible={false}>
      {failure && !busy && (
        <div className="ono-start-failbox" role="alert" data-testid="ono-ai-report-error" data-reason={reason}>
          <span className="ono-start-failbox-title">{L.aiReportFailed}</span>
          <p className="ono-start-failbox-msg">
            {exhausted ? L.aiReportFailExhausted : `${L[AI_REPORT_FAIL_LABEL[reason]]} ${L.aiReportFailManual}`}
          </p>
          <div className="ono-start-failbox-actions">
            <button
              type="button"
              className="ono-start-failbox-retry"
              onClick={generate}
              disabled={quota || exhausted}
            >
              {L.aiReportRetry}
            </button>
          </div>
        </div>
      )}

      {confirming && (
        <div className="ono-mem-ai-confirm" role="group" aria-label={L.aiReportOverwrite} data-testid="ono-ai-report-overwrite">
          <p className="ono-mem-ai-confirm-msg">{L.aiReportOverwrite}</p>
          <div className="ono-mem-actions-end">
            <button type="button" className="ono-mem-btn is-secondary" onClick={() => setConfirming(false)}>
              {L.aiReportOverwriteCancel}
            </button>
            <button type="button" className="ono-mem-btn" onClick={confirmOverwrite} data-testid="ono-ai-report-overwrite-yes">
              {L.aiReportOverwriteYes}
            </button>
          </div>
        </div>
      )}

      {!text && (
        <>
          <button
            type="button"
            className="ono-mem-btn ono-mem-ai-generate"
            onClick={generate}
            disabled={busy || confirming}
            data-testid="ono-ai-report-generate"
          >
            {busy ? L.aiReportGenerating : L.aiReportGenerate}
          </button>
          <p className="ono-mem-hint">{L.aiReportEmpty}</p>
        </>
      )}

      {text && !edited ? (
        <div className="ono-mem-ai-report" data-testid="ono-ai-report-text">
          {textarea}
          {source}
        </div>
      ) : (
        <>
          {textarea}
          {source}
        </>
      )}

      {saveFailed && (
        <div className="ono-start-failbox" role="alert" data-testid="ono-ai-report-save-error">
          <span className="ono-start-failbox-title">{L.aiReportSaveFailed}</span>
        </div>
      )}
      <div className="ono-mem-actions-end">
        <button
          type="button"
          className={`ono-mem-btn${saved ? ' is-ok' : ''}`}
          onClick={save}
          disabled={saving || busy || !dirty}
          data-testid="ono-ai-report-save"
        >
          {saved ? L.aiReportSaved : L.aiReportSave}
        </button>
      </div>
    </Section>
  );
}

function PrepScreen({ session, manager, avatar, okrStatus, healthHistory, isHost, L, icons, baseUrl, formatDate, healthColor, onTopicsChange, onStart, onMemberReady, memberReady, selfAssessment, aiReport }) {
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
        /* 🔴 아직 안 한 1on1 의 머리에는 **잡아 둔 시각**을 보인다 — 「만든 날」이 아니다
           (PW-825). `createdAt` 은 예약을 옮겨도 그대로라, 매니저가 시각을 바꿔도 팀원
           화면은 옛 날짜를 그대로 보여 준다. 형식은 호스트가 `variant` 로 정한다 —
           날짜만 쓰던 종전 호스트는 이 값을 무시하므로 종전 화면 그대로다. */
        date={
          session.scheduledAt
            ? formatDate(session.scheduledAt, 'scheduled')
            : formatDate(heldAtOf(session))
        }
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
                <span className="ono-mem-cell is-sub">{ownerLabelOf(item, L)}</span>
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
                <DpStatusBadge key={i} className="ono-start-topic-badge">{s}</DpStatusBadge>
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

      {/* 멤버 AI 보고서 (PW-1397) — 시안 순서대로 자기 보고 위. 호스트가 값을 안 넘기면 자리도 없다. */}
      {!isHost && aiReport && (
        <AiReportSection value={aiReport} L={L} icons={icons} baseUrl={baseUrl} />
      )}

      {/* 팀원 자기 보고 (PW-1262 ②) — 팀원만 쓴다. 호스트가 값을 안 넘기면 자리도 없다. */}
      {!isHost && selfAssessment && (
        <SelfAssessmentSection value={selfAssessment} L={L} icons={icons} baseUrl={baseUrl} />
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
            onKeyDown={(e) => { if (isEnterKey(e)) { e.preventDefault(); addTopic(); } }}
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
  const [startAt] = useState(() => (session.startedAt ? new Date(session.startedAt).getTime() : Date.now()));
  const prevActions = (session.aiBriefing?.prevActions ?? []).filter((a) => !a.done);
  const okrStatus = session.aiBriefing?.okrStatus ?? [];


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

      <MemberPrivateMemo session={session} L={L} icons={icons} baseUrl={baseUrl} onSaveNotes={onSaveNotes} />

      <p className="ono-mem-hint ono-mem-center">{L.meetingEndByManager}</p>
    </>
  );
}

// 기존 팀원 개인 메모의 모양·저장 흐름을 그대로 꺼낸 부품 (PW-575).
//
// `autoSave` 를 넘기면 [저장] 버튼 없이 쓰는 대로 저장한다 (spec §4-3 메모 정책 · PW-1488).
// 디바운스·실패 처리는 호스트(자동 저장 훅) 몫이다 — `DoneOneOnOneView` 의 다음 1on1 사전 메모와 같은 나눔.
//   `{ onChange(text), saving, saved, error, restoredValue, maxLength }`
// 넘기지 않으면 예전처럼 [저장]을 눌러 `onSaveNotes` 로 보낸다.
export function MemberPrivateMemo({ session, L, icons, baseUrl, onSaveNotes, showEndNotice = false, autoSave }) {
  const [memo, setMemo] = useState(autoSave?.restoredValue ?? session.memberNotes ?? '');
  const [saved, setSaved] = useState(false);
  // PW-966 — 저장이 끝난 «뒤에» 「저장됨」을 띄운다. 예전에는 결과를 받기 전에 띄워서
  // 서버가 거절해도 「저장됨」이 보였다. 실패 안내는 소비처 몫이다(앱은 토스트).
  const [saving, setSaving] = useState(false);
  // 서버 값이 늦게 도착할 때만 따라간다 — 쓰는 중인 글을 서버 응답으로 덮으면 글자가 사라진다.
  const touched = useRef(false);
  const follow = autoSave ? (autoSave.restoredValue ?? session.memberNotes ?? '') : null;
  useEffect(() => {
    if (follow !== null && !touched.current) setMemo(follow);
  }, [follow]);
  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSaveNotes(memo);
    } catch {
      setSaving(false);
      return;
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const onlyMe = (
    <DpStatusBadge tone="neutral" className="ono-start-topic-badge" data-testid="ono-private-memo-only-me">
      {L.privateMemoOnlyMe}
    </DpStatusBadge>
  );

  return (<>
      {/* 딱지는 `badge` 자리가 아니라 제목 안에 둔다 — 접히는 머리줄은 양 끝으로 벌어져 `badge` 가 가운데에 뜬다.
          같은 창의 디자이너 제목(「논의하고 싶은 주제」+딱지)처럼 제목 바로 옆에 붙인다 (spec §5-2). */}
      <Section title={<>{L.privateMemo}{onlyMe}</>} icon={icons.memo} icons={icons} baseUrl={baseUrl}>
        <p className="ono-mem-hint">{L.privateMemoDesc}</p>
        <textarea
          className="ono-start-textarea"
          value={memo}
          onChange={(e) => {
            setMemo(e.target.value);
            if (autoSave) {
              touched.current = true;
              autoSave.onChange?.(e.target.value);
            }
          }}
          placeholder={L.memoPlaceholder}
          maxLength={autoSave?.maxLength}
          rows={8}
          data-testid="ono-private-memo"
        />
        {autoSave ? (
          <>
            {(autoSave.saving || autoSave.saved) && (
              <div className="ono-mem-actions-end">
                <span className="ono-mem-hint" data-testid="ono-private-memo-status">
                  {autoSave.saving ? L.memoSaving : L.saved}
                </span>
              </div>
            )}
            {autoSave.error && (
              <p className="ono-done-inline-error" role="alert" data-testid="ono-private-memo-error">
                {L.memoSaveError}
              </p>
            )}
          </>
        ) : (
          <div className="ono-mem-actions-end">
            <button type="button" className={`ono-mem-btn${saved ? ' is-ok' : ''}`} onClick={save}>
              {saved ? L.saved : L.save}
            </button>
          </div>
        )}
      </Section>
      {showEndNotice && <p className="ono-mem-hint ono-mem-center">{L.meetingEndByManager}</p>}
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
      <span className="ono-mem-cell is-sub">{ownerLabelOf(item, L)}</span>
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
 *
 * 머리의 딱지는 대표 감정(가장 큰 비율 · PW-1486) — 매니저 결과 화면 「대화 분위기」와 같은
 * 판정(`dominantSentiment`)이다. 뉘앙스 태그·인사이트는 매니저 전용이라 여기엔 없다.
 */
export function EmotionTone({ session, L, icons, baseUrl }) {
  const tone = session.emotionTone;
  const total = tone.positive + tone.neutral + tone.negative;
  const rows = [
    { key: 'positive', label: L.emotionPositive, value: tone.positive, color: 'var(--utility-green-600)' },
    { key: 'neutral', label: L.emotionNeutral, value: tone.neutral, color: 'var(--text-tertiary)' },
    { key: 'negative', label: L.emotionNegative, value: tone.negative, color: 'var(--colors-error-600)' },
  ];
  const dominant = dominantSentiment(tone);
  const dominantRow = rows.find((r) => r.key === dominant);
  return (
    <Section
      // 딱지는 제목 «옆»에 둔다 — `badge` 자리는 접기 화살표와 양끝 정렬이라 머리 한가운데 뜬다.
      title={
        <>
          {L.emotionTone}
          {dominantRow && (
            <DpStatusBadge
              tone={SENTIMENT_BADGE_TONE[dominant]}
              className="ono-done-badge is-pill"
              data-testid="ono-emotion-dominant"
              data-dominant={dominant}
            >
              {dominantRow.label}
            </DpStatusBadge>
          )}
        </>
      }
      icon={icons.health}
      icons={icons}
      baseUrl={baseUrl}
    >
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

/**
 * 팀원 결과 화면의 AI 분석 상태 띠 (policy §6.1 멤버 열 · PW-1489).
 *
 * 모양은 매니저 끝난 화면의 분석 띠(`DoneOneOnOneView` `AnalysisBanner`)와 같다. 판정은 정책서 멤버 열대로
 * **전사 상태**로 한다 — 매니저 띠(`doneBannerState`)는 요약이 오면 「완료」로 넘어가지만, 멤버 열은
 * 전사 중이면 요약이 있어도(다시 돌리는 중) 「분석 중」이다.
 * 🔴 `sttStatus` 가 없으면 그리지 않는다 — 서버는 매니저가 공개하고 대화 원문까지 공개한 회차에만
 * 그 값을 싣는다(녹음 여부가 새지 않게 · INV-P5). 녹음이 없던 회차도 값이 없으니 띠가 없다.
 * 실패(`failed`)와 «전사는 끝났는데 요약이 아직 없음»은 정책서 멤버 열에 없고, 이 화면은 다시 읽지 않아
 * 「분석 중」을 띄우면 멈춘 채 남는다 — 그리지 않는다.
 */
function MemberAnalysisBanner({ session, L, icons, baseUrl }) {
  const stt = session.sttStatus;
  const hasSummary = !!(session.aiSummary && String(session.aiSummary).trim());
  if (stt === 'processing') {
    return (
      <div className="ono-done-banner is-busy" data-testid="ono-member-analysis-banner" data-state="processing">
        <Spinner size={20} />
        <span>{`${L.analysisBusy} — ${L.analysisBusyDesc}`}</span>
      </div>
    );
  }
  if (stt === 'skipped') {
    // 요약이 아직 없으면 「메모로 만들어졌습니다」가 거짓이다 — 매니저 띠처럼 「만드는 중」으로 말한다.
    return (
      <div
        className="ono-done-banner"
        data-testid="ono-member-analysis-banner"
        data-state={hasSummary ? 'skipped' : 'skipped-summarizing'}
      >
        {hasSummary ? (
          <Icon src={icons.info} size={16} color="currentColor" baseUrl={baseUrl} />
        ) : (
          <Spinner size={20} />
        )}
        <span>{`${L.analysisSkipped} ${hasSummary ? L.analysisSkippedDesc : L.analysisSummarizing}`}</span>
      </div>
    );
  }
  if (stt === 'completed' && hasSummary) {
    return (
      <div className="ono-done-banner is-ok" data-testid="ono-member-analysis-banner" data-state="done">
        <Icon src={icons.check} size={16} color="currentColor" baseUrl={baseUrl} />
        <span>{`${L.analysisDone} — ${L.analysisDoneDesc}`}</span>
      </div>
    );
  }
  return null;
}

function ResultScreen({ session, manager, avatar, renderAvatar, L, icons, baseUrl, formatDate, formatDuration, deadlineOf, onToggleAction, feedbackEvidence, renderRecordingPlayer, resultNotes }) {
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
        date={formatDate(heldAtOf(session))}
        duration={session.durationSec > 0 ? formatDuration(session.durationSec) : null}
        avatar={hostAvatar}
        L={L} icons={icons} baseUrl={baseUrl}
      />

      <MemberAnalysisBanner session={session} L={L} icons={icons} baseUrl={baseUrl} />

      {session.isShared === false && (
        <EmptyState title={L.managerPreparing} description={L.noSummary} />
      )}

      {/* 내 개인 메모 (PW-1046) — 팀원 자신의 글이라 매니저가 공개하지 않은 회차에도
          보인다. 끝난 뒤 30일 동안 고친다(`resultNotes` 가 올 때만 [편집]). */}
      <EditableNotesCard
        title={L.privateMemo}
        value={session.memberNotes ?? ''}
        placeholder={L.memoPlaceholder}
        emptyText={L.notesEmpty}
        icon={icons.memo}
        L={L}
        icons={icons}
        baseUrl={baseUrl}
        edit={resultNotes}
        testid="ono-result-notes"
      />

      {session.isShared === false ? null : (
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
            sharedTag
            {...(feedbackEvidence || {})}
          />

          <Section
            title={L.myActionItems}
            icon={icons.actions}
            icons={icons}
            baseUrl={baseUrl}
            collapsible={false}
            badge={<DpStatusBadge className="ono-start-topic-badge">{doneCount}/{myActions.length} {L.completed}</DpStatusBadge>}
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
function HistoryDetail({ session, manager, avatar, renderAvatar, L, icons, baseUrl, formatDate, formatDuration, onBack, feedbackEvidence, renderRecordingPlayer, historyNotes }) {
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
        date={formatDate(heldAtOf(session))}
        duration={session.durationSec > 0 ? formatDuration(session.durationSec) : null}
        avatar={hostAvatar}
        L={L} icons={icons} baseUrl={baseUrl}
        extra={
          <DpStatusBadge className="ono-mem-chip" data-testid="ono-view-mode">{L.viewModeFull}</DpStatusBadge>
        }
      >
        <button type="button" className="ono-mem-back" onClick={onBack}>
          <Icon src={icons.back} size={14} color="currentColor" baseUrl={baseUrl} />
          {L.backToHistory}
        </button>
      </SessionHeader>

      {/* 내 개인 메모 (PW-575 · 2026-10-25) — 결과 탭의 같은 카드를 그대로 옮겼다. 호스트가
          `historyNotes` 를 넘길 때만 선다(매니저가 팀원 화면을 보면 안 넘긴다 — 팀원만의 글이다).
          돌려준 값이 `null` 이면 읽기만, 편집 값이면 [편집](끝난 뒤 30일 · 기획 §12). */}
      {historyNotes && (
        <EditableNotesCard
          key={session.id}
          title={L.privateMemo}
          value={session.memberNotes ?? ''}
          placeholder={L.memoPlaceholder}
          emptyText={L.notesEmpty}
          icon={icons.memo}
          L={L}
          icons={icons}
          baseUrl={baseUrl}
          edit={historyNotes(session)}
          testid="ono-history-notes"
        />
      )}

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
        sharedTag
        {...(feedbackEvidence || {})}
      />


      {session.actionItems.length > 0 && (
        <Section
          title={L.myActionItems}
          icon={icons.actions}
          icons={icons}
          baseUrl={baseUrl}
          collapsible={false}
          badge={<DpStatusBadge className="ono-start-topic-badge">{session.actionItems.length}{L.count}</DpStatusBadge>}
        >
          <div className="ono-mem-table">
            <ColHeads cols={[L.colContent, L.colAssignee, L.colStatus]} />
            {/* 지난 회의록은 읽기 전용이다 — 눌러도 완료가 바뀌지 않는다 (PW-1638, 기획 §10.3).
                메모와 달리 30일 안이어도 열지 않는다(PW-575 · 2026-10-25). */}
            {session.actionItems.map((item) => (
              <div className="ono-mem-row" key={item.id}>
                <span className="ono-mem-cell">{item.text}</span>
                <span className="ono-mem-cell is-sub">{ownerLabelOf(item, L)}</span>
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

function HistoryScreen({ sessions, session, onCurrentOpen, manager, avatar, renderAvatar, L, icons, baseUrl, formatDate, formatDuration, healthColor, healthBg, healthBorder, feedbackEvidence, onHistorySelect, renderRecordingPlayer, historyNotes }) {
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
        onBack={() => select(null)}
        feedbackEvidence={feedbackEvidence}
        renderRecordingPlayer={renderRecordingPlayer}
        historyNotes={historyNotes}
      />
    );
  }

  // 목록은 공용 `OneOnOnePastSessionList` (Figma 17556:23218) — 날짜·길이는 호스트 포맷으로
  // 완성해 넘기고, AI 분석이 아직 끝나지 않은 회차는 [기록보기] 대신 「AI 분석 중」 이다.
  const rows = done.map((s) => {
    const mine = s.actionItems.filter((a) => a.owner === 'member');
    return {
      id: s.id,
      dateLabel: formatDate(heldAtOf(s), 'short'),
      durationLabel: s.durationSec > 0 ? formatDuration(s.durationSec) : '',
      actionDone: mine.filter((a) => a.done).length,
      actionTotal: mine.length,
      summary: s.aiSummary ?? '',
      analyzing: isDonePending(doneBannerState(s)),
    };
  });
  // 진행 중인 회차(ready|live)는 목록 맨 위 「현재 진행 중」 행이다(Figma 17556:23596 · 데모 OneOnOnePage.jsx `memberCurrent`).
  // 요약 자리에는 팀원이 적은 주제를, 액션 수는 데모처럼 **팀원이 준비하며 제안한 액션**(`memberSelfAssessment.proposedActions`)을
  // 「0/N」으로 둔다 — 끝나기 전 회차에는 확정된 액션(`actionItems`)이 없어 그걸 세면 칸이 영영 비기 때문이다.
  // 호스트가 `onCurrentOpen` 을 안 넘기면 행이 없다 — 행을 눌러 갈 화면이 없어서다.
  const proposedNow = session?.memberSelfAssessment?.proposedActions ?? [];
  const current = session && onCurrentOpen ? {
    id: session.id,
    dateLabel: formatDate(heldAtOf(session), 'short'),
    actionDone: 0,
    actionTotal: proposedNow.length,
    summary: (session.memberTopics ?? []).join(' · '),
    onOpen: () => onCurrentOpen(session),
  } : null;

  return (
    <OneOnOnePastSessionList
      title={fill(L.historyWith, { name: manager.name })}
      subtitle={fill(L.historySubtitle, { count: done.length })}
      sessions={rows}
      current={current}
      onOpen={(r) => select(r.id)}
      labels={{ open: L.historyOpen, analyzing: L.historyAnalyzing, action: L.historyAction, current: L.historyCurrent }}
      emptyTitle={L.historyEmptyTitle}
      emptyText={L.pastSessionsEmpty}
      baseUrl={baseUrl}
    />
  );
}

/* ── 탭 ───────────────────────────────────────────────── */
/**
 * 단계 탭 — 공용 Tabs (PW-836).
 *
 * 아직 갈 수 없는 단계는 탭을 잠근다(`enabled[id]` 가 false → items[].disabled).
 * 부제(사전 작성/진행 중…)는 시안에 없어 뺐다.
 */
function TabNav({ tab, onChange, enabled, L }) {
  const items = [
    { value: 'prep', label: L.tabPrep },
    { value: 'meeting', label: L.tabMeeting },
    { value: 'result', label: L.tabResult },
    { value: 'history', label: L.tabHistory },
  ].map((it) => ({ ...it, disabled: !enabled[it.value] }));

  return (
    <div className="tl-tabs-row ono-mem-tabs-row">
      <Tabs items={items} value={tab} onChange={(id) => enabled[id] && onChange(id)} />
    </div>
  );
}

/* ── 캔버스 ───────────────────────────────────────────── */
export default function OneOnOneMemberCanvas({
  tab = 'prep',
  onTabChange,
  showPhaseTabs = true,
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
   * 팀원 자기 보고 (PW-1262 ②) — `{ okr, capabilities, upwardFeedback, maxUpwardLength, onSave }`.
   * 안 넘기면 준비 화면에 그 카드가 없다(종전 화면 그대로). `onSave` 는 Promise 를 돌려주고,
   * 거절하면 카드가 실패를 말하고 적은 값을 남긴다.
   */
  selfAssessment = null,
  /**
   * 멤버 AI 보고서 (PW-1397) — `{ text, sourceLabel, busy, failure, onGenerate }`.
   * 안 넘기면 준비 화면에 그 카드가 없다. `failure` = `{ reason: 'timeout'|'model_error'|'quota_exceeded',
   * retryLeft }` — 있으면 카드 안에 실패 박스를 그린다. `text` 는 실패해도 직전 글을 넘긴다.
   */
  aiReport = null,
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
  /**
   * 결과 탭 「개인 메모」 고치기 (PW-1046). `{ until, saving, error, onSave(text) }`.
   *
   * **안 넘기면 [편집]이 없다** — 끝난 뒤 30일이 지났는지는 소비처가 판정해 이 값을
   * 거둔다. `onSave` 는 Promise 를 돌려주고, 거절하면 편집이 열린 채 남는다.
   */
  resultNotes = null,
  /**
   * 히스토리 상세 「개인 메모」 (PW-575 · 2026-10-25) — `(session) => { until, saving, error, onSave(text) } | null`.
   *
   * 넘기면 상세에 결과 탭과 같은 메모 카드가 선다. 회차마다 고칠 수 있는지가 달라서(끝난 뒤 30일)
   * 함수로 받고, `null` 을 돌려주면 그 회차는 읽기만 된다. **안 넘기면 카드가 없다**(매니저가 보는 경우).
   */
  historyNotes,
  /**
   * 탭 줄 **위**에 서는 안내 띠 자리 (PW-1718) — 팀원 녹음 안내·동의 띠를 소비처가 넣는다.
   *
   * 캔버스 밖에 두면 본문(가운데 좁은 칸)과 달리 화면 끝까지 펼쳐져서, 같은 칸 안에 세운다.
   * 안 넘기면 자리 자체가 없다(종전 화면 그대로).
   */
  notice = null,
  preparation = null,
  /**
   * 히스토리 목록 맨 위 「현재 진행 중」 행을 눌렀을 때 — `(session) => void` (2026-10-24, Figma 17556:23596).
   * 진행 중인 회차(`session`)가 있고 이 값을 넘기면 지난 회차 목록 위에 그 회차를 파란 행으로 세운다.
   * 호스트가 진행 화면으로 보낸다. 안 넘기면 행이 없다(종전 목록 그대로).
   */
  onCurrentOpen,
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
      {notice}
      {showPhaseTabs && <TabNav tab={tab} onChange={onTabChange} enabled={enabled} L={L} />}

      {tab === 'prep' && (preparation ?? (session && session.status === 'ready' ? (
        <PrepScreen
          {...shared}
          session={session} manager={manager} avatar={avatar} okrStatus={okrStatus}
          healthHistory={healthHistory} isHost={isHost} healthColor={healthColor}
          onTopicsChange={onTopicsChange} onStart={onStart}
          onMemberReady={onMemberReady} memberReady={memberReady}
          selfAssessment={selfAssessment}
          aiReport={aiReport}
        />
      ) : <EmptyState description={L.noPrepSession} />))}

      {tab === 'meeting' && (preparation ?? (session && session.status === 'live' ? (
        <MeetingScreen {...shared} session={session} manager={manager} avatar={avatar} onSaveNotes={onSaveNotes} />
      ) : <EmptyState description={L.noLiveSession} />))}

      {tab === 'result' && (resultSession ? (
        <ResultScreen
          {...shared}
          session={resultSession} manager={manager} avatar={avatar} renderAvatar={renderAvatar}
          deadlineOf={deadlineOf} onToggleAction={onToggleAction}
          feedbackEvidence={feedbackEvidence}
          renderRecordingPlayer={renderRecordingPlayer}
          resultNotes={resultNotes}
        />
      ) : <EmptyState description={L.noResultSession} />)}

      {/* HistoryScreen 에는 healthHistory 를 넘기지 않는다 — 회차 배지는 회차가 들고
          있는 값(`session.healthScore`)만 쓴다 (PW-213). 화면 단위 추이는 준비 화면
          그래프(PrepScreen)에서 계속 쓴다. */}
      {tab === 'history' && (
        <HistoryScreen
          {...shared}
          sessions={sessions} session={session} onCurrentOpen={onCurrentOpen}
          manager={manager} avatar={smallAvatar} renderAvatar={renderAvatar}
          healthColor={healthColor} healthBg={healthBg} healthBorder={healthBorder}
          feedbackEvidence={feedbackEvidence}
          onHistorySelect={onHistorySelect}
          renderRecordingPlayer={renderRecordingPlayer}
          historyNotes={historyNotes}
        />
      )}
    </div>
  );
}
