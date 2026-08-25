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
  // PW-440 — 작성 중 초안 카드
  statusWritingDraft: '초안',
  draftResume: '이어서 작성',
  draftDelete: '초안 삭제',
  draftCardMeta: '{{step}}/{{total}}단계 · {{stamp}} 저장',
  confirmDraftDeleteTitle: '이 초안을 삭제하시겠습니까?',
  confirmDraftDeleteBody: '작성한 설정이 사라집니다. 되돌릴 수 없습니다.',
  draftLoadError: '초안을 불러올 수 없습니다.',
  toastDraftSaved: '초안이 저장되어 있습니다.',
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
  // 관리(수정) 모드 — 정책 §4.3. 준비 중 사이클의 '관리'는 설정 편집으로 들어간다.
  manageTitle: '{{name}} · 사이클 관리',
  saveChanges: '변경사항 저장',
  manageSaveHint:
    '준비 중(오픈 전) 사이클의 설정을 변경합니다. 오픈 이후에는 이름·기간·평가 방식·대상자를 바꿀 수 없습니다.',
  toastUpdated: '사이클 설정이 저장되었습니다',
  manageLoadError: '사이클 설정을 불러오지 못했습니다',
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
  // PW-123 평가 템플릿 게이트 — 진행/생성이 막힌 사유를 버튼 옆에 그대로 띄운다.
  blockTemplateLibrary: '이 단계에서 쓸 평가 템플릿을 만들어 저장하세요',
  blockTemplateMap: '적용할 템플릿을 지정하지 않은 단계가 있습니다',
  submitBlockBasics: '1단계 기본 정보를 완성하세요',
  submitBlockTemplate: '2단계에서 평가 템플릿을 만들어 저장하세요',
  submitBlockTemplateMap: '3단계에서 각 리뷰 단계에 템플릿을 지정하세요',
  submitBlockTargets: '4단계에서 대상자를 1명 이상 선택하세요',
  submitBlockCommittee: '5단계 캘리브레이션 위원회 구성을 완성하세요',
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
/** 위자드 단계 수 — 초안 카드의 「N/6단계」 표기가 이 값을 쓴다 (PW-440). */
const WIZARD_STEP_COUNT = 6;

/**
 * `2026-08-23T18:20:00Z` → `08/23 18:20` (PW-440).
 *
 * 24시간제로 적는다(정책 §5.2.2). 초안이 여럿 쌓였을 때 어느 것이 최신인지 훑어
 * 가려야 하는 자리라 「오후 6:20」 보다 자릿수가 고른 편이 읽힌다.
 */
function stampDateShort(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
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

function CycleCard({ cycle, labels: L, onManage, onOpen, onAdvance, onViewResults, onHold, onResume, onEditSchedule, onResumeDraft, onDeleteDraft }) {
  const isDraft = cycle.status === 'draft';
  /**
   * PW-440 — 「작성하다 만 초안」인가.
   *
   * 🔴 앱에서 `draft` 는 두 가지다 — 6단계를 다 통과해 «생성»까지 누른 «준비 중»
   * 사이클과, 위자드를 채우다 만 초안. **가르는 근거는 `draftState` 의 유무**다.
   * 둘을 같이 다루면 준비 중 사이클에서 「오픈」이 사라지고(§5.1 검증을 거친 사이클을
   * 열 길이 없어진다), 반대로 초안에 「오픈」을 두면 필수값 미완 사이클이 목록에서
   * 곧장 열려 단계별 검증이 통째로 무력해진다.
   */
  const isWizardDraft = isDraft && !!cycle.draftState && !!onResumeDraft;
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
          {/* PW-440 — 작성 중 초안과 «준비 중»(6단계를 다 통과해 만들어 둔) 사이클은 같은
              `draft` 상태를 쓴다. 배지까지 같은 글자면 목록에서 둘을 가릴 수 없다 —
              카드 전체에서 가장 먼저 읽히는 자리라 여기서 갈라 준다. */}
          <StatusBadge
            status={cycle.status}
            label={isWizardDraft ? L.statusWritingDraft : statusLabel(cycle, cycle.status, L)}
          />
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
        {/* PW-440 — 작성 중 초안에 완료율은 뜻이 없다(아직 아무도 평가하지 않는다).
            그 자리에 「어느 단계까지 갔고 언제 저장했나」를 적는다 — 초안이 여럿일 때
            어느 것을 이어야 할지 가리는 근거가 그 둘이다. */}
        {isWizardDraft ? (
          <div className="evc-draft-meta" data-testid="evc-draft-meta">
            {fill(L.draftCardMeta, {
              step: (cycle.draftStep ?? 0) + 1,
              total: WIZARD_STEP_COUNT,
              stamp: stampDateShort(cycle.draftSavedAt),
            })}
            {cycle.draftSavedByName ? ` · ${cycle.draftSavedByName}` : ''}
          </div>
        ) : (
          typeof cycle.completionPct === 'number' && (
            <div className="evc-completion">
              <span className="evc-completion-label">{L.completion}</span>
              <span className="evc-completion-value">{cycle.completionPct}%</span>
            </div>
          )
        )}
        <div className="evc-card-buttons">
          {isWizardDraft && (
            <>
              <button
                type="button"
                className="evc-btn is-primary"
                onClick={() => onResumeDraft(cycle)}
                data-testid="evc-draft-resume"
              >
                {L.draftResume}
              </button>
              <button
                type="button"
                className="evc-btn is-ghost"
                onClick={() => onDeleteDraft(cycle)}
                data-testid="evc-draft-delete"
              >
                {L.draftDelete}
              </button>
            </>
          )}
          {isDraft && !isWizardDraft && (
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
            /* PW-440 — 작성 중 초안에서 「관리」는 「이어서 작성」과 이름만 다른 같은
               동작이다. 둘을 나란히 두면 어느 쪽이 이어쓰기인지 가릴 수 없다. */
            !isWizardDraft && (
              <button type="button" className="evc-btn is-ghost" onClick={() => onManage(cycle)} data-testid="evc-manage">
                {L.manage}
              </button>
            )
          )}
        </div>
      </div>
    </section>
  );
}

