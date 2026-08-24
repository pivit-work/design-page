import { useMemo, useState } from 'react';
import Icon from '../shared/Icon.jsx';
import { formatLiveElapsed } from './sessionHelpers.js';

/**
 * LIVE 「AI 대화 내비게이터」 — 매니저가 읽으며 1on1 을 이끄는 진행 스크립트 카드.
 *
 * 시안: `pivit-specs` `D. 1on1-기획/1on1-manager-view.jsx` L841~ `LiveGuideCard`
 * (= `1on1-app.jsx` L2243~, 두 파일이 동일). 정책: `screen-oneonone-session.policy.md`
 * §5.2.1 · §7.5. 스키마: `arch-1on1-ai-spec.md` NEW-07.
 *
 * ## 이 컴포넌트가 갖는 것 / 갖지 않는 것
 *
 * **단계 진행 상태(현재 단계·완료 체크·접힘)는 여기 클라이언트 state 다** — 정본이
 * 「서버 저장 없음」으로 못 박았다. 가이드 자체(`guide`)와 생성/실패/한도는 소비처가
 * 서버와 주고받아 prop 으로 내려 준다.
 *
 * 재생성하면 진행 상태가 1단계로 초기화된다 — `guide.generatedAt` 이 바뀌는 것으로
 * 판정한다. 「새 대본을 받았는데 완료 체크는 옛 대본의 것」이 남으면 스테퍼가 거짓말을
 * 한다.
 *
 * ## props
 * - `guide` — 서버가 준 가이드(`{ totalMin, isFallback, sourcesUsed, stages[],
 *   regenCount }`). `null` = 아직 생성 안 함(수동 트리거 대기).
 * - `stageCount` — 미생성 상태의 버튼 문구(`N분 · M단계`)에 쓸 단계 수. 기본 7.
 * - `loading` / `failed` — §7.5 4상태 중 `loading` · `failed`.
 *   (`idle` = `!guide && !loading`, `success` = `!!guide`)
 * - `failReason` — `'timeout' | 'model_error' | 'quota_exceeded'` (§7.5.5).
 *   판별 불가면 생략 → 모델 오류 문구가 기본값.
 * - `retryLeft` — 남은 `다시 시도` 횟수 (§7.5.6). 0 이면 버튼이 잠기고 문구가 바뀐다.
 * - `maxRegen` / `memberName` / `sourceLabels` / `onGenerate`
 * - `elapsedSec` — 세션 경과(초). **`null` 이면 아직 녹음 전**이라 타이머를 `--:--` 로
 *   두고 페이스 줄을 계산하지 않는다 (PW-478 · policy §5.0 T2). 값은 소비처가 서버
 *   `recordingStartedAt` 에서 파생해 내려 준다 — 이 카드가 자기 타이머를 돌리지 않는다.
 * - `paceHidden` — 녹음 없이 진행하는 회차. 페이스 줄 전체를 감춘다 (T4).
 * - `labels` — 소비처(i18n)가 주는 문구 묶음. 안 주면 한국어 기본값.
 */

/** 55분 기준 정본 단계 수. 미생성 상태의 버튼 문구에만 쓰인다. */
const DEFAULT_STAGE_COUNT = 7;
const DEFAULT_TOTAL_MIN = 55;
const DEFAULT_MAX_REGEN = 3;
/** t0(녹음 시작) 이전의 경과 표시 — 0 이 없는 상태에서 시계를 돌리지 않는다 (PW-478). */
const NO_CLOCK = '--:--';

/**
 * 기본 문구 (한국어). 소비처가 `labels` 로 덮어쓴다 — pivit-work 는 i18n 을 통과시킨다.
 * design-page 데모는 prop 없이도 시안과 같은 화면이 나와야 하므로 기본값을 남긴다.
 */
