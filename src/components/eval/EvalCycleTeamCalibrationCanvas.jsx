import { useMemo, useState } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';
import EmptyState from '../shared/EmptyState.jsx';
import AvatarPhoto from './AvatarPhoto';

/**
 * EvalCycleTeamCalibrationCanvas — 매니저(팀장) 팀 캘리브레이션 결과 · 이의(어필). [R8]
 *
 * 시안: eval-cycle-leader-view.jsx `CalibrationView`.
 * 팀장은 등급을 직접 조정하지 않는다. 1차 제출 등급과 위원회 확정 등급을 비교하고,
 * 조정된 항목에 대해 사유와 함께 이의(어필)를 제기한다(위원회 1인 재검토).
 * rows/orderedGrades 로 시드, onAppeal(memberId, { reason, gradeChangeLogId }) 위임.
 */

const DEFAULT_LABELS = {
  // PW-1047 ⑤ 맨 위 한 줄 + 「자세히」로 펴는 설명 두 문단
  redirectSummary: '등급 조정은 위원회가 합니다. 조정된 팀원에게만 이의를 낼 수 있고, 위원회가 다시 검토합니다.',
  redirectMore: '자세히',
  redirectLess: '접기',
  redirectBody:
    '등급 조정·확정은 캘리브레이션 위원회(조직장) 권한으로, 성과평가 대시보드 › 캘리브레이션 워크스페이스(테이블 뷰)에서 일원화되어 수행됩니다. 팀장(1차 평가자)은 이 화면에서 직접 조정하지 않으며, 1차 평가 제출 후 위원회 조정 결과를 통보받고 필요 시 이의(어필)를 제기합니다.',
  redirectNote:
    '워크스페이스 접근은 위원 초대(조직장 지정) 기반입니다. 초대된 위원만 조정·확정할 수 있으며, HR은 조회 전용입니다.',
  resultTitle: '내 팀 캘리브레이션 결과 · 이의(어필)',
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
  // PW-486 캘리브레이션을 끈 사이클 — 이의는 「1차 제출 등급 ↔ 위원회 확정 등급」의 차이에
  // 제기하는 것인데 끈 사이클에서는 두 값이 항상 같다. 창구를 열어 두면 팀장이 자기가 매긴
  // 등급에 자기가 이의를 제기하는 구조가 된다(§12.3).
  calibOffTitle: '이 사이클은 캘리브레이션을 사용하지 않습니다',
  calibOffBody:
    '하향 리뷰에서 제출하신 등급이 그대로 최종 등급이 됩니다. 위원회 조정·결과 통보·이의(어필) 절차가 없습니다.',
  calibReleasedBanner: '이 사이클은 진행 중 캘리브레이션이 해제되었습니다.',
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
  /**
   * PW-486 — 이 사이클이 캘리브레이션 단계를 쓰는가. 기본 `true` 라 켠 사이클은 종전과
   * 동일하다. 진행 중 껐지만 조정 이력이 남았으면 호출부가 `true` 로 넘기고
   * `calibrationReleased` 로 해제 사실만 알린다.
   */
  calibrationEnabled = true,
  /** 진행 중 해제됐고 조정 이력이 남아 있다 — 켠 것과 같이 그리되 안내 띠를 얹는다. */
  calibrationReleased = false,
  labels: providedLabels,
  /**
   * 이의 접수. **넘기지 않으면 [이의] 버튼과 입력 창을 그리지 않는다** (PW-1053) — 호출부가
   * 서버 판정(완료된 사이클이면 이의 불가)을 보고 넘길지 정한다.
   */
  onAppeal,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);
  const [openId, setOpenId] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

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

  // PW-486 끈 사이클 — 본문 전체를 안내 카드 한 장으로 대체한다. 리다이렉트 안내도
  // 결과표도 이의 창구도 두지 않는다: 갈 워크스페이스도, 비교할 두 값도 없다.
  if (!calibrationEnabled) {
    return (
      <div className="evc-root">
        <section className="evc-card evtcal-calib-off" data-testid="evtcal-calib-off">
          <h3 className="evc-card-name">{L.calibOffTitle}</h3>
          {cycle?.name && <p className="evc-summary">{cycle.name}</p>}
          <p className="evtcal-calib-off-body">{L.calibOffBody}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="evc-root">
      {calibrationReleased && (
        <p className="evx-notice evtcal-released" data-testid="evtcal-released">
          {L.calibReleasedBanner}
        </p>
      )}
      {/* 권한 안내 — PW-1047 ⑤ 한 줄로 줄이고 나머지는 「자세히」에 접는다.
          누를 수 없던 「워크스페이스로 이동」 배지는 없앴다. 마우스를 올려야 뜨는 풍선은 휴대폰·키보드로
          못 열어서 누르는 버튼으로 편다. */}
      <section className="evc-card evtcal-redirect" data-testid="evtcal-redirect">
        <div className="evtcal-redirect-line">
          <span className="evtcal-redirect-summary">{L.redirectSummary}</span>
          <button
            type="button"
            className="evtcal-redirect-more"
            aria-expanded={detailOpen}
            aria-controls="evtcal-redirect-detail"
            onClick={() => setDetailOpen((v) => !v)}
            data-testid="evtcal-redirect-more">
            {detailOpen ? L.redirectLess : L.redirectMore}
          </button>
        </div>
        {detailOpen && (
          <div className="evtcal-redirect-detail" id="evtcal-redirect-detail" data-testid="evtcal-redirect-detail">
            <p className="evtcal-redirect-body">{L.redirectBody}</p>
            <p className="evtcal-redirect-body">{L.redirectNote}</p>
          </div>
        )}
      </section>

      {/* 내 팀 캘리브레이션 결과 · 이의(어필) */}
      <section className="evc-card" data-testid="evtcal-result">
        <div className="evtcal-result-head">
          <div>
            <h3 className="evc-card-name">{L.resultTitle}</h3>
            {cycle?.name && <p className="evc-summary">{cycle.name}</p>}
          </div>
          <StatusBadge
            className={`evc-status-badge tone-${adjustedCount ? 'warn' : 'neutral'}`}
            data-testid="evtcal-adjusted-badge">
            {fmt(L.adjustedBadge, { n: adjustedCount })}
          </StatusBadge>
        </div>

        {rows.length === 0 ? (
          <EmptyState description={L.empty} data-testid="evtcal-empty" />
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
                    <span className="evtcal-avatar" style={{ position: 'relative' }}>
                      <span aria-hidden="true">{initials(r.name)}</span>
                      <AvatarPhoto photo={r.avatar} name={r.name} />
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
                        <StatusBadge
                          className={`evs-cw-badge tone-${gradeTone(r.managerGradeKey, orderedGrades)}`}>
                          {labelOf(r.managerGradeKey)}
                        </StatusBadge>
                      </div>
                      <span
                        className={`evtcal-arrow${r.changed ? ' is-changed' : ''}`}
                        aria-hidden="true"
                      >
                        →
                      </span>
                      <div className="evtcal-flow-col">
                        <span className="evtcal-flow-cap">{L.colCommittee}</span>
                        <StatusBadge
                          className={`evs-cw-badge tone-${gradeTone(r.committeeGradeKey, orderedGrades)}`}>
                          {labelOf(r.committeeGradeKey)}
                        </StatusBadge>
                      </div>
                      {r.changed ? (
                        statusBadge || !onAppeal ? (
                          statusBadge && <StatusBadge
                            className={`evc-status-badge ${statusBadge.cls}`}
                            data-testid="evtcal-appeal-status">
                            {statusBadge.txt}
                          </StatusBadge>
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
                  {r.changed && isOpen && !appeal && onAppeal && (
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
