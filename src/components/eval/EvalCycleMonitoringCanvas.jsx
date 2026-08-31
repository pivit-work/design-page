import { useMemo, useState } from 'react';
import { StopIcon } from './evalIcons.jsx';
import ModalShell from '../shared/ModalShell.jsx';

/**
 * EvalCycleMonitoringCanvas — HR 진행 현황 (단계 진행·완료율·멤버 상태·리마인더·비상정지).
 * 순수 표현: stages/members/completionPct + 콜백(onRemind/onEmergencyStop/onReopen).
 */

const DEFAULT_LABELS = {
  title: '진행 현황',
  completion: '전체 완료율',
  stagesTitle: '단계별 진행',
  membersTitle: '구성원 현황',
  colMember: '구성원',
  colSelf: '셀프',
  colPeer: '동료 확정',
  colLeader: '하향',
  colGrade: '등급',
  remind: '미완료자 리마인더',
  reminded: '{{count}}명에게 리마인더 발송',
  emergencyStop: '비상 정지',
  stoppedBanner: '이 사이클은 비상 정지되었습니다. 제출이 차단됩니다.',
  reopen: '재개',
  exclude: '제외',
  restore: '복원',
  excludedBadge: '제외됨',
  navTemplate: '템플릿',
  navCalibration: '캘리브레이션',
  navReport: '종합 리포트',
  navReportReview: '리포트 검수',
  // [PW-534] 단계 열의 셀 (정책 §6.2.2)
  colProgress: '진행률',
  statusPending: '미제출',
  statusInProgress: '작성 중',
  statusSubmitted: '제출 완료',
  cellCount: '제출 {{done}} / 배정 {{total}}',
  cellNone: '–',
  submittedAtTooltip: '{{at}} 제출',
  // [PW-534] 내보내기 (정책 §6.9)
  exportTitle: '내보내기',
  exportFilter: '현재 필터: {{scope}} · {{count}}명',
  exportProgress: '진행 상태 CSV',
  exportAnswers: '평가 응답 CSV',
  exportProgressHint: '구성원별 단계 진행 상태 (1행 = 구성원)',
  exportAnswersHint: '평가 응답 원문 (1행 = 답변)',
  exportNoTarget: '내보낼 대상이 없습니다',
  exportNote:
    '평가 응답은 사유 입력이 필요하며, 익명 항목의 작성자 정보는 포함되지 않습니다.',
  exportModalTitleProgress: '진행 상태 CSV 내보내기',
  exportModalTitleAnswers: '평가 응답 CSV 내보내기',
  exportModalBodyProgress: '현재 화면에 보이는 {{count}}명의 단계별 진행 상태를 내려받습니다.',
  exportModalBodyAnswers:
    '평가 응답 원문을 내려받습니다. 익명 항목의 작성자 정보는 포함되지 않습니다. 사유를 입력해 주세요.',
  exportReasonLabel: '반출 사유',
  exportReasonPlaceholder: '예) 2026 상반기 평가 이력 보관 — 인사팀 아카이브',
  exportReasonRequired: '사유를 입력해 주세요 (200자 이내).',
  exportCancel: '취소',
  exportConfirm: '내려받기',
  historyTitle: '내보내기 이력',
  historyEmpty: '아직 내보낸 적이 없습니다.',
  historyKindProgress: '진행 상태',
  historyKindAnswers: '평가 응답',
  historyRows: '{{count}}행',
  historyRowsWithExcluded: '{{count}}행 · {{excluded}}행 제외',
  historyFailed: '실패',
  done: '완료',
  notDone: '미완료',
  // stage keys
  stageSelfReview: '셀프 리뷰',
  stagePeerAssign: '동료 배정',
  stagePeerReview: '동료 리뷰',
  stageLeaderReview: '하향 리뷰',
  stageCalibration: '캘리브레이션',
  // self status
  selfNotStarted: '시작 전',
  selfInProgress: '작성 중',
  selfSubmitted: '제출',
};

