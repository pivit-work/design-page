import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import EvalCycleWizard from './EvalCycleWizard.jsx';
import { PauseIcon, PlayIcon } from './evalIcons.jsx';

/**
 * EvalCycleHrCanvas — HR 성과평가 사이클 관리 화면(목록) 정본 컴포넌트.
 *
 * 순수 표현: cycles 데이터 + labels + 콜백을 받아 렌더. 데이터 패칭/서비스 호출은
 * 소비 측 책임. 콜백(onCreateCycle/onOpenCycle/onRevokeCycle/onDeleteCycle)은 async,
 * 실패 시 throw 하면 캔버스가 에러 토스트를 띄운다. 생성 모달·확인 모달·토스트는 캔버스 소유.
 *
 * 이번 슬라이스: 사이클 목록 + 최소 생성 모달 + 오픈/회수. 6-step 마법사·진행현황·
 * 캘리브레이션·리포트검수 탭은 후속 슬라이스에서 확장.
 */

const DEFAULT_LABELS = {
  title: '성과 평가',
  summary: '평가 사이클 {{count}}개',
  newCycle: '새 평가 사이클',
  emptyTitle: '아직 평가 사이클이 없습니다',
  emptySub: '새 평가 사이클을 만들어 성과 평가를 시작하세요.',
  manage: '관리',
  viewResults: '결과 보기',
  open: '오픈',
  period: '기간',
  members: '대상 {{count}}명',
  pending: '조치 필요 {{count}}건',
  completion: '완료율',
  revokeAvailable: '회수 가능 · 남은 {{hours}}시간',
  revoke: '사이클 회수',
  emergencyStop: '비상 정지',
  // §5.7.1 일시 중단/재개 (회수·비상정지 대체)
  holdHint: '진행 중인 사이클입니다. 필요 시 일시 중단할 수 있습니다.',
  hold: '일시 중단',
  onHoldBanner: '이 사이클은 일시 중단되었습니다. 구성원의 작성·제출이 차단됩니다.',
  resume: '재개',
  confirmHoldTitle: '평가를 일시 중단하시겠습니까?',
  confirmHoldBody:
    '구성원이 더 이상 작성·제출할 수 없습니다. 이미 작성한 내용은 보존되며, 재개하면 이어서 작성할 수 있습니다. 전체 구성원에게 일시 중단 알림이 발송됩니다.',
  toastHeld: '사이클이 일시 중단되었습니다',
  toastResumed: '사이클이 재개되었습니다',
  // §4.1.2-A 진행 중 일정 수정
  editSchedule: '일정 수정',
  editScheduleTitle: '단계별 일정 수정',
  editScheduleNote:
    '각 단계의 시작·종료 일시를 조정합니다. 단계 간 일정은 겹쳐도 됩니다(병렬 진행). 변경 시 해당 단계 담당자에게 알림이 발송됩니다.',
  editScheduleOrderErr: '종료 일시는 시작 일시와 같거나 이후여야 합니다.',
  editScheduleSave: '일정 저장',
  toastScheduleSaved: '일정이 수정되었습니다',
  // status
  statusDraft: '준비 중',
  statusPeerAssign: '동료 배정',
  statusSelfReview: '셀프 리뷰',
  statusPeerReview: '동료 리뷰',
  statusLeaderReview: '하향 리뷰',
  statusCalibration: '캘리브레이션',
  statusHrReview: 'HR 검수',
  statusReportReview: '리포트 검수',
  statusDone: '완료',
  statusOnHold: '일시 중단',
  statusRevoked: '회수됨',
  statusEmergency: '비상 정지',
  // review types
  reviewSelf: '셀프',
  reviewPeer: '동료',
  reviewUpward: '상향',
  reviewLeader: '하향',
  // create modal / wizard
  createTitle: '새 평가 사이클',
  cycleName: '사이클 이름',
  cycleNamePlaceholder: '예: 2026년 상반기 정기 평가',
  startDate: '시작일',
  endDate: '종료일',
  reviewTypes: '리뷰 종류',
  cancel: '취소',
  create: '생성',
  // wizard
  wizardStep1: '기본 정보',
  wizardStep2: '단계별 일정',
  wizardStep3: '확인 및 생성',
  next: '다음',
  prev: '이전',
  peerAssignModeLabel: '동료 리뷰어 배정 방식',
  modeAiRecommend: 'AI 추천',
  modeSelfSelect: '본인 선택',
  modeLeaderAssign: '리더 지정',
  modeHrAssign: 'HR 지정',
  recommendedBadge: '권장',
  exceptionBadge: '예외',
  scheduleHint: '활성화한 리뷰 종류에 따라 필요한 단계만 표시됩니다. 마감일은 선택 사항입니다.',
  dueLabel: '마감',
  createDraftHint: '생성하면 준비 중 상태로 저장됩니다. 대상자 설정 후 목록에서 오픈하세요.',
  wizardStepTargets: '대상자',
  targetModeAll: '전체',
  targetModeIndividual: '개별 선택',
  targetAllNote: '전체 구성원 {{count}}명이 대상자로 포함됩니다.',
  searchMember: '구성원 검색',
  selectedCount: '{{count}}명 선택됨',
  noMembers: '구성원이 없습니다',
  targetSummaryLabel: '평가 대상',
  targetSummaryValue: '{{count}}명',
  // confirm
  confirmRevokeTitle: '사이클을 회수하시겠습니까?',
  confirmRevokeBody: '회수하면 사이클이 준비 중 상태로 돌아가고 진행 데이터가 초기화됩니다.',
  confirmDeleteTitle: '사이클을 삭제하시겠습니까?',
  confirmDeleteBody: '준비 중인 사이클이 영구 삭제됩니다.',
  confirm: '확인',
  delete: '삭제',
  // toasts
  // 단계 전진
  advance: '{{stage}} 단계로 진행',
  toastAdvanced: '다음 단계로 진행했습니다',
  toastCreated: '평가 사이클이 생성되었습니다',
  toastOpened: '사이클이 오픈되었습니다',
  toastRevoked: '사이클이 회수되었습니다',
  toastDeleted: '사이클이 삭제되었습니다',
  toastError: '오류가 발생했습니다',
  toastNameRequired: '사이클 이름을 입력하세요',
};

