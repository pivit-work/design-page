import { useMemo, useState } from 'react';

/**
 * EvalCycleTeamCalibrationCanvas — 매니저(팀장) 팀 캘리브레이션 결과 · 이의(어필). [R8]
 *
 * 시안: eval-cycle-leader-view.jsx `CalibrationView`.
 * 팀장은 등급을 직접 조정하지 않는다. 1차 제출 등급과 위원회 확정 등급을 비교하고,
 * 조정된 항목에 대해 사유와 함께 이의(어필)를 제기한다(위원회 1인 재검토).
 * rows/orderedGrades 로 시드, onAppeal(memberId, { reason, gradeChangeLogId }) 위임.
 */

const DEFAULT_LABELS = {
  redirectTitle: '캘리브레이션 등급 조정·확정',
  redirectBadge: '위원회 워크스페이스로 이동',
  redirectBody:
    '등급 조정·확정은 캘리브레이션 위원회(조직장) 권한으로, 성과평가 대시보드 › 캘리브레이션 워크스페이스(테이블 뷰)에서 일원화되어 수행됩니다. 팀장(1차 평가자)은 이 화면에서 직접 조정하지 않으며, 1차 평가 제출 후 위원회 조정 결과를 통보받고 필요 시 이의(어필)를 제기합니다.',
  redirectNote:
    '워크스페이스 접근은 위원 초대(조직장 지정) 기반입니다. 초대된 위원만 조정·확정할 수 있으며, HR은 조회 전용입니다.',
  resultTitle: '내 팀 캘리브레이션 결과 · 이의(어필)',
  resultSub:
    '1차 제출 등급과 위원회 확정 등급을 비교합니다. 조정된 항목은 이의(어필)를 제기할 수 있으며, 위원회가 1인 재검토합니다.',
  adjustedBadge: '위원회 조정 {n}건',
  colFirst: '1차 제출',
  colCommittee: '위원회 확정',
  noChange: '조정 없음',
  appealCta: '이의(어필)',
  appealClose: '닫기',
  appealReasonLabel: '이의 사유',
  appealReasonHint: '위원회 재검토 시 참고됩니다',
  appealPlaceholder:
    '위원회 확정 등급에 이의가 있는 근거를 구체적으로 작성해주세요. (예: OKR 달성 근거, 성과 사실관계, 평가 맥락 등)',
  appealCancel: '취소',
  appealSubmit: '이의 접수',
  appealSubmittedBadge: '어필 접수됨',
  appealAcceptedBadge: '어필 수용',
  appealRejectedBadge: '어필 반려',
  appealReasonTitle: '접수된 이의 사유',
  appealReviewTitle: '위원회 재검토 결과',
  empty: '표시할 팀 캘리브레이션 결과가 없습니다.',
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
function fmt(tpl, vars) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : `{${k}}`));
}
function gradeTone(gradeKey, orderedGrades) {
  if (!gradeKey || !orderedGrades?.length) return 'muted';
  const idx = orderedGrades.findIndex((g) => g.gradeKey === gradeKey);
  if (idx < 0) return 'muted';
  if (idx === 0) return 'green';
  if (idx === orderedGrades.length - 1) return 'red';
  return 'accent';
}
function initials(name) {
  if (!name) return '?';
  return name.trim().slice(0, 2);
}

