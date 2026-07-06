import { useState, useMemo } from 'react';

/**
 * EvalCycleSummaryCanvas — HR 종합 리포트.
 * 탭: 전사 요약 / 부서별 / 통합 요약. + 리포트 검수(생성)·발송.
 */

const DEFAULT_LABELS = {
  title: '종합 리포트',
  tabOverview: '전사 요약',
  tabDept: '부서별',
  tabIntegrated: '통합 요약',
  statParticipants: '평가 대상',
  statSelfSubmitted: '셀프 제출',
  statGraded: '등급 확정',
  unit: '명',
  // §4.A Tab A KPI
  kpiTotal: '총 평가 대상',
  kpiSubmitRate: '제출 완료율',
  kpiExcellent: '탁월 비율',
  kpiAvgGrade: '평균 등급',
  guideWord: '가이드',
  scoreWord: '스코어',
  guidelineLabel: '가이드라인',
  prevCompareTitle: '이전 사이클 비교',
  prevColGrade: '등급',
  prevColThis: '이번',
  prevColPrev: '이전',
  prevColDelta: '변화',
  prevEmpty: '이전 사이클 데이터가 없습니다',
  // §4.A 리더별 제출 현황
  leaderTitle: '리더별 제출 현황',
  leaderColLeader: '리더',
  leaderColDept: '부서',
  leaderColDone: '완료',
  leaderColIncomplete: '미완료',
  leaderColDelayed: '지연',
  leaderColProgress: '진행률',
  leaderEmpty: '리더 데이터가 없습니다',
  // §4.A 미제출자 리마인드
  submitAllDone: '전원 제출 완료',
  submitPending: '미제출 {n}명 · 클릭 → 리마인드',
  remindTitle: '미제출자 리마인드',
  remindSubtitle: '제출 완료율 {pct}% · 미제출 {n}명',
  remindSelectAll: '전체 선택',
  remindSelectedOf: '선택 {sel}명 / 대상 {total}명',
  remindLeaderDept: '{dept}',
  remindPending: '미제출: {type}',
  remindDue: '마감 {date}',
  remindLast: '최근 리마인드 {date}',
  remindNone: '없음',
  remindSent: '발송됨 ✓',
  remindReSendWarn: '재발송 주의',
  remindReSendTip: '최근 24시간 내 발송 이력',
  remindToast: '리마인드를 발송했습니다 ({n}명)',
  remindGuardNote: '동일 대상 24시간 내 재발송 시 확인 안내',
  remindClose: '닫기',
  remindSend: '선택 {n}명에게 리마인드 발송',
  pendingSelf: '셀프 리뷰',
  pendingPeer: '동료 리뷰',
  pendingManager: '하향 평가',
  distributionTitle: '등급 분포',
  empty: '아직 집계할 데이터가 없습니다.',
  deptTitle: '부서별 등급 확정',
  deptEmpty: '부서 데이터가 없습니다.',
  integratedTitle: '구성원 통합 요약',
  colMember: '구성원',
  colGrade: '등급',
  colSelf: '셀프',
  colLeader: '하향',
  // report control
  reportNotGenerated: '리포트 미생성',
  reportGenerated: '검수 대기',
  reportPublished: '발송 완료',
  generate: '리포트 생성',
  publish: '발송',
  yes: '✓',
  no: '·',
};

function isObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}
function fmt(str, vars) {
  return String(str).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m));
}
function fmtDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
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

