import { useEffect, useRef, useState } from 'react';
import Icon from '../shared/Icon.jsx';
import { fill, hostOf } from './sessionHelpers.js';
import { doneBannerState, isDonePending } from './doneViewHelpers.js';
import {
  Section,
  ManagerFeedback,
  SessionHeader,
  transcriptAnchor,
  useTranscriptJump,
} from './OneOnOneMemberCanvas.jsx';

/**
 * 매니저 **DONE 단계** 뷰 (PW-430).
 *
 * 정본: `pivit-specs` `oneonone-spec.md` §4-4 · `screen-oneonone-session.policy.md` §6,
 * 시안 `1on1-manager-view.jsx` 의 `phase === "done"` 블록.
 *
 * ## 왜 별도 컴포넌트인가
 *
 * `StartOneOnOneView` 는 READY/LIVE 만 그린다. 그래서 소비처는 종료 뒤 갈 곳이 없어
 * **1on1 대시보드로 나가 버렸고**, 방금 만들어진 AI 요약을 매니저가 한 번도 못 보고
 * 회차가 끝났다. 정본은 이동을 말하지 않는다 — LIVE → DONE 은 `setPhase("done")`,
 * 즉 **같은 화면의 단계 전환**이다(policy §2.3).
 *
 * 지난 회차 회의록(`OneOnOneMemberMeetingsCanvas` record 뷰)과도 다르다. 그쪽은
 * **열람 전용**이라 액션아이템 체크·사전 메모·다음 예약을 대신하지 못한다. 공통 조각
 * (섹션 껍데기·매니저 피드백·근거 발췌·전문 딥링크)은 그 파일들에서 그대로 가져다 쓰고,
 * 여기서는 **매니저가 지금 입력하는 것들**만 새로 그린다.
 *
 * ## 값이 없는 섹션은 그리지 않는다
 *
 * 빈 카드는 「아직 안 나왔다」와 「나올 것이 없다」를 구분해 주지 못한다(PW-370 의
 * `RecurringPatterns` 가 같은 규칙으로 산다). 예외는 **매니저가 지금 입력할 수 있는**
 * 섹션 — 액션아이템·사전 메모·다음 예약 — 이다. 그쪽은 비어 있어도 입력 자리가 있어야
 * 한다.
 *
 * ## 호스트가 소유하는 것
 *
 * i18n 라벨(`labels`) · 날짜 포맷(사용자 시간대) · 아바타 · 서버 호출 전부.
 * 캔버스는 계산하지도 저장하지도 않는다 — 받은 값을 그리고 콜백을 부른다.
 *
 * ## 피드백 공개는 이 화면이 유일한 자리다 (PW-432)
 *
 * 기획서 §6.4.2 는 이 자리에 「공개」 버튼을 둔다. PW-430 은 되돌리는 경로가 제품에
 * 없어서 배지만 남겼는데(PW-274 가 그 쌍을 만들었다가 자리 판단 때문에 되돌리기까지
 * 함께 걷어냈다), PW-432 가 되돌리기를 되살리면서 컨트롤을 붙였다.
 *
 * 컨트롤은 `share` prop 을 받았을 때만 그린다 — 안 넘기면 지금까지처럼 배지만 나온다.
 * 공개를 다루는 자리를 여기 하나로 둔다. 대시보드 팀원 카드·별도 관리 모달로 갈라지면
 * 어느 쪽이 정답인지 사라진다(PW-274 가 그렇게 되돌려졌다).
 */

const DEFAULT_ICONS = {
  back: '/icons-solid/arrow-left.svg',
  clock: '/icons-solid/clock.svg',
  ai: '/icons-solid/ai-chat-01.svg',
  check: '/icons-solid/check-circle.svg',
  alert: '/icons-solid/alert-triangle.svg',
  pattern: '/icons-solid/refresh-ccw-01.svg',
  health: '/icons-solid/activity-heart.svg',
  actions: '/icons-solid/check-square.svg',
  feedback: '/icons-solid/message-heart-circle.svg',
  evidence: '/icons-solid/search-md.svg',
  transcript: '/icons-solid/message-text-square-02.svg',
  memo: '/icons-solid/file-06.svg',
  calendar: '/icons-solid/calendar.svg',
  slack: '/icons-solid/message-chat-circle.svg',
  chevron: '/icons-solid/chevron-down.svg',
  arrow: '/icons-solid/arrow-right.svg',
};

