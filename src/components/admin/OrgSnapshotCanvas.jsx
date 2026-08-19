import { useState, useMemo, useRef, useCallback } from 'react';

/**
 * OrgSnapshotCanvas — 어드민 "조직 스냅샷" 화면 Pure 컴포넌트.
 * pivit-specs 의 org-snapshot-views.jsx 시안을 design-page 정본으로 포팅.
 *
 * 4 서브뷰 (상단 탭으로 전환):
 *   - snapshot : 조직 현황 스냅샷 (요약 카드 + 조직트리/고용/직군/연령 탭 + CSV 내보내기)
 *   - single   : 인사발령 단건 (대상자 검색 + 변경 항목 + 변경 전/후)
 *   - bulk     : 인사발령 대량 (3-step: 항목선택 → 파일업로드 → 검증/확정)
 *   - history  : 발령 이력 (테이블 + 우측 상세 패널)
 *
 * 모든 데이터·라벨은 props 로 받는다 (page wrapper 가 fetch·매핑·i18n·persist·CSV 소유).
 * UI 상태(현재 탭/검색/선택 항목/스텝/파일 파싱/선택 행)만 내부에서 관리한다.
 * 스타일은 design-page 토큰 기반 src/admin.css (.admin-snap-*) 클래스.
 * 호스트 앱은 `@pivit-work/design-page/styles/admin.css` 를 import 해야 한다.
 */

const DEFAULT_LABELS = {
  views: {
    snapshot: '조직 스냅샷',
    single: '발령 단건',
    bulk: '발령 대량',
    history: '발령 이력',
    asof: 'As Of',
  },
  loading: '불러오는 중…',
  // 현황 스냅샷
  statusTitle: '조직 현황',
  statusSubtitle: '인사 정보 기준 스냅샷',
  queryDate: '조회일',
  applyDate: '적용',
  export: '내보내기 (CSV)',
  exportRoster: '원본 명단',
  exportRosterHint: '조회일 기준 재직자 전원 1인 1행',
  exportSummary: '현재 탭 집계',
  exportSummaryHint: '현재 탭의 요약 통계',
  // 원본 명단 — 인사 필드 표준 14열(arch-core-data-model §1-3-a)
  rosterTitle: '원본 명단',
  rosterHint: '내보내기 CSV와 동일한 열',
  rosterCollapse: '접기',
  rosterExpand: '펼치기',
  rosterEmpty: '조회일 기준 재직 인원이 없습니다',
  roster: {
    index: '#',
    name: '이름',
    employeeCode: '사번',
    teamPath: '소속',
    jobPosition: '직책',
    jobLevel: '직급',
    jobFamily: '직군',
    // 🔴 `jobTitle` 은 **직렬**이다 (2026-08-10 M5-b 승격, 키 이름만 남았다).
    //    직무는 아래 `jobDuty` 하나뿐 — 한 표에 '직무' 헤더가 두 번 나오면
    //    어느 칸이 무엇인지 사람이 구분할 수 없다(PW-189 어휘 정정 · PW-323).
    jobTitle: '직렬',
    jobDuty: '직무',
    employmentType: '고용형태',
    employmentStatus: '재직상태',
    workLocation: '근무지',
    managerName: '매니저',
    hireDate: '입사일',
    finalGrade: '확정등급',
    salary: '연봉',
  },
  // As Of — 시점별 조직 스냅샷(org-snapshot-spec §5)
  asofTitle: '시점별 조직 스냅샷',
  asofSubtitle: '발령 이력을 되감아 그 시점의 명부를 재구성합니다',
  asofPresetLabel: '기준 시점',
  asofToday: '현재',
  asofShowComp: '보상 표시',
  asofBackToToday: '현재로 복귀',
  asofExport: '조직 스냅샷 CSV',
  asofEmpty: '이 시점의 스냅샷이 없습니다',
  /** `{date}` 자리에 기준일이 들어간다. */
  asofBanner: '{date} 시점으로 조회 중입니다',
  asofPartialNote: '옛 스냅샷이라 일부 열은 기록되지 않아 비어 있습니다',
  // 커버리지 경계 · 빈 상태 2종 (org-snapshot-spec §5-A · PW-139).
  // C1 = 기록의 부재, C2 = 사실의 확인. 문구를 서로 바꿔 쓰지 않는다.
  asofCoverageCaption: '',
  asofNoRecord: '기록 없음',
  asofOutOfRangeTitle: '기록이 시작된 날짜부터 조회할 수 있어요',
  asofOutOfRangeBody: '그 이전 조직 기록은 Pivit 에 남아 있지 않습니다. 조직이 없었다는 뜻은 아닙니다.',
  asofGoToCoverage: '기록 시작일로 이동',
  asofEmptyFact: '이 시점에 재직 중인 구성원이 없습니다',
  asofFixedCopy: '증빙 고정본',
  asofFixedCopyHint: '이 날짜에 고정된 값입니다',
  asofCards: {
    total: '그 시점 재직',
    joined: '이후 입사',
    left: '이후 퇴사',
    moved: '발령·승급 변경',
  },
  drilldownAll: '전체 재직 구성원',
  drilldownHint: '구성원 보기',
  tabs: { summary: '조직 현황', employment: '고용 유형', jobgroup: '직군/직무', age: '연령 구성' },
  orgTreeHeading: '조직 구성',
  noOrgStructure: '조직 구조 데이터가 없습니다',
  countSuffix: '명',
  employmentHeading: '고용 유형별 인원',
  govFormatTitle: '관공서 제출 양식',
  govFormatDesc: '고용 유형별 인원 수 및 인건비 추이 데이터는 내보내기 → 관공서 양식에서 서식 포맷으로 다운로드 가능합니다.',
  jobFamilyHeading: '직군별 인원 (투자사 제출용)',
  noJobGroups: '직군 데이터가 없습니다',
  leaderPrefix: '리더',
  ageHeading: '연령대별 인원',
  ageNotAvailable: '연령 데이터가 없습니다',
  govAgeTitle: '관공서 기준 집계',
  // 발령 공통
  target: '대상자',
  searchMember: '이름 또는 사번 검색',
  selectFields: '변경 항목 선택',
  appointmentType: '발령 유형',
  appointmentDate: '발령 일자',
  reason: '사유',
  reasonPlaceholder: '발령 사유 입력',
  selectPlaceholder: '선택...',
  fieldBefore: '변경 전',
  fieldAfter: '변경 후',
  noFieldsSelected: '변경 항목을 선택해주세요',
  cancel: '취소',
  confirmAppointment: '발령 확정',
  appointmentDone: '발령 완료',
  // 대량
  stepSelectFields: '항목 선택',
  stepFileUpload: '파일 업로드',
  stepValidate: '검증 & 확정',
  selectColumns: '변경할 항목을 선택하세요',
  selectedColumnsPrefix: '선택된 항목',
  next: '다음',
  prev: '이전',
  downloadTemplate: '템플릿 다운로드 (CSV)',
  templateColumnsPrefix: '이름, 사번,',
  templateColumnsSuffix: '컬럼 포함',
  dragOrClick: '파일을 드래그하거나 클릭하여 업로드',
  supportedFormats: 'xlsx, csv 지원',
  statusOk: '정상',
  statusWarn: '미매칭',
  okCount: '정상',
  warnCount: '경고',
  countUnit: '건',
  bulkReasonPlaceholder: '일괄 발령 사유',
  bulkPreviewPending: '파일 검증 대기 중',
  confirmBulkPrefix: '발령 확정',
  // 겸직(다중 소속) 배열 포맷 — org-snapshot-spec.md §3-A
  affFormatTitle: '겸직은 행을 나누지 않습니다.',
  affFormatBody: '조직경로 한 칸에 | 로 나열하세요 — 프로덕트 > 백엔드 | 플랫폼 > 데이터',
  affFormatRule: '배열이면 주소속이 필수이고, 조직장은 조직경로에 포함된 값만 쓸 수 있습니다.',
  affOverwriteWarning:
    '업로드는 소속을 배열대로 덮어씁니다. 파일에 없는 기존 소속은 제거됩니다(− 표시). 한 사람의 소속 중 하나라도 실패하면 그 사람 전체를 되돌립니다.',
  affColChange: '소속 변경',
  affColPrimary: '주 소속',
  affColLeader: '조직장',
  affColRole: '권한',
  affNoChange: '변경 없음',
  affPromote: '멤버 → 매니저',
  affSelectPrimary: '주 소속 선택',
  errorCount: '제외',
  statusError: '제외',
  // 이력
  historyEmpty: '발령 이력이 없습니다',
  historyDate: '발령일',
  historyTarget: '대상자',
  historyType: '발령 유형',
  historyMode: '처리 유형',
  historyHandler: '처리자',
  historyDetail: '상세',
  historyModeSingle: '단건',
  historyModeBulk: '대량',
  historyField: '항목',
  historyReason: '사유',
  searchEmployee: '이름 또는 사번 검색',
  fieldLabels: {},
  typeLabels: {},
};

