import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';
import Toast from '../shared/Toast.jsx';

/**
 * EvalReportReviewCanvas — 리포트 검수/발송 파이프라인 (G6).
 *
 * 피평가자별 등급·검수 상태를 표로 보여준다. 리더(조직장)는 직속 팀원 리포트를 1차 검수
 * 승인(+최종 코멘트), HR 은 승인된 리포트를 선택해 일괄 발송한다. 발송된 리포트만 피평가자가
 * 열람할 수 있다. spec-eval-cycle §6~7.
 */

const DEFAULT_LABELS = {
  title: '리포트 검수 · 발송',
  subtitle: '피평가자별 리포트를 검수하고 발송합니다.',
  countPending: '검수 대기',
  countApproved: '승인됨',
  countSent: '발송됨',
  colName: '피평가자',
  colGrade: '등급',
  colLeader: '담당 리더',
  colStatus: '상태',
  statusPending: '검수 대기',
  statusApproved: '승인됨',
  statusSent: '발송됨',
  approve: '승인',
  approved: '승인 완료',
  finalCommentPh: '최종 코멘트 (선택)',
  sendSelected: '선택 발송',
  sendAllApproved: '승인분 일괄 발송',
  noRows: '검수할 리포트가 없습니다.',
  toastApproved: '검수 승인했습니다',
  toastSent: '리포트를 발송했습니다',
  toastError: '오류가 발생했습니다',
  selectHint: '발송할 승인분을 선택하세요.',
  // PW-863 — 한 사람만의 리포트 구성 예외 (정책 §8.3)
  sectionsOpen: '리포트 구성',
  sectionsClose: '접기',
  sectionsHint: '이 사람의 리포트에만 걸립니다. 사이클 전체 구성은 「리포트」 탭에서 바꿉니다.',
  sectionsRequired: '필수',
  sectionsLocked: '이미 발송해 바꿀 수 없습니다.',
  sectionsReadOnly: '리포트 구성은 인사담당자만 바꿀 수 있습니다.',
  overrideBadge: '구성 예외',
  overrideTooltip: '사이클 기본 구성과 다른 항목 {count}개',
  sectionsError: '리포트 구성을 저장하지 못했습니다.',
  // TC-093: 검수 대기 리포트가 남아 있을 때 발송 시 강조
  incompleteSendWarn:
    '아직 검수 대기 중인 리포트가 {count}건 있습니다. 발송은 승인된 리포트에만 적용됩니다.',
  // PW-711 — 동료 피드백 AI 톤 정제 + 인사담당자 검수 (정책 §8.5·§8.5-B)
  colRefine: '동료 피드백 다듬기',
  refinePending: '대기 중',
  refineDone: '완료',
  refineNeedsReview: '검수 필요',
  refineFailed: '실패',
  /** 🔴 발송 버튼을 «감추지 않고» 그 자리에 띄우는 문구다(§8.5-B). */
  refineBlocked: '동료 리뷰 {count}건의 검수가 남았습니다',
  refineOpen: '검수하기',
  refineClose: '접기',
  refineHint:
    'AI 가 고친 글은 인사담당자가 확인해야 피평가자에게 나갑니다. 다듬기 전 원문은 그대로 남습니다.',
  refineOriginal: '원문 (다듬기 전)',
  refineRefined: '다듬은 글',
  refineNone: '검수할 동료 리뷰가 없습니다.',
  refineApprove: '승인',
  refineKeepOriginal: '원문 유지',
  refineEdit: '직접 수정',
  refineEditSave: '이 글로 확정',
  refineEditCancel: '취소',
  refineEditPh: '피평가자에게 나갈 글을 직접 쓰세요.',
  refineRetry: '재시도',
  refineFailedNote:
    '다듬지 못했습니다. 다시 시도하거나, 원문 그대로 보내려면 「원문 유지」를 고르세요.',
  refinePendingNote: '다듬는 중입니다. 잠시 뒤 다시 열어 보세요.',
  refineDecided: '검수 완료',
  refineError: '검수 결과를 저장하지 못했습니다.',
  refineLoadError: '검수 목록을 불러오지 못했습니다.',
  /** 일괄 발송에서 막힌 사람이 빠졌을 때. §8.6 의 「미승인 N건은 제외됩니다」와 같은 꼴. */
  refineExcluded: '검수 미완 {count}명은 제외됩니다',
  // PW-978 — 대상자 탭에서 「제외됨」인 사람 (정책 §5.3.6 「발송하지 않는다 · `제외됨` 으로 표시」)
  statusExcluded: '제외됨',
  excludedNote: '대상자에서 제외된 {count}명은 발송하지 않습니다',
  /** 발송 뒤 알림 — 실제로 나간 수와, 제외되어 빠진 수. */
  toastSentCount: '{count}명에게 리포트를 발송했습니다',
  toastSkippedExcluded: '제외되어 보내지 않음 {count}명',
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

const STATUS_META = {
  pending: { key: 'statusPending', cls: 'is-pending' },
  leader_approved: { key: 'statusApproved', cls: 'is-approved' },
  sent: { key: 'statusSent', cls: 'is-sent' },
};
/** PW-978 — 검수 상태와 다른 축이다. 제외된 사람은 상태가 무엇이든 이 딱지 하나만 보인다. */
const EXCLUDED_META = { key: 'statusExcluded', cls: 'is-excluded' };

/** PW-711 — 정책 §8.5 의 배지 넷. 색은 「사람이 손을 써야 하나」로 가른다. */
const REFINE_META = {
  pending: { key: 'refinePending', cls: 'is-pending' },
  refined: { key: 'refineDone', cls: 'is-done' },
  needs_hr_review: { key: 'refineNeedsReview', cls: 'is-review' },
  failed: { key: 'refineFailed', cls: 'is-failed' },
};

/**
 * PW-863 — 그 사람 줄을 펼쳐 «이 사람 리포트에만» 들어갈 항목을 켜고 끈다 (정책 §8.3).
 *
 * 사이클 전체 구성은 「리포트」 탭에 있다. 한 컨트롤로 두면 한 사람을 검수하다 전원
 * 리포트가 바뀌므로 자리를 가른 것이고, 여기서는 **그 사람만** 바뀐다.
 */
function SectionPanel({ row, L, sectionOrder, requiredSections, canEdit, onToggleSection }) {
  const [busyKey, setBusyKey] = useState(null);
  const [error, setError] = useState(false);
  const locked = row.status === 'sent';

  const toggle = async (key) => {
    if (!canEdit || locked || busyKey) return;
    setBusyKey(key);
    setError(false);
    try {
      await onToggleSection(row.memberId, key, !(row.sections?.[key] !== false));
    } catch {
      // 전역 오류 화면으로 튕기지 않는다 — 펼쳐 둔 목록이 통째로 사라진다.
      setError(true);
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="evrr-sections" data-testid={`evrr-sections-${row.memberId}`}>
      <p className="evrr-sections-hint">{L.sectionsHint}</p>
      <div className="evrr-sections-list">
        {sectionOrder.map((key) => {
          const required = requiredSections.includes(key);
          const on = required || row.sections?.[key] !== false;
          return (
            <label
              key={key}
              className={`evrr-section${on ? '' : ' is-off'}${required ? ' is-required' : ''}`}
              data-testid={`evrr-section-${row.memberId}-${key}`}
            >
              <input
                type="checkbox"
                checked={on}
                disabled={required || !canEdit || locked || busyKey === key}
                onChange={() => toggle(key)}
              />
              <span className="evrr-section-label">{L.sectionLabels?.[key] ?? key}</span>
              {required && <span className="evrr-section-req">{L.sectionsRequired}</span>}
            </label>
          );
        })}
      </div>
      {locked ? (
        <p className="evrr-sections-note" data-testid={`evrr-sections-locked-${row.memberId}`}>
          {L.sectionsLocked}
        </p>
      ) : !canEdit ? (
        <p className="evrr-sections-note">{L.sectionsReadOnly}</p>
      ) : null}
      {error && (
        <p className="evrr-sections-error" role="alert" data-testid={`evrr-sections-error-${row.memberId}`}>
          {L.sectionsError}
        </p>
      )}
    </div>
  );
}

/**
 * PW-711 — 동료 리뷰 원문·다듬은 글 비교 검수 (정책 §8.5 「HR 검수 필요 조건」).
 *
 * 창(모달)이 아니라 줄 아래로 펼치는 칸이다. 형제인 「리포트 구성」 칸과 같은 모양이고,
 * 무엇보다 창을 띄우면 뒤쪽 막이 왼쪽 메뉴를 덮는지까지 매번 재야 한다 — 이 화면에는
 * 창이 필요한 이유가 없다(리뷰를 읽고 셋 중 하나를 고르는 일이다).
 */
function RefinementPanel({ memberId, L, load, onDecide, onRetry }) {
  const [review, setReview] = useState(null);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState('');

  // 칸을 펼칠 때 한 번 읽어 온다. `setError(null)` 을 여기서 부르지 않는 것은
  // 렌더가 연쇄로 도는 것을 막기 위해서다 — 이 칸은 펼칠 때 새로 생기므로 초기값이 곧 비움이다.
  useEffect(() => {
    let alive = true;
    Promise.resolve(load(memberId))
      .then((r) => {
        if (alive) setReview(r);
      })
      .catch(() => {
        if (alive) setError(L.refineLoadError);
      });
    return () => {
      alive = false;
    };
  }, [memberId, load, L.refineLoadError]);

  const run = async (answerId, fn) => {
    setBusyId(answerId);
    setError(null);
    try {
      const next = await fn();
      if (next) setReview(next);
      setEditing(null);
    } catch {
      setError(L.refineError);
    } finally {
      setBusyId(null);
    }
  };

  if (error && !review) {
    return (
      <div className="evrr-refine" data-testid={`evrr-refine-${memberId}`}>
        <p className="evrr-refine-error" role="alert">{error}</p>
      </div>
    );
  }
  if (!review) return null;

  return (
    <div className="evrr-refine" data-testid={`evrr-refine-${memberId}`}>
      <p className="evrr-refine-hint">{L.refineHint}</p>
      {error && (
        <p className="evrr-refine-error" role="alert">{error}</p>
      )}
      {review.items.length === 0 ? (
        <p className="evrr-refine-hint" data-testid={`evrr-refine-empty-${memberId}`}>
          {L.refineNone}
        </p>
      ) : (
        review.items.map((item) => {
          const meta = REFINE_META[item.status] ?? REFINE_META.pending;
          const busy = busyId === item.answerId;
          const isEditing = editing === item.answerId;
          return (
            <section
              className="evrr-refine-item"
              key={item.answerId}
              data-testid={`evrr-refine-item-${item.answerId}`}
            >
              <header className="evrr-refine-head">
                <span className="evrr-refine-who">{item.reviewerLabel}</span>
                {item.itemLabel && (
                  <span className="evrr-refine-q">{item.itemLabel}</span>
                )}
                <StatusBadge className={`evrr-badge ${meta.cls}`}>{L[meta.key]}</StatusBadge>
              </header>

              <div className="evrr-refine-compare">
                <div className="evrr-refine-col">
                  <span className="evrr-refine-col-label">{L.refineOriginal}</span>
                  <p className="evrr-refine-text">{item.originalText}</p>
                </div>
                <div className="evrr-refine-col">
                  <span className="evrr-refine-col-label">{L.refineRefined}</span>
                  <p className="evrr-refine-text">{item.refinedText ?? '—'}</p>
                </div>
              </div>

              {item.status === 'failed' && (
                <p className="evrr-refine-note">{L.refineFailedNote}</p>
              )}
              {item.status === 'pending' && (
                <p className="evrr-refine-note">{L.refinePendingNote}</p>
              )}

              {isEditing ? (
                <div className="evrr-refine-edit">
                  <textarea
                    className="evrr-refine-editor"
                    value={draft}
                    placeholder={L.refineEditPh}
                    onChange={(e) => setDraft(e.target.value)}
                    data-testid={`evrr-refine-editor-${item.answerId}`}
                  />
                  <span className="evrr-refine-actions">
                    <button
                      type="button"
                      className="evc-btn"
                      onClick={() => setEditing(null)}
                    >
                      {L.refineEditCancel}
                    </button>
                    <button
                      type="button"
                      className="evc-btn is-primary"
                      disabled={busy || !draft.trim()}
                      onClick={() =>
                        run(item.answerId, () =>
                          onDecide(item.answerId, 'edit', draft.trim()),
                        )
                      }
                      data-testid={`evrr-refine-edit-save-${item.answerId}`}
                    >
                      {L.refineEditSave}
                    </button>
                  </span>
                </div>
              ) : item.status === 'refined' ? (
                <span className="evrr-muted" data-testid={`evrr-refine-done-${item.answerId}`}>
                  {L.refineDecided}
                </span>
              ) : (
                <span className="evrr-refine-actions">
                  {item.status === 'failed' ? (
                    <button
                      type="button"
                      className="evc-btn"
                      disabled={busy}
                      onClick={() => run(item.answerId, () => onRetry(item.answerId))}
                      data-testid={`evrr-refine-retry-${item.answerId}`}
                    >
                      {L.refineRetry}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="evc-btn is-primary"
                      disabled={busy}
                      onClick={() =>
                        run(item.answerId, () => onDecide(item.answerId, 'approve'))
                      }
                      data-testid={`evrr-refine-approve-${item.answerId}`}
                    >
                      {L.refineApprove}
                    </button>
                  )}
                  <button
                    type="button"
                    className="evc-btn"
                    disabled={busy}
                    onClick={() =>
                      run(item.answerId, () =>
                        onDecide(item.answerId, 'keep_original'),
                      )
                    }
                    data-testid={`evrr-refine-keep-${item.answerId}`}
                  >
                    {L.refineKeepOriginal}
                  </button>
                  <button
                    type="button"
                    className="evc-btn"
                    disabled={busy}
                    onClick={() => {
                      setDraft(item.refinedText ?? item.originalText);
                      setEditing(item.answerId);
                    }}
                    data-testid={`evrr-refine-edit-${item.answerId}`}
                  >
                    {L.refineEdit}
                  </button>
                </span>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}

function ReviewRow({
  row,
  L,
  gradeLabels,
  myUserId,
  canSend,
  checked,
  onToggle,
  onApprove,
  sectionOrder,
  requiredSections,
  canEditSections,
  onToggleSection,
  refinement,
}) {
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [refineOpen, setRefineOpen] = useState(false);
  const isMyReport = row.leaderId === myUserId;
  const excluded = row.excluded === true;
  // PW-1053 — 누를 수 있나는 서버가 줄마다 준 값(`canApprove`)을 쓴다. 담당 리더 id 로 따로
  // 판정하면 본부장에게 산하 팀원 줄은 보이는데 [승인]이 없었다. 값이 없으면 종전 판정.
  const canApprove =
    typeof row.canApprove === 'boolean'
      ? row.canApprove
      : isMyReport && row.status === 'pending' && !excluded;
  const meta = excluded
    ? EXCLUDED_META
    : (STATUS_META[row.status] ?? STATUS_META.pending);
  const overrideCount = row.overrideCount ?? 0;
  const hasSections = sectionOrder.length > 0;
  // PW-711 — 검수 잔여는 **서버가 센 값**을 그대로 쓴다. 화면이 다시 세면 발송을 막는
  // 서버 판정과 갈려서 「눌리는데 안 나간다」가 된다(정책 §8.5-B).
  const unresolved = row.unresolvedPeerRefinements ?? 0;
  const refineMeta = row.peerRefinementStatus
    ? (REFINE_META[row.peerRefinementStatus] ?? null)
    : null;
  const blocked = unresolved > 0;

  const approve = async () => {
    setBusy(true);
    try {
      await onApprove(row.memberId, comment.trim() || null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
    <div className="evrr-row" data-testid={`evrr-row-${row.memberId}`}>
      <div className="evrr-cell">
        {canSend && row.status === 'leader_approved' && !excluded && (
          <input
            type="checkbox"
            checked={checked && !blocked}
            disabled={blocked}
            onChange={() => onToggle(row.memberId)}
            data-testid={`evrr-check-${row.memberId}`}
            aria-label={row.name}
          />
        )}
      </div>
      <div className="evrr-cell evrr-name">
        <span className="evrr-name-main">
          {row.name || row.memberId}
          {overrideCount > 0 && (
            <StatusBadge
              className="evrr-badge is-override"
              title={L.overrideTooltip.replace('{count}', String(overrideCount))}
              data-testid={`evrr-override-${row.memberId}`}>
              {L.overrideBadge}
            </StatusBadge>
          )}
        </span>
        {row.department && <span className="evrr-name-sub">{row.department}</span>}
        {overrideCount > 0 && (
          <span className="evrr-name-sub" data-testid={`evrr-override-note-${row.memberId}`}>
            {L.overrideTooltip.replace('{count}', String(overrideCount))}
          </span>
        )}
      </div>
      <div className="evrr-cell evrr-grade">{(row.gradeKey ? (gradeLabels?.[row.gradeKey] ?? row.gradeKey) : '—')}</div>
      <div className="evrr-cell evrr-leader">{row.leaderName ?? '—'}</div>
      <div className="evrr-cell evrr-refine-cell">
        {refineMeta ? (
          <>
            <StatusBadge
              className={`evrr-badge ${refineMeta.cls}`}
              data-testid={`evrr-refine-badge-${row.memberId}`}>
              {L[refineMeta.key]}
            </StatusBadge>
            {blocked && refinement && (
              <button
                type="button"
                className="evrr-refine-link"
                onClick={() => setRefineOpen((v) => !v)}
                data-testid={`evrr-refine-blocked-${row.memberId}`}
              >
                {L.refineBlocked.replace('{count}', String(unresolved))}
              </button>
            )}
          </>
        ) : (
          <span className="evrr-muted">—</span>
        )}
      </div>
      <div className="evrr-cell">
        <StatusBadge className={`evrr-badge ${meta.cls}`}>{L[meta.key]}</StatusBadge>
      </div>
      <div className="evrr-cell">
        {refinement && refineMeta && (
          <button
            type="button"
            className="evc-btn"
            aria-expanded={refineOpen}
            onClick={() => setRefineOpen((v) => !v)}
            data-testid={`evrr-refine-toggle-${row.memberId}`}
          >
            {refineOpen ? L.refineClose : L.refineOpen}
          </button>
        )}
        {hasSections && (
          <button
            type="button"
            className="evc-btn evrr-sections-toggle"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            data-testid={`evrr-sections-toggle-${row.memberId}`}
          >
            {open ? L.sectionsClose : L.sectionsOpen}
          </button>
        )}
        {canApprove ? (
          <div className="evrr-approve">
            <input
              className="evrr-comment"
              type="text"
              value={comment}
              placeholder={L.finalCommentPh}
              onChange={(e) => setComment(e.target.value)}
              data-testid={`evrr-comment-${row.memberId}`}
            />
            <button
              type="button"
              className="evc-btn is-primary"
              disabled={busy}
              onClick={approve}
              data-testid={`evrr-approve-${row.memberId}`}
            >
              {L.approve}
            </button>
          </div>
        ) : excluded ? null : row.status === 'sent' ? (
          <span className="evrr-muted">{L.statusSent}</span>
        ) : row.status === 'leader_approved' ? (
          <span className="evrr-muted">{L.approved}</span>
        ) : null}
      </div>
    </div>
    {open && hasSections && (
      <SectionPanel
        row={row}
        L={L}
        sectionOrder={sectionOrder}
        requiredSections={requiredSections}
        canEdit={canEditSections}
        onToggleSection={onToggleSection}
      />
    )}
    {refineOpen && refinement && (
      <RefinementPanel
        memberId={row.memberId}
        L={L}
        load={refinement.load}
        onDecide={refinement.decide}
        onRetry={refinement.retry}
      />
    )}
    </>
  );
}

export default function EvalReportReviewCanvas({
  queue = null,
  cycleName,
  myUserId,
  gradeLabels = {},
  labels: providedLabels,
  /**
   * PW-863 — 한 사람만의 리포트 구성 예외를 저장한다(정책 §8.3).
   * `(memberId, sectionKey, nextOn)` 을 받아 저장하고, 실패하면 throw 한다 —
   * 그 줄 안에서 알리기 위해서다(전역 오류 화면으로 튕기면 펼쳐 둔 목록이 사라진다).
   * 안 주면 켜고 끄기가 그려지지 않으므로 기존 시각은 그대로다.
   */
  onToggleSection = null,
  /** 끌 «수 없는» 항목. 사이클 기본 구성과 같은 둘이다. */
  requiredSections = ['summary', 'highlights'],
  /**
   * `toolbar` — 헤더 아래에 놓을 호출부 노드(선택). 사이클 안 형제 화면으로 오가는 탭
   * 줄이 이 자리에 선다. 이 캔버스의 `.evc-root` 는 `position: fixed` 라 호출부가
   * 바깥에 놓으면 본문 칸을 벗어나므로 안쪽에 자리를 낸다. 안 주면 아무것도 그리지
   * 않으므로 기존 시각은 그대로다. (PW-606)
   */
  toolbar = null,
  /**
   * PW-711 — 동료 피드백 다듬기 검수 배선 (정책 §8.5). 셋을 한 묶음으로 받는다:
   * `load(memberId)` 는 그 사람의 리뷰 목록을, `decide`·`retry` 는 **바뀐 목록을 다시**
   * 돌려줘야 한다(캔버스가 그것으로 다시 그린다). 실패하면 throw 해야 칸 안에서 알린다.
   * 안 주면 검수 칸을 그리지 않으므로 기존 시각은 그대로다.
   */
  refinement = null,
  onApprove,
  onSend,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);
  const q = queue ?? { rows: [], counts: { pending: 0, leaderApproved: 0, sent: 0 }, canSend: false, canApproveAsLeader: false };
  /**
   * 켜고 끌 수 있는 항목 = 필수 둘 + 그 사이클이 쓰는 리뷰의 항목. 순서·목록은 서버가
   * 준 것을 그대로 쓴다 — 화면이 따로 세우면 「리포트」 탭과 갈린다.
   */
  const sectionOrder = onToggleSection
    ? [...requiredSections, ...(q.optionalSections ?? [])]
    : [];
  const [selected, setSelected] = useState(() => new Set());
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 3000);
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const toggle = (memberId) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });

  // PW-711 — 일괄 발송은 막힌 사람을 **빼고** 보내고 몇 명이 빠졌는지 알린다(§8.5-B).
  // 서버도 같은 판정으로 한 번 더 거른다 — 여기는 «보여 주기» 쪽이다.
  // PW-978 — 제외된 사람은 승인돼 있어도 보낼 대상이 아니다. 「검수 미완 N명」과 섞지 않고
  // 따로 알린다(서버도 같은 판정으로 한 번 더 거른다).
  const excludedIds = new Set(q.rows.filter((r) => r.excluded === true).map((r) => r.memberId));
  const approvedRows = q.rows.filter(
    (r) => r.status === 'leader_approved' && !excludedIds.has(r.memberId),
  );
  const approvedIds = approvedRows
    .filter((r) => (r.unresolvedPeerRefinements ?? 0) === 0)
    .map((r) => r.memberId);
  const excludedCount = approvedRows.length - approvedIds.length;

  const handleApprove = async (memberId, comment) => {
    try {
      await onApprove?.(memberId, comment);
      showToast(L.toastApproved);
    } catch {
      showToast(L.toastError, 'error');
    }
  };

  const send = async (rawIds) => {
    // 고른 뒤에 막힌 사람이 생길 수 있다(동료가 리뷰를 고쳐 다시 내면 그 순간 막힌다).
    // 보내기 직전에 한 번 더 거른다 — 서버도 같은 판정으로 막지만 여기서 거르면
    // 「보냈다」 토스트가 실제로 나간 사람 수와 맞는다.
    const blockedIds = new Set(
      q.rows
        .filter((r) => (r.unresolvedPeerRefinements ?? 0) > 0)
        .map((r) => r.memberId),
    );
    const ids = rawIds.filter((id) => !blockedIds.has(id) && !excludedIds.has(id));
    if (!ids.length) return;
    try {
      // PW-978 — 호출부가 서버 결과(`{ sent, excluded }`)를 돌려주면 실제 수를 적는다. 고른 뒤
      // 그 사이 제외된 사람은 서버가 빼므로, 화면이 고른 수가 아니라 서버가 센 수를 쓴다.
      // 돌려주지 않는 호출부는 예전 문구 그대로다.
      const result = await onSend?.(ids);
      setSelected(new Set());
      if (result && typeof result.sent === 'number') {
        const sentMsg = L.toastSentCount.replace('{count}', String(result.sent));
        showToast(
          result.excluded > 0
            ? `${sentMsg} · ${L.toastSkippedExcluded.replace('{count}', String(result.excluded))}`
            : sentMsg,
        );
      } else {
        showToast(L.toastSent);
      }
    } catch {
      showToast(L.toastError, 'error');
    }
  };

  return (
    <div className="evc-root">
      {/* PW-978 — 공용 Toast 로 그린다(<body> 바로 아래). 전에는 `.evc-root` 안에 그려서, 뿌리가
          position: fixed 인 탓에 z-index 가 앱 위쪽 바를 넘지 못해 알림이 한 번도 보이지 않았다. */}
      <Toast
        message={toast?.msg}
        tone={toast?.type === 'success' ? 'success' : 'error'}
        data-testid="evrr-toast"
      />
      <header className="evc-header">
        <div>
          <h1 className="evc-title">{L.title}</h1>
          <p className="evc-summary">{cycleName || L.subtitle}</p>
        </div>
      </header>

      {toolbar && <div className="evc-toolbar">{toolbar}</div>}

      <div className="evc-list">
        <div className="evrr-counts">
          <span className="evrr-count is-pending" data-testid="evrr-count-pending">{L.countPending} {q.counts.pending}</span>
          <span className="evrr-count is-approved" data-testid="evrr-count-approved">{L.countApproved} {q.counts.leaderApproved}</span>
          <span className="evrr-count is-sent" data-testid="evrr-count-sent">{L.countSent} {q.counts.sent}</span>
        </div>

        {q.canSend && q.counts.pending > 0 && (
          <p className="evc-wiz-warn" data-testid="evrr-incomplete-warn">
            {L.incompleteSendWarn.replace('{count}', String(q.counts.pending))}
          </p>
        )}

        {q.canSend && excludedCount > 0 && (
          <p className="evc-wiz-warn" data-testid="evrr-refine-excluded">
            {L.refineExcluded.replace('{count}', String(excludedCount))}
          </p>
        )}

        {q.canSend && excludedIds.size > 0 && (
          <p className="evc-empty-sub" data-testid="evrr-excluded-note">
            {L.excludedNote.replace('{count}', String(excludedIds.size))}
          </p>
        )}

        {q.canSend && (
          <div className="evrr-toolbar">
            <span className="evc-empty-sub">{L.selectHint}</span>
            <span className="evrr-toolbar-actions">
              <button
                type="button"
                className="evc-btn"
                disabled={approvedIds.length === 0}
                onClick={() => send(approvedIds)}
                data-testid="evrr-send-all"
              >
                {L.sendAllApproved}
              </button>
              <button
                type="button"
                className="evc-btn is-primary"
                disabled={selected.size === 0}
                onClick={() => send([...selected])}
                data-testid="evrr-send-selected"
              >
                {L.sendSelected} ({selected.size})
              </button>
            </span>
          </div>
        )}

        <section className="evc-card evrr-table">
          <div className="evrr-row evrr-head">
            <span className="evrr-cell" />
            <span className="evrr-cell evrr-name">{L.colName}</span>
            <span className="evrr-cell evrr-grade">{L.colGrade}</span>
            <span className="evrr-cell evrr-leader">{L.colLeader}</span>
            <span className="evrr-cell evrr-refine-cell">{L.colRefine}</span>
            <span className="evrr-cell">{L.colStatus}</span>
            <span className="evrr-cell" />
          </div>
          {q.rows.length === 0 ? (
            <p className="evc-empty-sub" data-testid="evrr-empty">{L.noRows}</p>
          ) : (
            q.rows.map((row) => (
              <ReviewRow
                key={row.memberId}
                row={row}
                L={L}
                gradeLabels={gradeLabels}
                myUserId={myUserId}
                canSend={q.canSend}
                checked={selected.has(row.memberId)}
                onToggle={toggle}
                onApprove={handleApprove}
                sectionOrder={sectionOrder}
                requiredSections={requiredSections}
                canEditSections={q.canEditSections === true}
                onToggleSection={onToggleSection}
                refinement={refinement}
              />
            ))
          )}
        </section>
      </div>
    </div>
  );
}
