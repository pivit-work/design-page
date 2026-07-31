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

function ReviewRow({ row, L, gradeLabels, myUserId, canSend, checked, onToggle, onApprove }) {
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const isMyReport = row.leaderId === myUserId;
  const canApprove = isMyReport && row.status === 'pending';
  const meta = STATUS_META[row.status] ?? STATUS_META.pending;

  const approve = async () => {
    setBusy(true);
    try {
      await onApprove(row.memberId, comment.trim() || null);
    } finally {
      setBusy(false);
    }
  };

  return (
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
        <span className="evrr-name-main">{row.name || row.memberId}</span>
        {row.department && <span className="evrr-name-sub">{row.department}</span>}
      </div>
      <div className="evrr-cell evrr-grade">{(row.gradeKey ? (gradeLabels?.[row.gradeKey] ?? row.gradeKey) : '—')}</div>
      <div className="evrr-cell evrr-leader">{row.leaderName ?? '—'}</div>
      <div className="evrr-cell evrr-status">
        <span className={`evrr-badge ${meta.cls}`}>{L[meta.key]}</span>
      </div>
      <div className="evrr-cell evrr-action">
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
  );
}

export default function EvalReportReviewCanvas({
  queue = null,
  cycleName,
  myUserId,
  gradeLabels = {},
  labels: providedLabels,
  onApprove,
  onSend,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);
  const q = queue ?? { rows: [], counts: { pending: 0, leaderApproved: 0, sent: 0 }, canSend: false, canApproveAsLeader: false };
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
              />
            ))
          )}
        </section>
      </div>
    </div>
  );
}
