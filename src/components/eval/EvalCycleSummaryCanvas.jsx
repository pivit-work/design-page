import { useState, useMemo, Fragment } from 'react';

/**
 * EvalCycleSummaryCanvas — HR 종합 리포트.
 * 탭: 전사 요약 / 부서별 / 통합 요약. + 리포트 검수(생성)·발송.
 */

const DEFAULT_LABELS = {
  title: '종합 리포트',
  tabOverview: '전사 요약',
  tabDept: '부서별 분석',
  tabIntegrated: '피평가자 통합 요약',
  tabLeaderPattern: '리더별 평가 패턴',
  tabCalib: '캘리브레이션 결과',
  tabExec: '경영진 대시보드',
  // §9.F 경영진 대시보드
  execBanner: '접근: HR Admin(전체) · 조직장·위원회(집계 조회) — CSV 다운로드는 HR Admin만 가능',
  execJ1: 'J1 전사 서머리',
  execJ2: 'J2 리더 평가 패턴',
  execJ3: 'J3 9블록 + 승진 요청',
  execJ1Title: 'J1 — 전사 서머리 (등급분포·역량/업적·부서별)',
  j1DistTitle: '전사 등급 분포',
  j1RatioTitle: '역량 / 업적 비율 분석',
  j1CompLabel: '역량(How) 평균',
  j1WorkLabel: '업적(What) 평균',
  j1RatioNote: '역량/업적 평균 점수는 하향평가(매니저) 답변 기준입니다.',
  j1DeptTitle: '부서별 상세',
  j1ColComp: '역량 평균',
  j1ColWork: '업적 평균',
  j1ColAchieve: 'OKR 달성률',
  j1NoScore: '—',
  execJ2Title: 'J2 — 리더별 관대/엄격 평가 패턴 지표',
  execJ3Title: 'J3 — 승진/보상 9블록 매트릭스 + 승진 요청 페이지',
  nbConfidential: '이 화면은 캘리브레이션 위원회 · HR만 열람 가능합니다. 매니저·구성원 비공개.',
  nbTitle: '승진 × 보상 9블록 (이름 표출)',
  nbXUrgent: '시급한 보상',
  nbXModerate: '어느 정도 필요',
  nbXMaintain: '현 수준 유지',
  nbYRecommended: '승진 추천',
  nbYNotYet: '아직 아님',
  nbYDeferred: '판단 유보',
  nbCaption: 'X축: 보상 조정 필요 수준 | Y축: 승진 고려 여부',
  nbEmpty: '승진·보상 평가 데이터가 아직 제출되지 않았습니다',
  prTitle: '승진 요청 목록',
  prEmpty: '제출된 승진 요청이 없습니다.',
  // §7.D 캘리브레이션 결과
  cdAdjusted: '조정된 인원',
  cdUpward: '상향 조정',
  cdDownward: '하향 조정',
  cdOfTotal: '전체 {total}명 중 {pct}%',
  cdUpwardSub: '등급 올라간 인원',
  cdDownwardSub: '등급 내려간 인원',
  cdDistTitle: '조정 전후 등급 분포 비교',
  cdBefore: '조정 전',
  cdAfter: '조정 후',
  cdDetailTitle: '등급 조정 상세 (개별)',
  cdEmpty: '이번 사이클에서 등급 조정이 없었습니다',
  cdSummaryLine: '이번 사이클 조정 {n}명',
  cdSummaryDelta: ' (상향 {u} · 하향 {d})',
  cdDelegateNote: '구성원별 등급 변경·변경 사유·변경 로그는 캘리브레이션 워크스페이스(탭 G)에서 실명·이력 원본으로 확인합니다. 본 탭은 전사 분포·통계 관점만 제공합니다.',
  cdOpenWorkspace: '캘리브레이션 워크스페이스 열기 →',
  cdGuideExceed: '가이드라인 초과',
  // §5.B 부서별 분석
  deptHeatTitle: '부서별 등급 분포 히트맵',
  deptRankTitle: '부서별 평균 달성률 랭킹',
  deptDetailTitle: '부서별 상세 현황',
  deptOutlierTitle: '이상치 경고 — 캘리브레이션 재검토 권장',
  deptColDept: '부서',
  deptColCount: '인원',
  deptColAvgAchieve: '평균 달성률',
  deptColVsGuide: '탁월 비율 vs 가이드',
  deptLegendLow: '낮음',
  deptLegendHigh: '높음',
  deptRankCaption: '평균 달성률 = 소속 멤버 OKR 달성률 평균',
  deptDataEmpty: '부서 데이터가 없습니다',
  // §6.C 리더별 평가 패턴
  lpBannerLenient: '관대화 경향',
  lpBannerStrict: '엄격화 경향',
  lpBannerBalanced: '균형',
  lpDistTitle: '리더별 등급 분포 비교',
  lpCalibTitle: '캘리브레이션 전후 등급 변화',
  lpColLeader: '리더',
  lpColDept: '부서',
  lpColTendency: '관대/엄격 경향',
  lpColAdjusted: '조정된 인원',
  lpEmpty: '팀을 담당하는 리더 데이터가 없습니다',
  lpCalibEmpty: '이번 사이클에서 등급 조정이 없었습니다',
  lpMajorityWarn: '과반수 리더가 관대화 경향입니다. 캘리브레이션 재검토 권장.',
  lpTagLenient: '관대화 경향',
  lpTagStrict: '엄격화 경향',
  lpTagBalanced: '균형',
  lpTagNa: '-',
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
  // §8 피평가자 통합 요약 (2열)
  reListTitle: '피평가자 목록',
  reAccessNote: '접근: 조직장(1차 검수) · HR · 위원회',
  reEmptyList: '이 사이클에 해당하는 구성원이 없습니다.',
  reSelectPrompt: '왼쪽 목록에서 피평가자를 선택하세요.',
  reNoData: '이 구성원의 통합 리뷰 요약 데이터가 아직 준비되지 않았습니다.',
  reFinalGrade: '최종 등급',
  reAdjustedBadge: '캘리브레이션 조정됨',
  reSelfTitle: '셀프 리뷰 요약',
  rePeerTitle: '동료 리뷰 요약',
  reManagerTitle: '매니저 평가 요약',
  reCalibTitle: '캘리브레이션 결과',
  reManagerGrade: '매니저 부여 등급',
  reSelfEmpty: '아직 셀프 리뷰가 제출되지 않았습니다.',
  rePeerEmpty: '아직 동료 리뷰가 충분히 수집되지 않았습니다 ({n}건).',
  reManagerEmpty: '매니저 평가가 아직 제출되지 않았습니다.',
  reCalibEmpty: '캘리브레이션 진행 전입니다.',
  reCalibAdjusted: '조정 있음',
  reCalibOriginal: '원안 확정',
  reLoading: '불러오는 중…',
  reScore: '점수',
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
  leaderPatterns = [],
  deptStats = [],
  deptOutliers = [],
  calibResult = null,
  nineBox = null,
  execSummary = null,
  integrated = [],
  selectedMemberId = null,
  memberDetail = null,
  memberDetailLoading = false,
  report = null,
  gradeLabels = {},
  labels: providedLabels,
  onGenerate,
  onPublish,
  onSendReminders,
  onOpenWorkspace,
  onSelectMember,
  onNineBoxNameClick,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);
  const [tab, setTab] = useState('overview');
  const [execSection, setExecSection] = useState('j1');
  const maxCount = Math.max(1, ...gradeDistribution.map((d) => d.count));
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
    { key: 'leaderPattern', label: L.tabLeaderPattern },
    { key: 'calib', label: L.tabCalib },
    { key: 'exec', label: L.tabExec },
    { key: 'integrated', label: L.tabIntegrated },
  ];

  // §6.C 경향 배너 버킷 + 색.
  const tendencyMeta = {
    lenient: { label: L.lpBannerLenient, tone: 'amber' },
    strict: { label: L.lpBannerStrict, tone: 'red' },
    balanced: { label: L.lpBannerBalanced, tone: 'green' },
  };
  const patternBuckets = ['lenient', 'strict', 'balanced'].map((key) => ({
    key,
    ...tendencyMeta[key],
    leaders: leaderPatterns.filter((p) => p.tendency === key),
  }));
  const lenientMajority =
    leaderPatterns.length > 0 &&
    patternBuckets[0].leaders.length > leaderPatterns.length / 2;
  const tagOf = (t) =>
    t === 'lenient' ? L.lpTagLenient : t === 'strict' ? L.lpTagStrict : t === 'balanced' ? L.lpTagBalanced : L.lpTagNa;

  // §5.B 부서별 — 달성률 내림차순 랭킹 + 히트맵 셀 명도.
  const rankedDepts = [...deptStats].sort((a, b) => b.avgAchieve - a.avgAchieve);
  const heatAlpha = (pct) => (pct <= 0 ? 0 : Math.min(0.15 + (pct / 100) * 0.65, 0.8));
  const segClass = (i, n) => (i === 0 ? 'seg-top' : i === n - 1 ? 'seg-bottom' : 'seg-mid');
  const vsGuideTone = (delta) => (delta > 10 ? 'red' : delta > 0 ? 'amber' : 'green');

  // §8 피평가자 목록 — 부서 그룹핑 + 이름 가나다.
  const revieweeGroups = (() => {
    const byDept = new Map();
    for (const m of integrated) {
      const d = m.dept || '미지정';
      if (!byDept.has(d)) byDept.set(d, []);
      byDept.get(d).push(m);
    }
    return [...byDept.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], 'ko'))
      .map(([dept, members]) => ({
        dept,
        members: members.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko')),
      }));
  })();
  const gradeSeg = (label) => {
    const idx = gradeDistribution.findIndex((d) => (d.label ?? d.gradeKey) === label);
    if (idx < 0) return 'seg-mid';
    return idx === 0 ? 'seg-top' : idx === gradeDistribution.length - 1 ? 'seg-bottom' : 'seg-mid';
  };

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
          deptStats.length === 0 ? (
            <section className="evc-card"><p className="evc-empty-sub" data-testid="evs-dept-empty">{L.deptDataEmpty}</p></section>
          ) : (
            <>
              {/* Block 1 — 이상치 경고 배너 */}
              {deptOutliers.length > 0 && (
                <div className="evs-dept-outlier" data-testid="evs-dept-outlier">
                  <div className="evs-dept-outlier-title">⚠ {L.deptOutlierTitle}</div>
                  {deptOutliers.map((o, i) => (
                    <div className="evs-dept-outlier-row" key={i}>
                      {o.dept} — {o.grade} 비율 {o.actual}% (가이드 {o.guide}% 대비 <span className="evs-dept-outlier-delta">+{o.delta}%p</span>)
                    </div>
                  ))}
                </div>
              )}

              {/* Block 2 — 히트맵 + 달성률 랭킹 */}
              <div className="evs-two-col">
                <section className="evc-card">
                  <h3 className="evc-card-name">{L.deptHeatTitle}</h3>
                  <div className="evs-heat">
                    <div className="evs-heat-row evs-heat-head" style={{ gridTemplateColumns: `1.4fr repeat(${(deptStats[0]?.gradeCounts.length || 3)}, 1fr) auto` }}>
                      <span>{L.deptColDept}</span>
                      {deptStats[0]?.gradeCounts.map((g, i) => (
                        <span key={g.gradeKey} className={`evs-heat-gh ${segClass(i, deptStats[0].gradeCounts.length)}`}>{g.label}</span>
                      ))}
                      <span className="evs-heat-num">{L.deptColCount}</span>
                    </div>
                    {deptStats.map((d) => (
                      <div className="evs-heat-row" key={d.dept} data-testid="evs-heat-row" style={{ gridTemplateColumns: `1.4fr repeat(${d.gradeCounts.length}, 1fr) auto` }}>
                        <span className="evs-heat-dept">{d.dept}</span>
                        {d.gradeCounts.map((g, i) => (
                          <span className={`evs-heat-cell ${segClass(i, d.gradeCounts.length)}`} key={g.gradeKey} style={{ '--heat': heatAlpha(g.pct) }}>
                            <span className="evs-heat-cnt">{g.count}</span>
                            <span className="evs-heat-pct">{g.pct}%</span>
                          </span>
                        ))}
                        <span className="evs-heat-num">{d.total}{L.unit}</span>
                      </div>
                    ))}
                    <div className="evs-heat-legend">
                      <span>{L.deptLegendLow}</span>
                      {[0.15, 0.3, 0.5, 0.7, 0.85].map((a) => (
                        <span className="evs-heat-swatch" key={a} style={{ '--heat': a }} />
                      ))}
                      <span>{L.deptLegendHigh}</span>
                    </div>
                  </div>
                </section>

                <section className="evc-card">
                  <h3 className="evc-card-name">{L.deptRankTitle}</h3>
                  <div className="evs-rank">
                    {rankedDepts.map((d, i) => (
                      <div className="evs-rank-row" key={d.dept} data-testid="evs-rank-row">
                        <span className={`evs-rank-num${i === 0 ? ' is-first' : ''}`}>{i + 1}</span>
                        <span className="evs-rank-dept">{d.dept}</span>
                        <div className="evs-rank-bar">
                          <span className={`evs-rank-fill${i === 0 ? ' is-first' : ''}`} style={{ width: `${d.avgAchieve}%` }} />
                        </div>
                        <span className="evs-rank-val">{d.avgAchieve}%</span>
                      </div>
                    ))}
                  </div>
                  <p className="evs-dist-guide-cap evs-rank-cap">{L.deptRankCaption}</p>
                </section>
              </div>

              {/* Block 3 — 부서별 상세 현황 */}
              <section className="evc-card" data-testid="evs-dept-detail">
                <h3 className="evc-card-name">{L.deptDetailTitle}</h3>
                <div className="evs-leader-table">
                  <div className="evs-leader-row evs-dept-drow evs-leader-head" style={{ '--gcols': deptStats[0]?.gradeCounts.length || 3 }}>
                    <span>{L.deptColDept}</span>
                    <span className="evs-leader-num">{L.deptColCount}</span>
                    {deptStats[0]?.gradeCounts.map((g) => (
                      <span className="evs-leader-num" key={g.gradeKey}>{g.label}</span>
                    ))}
                    <span className="evs-leader-num">{L.deptColAvgAchieve}</span>
                    <span className="evs-leader-num">{L.deptColVsGuide}</span>
                  </div>
                  {deptStats.map((d) => (
                    <div className="evs-leader-row evs-dept-drow" role="row" key={d.dept} data-testid="evs-dept-drow" style={{ '--gcols': d.gradeCounts.length }}>
                      <span className="evs-leader-name">{d.dept}</span>
                      <span className="evs-leader-num is-muted">{d.total}{L.unit}</span>
                      {d.gradeCounts.map((g, i) => (
                        <span className={`evs-leader-num${g.count > 0 ? ` ${segClass(i, d.gradeCounts.length)}-text` : ' is-muted'}`} key={g.gradeKey}>{g.count}{L.unit}</span>
                      ))}
                      <span className="evs-leader-num">{d.avgAchieve}%</span>
                      <span className={`evs-leader-num evs-dept-vsguide tone-${vsGuideTone(d.deltaVsGuide)}`}>
                        {d.deltaVsGuide > 0 ? `+${d.deltaVsGuide}` : d.deltaVsGuide}%p
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )
        )}

        {tab === 'leaderPattern' && (
          leaderPatterns.length === 0 ? (
            <section className="evc-card"><p className="evc-empty-sub" data-testid="evs-lp-empty">{L.lpEmpty}</p></section>
          ) : (
            <>
              {/* Block 1 — 경향 요약 배너 */}
              <div className="evs-lp-banner" data-testid="evs-lp-banner">
                {patternBuckets.map((b) => (
                  <div className={`evs-lp-card tone-${b.tone}`} key={b.key} data-testid={`evs-lp-bucket-${b.key}`}>
                    <div className="evs-lp-card-label">{b.label}</div>
                    <div className="evs-lp-card-count">{b.leaders.length}{L.unit}</div>
                    <div className="evs-lp-card-names">{b.leaders.length ? b.leaders.map((l) => l.name).join(', ') : '—'}</div>
                  </div>
                ))}
              </div>
              {lenientMajority && (
                <p className="evs-lp-warn" data-testid="evs-lp-warn">⚠ {L.lpMajorityWarn}</p>
              )}

              {/* Block 2 — 리더별 등급 분포 비교 */}
              <section className="evc-card">
                <h3 className="evc-card-name">{L.lpDistTitle}</h3>
                <div className="evs-lp-list">
                  {leaderPatterns.map((p) => (
                    <div className="evs-lp-row" key={p.leaderId} data-testid="evs-lp-row">
                      <div className="evs-lp-row-head">
                        <span className="evs-lp-lead">
                          <span className="evs-leader-avatar">{(p.name || '?').slice(0, 1)}</span>
                          <span>
                            <span className="evs-leader-name">{p.name || p.leaderId}</span>
                            <span className="evs-lp-dept"> · {p.dept}</span>
                          </span>
                        </span>
                        <span className={`evs-lp-tag tone-${tendencyMeta[p.tendency]?.tone ?? 'neutral'}`}>
                          {tagOf(p.tendency)}
                        </span>
                      </div>
                      <div className="evs-lp-bar" role="img">
                        {p.gradeDistribution.map((g, i) => (
                          g.pct > 0 && (
                            <span
                              key={g.gradeKey}
                              className={`evs-lp-seg seg-${i === 0 ? 'top' : i === p.gradeDistribution.length - 1 ? 'bottom' : 'mid'}`}
                              style={{ width: `${g.pct}%` }}
                            />
                          )
                        ))}
                      </div>
                      <div className="evs-lp-legend">
                        {p.gradeDistribution.map((g, i) => (
                          <span className="evs-lp-legend-item" key={g.gradeKey}>
                            <span className={`evs-lp-dot seg-${i === 0 ? 'top' : i === p.gradeDistribution.length - 1 ? 'bottom' : 'mid'}`} />
                            {g.label} {g.pct}%
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Block 3 — 캘리브레이션 전후 등급 변화 */}
              <section className="evc-card" data-testid="evs-lp-calib">
                <h3 className="evc-card-name">{L.lpCalibTitle}</h3>
                {leaderPatterns.every((p) => p.calibDelta === 0) ? (
                  <p className="evc-empty-sub">{L.lpCalibEmpty}</p>
                ) : (
                  <div className="evs-leader-table">
                    <div className="evs-leader-row evs-lp-calib-row evs-leader-head">
                      <span>{L.lpColLeader}</span>
                      <span>{L.lpColDept}</span>
                      <span>{L.lpColTendency}</span>
                      <span className="evs-leader-num">{L.lpColAdjusted}</span>
                    </div>
                    {leaderPatterns.map((p) => (
                      <div className="evs-leader-row evs-lp-calib-row" role="row" key={p.leaderId} data-testid="evs-lp-calib-row">
                        <span className="evs-leader-name">{p.name || p.leaderId}</span>
                        <span className="evs-leader-dept">{p.dept}</span>
                        <span className={`evs-lp-tag tone-${tendencyMeta[p.tendency]?.tone ?? 'neutral'}`}>{tagOf(p.tendency)}</span>
                        <span className={`evs-leader-num evs-lp-delta${p.calibDelta > 0 ? ' is-up' : p.calibDelta < 0 ? ' is-down' : ' is-muted'}`}>
                          {p.calibDelta === 0 ? '—' : p.calibDelta > 0 ? `▲ ${p.calibDelta}${L.unit}` : `▼ ${Math.abs(p.calibDelta)}${L.unit}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )
        )}

        {tab === 'calib' && calibResult && (
          <>
            {/* Block 1 — 요약 지표 3-up */}
            <div className="evs-kpis evs-cd-cards" data-testid="evs-cd-cards">
              <div className="evs-kpi tone-accent">
                <span className="evs-kpi-value">{calibResult.adjustedCount}{L.unit}</span>
                <span className="evs-kpi-label">{L.cdAdjusted}</span>
                <span className="evs-kpi-sub">{fmt(L.cdOfTotal, { total: calibResult.total, pct: calibResult.total > 0 ? Math.round((100 * calibResult.adjustedCount) / calibResult.total) : 0 })}</span>
              </div>
              <div className="evs-kpi tone-green">
                <span className="evs-kpi-value">{calibResult.upwardCount}{L.unit}</span>
                <span className="evs-kpi-label">{L.cdUpward}</span>
                <span className="evs-kpi-sub">{L.cdUpwardSub}</span>
              </div>
              <div className="evs-kpi evs-cd-down">
                <span className="evs-kpi-value">{calibResult.downwardCount}{L.unit}</span>
                <span className="evs-kpi-label">{L.cdDownward}</span>
                <span className="evs-kpi-sub">{L.cdDownwardSub}</span>
              </div>
            </div>

            {/* Block 2 — 조정 전후 등급 분포 비교 */}
            <section className="evc-card">
              <h3 className="evc-card-name">{L.cdDistTitle}</h3>
              <div className="evs-cd-dist">
                {calibResult.before.map((b, i) => {
                  const a = calibResult.after[i] ?? { count: 0, pct: 0 };
                  const deltaCount = a.count - b.count;
                  const deltaPct = a.pct - b.pct;
                  const seg = segClass(i, calibResult.before.length);
                  const guide = i === 0 ? calibResult.afterExcellentGuidelinePct : null;
                  return (
                    <div className="evs-cd-grade" key={b.gradeKey} data-testid="evs-cd-grade">
                      <div className="evs-cd-grade-head">
                        <span className="evs-cd-grade-name">
                          <span className={`evs-lp-dot ${seg}`} /> {b.label}
                        </span>
                        {deltaCount !== 0 && (
                          <span className={`evs-cd-delta${deltaCount > 0 ? ' is-up' : ' is-down'}`}>
                            {deltaCount > 0 ? `▲ +${deltaCount}${L.unit}` : `▼ ${deltaCount}${L.unit}`} ({deltaPct > 0 ? `+${deltaPct}` : deltaPct}%p)
                          </span>
                        )}
                      </div>
                      <div className="evs-cd-pair">
                        <span className="evs-cd-plabel">{L.cdBefore}</span>
                        <div className="evs-dist-track evs-cd-track">
                          <div className={`evs-cd-fill ${seg} is-before`} style={{ width: `${b.pct}%` }} />
                        </div>
                        <span className="evs-cd-pval">{b.count}{L.unit} ({b.pct}%)</span>
                      </div>
                      <div className="evs-cd-pair">
                        <span className="evs-cd-plabel">{L.cdAfter}</span>
                        <div className="evs-dist-track evs-cd-track">
                          <div className={`evs-cd-fill ${seg} is-after`} style={{ width: `${a.pct}%` }} />
                          {guide != null && (
                            <div className="evs-dist-guide" style={{ left: `${Math.min(100, guide)}%` }} title={`${L.guidelineLabel} ${guide}%`} />
                          )}
                        </div>
                        <span className="evs-cd-pval">{a.count}{L.unit} ({a.pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {calibResult.summary && (
                <p className="evs-cd-summary" data-testid="evs-cd-summary">{calibResult.summary}</p>
              )}
            </section>

            {/* Block 3 — 개별 조정 위임 카드 */}
            <section className="evc-card">
              <h3 className="evc-card-name">{L.cdDetailTitle}</h3>
              <div className="evs-cd-delegate">
                <div className="evs-cd-delegate-text">
                  {calibResult.adjustedCount === 0 ? (
                    <div className="evs-cd-delegate-line">{L.cdEmpty}</div>
                  ) : (
                    <div className="evs-cd-delegate-line">
                      {fmt(L.cdSummaryLine, { n: calibResult.adjustedCount })}
                      <span className="evs-cd-delegate-sub">{fmt(L.cdSummaryDelta, { u: calibResult.upwardCount, d: calibResult.downwardCount })}</span>
                    </div>
                  )}
                  <div className="evs-cd-delegate-note">{L.cdDelegateNote}</div>
                </div>
                {onOpenWorkspace && (
                  <button type="button" className="evc-btn is-primary" onClick={() => onOpenWorkspace()} data-testid="evs-cd-workspace">
                    {L.cdOpenWorkspace}
                  </button>
                )}
              </div>
            </section>
          </>
        )}

        {tab === 'exec' && (
          <div className="evs-exec" data-testid="evs-exec">
            <p className="evs-exec-banner">{L.execBanner}</p>
            <div className="fb-tabs evs-exec-tabs">
              {[{ key: 'j1', label: L.execJ1 }, { key: 'j2', label: L.execJ2 }, { key: 'j3', label: L.execJ3 }].map((s) => (
                <button
                  type="button"
                  key={s.key}
                  className={`fb-tab${execSection === s.key ? ' is-on' : ''}`}
                  onClick={() => setExecSection(s.key)}
                  data-testid={`evs-exec-tab-${s.key}`}
                >{s.label}</button>
              ))}
            </div>

            {/* J1 — 전사 서머리 */}
            {execSection === 'j1' && (
              <>
                <div className="evs-two-col">
                  <section className="evc-card">
                    <h3 className="evc-card-name">{L.j1DistTitle}</h3>
                    {gradeDistribution.length === 0 ? (
                      <p className="evc-empty-sub">{L.empty}</p>
                    ) : (
                      <div className="evs-dist">
                        {gradeDistribution.map((d) => (
                          <div className="evs-dist-row" key={d.gradeKey}>
                            <span className="evs-dist-label">{d.label ?? d.gradeKey}</span>
                            <div className="evs-dist-body">
                              <div className="evs-dist-track">
                                <div className="evs-dist-fill" style={{ width: `${(d.count / maxCount) * 100}%` }} />
                                {d.guidelinePct != null && (
                                  <div className="evs-dist-guide" style={{ left: `${Math.min(100, d.guidelinePct)}%` }} />
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
                  <section className="evc-card" data-testid="evs-j1-ratio">
                    <h3 className="evc-card-name">{L.j1RatioTitle}</h3>
                    {[
                      { label: L.j1CompLabel, val: execSummary?.competencyAvg, tone: 'purple' },
                      { label: L.j1WorkLabel, val: execSummary?.workAchievementAvg, tone: 'accent' },
                    ].map((r) => (
                      <div className="evs-j1-ratio-row" key={r.label}>
                        <span className="evs-j1-ratio-label">{r.label}</span>
                        <div className="evs-dist-track evs-j1-ratio-track">
                          <div className={`evs-j1-ratio-fill tone-${r.tone}`} style={{ width: `${r.val != null ? (r.val / 5) * 100 : 0}%` }} />
                        </div>
                        <span className="evs-j1-ratio-val">{r.val != null ? `${r.val.toFixed(1)}/5` : L.j1NoScore}</span>
                      </div>
                    ))}
                    <p className="evs-dist-guide-cap evs-j1-ratio-note">{L.j1RatioNote}</p>
                  </section>
                </div>

                <section className="evc-card" data-testid="evs-j1-dept">
                  <h3 className="evc-card-name">{L.j1DeptTitle}</h3>
                  {deptStats.length === 0 ? (
                    <p className="evc-empty-sub">{L.deptDataEmpty}</p>
                  ) : (
                    <div className="evs-leader-table">
                      <div className="evs-leader-row evs-j1-drow evs-leader-head">
                        <span>{L.deptColDept}</span>
                        <span className="evs-leader-num">{L.deptColCount}</span>
                        {(deptStats[0]?.gradeCounts ?? []).map((g) => (
                          <span className="evs-leader-num" key={g.gradeKey}>{g.label}</span>
                        ))}
                        <span className="evs-leader-num">{L.j1ColComp}</span>
                        <span className="evs-leader-num">{L.j1ColWork}</span>
                        <span className="evs-leader-num">{L.j1ColAchieve}</span>
                      </div>
                      {deptStats.map((d) => (
                        <div className="evs-leader-row evs-j1-drow" role="row" key={d.dept} data-testid="evs-j1-dept-row" style={{ '--gcols': d.gradeCounts.length }}>
                          <span className="evs-leader-name">{d.dept}</span>
                          <span className="evs-leader-num is-muted">{d.total}{L.unit}</span>
                          {d.gradeCounts.map((g, i) => (
                            <span className={`evs-leader-num${g.count > 0 ? ` ${segClass(i, d.gradeCounts.length)}-text` : ' is-muted'}`} key={g.gradeKey}>{g.count}</span>
                          ))}
                          <span className="evs-leader-num">{d.competencyAvg != null ? d.competencyAvg.toFixed(1) : L.j1NoScore}</span>
                          <span className="evs-leader-num">{d.workAchievementAvg != null ? d.workAchievementAvg.toFixed(1) : L.j1NoScore}</span>
                          <span className="evs-leader-num">{d.avgAchieve}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}

            {/* J2 — 리더 평가 패턴(탭 C 데이터 재사용) */}
            {execSection === 'j2' && (
              <section className="evc-card" data-testid="evs-exec-j2">
                <h3 className="evc-card-name">{L.execJ2Title}</h3>
                {leaderPatterns.length === 0 ? (
                  <p className="evc-empty-sub">{L.lpEmpty}</p>
                ) : (
                  <>
                    <div className="evs-lp-banner">
                      {patternBuckets.map((b) => (
                        <div className={`evs-lp-card tone-${b.tone}`} key={b.key}>
                          <div className="evs-lp-card-label">{b.label}</div>
                          <div className="evs-lp-card-count">{b.leaders.length}{L.unit}</div>
                          <div className="evs-lp-card-names">{b.leaders.length ? b.leaders.map((l) => l.name).join(', ') : '—'}</div>
                        </div>
                      ))}
                    </div>
                    <div className="evs-lp-list">
                      {leaderPatterns.map((p) => (
                        <div className="evs-lp-row" key={p.leaderId}>
                          <div className="evs-lp-row-head">
                            <span className="evs-lp-lead">
                              <span className="evs-leader-avatar">{(p.name || '?').slice(0, 1)}</span>
                              <span><span className="evs-leader-name">{p.name || p.leaderId}</span><span className="evs-lp-dept"> · {p.dept}</span></span>
                            </span>
                            <span className={`evs-lp-tag tone-${tendencyMeta[p.tendency]?.tone ?? 'neutral'}`}>{tagOf(p.tendency)}</span>
                          </div>
                          <div className="evs-lp-bar">
                            {p.gradeDistribution.map((g, i) => (
                              g.pct > 0 && <span key={g.gradeKey} className={`evs-lp-seg ${segClass(i, p.gradeDistribution.length)}`} style={{ width: `${g.pct}%` }} />
                            ))}
                          </div>
                          <div className="evs-lp-legend">
                            {p.gradeDistribution.map((g, i) => (
                              <span className="evs-lp-legend-item" key={g.gradeKey}><span className={`evs-lp-dot ${segClass(i, p.gradeDistribution.length)}`} />{g.label} {g.pct}%</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </section>
            )}

            {/* J3 — 9블록 매트릭스 + 승진 요청 */}
            {execSection === 'j3' && (
              <>
                <p className="evs-exec-confidential">🔒 {L.nbConfidential}</p>
                <div className="evs-two-col evs-nb-wrap">
                  <section className="evc-card">
                    <h3 className="evc-card-name">{L.nbTitle}</h3>
                    {!nineBox || nineBox.assessedCount === 0 ? (
                      <p className="evc-empty-sub" data-testid="evs-nb-empty">{L.nbEmpty}</p>
                    ) : (() => {
                      const yKeys = ['recommended', 'not_yet', 'deferred'];
                      const xKeys = ['urgent', 'moderate', 'maintain'];
                      const yLabel = { recommended: L.nbYRecommended, not_yet: L.nbYNotYet, deferred: L.nbYDeferred };
                      const xLabel = { urgent: L.nbXUrgent, moderate: L.nbXModerate, maintain: L.nbXMaintain };
                      const yTone = { recommended: 'green', not_yet: 'neutral', deferred: 'amber' };
                      return (
                        <div className="evs-nb" data-testid="evs-ninebox">
                          <div className="evs-nb-grid">
                            <span className="evs-nb-corner" />
                            {xKeys.map((x) => <span className="evs-nb-xhead" key={x}>{xLabel[x]}</span>)}
                            {yKeys.map((y) => (
                              <Fragment key={y}>
                                <span className={`evs-nb-yhead tone-${yTone[y]}`}>{yLabel[y]}</span>
                                {xKeys.map((x) => {
                                  const members = nineBox.cells[y][x];
                                  const highlight = y === 'recommended' && x === 'urgent';
                                  return (
                                    <div className={`evs-nb-cell x-${x}${highlight ? ' is-priority' : ''}`} key={x} data-testid={`evs-nb-cell-${y}-${x}`}>
                                      {members.length === 0 ? <span className="evs-nb-empty-cell">—</span> : members.map((m) => (
                                        <button type="button" className="evs-nb-name" key={m.memberId} onClick={() => onNineBoxNameClick && onNineBoxNameClick(m.memberId)}>{m.name || m.memberId}</button>
                                      ))}
                                    </div>
                                  );
                                })}
                              </Fragment>
                            ))}
                          </div>
                          <p className="evs-nb-caption">{L.nbCaption}</p>
                        </div>
                      );
                    })()}
                  </section>
                  <section className="evc-card" data-testid="evs-exec-pr">
                    <h3 className="evc-card-name">{L.prTitle}</h3>
                    <p className="evc-empty-sub">{L.prEmpty}</p>
                  </section>
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'integrated' && (
          <div className="evs-re" data-testid="evs-reviewee">
            {/* 좌: 피평가자 목록 */}
            <section className="evc-card evs-re-list">
              <h3 className="evc-card-name">{L.reListTitle}</h3>
              <p className="evs-re-access">{L.reAccessNote}</p>
              {integrated.length === 0 ? (
                <p className="evc-empty-sub">{L.reEmptyList}</p>
              ) : (
                <div className="evs-re-groups">
                  {revieweeGroups.map((g) => (
                    <div className="evs-re-group" key={g.dept}>
                      <div className="evs-re-group-dept">{g.dept}</div>
                      {g.members.map((m) => (
                        <button
                          type="button"
                          key={m.memberId}
                          className={`evs-re-item${selectedMemberId === m.memberId ? ' is-sel' : ''}`}
                          onClick={() => onSelectMember && onSelectMember(m.memberId)}
                          data-testid={`evs-re-item-${m.memberId}`}
                        >
                          <span className="evs-leader-avatar">{(m.name || '?').slice(0, 1)}</span>
                          <span className="evs-re-item-name">{m.name || m.memberId}</span>
                          {m.gradeLabel && (
                            <span className={`evs-re-grade ${gradeSeg(m.gradeLabel)}`}>{m.gradeLabel}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 우: 상세 4섹션 */}
            <div className="evs-re-detail">
              {memberDetailLoading ? (
                <section className="evc-card"><p className="evc-empty-sub">{L.reLoading}</p></section>
              ) : !selectedMemberId ? (
                <section className="evc-card"><p className="evc-empty-sub" data-testid="evs-re-prompt">{L.reSelectPrompt}</p></section>
              ) : !memberDetail ? (
                <section className="evc-card"><p className="evc-empty-sub">{L.reNoData}</p></section>
              ) : (
                <>
                  <div className="evs-re-head">
                    <div>
                      <div className="evs-re-head-name">{memberDetail.name || memberDetail.memberId}</div>
                      <div className="evs-re-head-dept">{memberDetail.dept}</div>
                    </div>
                    <div className="evs-re-head-right">
                      {memberDetail.gradeLabel && (
                        <span className={`evs-re-grade lg ${gradeSeg(memberDetail.gradeLabel)}`}>
                          {L.reFinalGrade}: {memberDetail.gradeLabel}
                        </span>
                      )}
                      {memberDetail.calibration?.adjusted && (
                        <span className="evs-lp-tag tone-amber">{L.reAdjustedBadge}</span>
                      )}
                    </div>
                  </div>

                  {/* A. 셀프 */}
                  <section className="evc-card evs-re-sec">
                    <h3 className="evc-card-name evs-re-sec-self">{L.reSelfTitle}</h3>
                    {memberDetail.self?.submitted && memberDetail.self.answers.length ? (
                      <div className="evs-re-answers">
                        {memberDetail.self.answers.map((a) => (
                          <div className="evs-re-answer" key={a.id}>
                            {a.score != null && <span className="evs-re-score">{L.reScore} {a.score}</span>}
                            {a.textAnswer && <span className="evs-re-atext">{a.textAnswer}</span>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="evc-empty-sub">{L.reSelfEmpty}</p>
                    )}
                  </section>

                  {/* B. 동료 (익명) */}
                  <section className="evc-card evs-re-sec">
                    <h3 className="evc-card-name evs-re-sec-peer">{L.rePeerTitle}</h3>
                    {memberDetail.peer?.answers.length ? (
                      <div className="evs-re-answers">
                        {memberDetail.peer.answers.map((a) => (
                          <div className="evs-re-answer" key={a.id}>
                            {a.score != null && <span className="evs-re-score">{L.reScore} {a.score}</span>}
                            {a.textAnswer && <span className="evs-re-atext">{a.textAnswer}</span>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="evc-empty-sub">{fmt(L.rePeerEmpty, { n: memberDetail.peer?.count ?? 0 })}</p>
                    )}
                  </section>

                  {/* C. 매니저 */}
                  <section className="evc-card evs-re-sec">
                    <h3 className="evc-card-name evs-re-sec-manager">{L.reManagerTitle}</h3>
                    {memberDetail.manager?.submitted ? (
                      <>
                        {memberDetail.manager.gradeLabel && (
                          <span className="evs-lp-tag tone-green evs-re-mgrade">{L.reManagerGrade}: {memberDetail.manager.gradeLabel}</span>
                        )}
                        <div className="evs-re-answers">
                          {memberDetail.manager.answers.map((a) => (
                            <div className="evs-re-answer" key={a.id}>
                              {a.score != null && <span className="evs-re-score">{L.reScore} {a.score}</span>}
                              {a.textAnswer && <span className="evs-re-atext">{a.textAnswer}</span>}
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="evc-empty-sub">{L.reManagerEmpty}</p>
                    )}
                  </section>

                  {/* D. 캘리브레이션 */}
                  <section className="evc-card evs-re-sec">
                    <h3 className="evc-card-name">{L.reCalibTitle}</h3>
                    {memberDetail.calibration?.finalGradeLabel ? (
                      <>
                        <div className="evs-re-calib-final">
                          {L.reFinalGrade}: <strong>{memberDetail.calibration.finalGradeLabel}</strong>
                          <span className={`evs-lp-tag ${memberDetail.calibration.adjusted ? 'tone-amber' : 'tone-green'}`}>
                            {memberDetail.calibration.adjusted ? L.reCalibAdjusted : L.reCalibOriginal}
                          </span>
                        </div>
                        {memberDetail.calibration.history.map((h, i) => (
                          <div className="evs-re-calib-hist" key={i}>
                            {h.fromLabel ?? '—'} → <strong>{h.toLabel}</strong>{h.note ? ` · ${h.note}` : ''}
                          </div>
                        ))}
                      </>
                    ) : (
                      <p className="evc-empty-sub">{L.reCalibEmpty}</p>
                    )}
                  </section>
                </>
              )}
            </div>
          </div>
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