const DEFAULT_LABELS = {
  title: '{name}님과의 1on1',
  titleNoName: '1on1',
  statusDone: '완료',
  back: '1on1 대시보드',

  /* ── AI 분석 상태 배너 (policy §6.1) ── */
  bannerTranscribing: 'AI가 녹음을 분석하고 있습니다… (약 1~3분)',
  bannerSummarizing: '미팅 요약을 만들고 있습니다…',
  bannerReady: 'AI 분석 완료 — 미팅 요약 및 액션아이템이 생성되었습니다.',
  bannerFailed: '녹음을 처리하지 못했습니다. 요약은 대화 원문 없이 만들어집니다.',
  bannerSummaryFailed: '미팅 요약을 만들지 못했습니다.',
  bannerRetry: '다시 시도',
  bannerRetrying: '다시 시도하는 중…',
  bannerRetryError: '다시 시도하지 못했습니다.',
  /** 녹음이 없는 회차 — 오지 않을 전사를 기다리게 하지 않는다. */
  bannerNoRecording: '녹음이 없어 대화 원문 없이 요약했습니다.',

  /* ── AI 미팅 요약 (§4-4) ── */
  summaryTitle: 'AI 미팅 요약',
  summaryPending: '요약이 만들어지면 여기에 표시됩니다',
  decisions: '주요 결정사항',
  followUps: '재점검 필요',
  patterns: '반복 패턴 감지',
  patternsDesc: '여러 회차에 걸쳐 되풀이되는 것만 모았습니다',

  /* ── 대화 분위기 ── */
  sentimentTitle: '대화 분위기',
  sentimentPositive: '긍정',
  sentimentNeutral: '중립',
  sentimentNegative: '부정',

  /* ── 매니저 피드백 (읽기 전용) ── */
  managerFeedback: '매니저 피드백',
  feedbackStrengths: '관찰한 강점',
  feedbackSbi: '개선 피드백 (SBI)',
  feedbackSupport: '지원 계획',
  shareOn: '멤버에게 공개됨',
  shareOff: '비공개',

  /* ── 공개 컨트롤 (PW-432 · policy §6.4.2) ── */
  shareCta: '{name} 님에게 피드백 공개',
  shareCtaNoName: '팀원에게 피드백 공개',
  shareConfirmTitle: '피드백을 {name} 님에게 공개하시겠습니까?',
  shareConfirmTitleNoName: '피드백을 팀원에게 공개하시겠습니까?',
  /* 🔴 기획서 원문은 «공개 후에는 취소할 수 없습니다» 지만, 되돌리기가 생긴 뒤로는
     사실이 아니다. 문구를 되돌릴 수 있다는 사실에 맞춘다 (PW-432). */
  shareConfirmNotice:
    '피드백 본문과 근거 발췌를 볼 수 있게 됩니다. 나중에 공개를 취소할 수 있습니다.',
  shareConfirm: '공개',
  shareCancel: '취소',
  shareBusy: '공개하는 중…',
  shareDone: '피드백이 팀원에게 공개되었습니다',
  unshareCta: '공개 취소',
  unshareBusy: '되돌리는 중…',
  shareFailed: '공개하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  unshareFailed: '공개를 되돌리지 못했습니다. 잠시 후 다시 시도해 주세요.',
  evidenceToggle: '근거 발췌 {count}',
  evidenceCaption: '이 피드백의 근거가 된 대화 발췌입니다',
  evidenceEdited: '본문을 수정했습니다 — 발췌는 원본 대화 기준입니다',
  evidenceLoading: '근거 발췌 불러오는 중…',
  evidenceError: '근거를 불러올 수 없습니다.',
  evidenceRetry: '다시 시도',
  evidenceSpeakerManager: '{name} 매니저',
  evidenceSpeakerMe: '멤버',
  evidenceJump: '전문에서 보기',
  evidenceJumpMissing: '해당 구간을 찾을 수 없습니다',

  /* ── 액션아이템 (policy §6.3) ── */
  actionItems: '액션아이템',
  actionCount: '{done} / {total} 완료',
  actionEmpty: '아직 액션아이템이 없습니다',
  actionAddPlaceholder: '액션아이템 추가 (Enter)',
  actionAdd: '추가',
  actionAdding: '추가하는 중…',
  actionAddError: '액션아이템을 추가하지 못했습니다.',
  actionToggleError: '액션아이템 상태를 저장하지 못했습니다.',
  roleManager: '매니저',
  roleMember: '멤버',

  /* ── STT 스크립트 미리보기 ── */
  transcriptTitle: '스크립트 미리보기',
  transcriptEmpty: '이 회차에는 대화 기록이 없습니다',

  /* ── 다음 1on1 (policy §6.6) ── */
  nextMemoTitle: '다음 1on1 사전 메모',
  nextMemoPlaceholder: '다음 1on1 때 꼭 확인할 것들을 메모하세요',
  nextMemoSaving: '저장 중…',
  nextMemoSaved: '저장됨',
  nextMemoError: '사전 메모를 저장하지 못했습니다.',
  bookNext: '다음 1on1 예약하기 — 55분 기본값',
  bookNextDone: '다음 1on1 예약 완료',

  /* ── 액션아이템 Slack 알림 (oneonone-spec §4-4 「다음 단계」) ── */
  notifySlack: 'Slack 알림 발송',
  notifySlackBusy: '보내는 중…',
  notifySlackDone: 'Slack 알림 발송 완료',
  // 🔴 «보냈다» 로 초록으로 바꾸지 않는 세 경우. 왜 못 보냈는지를 갈라 말하지 않으면
  // 매니저는 자기가 뭘 해야 하는지 알 수 없다 — 회사가 연동해야 하는 문제인지,
  // 그 팀원의 계정 문제인지, 그냥 다시 눌러 보면 되는 문제인지가 전부 다르다.
  notifySlackNoIntegration: '회사 Slack 이 연결돼 있지 않아 보내지 못했습니다.',
  notifySlackUnmatched: '팀원의 Slack 계정을 찾지 못해 보내지 못했습니다.',
  notifySlackFailed: 'Slack 으로 보내지 못했습니다. 잠시 뒤 다시 시도해 주세요.',
  notifySlackEmpty: '보낼 액션아이템이 없습니다.',
};