export default function EvalCycleSummaryCanvas({
  cycle,
  totalParticipants = 0,
  selfSubmittedCount = 0,
  gradedCount = 0,
  gradeDistribution = [],
  excellentCount = 0,
  excellentPct = 0,
  excellentGuidelinePct = null,
  avgGradeScore = 0,
  avgGradeLabel = null,
  maxGradeScore = 0,
  previousCycle = null,
  nonSubmitters = [],
  leaderStats = [],
  deptBreakdown = [],
  integrated = [],
  report = null,
  gradeLabels = {},
  labels: providedLabels,
  onGenerate,
  onPublish,
  onSendReminders,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);
  const [tab, setTab] = useState('overview');
  const maxCount = Math.max(1, ...gradeDistribution.map((d) => d.count));
  const maxDept = Math.max(1, ...deptBreakdown.map((d) => d.count));
  const submitPct = totalParticipants > 0 ? Math.round((100 * selfSubmittedCount) / totalParticipants) : 0;
  const prevPctByKey = new Map((previousCycle?.gradeDistribution ?? []).map((d) => [d.gradeKey, d.pct]));

  // §4.A 미제출자 리마인드 모달
  const pendingCount = nonSubmitters.length;
  const [showRemind, setShowRemind] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [sent, setSent] = useState(() => new Set());
  const [remindBusy, setRemindBusy] = useState(false);
  const [remindToast, setRemindToast] = useState(0);
  // 모달 오픈 시각(재발송 가드 기준) — 이벤트 핸들러에서 캡처(렌더 중 Date.now 회피).
  const [remindOpenedAt, setRemindOpenedAt] = useState(0);
  const pendingTypeLabel = (t) =>
    t === 'peer' ? L.pendingPeer : t === 'manager' ? L.pendingManager : L.pendingSelf;
  const recentlyReminded = (iso) =>
    iso && remindOpenedAt ? remindOpenedAt - new Date(iso).getTime() < 24 * 3600 * 1000 : false;

  const openRemind = () => {
    if (pendingCount === 0) return;
    setRemindOpenedAt(Date.now());
    setSelected(new Set(nonSubmitters.filter((n) => !sent.has(n.memberId)).map((n) => n.memberId)));
    setShowRemind(true);
  };
  const toggleOne = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const selectableIds = nonSubmitters.filter((n) => !sent.has(n.memberId)).map((n) => n.memberId);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(selectableIds));
  const handleSend = async () => {
    const ids = [...selected];
    if (ids.length === 0 || !onSendReminders) return;
    setRemindBusy(true);
    try {
      await onSendReminders(ids);
      setSent((prev) => new Set([...prev, ...ids]));
      setSelected(new Set());
      setRemindToast(ids.length);
    } finally {
      setRemindBusy(false);
    }
  };

  const reportState = !report
    ? 'notGenerated'
    : report.isPublished
      ? 'published'
      : 'generated';
  const reportBadge =
    reportState === 'published'
      ? L.reportPublished
      : reportState === 'generated'
        ? L.reportGenerated
        : L.reportNotGenerated;

  const tabs = [
    { key: 'overview', label: L.tabOverview },
    { key: 'dept', label: L.tabDept },
    { key: 'integrated', label: L.tabIntegrated },
  ];

  return (
    <div className="evc-root">
      <header className="evc-header">
        <div>
          <h1 className="evc-title">{L.title}</h1>
          {cycle?.name && <p className="evc-summary">{cycle.name}</p>}
        </div>
        <div className="evmon-controls">
          <span
            className={`evc-status-badge tone-${reportState === 'published' ? 'success' : reportState === 'generated' ? 'info' : 'neutral'}`}
            data-testid="evsum-report-state"
          >
            {reportBadge}
          </span>
          {reportState === 'notGenerated' && onGenerate && (
            <button type="button" className="evc-btn is-ghost" onClick={() => onGenerate()} data-testid="evsum-generate">
              {L.generate}
            </button>
          )}
          {reportState === 'generated' && onPublish && (
            <button type="button" className="evc-btn is-primary" onClick={() => onPublish()} data-testid="evsum-publish">
              {L.publish}
            </button>
          )}
        </div>
      </header>

      <div className="fb-tabs">
        {tabs.map((tt) => (
          <button
            type="button"
            key={tt.key}
            className={`fb-tab${tab === tt.key ? ' is-on' : ''}`}
            onClick={() => setTab(tt.key)}
            data-testid={`evsum-tab-${tt.key}`}
          >
            {tt.label}
          </button>
        ))}
      </div>

      <div className="evc-list">
        {tab === 'overview' && (
          <>
            {/* §4.A KPI 4종 */}
            <div className="evs-kpis" data-testid="evs-kpis">
              <div className="evs-kpi tone-accent" data-testid="evs-kpi-total">
                <span className="evs-kpi-value">{totalParticipants}<span className="evs-kpi-unit">{L.unit}</span></span>
                <span className="evs-kpi-label">{L.kpiTotal}</span>
                {cycle?.name && <span className="evs-kpi-sub">{cycle.name}</span>}
              </div>
              <div
                className={`evs-kpi tone-green${pendingCount > 0 ? ' is-clickable' : ''}`}
                data-testid="evs-kpi-submit"
                role={pendingCount > 0 ? 'button' : undefined}
                tabIndex={pendingCount > 0 ? 0 : undefined}
                onClick={pendingCount > 0 ? openRemind : undefined}
                onKeyDown={pendingCount > 0 ? (e) => { if (e.key === 'Enter' || e.key === ' ') openRemind(); } : undefined}
              >
                <span className="evs-kpi-value">
                  {submitPct}%{pendingCount > 0 && <span className="evs-kpi-chevron"> ›</span>}
                </span>
                <span className="evs-kpi-label">{L.kpiSubmitRate}</span>
                {pendingCount > 0 ? (
                  <span className="evs-kpi-sub evs-kpi-hint">{fmt(L.submitPending, { n: pendingCount })}</span>
                ) : selfSubmittedCount >= totalParticipants && totalParticipants > 0 ? (
                  <span className="evs-kpi-sub">{L.submitAllDone}</span>
                ) : (
                  <span className="evs-kpi-sub">{selfSubmittedCount}{L.unit} / {totalParticipants}{L.unit}</span>
                )}
              </div>
              <div className="evs-kpi tone-amber" data-testid="evs-kpi-excellent">
                <span className="evs-kpi-value">{excellentPct}%</span>
                <span className="evs-kpi-label">{L.kpiExcellent}</span>
                <span className="evs-kpi-sub">
                  {excellentCount}{L.unit}
                  {excellentGuidelinePct != null && <> / {L.guideWord} {excellentGuidelinePct}%</>}
                </span>
              </div>
              <div className="evs-kpi" data-testid="evs-kpi-avg">
                <span className="evs-kpi-value evs-kpi-value-text">{avgGradeLabel ?? '—'}</span>
                <span className="evs-kpi-label">{L.kpiAvgGrade}</span>
                {maxGradeScore > 0 && (
                  <span className="evs-kpi-sub">{L.scoreWord} {avgGradeScore.toFixed(2)} / {maxGradeScore.toFixed(2)}</span>
                )}
              </div>
            </div>

            <div className="evs-two-col">
              {/* 등급 분포 + 가이드라인 점선 */}
              <section className="evc-card">
                <h3 className="evc-card-name">{L.distributionTitle}</h3>
                {gradeDistribution.length === 0 ? (
                  <p className="evc-empty-sub">{L.empty}</p>
                ) : (
                  <div className="evs-dist">
                    {gradeDistribution.map((d) => (
                      <div className="evs-dist-row" key={d.gradeKey} data-testid="evs-dist-row">
                        <span className="evs-dist-label">{d.label ?? gradeLabels[d.gradeKey] ?? d.gradeKey}</span>
                        <div className="evs-dist-body">
                          <div className="evs-dist-track">
                            <div className="evs-dist-fill" style={{ width: `${(d.count / maxCount) * 100}%` }} />
                            {d.guidelinePct != null && (
                              <div
                                className="evs-dist-guide"
                                style={{ left: `${Math.min(100, d.guidelinePct)}%` }}
                                title={`${L.guidelineLabel} ${d.guidelinePct}%`}
                                data-testid="evs-dist-guide"
                              />
                            )}
                          </div>
                          {d.guidelinePct != null && (
                            <span className="evs-dist-guide-cap">{L.guidelineLabel} {d.guidelinePct}%</span>
                          )}
                        </div>
                        <span className="evs-dist-count">{d.count}{d.pct != null && <span className="evs-dist-pct"> ({d.pct}%)</span>}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* 이전 사이클 비교 */}
              <section className="evc-card" data-testid="evs-prev-compare">
                <h3 className="evc-card-name">
                  {L.prevCompareTitle}{previousCycle?.name && <span className="evs-prev-name"> ({previousCycle.name})</span>}
                </h3>
                {!previousCycle ? (
                  <p className="evc-empty-sub">{L.prevEmpty}</p>
                ) : (
                  <div className="evmon-table evs-prev-table">
                    <div className="evmon-row evmon-head">
                      <span>{L.prevColGrade}</span>
                      <span>{L.prevColThis}</span>
                      <span>{L.prevColPrev}</span>
                      <span>{L.prevColDelta}</span>
                    </div>
                    {gradeDistribution.map((d) => {
                      const prev = prevPctByKey.get(d.gradeKey);
                      const delta = prev == null ? null : d.pct - prev;
                      return (
                        <div className="evs-prev-row" role="row" key={d.gradeKey} data-testid="evs-prev-row">
                          <span>{d.label ?? d.gradeKey}</span>
                          <span className="evs-prev-num">{d.pct}%</span>
                          <span className="evs-prev-num is-muted">{prev == null ? '—' : `${prev}%`}</span>
                          <span className={`evs-prev-delta${delta == null || delta === 0 ? '' : delta > 0 ? ' is-up' : ' is-down'}`}>
                            {delta == null ? '—' : delta === 0 ? '—' : delta > 0 ? `▲ +${delta}%p` : `▼ ${delta}%p`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            {/* §4.A 리더별 제출 현황 */}
            <section className="evc-card" data-testid="evs-leaders">
              <h3 className="evc-card-name">{L.leaderTitle}</h3>
              {leaderStats.length === 0 ? (
                <p className="evc-empty-sub">{L.leaderEmpty}</p>
              ) : (
                <div className="evs-leader-table">
                  <div className="evs-leader-row evs-leader-head">
                    <span>{L.leaderColLeader}</span>
                    <span>{L.leaderColDept}</span>
                    <span className="evs-leader-num">{L.leaderColDone}</span>
                    <span className="evs-leader-num">{L.leaderColIncomplete}</span>
                    <span className="evs-leader-num">{L.leaderColDelayed}</span>
                    <span>{L.leaderColProgress}</span>
                  </div>
                  {leaderStats.map((s) => {
                    const incomplete = s.total - s.done;
                    const pct = s.total > 0 ? Math.round((100 * s.done) / s.total) : 0;
                    return (
                      <div className="evs-leader-row" role="row" key={s.leaderId} data-testid="evs-leader-row">
                        <span className="evs-leader-lead">
                          <span className="evs-leader-avatar">{(s.name || '?').slice(0, 1)}</span>
                          <span className="evs-leader-name">{s.name || s.leaderId}</span>
                        </span>
                        <span className="evs-leader-dept">{s.dept}</span>
                        <span className="evs-leader-num evs-leader-done">{s.done}{L.unit}</span>
                        <span className={`evs-leader-num${incomplete > 0 ? ' evs-leader-bad' : ' is-muted'}`}>{incomplete}{L.unit}</span>
                        <span className="evs-leader-num">
                          {s.delayed > 0 ? (
                            <span className="evs-leader-delay">{s.delayed}{L.unit}</span>
                          ) : (
                            <span className="is-muted">—</span>
                          )}
                        </span>
                        <span className="evs-leader-prog">
                          <span className="evs-dist-track evs-leader-track">
                            <span className={`evs-dist-fill${pct >= 100 ? ' is-full' : ''}`} style={{ width: `${pct}%` }} />
                          </span>
                          <span className={`evs-leader-pct${pct >= 100 ? ' is-full' : ''}`}>{pct}%</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

        {tab === 'dept' && (
          <section className="evc-card">
            <h3 className="evc-card-name">{L.deptTitle}</h3>
            {deptBreakdown.length === 0 ? (
              <p className="evc-empty-sub">{L.deptEmpty}</p>
            ) : (
              <div className="evs-dist">
                {deptBreakdown.map((d) => (
                  <div className="evs-dist-row" key={d.dept} data-testid="evsum-dept-row">
                    <span className="evs-dist-label">{d.dept}</span>
                    <div className="evs-dist-track">
                      <div className="evs-dist-fill" style={{ width: `${(d.count / maxDept) * 100}%` }} />
                    </div>
                    <span className="evs-dist-count">{d.graded}/{d.count}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === 'integrated' && (
          <section className="evc-card">
            <h3 className="evc-card-name">{L.integratedTitle}</h3>
            <div className="evmon-table">
              <div className="evmon-row evmon-head">
                <span className="evmon-c-name">{L.colMember}</span>
                <span>{L.colGrade}</span>
                <span>{L.colSelf}</span>
                <span>{L.colLeader}</span>
              </div>
              {integrated.map((m) => (
                <div className="evsum-irow" role="row" key={m.memberId} data-testid="evsum-integrated-row">
                  <span className="evmon-c-name">{m.name || m.memberId}</span>
                  <span>{m.gradeKey ? (gradeLabels[m.gradeKey] ?? m.gradeKey) : '—'}</span>
                  <span className={m.selfSubmitted ? 'evmon-check is-on' : 'evmon-check'}>{m.selfSubmitted ? L.yes : L.no}</span>
                  <span className={m.leaderSubmitted ? 'evmon-check is-on' : 'evmon-check'}>{m.leaderSubmitted ? L.yes : L.no}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* §4.A 미제출자 리마인드 모달 */}
      {showRemind && (
        <div className="evs-remind-overlay" data-testid="evs-remind-modal" onClick={() => setShowRemind(false)}>
          <div className="evs-remind" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="evs-remind-head">
              <div>
                <div className="evs-remind-title">{L.remindTitle}</div>
                <div className="evs-remind-sub">
                  {fmt(L.remindSubtitle, { pct: submitPct, n: pendingCount })}
                  {cycle?.name && <> · {cycle.name}</>}
                </div>
              </div>
              <button type="button" className="evs-remind-x" onClick={() => setShowRemind(false)} data-testid="evs-remind-close">×</button>
            </div>

            <label className="evs-remind-selectall">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} data-testid="evs-remind-selectall" />
              <span>{L.remindSelectAll}</span>
              <span className="evs-remind-counter">{fmt(L.remindSelectedOf, { sel: selected.size, total: selectableIds.length })}</span>
            </label>

            <div className="evs-remind-list">
              {nonSubmitters.map((n) => {
                const isSent = sent.has(n.memberId);
                const warn = recentlyReminded(n.lastRemindedAt);
                return (
                  <div className={`evs-remind-row${isSent ? ' is-sent' : ''}`} key={n.memberId} data-testid="evs-remind-row">
                    <input
                      type="checkbox"
                      checked={selected.has(n.memberId)}
                      disabled={isSent}
                      onChange={() => toggleOne(n.memberId)}
                      data-testid={`evs-remind-check-${n.memberId}`}
                    />
                    <span className="evs-remind-avatar" style={{ background: n.color || 'var(--utility-blue-500)' }}>
                      {(n.name || '?').slice(0, 1)}
                    </span>
                    <div className="evs-remind-info">
                      <div className="evs-remind-name">{n.name || n.memberId}</div>
                      <div className="evs-remind-meta">
                        {fmt(L.remindLeaderDept, { dept: n.dept })}
                        {' · '}
                        <span className="evs-remind-pending">{fmt(L.remindPending, { type: pendingTypeLabel(n.pendingType) })}</span>
                        {n.dueDate && <> · {fmt(L.remindDue, { date: fmtDate(n.dueDate) })}</>}
                        {' · '}
                        {fmt(L.remindLast, { date: n.lastRemindedAt ? fmtDate(n.lastRemindedAt) : L.remindNone })}
                      </div>
                    </div>
                    <span className="evs-remind-status">
                      {isSent ? (
                        <span className="evs-remind-done">{L.remindSent}</span>
                      ) : warn ? (
                        <span className="evs-remind-warn" title={L.remindReSendTip}>{L.remindReSendWarn}</span>
                      ) : null}
                    </span>
                  </div>
                );
              })}
            </div>

            {remindToast > 0 && (
              <div className="evs-remind-toast" data-testid="evs-remind-toast">
                {fmt(L.remindToast, { n: remindToast })}
              </div>
            )}

            <div className="evs-remind-foot">
              <span className="evs-remind-note">{L.remindGuardNote}</span>
              <div className="evs-remind-actions">
                <button type="button" className="evc-btn is-ghost" onClick={() => setShowRemind(false)}>{L.remindClose}</button>
                <button
                  type="button"
                  className="evc-btn is-primary"
                  disabled={selected.size === 0 || remindBusy}
                  onClick={handleSend}
                  data-testid="evs-remind-send"
                >
                  {fmt(L.remindSend, { n: selected.size })}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
