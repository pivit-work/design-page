import { useMemo } from 'react';
import EvalCycleMemberCanvas from './EvalCycleMemberCanvas.jsx';
import AvatarPhoto from './AvatarPhoto.jsx';
import { AlertIcon, LockIcon, RefreshIcon } from './evalIcons.jsx';

/**
 * EvalUpwardReviewCanvas — 상향 리뷰 작성 (팀원 → 직속 리더). [PW-586]
 *
 * 기획: pivit-specs `screen-eval-cycle-member.policy.md` §5U · `eval-app.jsx` 의 `UpwardReview`.
 *
 * 폼은 새로 그리지 않는다 — 셀프·동료 리뷰가 쓰는 `EvalCycleMemberCanvas` 를 그대로 쓰고,
 * 상향에만 있는 두 블록(평가 대상 카드 · **접을 수 없는** 익명 안내)을 그 폼의 머리 아래
 * 자리(`headerSlot`)에 끼운다. 기획이 동료 리뷰에서 «의도적으로» 뺀 두 블록(피평가자 셀프
 * 리뷰 참조 · 비밀 코멘트)은 여기에도 없다.
 *
 * 폼을 쓸 수 없는 상태(시작 전·종료·일시 중단·리더 없음·상향 없는 사이클·조회 실패)에서는
 * 같은 머리와 안내를 그리고 폼 자리에 이유를 적는다. 익명 안내는 **폼보다 먼저** 그린다
 * (§5U.6 — 고지가 늦게 뜨면 이미 읽고 있다).
 *
 * props
 * - state: 'loading' | 'error' | 'ready'
 * - data: 서버 조회 결과 { cycle, window, startsAt, endsAt, target, reviewerCount, minResponses,
 *         answers, submitted, previousTarget, template }
 * - labels: 사람이 읽는 문구 전부(i18n 은 소비자가 채운다)
 * - onRetry, onSave(items), onSubmit(items), onAiDraft(items), onConfirmLeaderChange()
 * - aiDraftDisabledReason: AI 초안 근거가 없을 때의 이유(있으면 버튼이 꺼진다)
 */

const DEFAULT_LABELS = {
  title: '상향 리뷰 작성',
  deadline: '마감 {{date}}',
  targetRelation: '직속 리더',
  noticeTitle: '이 리뷰는 {{name}}님에게 그대로 전달되지 않습니다',
  // 대상이 아직 안 왔을 때(불러오는 중) — 이름 자리를 비운 문장을 만들지 않는다.
  noticeTitleNoName: '이 리뷰는 평가 대상 리더에게 그대로 전달되지 않습니다',
  noticeAnonymous: '작성자는 익명입니다. 누가 무엇을 썼는지는 인사담당자에게도 보이지 않습니다.',
  noticeMinimum: '응답은 {{min}}인 이상 모였을 때만 합쳐진 요약으로 제공됩니다.',
  noticeHrOnly: '원문은 인사담당자(HR)만 열람합니다. 직속 리더는 평가 대상 본인이라 열람할 수 없습니다.',
  counterOk: '현재 대상 팀원 {{count}}명 · 최소 {{min}}인 충족',
  counterWarn:
    '지금 이 리더를 평가하는 팀원이 {{count}}명입니다 — {{min}}인에 못 미치면 요약이 만들어지지 않고 아무에게도 전달되지 않습니다.',
  counterNoMin: '현재 대상 팀원 {{count}}명',
  noLeaderTitle: '평가할 리더가 지정되어 있지 않습니다',
  noLeaderSub:
    '직속 리더가 없거나 공석인 경우 상향 리뷰 대상이 없습니다. 조직 정보가 잘못되었다면 인사담당자에게 알려 주세요.',
  notStarted: '상향 리뷰는 {{date}} 부터 작성할 수 있습니다',
  notStartedNoDate: '상향 리뷰 단계가 시작되면 작성할 수 있습니다',
  closed: '상향 리뷰 기간이 종료되었습니다',
  paused: '평가가 일시 중단되어 지금은 작성할 수 없습니다',
  off: '이 사이클에는 상향 리뷰 단계가 없습니다',
  noCycle: '진행 중인 상향 리뷰가 없습니다',
  loading: '불러오는 중…',
  loadFailed: '대상 정보를 불러오지 못했습니다',
  retry: '다시 시도',
  leaderChangedTitle: '평가할 리더가 바뀌었습니다',
  leaderChangedSub:
    '{{name}}님 앞으로 쓰던 내용은 새 리더에 대한 글이 아니므로 옮기지 않습니다. 확인하면 쓰던 내용을 지우고 새 리더를 평가합니다.',
  leaderChangedConfirm: '확인하고 새로 쓰기',
  form: {},
};

function isObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}
function mergeLabels(base, provided) {
  if (!provided) return base;
  const out = { ...base };
  for (const k of Object.keys(provided)) {
    if (isObj(provided[k])) out[k] = mergeLabels(base[k] || {}, provided[k]);
    else if (provided[k] !== undefined) out[k] = provided[k];
  }
  return out;
}
function fill(tpl, vars) {
  return String(tpl ?? '').replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] ?? '') + '');
}
/** ISO 시각 → 「MM/DD」(앱 기준 한국 시간). */
function mmdd(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const get = (t) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('month')}/${get('day')}`;
}

function TargetCard({ target, L }) {
  const meta = [target.jobPosition, target.department].filter(Boolean).join(' · ');
  return (
    <section className="evc-card evu-target" data-testid="evu-target">
      <span
        className="evu-avatar"
        style={target.color ? { background: target.color } : undefined}
        aria-hidden
      >
        {(target.name || '?').slice(0, 1)}
        <AvatarPhoto photo={target.avatar} name={target.name} />
      </span>
      <div className="evu-target-body">
        <span className="evc-card-name">{target.name}</span>
        {meta && <span className="evc-card-meta">{meta}</span>}
        <span className="evu-target-relation">{L.targetRelation}</span>
      </div>
    </section>
  );
}

/** 접을 수 없는 익명 안내 + 최소 응답 인원 표시 (§5U.3). 닫기·접기 버튼을 두지 않는다. */
function AnonymityNotice({ target, reviewerCount, minResponses, L }) {
  const hasMin = typeof minResponses === 'number' && minResponses > 0;
  const below = hasMin && reviewerCount < minResponses;
  const counter = !hasMin
    ? fill(L.counterNoMin, { count: reviewerCount })
    : below
      ? fill(L.counterWarn, { count: reviewerCount, min: minResponses })
      : fill(L.counterOk, { count: reviewerCount, min: minResponses });
  return (
    <section className="evu-notice" data-testid="evu-notice" aria-label={L.noticeTitleNoName}>
      <p className="evu-notice-title">
        <LockIcon size={14} />
        <span>
          {target?.name ? fill(L.noticeTitle, { name: target.name }) : L.noticeTitleNoName}
        </span>
      </p>
      <ul className="evu-notice-list">
        <li>{L.noticeAnonymous}</li>
        {hasMin && <li>{fill(L.noticeMinimum, { min: minResponses })}</li>}
        <li>{L.noticeHrOnly}</li>
      </ul>
      {target && (
        <p
          className={`evu-counter${below ? ' is-warn' : ''}`}
          data-testid="evu-counter"
          role={below ? 'alert' : undefined}
        >
          {below && <AlertIcon size={14} />}
          <span>{counter}</span>
        </p>
      )}
    </section>
  );
}

export default function EvalUpwardReviewCanvas({
  state = 'ready',
  data = null,
  labels: providedLabels,
  onRetry,
  onSave,
  onSubmit,
  onAiDraft,
  onConfirmLeaderChange,
  aiDraftDisabledReason = null,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);

  const cycleLine = data?.cycle?.name
    ? [data.cycle.name, data.endsAt ? fill(L.deadline, { date: mmdd(data.endsAt) }) : null]
        .filter(Boolean)
        .join(' · ')
    : null;

  const shell = (body, { withNotice = true } = {}) => (
    <div className="evc-root" data-testid="evu-root">
      <header className="evc-header">
        <div>
          <h1 className="evc-title">{L.title}</h1>
          {cycleLine && <p className="evc-summary">{cycleLine}</p>}
        </div>
      </header>
      {withNotice && (
        <div className="evc-list">
          {data?.target && <TargetCard target={data.target} L={L} />}
          <AnonymityNotice
            target={data?.target ?? null}
            reviewerCount={data?.reviewerCount ?? 0}
            minResponses={data?.minResponses ?? null}
            L={L}
          />
        </div>
      )}
      <div className="evc-list">{body}</div>
    </div>
  );

  const empty = (testid, title, sub, action) => (
    <div className="evc-empty" data-testid={testid}>
      <p className="evc-empty-title">{title}</p>
      {sub && <p className="evc-empty-sub">{sub}</p>}
      {action}
    </div>
  );

  if (state === 'loading') {
    // 고지를 먼저 그린다 — 대상 카드·폼 자리는 불러오는 중이다.
    return shell(
      <div className="evc-loading" role="status" data-testid="evu-loading">
        {L.loading}
      </div>,
    );
  }

  if (state === 'error') {
    return shell(
      empty(
        'evu-load-failed',
        L.loadFailed,
        null,
        <button type="button" className="evc-btn is-ghost" onClick={onRetry} data-testid="evu-retry">
          <RefreshIcon size={15} />
          {L.retry}
        </button>,
      ),
      { withNotice: false },
    );
  }

  if (!data) {
    return shell(empty('evu-no-cycle', L.noCycle, null, null), { withNotice: false });
  }

  if (data.window === 'off') {
    return shell(empty('evu-off', L.off, null, null), { withNotice: false });
  }

  if (!data.target) {
    return shell(empty('evu-no-leader', L.noLeaderTitle, L.noLeaderSub, null), {
      withNotice: false,
    });
  }

  // 제출한 뒤에는 기간과 무관하게 쓴 내용을 읽기 전용으로 보인다(§5U.7 E6 · 종료 후에도).
  if (!data.submitted && data.window !== 'open') {
    const title =
      data.window === 'not_started'
        ? data.startsAt
          ? fill(L.notStarted, { date: mmdd(data.startsAt) })
          : L.notStartedNoDate
        : data.window === 'paused'
          ? L.paused
          : L.closed;
    return shell(
      <div className="evc-empty" data-testid={`evu-locked-${data.window}`}>
        <p className="evc-empty-title">
          <LockIcon size={15} /> {title}
        </p>
      </div>,
    );
  }

  if (!data.submitted && data.previousTarget) {
    return shell(
      <section className="evc-onhold-banner evu-leader-changed" data-testid="evu-leader-changed" role="alert">
        <AlertIcon size={16} />
        <div className="evu-leader-changed-body">
          <p className="evc-onhold-text">{L.leaderChangedTitle}</p>
          <p className="evc-hold-hint">{fill(L.leaderChangedSub, { name: data.previousTarget.name })}</p>
        </div>
        <button
          type="button"
          className="evc-btn is-primary"
          onClick={onConfirmLeaderChange}
          data-testid="evu-leader-changed-confirm"
        >
          {L.leaderChangedConfirm}
        </button>
      </section>,
    );
  }

  return (
    <EvalCycleMemberCanvas
      cycle={cycleLine ? { ...data.cycle, name: cycleLine } : data.cycle}
      status={data.submitted ? 'submitted' : 'in_progress'}
      answers={data.answers}
      template={data.template ?? null}
      active
      labels={{ ...L.form, title: L.title }}
      onSave={onSave}
      onSubmit={onSubmit}
      onAiDraft={onAiDraft}
      aiDraftDisabledReason={aiDraftDisabledReason}
      // 항목별 공개 안내는 끈다 — 그 줄은 옛 항목 필드(visibleToRoles)를 읽어, 값이 비면
      // 「피평가자 본인에게도 공개됩니다」라고 적는다. 상향의 공개는 위 익명 안내가 정본이다
      // (평가지 공개 설정 = 인사담당자만 · 최소 인원). 두 문장이 서로 반대로 말하면 안 된다.
      showVisibility={false}
      headerSlot={
        <div className="evc-list">
          <TargetCard target={data.target} L={L} />
          <AnonymityNotice
            target={data.target}
            reviewerCount={data.reviewerCount}
            minResponses={data.minResponses}
            L={L}
          />
        </div>
      }
    />
  );
}