const STAGE_KEY = {
  self_review: 'stageSelfReview',
  peer_assign: 'stagePeerAssign',
  peer_review: 'stagePeerReview',
  leader_review: 'stageLeaderReview',
  calibration: 'stageCalibration',
};
const SELF_KEY = {
  not_started: 'selfNotStarted',
  in_progress: 'selfInProgress',
  submitted: 'selfSubmitted',
};
// 등급 배지 색: 탁월=초록 / 충족=파랑 / 미흡=빨강.
const GRADE_TONE = {
  exceeds: 'tone-success',
  meets: 'tone-info',
  below: 'tone-error',
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

/**
 * [PW-534] 셀 상태 → 라벨 키 (정책 §6.2.2).
 *
 * 「작성 중」이 없던 동안 임시저장한 사람은 미제출과 같이 칠해졌고, 그래서
 * **이미 쓰고 있는 사람에게 리마인더가 갔다.**
 */
const PHASE_STATUS_KEY = {
  pending: 'statusPending',
  in_progress: 'statusInProgress',
  submitted: 'statusSubmitted',
};
const PHASE_STATUS_TONE = {
  pending: 'tone-neutral',
  in_progress: 'tone-info',
  submitted: 'tone-success',
};
/** 여러 건을 쓰는 단계 — 셀 하나에 상태 하나가 안 들어간다 (§6.2.2). */
const MULTI_ASSIGN = new Set(['peer', 'upward']);

/** `2026-08-30T14:22:00+09:00` → `2026-08-30 14:22`. 파일 밖 표기와 같은 모양이다. */
function fmtSubmittedAt(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * [PW-534] 구성원 × 단계 한 칸 (정책 §6.2.2).
 *
 * · 셀프·하향 → 상태 배지 1개 (대상 1건)
 * · 동료·상향 → `제출 N / 배정 M` (배정 건수만큼 쓰므로 상태 하나로 안 뭉갠다)
 * · 대상 0건 → `–`
 *
 * 제출일시는 셀 «툴팁»이다. 표에 열로 펼치면 한 사람이 한 행이라는 축이 깨진다 —
 * 건별 내역은 평가 응답 CSV(§6.9 B)에서 본다.
 */
function PhaseCell({ phase, phaseKey, L }) {
  if (!phase || phase.status == null) {
    return <span className="evmon-self">{L.cellNone}</span>;
  }
  const at = fmtSubmittedAt(phase.lastSubmittedAt);
  const title = at ? fill(L.submittedAtTooltip, { at }) : undefined;
  const badge = (
    <span
      className={`evc-status-badge ${PHASE_STATUS_TONE[phase.status] ?? 'tone-neutral'}`}
      data-testid="evmon-phase-badge"
      data-status={phase.status}
    >
      {L[PHASE_STATUS_KEY[phase.status]] ?? phase.status}
    </span>
  );
  if (!MULTI_ASSIGN.has(phaseKey)) {
    return (
      <span className="evmon-self" title={title} data-testid="evmon-phase-cell">
        {badge}
      </span>
    );
  }
  return (
    <span className="evmon-self" title={title} data-testid="evmon-phase-cell">
      {badge}{' '}
      <span data-testid="evmon-phase-count">
        {fill(L.cellCount, { done: phase.done, total: phase.total })}
      </span>
    </span>
  );
}

function Check({ ok }) {
  return (
    <span className={`evmon-check${ok ? ' is-on' : ''}`} aria-hidden="true">
      {ok ? '✓' : '·'}
    </span>
  );
}

export default function EvalCycleMonitoringCanvas({
  cycle,
  stages = [],
  completionPct = 0,
  members = [],
  status,
  gradeLabels = {},
  labels: providedLabels,
  onRemind,
  onEmergencyStop,
  onReopen,
  onExclude,
  onRestore,
  onOpenTemplate,
  onOpenCalibration,
  onOpenReport,
  onOpenReportReview,
  /**
   * [PW-534] 이 사이클에서 «열로 세울» 단계 — `[{ key, label }]` (정책 §6.2.1).
   *
   * 비어 있으면 개정 전 3종 고정 열(셀프·동료 확정·하향)로 그린다. 아직 이 값을
   * 안 주는 호출부(단독 프리뷰 등)의 시각을 바꾸지 않기 위해서다.
   */
  memberPhases = [],
  /** [PW-534] 내보내기 (정책 §6.9). 안 주면 내보내기 바·이력이 아예 안 보인다. */
  exportEnabled = false,
  exportScopeLabel = '',
  exportBusy = false,
  exportHistory = null,
  onExport,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);
  // [PW-534] 확인 모달 — null | 'progress' | 'answers'
  const [exportKind, setExportKind] = useState(null);
  const [exportReason, setExportReason] = useState('');
  const [reasonError, setReasonError] = useState(false);
  const visibleCount = members.filter((m) => !m.excluded).length;
  const canExport = exportEnabled && !exportBusy && visibleCount > 0;

  const closeExport = () => {
    setExportKind(null);
    setExportReason('');
    setReasonError(false);
  };
  const submitExport = () => {
    // 사유는 «응답» 벌만 받는다 — 매일 쓰는 명단에까지 물으면 형식적으로 채워지고,
    // 그러면 응답 벌의 사유도 같이 무의미해진다 (§6.9.4).
    const reason = exportReason.trim();
    if (exportKind === 'answers' && (!reason || reason.length > 200)) {
      setReasonError(true);
      return;
    }
    onExport?.(exportKind, exportKind === 'answers' ? reason : undefined);
    closeExport();
  };
  const stopped = status === 'emergency_stopped';
  const canStop = status && !['draft', 'done', 'emergency_stopped'].includes(status);
  const navItems = [
    onOpenTemplate && { key: 'tpl', label: L.navTemplate, on: onOpenTemplate, testid: 'evmon-nav-template' },
    onOpenCalibration && { key: 'cal', label: L.navCalibration, on: onOpenCalibration, testid: 'evmon-nav-calibration' },
    onOpenReport && { key: 'rep', label: L.navReport, on: onOpenReport, testid: 'evmon-nav-report' },
    onOpenReportReview && { key: 'rrv', label: L.navReportReview, on: onOpenReportReview, testid: 'evmon-nav-report-review' },
  ].filter(Boolean);

  return (
    <div className="evc-root">
      <header className="evc-header">
        <div>
          <h1 className="evc-title">{L.title}</h1>
          {cycle?.name && <p className="evc-summary">{cycle.name}</p>}
        </div>
        <div className="evmon-controls">
          {!stopped && onRemind && (
            <button type="button" className="evc-btn is-ghost" onClick={() => onRemind()} data-testid="evmon-remind">
              {L.remind}
            </button>
          )}
          {stopped
            ? onReopen && (
                <button type="button" className="evc-btn is-primary" onClick={() => onReopen()} data-testid="evmon-reopen">
                  {L.reopen}
                </button>
              )
            : canStop && onEmergencyStop && (
                <button type="button" className="evc-btn is-danger-ghost" onClick={() => onEmergencyStop()} data-testid="evmon-stop">
                  <StopIcon size={14} /> {L.emergencyStop}
                </button>
              )}
        </div>
      </header>

      {navItems.length > 0 && (
        <div className="fb-tabs" data-testid="evmon-nav">
          {navItems.map((n) => (
            <button type="button" key={n.key} className="fb-tab" onClick={() => n.on()} data-testid={n.testid}>
              {n.label}
            </button>
          ))}
        </div>
      )}

      {stopped && (
        <p className="evx-notice" data-testid="evmon-stopped" style={{ maxWidth: 1080, margin: '0 auto 12px', background: 'var(--utility-error-50)', color: 'var(--utility-error-500)' }}>
          {L.stoppedBanner}
        </p>
      )}

      <div className="evc-list">
        {/* 완료율 + 단계 진행 */}
        <section className="evc-card">
          <div className="evmon-completion">
            <span className="evc-field-label">{L.completion}</span>
            <span className="evmon-completion-value" data-testid="evmon-completion">{completionPct}%</span>
          </div>
          <h3 className="evc-card-name">{L.stagesTitle}</h3>
          <div className="evmon-stages">
            {stages.map((s) => {
              const pct = s.total > 0 ? Math.round((100 * s.done) / s.total) : 0;
              return (
                <div className="evmon-stage" key={s.key} data-testid="evmon-stage">
                  <span className="evmon-stage-label">{L[STAGE_KEY[s.key]] ?? s.key}</span>
                  <div className="evs-dist-track">
                    <div className="evs-dist-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="evmon-stage-count">{s.done}/{s.total}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* 멤버 현황
            [PW-534] 단계 열을 사이클 phases 기반 «동적»으로 (§6.2.1) — 3종 고정이라
            상향 리뷰를 켠 사이클에도 그 열이 없었다. `memberPhases` 가 비면 예전
            3종 고정 열로 그린다(아직 값을 안 주는 호출부의 시각을 바꾸지 않는다). */}
        {(() => {
        const dynamic = memberPhases.length > 0;
        const cols = dynamic
          ? ['2fr', ...memberPhases.map(() => '1.2fr'), '1fr', 'auto'].join(' ')
          : '2fr 1fr 1fr 1fr 1fr auto';
        return (
        <section className="evc-card">
          <h3 className="evc-card-name">{L.membersTitle}</h3>
          <div className="evmon-table" role="table">
            <div className="evmon-row evmon-head" role="row" style={{ gridTemplateColumns: cols }}>
              <span className="evmon-c-name">{L.colMember}</span>
              {dynamic ? (
                memberPhases.map((ph) => <span key={ph.key}>{ph.label}</span>)
              ) : (
                <>
                  <span>{L.colSelf}</span>
                  <span>{L.colPeer}</span>
                  <span>{L.colLeader}</span>
                </>
              )}
              <span>{L.colGrade}</span>
              <span />
            </div>
            {members.map((m) => (
              <div className="evmon-row" role="row" key={m.memberId} data-testid="evmon-member" style={{ gridTemplateColumns: cols, opacity: m.excluded ? 0.55 : 1 }}>
                <span className="evmon-c-name">
                  {m.name || m.memberId}
                  {m.excluded && (
                    <span className="evc-status-badge tone-neutral" style={{ marginLeft: 'var(--spacing-sm, 6px)' }} data-testid="evmon-excluded-badge">
                      {L.excludedBadge}
                    </span>
                  )}
                </span>
                {dynamic ? (
                  memberPhases.map((ph) => (
                    <PhaseCell
                      key={ph.key}
                      phaseKey={ph.key}
                      phase={(m.phases || []).find((x) => x.key === ph.key)}
                      L={L}
                    />
                  ))
                ) : (
                  <>
                    <span className="evmon-self">{L[SELF_KEY[m.selfStatus]] ?? m.selfStatus}</span>
                    <Check ok={m.peerConfirmed} />
                    <Check ok={m.leaderSubmitted} />
                  </>
                )}
                <span className="evmon-grade">
                  {m.gradeKey ? (
                    <span
                      className={`evc-status-badge ${GRADE_TONE[m.gradeKey] ?? 'tone-neutral'}`}
                      data-testid="evmon-grade-badge"
                    >
                      {gradeLabels?.[m.gradeKey] ?? m.gradeKey}
                    </span>
                  ) : (
                    <Check ok={m.graded} />
                  )}
                </span>
                <span>
                  {m.excluded
                    ? onRestore && (
                        <button type="button" className="evc-btn is-ghost" onClick={() => onRestore(m.memberId)} data-testid="evmon-restore">
                          {L.restore}
                        </button>
                      )
                    : onExclude && (
                        <button type="button" className="evc-btn is-ghost" onClick={() => onExclude(m.memberId)} data-testid="evmon-exclude">
                          {L.exclude}
                        </button>
                      )}
                </span>
              </div>
            ))}
          </div>
        </section>
        );
        })()}

        {/* ── [PW-534] 내보내기 바 (정책 §6.9) ─────────────────────────────
            두 벌로 나눈다 — A 진행 상태(1행 = 구성원) · B 평가 응답(1행 = 답변).
            축이 달라 합치지 않는다: 합치면 사람 정보가 답변 수만큼 복제돼 A의
            용도(명단·독촉)가 깨진다(§6.9.1).

            「현재 필터」를 «항상» 표기한다 — 보이는 것과 받는 것이 다르면 그 파일은
            신뢰를 잃는다(§6.9.2). */}
        {exportEnabled && (
          <section className="evc-card" data-testid="evmon-export">
            <h3 className="evc-card-name">{L.exportTitle}</h3>
            <p className="evc-empty-sub" data-testid="evmon-export-filter">
              {fill(L.exportFilter, {
                scope: exportScopeLabel,
                count: visibleCount,
              })}
            </p>
            <div className="evmon-controls">
              <button
                type="button"
                className="evc-btn is-ghost"
                disabled={!canExport}
                title={canExport ? L.exportProgressHint : L.exportNoTarget}
                onClick={() => setExportKind('progress')}
                data-testid="evmon-export-progress"
              >
                {L.exportProgress}
              </button>
              <button
                type="button"
                className="evc-btn is-ghost"
                disabled={!canExport}
                title={canExport ? L.exportAnswersHint : L.exportNoTarget}
                onClick={() => setExportKind('answers')}
                data-testid="evmon-export-answers"
              >
                {L.exportAnswers}
              </button>
            </div>
            <p className="evc-empty-sub">{L.exportNote}</p>
          </section>
        )}

        {/* [PW-534] 내보내기 이력 (§6.9.4) — 기록만 남기고 아무도 볼 수 없으면
            그 기록은 사고가 났을 때 되짚을 수 없다. 남기는 것과 보이는 것은 한 벌이다. */}
        {exportEnabled && exportHistory && (
          <section className="evc-card" data-testid="evmon-export-history">
            <h3 className="evc-card-name">{L.historyTitle}</h3>
            {exportHistory.length === 0 ? (
              <p className="evc-empty-sub">{L.historyEmpty}</p>
            ) : (
              <div className="evmon-table" role="table">
                {exportHistory.map((h) => (
                  <div
                    className="evmon-row"
                    role="row"
                    key={h.id}
                    data-testid="evmon-export-history-row"
                    style={{ gridTemplateColumns: '1.4fr 1.6fr 1fr 1.4fr' }}
                  >
                    <span className="evmon-c-name">{h.actorName}</span>
                    <span className="evmon-self">
                      {fmtSubmittedAt(h.createdAt)}
                    </span>
                    <span className="evmon-self">
                      {h.exportKind === 'answers'
                        ? L.historyKindAnswers
                        : L.historyKindProgress}
                    </span>
                    <span className="evmon-self">
                      {h.status === 'failed'
                        ? L.historyFailed
                        : h.excludedCount > 0
                          ? fill(L.historyRowsWithExcluded, {
                              count: h.rowCount,
                              excluded: h.excludedCount,
                            })
                          : fill(L.historyRows, { count: h.rowCount })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* [PW-534] 확인 모달 (§6.9.4) — 응답 벌만 사유를 받는다. */}
      {exportKind && (
        <ModalShell
          title={
            exportKind === 'answers'
              ? L.exportModalTitleAnswers
              : L.exportModalTitleProgress
          }
          description={
            exportKind === 'answers'
              ? L.exportModalBodyAnswers
              : fill(L.exportModalBodyProgress, { count: visibleCount })
          }
          titleId="evmon-export-modal-title"
          submitLabel={L.exportConfirm}
          cancelLabel={L.exportCancel}
          closeLabel={L.exportCancel}
          canSubmit
          onClose={closeExport}
          onSubmit={submitExport}
          className="evmon-export-modal"
        >
          {/* 필드·에러 표기는 일정 수정 모달과 같은 클래스를 쓴다 — 새 클래스를
              지으면 같은 모양이 두 벌이 된다. */}
          {exportKind === 'answers' && (
            <label
              className="evc-sched-modal-field"
              data-testid="evmon-export-reason-field"
            >
              <span className="evc-field-label">{L.exportReasonLabel}</span>
              <textarea
                className={`evc-input${reasonError ? ' is-invalid' : ''}`}
                rows={3}
                maxLength={200}
                value={exportReason}
                placeholder={L.exportReasonPlaceholder}
                onChange={(e) => {
                  setExportReason(e.target.value);
                  setReasonError(false);
                }}
                data-testid="evmon-export-reason"
              />
              {reasonError && (
                <span
                  className="evc-tpl-confirm-error"
                  role="alert"
                  data-testid="evmon-export-reason-error"
                >
                  {L.exportReasonRequired}
                </span>
              )}
            </label>
          )}
        </ModalShell>
      )}
    </div>
  );
}