const DEFAULT_LABELS = {
  title: 'AI 대화 내비게이터',
  liveOnly: 'LIVE 전용',
  fallbackBadge: '기본 템플릿',
  regen: (left) => `재생성 (${left}회 남음)`,
  regenExhausted: '재생성 (한도 초과)',
  regenExhaustedTitle: '재생성 한도를 초과했습니다',
  collapse: '접기',
  expand: '펼치기',
  failTitle: '진행 스크립트 생성에 실패했습니다',
  failBody:
    '잠시 후 다시 시도하거나, 개인화 없는 기본 템플릿으로 진행할 수 있습니다. 가이드 없이도 미팅 진행은 막히지 않습니다.',
  retry: '다시 시도',
  // §7.5.5 — 사유 3분류. 문구만 다르고 박스 구조·색은 같다.
  reasonTimeout: '생성이 30초를 넘겨 중단됐습니다. 잠시 후 다시 시도해 주세요.',
  reasonModelError: 'AI 응답을 받지 못했습니다. 잠시 후 다시 시도해 주세요.',
  reasonQuota:
    '이번 달 조직 AI 사용 한도를 모두 썼습니다. 워크스페이스 관리자에게 문의해 주세요.',
  quotaTooltip: 'AI 사용 한도가 복구되면 다시 시도할 수 있습니다',
  retryExhausted:
    '여러 번 시도했지만 생성하지 못했습니다. 가이드 없이 진행하거나 잠시 후 다시 시도해 주세요.',
  intro: (name) =>
    `아이스브레이킹부터 랩업까지, ${name} 님 데이터 기반의 단계별 진행 스크립트를 생성합니다. READY 산출물을 재구성하며 실시간 대화는 분석하지 않습니다.`,
  generate: (min, count) => `진행 스크립트 생성 — ${min}분 · ${count}단계`,
  generating: '진행 스크립트를 구성하는 중...',
  // 뒤 값은 **세션 총 경과**다. 종전 문구 「경과 N분」은 현재 단계에 머문 시간으로
  // 읽혀, 단계를 옮겨도 리셋되지 않는 값에 잘못된 이름이 붙어 있었다 (PW-478 §5.2.1).
  pace: (from, to, elapsed) =>
    `현재 단계 권장 ${from}–${to}분 · 시작 후 ${elapsed}분`,
  paceLate: (late) => `권장 페이스보다 ${late}분 초과 — 다음 단계 전환을 고려하세요`,
  scriptSection: '이렇게 말해보세요',
  questionSection: '추천 질문',
  questionPrefix: 'Q.',
  prevStage: '이전 단계',
  completeStage: '이 단계 완료 → 다음',
  completeLast: '이 단계 완료 — 가이드 마침',
  allDone: '전체 단계 완료',
  footnote:
    '가이드는 참고용입니다 — 대화 흐름에 따라 자유롭게 건너뛰세요. 이 내용은 DONE 요약·피드백에 포함되지 않으며 멤버에게 보이지 않습니다.',
};

const REASON_KEY = {
  timeout: 'reasonTimeout',
  model_error: 'reasonModelError',
  quota_exceeded: 'reasonQuota',
};

