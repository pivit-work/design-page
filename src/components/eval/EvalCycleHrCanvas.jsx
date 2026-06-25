import { useState, useRef, useCallback, useEffect, useMemo } from 'react';

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
  // status
  statusDraft: '준비 중',
  statusPeerAssign: '동료 배정',
  statusSelfReview: '셀프 리뷰',
  statusPeerReview: '동료 리뷰',
  statusCalibration: '캘리브레이션',
  statusHrReview: 'HR 검수',
  statusDone: '완료',
  // review types
  reviewSelf: '셀프',
  reviewPeer: '동료',
  reviewLeader: '하향',
  // create modal
  createTitle: '새 평가 사이클',
  cycleName: '사이클 이름',
  cycleNamePlaceholder: '예: 2026년 상반기 정기 평가',
  startDate: '시작일',
  endDate: '종료일',
  reviewTypes: '리뷰 종류',
  cancel: '취소',
  create: '생성',
  // confirm
  confirmRevokeTitle: '사이클을 회수하시겠습니까?',
  confirmRevokeBody: '회수하면 사이클이 준비 중 상태로 돌아가고 진행 데이터가 초기화됩니다.',
  confirmDeleteTitle: '사이클을 삭제하시겠습니까?',
  confirmDeleteBody: '준비 중인 사이클이 영구 삭제됩니다.',
  confirm: '확인',
  delete: '삭제',
  // toasts
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
  done: { key: 'statusDone', tone: 'success' },
};

const LIFECYCLE = [
  'peer_assign',
  'self_review',
  'peer_review',
  'calibration',
  'hr_review',
  'done',
];

const REVIEW_TYPE_KEYS = { self: 'reviewSelf', peer: 'reviewPeer', leader: 'reviewLeader' };
const REVOKE_WINDOW_H = 24;

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

function remainingRevokeHours(openedAt) {
  if (!openedAt) return null;
  const elapsedMs = Date.now() - new Date(openedAt).getTime();
  const remaining = REVOKE_WINDOW_H - elapsedMs / 3_600_000;
  return remaining;
}

