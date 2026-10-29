import { Fragment, useMemo } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';
import Avatar from '../shared/Avatar.jsx';
import EmptyState from '../shared/EmptyState.jsx';
import { ArrowRightIcon, CheckCircleIcon, ChevronRightIcon, PauseIcon } from './evalIcons.jsx';

/**
 * EvalMyHomeCanvas — 구성원 「내 평가 홈」 (PW-1468).
 *
 * 기획 `spec-eval-cycle.md` §4.4-C E1 · 시안 `eval-app.jsx` `MyEvalDashboard` 를 옮겼다.
 * 셀프 + 동료(주는 리뷰) + 팀원 하향 + 캘리브레이션 + 결과를 «내가 해야 할 일» 한 장에 모은다.
 * 무엇을 그릴지(어느 단계가 있나·상태·마감)는 앱이 정해 넘기고, 이 캔버스는 그리기만 한다.
 *
 *   cycles[{ id, name, period, calibrationEnabled?, paused?, phases[{ id, label, due, status, actionable, evaluator }] }]
 *     paused === true 면 관리자가 일시 중단한 평가다(PW-2423) — 배지를 「일시 중단」(warning)으로, 카드에 중단 안내 줄.
 *     calibrationEnabled === false 면 캘리브레이션 칩을 그리지 않는다 (member §10.1 M2).
 *     status: 라벨 사전(member §3.2-A · PW-1970) — 모양은 §3.2 세 가지 중 하나다
 *       완료(초록+체크): 'submitted' 제출 완료 · 'arrived' 도착
 *       진행(주황): 'not_started' 작성 전 · 'in_progress' 작성 중 · 'open' 진행 중
 *       대기(회색): 'not_open' 열리기 전 · 'missed' 미제출 · 'closed' 마감 · 'pending'(옛 값)
 *     waitsForSelf: 셀프를 먼저 내야 열린다 — 보조 줄 「셀프 완료 후 오픈」. 안 주면 옛 판정(동료·대기·못 누름)
 *     actionable: 누르면 갈 곳이 있다 · evaluator: 평가자 자격으로 열리는 상자(하향·캘리브레이션)
 *   reportBanner: { cycleId, cycleName, gradeLabel } | null
 *   peerTasks[{ cycleId, evaluateeId, name, due, submitted }]
 *   peerReceiveOff: 나는 이번 평가에서 동료 리뷰를 받지 않는다(PW-1945) — 동료 리뷰 카드 머리에 안내
 *   state: 'ready' | 'loading' | 'failed'
 *
 * 시안과 다른 곳: 단계 사이 화살표·완료 체크는 글자 대신 인라인 SVG, 색은 공용 딱지 뜻(tone)으로 —
 * 시안의 «팀 3인 미만 띠»는 막는 띠가 아니라 안내로만 그린다 — 내가 주는 리뷰는 그대로 쓴다(PW-1945 · 구성원 정책 §3.3.1).
 */

const DEFAULT_LABELS = {
  loading: '불러오는 중…',
  loadFailed: '평가 정보를 불러오지 못했습니다.',
  retry: '다시 시도',
  empty: '진행 중인 평가가 없습니다.',
  emptySub: '평가가 시작되면 해야 할 일이 여기에 표시됩니다.',
  reportTitle: '피드백 리포트가 도착했습니다',
  reportSub: '{cycle} 결과를 확인하세요.',
  reportGrade: '최종 등급: {grade}',
  reportCta: '리포트 보기',
  inProgress: '진행 중',
  paused: '일시 중단',
  pausedNotice: '현재 평가가 일시 중단되었습니다. 재개 안내를 기다려주세요.',
  period: '대상 기간: {period}',
  due: '마감 {due}',
  status: {
    not_open: '열리기 전',
    not_started: '작성 전',
    in_progress: '작성 중',
    submitted: '제출 완료',
    missed: '미제출',
    open: '진행 중',
    closed: '마감',
    arrived: '도착',
    pending: '시작 전',
  },
  chips: {
    self: '셀프 리뷰',
    peer: '동료 리뷰 (주는)',
    manager: '팀원 하향',
    calibration: '캘리브레이션',
  },
  chipNote: {
    manager: '매니저 역할 보유 시',
    calibration: '위원 초대 시만 생성 (조직장)',
  },
  evaluatorHint: { manager: '평가자 · 팀 평가 관리', calibration: '위원(초대) · 캘리브레이션' },
  peerWaitsSelf: '셀프 완료 후 오픈',
  peerTitle: '내가 주는 동료 리뷰',
  peerPending: '{count}건 대기 중',
  peerWrite: '리뷰 작성',
  peerDone: '제출 완료',
  peerReceiveOffTitle: '팀 인원이 3명 미만이라 이번 평가에서는 동료 리뷰를 받지 않습니다',
  peerReceiveOffSub:
    '소속 조직의 재직자가 3명보다 적으면 익명이 지켜지지 않아 동료 리뷰를 운영하지 않습니다. 다른 동료에게 쓰는 동료 리뷰는 그대로 작성합니다.',
};

