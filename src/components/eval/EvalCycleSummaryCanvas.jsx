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
  deptBreakdown = [],
  integrated = [],
  report = null,
  gradeLabels = {},
  labels: providedLabels,
  onGenerate,
  onPublish,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);
  const [tab, setTab] = useState('overview');
  const maxCount = Math.max(1, ...gradeDistribution.map((d) => d.count));
  const maxDept = Math.max(1, ...deptBreakdown.map((d) => d.count));
  const submitPct = totalParticipants > 0 ? Math.round((100 * selfSubmittedCount) / totalParticipants) : 0;
  const prevPctByKey = new Map((previousCycle?.gradeDistribution ?? []).map((d) => [d.gradeKey, d.pct]));

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
              <div className="evs-kpi tone-green" data-testid="evs-kpi-submit">
                <span className="evs-kpi-value">{submitPct}%</span>
                <span className="evs-kpi-label">{L.kpiSubmitRate}</span>
                <span className="evs-kpi-sub">{selfSubmittedCount}{L.unit} / {totalParticipants}{L.unit}</span>
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
    </div>
  );
}