function merge(base, provided) {
  if (!provided) return base;
  const out = { ...base };
  for (const k of Object.keys(provided)) {
    if (provided[k] && typeof provided[k] === 'object' && !Array.isArray(provided[k])) {
      out[k] = merge(base[k] || {}, provided[k]);
    } else if (provided[k] !== undefined) {
      out[k] = provided[k];
    }
  }
  return out;
}

// 발령 유형 key → 배지 톤 (admin.css .admin-snap-type-badge.is-*)
const TYPE_TONE = {
  typeTitleChange: 'blue',
  typeDeptMove: 'amber',
  typePromotion: 'green',
  typeDemotion: 'red',
  typeEmploymentChange: 'amber',
  typeLocationChange: 'blue',
  typeSalaryChange: 'amber',
  typeHire: 'green',
  typeTermination: 'gray',
};

/* ── CSV 헬퍼 (대량 발령 템플릿/파싱) ─────────────────────── */
function triggerCSVDownload(csvContent, filename) {
  const BOM = '﻿';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (a.parentNode) a.parentNode.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else if (ch === '"') { inQuotes = true; }
    else if (ch === ',') { result.push(current.trim()); current = ''; }
    else { current += ch; }
  }
  result.push(current.trim());
  return result;
}

/* ── 원본 명단(Raw 명단) — 인사 필드 표준 14열 ────────────────
   조직 현황(조회일 기준)과 As Of(시점 재구성)가 같은 표를 쓴다. 열·라벨·순서를
   한 곳에 두어 두 화면과 CSV 가 어긋나지 않게 한다("보이는 것 = 받는 것").

   직무(`jobDuty`)는 직렬(`jobTitle`) 바로 뒤다 — 직렬에 매달린 값이라 떨어뜨려
   놓으면 표에서 상하 관계가 안 보인다(§1-3-a 표시 열 · PW-323). */
const ROSTER_COLUMNS = [
  'name', 'employeeCode', 'teamPath', 'jobPosition', 'jobLevel',
  'jobFamily', 'jobTitle', 'jobDuty', 'employmentType', 'employmentStatus',
  'workLocation', 'managerName', 'hireDate', 'finalGrade',
];

/**
 * `rowBadge` — 이름 셀 뒤에 붙는 출처 배지(As Of 의 `증빙 고정본`, S2).
 * AI 데이터 소스 배지가 아니라 **시점 출처 표기**라 중립색을 쓴다(정책 §8).
 */