/** 상태 → 상자 모양(member §3.2 표의 완료·진행 중·시작 전). 모르는 값은 대기 모양이다. */
const STATUS_SHAPE = {
  submitted: 'done',
  arrived: 'done',
  not_started: 'active',
  in_progress: 'active',
  open: 'active',
  not_open: 'idle',
  missed: 'idle',
  closed: 'idle',
  pending: 'idle',
};
const SHAPE_TONE = { done: 'success', active: 'warning', idle: 'neutral' };
const CHIP_ORDER = ['self', 'peer', 'manager', 'calibration'];

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
  return String(tpl).replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
}

function PhaseBox({ cycleId, phase, L, onPhaseClick }) {
  const shape = STATUS_SHAPE[phase.status] || 'idle';
  const done = shape === 'done';
  const waitsForSelf =
    phase.waitsForSelf !== undefined
      ? phase.waitsForSelf === true
      : phase.id === 'peer' && phase.status === 'pending' && !phase.actionable && !phase.evaluator;
  const classes = [
    'evmh-phase',
    phase.evaluator ? 'is-evaluator' : done ? 'is-done' : shape === 'active' || phase.actionable ? 'is-active' : '',
    phase.actionable ? '' : 'is-idle',
  ].filter(Boolean).join(' ');
  const body = (
    <>
      {done && (
        <span className="evmh-phase-check" aria-hidden>
          <CheckCircleIcon size={18} />
        </span>
      )}
      <span className="evmh-phase-top">
        <span className="evmh-phase-label">{phase.label}</span>
        {phase.evaluator && L.evaluatorHint[phase.id] && (
          <span className="evmh-phase-hint">
            {L.evaluatorHint[phase.id]}
            <ChevronRightIcon size={12} />
          </span>
        )}
      </span>
      <span className="evmh-phase-bottom">
        {phase.due && <span className="evmh-phase-due">{fill(L.due, { due: phase.due })}</span>}
        <StatusBadge tone={SHAPE_TONE[shape]} className="evc-status-badge">
          {L.status[phase.status] || phase.status}
        </StatusBadge>
        {waitsForSelf && (
          <span className="evmh-phase-due">{L.peerWaitsSelf}</span>
        )}
      </span>
    </>
  );
  if (!phase.actionable) {
    return (
      <div className={classes} data-testid={`evmh-phase-${cycleId}-${phase.id}`} data-status={phase.status}>
        {body}
      </div>
    );
  }
  return (
    <button
      type="button"
      className={classes}
      data-testid={`evmh-phase-${cycleId}-${phase.id}`}
      data-status={phase.status}
      onClick={() => onPhaseClick && onPhaseClick(cycleId, phase.id)}
    >
      {body}
    </button>
  );
}