export default function LiveGuideCard({
  guide = null,
  stageCount = DEFAULT_STAGE_COUNT,
  totalMin = DEFAULT_TOTAL_MIN,
  loading = false,
  failed = false,
  failReason = null,
  retryLeft = null,
  maxRegen = DEFAULT_MAX_REGEN,
  elapsedSec = null,
  paceHidden = false,
  memberName = '',
  sourceLabels = [],
  onGenerate,
  labels: labelsProp,
  baseUrl = '',
}) {
  const L = useMemo(() => ({ ...DEFAULT_LABELS, ...(labelsProp ?? {}) }), [labelsProp]);
  const stages = guide?.stages ?? [];
  const generated = stages.length > 0;

  const [stageIdx, setStageIdx] = useState(0);
  const [doneIds, setDoneIds] = useState([]);
  const [collapsed, setCollapsed] = useState(false);

  // 재생성 = 새 대본. 진행 상태를 1단계로 되돌린다 (policy §5.2.1 · TC-1ON1-107).
  // `generatedAt` 이 축인 것은, 재생성해도 단계 id·개수는 같아 내용으로는 구분되지
  // 않기 때문이다.
  //
  // 🔴 `useEffect` 가 아니라 **렌더 중 조정**이다 (react.dev "You Might Not Need an
  // Effect" 의 prop 변경 시 state 리셋 패턴). effect 로 하면 옛 단계가 한 프레임
  // 그려졌다 사라져, 재생성 직후 화면이 깜빡인다.
  const version = guide?.generatedAt ?? null;
  const [prevVersion, setPrevVersion] = useState(version);
  if (version !== prevVersion) {
    setPrevVersion(version);
    setStageIdx(0);
    setDoneIds([]);
  }

  const safeIdx = Math.min(stageIdx, Math.max(0, stages.length - 1));
  const stage = stages[safeIdx] ?? null;
  const isLast = safeIdx === stages.length - 1;
  const allDone = generated && doneIds.length === stages.length;
  // 🔴 `elapsedSec === null` 은 **아직 t0 가 없다**는 뜻이다 (PW-478 · policy §5.0 T2).
  // 0 으로 뭉개면 화면이 `00:00` 을 그려 「아직 안 세고 있다」와 「막 시작했다」가 같은
  // 모습이 된다 — 그리고 페이스 힌트가 대화가 아니라 **대기 시간**을 세기 시작한다.
  const clockRunning = typeof elapsedSec === 'number';
  const elapsedMin = clockRunning ? Math.floor(Math.max(0, elapsedSec) / 60) : 0;
  const [from, to] = stage?.timeRange ?? [0, 0];
  const lateMin = elapsedMin - to;
  // 녹음 없이 진행하는 미팅은 페이스 줄 **전체를 감춘다** (T4). 시계를 「LIVE 진입」으로
  // 되돌리지 않는다 — 그것이 이 변경이 없애려는 두 번째 축이다.
  const showPace = clockRunning && !paceHidden;
  const regenCount = guide?.regenCount ?? 0;
  const regenLeft = Math.max(0, maxRegen - regenCount);
  const guideTotalMin = guide?.totalMin ?? totalMin;

  // §7.5.5 — 한도 초과만 `다시 시도` 가 잠긴다. 재시도 소진(§7.5.6)도 같이 잠근다.
  const quotaBlocked = failReason === 'quota_exceeded';
  const retryExhausted = typeof retryLeft === 'number' && retryLeft <= 0;
  const retryDisabled = quotaBlocked || retryExhausted;

  const completeStage = () => {
    if (!stage) return;
    setDoneIds((prev) => (prev.includes(stage.id) ? prev : [...prev, stage.id]));
    if (safeIdx < stages.length - 1) setStageIdx(safeIdx + 1);
  };

  return (
    <section className="ono-guide-card" data-testid="ono-live-guide">
      {/* ── 헤더 ── */}
      <div className="ono-guide-head">
        <span className="ono-guide-title">
          <Icon src="/icons-solid/stars-01.svg" size={14} color="currentColor" baseUrl={baseUrl} />
          {L.title}
        </span>
        <span className="ono-guide-tag ono-guide-tag-purple">{L.liveOnly}</span>
        {generated && guide?.isFallback && (
          <span
            className="ono-guide-tag ono-guide-tag-amber"
            data-testid="ono-live-guide-fallback"
          >
            {L.fallbackBadge}
          </span>
        )}
        <div className="ono-guide-head-right">
          <span className="ono-guide-timer" data-testid="ono-live-guide-timer">
            <Icon
              src="/icons-solid/clock-stopwatch.svg"
              size={12}
              color="currentColor"
              baseUrl={baseUrl}
            />
            {clockRunning ? formatLiveElapsed(elapsedSec) : NO_CLOCK}
          </span>
          {generated && !loading && (
            <button
              type="button"
              className="ono-guide-mini-btn"
              onClick={onGenerate}
              disabled={regenLeft <= 0}
              title={regenLeft <= 0 ? L.regenExhaustedTitle : undefined}
              data-testid="ono-live-guide-regen"
            >
              {regenLeft <= 0 ? L.regenExhausted : L.regen(regenLeft)}
            </button>
          )}
          {generated && (
            <button
              type="button"
              className="ono-guide-mini-btn"
              onClick={() => setCollapsed((v) => !v)}
              data-testid="ono-live-guide-collapse"
            >
              {collapsed ? L.expand : L.collapse}
            </button>
          )}
        </div>
      </div>

      {/* ── 실패 (§7.5.3) — 전역 오류 페이지로 튕기지 않고 카드 안에서 말한다.
             기존 가이드가 있으면 덮어쓰지 않고 위에 얹기만 한다 (§7.5.2). ── */}
      {failed && !loading && (
        <div className="ono-guide-fail" role="alert" data-testid="ono-live-guide-fail">
          <div className="ono-guide-fail-title">
            <Icon
              src="/icons-solid/alert-triangle.svg"
              size={13}
              color="currentColor"
              baseUrl={baseUrl}
            />
            {L.failTitle}
          </div>
          <p className="ono-guide-fail-body">
            {retryExhausted ? L.retryExhausted : L[REASON_KEY[failReason] ?? 'reasonModelError']}
          </p>
          <p className="ono-guide-fail-body">{L.failBody}</p>
          <button
            type="button"
            className="ono-guide-fail-btn"
            onClick={onGenerate}
            disabled={retryDisabled}
            title={quotaBlocked ? L.quotaTooltip : undefined}
            data-testid="ono-live-guide-retry"
          >
            {L.retry}
          </button>
        </div>
      )}

      {/* ── 미생성: 수동 트리거 (자동 생성 없음) ── */}
      {!generated && !loading && (
        <>
          <p className="ono-guide-intro">{L.intro(memberName)}</p>
          {sourceLabels.length > 0 && (
            <div className="ono-guide-sources">
              {sourceLabels.map((s) => (
                <span key={s} className="ono-guide-source">
                  {s}
                </span>
              ))}
            </div>
          )}
          <button
            type="button"
            className="ono-guide-generate"
            onClick={onGenerate}
            data-testid="ono-live-guide-generate"
          >
            <Icon
              src="/icons-solid/stars-01.svg"
              size={16}
              color="currentColor"
              baseUrl={baseUrl}
            />
            {L.generate(totalMin, stageCount)}
          </button>
        </>
      )}

      {/* ── 생성 중 — 버튼을 숨겨 중복 클릭을 막는다 (§7.5.2) ── */}
      {loading && (
        <div className="ono-guide-loading" data-testid="ono-live-guide-loading">
          <span className="ono-guide-spinner" aria-hidden />
          <span>{L.generating}</span>
        </div>
      )}

      {/* ── 생성 후 ── */}
      {generated && !loading && !collapsed && stage && (
        <>
          {/* 스테퍼 — 클릭으로 자유 이동. 순서를 강제하지 않는다 */}
          <div className="ono-guide-stepper">
            {stages.map((s, i) => {
              const isDone = doneIds.includes(s.id);
              const isCurrent = i === safeIdx;
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`ono-guide-step${isCurrent ? ' is-current' : ''}${
                    isDone ? ' is-done' : ''
                  }`}
                  aria-current={isCurrent ? 'step' : undefined}
                  onClick={() => setStageIdx(i)}
                  data-testid={`ono-live-guide-step-${s.id}`}
                >
                  {isDone ? (
                    <Icon
                      src="/icons-solid/check.svg"
                      size={11}
                      color="currentColor"
                      baseUrl={baseUrl}
                    />
                  ) : (
                    <span className="ono-guide-step-num">{s.order ?? i + 1}</span>
                  )}
                  {s.title}
                </button>
              );
            })}
          </div>

          {/* 페이스 — 안내만 한다. 자동 전환·강제 종료는 없다 (TC-1ON1-105).
              t0 가 없거나 녹음 없이 진행하는 회차에서는 줄 전체를 감춘다 (PW-478 §5.0). */}
          {showPace && (
          <div className={`ono-guide-pace${lateMin > 0 ? ' is-late' : ''}`} data-testid="ono-live-guide-pace">
            <span className="ono-guide-pace-text">
              {L.pace(from, to, elapsedMin)}
            </span>
            {lateMin > 0 && (
              <span className="ono-guide-pace-late" data-testid="ono-live-guide-pace-late">
                <Icon
                  src="/icons-solid/alert-triangle.svg"
                  size={11}
                  color="currentColor"
                  baseUrl={baseUrl}
                />
                {L.paceLate(lateMin)}
              </span>
            )}
          </div>
          )}

          {/* 현재 단계 */}
          <div className="ono-guide-stage-head">
            <span className="ono-guide-stage-title">
              <span className="ono-guide-step-num">{stage.order ?? safeIdx + 1}</span>
              {stage.title}
            </span>
            <span className="ono-guide-stage-time">
              {from}–{to}분
            </span>
          </div>
          <p className="ono-guide-goal">{stage.goal}</p>

          {/* 개인화 멘트 — 기본 템플릿에서는 비어 있어 블록째 그리지 않는다 */}
          {(stage.script ?? []).length > 0 && (
            <>
              <div className="ono-guide-section-label ono-guide-section-label-purple">
                <Icon
                  src="/icons-solid/message-chat-circle.svg"
                  size={12}
                  color="currentColor"
                  baseUrl={baseUrl}
                />
                {L.scriptSection}
              </div>
              <div className="ono-guide-scripts">
                {stage.script.map((line, i) => (
                  <div key={`${stage.id}-script-${i}`} className="ono-guide-script">
                    {`“${line}”`}
                  </div>
                ))}
              </div>
            </>
          )}

          {(stage.questions ?? []).length > 0 && (
            <>
              <div className="ono-guide-section-label">{L.questionSection}</div>
              <div className="ono-guide-questions">
                {stage.questions.map((q, i) => (
                  <div key={`${stage.id}-q-${i}`} className="ono-guide-question">
                    <span className="ono-guide-question-prefix">{L.questionPrefix}</span>
                    <span>{q}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {(stage.watchouts ?? []).length > 0 && (
            <div className="ono-guide-watchouts">
              {stage.watchouts.map((w, i) => (
                <div key={`${stage.id}-w-${i}`} className="ono-guide-watchout">
                  <Icon
                    src="/icons-solid/alert-triangle.svg"
                    size={12}
                    color="currentColor"
                    baseUrl={baseUrl}
                  />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}

          <div className="ono-guide-nav">
            <button
              type="button"
              className="ono-guide-nav-prev"
              onClick={() => setStageIdx(Math.max(0, safeIdx - 1))}
              disabled={safeIdx === 0}
              data-testid="ono-live-guide-prev"
            >
              <Icon
                src="/icons-solid/chevron-left.svg"
                size={13}
                color="currentColor"
                baseUrl={baseUrl}
              />
              {L.prevStage}
            </button>
            <button
              type="button"
              className={`ono-guide-nav-next${allDone ? ' is-all-done' : ''}`}
              onClick={completeStage}
              data-testid="ono-live-guide-complete"
            >
              {allDone ? (
                <>
                  <Icon
                    src="/icons-solid/check.svg"
                    size={13}
                    color="currentColor"
                    baseUrl={baseUrl}
                  />
                  {L.allDone}
                </>
              ) : isLast ? (
                L.completeLast
              ) : (
                <>
                  {L.completeStage}
                  <Icon
                    src="/icons-solid/chevron-right.svg"
                    size={13}
                    color="currentColor"
                    baseUrl={baseUrl}
                  />
                </>
              )}
            </button>
          </div>

          <p className="ono-guide-footnote">{L.footnote}</p>
        </>
      )}
    </section>
  );
}