function ConfirmModal({ title, body, confirmLabel, cancelLabel, danger, onConfirm, onCancel }) {
  return (
    <div className="evc-modal-overlay" onClick={onCancel}>
      <div className="evc-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="evc-modal-title">{title}</h3>
        <p className="evc-modal-sub">{body}</p>
        <div className="evc-modal-actions">
          <button type="button" className="evc-btn is-ghost" onClick={onCancel}>{cancelLabel}</button>
          <button type="button" className={`evc-btn ${danger ? 'is-danger' : 'is-primary'}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function CreateCycleModal({ labels: L, onConfirm, onCancel }) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reviewTypes, setReviewTypes] = useState(['self', 'leader']);

  const toggleType = (t) =>
    setReviewTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const canSubmit = name.trim() && startDate && endDate && reviewTypes.length > 0;

  return (
    <div className="evc-modal-overlay" onClick={onCancel}>
      <div className="evc-modal is-wide" onClick={(e) => e.stopPropagation()}>
        <h3 className="evc-modal-title">{L.createTitle}</h3>

        <label className="evc-field-label" htmlFor="evc-name">{L.cycleName}</label>
        <input
          id="evc-name"
          className="evc-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={L.cycleNamePlaceholder}
          autoFocus
          data-testid="evc-create-name"
        />

        <div className="evc-field-grid">
          <div>
            <label className="evc-field-label" htmlFor="evc-start">{L.startDate}</label>
            <input id="evc-start" type="date" className="evc-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} data-testid="evc-create-start" />
          </div>
          <div>
            <label className="evc-field-label" htmlFor="evc-end">{L.endDate}</label>
            <input id="evc-end" type="date" className="evc-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} data-testid="evc-create-end" />
          </div>
        </div>

        <span className="evc-field-label">{L.reviewTypes}</span>
        <div className="evc-type-row">
          {['self', 'peer', 'leader'].map((t) => (
            <button
              type="button"
              key={t}
              className={`evc-type-chip${reviewTypes.includes(t) ? ' is-on' : ''}`}
              onClick={() => toggleType(t)}
              data-testid={`evc-type-${t}`}
            >
              {L[REVIEW_TYPE_KEYS[t]]}
            </button>
          ))}
        </div>

        <div className="evc-modal-actions">
          <button type="button" className="evc-btn is-ghost" onClick={onCancel}>{L.cancel}</button>
          <button
            type="button"
            className="evc-btn is-primary"
            disabled={!canSubmit}
            onClick={() => onConfirm({ name: name.trim(), startDate, endDate, reviewTypes })}
            data-testid="evc-create-submit"
          >
            {L.create}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status, label }) {
  const meta = STATUS_META[status] ?? STATUS_META.draft;
  return <span className={`evc-status-badge tone-${meta.tone}`}>{label}</span>;
}

function LifecycleStepper({ status, labels: L }) {
  const currentIdx = LIFECYCLE.indexOf(status);
  return (
    <div className="evc-stepper" aria-hidden="true">
      {LIFECYCLE.map((s, i) => {
        const state = currentIdx < 0 ? 'future' : i < currentIdx ? 'past' : i === currentIdx ? 'current' : 'future';
        return (
          <div key={s} className={`evc-step is-${state}`}>
            <span className="evc-step-dot" />
            <span className="evc-step-label">{L[STATUS_META[s].key]}</span>
          </div>
        );
      })}
    </div>
  );
}

function CycleCard({ cycle, labels: L, onManage, onOpen, onViewResults, onRevoke, onEmergency }) {
  const isDraft = cycle.status === 'draft';
  const isDone = cycle.status === 'done';
  const isActive = !isDraft && !isDone;
  const remaining = isActive ? remainingRevokeHours(cycle.openedAt) : null;
  const canRevoke = remaining != null && remaining > 0;

  return (
    <section className="evc-card" data-testid="evc-cycle-card">
      <div className="evc-card-top">
        <div className="evc-card-head">
          <h3 className="evc-card-name">{cycle.name}</h3>
          <StatusBadge status={cycle.status} label={L[STATUS_META[cycle.status]?.key ?? 'statusDraft']} />
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

      {!isDraft && <LifecycleStepper status={cycle.status} labels={L} />}

      {canRevoke && (
        <div className="evc-revoke-banner">
          <span>{fill(L.revokeAvailable, { hours: Math.max(0, Math.ceil(remaining)) })}</span>
          <button type="button" className="evc-btn is-warn-ghost" onClick={() => onRevoke(cycle)} data-testid="evc-revoke">
            {L.revoke}
          </button>
        </div>
      )}
      {isActive && !canRevoke && (
        <div className="evc-emergency-banner">
          <button type="button" className="evc-btn is-danger-ghost" onClick={() => onEmergency(cycle)} data-testid="evc-emergency">
            🛑 {L.emergencyStop}
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
  loading = false,
  labels: providedLabels,
  onCreateCycle,
  onOpenCycle,
  onRevokeCycle,
  onDeleteCycle,
  onManageCycle,
  onViewResults,
  onEmergencyStop,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);

  const [showCreate, setShowCreate] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);

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

  const requestRevoke = (cycle) => {
    setConfirmModal({
      title: L.confirmRevokeTitle,
      body: L.confirmRevokeBody,
      confirmLabel: L.revoke,
      danger: true,
      onConfirm: () => {
        setConfirmModal(null);
        void run(() => onRevokeCycle?.(cycle.id), L.toastRevoked);
      },
    });
  };

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

  const handleEmergency = (cycle) =>
    void run(() => onEmergencyStop?.(cycle.id));

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
              onViewResults={onViewResults ? (c) => onViewResults(c.id) : () => {}}
              onRevoke={requestRevoke}
              onEmergency={handleEmergency}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateCycleModal labels={L} onConfirm={handleCreate} onCancel={() => setShowCreate(false)} />
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
    </div>
  );
}