export default function EvalCycleTeamCalibrationCanvas({
  cycle,
  rows = [],
  orderedGrades = [],
  adjustedCount = 0,
  labels: providedLabels,
  onAppeal,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);
  const [openId, setOpenId] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [busyId, setBusyId] = useState(null);

  const labelOf = (key) =>
    orderedGrades.find((g) => g.gradeKey === key)?.label ?? key ?? '—';

  const submitAppeal = async (row) => {
    const reason = (drafts[row.memberId] || '').trim();
    if (!reason || busyId) return;
    setBusyId(row.memberId);
    try {
      await onAppeal?.(row.memberId, {
        reason,
        gradeChangeLogId: row.gradeChangeLogId ?? null,
      });
      setOpenId(null);
      setDrafts((d) => ({ ...d, [row.memberId]: '' }));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="evc-root">
      {/* 리다이렉트 안내 — 조정·확정은 위원회 워크스페이스로 일원화 */}
      <section className="evc-card evtcal-redirect" data-testid="evtcal-redirect">
        <div className="evtcal-redirect-head">
          <span className="evtcal-redirect-title">{L.redirectTitle}</span>
          <span className="evc-status-badge tone-purple">{L.redirectBadge}</span>
        </div>
        <p className="evtcal-redirect-body">{L.redirectBody}</p>
        <p className="evtcal-redirect-note">{L.redirectNote}</p>
      </section>

      {/* 내 팀 캘리브레이션 결과 · 이의(어필) */}
      <section className="evc-card" data-testid="evtcal-result">
        <div className="evtcal-result-head">
          <div>
            <h3 className="evc-card-name">{L.resultTitle}</h3>
            {cycle?.name && <p className="evc-summary">{cycle.name}</p>}
          </div>
          <span
            className={`evc-status-badge tone-${adjustedCount ? 'warn' : 'neutral'}`}
            data-testid="evtcal-adjusted-badge"
          >
            {fmt(L.adjustedBadge, { n: adjustedCount })}
          </span>
        </div>
        <p className="evc-summary evtcal-result-sub">{L.resultSub}</p>

        {rows.length === 0 ? (
          <p className="evc-empty-sub">{L.empty}</p>
        ) : (
          <div className="evtcal-rows">
            {rows.map((r) => {
              const isOpen = openId === r.memberId;
              const draft = drafts[r.memberId] || '';
              const appeal = r.appeal;
              const statusBadge =
                appeal?.status === 'accepted'
                  ? { cls: 'tone-green', txt: L.appealAcceptedBadge }
                  : appeal?.status === 'rejected'
                    ? { cls: 'tone-red', txt: L.appealRejectedBadge }
                    : appeal
                      ? { cls: 'tone-accent', txt: L.appealSubmittedBadge }
                      : null;
              return (
                <div
                  key={r.memberId}
                  className={`evtcal-row${r.changed ? ' is-changed' : ''}`}
                  data-testid="evtcal-row"
                >
                  <div className="evtcal-row-top">
                    <span className="evtcal-avatar" aria-hidden="true">
                      {initials(r.name)}
                    </span>
                    <div className="evtcal-who">
                      <span className="evtcal-name">{r.name}</span>
                      <span className="evtcal-meta">
                        {[r.team, r.job].filter(Boolean).join(' · ')}
                      </span>
                    </div>
                    <div className="evtcal-flow">
                      <div className="evtcal-flow-col">
                        <span className="evtcal-flow-cap">{L.colFirst}</span>
                        <span
                          className={`evs-cw-badge tone-${gradeTone(r.managerGradeKey, orderedGrades)}`}
                        >
                          {labelOf(r.managerGradeKey)}
                        </span>
                      </div>
                      <span
                        className={`evtcal-arrow${r.changed ? ' is-changed' : ''}`}
                        aria-hidden="true"
                      >
                        →
                      </span>
                      <div className="evtcal-flow-col">
                        <span className="evtcal-flow-cap">{L.colCommittee}</span>
                        <span
                          className={`evs-cw-badge tone-${gradeTone(r.committeeGradeKey, orderedGrades)}`}
                        >
                          {labelOf(r.committeeGradeKey)}
                        </span>
                      </div>
                      {r.changed ? (
                        statusBadge ? (
                          <span
                            className={`evc-status-badge ${statusBadge.cls}`}
                            data-testid="evtcal-appeal-status"
                          >
                            {statusBadge.txt}
                          </span>
                        ) : (
                          <button
                            type="button"
                            className={`evc-btn ${isOpen ? 'is-ghost' : 'is-warn-ghost'}`}
                            onClick={() => setOpenId(isOpen ? null : r.memberId)}
                            data-testid="evtcal-appeal-cta"
                          >
                            {isOpen ? L.appealClose : L.appealCta}
                          </button>
                        )
                      ) : (
                        <span className="evtcal-nochange">{L.noChange}</span>
                      )}
                    </div>
                  </div>

                  {/* 이의 사유 입력 — 사유 필수 */}
                  {r.changed && isOpen && !appeal && (
                    <div className="evtcal-appeal-form">
                      <label className="evtcal-appeal-label">
                        {L.appealReasonLabel} <span className="evtcal-req">*</span>
                        <span className="evtcal-appeal-hint">{L.appealReasonHint}</span>
                      </label>
                      <textarea
                        className="evtcal-textarea"
                        rows={3}
                        value={draft}
                        placeholder={L.appealPlaceholder}
                        onChange={(e) =>
                          setDrafts((d) => ({ ...d, [r.memberId]: e.target.value }))
                        }
                        data-testid="evtcal-appeal-textarea"
                      />
                      <div className="evtcal-appeal-actions">
                        <button
                          type="button"
                          className="evc-btn is-ghost"
                          onClick={() => setOpenId(null)}
                        >
                          {L.appealCancel}
                        </button>
                        <button
                          type="button"
                          className="evc-btn is-primary"
                          disabled={!draft.trim() || busyId === r.memberId}
                          onClick={() => submitAppeal(r)}
                          data-testid="evtcal-appeal-submit"
                        >
                          {L.appealSubmit}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 접수된 이의 사유 + 재검토 결과(읽기 전용) */}
                  {appeal && (
                    <div className="evtcal-appeal-done">
                      <div className="evtcal-appeal-reason-title">
                        {L.appealReasonTitle}
                      </div>
                      <div className="evtcal-appeal-reason">{appeal.reason}</div>
                      {appeal.reviewNote && (
                        <>
                          <div className="evtcal-appeal-reason-title">
                            {L.appealReviewTitle}
                            {appeal.reviewedByName ? ` · ${appeal.reviewedByName}` : ''}
                          </div>
                          <div className="evtcal-appeal-reason">{appeal.reviewNote}</div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