export default function EvalCycleHrCanvas({
  cycles = [],
  candidates = [],
  /** PW-443 — 마법사 4 대상자의 조직 트리 원본 `[{ id, name, parentId }]`. */
  orgUnits = [],
  // 발령 변경 이력 — 마법사 제외 조건('직무 변경'·'직급 변경일') 근거. 그대로 내려보낸다.
  appointmentChanges = [],
  committeeCandidates = [],
  // PW-161 — 위원 후보 조회 상태를 위자드 5단계로 그대로 흘린다.
  committeeCandidatesLoading = false,
  committeeCandidatesError = false,
  onReloadCommitteeCandidates,
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
  /**
   * 준비 중(draft) 사이클 설정 수정 (정책 §4.3 관리 모드).
   * (id, payload) => Promise. 넘기면 draft 카드의 '관리'가 편집 위자드를 연다.
   */
  onUpdateCycle,
  /** 관리 모드 프리필용 상세 조회. (id) => Promise<{ cycle, participants }>. */
  onLoadCycleDetail,
  /**
   * PW-122 — 조직 평가 템플릿 라이브러리. 그대로 위자드 2단계로 흘린다.
   * 넘기지 않으면 위자드가 종전대로 세션 로컬로 동작한다(시각 동일).
   */
  libraryTemplates = null,
  /** PW-434 — 라이브러리 조회 상태('loading'|'ready'|'error')와 재시도. 마법사 2단계
      「저장된 템플릿에서 시작」 블록이 「없다」와 「못 불러왔다」를 갈라 그린다. */
  libraryStatus = 'ready',
  onReloadLibraryTemplates,
  onSaveTemplate,
  onDeleteTemplate,
  templateSaveError = null,
  /**
   * PW-440 — 위자드 초안 저장. `({ draftState, draftStep, name }) =>
   * Promise<{ cycleId, savedAt } | null>`.
   *
   * 넘기지 않으면 초안 기능이 통째로 꺼진다(종전 동작). 넘기면 위자드에 자동 저장·
   * `임시저장`·이탈 확인이 붙고, 목록의 작성 중 초안 카드에 「이어서 작성」이 생긴다.
   */
  onSaveDraft,
  /** PW-440 — 저장된 초안 읽기. `(cycleId) => Promise<{ draftState, draftStep, draftSavedAt, draftSavedByName }>`. */
  onLoadDraft,
  /** PW-440 — 초안 삭제. 없으면 `onDeleteCycle` 로 떨어진다. */
  onDeleteDraft,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);

  const [showCreate, setShowCreate] = useState(false);
  /**
   * PW-440 — 지금 위자드가 다루는 초안. `null` 이면 새로 쓰는 중이다.
   *
   * `cycleId` 를 여기 들고 있어야 두 번째 저장부터 «갱신»이 된다 — 없으면 매 단계마다
   * 새 초안 카드가 하나씩 생긴다.
   */
  const [draftSession, setDraftSession] = useState(null);
  /** 이어쓰기로 열 때 위자드에 넘길 복원값. `null` 이면 새로 쓰는 중이다. */
  const [resumeTarget, setResumeTarget] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [scheduleModal, setScheduleModal] = useState(null); // §4.1.2-A: 편집 대상 cycle
  // §4.3 관리 모드 — { cycle, participants }. 상세를 받아야 대상자까지 프리필된다.
  const [manageTarget, setManageTarget] = useState(null);

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
    /**
     * PW-440 — 초안을 이어 쓰다 「생성」을 누르면 **그 초안이 사이클이 된다.**
     *
     * 🔴 여기서 새로 만들면 목록에 사이클이 둘 생긴다 — 방금 만든 것과, 이어쓰던
     * 초안 카드. 사용자는 자기가 쓰던 것이 왜 그대로 남아 있는지 알 수 없다.
     * 초안 레코드는 이미 있으므로 «갱신»이 맞다.
     */
    const draftCycleId = draftSession?.cycleId;
    closeWizard();
    if (draftCycleId && onUpdateCycle) {
      await run(() => onUpdateCycle(draftCycleId, payload), L.toastCreated);
      return;
    }
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

  /**
   * §4.3 '관리' — 준비 중 사이클은 설정 편집 위자드로, 오픈된 사이클은 종전대로
   * 진행 현황으로 보낸다. 준비 중은 진행 현황에 볼 것이 없고(§3 오픈 전 접근 불가),
   * 실제로 이 경로 때문에 오픈 전 사이클의 이름·기간을 고칠 방법이 아예 없었다(PW-120).
   */
  const canEditSettings = (cycle) =>
    cycle.status === 'draft' && !!onUpdateCycle && !!onLoadCycleDetail;

  const handleManage = (cycle) => {
    if (!canEditSettings(cycle)) {
      onManageCycle?.(cycle.id);
      return;
    }
    void (async () => {
      try {
        const detail = await onLoadCycleDetail(cycle.id);
        setManageTarget({
          cycle: detail?.cycle ?? cycle,
          participants: detail?.participants ?? [],
        });
      } catch {
        showToast(L.manageLoadError, 'error');
      }
    })();
  };

  const handleUpdate = async (payload) => {
    const id = manageTarget?.cycle?.id;
    setManageTarget(null);
    await run(() => onUpdateCycle?.(id, payload), L.toastUpdated);
  };

  /**
   * PW-440 — 위자드가 부르는 초안 저장. 첫 저장에서 받은 사이클 id 를 여기 붙들어
   * 두 번째 저장부터 «갱신»이 되게 한다.
   *
   * 🔴 실패를 **던지지 않는다.** 던지면 위자드가 통째로 닫히면서 작성 중이던 설정이
   * 날아간다 — 이 카드가 없애려는 바로 그 일이다. `null` 로 알리고 위자드가 푸터에
   * 인라인으로 표시한다.
   */
  const handleSaveDraft = async ({ draftState, draftStep, name }) => {
    if (!onSaveDraft) return null;
    try {
      const saved = await onSaveDraft({
        cycleId: draftSession?.cycleId,
        // 낙관적 잠금 키 — 그 사이 다른 HR 이 저장했으면 서버가 거절한다.
        baseSavedAt: draftSession?.savedAt ?? null,
        draftState,
        draftStep,
        name,
      });
      if (!saved) return null;
      setDraftSession({ cycleId: saved.cycleId, savedAt: saved.savedAt });
      return saved;
    } catch {
      return null;
    }
  };

  /**
   * PW-440 — 「이어서 작성」. **머물던 단계에서** 연다.
   *
   * 🔴 초안을 못 읽으면 **빈 위자드를 열지 않는다.** 빈 화면을 열면 사용자가 그 위에
   * 새로 쓰다가 저장 시점에 원래 초안을 덮는다(§5.1-A-6).
   */
  const handleResumeDraft = (cycle) => {
    void (async () => {
      try {
        const draft = onLoadDraft
          ? await onLoadDraft(cycle.id)
          : {
              draftState: cycle.draftState,
              draftStep: cycle.draftStep,
              draftSavedAt: cycle.draftSavedAt,
              draftSavedByName: cycle.draftSavedByName,
            };
        if (!draft?.draftState) {
          showToast(L.draftLoadError, 'error');
          return;
        }
        setDraftSession({
          cycleId: cycle.id,
          savedAt: draft.draftSavedAt ?? null,
        });
        setResumeTarget(draft);
        setShowCreate(true);
      } catch {
        showToast(L.draftLoadError, 'error');
      }
    })();
  };

  const requestDeleteDraft = (cycle) => {
    setConfirmModal({
      title: L.confirmDraftDeleteTitle,
      body: L.confirmDraftDeleteBody,
      confirmLabel: L.delete,
      danger: true,
      onConfirm: () => {
        setConfirmModal(null);
        void run(
          () => (onDeleteDraft ?? onDeleteCycle)?.(cycle.id),
          L.toastDeleted,
        );
      },
    });
  };

  /** 위자드를 닫는다 — 초안 세션과 복원값을 함께 비운다(다음에 열면 새 초안이다). */
  const closeWizard = () => {
    setShowCreate(false);
    setResumeTarget(null);
    setDraftSession(null);
  };

  /**
   * PW-440 — 사용자가 위자드를 닫을 때. 이번 세션에 한 번이라도 저장했으면
   * **저장돼 있다는 사실을 알린다.** 닫히고 나면 화면에는 목록만 남아서, 저장이
   * 됐는지 아닌지가 카드를 유심히 보기 전까지 드러나지 않는다 (§5.1-A-5).
   */
  const cancelWizard = () => {
    const hadDraft = !!draftSession;
    closeWizard();
    if (hadDraft) showToast(L.toastDraftSaved);
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
              onManage={
                onManageCycle || onUpdateCycle ? handleManage : requestDelete
              }
              onOpen={handleOpen}
              onAdvance={handleAdvance}
              onViewResults={onViewResults ? (c) => onViewResults(c.id) : () => {}}
              onHold={requestHold}
              onResume={handleResume}
              onEditSchedule={(c) => setScheduleModal(c)}
              onResumeDraft={onSaveDraft ? handleResumeDraft : undefined}
              onDeleteDraft={requestDeleteDraft}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <EvalCycleWizard
          labels={L}
          candidates={candidates}
          orgUnits={orgUnits}
          appointmentChanges={appointmentChanges}
          committeeCandidates={committeeCandidates}
          committeeCandidatesLoading={committeeCandidatesLoading}
          committeeCandidatesError={committeeCandidatesError}
          onReloadCommitteeCandidates={onReloadCommitteeCandidates}
          onSubmit={handleCreate}
          onCancel={cancelWizard}
          onSaveDraft={onSaveDraft ? handleSaveDraft : undefined}
          draftState={resumeTarget?.draftState ?? null}
          draftStep={resumeTarget?.draftStep ?? 0}
          draftSavedAt={resumeTarget?.draftSavedAt ?? null}
          draftSavedByName={resumeTarget?.draftSavedByName ?? null}
          presets={cyclePresets}
          onSavePreset={onSaveCyclePreset}
          onLoadPreset={onLoadCyclePreset}
          libraryTemplates={libraryTemplates}
          libraryStatus={libraryStatus}
          onReloadLibraryTemplates={onReloadLibraryTemplates}
          onSaveTemplate={onSaveTemplate}
          onDeleteTemplate={onDeleteTemplate}
          templateSaveError={templateSaveError}
        />
      )}

      {manageTarget && (
        <EvalCycleWizard
          labels={L}
          candidates={candidates}
          orgUnits={orgUnits}
          appointmentChanges={appointmentChanges}
          committeeCandidates={committeeCandidates}
          committeeCandidatesLoading={committeeCandidatesLoading}
          committeeCandidatesError={committeeCandidatesError}
          onReloadCommitteeCandidates={onReloadCommitteeCandidates}
          cycle={manageTarget.cycle}
          participants={manageTarget.participants}
          onSubmit={handleUpdate}
          onCancel={() => setManageTarget(null)}
          libraryTemplates={libraryTemplates}
          libraryStatus={libraryStatus}
          onReloadLibraryTemplates={onReloadLibraryTemplates}
          onSaveTemplate={onSaveTemplate}
          onDeleteTemplate={onDeleteTemplate}
          templateSaveError={templateSaveError}
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
