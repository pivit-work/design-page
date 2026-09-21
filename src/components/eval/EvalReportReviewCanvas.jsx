import { useState, useMemo, useRef, useCallback, useEffect } from 'react';

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
}) {
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const isMyReport = row.leaderId === myUserId;
  const canApprove = isMyReport && row.status === 'pending';
  const meta = STATUS_META[row.status] ?? STATUS_META.pending;
  const overrideCount = row.overrideCount ?? 0;
  const hasSections = sectionOrder.length > 0;

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
      <div className="evrr-cell evrr-select">
        {canSend && row.status === 'leader_approved' && (
          <input
            type="checkbox"
            checked={checked}
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
            <span
              className="evrr-badge is-override"
              title={L.overrideTooltip.replace('{count}', String(overrideCount))}
              data-testid={`evrr-override-${row.memberId}`}
            >
              {L.overrideBadge}
            </span>
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
      <div className="evrr-cell evrr-status">
        <span className={`evrr-badge ${meta.cls}`}>{L[meta.key]}</span>
      </div>
      <div className="evrr-cell evrr-action">
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
        ) : row.status === 'sent' ? (
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

  const approvedIds = q.rows
    .filter((r) => r.status === 'leader_approved')
    .map((r) => r.memberId);

  const handleApprove = async (memberId, comment) => {
    try {
      await onApprove?.(memberId, comment);
      showToast(L.toastApproved);
    } catch {
      showToast(L.toastError, 'error');
    }
  };

  const send = async (ids) => {
    if (!ids.length) return;
    try {
      await onSend?.(ids);
      setSelected(new Set());
      showToast(L.toastSent);
    } catch {
      showToast(L.toastError, 'error');
    }
  };

  return (
    <div className="evc-root">
      {toast && (
        <div className={`evc-toast ${toast.type === 'success' ? 'is-success' : 'is-error'}`} role="status">{toast.msg}</div>
      )}
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
            <span className="evrr-cell evrr-select" />
            <span className="evrr-cell evrr-name">{L.colName}</span>
            <span className="evrr-cell evrr-grade">{L.colGrade}</span>
            <span className="evrr-cell evrr-leader">{L.colLeader}</span>
            <span className="evrr-cell evrr-status">{L.colStatus}</span>
            <span className="evrr-cell evrr-action" />
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
              />
            ))
          )}
        </section>
      </div>
    </div>
  );
}