const mergeLabels = (base, extra) => ({ ...base, ...(extra || {}) });

/** Slack 발송 실패 사유 → 라벨 키. 모르는 사유는 일반 실패 문구로 떨어진다. */
const SLACK_ERROR_LABEL = {
  no_integration: 'notifySlackNoIntegration',
  unmatched: 'notifySlackUnmatched',
  failed: 'notifySlackFailed',
  empty: 'notifySlackEmpty',
};

/** 값이 하나라도 있는가 — 빈 섹션을 그리지 않기 위한 판정. */
const has = (v) => Array.isArray(v) && v.length > 0;

function AnalysisBanner({ state, L, icons, baseUrl, retry, summaryRetry }) {
  if (state === 'ready') {
    return (
      <div className="ono-done-banner is-ok" data-testid="ono-done-banner" data-state={state}>
        <Icon src={icons.check} size={16} color="currentColor" baseUrl={baseUrl} />
        <span>{L.bannerReady}</span>
      </div>
    );
  }
  if (state === 'failed' || state === 'summary-failed') {
    const summaryStalled = state === 'summary-failed';
    const binding = summaryStalled ? summaryRetry : retry;
    return (
      <div className="ono-done-banner is-bad" role="alert" data-testid="ono-done-banner" data-state={state}>
        <Icon src={icons.alert} size={16} color="currentColor" baseUrl={baseUrl} />
        <span>{summaryStalled ? L.bannerSummaryFailed : L.bannerFailed}</span>
        {binding?.onRetry && (
          <button
            type="button"
            className="ono-done-banner-btn"
            onClick={binding.onRetry}
            disabled={binding.retrying}
            data-testid="ono-done-banner-retry"
          >
            {binding.retrying ? L.bannerRetrying : L.bannerRetry}
          </button>
        )}
        {binding?.error && <span className="ono-done-banner-error">{L.bannerRetryError}</span>}
      </div>
    );
  }
  const text =
    state === 'transcribing'
      ? L.bannerTranscribing
      : state === 'summarizing-no-recording'
        ? `${L.bannerNoRecording} ${L.bannerSummarizing}`
        : L.bannerSummarizing;
  return (
    <div className="ono-done-banner is-busy" data-testid="ono-done-banner" data-state={state}>
      <span className="ono-done-spinner" aria-hidden />
      <span>{text}</span>
    </div>
  );
}