function RosterTable({ rows, labels, showSalary, changedHint, onMemberClick, rowBadge }) {
  const columns = showSalary ? [...ROSTER_COLUMNS, 'salary'] : ROSTER_COLUMNS;
  if (rows.length === 0) {
    return <div className="admin-snap-empty">{labels.rosterEmpty}</div>;
  }
  return (
    <div className="admin-snap-roster-scroll">
      <table className="admin-snap-roster">
        <thead>
          <tr>
            <th className="admin-snap-roster-idx">{labels.roster.index}</th>
            {columns.map((c) => <th key={c}>{labels.roster[c]}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const changed = new Set(r.changedFields ?? []);
            const clickable = !!(r.userId && onMemberClick);
            return (
              <tr key={r.userId ?? `${r.name}-${i}`}>
                <td className="admin-snap-roster-idx">{i + 1}</td>
                {columns.map((c) => (
                  <td
                    key={c}
                    className={changed.has(c) ? 'is-changed' : undefined}
                    title={changed.has(c) && changedHint ? changedHint(c, r) : undefined}
                  >
                    {c === 'name' && clickable ? (
                      <button type="button" className="admin-snap-roster-name" onClick={() => onMemberClick(r.userId)}>
                        {r.name}
                      </button>
                    ) : (
                      (r[c] ?? null) === null || r[c] === '' ? '—' : r[c]
                    )}
                    {c === 'name' && rowBadge && (
                      <span className="admin-snap-roster-badge" title={rowBadge.title}>
                        {rowBadge.label}
                      </span>
                    )}
                    {changed.has(c) && <span className="admin-snap-roster-changed" aria-hidden>▲</span>}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** 내보내기 — 기본은 원본 명단, 집계는 보조(org-snapshot-spec §1 "내보내기"). */
function ExportMenu({ labels, onExportRoster, onExportSummary }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="admin-snap-export-wrap">
      <button
        type="button"
        className="admin-snap-export-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        ↓ {labels.export}
      </button>
      {open && (
        <>
          <div className="admin-snap-export-backdrop" onClick={() => setOpen(false)} />
          <div className="admin-snap-export-menu" role="menu">
            <button type="button" role="menuitem" onClick={() => { setOpen(false); onExportRoster?.(); }}>
              <span className="admin-snap-export-item-title">{labels.exportRoster}</span>
              <span className="admin-snap-export-item-hint">{labels.exportRosterHint}</span>
            </button>
            <button type="button" role="menuitem" onClick={() => { setOpen(false); onExportSummary?.(); }}>
              <span className="admin-snap-export-item-title">{labels.exportSummary}</span>
              <span className="admin-snap-export-item-hint">{labels.exportSummaryHint}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
 * 1. 조직 현황 스냅샷
 * ════════════════════════════════════════════════════════════ */
function OrgTreeRow({ node, depth, total, defaultOpen, onDrilldown, hint }) {
  const [open, setOpen] = useState(defaultOpen);
  const hasChildren = node.children && node.children.length > 0;
  const pct = total > 0 ? Math.round((node.count / total) * 100) : 0;
  const drill = (e) => { e.stopPropagation(); onDrilldown?.({ unit: node.name, label: node.name }); };
  return (
    <>
      <div
        className={`admin-snap-tree-row${depth === 0 ? ' is-root' : ''}${hasChildren ? ' has-children' : ''}${hasChildren && open ? ' is-open' : ''}`}
        style={{ padding: `9px 12px 9px ${12 + depth * 20}px` }}
        onClick={() => hasChildren && setOpen((o) => !o)}
      >
        <span className="admin-snap-tree-toggle">{hasChildren ? (open ? '▾' : '▸') : ''}</span>
        <button
          type="button"
          className="admin-snap-tree-name"
          onClick={onDrilldown ? drill : undefined}
          title={onDrilldown ? hint : undefined}
          style={onDrilldown ? { background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer', textAlign: 'left' } : undefined}
        >
          {node.name}
        </button>
        <span className="admin-snap-tree-count">{node.count}</span>
        <div className="admin-snap-tree-bar-wrap">
          <div className="admin-snap-tree-bar">
            <div
              className="admin-snap-tree-bar-fill"
              style={{ width: `${pct}%`, opacity: depth === 0 ? 1 : 0.5 }}
            />
          </div>
          <span className="admin-snap-tree-pct">{pct}%</span>
        </div>
      </div>
      {hasChildren && open && node.children.map((child) => (
        <OrgTreeRow key={child.name} node={child} depth={depth + 1} total={total} defaultOpen={false} onDrilldown={onDrilldown} hint={hint} />
      ))}
    </>
  );
}

function OrgSnapshotStatusView({
  data, labels, queryDate, onQueryDateChange, onExport, onExportRoster,
  activeTab, onTabChange, onDrilldown, onRosterMemberClick,
  showComp, onShowCompChange,
}) {
  const tabKeys = ['summary', 'employment', 'jobgroup', 'age'];
  const {
    summaryCards = [], orgTree = [], totalCount = 0,
    employment = [], jobFamilies = [], ageDist = [], ageSummary = [],
    roster = [],
  } = data;
  const [rosterOpen, setRosterOpen] = useState(true);
  // 연봉은 Tier3 — 응답에 값이 있어도 '보상 표시' 를 켠 뒤에만 열이 나온다(기획 §1 토글).
  const showSalary = !!showComp && roster.some((r) => r.salary !== undefined);
  // 조회일 draft — 날짜를 바꾼 뒤 '적용' 을 눌러야 조회된다(외부에서 queryDate 바뀌면 동기화).
  const [draftDate, setDraftDate] = useState(queryDate);
  const [seenQuery, setSeenQuery] = useState(queryDate);
  if (queryDate !== seenQuery) { setSeenQuery(queryDate); setDraftDate(queryDate); }
  const canApply = draftDate && draftDate !== queryDate;
  const empMax = Math.max(1, ...employment.map((e) => e.count));
  const ageMax = Math.max(1, ...ageDist.map((a) => a.count));

  return (
    <div className="admin-snap-canvas">
      <header className="admin-snap-header">
        <div>
          <div className="admin-snap-header-title">{labels.statusTitle}</div>
          <div className="admin-snap-header-sub">{labels.statusSubtitle}</div>
        </div>
        <div className="admin-snap-header-actions">
          {onShowCompChange && (
            <label className="admin-snap-comp-toggle">
              <input
                type="checkbox"
                checked={!!showComp}
                onChange={(e) => onShowCompChange(e.target.checked)}
              />
              {labels.asofShowComp}
            </label>
          )}
          <div className="admin-snap-datepicker">
            <span className="admin-snap-datepicker-label">{labels.queryDate}</span>
            <input
              type="date"
              value={draftDate}
              onChange={(e) => setDraftDate(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && canApply) onQueryDateChange?.(draftDate); }}
            />
          </div>
          <button
            type="button"
            className="admin-snap-apply-btn"
            disabled={!canApply}
            onClick={() => canApply && onQueryDateChange?.(draftDate)}
            style={{ padding: '7px 14px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 700, cursor: canApply ? 'pointer' : 'not-allowed', background: canApply ? 'var(--text-brand-tertiary, #4F6AF5)' : '#E2E8F0', color: canApply ? '#fff' : '#94A3B8' }}
          >
            {labels.applyDate}
          </button>
          <ExportMenu
            labels={labels}
            onExportRoster={() => onExportRoster?.()}
            onExportSummary={() => onExport?.(activeTab)}
          />
        </div>
      </header>

      <div
        className="admin-snap-summary-grid"
        style={{ gridTemplateColumns: `repeat(${Math.max(1, summaryCards.length)}, minmax(0, 1fr))` }}
      >
        {summaryCards.map((c) => {
          const clickable = c.drill && onDrilldown;
          return (
            <div
              key={c.key ?? c.label}
              className={`admin-snap-summary-card is-${c.tone || 'accent'}${clickable ? ' is-clickable' : ''}`}
              onClick={clickable ? () => onDrilldown({ card: c.key, label: c.label }) : undefined}
              role={clickable ? 'button' : undefined}
              title={clickable ? labels.drilldownHint : undefined}
              style={clickable ? { cursor: 'pointer' } : undefined}
            >
              <p className="admin-snap-summary-label">{c.label}</p>
              <p className="admin-snap-summary-value">{c.value}</p>
              {c.sub && <p className="admin-snap-summary-sub">{c.sub}</p>}
            </div>
          );
        })}
      </div>

      <div className="admin-snap-subtabs">
        {tabKeys.map((k) => (
          <button
            key={k}
            type="button"
            className={`admin-snap-subtab${activeTab === k ? ' is-active' : ''}`}
            onClick={() => onTabChange(k)}
          >
            {labels.tabs[k]}
          </button>
        ))}
      </div>

      <div className="admin-snap-content">
        {activeTab === 'summary' && (
          orgTree.length === 0
            ? <div className="admin-snap-empty">{labels.noOrgStructure}</div>
            : orgTree.map((node) => (
              <OrgTreeRow key={node.name} node={node} depth={0} total={totalCount} defaultOpen onDrilldown={onDrilldown} hint={labels.drilldownHint} />
            ))
        )}

        {activeTab === 'employment' && (
          <div>
            <p className="admin-snap-subheading">{labels.employmentHeading}</p>
            {employment.map((e) => (
              <div key={e.type} className="admin-snap-emp-row">
                <span className="admin-snap-emp-type">{e.type}</span>
                <div className="admin-snap-emp-bar">
                  <div className="admin-snap-emp-bar-fill" style={{ width: `${(e.count / empMax) * 100}%` }} />
                </div>
                <span className="admin-snap-emp-count">{e.count}{labels.countSuffix}</span>
                <span className="admin-snap-emp-pct">{e.pct}%</span>
              </div>
            ))}
            <p className="admin-snap-footnote">{labels.govFormatDesc}</p>
          </div>
        )}

        {activeTab === 'jobgroup' && (
          jobFamilies.length === 0
            ? <div className="admin-snap-empty">{labels.noJobGroups}</div>
            : (
              <>
                <p className="admin-snap-subheading">{labels.jobFamilyHeading}</p>
                {jobFamilies.map((jg) => (
                  <div key={jg.group} className="admin-snap-jg-row">
                    <span className="admin-snap-jg-name">{jg.group}</span>
                    <div className="admin-snap-jg-pills">
                      {jg.roles.map((r) => <span key={r} className="admin-snap-jg-pill">{r}</span>)}
                    </div>
                    <span className="admin-snap-jg-count">{jg.count}{labels.countSuffix}</span>
                    {jg.lead != null && <span className="admin-snap-jg-lead">{labels.leaderPrefix}: {jg.lead || '—'}</span>}
                  </div>
                ))}
              </>
            )
        )}

        {activeTab === 'age' && (
          ageDist.length === 0
            ? <div className="admin-snap-empty">{labels.ageNotAvailable}</div>
            : (
              <div>
                <p className="admin-snap-subheading">{labels.ageHeading}</p>
                {ageDist.map((a) => (
                  <div key={a.range} className="admin-snap-age-row">
                    <span className="admin-snap-age-label">{a.range}</span>
                    <div className="admin-snap-age-bar">
                      <div
                        className={`admin-snap-age-bar-fill${a.flagLabel ? ' is-flagged' : ''}`}
                        style={{ width: `${(a.count / ageMax) * 100}%` }}
                      />
                    </div>
                    <span className="admin-snap-age-count">{a.count}{labels.countSuffix}</span>
                    {/* 관공서 기준(청년 ~39세 / 장년 50+) 구간 강조 — 제출 서식의 핵심 축 */}
                    {a.flagLabel && <span className="admin-snap-age-flag">{a.flagLabel}</span>}
                  </div>
                ))}
                {ageSummary.length > 0 && (
                  <div className="admin-snap-agesummary">
                    {ageSummary.map((s) => (
                      <span key={s.label} className="admin-snap-agesummary-item">
                        {s.label} <strong>{s.value}</strong>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
        )}
      </div>

      {/* 원본 명단 — 집계만으로는 "실제 누가 있었나"에 답할 수 없다. 화면의 표와
          내보내기 CSV 가 같은 열·같은 데이터를 쓴다(org-snapshot-spec §1). */}
      <section className="admin-snap-roster-card">
        <div className="admin-snap-roster-head">
          <div className="admin-snap-roster-titlewrap">
            <span className="admin-snap-roster-title">{labels.rosterTitle}</span>
            <span className="admin-snap-roster-meta">
              {queryDate} · {roster.length}{labels.countSuffix} · {labels.rosterHint}
            </span>
          </div>
          <button
            type="button"
            className="admin-snap-roster-toggle"
            aria-expanded={rosterOpen}
            onClick={() => setRosterOpen((v) => !v)}
          >
            {rosterOpen ? `${labels.rosterCollapse} ▲` : `${labels.rosterExpand} ▼`}
          </button>
        </div>
        {rosterOpen && (
          <RosterTable
            rows={roster}
            labels={labels}
            showSalary={showSalary}
            onMemberClick={onRosterMemberClick}
          />
        )}
      </section>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
 * 2. 인사발령 단건
 * ════════════════════════════════════════════════════════════ */
function AppointmentSingleView({
  members, fieldOptions, changeableFields, selectFieldKeys, appointmentTypes,
  labels, onSubmit, defaultDate = '',
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedFields, setSelectedFields] = useState(() => new Set());
  const [appointmentType, setAppointmentType] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(defaultDate);
  const [reason, setReason] = useState('');
  const [changes, setChanges] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const q = searchQuery.toLowerCase();
    return members.filter((m) =>
      m.name.toLowerCase().includes(q) || (m.employeeCode && m.employeeCode.toLowerCase().includes(q)));
  }, [members, searchQuery]);

  const toggleField = (f) => setSelectedFields((prev) => {
    const next = new Set(prev);
    if (next.has(f)) next.delete(f); else next.add(f);
    return next;
  });

  const reset = () => {
    setSelectedMember(null); setSelectedFields(new Set());
    setAppointmentType(''); setAppointmentDate(defaultDate); setReason('');
    setChanges({}); setDone(false); setSubmitError('');
  };

  const handleConfirm = async () => {
    if (!selectedMember) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const changeList = Array.from(selectedFields).map((f) => ({
        field: f,
        before: selectedMember.fieldValues?.[f] ?? '',
        after: changes[f] ?? '',
      }));
      await onSubmit?.({
        userId: selectedMember.id,
        type: appointmentType,
        date: appointmentDate,
        reason,
        changes: changeList,
      });
      setDone(true);
    } catch (err) {
      // 실패를 삼키고 '발령 완료' 를 띄우면 어드민은 반영된 줄 알고 화면을 닫는다.
      setSubmitError(err?.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="admin-snap-done">
        <div className="admin-snap-done-icon">✓</div>
        <div className="admin-snap-done-title">{labels.appointmentDone}</div>
        <button type="button" className="admin-emp-btn is-soft" onClick={reset}>{labels.cancel}</button>
      </div>
    );
  }

  return (
    <div className="admin-snap-canvas">
      <div className="admin-snap-appt-grid">
        <div className="admin-snap-panel">
          <p className="admin-snap-panel-head">{labels.target}</p>
          <input
            className="admin-snap-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={labels.searchMember}
          />
          <div className="admin-snap-target-list">
            {filtered.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`admin-snap-target-item${selectedMember?.id === m.id ? ' is-selected' : ''}`}
                onClick={() => setSelectedMember(m)}
              >
                <div>
                  <div className="admin-snap-target-name">{m.name}</div>
                  <div className="admin-snap-target-meta">
                    {m.employeeCode && <span className="admin-snap-mono">{m.employeeCode}</span>}
                    {m.title && <span> · {m.title}</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="admin-snap-panel">
          <p className="admin-snap-panel-head">{labels.selectFields}</p>
          <div className="admin-snap-fieldchips">
            {changeableFields.map((f) => (
              <button
                key={f}
                type="button"
                className={`admin-snap-chip${selectedFields.has(f) ? ' is-on' : ''}`}
                onClick={() => toggleField(f)}
              >
                {selectedFields.has(f) ? '✓ ' : ''}{labels.fieldLabels[f] ?? f}
              </button>
            ))}
          </div>

          <div className="admin-snap-appt-info" style={{ marginTop: 16 }}>
            <div className="admin-snap-field">
              <label className="admin-snap-field-label">{labels.appointmentType}</label>
              <select className="admin-snap-select" value={appointmentType} onChange={(e) => setAppointmentType(e.target.value)}>
                <option value="">{labels.selectPlaceholder}</option>
                {appointmentTypes.map((at) => <option key={at} value={at}>{labels.typeLabels[at] ?? at}</option>)}
              </select>
            </div>
            <div className="admin-snap-field">
              <label className="admin-snap-field-label">{labels.appointmentDate}</label>
              <input type="date" className="admin-snap-input" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} />
            </div>
            <div className="admin-snap-field">
              <label className="admin-snap-field-label">{labels.reason}</label>
              <input className="admin-snap-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={labels.reasonPlaceholder} />
            </div>
          </div>

          {selectedFields.size > 0 && selectedMember ? (
            <div className="admin-snap-card-section">
              <table className="admin-snap-ba-table">
                <thead>
                  <tr>
                    <th>{labels.selectFields}</th>
                    <th>{labels.fieldBefore}</th>
                    <th aria-hidden="true" />
                    <th>{labels.fieldAfter}</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(selectedFields).map((f) => {
                    const opts = fieldOptions[f] ?? [];
                    const useSelect = selectFieldKeys.includes(f) && opts.length > 0;
                    return (
                      <tr key={f}>
                        <td className="admin-snap-ba-field">{labels.fieldLabels[f] ?? f}</td>
                        <td className="admin-snap-ba-before">{selectedMember.fieldValues?.[f] || '—'}</td>
                        <td className="admin-snap-ba-arrow">→</td>
                        <td>
                          {useSelect ? (
                            <select
                              className="admin-snap-select"
                              value={changes[f] ?? ''}
                              onChange={(e) => setChanges((p) => ({ ...p, [f]: e.target.value }))}
                            >
                              <option value="">{labels.selectPlaceholder}</option>
                              {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : (
                            <input
                              className="admin-snap-input is-mono"
                              value={changes[f] ?? ''}
                              onChange={(e) => setChanges((p) => ({ ...p, [f]: e.target.value }))}
                              placeholder={labels.selectPlaceholder}
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="admin-snap-empty-fields">{labels.noFieldsSelected}</div>
          )}

          {submitError && (
            <div className="admin-snap-warnbox" role="alert">{submitError}</div>
          )}
          <div className="admin-snap-actions">
            <button type="button" className="admin-emp-btn is-soft" onClick={reset}>{labels.cancel}</button>
            <button
              type="button"
              className="admin-emp-btn is-primary"
              onClick={handleConfirm}
              disabled={!selectedMember || selectedFields.size === 0 || !appointmentDate || submitting}
            >
              {labels.confirmAppointment}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
 * 3. 인사발령 대량
 * ════════════════════════════════════════════════════════════ */
/* 상태 아이콘 — 이모지 글리프 대신 인라인 SVG(색은 부모 color 상속). */
function StatusIcon({ tone, size = 12 }) {
  const path = tone === 'ok'
    ? <polyline points="20 6 9 17 4 12" />
    : tone === 'error'
      ? <><circle cx="12" cy="12" r="9" /><line x1="8" y1="12" x2="16" y2="12" /></>
      : <><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {path}
    </svg>
  );
}

/* ── 인사 발령 — 대량 ────────────────────────────────────────
   겸직(다중 소속)은 행을 나누지 않고 조직경로 한 칸에 `|` 배열로 넣는다
   (org-snapshot-spec.md §3-A). 파싱·검증 규칙은 소비자가 `parseUpload` 로
   주입한다 — 조직 트리·현재 소속·조직장 같은 판정 근거가 앱에 있기 때문이다. */
function AppointmentBulkView({
  members, bulkFields, labels, onSubmit, defaultDate = '',
  parseUpload, onFixPrimary, affiliationTemplate,
}) {
  const [step, setStep] = useState(1);
  const [selectedColumns, setSelectedColumns] = useState(() => new Set());
  const [file, setFile] = useState(null);
  const [reason, setReason] = useState('');
  // 발령 일자는 비워 두지 않는다 — 빈 값으로 확정하면 서버가 400 을 돌려주는데
  // 화면에는 아무 설명도 남지 않아 "확정이 안 눌린다" 로 보인다.
  const [date, setDate] = useState(defaultDate);
  const [previewRows, setPreviewRows] = useState([]);
  const [affiliationMode, setAffiliationMode] = useState(false);
  const [parseError, setParseError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const fileInputRef = useRef(null);

  const fields = Array.from(selectedColumns);
  const okRows = previewRows.filter((r) => r.status === 'ok');
  // 겸직 미리보기에서는 조직경로가 '소속 변경' 열로 이미 표현된다 — 같은 값을
  // '변경 전/후 조직경로' 로 한 번 더 두면 늘 비어 있는 빈 열이 남는다.
  const previewFields = affiliationMode ? fields.filter((f) => f !== 'orgPath') : fields;
  const warnRows = previewRows.filter((r) => r.status === 'warn');
  const errorRows = previewRows.filter((r) => r.status === 'error');
  // 확정 대상 = 정상 + 경고(진행 가능). 제외 행은 빠진다(§3-A-3).
  const applicableRows = previewRows.filter((r) => r.status !== 'error');

  const toggleColumn = (f) => setSelectedColumns((prev) => {
    const next = new Set(prev);
    if (next.has(f)) next.delete(f); else next.add(f);
    return next;
  });

  /* 템플릿 — 겸직 열(주소속·조직장)과 **실제 겸직 샘플 행**을 함께 싣는다.
     빈 행만 주면 HR 이 구분자를 모른 채 행을 쪼개고, 그러면 뒤 행이 앞 행을
     덮어써 겸직이 아니라 이동이 된다(B1 선언형 덮어쓰기). */
  const downloadTemplate = useCallback(() => {
    const fieldLabels = fields.map((f) => labels.fieldLabels[f] ?? f);
    const extraCols = affiliationTemplate?.columns ?? [];
    const headers = [labels.target, '사번', ...fieldLabels, ...extraCols];
    const sampleByField = affiliationTemplate?.sampleByField ?? {};
    const sample = [
      '홍길동', 'EMP001',
      ...fields.map((f) => sampleByField[f] ?? ''),
      ...(affiliationTemplate?.sample ?? extraCols.map(() => '')),
    ];
    const esc = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v);
    triggerCSVDownload(
      [headers.map(esc).join(','), sample.map(esc).join(',')].join('\n'),
      'pivit_appointment_template.csv',
    );
  }, [fields, labels, affiliationTemplate]);

  const parseUploaded = useCallback(async (f) => {
    const text = await f.text();
    // 소비자가 파서를 주입하면 겸직 검증(§3-A)을 그쪽 규칙으로 돌린다.
    if (parseUpload) {
      const parsed = parseUpload(text, { fields, fileName: f.name });
      setPreviewRows(parsed?.rows ?? []);
      setAffiliationMode(!!parsed?.hasAffiliationColumns);
      setParseError(parsed?.error ?? '');
      return;
    }
    const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return;
    const header = parseCSVLine(lines[0]);
    const codeIdx = header.findIndex((h) => h === '사번');
    const colMap = new Map();
    for (let i = 0; i < header.length; i++) {
      if (i === 0 || i === codeIdx) continue;
      const matched = bulkFields.find((fk) => (labels.fieldLabels[fk] ?? fk) === header[i]);
      if (matched) colMap.set(i, matched);
    }
    const rows = [];
    for (let r = 1; r < lines.length; r++) {
      const cols = parseCSVLine(lines[r]);
      const name = cols[0]?.trim() ?? '';
      if (!name) continue;
      const code = codeIdx >= 0 ? (cols[codeIdx]?.trim() ?? '') : '';
      let matched = code ? members.find((m) => m.employeeCode === code) : null;
      if (!matched) matched = members.find((m) => m.name === name) ?? null;
      const changes = {};
      colMap.forEach((fk, idx) => {
        const after = cols[idx]?.trim() ?? '';
        if (after) changes[fk] = { before: matched ? (matched.fieldValues?.[fk] ?? '-') : '-', after };
      });
      rows.push({ name, employeeCode: code || undefined, matchedMember: matched, changes, status: matched ? 'ok' : 'warn' });
    }
    setPreviewRows(rows);
    setAffiliationMode(false);
    setParseError('');
  }, [members, bulkFields, labels, parseUpload, fields]);

  // 파싱을 마쳐야 Step 3 으로 넘어간다 — 검증을 건너뛴 확정 경로를 두지 않는다.
  const acceptFile = (f) => {
    if (!f) return;
    setFile(f);
    Promise.resolve(parseUploaded(f)).then(() => setStep(3));
  };
  const onFileChange = (e) => acceptFile(e.target.files?.[0]);
  const onDrop = (e) => {
    e.preventDefault();
    acceptFile(e.dataTransfer.files?.[0]);
  };

  /* 주 소속 인라인 수정(§3-A-3) — 소비자가 재검증한 행으로 갈아 끼운다. */
  const fixPrimary = (row, value) => {
    if (!onFixPrimary) return;
    const next = onFixPrimary(row, value);
    if (!next) return;
    setPreviewRows((prev) => prev.map((r) => (r === row ? next : r)));
  };

  const handleConfirm = async () => {
    if (applicableRows.length === 0) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await onSubmit?.({
        rows: applicableRows
          .filter((r) => r.memberId || r.matchedMember)
          .map((r) => ({
            memberId: r.memberId ?? r.matchedMember.id,
            changes: r.fieldChanges ?? r.changes ?? {},
            ...(r.teams ? { affiliation: { teams: r.teams, primary: r.primary, leaders: r.leaders ?? [] } } : {}),
          })),
        date,
        reason,
        fields,
      });
      setDone(true);
    } catch (err) {
      // 실패를 삼키고 '발령 완료' 를 띄우면 어드민은 반영된 줄 알고 화면을 닫는다.
      setSubmitError(err?.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setStep(1); setSelectedColumns(new Set()); setFile(null);
    setReason(''); setDate(defaultDate); setPreviewRows([]); setDone(false);
    setAffiliationMode(false); setParseError(''); setSubmitError('');
  };

  if (done) {
    return (
      <div className="admin-snap-done">
        <div className="admin-snap-done-icon">✓</div>
        <div className="admin-snap-done-title">{labels.appointmentDone}</div>
        <div className="admin-snap-done-sub">{labels.okCount} {applicableRows.length}{labels.countUnit}</div>
        <button type="button" className="admin-emp-btn is-soft" onClick={reset}>{labels.cancel}</button>
      </div>
    );
  }

  const steps = [
    { num: 1, label: labels.stepSelectFields },
    { num: 2, label: labels.stepFileUpload },
    { num: 3, label: labels.stepValidate },
  ];

  return (
    <div className="admin-snap-canvas">
      <div className="admin-snap-steps">
        {steps.map((s, idx) => (
          <div key={s.num} style={{ display: 'flex', alignItems: 'center' }}>
            <div
              className={`admin-snap-step${step > s.num ? ' admin-snap-step-clickable' : ''}`}
              onClick={() => { if (step > s.num) setStep(s.num); }}
            >
              <div className={`admin-snap-step-badge${step >= s.num ? ' is-active' : ''}`}>
                {step > s.num ? '✓' : s.num}
              </div>
              <span className={`admin-snap-step-label${step === s.num ? ' is-active' : ''}`}>{s.label}</span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`admin-snap-step-connector${step > s.num ? ' is-done' : ''}`} />
            )}
          </div>
        ))}
      </div>

      <div className="admin-snap-content">
        {step === 1 && (
          <div>
            <p className="admin-snap-subheading">{labels.selectColumns}</p>
            <div className="admin-snap-fieldchips" style={{ marginBottom: 16 }}>
              {bulkFields.map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`admin-snap-chip${selectedColumns.has(f) ? ' is-on' : ''}`}
                  onClick={() => toggleColumn(f)}
                >
                  {selectedColumns.has(f) ? '✓ ' : ''}{labels.fieldLabels[f] ?? f}
                </button>
              ))}
            </div>
            {selectedColumns.size > 0 && (
              <div className="admin-snap-hint">
                {labels.selectedColumnsPrefix}: <strong>{fields.map((f) => labels.fieldLabels[f] ?? f).join(', ')}</strong>
              </div>
            )}
            <div className="admin-snap-actions">
              <button type="button" className="admin-emp-btn is-primary" disabled={selectedColumns.size === 0} onClick={() => setStep(2)}>
                {labels.next} →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <button type="button" className="admin-emp-btn is-soft" onClick={downloadTemplate}>↓ {labels.downloadTemplate}</button>
              <span className="admin-snap-dropzone-sub" style={{ marginTop: 0 }}>
                {labels.templateColumnsPrefix} {fields.map((f) => labels.fieldLabels[f] ?? f).join(', ')} {labels.templateColumnsSuffix}
              </span>
            </div>
            <div className="admin-snap-field" style={{ marginBottom: 16 }}>
              <label className="admin-snap-field-label">{labels.reason}</label>
              <input className="admin-snap-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={labels.bulkReasonPlaceholder} />
            </div>
            <div
              className={`admin-snap-dropzone${file ? ' is-loaded' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <input ref={fileInputRef} type="file" accept=".xlsx,.csv" onChange={onFileChange} style={{ display: 'none' }} />
              <div className="admin-snap-dropzone-icon">📄</div>
              {file ? (
                <div className="admin-snap-dropzone-title">{file.name}</div>
              ) : (
                <>
                  <div className="admin-snap-dropzone-title">{labels.dragOrClick}</div>
                  <div className="admin-snap-dropzone-sub">{labels.supportedFormats}</div>
                </>
              )}
            </div>
            {/* 겸직 포맷 안내 — 구분자를 모르면 행을 쪼개고, 그러면 뒤 행이 앞 행을 덮어쓴다(B1). */}
            {affiliationTemplate && (
              <div className="admin-snap-hint">
                <strong>{labels.affFormatTitle}</strong> {labels.affFormatBody}
                <br />
                {labels.affFormatRule}
              </div>
            )}
            {parseError && (
              <div className="admin-snap-hint" role="alert" style={{ color: 'var(--colors-warning-600, #dc6803)' }}>
                {parseError}
              </div>
            )}
            <div className="admin-snap-actions">
              <button type="button" className="admin-emp-btn is-soft" onClick={() => setStep(1)}>← {labels.prev}</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="admin-snap-status-badges">
              <span className="admin-snap-status-badge is-ok">
                <StatusIcon tone="ok" /> {labels.okCount} {okRows.length}{labels.countUnit}
              </span>
              {warnRows.length > 0 && (
                <span className="admin-snap-status-badge is-warn">
                  <StatusIcon tone="warn" /> {labels.warnCount} {warnRows.length}{labels.countUnit}
                </span>
              )}
              {errorRows.length > 0 && (
                <span className="admin-snap-status-badge is-error">
                  <StatusIcon tone="error" /> {labels.errorCount} {errorRows.length}{labels.countUnit}
                </span>
              )}
            </div>
            {/* B2 — 선언형 덮어쓰기의 파괴성을 확정 전에 반드시 알린다. 이 문장이 없으면
                어드민이 "추가만 되는" 동작을 기대하고 남의 겸직을 통째로 날린다. */}
            {affiliationMode && (
              <div className="admin-snap-warnbox">{labels.affOverwriteWarning}</div>
            )}
            {previewRows.length > 0 ? (
              <div className="admin-snap-preview-scroll">
                <table className="admin-snap-preview-table">
                  <thead>
                    <tr>
                      <th>{labels.target}</th>
                      {affiliationMode && (
                        <>
                          <th>{labels.affColChange}</th>
                          <th>{labels.affColPrimary}</th>
                          <th>{labels.affColLeader}</th>
                          <th>{labels.affColRole}</th>
                        </>
                      )}
                      {previewFields.map((f) => <th key={`b-${f}`}>{labels.fieldBefore} {labels.fieldLabels[f] ?? f}</th>)}
                      {previewFields.length > 0 && <th aria-hidden="true" />}
                      {previewFields.map((f) => <th key={`a-${f}`}>{labels.fieldAfter} {labels.fieldLabels[f] ?? f}</th>)}
                      <th>{labels.historyDetail}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => {
                      const changes = row.fieldChanges ?? row.changes ?? {};
                      return (
                        <tr key={i} className={row.status === 'warn' ? 'is-warn' : row.status === 'error' ? 'is-error' : undefined}>
                          <td className="admin-snap-pv-name">{row.name || '—'}</td>
                          {affiliationMode && (
                            <>
                              <td>
                                {(row.added ?? []).map((tPath) => (
                                  <div key={`add-${tPath}`} className="admin-snap-aff-add">+ {tPath}</div>
                                ))}
                                {(row.removed ?? []).map((tPath) => (
                                  <div key={`rm-${tPath}`} className="admin-snap-aff-remove">− {tPath}</div>
                                ))}
                                {(row.added ?? []).length === 0 && (row.removed ?? []).length === 0 && (
                                  <span className="admin-snap-pv-before">{labels.affNoChange}</span>
                                )}
                              </td>
                              <td>
                                {/* 주소속 미지정·불일치는 여기서 바로 고칠 수 있다(§3-A-3). */}
                                {onFixPrimary && (row.primaryOptions ?? []).length > 1 ? (
                                  <select
                                    className="admin-snap-input"
                                    aria-label={labels.affSelectPrimary}
                                    value={row.primary || ''}
                                    onChange={(e) => fixPrimary(row, e.target.value)}
                                  >
                                    <option value="">{labels.affSelectPrimary}</option>
                                    {(row.primaryOptions ?? []).map((opt) => (
                                      <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="admin-snap-pv-after">{row.primary || '—'}</span>
                                )}
                              </td>
                              <td>
                                {(row.leaders ?? []).length
                                  ? (row.leaders ?? []).map((l) => <div key={l}>{l}</div>)
                                  : <span className="admin-snap-pv-before">—</span>}
                              </td>
                              <td>
                                {row.promote
                                  ? <span className="admin-snap-aff-promote">{labels.affPromote}</span>
                                  : <span className="admin-snap-pv-before">{labels.affNoChange}</span>}
                              </td>
                            </>
                          )}
                          {previewFields.map((f) => <td key={`b-${f}`} className="admin-snap-pv-before">{changes[f]?.before ?? '-'}</td>)}
                          {previewFields.length > 0 && <td className="admin-snap-ba-arrow">→</td>}
                          {previewFields.map((f) => <td key={`a-${f}`} className="admin-snap-pv-after">{changes[f]?.after ?? '-'}</td>)}
                          <td>
                            {row.status === 'ok' && (
                              <span className="admin-snap-pv-status-ok"><StatusIcon tone="ok" /> {labels.statusOk}</span>
                            )}
                            {row.status === 'warn' && (
                              <span className="admin-snap-pv-status-warn"><StatusIcon tone="warn" /> {labels.warnCount}</span>
                            )}
                            {row.status === 'error' && (
                              <span className="admin-snap-pv-status-error"><StatusIcon tone="error" /> {labels.statusError}</span>
                            )}
                            {(row.messages ?? []).map((m, mi) => (
                              <div
                                key={mi}
                                className={m.severity === 'error' ? 'admin-snap-aff-msg is-error' : 'admin-snap-aff-msg is-warn'}
                              >
                                {m.text}
                              </div>
                            ))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="admin-snap-empty">{labels.bulkPreviewPending}</div>
            )}
            <div className="admin-snap-appt-info" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 0 }}>
              <div className="admin-snap-field">
                <label className="admin-snap-field-label">{labels.appointmentDate}</label>
                <input type="date" className="admin-snap-input" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="admin-snap-field">
                <label className="admin-snap-field-label">{labels.reason}</label>
                <input className="admin-snap-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={labels.bulkReasonPlaceholder} />
              </div>
            </div>
            {submitError && (
              <div className="admin-snap-warnbox" role="alert">{submitError}</div>
            )}
            <div className="admin-snap-actions" style={{ justifyContent: 'space-between' }}>
              <button type="button" className="admin-emp-btn is-soft" onClick={() => setStep(2)}>← {labels.prev}</button>
              {/* 확정 대상 = 정상 + 경고. 0건이면 누를 수 없다(§3-A-3). */}
              <button type="button" className="admin-emp-btn is-primary" disabled={applicableRows.length === 0 || !date || submitting} onClick={handleConfirm}>
                {labels.confirmBulkPrefix} ({applicableRows.length}{labels.countUnit})
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
 * 4. 발령 이력
 * ════════════════════════════════════════════════════════════ */
function AppointmentHistoryView({ records, labels, onExport }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return records;
    const q = searchQuery.toLowerCase();
    return records.filter((r) => (r.name ?? '').toLowerCase().includes(q));
  }, [records, searchQuery]);

  if (records.length === 0) {
    return <div className="admin-snap-empty">{labels.historyEmpty}</div>;
  }

  return (
    <div className="admin-snap-canvas">
      <div className="admin-snap-hist-layout">
        <div className="admin-snap-hist-main">
          <div className="admin-snap-hist-toolbar">
            <input
              className="admin-snap-search admin-snap-hist-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={labels.searchEmployee}
            />
            <button type="button" className="admin-snap-export-btn" onClick={() => onExport?.()}>↓ {labels.export}</button>
          </div>
          <div className="admin-snap-hist-tablewrap">
            <table className="admin-snap-hist-table">
              <thead>
                <tr>
                  <th>{labels.historyDate}</th>
                  <th>{labels.historyTarget}</th>
                  <th>{labels.historyType}</th>
                  <th>{labels.historyMode}</th>
                  <th>{labels.historyHandler}</th>
                  <th aria-hidden="true" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((rec) => (
                  <tr
                    key={rec.id}
                    className={`admin-snap-hist-row${selected?.id === rec.id ? ' is-selected' : ''}`}
                    onClick={() => setSelected(rec)}
                  >
                    <td className="admin-snap-hist-date">{rec.date ?? '-'}</td>
                    <td className="admin-snap-hist-name">{rec.name ?? '-'}</td>
                    <td>
                      <span className={`admin-snap-type-badge is-${TYPE_TONE[rec.typeKey] ?? 'gray'}`}>
                        {rec.typeKey ? (labels.typeLabels[rec.typeKey] ?? rec.typeKey) : '-'}
                      </span>
                    </td>
                    <td className={`admin-snap-hist-mode${rec.mode === 'bulk' ? ' is-bulk' : ''}`}>
                      {rec.mode === 'bulk' ? labels.historyModeBulk : labels.historyModeSingle}
                    </td>
                    <td className="admin-snap-hist-mode">{rec.by ?? '-'}</td>
                    <td><span className="admin-snap-hist-detaillink">{labels.historyDetail} ▸</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selected && (
          <div className="admin-snap-hist-panel">
            <div className="admin-snap-hist-panel-head">
              <div>
                <div className="admin-snap-hist-panel-name">{selected.name}</div>
                <div className="admin-snap-hist-panel-meta">
                  <span className="admin-snap-mono">{selected.date}</span>
                  {' · '}
                  {selected.typeKey ? (labels.typeLabels[selected.typeKey] ?? selected.typeKey) : '-'}
                </div>
              </div>
              <button type="button" className="admin-snap-hist-panel-close" onClick={() => setSelected(null)}>×</button>
            </div>
            <div className="admin-snap-hist-panel-body">
              {selected.changes && selected.changes.length > 0 && (
                <table className="admin-snap-ba-table">
                  <thead>
                    <tr>
                      <th>{labels.historyField}</th>
                      <th>{labels.fieldBefore}</th>
                      <th>{labels.fieldAfter}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.changes.map((ch, i) => (
                      <tr key={i}>
                        <td className="admin-snap-ba-field">{labels.fieldLabels[ch.field] ?? ch.field}</td>
                        <td className="admin-snap-ba-before">{ch.before || '-'}</td>
                        <td className="admin-snap-ba-after">{ch.after || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {selected.reason && (
                <>
                  <div className="admin-snap-hist-reason-label">{labels.historyReason}</div>
                  <div className="admin-snap-hist-reason">{selected.reason}</div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
 * 5. As Of — 시점별 조직 스냅샷 (타임머신)
 * ════════════════════════════════════════════════════════════ */
/**
 * As Of(시점별 조직 스냅샷) — org-snapshot-spec §5 · screen-admin-snapshot-asof.policy.md
 *
 * 🔴 빈 상태는 **두 가지뿐이고 문구가 서로 달라야 한다**(§5-A · PW-139):
 *   C1 기록 시작 전(`out_of_range`) — 기록의 부재. 요약 카드 전부 `—`, CSV 비활성,
 *      톤은 중립 회색(사용자가 잘못한 게 아니다. 앰버는 타임머신 배너 전용).
 *   C2 그 시점 재직 0명(`full` 인데 명단 0) — 사실의 확인. 카드는 `0` 을 쓴다.
 *
 * 이 둘을 한 화면으로 보여 준 것이 PW-139 다. 분기는 **서버가 준 `meta.state`** 로
 * 하고 `totalMembers === 0` 으로 추측하지 않는다 — 추측하면 둘이 다시 합쳐진다.
 */
function AsOfSnapshotView({
  data, labels, asOfDate, today, coverageFrom, onAsOfDateChange, showComp, onShowCompChange,
  onExport, onRosterMemberClick,
}) {
  const { presets = [], meta = null, delta = null, roster = [], totalMembers = 0 } = data;
  const isPast = !!asOfDate && asOfDate !== today;
  // 커버리지 하한은 prop 우선, 없으면 응답 메타. 옛 백엔드와 섞여도 화면이 죽지 않는다.
  const minDate = coverageFrom || meta?.coverageFrom || undefined;
  const isOut = meta?.state === 'out_of_range';
  // C2 는 "재구성은 **됐는데** 그날 아무도 없었다" 이다 — 사실 주장이므로 재구성이
  // 실제로 성공했을 때만 쓴다. 응답이 없거나 실패해서 명단이 빈 것을 C2 로 그리면
  // "그날 아무도 없었다" 고 없는 사실을 만들어 낸다(이 티켓이 고치는 것과 같은 오류).
  const reconstructed = meta?.state === 'full' || meta?.state === 'partial';
  const isEmptyFact = !isOut && reconstructed && roster.length === 0;
  // 재구성 여부를 모른 채 명단만 빈 경우 — 중립 문구로 남긴다.
  const isEmptyUnknown = !isOut && !reconstructed && roster.length === 0 && isPast;
  // 그 날짜의 증빙 고정본에서 온 값인가(S2). 배지는 AI 출처 표기가 아니라 시점 출처다.
  const fromFixedCopy = meta?.reconstructedFrom === 'snapshot' && !!meta?.snapshotDate;

  // ⚠️ 0 금지 규칙 — 재구성 불가일 때 숫자 0 을 쓰지 않는다. "0명" 은 "그날 아무도
  // 없었다" 는 사실 주장이고, 실제로는 "그날은 기록이 없다" 이다.
  const dash = '—';
  const cards = [
    { key: 'total', value: isOut ? dash : totalMembers },
    { key: 'joined', value: isOut || !delta ? dash : `+${delta.joinedCount}` },
    { key: 'left', value: isOut || !delta ? dash : `-${delta.leftCount}` },
    {
      key: 'moved',
      value: isOut || !delta ? dash : delta.movedCount + (delta.statusChangedCount ?? 0),
    },
  ];

  return (
    <div className="admin-snap-canvas">
      <header className="admin-snap-header">
        <div>
          <div className="admin-snap-header-title">{labels.asofTitle}</div>
          <div className="admin-snap-header-sub">{labels.asofSubtitle}</div>
        </div>
        <div className="admin-snap-header-actions">
          <label className="admin-snap-comp-toggle">
            <input
              type="checkbox"
              checked={!!showComp}
              onChange={(e) => onShowCompChange?.(e.target.checked)}
            />
            {labels.asofShowComp}
          </label>
          <div>
            <div className="admin-snap-datepicker">
              <span className="admin-snap-datepicker-label">{labels.asofPresetLabel}</span>
              {/* 미래 시점은 재구성할 이력이 없다 — max 로 선택 자체를 막는다.
                  min 은 커버리지 하한 — 그 이전은 어떤 소스로도 재구성할 수 없다. */}
              <input
                type="date"
                min={minDate}
                max={today}
                value={asOfDate}
                onChange={(e) => onAsOfDateChange?.(e.target.value)}
              />
            </div>
            {/* 상시 캡션 — 경계를 만난 뒤 알리면 늦다(정책 §2-1) */}
            {labels.asofCoverageCaption && (
              <div className="admin-snap-coverage-caption" data-testid="asof-coverage-caption">
                {labels.asofCoverageCaption}
              </div>
            )}
          </div>
          {/* 0행 CSV 를 내보내면 "그날 아무도 없었다" 는 문서가 밖으로 나간다 */}
          <button
            type="button"
            className="admin-snap-export-btn"
            disabled={isOut}
            title={isOut ? labels.asofOutOfRangeTitle : undefined}
            onClick={() => onExport?.()}
          >
            ↓ {labels.asofExport}
          </button>
        </div>
      </header>

      {/* 프리셋 — 커버리지 밖 칩은 호출부에서 걸러진다. 비활성 칩을 남기면
          "누르면 되는데 왜 안 되지" 가 되므로 아예 렌더하지 않는다(§5). */}
      <div className="admin-snap-presets">
        <button
          type="button"
          className={`admin-snap-preset${!isPast ? ' is-active' : ''}`}
          onClick={() => onAsOfDateChange?.(today)}
        >
          {labels.asofToday}
        </button>
        {presets.map((p) => (
          <button
            key={p.key}
            type="button"
            data-testid={`asof-preset-${p.date}`}
            className={`admin-snap-preset${asOfDate === p.date ? ' is-active' : ''}`}
            onClick={() => onAsOfDateChange?.(p.date)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* 타임머신 배너 — 앰버는 여기에만. C1 은 중립 톤이다(§5-A) */}
      {isPast && !isOut && (
        <div className="admin-snap-timemachine" role="status">
          <span>{String(labels.asofBanner).replace('{date}', asOfDate)}</span>
          <button type="button" onClick={() => onAsOfDateChange?.(today)}>
            {labels.asofBackToToday}
          </button>
        </div>
      )}

      <div className="admin-snap-summary-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
        {cards.map((c) => (
          <div key={c.key} className="admin-snap-summary-card">
            <p className="admin-snap-summary-label">{labels.asofCards[c.key]}</p>
            <p className="admin-snap-summary-value" data-testid={`asof-card-${c.key}`}>{c.value}</p>
            {isOut && <p className="admin-snap-summary-norecord">{labels.asofNoRecord}</p>}
          </div>
        ))}
      </div>

      <div className="admin-snap-content">
        {isOut ? (
          <div className="admin-snap-empty admin-snap-empty-coverage" data-testid="asof-empty-c1">
            <div className="admin-snap-empty-title">{labels.asofOutOfRangeTitle}</div>
            <div className="admin-snap-empty-body">{labels.asofOutOfRangeBody}</div>
            <div className="admin-snap-empty-actions">
              {minDate && (
                <button type="button" className="admin-snap-empty-primary" onClick={() => onAsOfDateChange?.(minDate)}>
                  {labels.asofGoToCoverage}
                </button>
              )}
              <button type="button" onClick={() => onAsOfDateChange?.(today)}>
                {labels.asofBackToToday}
              </button>
            </div>
          </div>
        ) : isEmptyFact ? (
          <div className="admin-snap-empty" data-testid="asof-empty-c2">
            <div className="admin-snap-empty-body">{labels.asofEmptyFact || labels.asofEmpty}</div>
            <div className="admin-snap-empty-actions">
              <button type="button" onClick={() => onAsOfDateChange?.(today)}>
                {labels.asofBackToToday}
              </button>
            </div>
          </div>
        ) : isEmptyUnknown ? (
          <div className="admin-snap-empty" data-testid="asof-empty-unknown">
            {labels.asofEmpty}
          </div>
        ) : (
          <RosterTable
            rows={roster}
            labels={labels}
            showSalary={!!showComp && roster.some((r) => r.salary !== undefined)}
            changedHint={(col, row) => `${labels.roster[col]} · ${row.name}`}
            onMemberClick={onRosterMemberClick}
            rowBadge={fromFixedCopy ? {
              label: labels.asofFixedCopy,
              title: labels.asofFixedCopyHint,
            } : null}
          />
        )}
      </div>
      {/* partial 은 명단을 가리지 않는다 — 한 줄만 붙인다(§5-A) */}
      {meta?.state === 'partial' && !isOut && (
        <p className="admin-snap-footnote">{labels.asofPartialNote}</p>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
 * Wrapper — 서브뷰 탭 + 라우팅
 * ════════════════════════════════════════════════════════════ */
export default function OrgSnapshotCanvas({
  view = 'snapshot',
  onViewChange,
  loading = false,
  // 현황
  snapshot = {},
  queryDate = '',
  onQueryDateChange,
  snapshotTab = 'summary',
  onSnapshotTabChange,
  onExportSnapshot,
  onExportRoster,
  onDrilldown,
  onRosterMemberClick,
  // As Of (시점별 조직 스냅샷)
  asOf = {},
  asOfDate = '',
  today = '',
  /** 조회 가능 하한 — 피커 min · C1 문구 · '기록 시작' 캡션이 공유한다(PW-139). */
  coverageFrom = '',
  onAsOfDateChange,
  showComp = false,
  onShowCompChange,
  onExportAsOf,
  // 발령 공통
  members = [],
  fieldOptions = {},
  changeableFields = [],
  bulkFields = [],
  selectFieldKeys = [],
  appointmentTypes = [],
  onSubmitSingle,
  onSubmitBulk,
  /**
   * 겸직 CSV 파서 주입(§3-A). `(text, {fields, fileName}) => { rows, summary,
   * hasAffiliationColumns, error }`. 조직 트리·현재 소속·조직장 같은 판정 근거가
   * 앱에 있으므로 검증 규칙은 소비자가 갖는다. 없으면 기존 필드 파서로 동작한다.
   */
  parseBulkUpload,
  /** 미리보기에서 주 소속을 고쳤을 때 재검증한 행을 돌려준다. `(row, value) => row` */
  onFixBulkPrimary,
  /** 템플릿에 덧붙일 겸직 열/샘플: `{ columns: [], sample: [], sampleByField: {} }` */
  bulkAffiliationTemplate,
  // 이력
  historyRecords = [],
  onExportHistory,
  labels: providedLabels,
}) {
  const labels = merge(DEFAULT_LABELS, providedLabels);
  const [internalTab, setInternalTab] = useState(snapshotTab);
  const activeTab = onSnapshotTabChange ? snapshotTab : internalTab;
  const setTab = onSnapshotTabChange || setInternalTab;

  // As Of 는 시점 조회 전용 서브탭이다(org-snapshot-spec §5). 호스트가 배선하지
  // 않으면(onAsOfDateChange 없음) 탭 자체를 숨겨 죽은 탭을 만들지 않는다.
  const viewKeys = onAsOfDateChange
    ? ['snapshot', 'single', 'bulk', 'history', 'asof']
    : ['snapshot', 'single', 'bulk', 'history'];

  return (
    <div className="admin-snap-canvas">
      <div className="admin-snap-viewtabs">
        {viewKeys.map((v) => (
          <button
            key={v}
            type="button"
            className={`admin-snap-viewtab${view === v ? ' is-active' : ''}`}
            onClick={() => onViewChange?.(v)}
          >
            {labels.views[v]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="admin-snap-loading">{labels.loading}</div>
      ) : (
        <>
          {view === 'snapshot' && (
            <OrgSnapshotStatusView
              data={snapshot}
              labels={labels}
              queryDate={queryDate}
              onQueryDateChange={onQueryDateChange}
              onExport={onExportSnapshot}
              onExportRoster={onExportRoster}
              activeTab={activeTab}
              onTabChange={setTab}
              onDrilldown={onDrilldown}
              onRosterMemberClick={onRosterMemberClick}
              showComp={showComp}
              onShowCompChange={onShowCompChange}
            />
          )}
          {view === 'asof' && (
            <AsOfSnapshotView
              data={asOf}
              labels={labels}
              asOfDate={asOfDate}
              today={today}
              coverageFrom={coverageFrom}
              onAsOfDateChange={onAsOfDateChange}
              showComp={showComp}
              onShowCompChange={onShowCompChange}
              onExport={onExportAsOf}
              onRosterMemberClick={onRosterMemberClick}
            />
          )}
          {view === 'single' && (
            <AppointmentSingleView
              members={members}
              fieldOptions={fieldOptions}
              changeableFields={changeableFields}
              selectFieldKeys={selectFieldKeys}
              appointmentTypes={appointmentTypes}
              labels={labels}
              onSubmit={onSubmitSingle}
              defaultDate={today}
            />
          )}
          {view === 'bulk' && (
            <AppointmentBulkView
              members={members}
              bulkFields={bulkFields}
              labels={labels}
              onSubmit={onSubmitBulk}
              defaultDate={today}
              parseUpload={parseBulkUpload}
              onFixPrimary={onFixBulkPrimary}
              affiliationTemplate={bulkAffiliationTemplate}
            />
          )}
          {view === 'history' && (
            <AppointmentHistoryView
              records={historyRecords}
              labels={labels}
              onExport={onExportHistory}
            />
          )}
        </>
      )}
    </div>
  );
}