const STATUS_META = {
  draft: { key: 'statusDraft', tone: 'neutral' },
  peer_assign: { key: 'statusPeerAssign', tone: 'info' },
  self_review: { key: 'statusSelfReview', tone: 'info' },
  peer_review: { key: 'statusPeerReview', tone: 'info' },
  calibration: { key: 'statusCalibration', tone: 'purple' },
  hr_review: { key: 'statusHrReview', tone: 'purple' },
  report_review: { key: 'statusReportReview', tone: 'purple' },
  done: { key: 'statusDone', tone: 'success' },
  on_hold: { key: 'statusOnHold', tone: 'warn' },
  revoked: { key: 'statusRevoked', tone: 'neutral' },
  emergency_stopped: { key: 'statusEmergency', tone: 'warn' },
};

const LIFECYCLE = [
  'peer_assign',
  'self_review',
  'peer_review',
  'calibration',
  'hr_review',
  'done',
];

// 상향(upward)이 빠져 있어 사이클 카드 칩이 '셀프 · 하향 · 동료 · upward' 로 영문 노출됐다.
const REVIEW_TYPE_KEYS = {
  self: 'reviewSelf',
  peer: 'reviewPeer',
  upward: 'reviewUpward',
  leader: 'reviewLeader',
  manager: 'reviewLeader',
};
// 단계 id → 라벨 키(마법사 PHASES 와 정합). ScheduleEditModal 에서 단계명 표시.
const PHASE_NAME_KEYS = {
  self: 'phaseSelf',
  peer_confirm: 'phasePeerConfirm',
  peer: 'phasePeer',
  upward: 'phaseUpward',
  leader: 'phaseLeader',
  calibration: 'phaseCalibration',
  report_review: 'phaseReportReview',
  share: 'phaseShare',
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
const fill = (s, vars) => {
  let out = s == null ? '' : String(s);
  for (const k of Object.keys(vars)) out = out.replace(`{{${k}}}`, vars[k]);
  return out;
};

function ConfirmModal({ title, body, confirmLabel, cancelLabel, danger, onConfirm, onCancel }) {
  return createPortal(
    <div className="evc-modal-overlay" onClick={onCancel}>
      <div className="evc-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="evc-modal-title">{title}</h3>
        <p className="evc-modal-sub">{body}</p>
        <div className="evc-modal-actions">
          <button type="button" className="evc-btn is-ghost" onClick={onCancel}>{cancelLabel}</button>
          <button type="button" className={`evc-btn ${danger ? 'is-danger' : 'is-primary'}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// datetime-local 값 정규화: 날짜만 저장돼 있으면 기본 시각 부여, 이미 datetime 이면 분까지 자름
function toLocalInput(v, defTime) {
  if (!v) return '';
  if (v.includes('T')) return v.slice(0, 16);
  return `${v}T${defTime}`;
}

// §4.1.2-A 진행 중 단계 일정 인라인 수정 모달
function ScheduleEditModal({ cycle, labels: L, onCancel, onSave }) {
  const rs = cycle.reviewSequence ?? { order: [], enabled: {}, schedule: {} };
  const phases = (rs.order ?? []).filter((id) => rs.enabled?.[id] !== false);
  const [rows, setRows] = useState(() => {
    const init = {};
    for (const id of phases) {
      const s = rs.schedule?.[id] ?? {};
      init[id] = {
        start: toLocalInput(s.start, '09:00'),
        end: toLocalInput(s.end, '18:00'),
      };
    }
    return init;
  });
  const setField = (id, field, value) =>
    setRows((r) => ({ ...r, [id]: { ...r[id], [field]: value } }));

  const invalid = phases.filter((id) => {
    const r = rows[id];
    return r?.start && r?.end && new Date(r.end) < new Date(r.start);
  });
  const hasError = invalid.length > 0;

  const handleSave = () => {
    if (hasError) return;
    const schedule = {};
    for (const id of phases) {
      schedule[id] = { start: rows[id].start || null, end: rows[id].end || null };
    }
    onSave(cycle.id, schedule);
  };

  return createPortal(
    <div className="evc-modal-overlay" onClick={onCancel}>
      <div
        className="evc-modal is-wide evc-sched-modal"
        onClick={(e) => e.stopPropagation()}
        data-testid="evc-schedule-modal"
      >
        <h3 className="evc-modal-title">{L.editScheduleTitle}</h3>
        <p className="evc-modal-sub">{cycle.name}</p>
        <div className="evc-sched-modal-note">{L.editScheduleNote}</div>
        <div className="evc-sched-modal-list">
          {phases.map((id, i) => {
            const bad = invalid.includes(id);
            return (
              <div
                key={id}
                className={`evc-sched-modal-row${bad ? ' is-bad' : ''}`}
                data-testid={`evc-sched-row-${id}`}
              >
                <div className="evc-sched-modal-phase">
                  <span className="evc-sched-modal-num">{i + 1}</span>
                  <span className="evc-sched-modal-name">
                    {L[PHASE_NAME_KEYS[id]] ?? id}
                  </span>
                </div>
                <div className="evc-sched-modal-fields">
                  <label className="evc-sched-modal-field">
                    <span>{L.startDateTime ?? L.startDate}</span>
                    <input
                      type="datetime-local"
                      className="evc-input"
                      value={rows[id]?.start ?? ''}
                      onChange={(e) => setField(id, 'start', e.target.value)}
                      data-testid={`evc-sched-start-${id}`}
                    />
                  </label>
                  <span className="evc-sched-modal-tilde">~</span>
                  <label className="evc-sched-modal-field">
                    <span>{L.endDateTime ?? L.endDate}</span>
                    <input
                      type="datetime-local"
                      className="evc-input"
                      value={rows[id]?.end ?? ''}
                      min={rows[id]?.start || undefined}
                      onChange={(e) => setField(id, 'end', e.target.value)}
                      data-testid={`evc-sched-end-${id}`}
                    />
                  </label>
                </div>
                {bad && <div className="evc-sched-modal-err">{L.editScheduleOrderErr}</div>}
              </div>
            );
          })}
        </div>
        <div className="evc-modal-actions">
          <button type="button" className="evc-btn is-ghost" onClick={onCancel}>
            {L.cancel}
          </button>
          <button
            type="button"
            className="evc-btn is-primary"
            disabled={hasError}
            onClick={handleSave}
            data-testid="evc-sched-save"
          >
            {L.editScheduleSave}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function StatusBadge({ status, label }) {
  const meta = STATUS_META[status] ?? STATUS_META.draft;
  return <span className={`evc-status-badge tone-${meta.tone}`}>{label}</span>;
}

/**
 * 이 사이클이 실제로 거치는 단계. 서버가 `lifecycle` 을 내려주면 그대로 쓰고(리뷰 종류·단계
 * ON/OFF 반영), 없으면 종래 고정 체인으로 폴백한다. draft 는 스테퍼에 표시하지 않는다.
 */
/**
 * peer_review 는 '리뷰 작성' 단계로, 동료·상향·하향 리뷰가 여기서 진행된다.
 * 동료 리뷰를 안 쓰는 사이클에서 '동료 리뷰'라고 부르면 사실과 다르므로 '하향 리뷰'로 부른다.
 */
function statusLabel(cycle, status, L) {
  if (
    status === 'peer_review' &&
    Array.isArray(cycle?.reviewTypes) &&
    !cycle.reviewTypes.includes('peer')
  ) {
    return L.statusLeaderReview;
  }
  return L[STATUS_META[status]?.key ?? 'statusDraft'];
}

function stepsOf(cycle) {
  const server = Array.isArray(cycle?.lifecycle) ? cycle.lifecycle : null;
  const steps = (server ?? LIFECYCLE).filter((s) => s !== 'draft');
  return steps.length > 0 ? steps : LIFECYCLE;
}

function LifecycleStepper({ cycle, status, steps = LIFECYCLE, labels: L }) {
  const currentIdx = steps.indexOf(status);
  return (
    <div className="evc-stepper" aria-hidden="true">
      {steps.map((s, i) => {
        const state = currentIdx < 0 ? 'future' : i < currentIdx ? 'past' : i === currentIdx ? 'current' : 'future';
        return (
          <div key={s} className={`evc-step is-${state}`}>
            <span className="evc-step-dot" />
            <span className="evc-step-label">{statusLabel(cycle, s, L)}</span>
          </div>
        );
      })}
    </div>
  );
}

function CycleCard({ cycle, labels: L, onManage, onOpen, onAdvance, onViewResults, onHold, onResume, onEditSchedule }) {
  const isDraft = cycle.status === 'draft';
  const isDone = cycle.status === 'done';
  const isOnHold = cycle.status === 'on_hold';
  // 진행 중(active): draft·done·on_hold·회수·비상정지가 아닌 모든 단계
  const isActive =
    !isDraft && !isDone && !isOnHold &&
    cycle.status !== 'revoked' && cycle.status !== 'emergency_stopped';

  return (
    <section className="evc-card" data-testid="evc-cycle-card">
      <div className="evc-card-top">
        <div className="evc-card-head">
          <h3 className="evc-card-name">{cycle.name}</h3>
          <StatusBadge status={cycle.status} label={statusLabel(cycle, cycle.status, L)} />
          {cycle.pendingCount > 0 && (
            <span className="evc-pending">{fill(L.pending, { count: cycle.pendingCount })}</span>
          )}
        </div>
        <div className="evc-card-meta">
          <span>{L.period}: {cycle.startDate} ~ {cycle.endDate}</span>
          <span className="evc-dot">·</span>
          <span>{fill(L.members, { count: cycle.participantCount ?? 0 })}</span>
        </div>
        {Array.isArray(cycle.reviewTypes) && cycle.reviewTypes.length > 0 && (
          <div className="evc-type-badges">
            {cycle.reviewTypes.map((t) => (
              <span key={t} className="evc-type-badge">{L[REVIEW_TYPE_KEYS[t]] ?? t}</span>
            ))}
          </div>
        )}
      </div>

      {!isDraft && (
        <LifecycleStepper
          cycle={cycle}
          status={cycle.status}
          steps={stepsOf(cycle)}
          labels={L}
        />
      )}

      {/* §5.7.1: 진행 중 → 일시 중단(확인 모달), 일시 중단 → 재개(즉시). 회수·비상정지 대체 */}
      {isActive && (
        <div className="evc-hold-banner">
          <span className="evc-hold-hint">{L.holdHint}</span>
          <button type="button" className="evc-btn is-hold" onClick={() => onHold(cycle)} data-testid="evc-hold">
            <PauseIcon size={14} /> {L.hold}
          </button>
        </div>
      )}
      {isOnHold && (
        <div className="evc-onhold-banner" data-testid="evc-onhold-banner">
          <span className="evc-onhold-icon"><PauseIcon size={14} /></span>
          <span className="evc-onhold-text">{L.onHoldBanner}</span>
          <button type="button" className="evc-btn is-resume" onClick={() => onResume(cycle)} data-testid="evc-resume">
            <PlayIcon size={14} /> {L.resume}
          </button>
        </div>
      )}

      <div className="evc-card-actions">
        {typeof cycle.completionPct === 'number' && (
          <div className="evc-completion">
            <span className="evc-completion-label">{L.completion}</span>
            <span className="evc-completion-value">{cycle.completionPct}%</span>
          </div>
        )}
        <div className="evc-card-buttons">
          {isDraft && (
            <button type="button" className="evc-btn is-primary" onClick={() => onOpen(cycle)} data-testid="evc-open">
              {L.open}
            </button>
          )}
          {/* 오픈된 사이클을 다음 단계로 — 이 버튼이 없어 사이클이 첫 단계에 영구 정체했다.
              nextStatus 는 서버가 계산(리뷰 종류·단계 ON/OFF 반영). 마지막 단계면 숨긴다. */}
          {isActive && cycle.nextStatus && (
            <button
              type="button"
              className="evc-btn is-primary"
              onClick={() => onAdvance(cycle)}
              data-testid="evc-advance"
            >
              {fill(L.advance, { stage: statusLabel(cycle, cycle.nextStatus, L) })}
            </button>
          )}
          {(isActive || isOnHold) && cycle.reviewSequence && (
            <button
              type="button"
              className="evc-btn is-ghost"
              onClick={() => onEditSchedule(cycle)}
              data-testid="evc-edit-schedule"
            >
              {L.editSchedule}
            </button>
          )}
          {isDone ? (
            <button type="button" className="evc-btn is-ghost" onClick={() => onViewResults(cycle)} data-testid="evc-results">
              {L.viewResults}
            </button>
          ) : (
            <button type="button" className="evc-btn is-ghost" onClick={() => onManage(cycle)} data-testid="evc-manage">
              {L.manage}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export default function EvalCycleHrCanvas({
  cycles = [],
  candidates = [],
  committeeCandidates = [],
  loading = false,
  labels: providedLabels,
  onCreateCycle,
  onOpenCycle,
  /** 오픈된 사이클을 다음 단계로 전진. (id) => Promise */
  onAdvanceCycle,
  onDeleteCycle,
  onManageCycle,
  onViewResults,
  onHoldCycle,
  onResumeCycle,
  onPatchSchedule,
  // TC-028 사이클 설정 프리셋(위자드로 전달)
  cyclePresets = [],
  onSaveCyclePreset,
  onLoadCyclePreset,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);

  const [showCreate, setShowCreate] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);
  const [scheduleModal, setScheduleModal] = useState(null); // §4.1.2-A: 편집 대상 cycle

  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const run = useCallback(
    async (fn, successMsg) => {
      try {
        await fn();
        if (successMsg) showToast(successMsg);
      } catch {
        showToast(L.toastError, 'error');
      }
    },
    [showToast, L.toastError],
  );

  const handleCreate = async (payload) => {
    setShowCreate(false);
    await run(() => onCreateCycle?.(payload), L.toastCreated);
  };

  const handleOpen = (cycle) =>
    void run(() => onOpenCycle?.(cycle.id), L.toastOpened);

  const handleAdvance = (cycle) =>
    void run(() => onAdvanceCycle?.(cycle.id), L.toastAdvanced);

  const requestDelete = (cycle) => {
    setConfirmModal({
      title: L.confirmDeleteTitle,
      body: L.confirmDeleteBody,
      confirmLabel: L.delete,
      danger: true,
      onConfirm: () => {
        setConfirmModal(null);
        void run(() => onDeleteCycle?.(cycle.id), L.toastDeleted);
      },
    });
  };

  // §5.7.1: 일시 중단은 확인 모달 후, 재개는 즉시(저위험)
  const requestHold = (cycle) => {
    setConfirmModal({
      title: L.confirmHoldTitle,
      body: L.confirmHoldBody,
      confirmLabel: L.hold,
      danger: false,
      onConfirm: () => {
        setConfirmModal(null);
        void run(() => onHoldCycle?.(cycle.id), L.toastHeld);
      },
    });
  };

  const handleResume = (cycle) =>
    void run(() => onResumeCycle?.(cycle.id), L.toastResumed);

  // §4.1.2-A: 진행 중 단계 일정 저장
  const handleSaveSchedule = (cycleId, schedule) => {
    setScheduleModal(null);
    void run(() => onPatchSchedule?.(cycleId, schedule), L.toastScheduleSaved);
  };

  return (
    <div className="evc-root">
      {toast && (
        <div className={`evc-toast ${toast.type === 'success' ? 'is-success' : 'is-error'}`} role="status">
          {toast.msg}
        </div>
      )}

      <header className="evc-header">
        <div>
          <h1 className="evc-title">{L.title}</h1>
          <p className="evc-summary">{fill(L.summary, { count: cycles.length })}</p>
        </div>
        <button type="button" className="evc-btn is-primary" onClick={() => setShowCreate(true)} data-testid="evc-new-cycle">
          + {L.newCycle}
        </button>
      </header>

      {loading ? (
        <div className="evc-loading">…</div>
      ) : cycles.length === 0 ? (
        <div className="evc-empty" data-testid="evc-empty">
          <p className="evc-empty-title">{L.emptyTitle}</p>
          <p className="evc-empty-sub">{L.emptySub}</p>
          <button type="button" className="evc-btn is-primary" onClick={() => setShowCreate(true)}>
            + {L.newCycle}
          </button>
        </div>
      ) : (
        <div className="evc-list">
          {cycles.map((cycle) => (
            <CycleCard
              key={cycle.id}
              cycle={cycle}
              labels={L}
              onManage={onManageCycle ? (c) => onManageCycle(c.id) : requestDelete}
              onOpen={handleOpen}
              onAdvance={handleAdvance}
              onViewResults={onViewResults ? (c) => onViewResults(c.id) : () => {}}
              onHold={requestHold}
              onResume={handleResume}
              onEditSchedule={(c) => setScheduleModal(c)}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <EvalCycleWizard
          labels={L}
          candidates={candidates}
          committeeCandidates={committeeCandidates}
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
          presets={cyclePresets}
          onSavePreset={onSaveCyclePreset}
          onLoadPreset={onLoadCyclePreset}
        />
      )}

      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          body={confirmModal.body}
          confirmLabel={confirmModal.confirmLabel ?? L.confirm}
          cancelLabel={L.cancel}
          danger={confirmModal.danger}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {scheduleModal && (
        <ScheduleEditModal
          cycle={scheduleModal}
          labels={L}
          onCancel={() => setScheduleModal(null)}
          onSave={handleSaveSchedule}
        />
      )}
    </div>
  );
}