/** 요약 · 결정사항 · 재점검 · 반복 패턴. 아직 요약이 없으면 자리표시만 남긴다. */
function SummaryCard({ session, L, icons, baseUrl, pending }) {
  const summary = session.aiSummary ?? '';
  const decisions = session.keyDecisions ?? [];
  const followUps = session.nextTopics ?? [];
  const patterns = session.recurringPatterns ?? [];
  if (!summary && !has(decisions) && !has(followUps) && !has(patterns) && !pending) {
    return null;
  }
  return (
    <Section
      title={L.summaryTitle}
      icon={icons.ai}
      icons={icons}
      baseUrl={baseUrl}
      collapsible={false}
    >
      <div className="ono-done-summary" data-testid="ono-done-summary">
        {summary ? summary : <span className="ono-mem-hint">{L.summaryPending}</span>}
      </div>

      {has(decisions) && (
        <div className="ono-done-block" data-testid="ono-done-decisions">
          <span className="ono-done-block-label is-ok">{L.decisions}</span>
          {decisions.map((text, i) => (
            <div className="ono-done-item is-ok" key={`d-${i}`}>
              <Icon src={icons.check} size={14} color="currentColor" baseUrl={baseUrl} />
              <span>{text}</span>
            </div>
          ))}
        </div>
      )}

      {has(followUps) && (
        <div className="ono-done-block" data-testid="ono-done-followups">
          <span className="ono-done-block-label is-warn">{L.followUps}</span>
          {followUps.map((text, i) => (
            <div className="ono-done-item is-warn" key={`f-${i}`}>
              <Icon src={icons.alert} size={14} color="currentColor" baseUrl={baseUrl} />
              <span>{text}</span>
            </div>
          ))}
        </div>
      )}

      {/* 반복 패턴은 매니저만 보는 산출물이다 (PW-370). 이 화면이 곧 매니저 전용이라
          여기 두는 것으로 수신자 구분이 성립하고, 서버도 멤버 응답에서 지운다. */}
      {has(patterns) && (
        <div className="ono-done-block" data-testid="ono-done-patterns">
          <span className="ono-done-block-label is-ai">{L.patterns}</span>
          <p className="ono-mem-hint">{L.patternsDesc}</p>
          {patterns.map((text, i) => (
            <div className="ono-done-item is-ai" key={`p-${i}`}>
              <Icon src={icons.pattern} size={14} color="currentColor" baseUrl={baseUrl} />
              <span>{text}</span>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

/**
 * 대화 분위기 — 점수 원 + 긍정/중립/부정 막대.
 *
 * 점수는 **긍정 비율**이다. 시안의 「label · detail」 문장은 서버가 만들지 않으므로
 * 그리지 않는다 — 없는 값을 문구로 지어내면 매니저가 그 화면을 못 믿게 된다.
 */
function SentimentCard({ session, L, icons, baseUrl }) {
  const tone = session.sentiment ?? session.emotionTone ?? null;
  if (!tone) return null;
  const total = (tone.positive ?? 0) + (tone.neutral ?? 0) + (tone.negative ?? 0);
  if (total <= 0) return null;
  const pct = (v) => Math.round(((v ?? 0) / total) * 100);
  const score = pct(tone.positive);
  const tint = score >= 60 ? 'is-ok' : score >= 35 ? 'is-warn' : 'is-bad';
  const rows = [
    { key: 'positive', label: L.sentimentPositive, value: pct(tone.positive), cls: 'is-ok' },
    { key: 'neutral', label: L.sentimentNeutral, value: pct(tone.neutral), cls: 'is-mute' },
    { key: 'negative', label: L.sentimentNegative, value: pct(tone.negative), cls: 'is-bad' },
  ];
  return (
    <Section title={L.sentimentTitle} icon={icons.health} icons={icons} baseUrl={baseUrl}>
      <div className="ono-done-sentiment" data-testid="ono-done-sentiment">
        <span className={`ono-done-score ${tint}`}>{score}</span>
        <div className="ono-done-sentiment-bars">
          <div className="ono-done-sentiment-bar">
            {rows.map((r) => (
              <span key={r.key} className={`ono-done-sentiment-seg ${r.cls}`} style={{ width: `${r.value}%` }} />
            ))}
          </div>
          <div className="ono-done-sentiment-legend">
            {rows.map((r) => (
              <span key={r.key} className={r.cls}>
                {r.label} {r.value}%
              </span>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

/** 액션아이템 — 체크 토글 + 수동 추가 (policy §6.3). */
function ActionItemsCard({ session, L, icons, baseUrl, actions }) {
  const [draft, setDraft] = useState('');
  const items = session.actionItems ?? [];
  const doneCount = items.filter((a) => a.done).length;

  const submit = () => {
    const text = draft.trim();
    // 공백만 있는 입력은 호출조차 하지 않는다 — 빈 항목이 쌓이면 완료 카운터가
    // 영영 100% 에 닿지 않아 그 회차가 끝나지 않은 것으로 보인다.
    if (!text || actions?.adding) return;
    setDraft('');
    actions?.onAdd?.(text);
  };

  return (
    <Section
      title={L.actionItems}
      icon={icons.actions}
      icons={icons}
      baseUrl={baseUrl}
      collapsible={false}
      badge={
        <span className="ono-done-count" data-testid="ono-done-action-count">
          {fill(L.actionCount, { done: doneCount, total: items.length })}
        </span>
      }
    >
      {items.length === 0 ? (
        <p className="ono-mem-hint ono-mem-center">{L.actionEmpty}</p>
      ) : (
        <div className="ono-done-actions">
          {items.map((item) => (
            <label
              className={`ono-done-action${item.done ? ' is-done' : ''}`}
              data-testid="ono-done-action"
              key={item.id}
            >
              <input
                type="checkbox"
                checked={!!item.done}
                onChange={() => actions?.onToggle?.(item.id)}
              />
              <span className="ono-done-action-text">{item.text}</span>
              <span className="ono-start-flag ono-start-flag-blue">
                {item.owner === 'member' ? L.roleMember : L.roleManager}
              </span>
              {item.dueDate && <span className="ono-mem-chip">{item.dueDate}</span>}
            </label>
          ))}
        </div>
      )}

      <div className="ono-done-action-add">
        <input
          type="text"
          value={draft}
          placeholder={L.actionAddPlaceholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
          data-testid="ono-done-action-input"
        />
        <button
          type="button"
          className="ono-done-action-add-btn"
          onClick={submit}
          disabled={actions?.adding}
          data-testid="ono-done-action-add"
        >
          {actions?.adding ? L.actionAdding : L.actionAdd}
        </button>
      </div>
      {actions?.addError && (
        <p className="ono-done-inline-error" role="alert" data-testid="ono-done-action-error">
          {L.actionAddError}
        </p>
      )}
      {actions?.toggleError && (
        <p className="ono-done-inline-error" role="alert" data-testid="ono-done-toggle-error">
          {L.actionToggleError}
        </p>
      )}
    </Section>
  );
}

/** 스크립트 미리보기 — 접기/펼치기. 대화 원문이 없으면 섹션 자체를 그리지 않는다. */
function TranscriptPreview({ session, L, icons, baseUrl, jumpBinding }) {
  const lines = session.sttTranscript ?? [];
  if (lines.length === 0) return null;
  return (
    <Section
      title={L.transcriptTitle}
      icon={icons.transcript}
      icons={icons}
      baseUrl={baseUrl}
      defaultOpen={false}
      open={jumpBinding?.open}
      onOpenChange={jumpBinding?.onOpenChange}
    >
      <div
        className="ono-mem-transcript is-preview"
        ref={jumpBinding?.containerRef}
        data-testid="ono-done-transcript"
      >
        {lines.map((line, i) => {
          const anchor = transcriptAnchor(line);
          return (
            <div
              key={`${anchor}-${i}`}
              data-anchor={anchor}
              data-testid="ono-transcript-line"
              className={`ono-mem-transcript-line${jumpBinding?.hit === anchor ? ' is-hit' : ''}`}
            >
              <span className="ono-mem-transcript-meta">
                <span className="ono-mem-evidence-speaker">
                  {line.speaker === 'host' ? L.roleManager : L.roleMember}
                </span>
                {line.timestamp && <span>· {line.timestamp}</span>}
              </span>
              <p className="ono-mem-transcript-text">{line.text}</p>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/**
 * 다음 1on1 사전 메모 — 입력이 멈추면 호스트가 저장한다.
 *
 * 디바운스는 여기서 돌리지 않는다. 저장 주기·실패 처리는 호스트(자동 저장 훅)의
 * 몫이고, 캔버스가 따로 타이머를 들면 두 곳이 서로 다른 시점에 저장한다.
 */
function NextMemoCard({ value, L, icons, baseUrl, memo }) {
  const [draft, setDraft] = useState(value ?? '');
  // 서버 값이 늦게 도착하는 경우(폴링으로 회차를 다시 읽음)에만 따라간다 — 매니저가
  // 타이핑 중인 내용을 서버 응답으로 덮으면 글자가 사라진다.
  const touched = useRef(false);
  useEffect(() => {
    if (!touched.current) setDraft(value ?? '');
  }, [value]);
  return (
    <Section
      title={L.nextMemoTitle}
      icon={icons.memo}
      icons={icons}
      baseUrl={baseUrl}
      collapsible={false}
      badge={
        memo?.saving ? (
          <span className="ono-done-count">{L.nextMemoSaving}</span>
        ) : memo?.saved ? (
          <span className="ono-done-count" data-testid="ono-done-memo-saved">{L.nextMemoSaved}</span>
        ) : null
      }
    >
      <textarea
        className="ono-done-memo"
        rows={3}
        value={draft}
        placeholder={L.nextMemoPlaceholder}
        data-testid="ono-done-memo"
        onChange={(e) => {
          touched.current = true;
          setDraft(e.target.value);
          memo?.onChange?.(e.target.value);
        }}
      />
      {memo?.error && (
        <p className="ono-done-inline-error" role="alert" data-testid="ono-done-memo-error">
          {L.nextMemoError}
        </p>
      )}
    </Section>
  );
}

/**
 * 피드백 공개 컨트롤 (PW-432 · policy §6.4.2).
 *
 * 정본 시안 `1on1-manager-view.jsx` 의 `shareState` 블록이 **비공개 → 확인 → 공개됨**
 * 셋을 그리고, 거기에 **공개 취소**를 더한다. 되돌릴 수 없는 공개는 두지 않는다는 것이
 * 이 티켓의 전제라, 공개와 되돌리기는 늘 같은 자리에 함께 있다.
 *
 * ## 확인 단계는 화면이 소유한다
 *
 * "정말 공개할까요" 는 서버에 물을 것이 없다 — 호스트가 상태를 들고 있으면 소비처마다
 * 확인 단계를 다시 구현하게 되고, 그러다 한 곳에서 빠지면 그 화면만 확인 없이 공개된다.
 *
 * ## 낙관적으로 바꾸지 않는다
 *
 * 공개 여부는 `session.isShared` 하나로 그린다. 호출이 실패했는데 화면만 「공개됨」으로
 * 가면 매니저는 공개된 줄 안다 — 그 오해의 대가가 큰 종류의 글이다. 실패는 그 자리에
 * 문구로 알리고(전역 오류 화면으로 튕기지 않는다) 직전 모습을 유지한다.
 */
function ShareControl({ shared, memberName, L, share }) {
  // 확인 단계를 통과했는지. 공개에 **성공**하면 아래 `shared` 분기가 이 값과 무관하게
  // 그려지므로 여기서 되돌릴 필요가 없고, **실패**하면 켜진 채 남아야 한다 — 확인
  // 박스를 닫아 버리면 매니저가 처음부터 다시 눌러야 한다.
  const [confirming, setConfirming] = useState(false);

  const busy = !!share?.busy;

  if (shared) {
    return (
      <div className="ono-done-share-control" data-testid="ono-done-share-control" data-state="shared">
        <div className="ono-done-share-done">
          <span className="ono-done-share-done-text">{L.shareDone}</span>
          <button
            type="button"
            className="ono-done-share-undo"
            onClick={() => {
              // 되돌리면 다시 비공개 분기로 내려간다. 확인 단계를 여기서 같이 접지
              // 않으면, 앞서 공개할 때 켜 둔 값이 남아 있어 CTA 대신 확인 박스가
              // 열린 채로 돌아온다.
              setConfirming(false);
              share?.onUnshare?.();
            }}
            disabled={busy}
            data-testid="ono-done-unshare"
          >
            {busy ? L.unshareBusy : L.unshareCta}
          </button>
        </div>
        {share?.error && (
          <p className="ono-done-inline-error" role="alert" data-testid="ono-done-share-error">
            {L.unshareFailed}
          </p>
        )}
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="ono-done-share-control" data-testid="ono-done-share-control" data-state="confirming">
        <div className="ono-done-share-confirm" data-testid="ono-done-share-confirm">
          <p className="ono-done-share-confirm-title">
            {memberName
              ? fill(L.shareConfirmTitle, { name: memberName })
              : L.shareConfirmTitleNoName}
          </p>
          <p className="ono-done-share-confirm-notice">{L.shareConfirmNotice}</p>
          <div className="ono-done-share-confirm-actions">
            <button
              type="button"
              className="ono-done-share-go"
              onClick={() => share?.onShare?.()}
              disabled={busy}
              data-testid="ono-done-share-confirm-go"
            >
              {busy ? L.shareBusy : L.shareConfirm}
            </button>
            <button
              type="button"
              className="ono-done-share-abort"
              onClick={() => setConfirming(false)}
              disabled={busy}
              data-testid="ono-done-share-confirm-cancel"
            >
              {L.shareCancel}
            </button>
          </div>
        </div>
        {share?.error && (
          <p className="ono-done-inline-error" role="alert" data-testid="ono-done-share-error">
            {L.shareFailed}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="ono-done-share-control" data-testid="ono-done-share-control" data-state="before">
      <button
        type="button"
        className="ono-done-share-cta"
        onClick={() => setConfirming(true)}
        disabled={busy}
        data-testid="ono-done-share"
      >
        {memberName ? fill(L.shareCta, { name: memberName }) : L.shareCtaNoName}
      </button>
      {/* 이 분기에는 실패 문구가 없다 — 공개가 실패하면 확인 박스가 열린 채로 남고,
          되돌리기가 실패하면 공개됨 분기에 머문다. 여기까지 내려왔다는 것은 실패한
          일이 없다는 뜻이다. 지난 실패 문구를 여기서 다시 띄우면, 방금 성공적으로
          되돌린 매니저에게 「되돌리지 못했습니다」가 보인다. */}
    </div>
  );
}

export default function DoneOneOnOneView({
  session,
  /** 화면 단위 매니저 — 회차에 이름이 없을 때의 폴백 (PW-211). */
  manager,
  memberName = '',
  avatar = null,
  labels,
  icons,
  baseUrl = '',
  formatDate,
  formatDuration,
  /** `{ evidence, loading, error, onRetry }` — `GET :id/feedback` 결과 */
  feedbackEvidence,
  /** `{ retrying, error, onRetry }` — 전사 재시도 (PW-329) */
  transcription,
  /**
   * `{ stalled, retrying, error, onRetry }` — 요약 생성이 끝내 오지 않았을 때.
   *
   * 회차만 봐서는 「아직 오는 중」과 「영영 안 온다」를 구분할 수 없다 — 둘 다 요약이
   * 없는 모습이 같기 때문이다. 그 판정은 폴링을 도는 소비처만 할 수 있어서 prop 으로
   * 받는다. `stalled` 면 배너가 「만들지 못했습니다 + 다시 시도」로 바뀐다.
   */
  summary,
  /** `{ adding, addError, toggleError, onAdd(text), onToggle(id) }` */
  actions,
  /** `{ saving, saved, error, onChange(text) }` */
  memo,
  /** `{ done, onBook() }` — 다음 1on1 예약 */
  booking,
  /**
   * `{ busy, done, error, onSend() }` — 액션아이템 Slack 알림 (oneonone-spec §4-4).
   *
   * **안 넘기면 버튼을 그리지 않는다** — 보낼 경로가 없는 소비처에서 눌러도 아무 일이
   * 없는 버튼이 생기지 않도록. `error` 는 문구가 아니라 **사유**다
   * (`no_integration` | `unmatched` | `failed` | `empty`) — 문구는 `labels` 로 온다.
   */
  slack,
  /**
   * `{ busy, error, onShare(), onUnshare() }` — 피드백 공개/되돌리기 (PW-432).
   *
   * **안 넘기면 지금까지처럼 공개 여부 배지만 그린다** — 컨트롤 없이 이 캔버스를 쓰던
   * 소비처가 그대로 살아 있어야 해서다. 공개 여부 자체는 `session.isShared` 로 읽는다.
   */
  share,
  onBack,
}) {
  const L = mergeLabels(DEFAULT_LABELS, labels);
  const I = { ...DEFAULT_ICONS, ...(icons || {}) };
  // 근거 발췌 → 전문 딥링크 (PW-327). 매니저는 자기 회차의 전문을 늘 보므로
  // `alwaysEnabled` 다 — `sttShared` 로 잠그면 자기가 공개하지 않은 회차에서
  // 자기 화면의 딥링크가 사라진다.
  //
  // 🔴 훅은 이른 반환(`!session`)보다 **위**에 있어야 한다. 아래로 내리면 회차가
  // 늦게 도착하는 렌더에서 훅 호출 수가 갈려 React 가 상태를 뒤섞는다.
  const transcript = useTranscriptJump(session, {
    alwaysEnabled: true,
    collapsed: true,
  });
  if (!session) return null;

  const host = hostOf(session, manager);
  // 요약이 이미 있으면 `stalled` 여도 확정 상태다 — 재시도로 받아 온 뒤 배너가
  // 계속 실패를 말하면 이미 나온 산출물이 가려진다.
  const rawBannerState = doneBannerState(session);
  const bannerState =
    summary?.stalled && rawBannerState !== 'ready' ? 'summary-failed' : rawBannerState;

  return (
    <div className="ono-done-view">
      <SessionHeader
        title={memberName ? fill(L.title, { name: memberName }) : L.titleNoName}
        status="done"
        date={formatDate ? formatDate(session.createdAt) : null}
        duration={
          session.durationSec > 0 && formatDuration
            ? formatDuration(session.durationSec)
            : null
        }
        avatar={avatar}
        L={L}
        icons={I}
        baseUrl={baseUrl}
      >
        {onBack && (
          <button type="button" className="ono-mem-back" onClick={onBack}>
            <Icon src={I.back} size={14} color="currentColor" baseUrl={baseUrl} />
            {L.back}
          </button>
        )}
      </SessionHeader>

      <AnalysisBanner
        state={bannerState}
        L={L}
        icons={I}
        baseUrl={baseUrl}
        retry={transcription}
        summaryRetry={summary}
      />

      <SummaryCard
        session={session}
        L={L}
        icons={I}
        baseUrl={baseUrl}
        pending={isDonePending(bannerState)}
      />

      <SentimentCard session={session} L={L} icons={I} baseUrl={baseUrl} />

      {/* 피드백이 없는 회차에는 공개할 것도 없다 — 카드 자체를 그리지 않는다. */}
      {has(session.managerFeedback) && (
        <div className="ono-done-feedback-wrap" data-testid="ono-done-feedback">
          <div className="ono-done-share-row">
            <span
              className={`ono-done-share-badge${session.isShared ? ' is-on' : ''}`}
              data-testid="ono-done-share-badge"
            >
              {session.isShared ? L.shareOn : L.shareOff}
            </span>
          </div>
          <ManagerFeedback
            session={session}
            managerName={host.name}
            L={L}
            icons={I}
            baseUrl={baseUrl}
            jump={transcript.jump}
            {...(feedbackEvidence || {})}
          />
          {share && (
            <ShareControl
              shared={!!session.isShared}
              memberName={memberName}
              L={L}
              share={share}
            />
          )}
        </div>
      )}

      <ActionItemsCard
        session={session}
        L={L}
        icons={I}
        baseUrl={baseUrl}
        actions={actions}
      />

      <TranscriptPreview
        session={session}
        L={L}
        icons={I}
        baseUrl={baseUrl}
        jumpBinding={{
          open: transcript.open,
          onOpenChange: transcript.setOpen,
          containerRef: transcript.containerRef,
          hit: transcript.hit,
        }}
      />

      <NextMemoCard
        value={session.nextPreMemo ?? ''}
        L={L}
        icons={I}
        baseUrl={baseUrl}
        memo={memo}
      />

      <button
        type="button"
        className={`ono-done-book${booking?.done ? ' is-done' : ''}`}
        data-testid="ono-done-book"
        onClick={() => {
          if (booking?.done) return;
          booking?.onBook?.();
        }}
      >
        <Icon
          src={booking?.done ? I.check : I.calendar}
          size={16}
          color="currentColor"
          baseUrl={baseUrl}
        />
        {booking?.done ? L.bookNextDone : L.bookNext}
      </button>

      {slack && (
        <>
          <button
            type="button"
            className={`ono-done-notify${slack.done ? ' is-done' : ''}`}
            data-testid="ono-done-notify-slack"
            disabled={!!slack.busy}
            onClick={() => {
              if (slack.done || slack.busy) return;
              slack.onSend?.();
            }}
          >
            <Icon
              src={slack.done ? I.check : I.slack}
              size={16}
              color="currentColor"
              baseUrl={baseUrl}
            />
            {slack.done
              ? L.notifySlackDone
              : slack.busy
                ? L.notifySlackBusy
                : L.notifySlack}
          </button>
          {slack.error && (
            <p
              className="ono-done-inline-error"
              role="alert"
              data-testid="ono-done-notify-slack-error"
            >
              {SLACK_ERROR_LABEL[slack.error]
                ? L[SLACK_ERROR_LABEL[slack.error]]
                : L.notifySlackFailed}
            </p>
          )}
        </>
      )}
    </div>
  );
}