export default function EvalMyHomeCanvas({
  state = 'ready',
  cycles = [],
  reportBanner = null,
  peerTasks = [],
  /**
   * PW-1945 — 나는 이번 평가에서 동료 리뷰를 «받지» 않는다(팀이 3명 미만 · 구성원 정책 §3.3.1). 내가 «주는»
   * 리뷰 목록은 막지 않고 카드 머리에 안내만 붙인다. 판정은 오픈 때 서버가 내렸다.
   */
  peerReceiveOff = false,
  labels: providedLabels,
  onRetry,
  onPhaseClick,
  onViewReport,
  onWritePeer,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);

  if (state === 'loading') {
    return (
      <div className="evc-root" role="status" data-testid="evmh-loading">
        {L.loading}
      </div>
    );
  }
  if (state === 'failed') {
    return (
      <div className="evc-root" data-testid="evmh-root">
        <EmptyState
          data-testid="evmh-failed"
          description={L.loadFailed}
          actions={
            onRetry ? (
              <button type="button" className="evc-btn is-ghost" onClick={onRetry} data-testid="evmh-retry">
                {L.retry}
              </button>
            ) : null
          }
        />
      </div>
    );
  }

  const pendingPeers = peerTasks.filter((p) => !p.submitted).length;

  return (
    <div className="evc-root" data-testid="evmh-root">
      {reportBanner && (
        <section className="evmh-banner" data-testid="evmh-report-banner">
          <span className="evmh-banner-icon" aria-hidden>
            <CheckCircleIcon size={20} />
          </span>
          <span className="evmh-banner-text">
            <span className="evmh-banner-title">{L.reportTitle}</span>
            <span className="evmh-banner-sub">
              {fill(L.reportSub, { cycle: reportBanner.cycleName })}
              {reportBanner.gradeLabel ? ` ${fill(L.reportGrade, { grade: reportBanner.gradeLabel })}` : ''}
            </span>
          </span>
          <button
            type="button"
            className="evc-btn is-primary evmh-banner-cta"
            onClick={() => onViewReport && onViewReport(reportBanner.cycleId)}
            data-testid="evmh-report-cta"
          >
            {L.reportCta}
            <ArrowRightIcon size={14} />
          </button>
        </section>
      )}

      {cycles.length === 0 ? (
        <EmptyState data-testid="evmh-empty" title={L.empty} description={L.emptySub} />
      ) : (
        cycles.map((c) => {
          const present = new Set(c.phases.map((p) => p.id));
          return (
            <section className="evc-card" key={c.id} data-testid={`evmh-cycle-${c.id}`}>
              <div className="evmh-cycle-head">
                <div>
                  <h2 className="evc-card-name">{c.name}</h2>
                  {c.period && <p className="evmh-cycle-period">{fill(L.period, { period: c.period })}</p>}
                </div>
                <StatusBadge
                  tone={c.paused ? 'warning' : 'progress'}
                  className="evc-status-badge"
                  data-testid={`evmh-cycle-${c.id}-status`}
                >
                  {c.paused ? L.paused : L.inProgress}
                </StatusBadge>
              </div>
              {/* HR 정책 §6.6 — 멈춘 동안 구성원 화면에 중단 안내. 모양은 관리자 화면의 중단 줄(재개 버튼 없이). */}
              {c.paused && (
                <div className="evc-onhold-banner" role="status" data-testid={`evmh-paused-${c.id}`}>
                  <span className="evc-onhold-icon" aria-hidden>
                    <PauseIcon size={14} />
                  </span>
                  <span className="evc-onhold-text">{L.pausedNotice}</span>
                </div>
              )}
              <div className="evmh-chips">
                {/* member §10.1 M2 — 캘리브레이션을 끈 평가는 그 칩을 회색으로도 남기지 않는다. */}
                {CHIP_ORDER.filter((id) => id !== 'calibration' || c.calibrationEnabled !== false).map((id) => {
                  const on = present.has(id);
                  return (
                    <StatusBadge
                      key={id}
                      tone={on ? 'accent' : 'neutral'}
                      className="evc-status-badge"
                      title={on ? undefined : L.chipNote[id]}
                      data-testid={`evmh-chip-${c.id}-${id}`}
                      data-on={on ? 'true' : 'false'}
                    >
                      {L.chips[id]}
                    </StatusBadge>
                  );
                })}
              </div>
              <div className="evmh-flow">
                {c.phases.map((ph, idx) => (
                  <Fragment key={ph.id}>
                    <PhaseBox cycleId={c.id} phase={ph} L={L} onPhaseClick={onPhaseClick} />
                    {idx < c.phases.length - 1 && (
                      <span className="evmh-flow-arrow" aria-hidden>
                        <ArrowRightIcon size={16} />
                      </span>
                    )}
                  </Fragment>
                ))}
              </div>
            </section>
          );
        })
      )}

      {peerTasks.length > 0 && (
        <section className="evc-card" data-testid="evmh-peers">
          <div className="evmh-cycle-head">
            <h2 className="evc-card-name">{L.peerTitle}</h2>
            <StatusBadge tone="info" className="evc-status-badge">
              {fill(L.peerPending, { count: pendingPeers })}
            </StatusBadge>
          </div>
          {peerReceiveOff && (
            <div className="evc-wiz-soft-warn" data-testid="evmh-peer-receive-off">
              <strong>{L.peerReceiveOffTitle}</strong>
              <br />
              {L.peerReceiveOffSub}
            </div>
          )}
          <div className="evmh-peer-list">
            {peerTasks.map((p) => (
              <div className="evmh-peer-row" key={`${p.cycleId}-${p.evaluateeId}`} data-testid="evmh-peer-row">
                <Avatar name={p.name} size={32} />
                <span className="evmh-peer-name">{p.name}</span>
                {p.due && <span className="evmh-phase-due">{fill(L.due, { due: p.due })}</span>}
                {p.submitted ? (
                  <StatusBadge tone="success" className="evc-status-badge">{L.peerDone}</StatusBadge>
                ) : (
                  <button
                    type="button"
                    className="evc-btn is-ghost"
                    onClick={() => onWritePeer && onWritePeer(p)}
                    data-testid="evmh-peer-write"
                  >
                    {L.peerWrite}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
