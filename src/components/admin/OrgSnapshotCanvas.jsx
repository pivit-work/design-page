import { useState, useMemo, useRef, useCallback } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';
import Tooltip from '../shared/Tooltip.jsx';
import EmptyState from '../shared/EmptyState.jsx';
import Button from '../shared/Button.jsx';
import { applyJobAxisChange, jobAxisNoticeText, JOB_AXIS_DEFAULT_LABELS } from './jobAxis.js';
import JobAxisSelect from './JobAxisSelect.jsx';
import { IconUpload } from './employeesIcons.jsx';
import DateInput from '../shared/DateInput.jsx';
import { LockGlyph } from '../shared/lineIcons.jsx';
import { groupHistoryRows } from './appointmentHistoryRows.js';
import Tabs from '../shared/Tabs.jsx';
import SegmentedControl from '../shared/SegmentedControl.jsx';
import RosterTable from '../shared/RosterTable.jsx';
import { readCsvFileText } from '../shared/csvFileText.js';
import Pagination from '../shared/Pagination.jsx';
import LoadingState from '../shared/LoadingState.jsx';
import Skeleton, { SkeletonList } from '../shared/Skeleton.jsx';

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
  /* 직군 → 직렬 → 직무 3단 연동 안내·빈 목록 사유 (§3.5-A · PW-748) */
  ...JOB_AXIS_DEFAULT_LABELS,
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
  /* 명단 쪽 넘김 — 구성원 설정 목록과 같은 모양·문구 (2026-09-23 성능 점검). */
  rosterPagination: { of: '/', prev: '이전', next: '다음' },
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
  /** `{count}` 자리에 접힌 기록 시점 수가 들어간다. */
  asofPresetMore: '더 보기 +{count}',
  asofPresetLess: '접기',
  asofShowComp: '보상 표시',
  asofBackToToday: '현재로 복귀',
  asofExport: '조직 스냅샷 CSV',
  asofEmpty: '이 시점의 스냅샷이 없습니다',
  // 명단 조회 실패(5xx·네트워크)·시간 초과 — 정책 §3. 빈 명단으로 보이면 안 된다.
  asofLoadError: '명단을 불러오지 못했어요',
  asofLoadErrorTimeout: '잠시 후 다시 시도해 주세요',
  asofRetry: '다시 시도',
  /** `{date}` 자리에 기준일이 들어간다. */
  asofBanner: '{date} 시점으로 조회 중입니다',
  asofPartialNote: '옛 스냅샷이라 일부 열은 기록되지 않아 비어 있습니다',
  /** 그 날짜엔 아직 없던 열 안내(E18) — 비어 있으면 안 그린다. 앱이 열 이름을 넣어 만든다. */
  asofBlankColumnsNote: '',
  // 커버리지 경계 · 빈 상태 2종 (org-snapshot-spec §5-A · PW-139).
  // C1 = 기록의 부재, C2 = 사실의 확인. 문구를 서로 바꿔 쓰지 않는다.
  asofCoverageCaption: '',
  asofNoRecord: '기록 없음',
  asofOutOfRangeTitle: '기록이 시작된 날짜부터 조회할 수 있어요',
  asofOutOfRangeBody: '그 이전 조직 기록은 Pivit 에 남아 있지 않습니다.',
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
  // 탭 이름은 기획서 그대로 (org-snapshot-spec §1 레이아웃 — 인원 현황 | 고용 유형 | 직군/직렬 | 연령).
  tabs: { summary: '인원 현황', employment: '고용 유형', jobgroup: '직군/직렬', age: '연령' },
  orgTreeHeading: '조직 구성',
  noOrgStructure: '조직 구조 데이터가 없습니다',
  /** 조직 현황 탭 조회일 아래 상시 캡션 `기록 시작 {날짜}` — 비어 있으면 안 그린다(§1 · As Of 와 같은 하한). */
  statusCoverageCaption: '',
  /** 날짜만 바꾸고 [적용]을 안 눌렀을 때 — 결과는 직전 적용 기준 그대로다(§1 적용 버튼 방식). */
  applyHint: '적용을 눌러 조회하세요',
  /** 트리 행 인원 뒤 `+N 겸직` 의 «겸직» — 합계에 섞지 않는다(MC2). */
  concurrentSuffix: '겸직',
  /** 주 소속이 없는 재직자 행 이름(MC8). */
  unassigned: '미배정',
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
  // 「발령 완료」 화면의 버튼 — 이미 확정한 뒤라 되돌릴 것이 없다. 「취소」로 두면
  // 방금 한 발령을 무르는 버튼으로 읽힌다(PW-785).
  close: '닫기',
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
  // 미리보기 «소속 변경» 칸 — 줄이 많으면 앞 3줄만 두고 나머지는 +N 에 접는다(§3-A A7).
  affMoreLines: '+{n}',
  affDuplicatePrefix: '중복',
  // 오류 행이 섞여도 정상 행만 확정하거나, 아무것도 반영하지 않고 처음으로 돌아간다(§3).
  cancelAll: '전체 취소',
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
  /** 대량 발령 한 번을 접은 줄의 대상자 칸. `{count}` 자리에 사람 수 (org-snapshot-spec §4) */
  historyBulkAll: '전체 {count}명',
  historyPeriodFrom: '발령일 시작',
  historyPeriodTo: '발령일 끝',
  /** 상세 패널 아래 줄 — `{by}` 처리자 · `{at}` 처리 시각 (§4 상세 패널) */
  historyProcessed: '처리자: {by} · {at}',
  // 단건 발령 — 직렬이 직군 여럿에 걸릴 때 직군 행 아래 (§2 [L] 2026-08-07)
  apptFamilyRequired: '직군도 함께 선택해 주세요',
  /** 직함 행 🔒 말풍선 (§2 직함변경의 발령 주체) */
  titleLockHint: 'HR·소속 팀장 이상만 변경할 수 있습니다',
  // 예약 발령 (org-snapshot-spec §2 · §4 · PW-1422)
  /** 발령 일자가 오늘 이후일 때 그 칸 아래. `{date}` 자리에 발령일. */
  scheduledHint: '발령일({date})에 반영돼요. 그때까지 발령 이력에 예정으로 보이고, 발효 전에는 취소할 수 있어요',
  /** 같은 사람·같은 항목에 예정 건이 있을 때. `{date}` 발령일 · `{fields}` 항목 */
  pendingOverwriteAsk: '예정된 발령이 있어요({date} {fields}) — 덮어쓸까요?',
  pendingOverwriteConfirm: '덮어쓰기',
  historyScheduled: '예정',
  historyCancelScheduled: '발효 전 취소',
  // 구조 개정 (org-snapshot-spec §4 · §5)
  historyTypeAll: '전체 유형',
  historyTypeRevision: '구조 개정',
  revisionNo: '개정 번호',
  revisionSavedAt: '저장 시각',
  revisionSavedBy: '저장한 사람',
  revisionChangedUnits: '바뀐 단위 수',
  revisionEmpty: '구조 개정 이력이 없습니다',
  revisionUnit: '부서',
  revisionBefore: '개정 전',
  revisionAfter: '개정 후',
  revisionNoChanges: '바뀐 부서가 없습니다',
  revisionLoading: '불러오는 중…',
  /** As Of 배너 뒤에 붙는다. `{version}` · `{date}` */
  asofTreeRevision: ' · 부서 트리는 구조 개정 #{version}({date}) 기준입니다',
  fieldLabels: {},
  typeLabels: {},
};

/** 문구의 `{key}` 자리를 채운다. */
function fill(text, vars) {
  return Object.entries(vars).reduce((s, [k, v]) => s.split(`{${k}}`).join(v ?? ''), String(text ?? ''));
}

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
   놓으면 표에서 상하 관계가 안 보인다(§1-3-a 표시 열 · PW-323).

   🔴 직군·직렬·직무가 직책·직급 «앞»이다 (PW-547 · 2026-08-30 정기미팅 §7 ·
   David 확정). 「일의 분류」와 「사람의 위치」 두 덩어리를 섞지 않는다. 같은 순서를
   pivit-work 의 `orgSnapshotMappers.ROSTER_COLUMNS`(CSV)와 백엔드
   `STANDARD_COLUMNS`(명부 반출)가 함께 쓴다 — 셋이 같이 움직여야 한다. */
const ROSTER_COLUMNS = [
  'name', 'employeeCode', 'teamPath',
  'jobFamily', 'jobTitle', 'jobDuty', 'jobPosition', 'jobLevel',
  'employmentType', 'employmentStatus',
  'workLocation', 'managerName', 'hireDate', 'finalGrade',
];

/**
 * `rowBadge` — 이름 셀 뒤에 붙는 출처 배지(As Of 의 `증빙 고정본`, S2).
 * AI 데이터 소스 배지가 아니라 **시점 출처 표기**라 중립색을 쓴다(정책 §8).
 */
/* 명단 한 쪽의 줄 수. 🔴 3,000명 조직에서 명단을 통째로 그리면 화면이 0.3초씩 여러 번
   굳었다(2026-09-23 성능 점검). 명단은 높이 520px 스크롤 상자 안이라 한 쪽을 넉넉히 50줄로 둔다. */
const ROSTER_PAGE_SIZE = 50;

/**
 * `baseColumns` — 표준 열 목록을 앱이 정해 넘길 때(키 배열 · 헤더는 `labels.roster[key]`). 직종·직함처럼
 * 회사 설정을 따라 켜지는 열, 닉네임·직위·근무지(국가)·FTE·스쿼드 리드처럼 앱의 CSV 에 있는 열을
 * 화면에도 같은 순서로 그리려고 둔다(「보이는 것 = 받는 것」). 없으면 위 `ROSTER_COLUMNS`.
 *
 * `extraColumns` — 표준 열(+연봉) 뒤에 덧붙일 열 `[{ key, comp }]` (PW-1295 · 구성원 CSV 양식 열).
 * 헤더는 `labels.roster[key]`. `comp: true` 는 보상 열이라 연봉과 같은 조건(`showSalary`)에서만 나온다.
 * 무엇을 덧붙일지는 앱이 정한다 — 앱의 CSV 와 같은 목록을 넘겨야 「보이는 것 = 받는 것」이 맞는다.
 */
function SnapshotRoster({ rows, labels, showSalary, changedHint, onMemberClick, rowBadge, extraColumns = [], baseColumns }) {
  const columns = [
    ...(baseColumns ?? ROSTER_COLUMNS),
    ...(showSalary ? ['salary'] : []),
    ...extraColumns.filter((c) => showSalary || !c.comp).map((c) => c.key),
  ];
  // 명단이 바뀌면(다른 날짜·비교) 첫 쪽으로 — 쪽 번호를 «어느 명단의 쪽인가»와 함께 든다.
  const [pageState, setPageState] = useState({ rows, page: 1 });
  const page = pageState.rows === rows ? pageState.page : 1;
  const totalPages = Math.max(1, Math.ceil(rows.length / ROSTER_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * ROSTER_PAGE_SIZE;
  const pageRows = rows.slice(offset, offset + ROSTER_PAGE_SIZE);
  const goTo = (p) => setPageState({ rows, page: Math.max(1, Math.min(totalPages, p)) });
  const pager = labels.rosterPagination ?? DEFAULT_LABELS.rosterPagination;
  if (rows.length === 0) {
    return <EmptyState size="lg" description={labels.rosterEmpty} />;
  }
  return (
    <>
    <RosterTable
      scroll="both"
      maxHeight={520}
      minWidth={1100}
      nowrap
      tableClassName="admin-snap-roster"
      rows={pageRows}
      rowKey={(r, i) => r.userId ?? `${r.name}-${offset + i}`}
      columns={[
        {
          key: '#',
          header: labels.roster.index,
          width: 44,
          cellProps: { className: 'admin-snap-roster-idx' },
          render: (r, i) => offset + i + 1,
        },
        ...columns.map((c) => ({
          key: c,
          header: labels.roster[c],
          cellProps: (r) => {
            const changed = (r.changedFields ?? []).includes(c);
            return {
              className: changed ? 'is-changed' : undefined,
              title: changed && changedHint ? changedHint(c, r) : undefined,
            };
          },
          render: (r) => {
            const changed = (r.changedFields ?? []).includes(c);
            const clickable = !!(r.userId && onMemberClick);
            return (
              <>
                {c === 'name' && clickable ? (
                  <button type="button" className="admin-snap-roster-name" onClick={() => onMemberClick(r.userId)}>
                    {r.name}
                  </button>
                ) : (
                  (r[c] ?? null) === null || r[c] === '' ? '—' : r[c]
                )}
                {c === 'name' && rowBadge && (
                  <StatusBadge className="admin-snap-roster-badge" title={rowBadge.title}>
                    {rowBadge.label}
                  </StatusBadge>
                )}
                {changed && <span className="admin-snap-roster-changed" aria-hidden>▲</span>}
              </>
            );
          },
        })),
      ]}
    />
    {rows.length > ROSTER_PAGE_SIZE && (
      <Pagination
        data-testid="admin-snap-roster-pagination"
        page={safePage}
        totalPages={totalPages}
        pageSize={ROSTER_PAGE_SIZE}
        total={rows.length}
        onPageChange={goTo}
        labels={pager}
        countSuffix={labels.countSuffix}
      />
    )}
    </>
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
function OrgTreeRow({ node, depth, total, defaultOpen, onDrilldown, hint, concurrentSuffix }) {
  const [open, setOpen] = useState(defaultOpen);
  const hasChildren = node.children && node.children.length > 0;
  const pct = total > 0 ? Math.round((node.count / total) * 100) : 0;
  // `unitId` 는 같은 이름 조직을 가르고 겸직자를 찾는 데 쓴다(없으면 이름으로 거른다 — 지난 날짜 되감기).
  // `unassigned` 행은 조직이 아니라 «주 소속 없음» 묶음이다(MC8).
  const drill = (e) => {
    e.stopPropagation();
    onDrilldown?.(node.unassigned
      ? { unassigned: true, label: node.name }
      : { unit: node.name, unitId: node.id, label: node.name });
  };
  return (
    <>
      <div
        className={`admin-snap-tree-row${depth === 0 ? ' is-root' : ''}${hasChildren ? ' has-children' : ''}${hasChildren && open ? ' is-open' : ''}`}
        style={{ padding: `9px 12px 9px ${12 + depth * 20}px` }}
        onClick={() => hasChildren && setOpen((o) => !o)}
      >
        <span className="admin-snap-tree-toggle">{hasChildren ? (open ? '▾' : '▸') : ''}</span>
        <Tooltip content={onDrilldown ? hint : undefined}>
          <button
            type="button"
            className="admin-snap-tree-name"
            onClick={onDrilldown ? drill : undefined}
            style={onDrilldown ? { background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer', textAlign: 'left' } : undefined}
          >
            {node.name}
          </button>
        </Tooltip>
        <span className="admin-snap-tree-count">
          {node.count}
          {/* 「12명 +2 겸직」 — 겸직은 합계에 섞지 않고 따로 보인다(MC2) */}
          {node.concurrentCount > 0 && (
            <span className="admin-snap-tree-count-concurrent" data-testid="snap-tree-concurrent">
              +{node.concurrentCount} {concurrentSuffix}
            </span>
          )}
        </span>
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
        <OrgTreeRow key={child.id ?? child.name} node={child} depth={depth + 1} total={total} defaultOpen={false} onDrilldown={onDrilldown} hint={hint} concurrentSuffix={concurrentSuffix} />
      ))}
    </>
  );
}

function OrgSnapshotStatusView({
  data, labels, queryDate, onQueryDateChange, onExport, onExportRoster,
  activeTab, onTabChange, onDrilldown, onRosterMemberClick,
  showComp, onShowCompChange, rosterExtraColumns, rosterColumns,
  today, coverageFrom,
}) {
  const tabKeys = ['summary', 'employment', 'jobgroup', 'age'];
  const {
    summaryCards = [], orgTree = [], totalCount = 0,
    employment = [], jobFamilies = [], ageDist = [], ageSummary = [],
    roster = [],
    // 주 소속 없는 재직자 수(MC8) · 기록 시작 전 날짜인가(§1 — As Of 와 같은 C1 빈 상태)
    unassignedCount = 0, noRecord = false,
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
        {/* 캡션은 컨트롤 줄 아래로 뺀다 — As Of 탭과 같은 이유(PW-1438) */}
        <div className="admin-snap-header-side">
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
            {/* 하한 = 기록 시작일, 상한 = 오늘 — As Of 탭과 같은 재구성 경로라 같은 범위다(§1) */}
            <DateInput
              min={coverageFrom || undefined}
              max={today || undefined}
              value={draftDate}
              onChange={(v) => setDraftDate(v)}
              onKeyDown={(e) => { if (e.key === 'Enter' && canApply) onQueryDateChange?.(draftDate); }}
            />
          </div>
          <button
            type="button"
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
        {/* 날짜만 바꾸고 미적용이면 안내 — 결과는 직전 적용 기준 그대로다 */}
        {canApply ? (
          <div className="admin-snap-coverage-caption" data-testid="status-apply-hint">{labels.applyHint}</div>
        ) : labels.statusCoverageCaption && (
          <div className="admin-snap-coverage-caption" data-testid="status-coverage-caption">{labels.statusCoverageCaption}</div>
        )}
        </div>
      </header>

      <div
        className="admin-snap-summary-grid"
        style={{ gridTemplateColumns: `repeat(${Math.max(1, summaryCards.length)}, minmax(0, 1fr))` }}
      >
        {summaryCards.map((c) => {
          const clickable = c.drill && onDrilldown;
          return (
            <Tooltip key={c.key ?? c.label} content={clickable ? labels.drilldownHint : undefined}>
              <div
                className={`admin-snap-summary-card is-${c.tone || 'accent'}${clickable ? ' is-clickable' : ''}`}
                onClick={clickable ? () => onDrilldown({ card: c.key, label: c.label }) : undefined}
                role={clickable ? 'button' : undefined}
                style={clickable ? { cursor: 'pointer' } : undefined}
              >
                <p className="admin-snap-summary-label">{c.label}</p>
                <p className="admin-snap-summary-value">{c.value}</p>
                {c.sub && <p className="admin-snap-summary-sub">{c.sub}</p>}
              </div>
            </Tooltip>
          );
        })}
      </div>

      {/* 집계 축 전환 — 공용 SegmentedControl(PW-836). 칸을 가로로 꽉 채운다(종전 모양). */}
      <SegmentedControl
        block
        items={tabKeys.map((k) => ({ value: k, label: labels.tabs[k] }))}
        value={activeTab}
        onChange={onTabChange}
      />

      <div className="admin-snap-content">
        {activeTab === 'summary' && (
          noRecord
            // 기록 시작 전 날짜 — «조직 구조가 없다»(사실 주장)가 아니라 «기록이 없다»(C1)
            ? <EmptyState size="lg" data-testid="status-empty-c1" title={labels.asofOutOfRangeTitle} description={labels.asofOutOfRangeBody} />
            : orgTree.length === 0 && unassignedCount === 0
              ? <EmptyState size="lg" description={labels.noOrgStructure} />
              : (
                <>
                  {orgTree.map((node) => (
                    <OrgTreeRow key={node.id ?? node.name} node={node} depth={0} total={totalCount} defaultOpen onDrilldown={onDrilldown} hint={labels.drilldownHint} concurrentSuffix={labels.concurrentSuffix} />
                  ))}
                  {/* 주 소속이 없는 재직자 — 어느 조직에도 세지 않고 따로(MC8) */}
                  {unassignedCount > 0 && (
                    <OrgTreeRow
                      node={{ name: labels.unassigned, count: unassignedCount, unassigned: true, children: [] }}
                      depth={0} total={totalCount} defaultOpen={false}
                      onDrilldown={onDrilldown} hint={labels.drilldownHint}
                    />
                  )}
                </>
              )
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
            ? <EmptyState size="lg" description={labels.noJobGroups} />
            : (
              <>
                <p className="admin-snap-subheading">{labels.jobFamilyHeading}</p>
                {jobFamilies.map((jg) => (
                  <div key={jg.group} className="admin-snap-jg-row">
                    <span className="admin-snap-jg-name">{jg.group}</span>
                    <div className="admin-snap-jg-pills">
                      {jg.roles.map((r) => <StatusBadge key={r} className="admin-snap-jg-pill">{r}</StatusBadge>)}
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
            ? <EmptyState size="lg" description={labels.ageNotAvailable} />
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
          <SnapshotRoster
            rows={roster}
            labels={labels}
            showSalary={showSalary}
            onMemberClick={onRosterMemberClick}
            extraColumns={rosterExtraColumns}
            baseColumns={rosterColumns}
          />
        )}
      </section>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
 * 2. 인사발령 단건
 * ════════════════════════════════════════════════════════════ */
/** 발령 항목 키 ↔ 3단 축 단계. 직렬 항목 키는 `jobLadder` 다(대시보드가 넘기는 이름). */
const AXIS_LEVEL_OF_FIELD = { jobFamily: 'family', jobLadder: 'ladder', jobDuty: 'duty' };
const AXIS_FIELD_OF_LEVEL = { family: 'jobFamily', ladder: 'jobLadder', duty: 'jobDuty' };

/** 발령일이 오늘 이후면 그 칸 아래 안내 — 저장해도 그날까지는 값이 안 바뀐다 (§2 · PW-1422). */
function ScheduledHint({ date, today, labels }) {
  if (!date || !today || date <= today) return null;
  return (
    <div className="admin-snap-sched-hint" data-testid="snap-scheduled-hint">
      {fill(labels.scheduledHint, { date })}
    </div>
  );
}

function AppointmentSingleView({
  members, fieldOptions, changeableFields, selectFieldKeys, appointmentTypes,
  jobAxis, onOpenFieldOptions,
  labels, onSubmit, defaultDate = '', today = '',
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  /**
   * 같은 사람·같은 항목의 예정 발령과 부딪쳤을 때 `{ date, fields }` (PW-1422 · §2).
   * 앱이 거절 응답을 이 모양으로 `err.pendingConflict` 에 실어 던진다. 덮어쓰면 같은
   * 발령을 `replacePending: true` 로 다시 보낸다.
   */
  const [pendingConflict, setPendingConflict] = useState(null);
  const [selectedFields, setSelectedFields] = useState(() => new Set());
  const [appointmentType, setAppointmentType] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(defaultDate);
  const [reason, setReason] = useState('');
  const [changes, setChanges] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  /** 3단 연동 안내 — `applyJobAxisChange` 의 notice (PW-748) */
  const [axisNotice, setAxisNotice] = useState(null);

  /**
   * 세 칸의 «발령 뒤» 값 — 체크한 항목은 고른 값, 안 체크한 항목은 그 사람의 지금 값.
   * 직렬만 바꾸는 발령이면 그 사람의 지금 직군으로 좁히고, 지금 직무가 새 직렬에 안
   * 맞는지도 이 값으로 본다(PW-748). 체크만 하고 아직 안 고른 칸은 빈 값이다.
   */
  const axisValues = {};
  for (const level of ['family', 'ladder', 'duty']) {
    const f = AXIS_FIELD_OF_LEVEL[level];
    axisValues[level] = selectedFields.has(f)
      ? (changes[f] ?? '')
      : (selectedMember?.fieldValues?.[f] ?? '');
  }
  const pickAxis = (level, value, group) => {
    const applied = applyJobAxisChange(jobAxis, axisValues, level, value, group);
    const { next } = applied;
    let { notice } = applied;
    // 고른 직렬이 직군 둘 이상에 걸리면 직군 행을 함께 열고 «직군도 함께 선택해 주세요»
    // (org-snapshot-spec §2 [L] 2026-08-07). 묶음에서 골라 직군이 채워졌어도 그 직군이 맞는지
    // 어드민이 보게 한다 — 그대로 두면 확정 때 이 행은 빠진다. 지운 칸 안내가 있으면 그게 먼저다.
    const familyOwners = level === 'ladder' && value
      ? Object.entries(jobAxis?.laddersByFamily ?? {}).filter(([, ls]) => (ls ?? []).includes(value)).length
      : 0;
    const familyRequired = familyOwners > 1;
    if (familyRequired && !/Reset/.test(notice?.kind ?? '')) {
      notice = { kind: 'familyRequired', field: 'family' };
    }
    // 바뀌는 칸은 «변경 후» 에 싣고, 체크 안 된 칸이면 항목을 함께 체크한다 — 직렬만 바꿨는데
    // 지금 직무가 새 직렬에 없으면 직무를 비우는 것까지 이 발령에 들어가야 저장된다.
    const touched = ['family', 'ladder', 'duty'].filter(
      (l) => l === level || next[l] !== axisValues[l],
    );
    setChanges((p) => {
      const out = { ...p };
      for (const l of touched) out[AXIS_FIELD_OF_LEVEL[l]] = next[l];
      if (familyRequired && !(AXIS_FIELD_OF_LEVEL.family in out)) out[AXIS_FIELD_OF_LEVEL.family] = next.family;
      return out;
    });
    setSelectedFields((prev) => {
      const out = new Set(prev);
      for (const l of touched) out.add(AXIS_FIELD_OF_LEVEL[l]);
      // 고른 직렬이 직군 여럿에 걸리면(직무면 직렬 여럿) 위 칸을 비운 채 행을 연다 —
      // 쌍 검증(INV-3·INV-8)을 통과하려면 어드민이 그 칸을 골라야 한다(org-snapshot-spec §2).
      if (familyRequired || notice?.kind === 'familyAmbiguous') out.add(AXIS_FIELD_OF_LEVEL.family);
      if (notice?.kind === 'ladderAmbiguous') out.add(AXIS_FIELD_OF_LEVEL.ladder);
      return out;
    });
    setAxisNotice(notice);
  };

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const q = searchQuery.toLowerCase();
    return members.filter((m) =>
      m.name.toLowerCase().includes(q) || (m.employeeCode && m.employeeCode.toLowerCase().includes(q)));
  }, [members, searchQuery]);

  const toggleField = (f) => {
    const adding = !selectedFields.has(f);
    // 직무만 체크하면 위 칸인 직렬 행을 함께 연다(org-snapshot-spec §2 [L] 2026-08-16) — 직무
    // 선택지는 직렬 아래로 좁혀지고 (직렬, 직무) 쌍이 맞아야 저장된다. 지금 직렬을 «변경 후»에
    // 채워 두므로 좁히는 기준은 그대로고, 바꾸지 않으면 확정 때 이 행은 빠진다.
    const ladderField = AXIS_FIELD_OF_LEVEL.ladder;
    const openLadder = adding && jobAxis && f === AXIS_FIELD_OF_LEVEL.duty
      && !selectedFields.has(ladderField) && changeableFields.includes(ladderField);
    if (openLadder) {
      setChanges((p) => (ladderField in p
        ? p
        : { ...p, [ladderField]: selectedMember?.fieldValues?.[ladderField] ?? '' }));
    }
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f); else next.add(f);
      if (openLadder) next.add(ladderField);
      return next;
    });
  };

  const reset = () => {
    setSelectedMember(null); setSelectedFields(new Set());
    setAppointmentType(''); setAppointmentDate(defaultDate); setReason('');
    setChanges({}); setDone(false); setSubmitError(''); setAxisNotice(null);
    setPendingConflict(null);
  };

  const handleConfirm = async ({ replacePending = false } = {}) => {
    if (!selectedMember) return;
    setSubmitting(true);
    setSubmitError('');
    setPendingConflict(null);
    try {
      const allChanges = Array.from(selectedFields).map((f) => ({
        field: f,
        before: selectedMember.fieldValues?.[f] ?? '',
        after: changes[f] ?? '',
      }));
      // 함께 열린 직군·직렬 행을 그대로 두었으면(전 = 후) 이력에 「직렬: A → A」로 남기지 않는다.
      const AXIS_PARENTS = [AXIS_FIELD_OF_LEVEL.family, AXIS_FIELD_OF_LEVEL.ladder];
      const unchangedParent = (c) => AXIS_PARENTS.includes(c.field) && c.after === c.before;
      const changeList = allChanges.some((c) => !unchangedParent(c))
        ? allChanges.filter((c) => !unchangedParent(c))
        : allChanges;
      await onSubmit?.({
        userId: selectedMember.id,
        type: appointmentType,
        date: appointmentDate,
        reason,
        changes: changeList,
        ...(replacePending ? { replacePending: true } : {}),
      });
      setDone(true);
    } catch (err) {
      if (err?.pendingConflict && !replacePending) {
        setPendingConflict(err.pendingConflict);
        return;
      }
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
        <button type="button" className="admin-emp-btn is-soft" onClick={reset}>{labels.close}</button>
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
                onClick={() => { setSelectedMember(m); setAxisNotice(null); }}
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
              <select className="admin-snap-select" value={appointmentType} onChange={(e) => setAppointmentType(e.target.value)} data-testid="appointment-single-type">
                <option value="">{labels.selectPlaceholder}</option>
                {appointmentTypes.map((at) => <option key={at} value={at}>{labels.typeLabels[at] ?? at}</option>)}
              </select>
            </div>
            <div className="admin-snap-field">
              <label className="admin-snap-field-label">{labels.appointmentDate}</label>
              <DateInput className="admin-snap-input" value={appointmentDate} onChange={setAppointmentDate} />
              <ScheduledHint date={appointmentDate} today={today} labels={labels} />
            </div>
            <div className="admin-snap-field">
              <label className="admin-snap-field-label">{labels.reason}</label>
              <input className="admin-snap-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={labels.reasonPlaceholder} />
            </div>
          </div>

          {selectedFields.size > 0 && selectedMember ? (
            <div className="admin-snap-card-section">
              <RosterTable scroll="none">
                <RosterTable.Head>
                  <RosterTable.HeadCell>{labels.selectFields}</RosterTable.HeadCell>
                  <RosterTable.HeadCell>{labels.fieldBefore}</RosterTable.HeadCell>
                  <RosterTable.HeadCell aria-hidden="true" />
                  <RosterTable.HeadCell>{labels.fieldAfter}</RosterTable.HeadCell>
                </RosterTable.Head>
                <RosterTable.Body>
                  {Array.from(selectedFields).map((f) => {
                    const opts = fieldOptions[f] ?? [];
                    const axisLevel = jobAxis ? AXIS_LEVEL_OF_FIELD[f] : null;
                    const useSelect = selectFieldKeys.includes(f) && opts.length > 0;
                    return (
                      <RosterTable.Row key={f}>
                        <RosterTable.Cell className="admin-snap-ba-field">
                          {labels.fieldLabels[f] ?? f}
                          {/* 직함은 HR·소속 팀장 이상만 낸다 — 발령 주체를 화면에서 못 박는다(§2 직함변경의 발령 주체) */}
                          {f === 'businessTitle' && (
                            <Tooltip content={labels.titleLockHint}>
                              <span className="admin-snap-lock" aria-label={labels.titleLockHint} data-testid="appointment-single-title-lock">
                                <LockGlyph size={12} />
                              </span>
                            </Tooltip>
                          )}
                        </RosterTable.Cell>
                        <RosterTable.Cell className="admin-snap-ba-before">{selectedMember.fieldValues?.[f] || '—'}</RosterTable.Cell>
                        <RosterTable.Cell className="admin-snap-ba-arrow">→</RosterTable.Cell>
                        <RosterTable.Cell>
                          {axisLevel ? (
                            /* §3.5-A — 위 칸으로 좁히고, 고를 값이 없으면 자유 입력 대신 사유 +
                               [조직 설정 →]. 적어 넣은 값은 발령 확정에서 거절된다(PW-748). */
                            <>
                              <JobAxisSelect
                                level={axisLevel}
                                values={axisValues}
                                jobAxis={jobAxis}
                                labels={labels}
                                placeholder={labels.selectPlaceholder}
                                onPick={pickAxis}
                                onOpenFieldOptions={onOpenFieldOptions}
                                className="admin-snap-select"
                                testId={`appointment-single-${f}`}
                              />
                              {axisNotice && axisNotice.field === axisLevel && (
                                <div
                                  className={`admin-snap-aff-msg${/Reset|Ambiguous|Required/.test(axisNotice.kind) ? ' is-warn' : ''}`}
                                  role="status"
                                  data-testid="appointment-single-axis-notice"
                                >
                                  {/^family(Required|Ambiguous)$/.test(axisNotice.kind) && labels.apptFamilyRequired
                                    ? labels.apptFamilyRequired
                                    : jobAxisNoticeText(axisNotice, labels)}
                                </div>
                              )}
                            </>
                          ) : useSelect ? (
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
                        </RosterTable.Cell>
                      </RosterTable.Row>
                    );
                  })}
                </RosterTable.Body>
              </RosterTable>
            </div>
          ) : (
            <EmptyState description={labels.noFieldsSelected} />
          )}

          {submitError && (
            <div className="admin-snap-warnbox" role="alert">{submitError}</div>
          )}
          {pendingConflict && (
            <div className="admin-snap-warnbox admin-snap-overwrite" role="alert" data-testid="snap-pending-overwrite">
              <span>{fill(labels.pendingOverwriteAsk, pendingConflict)}</span>
              <span className="admin-snap-overwrite-actions">
                <button type="button" className="admin-emp-btn is-soft" onClick={() => setPendingConflict(null)}>{labels.cancel}</button>
                <button
                  type="button"
                  className="admin-emp-btn is-primary"
                  disabled={submitting}
                  onClick={() => handleConfirm({ replacePending: true })}
                  data-testid="snap-pending-overwrite-confirm"
                >
                  {labels.pendingOverwriteConfirm}
                </button>
              </span>
            </div>
          )}
          <div className="admin-snap-actions">
            <button type="button" className="admin-emp-btn is-soft" onClick={reset}>{labels.cancel}</button>
            {/* 발령 유형도 있어야 누른다(PW-1058) — 서버는 유형이 없으면 거절한다. */}
            <button
              type="button"
              className="admin-emp-btn is-primary"
              onClick={() => handleConfirm()}
              disabled={!selectedMember || !appointmentType || selectedFields.size === 0 || !appointmentDate || submitting}
              data-testid="snap-single-confirm"
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
/* 미리보기 «소속 변경» 칸 — 추가(+)·제거(−) 줄과 두 번 적힌 경로(A6 · 강조).
   줄이 3개를 넘으면 앞 3줄만 두고 나머지는 +N 으로 접고, 마우스를 올리면 전체를 보인다(§3-A A7). */
const AFF_VISIBLE_LINES = 3;
function AffiliationChangeLines({ row, labels }) {
  // 같은 경로가 두 번 적힌 행은 추가 줄에도 같은 경로가 두 번 온다 — 키에 순번을 붙인다.
  const lines = [
    ...(row.duplicates ?? []).map((tPath, i) => ({ key: `dup-${i}-${tPath}`, className: 'admin-snap-aff-dup', text: `${labels.affDuplicatePrefix} · ${tPath}` })),
    ...(row.added ?? []).map((tPath, i) => ({ key: `add-${i}-${tPath}`, className: 'admin-snap-aff-add', text: `+ ${tPath}` })),
    ...(row.removed ?? []).map((tPath, i) => ({ key: `rm-${i}-${tPath}`, className: 'admin-snap-aff-remove', text: `− ${tPath}` })),
  ];
  if (lines.length === 0) return <span className="admin-snap-pv-before">{labels.affNoChange}</span>;
  const shown = lines.slice(0, AFF_VISIBLE_LINES);
  const hidden = lines.slice(AFF_VISIBLE_LINES);
  return (
    <>
      {shown.map((l) => <div key={l.key} className={l.className}>{l.text}</div>)}
      {hidden.length > 0 && (
        <span className="admin-snap-aff-more" title={lines.map((l) => l.text).join('\n')}>
          {fill(labels.affMoreLines, { n: hidden.length })}
        </span>
      )}
    </>
  );
}

function AppointmentBulkView({
  members, bulkFields, labels, onSubmit, defaultDate = '',
  parseUpload, onFixPrimary, onRowAction, affiliationTemplate,
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
  // 파일에서 읽지 않은 열 등 파일 단위 안내 — 조용히 버리지 않는다(§3 [L] 2026-08-16).
  const [parseNotices, setParseNotices] = useState([]);
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
    // 한국어 엑셀이 저장한 EUC-KR 파일도 열 이름이 깨지지 않게 읽는다 (PW-968).
    const text = await readCsvFileText(f);
    // 소비자가 파서를 주입하면 겸직 검증(§3-A)을 그쪽 규칙으로 돌린다.
    // XLSX 처럼 글자로 못 읽는 파일은 소비자가 `file` 로 직접 읽는다 — 그래서 결과가 약속(Promise)일 수 있다.
    if (parseUpload) {
      const parsed = await parseUpload(text, { fields, fileName: f.name, file: f });
      setPreviewRows(parsed?.rows ?? []);
      setAffiliationMode(!!parsed?.hasAffiliationColumns);
      setParseError(parsed?.error ?? '');
      setParseNotices(parsed?.notices ?? []);
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
    setParseNotices([]);
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

  /* 행 처리 선택(신규 옵션 등록·직군 자동 보정·팀 자동 생성 — §3) — 주소속처럼 소비자가 재검증한 행으로 갈아 끼운다. */
  const toggleRowAction = (row, key, checked) => {
    if (!onRowAction) return;
    const next = onRowAction(row, key, checked);
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
    setAffiliationMode(false); setParseError(''); setParseNotices([]); setSubmitError('');
  };

  if (done) {
    return (
      <div className="admin-snap-done">
        <div className="admin-snap-done-icon">✓</div>
        <div className="admin-snap-done-title">{labels.appointmentDone}</div>
        <div className="admin-snap-done-sub">{labels.okCount} {applicableRows.length}{labels.countUnit}</div>
        <button type="button" className="admin-emp-btn is-soft" onClick={reset}>{labels.close}</button>
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
              <div className="admin-snap-dropzone-icon"><IconUpload size={24} /></div>
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
              <StatusBadge className="admin-snap-status-badge is-ok">
                <StatusIcon tone="ok" /> {labels.okCount} {okRows.length}{labels.countUnit}
              </StatusBadge>
              {warnRows.length > 0 && (
                <StatusBadge className="admin-snap-status-badge is-warn">
                  <StatusIcon tone="warn" /> {labels.warnCount} {warnRows.length}{labels.countUnit}
                </StatusBadge>
              )}
              {errorRows.length > 0 && (
                <StatusBadge className="admin-snap-status-badge is-error">
                  <StatusIcon tone="error" /> {labels.errorCount} {errorRows.length}{labels.countUnit}
                </StatusBadge>
              )}
            </div>
            {/* B2 — 선언형 덮어쓰기의 파괴성을 확정 전에 반드시 알린다. 이 문장이 없으면
                어드민이 "추가만 되는" 동작을 기대하고 남의 겸직을 통째로 날린다. */}
            {affiliationMode && (
              <div className="admin-snap-warnbox">{labels.affOverwriteWarning}</div>
            )}
            {parseNotices.map((text, ni) => (
              <div key={`notice-${ni}`} className="admin-snap-hint" role="status">{text}</div>
            ))}
            {previewRows.length > 0 ? (
              <RosterTable nowrap tableClassName="admin-snap-preview-table">
                  <RosterTable.Head>
                      <RosterTable.HeadCell>{labels.target}</RosterTable.HeadCell>
                      {affiliationMode && (
                        <>
                          <RosterTable.HeadCell>{labels.affColChange}</RosterTable.HeadCell>
                          <RosterTable.HeadCell>{labels.affColPrimary}</RosterTable.HeadCell>
                          <RosterTable.HeadCell>{labels.affColLeader}</RosterTable.HeadCell>
                          <RosterTable.HeadCell>{labels.affColRole}</RosterTable.HeadCell>
                        </>
                      )}
                      {previewFields.map((f) => <RosterTable.HeadCell key={`b-${f}`}>{labels.fieldBefore} {labels.fieldLabels[f] ?? f}</RosterTable.HeadCell>)}
                      {previewFields.length > 0 && <RosterTable.HeadCell aria-hidden="true" />}
                      {previewFields.map((f) => <RosterTable.HeadCell key={`a-${f}`}>{labels.fieldAfter} {labels.fieldLabels[f] ?? f}</RosterTable.HeadCell>)}
                      <RosterTable.HeadCell>{labels.historyDetail}</RosterTable.HeadCell>
                    </RosterTable.Head>
                  <RosterTable.Body>
                    {previewRows.map((row, i) => {
                      const changes = row.fieldChanges ?? row.changes ?? {};
                      return (
                        <RosterTable.Row key={i} tone={row.status === 'warn' || row.status === 'error' ? row.status : undefined}>
                          <RosterTable.Cell className="admin-snap-pv-name">{row.name || '—'}</RosterTable.Cell>
                          {affiliationMode && (
                            <>
                              <RosterTable.Cell>
                                <AffiliationChangeLines row={row} labels={labels} />
                              </RosterTable.Cell>
                              <RosterTable.Cell>
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
                              </RosterTable.Cell>
                              <RosterTable.Cell>
                                {(row.leaders ?? []).length
                                  ? (row.leaders ?? []).map((l) => <div key={l}>{l}</div>)
                                  : <span className="admin-snap-pv-before">—</span>}
                              </RosterTable.Cell>
                              <RosterTable.Cell>
                                {row.promote
                                  ? <span className="admin-snap-aff-promote">{labels.affPromote}</span>
                                  : <span className="admin-snap-pv-before">{labels.affNoChange}</span>}
                              </RosterTable.Cell>
                            </>
                          )}
                          {previewFields.map((f) => <RosterTable.Cell key={`b-${f}`} className="admin-snap-pv-before">{changes[f]?.before ?? '-'}</RosterTable.Cell>)}
                          {previewFields.length > 0 && <RosterTable.Cell className="admin-snap-ba-arrow">→</RosterTable.Cell>}
                          {previewFields.map((f) => <RosterTable.Cell key={`a-${f}`} className="admin-snap-pv-after">{changes[f]?.after ?? '-'}</RosterTable.Cell>)}
                          <RosterTable.Cell>
                            {row.status === 'ok' && (
                              <StatusBadge className="admin-snap-pv-status-ok"><StatusIcon tone="ok" /> {labels.statusOk}</StatusBadge>
                            )}
                            {row.status === 'warn' && (
                              <StatusBadge className="admin-snap-pv-status-warn"><StatusIcon tone="warn" /> {labels.warnCount}</StatusBadge>
                            )}
                            {row.status === 'error' && (
                              <StatusBadge className="admin-snap-pv-status-error"><StatusIcon tone="error" /> {labels.statusError}</StatusBadge>
                            )}
                            {(row.messages ?? []).map((m, mi) => (
                              <div
                                key={mi}
                                className={m.severity === 'error' ? 'admin-snap-aff-msg is-error' : 'admin-snap-aff-msg is-warn'}
                              >
                                {m.text}
                              </div>
                            ))}
                            {onRowAction && (row.actions ?? []).map((a) => (
                              <label key={a.key} className="admin-snap-aff-action">
                                <input
                                  type="checkbox"
                                  checked={!!a.checked}
                                  onChange={(e) => toggleRowAction(row, a.key, e.target.checked)}
                                />
                                {a.label}
                              </label>
                            ))}
                          </RosterTable.Cell>
                        </RosterTable.Row>
                      );
                    })}
                  </RosterTable.Body>
              </RosterTable>
            ) : (
              <EmptyState description={labels.bulkPreviewPending} />
            )}
            <div className="admin-snap-appt-info" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 0 }}>
              <div className="admin-snap-field">
                <label className="admin-snap-field-label">{labels.appointmentDate}</label>
                <DateInput className="admin-snap-input" value={date} onChange={setDate} />
                <ScheduledHint date={date} today={defaultDate} labels={labels} />
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
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="admin-emp-btn is-soft" onClick={() => setStep(2)}>← {labels.prev}</button>
                <button type="button" className="admin-emp-btn is-soft" disabled={submitting} onClick={reset}>{labels.cancelAll}</button>
              </div>
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
const CEO_TYPE_KEYS = ['ceo_assign', 'ceo_release'];

/** 이력 상세의 변경 전/후 표 — 빈 값은 «—»(§2 대표 발령 `— → 대표`). */
function HistoryChangesTable({ changes, labels }) {
  if (!changes || changes.length === 0) return null;
  return (
    <RosterTable scroll="none">
      <RosterTable.Head>
        <RosterTable.HeadCell>{labels.historyField}</RosterTable.HeadCell>
        <RosterTable.HeadCell>{labels.fieldBefore}</RosterTable.HeadCell>
        <RosterTable.HeadCell>{labels.fieldAfter}</RosterTable.HeadCell>
      </RosterTable.Head>
      <RosterTable.Body>
        {changes.map((ch, i) => (
          <RosterTable.Row key={i}>
            <RosterTable.Cell className="admin-snap-ba-field">{labels.fieldLabels[ch.field] ?? ch.field}</RosterTable.Cell>
            <RosterTable.Cell className="admin-snap-ba-before">{ch.before || '—'}</RosterTable.Cell>
            <RosterTable.Cell className="admin-snap-ba-after">{ch.after || '—'}</RosterTable.Cell>
          </RosterTable.Row>
        ))}
      </RosterTable.Body>
    </RosterTable>
  );
}

function AppointmentHistoryView({
  records, error, labels, onExport, onCancelScheduled,
  structureRevisions, structureRevisionsError, onLoadStructureRevision,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  /** 발령 유형 필터 — '' 전체 · 유형 키 · `revision` 구조 개정 (§4 · PW-1422) */
  const [typeFilter, setTypeFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [cancelError, setCancelError] = useState('');
  const [cancellingId, setCancellingId] = useState(null);
  /** 구조 개정 상세 — `{ version, status: 'loading'|'ready'|'error', changes, error }` */
  const [revision, setRevision] = useState(null);

  /** 기간 — 발령일 시작·끝 (YYYY-MM-DD, 빈 값은 열린 끝) (§4 필터) */
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');

  // 대표 지정·해제는 발령 화면에서 만들 수는 없지만 이력 필터에는 늘 보인다(§2 대표 발령의 특수 규칙).
  const typeKeys = useMemo(
    () => Array.from(new Set([...records.map((r) => r.typeKey).filter(Boolean), ...CEO_TYPE_KEYS])),
    [records],
  );
  const rows = useMemo(() => groupHistoryRows(records, labels), [records, labels]);
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const hit = (r) => !q
      || (r.name ?? '').toLowerCase().includes(q)
      || (r.employeeCode ?? '').toLowerCase().includes(q);
    return rows.filter((row) =>
      (!typeFilter || row.typeKey === typeFilter) &&
      (!periodFrom || (row.date ?? '') >= periodFrom) &&
      (!periodTo || (row.date ?? '') <= periodTo) &&
      // 묶음은 한 사람이라도 맞으면 남기고 «전체 N명»은 그대로 둔다 — 걸러 낸 수로 바꾸면
      // 그 발령이 몇 명짜리였는지가 거짓이 된다.
      (row.members ? row.members.some(hit) : hit(row)));
  }, [rows, searchQuery, typeFilter, periodFrom, periodTo]);

  // 구조 개정 필터를 배선하지 않은 호스트는 종전처럼 발령만 본다.
  const revisionsWired = Array.isArray(structureRevisions) || !!structureRevisionsError;
  // 못 불러온 것을 «발령 이력이 없습니다»로 보이면 어드민은 이력이 지워진 줄 안다.
  if (error && records.length === 0 && !revisionsWired) {
    return <div className="admin-snap-warnbox" role="alert">{error}</div>;
  }
  if (records.length === 0 && !revisionsWired) {
    return <EmptyState size="lg" description={labels.historyEmpty} />;
  }
  const showRevisions = typeFilter === 'revision';

  const cancelScheduled = async (rec) => {
    setCancelError('');
    setCancellingId(rec.id);
    try {
      await onCancelScheduled?.(rec);
      if (selected?.id === rec.id) setSelected(null);
    } catch (err) {
      // 실패하면 배지가 그대로 남고, 왜 안 됐는지를 이 화면 안에 띄운다.
      setCancelError(err?.message || String(err));
    } finally {
      setCancellingId(null);
    }
  };

  const openRevision = async (rev) => {
    setSelected(null);
    setRevision({ version: rev.version, savedAt: rev.savedAt, status: 'loading' });
    try {
      const detail = await onLoadStructureRevision?.(rev.version);
      setRevision((cur) => (cur?.version === rev.version
        ? { ...cur, status: 'ready', changes: detail?.changes ?? [], note: detail?.note ?? '' }
        : cur));
    } catch (err) {
      setRevision((cur) => (cur?.version === rev.version
        ? { ...cur, status: 'error', error: err?.message || String(err) }
        : cur));
    }
  };

  return (
    <div className="admin-snap-canvas">
      <div className="admin-snap-hist-layout">
        <div className="admin-snap-hist-main">
          <div className="admin-snap-hist-toolbar">
            {!showRevisions && (
              <input
                className="admin-snap-search admin-snap-hist-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={labels.searchEmployee}
              />
            )}
            {!showRevisions && (
              <>
                <DateInput
                  className="admin-snap-input admin-snap-hist-period"
                  value={periodFrom}
                  max={periodTo || undefined}
                  onChange={setPeriodFrom}
                  aria-label={labels.historyPeriodFrom}
                  data-testid="snap-hist-period-from"
                />
                <span className="admin-snap-hist-period-sep" aria-hidden="true">~</span>
                <DateInput
                  className="admin-snap-input admin-snap-hist-period"
                  value={periodTo}
                  min={periodFrom || undefined}
                  onChange={setPeriodTo}
                  aria-label={labels.historyPeriodTo}
                  data-testid="snap-hist-period-to"
                />
              </>
            )}
            {(
              <select
                className="admin-snap-select admin-snap-hist-typefilter"
                aria-label={labels.historyType}
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setSelected(null); setRevision(null); }}
                data-testid="snap-hist-type-filter"
              >
                <option value="">{labels.historyTypeAll}</option>
                {typeKeys.map((k) => <option key={k} value={k}>{labels.typeLabels[k] ?? k}</option>)}
                {revisionsWired && <option value="revision">{labels.historyTypeRevision}</option>}
              </select>
            )}
            {!showRevisions && (
              <button type="button" className="admin-snap-export-btn" onClick={() => onExport?.()}>↓ {labels.export}</button>
            )}
          </div>
          {cancelError && (
            <div className="admin-snap-warnbox" role="alert">{cancelError}</div>
          )}
          {error && !showRevisions && (
            <div className="admin-snap-warnbox" role="alert" data-testid="snap-hist-load-error">{error}</div>
          )}
          {showRevisions ? (
            <StructureRevisionTable
              revisions={structureRevisions}
              error={structureRevisionsError}
              selectedVersion={revision?.version}
              labels={labels}
              onOpen={openRevision}
            />
          ) : filtered.length === 0 ? (
            error ? null : <EmptyState size="lg" description={labels.historyEmpty} />
          ) : (
          <div className="admin-snap-hist-tablewrap">
            <RosterTable>
              <RosterTable.Head>
                  <RosterTable.HeadCell>{labels.historyDate}</RosterTable.HeadCell>
                  <RosterTable.HeadCell>{labels.historyTarget}</RosterTable.HeadCell>
                  <RosterTable.HeadCell>{labels.historyType}</RosterTable.HeadCell>
                  <RosterTable.HeadCell>{labels.historyMode}</RosterTable.HeadCell>
                  <RosterTable.HeadCell>{labels.historyHandler}</RosterTable.HeadCell>
                  <RosterTable.HeadCell aria-hidden="true" />
                </RosterTable.Head>
              <RosterTable.Body>
                {filtered.map((rec) => (
                  <RosterTable.Row
                    key={rec.id}
                    className="admin-snap-hist-row"
                    tone={selected?.id === rec.id ? 'selected' : undefined}
                    onClick={() => { setRevision(null); setSelected(rec); }}
                  >
                    <RosterTable.Cell className="admin-snap-hist-date">
                      {rec.date ?? '-'}
                      {rec.scheduled && (
                        <StatusBadge className="admin-snap-type-badge is-gray admin-snap-sched-badge">{labels.historyScheduled}</StatusBadge>
                      )}
                    </RosterTable.Cell>
                    <RosterTable.Cell className="admin-snap-hist-name">{rec.name ?? '-'}</RosterTable.Cell>
                    <RosterTable.Cell>
                      <StatusBadge className={`admin-snap-type-badge is-${TYPE_TONE[rec.typeKey] ?? 'gray'}`}>
                        {rec.typeKey ? (labels.typeLabels[rec.typeKey] ?? rec.typeKey) : '-'}
                      </StatusBadge>
                    </RosterTable.Cell>
                    <RosterTable.Cell className={`admin-snap-hist-mode${rec.mode === 'bulk' ? ' is-bulk' : ''}`}>
                      {rec.mode === 'bulk' ? labels.historyModeBulk : labels.historyModeSingle}
                    </RosterTable.Cell>
                    <RosterTable.Cell className="admin-snap-hist-mode">{rec.by ?? '-'}</RosterTable.Cell>
                    <RosterTable.Cell>
                      {rec.scheduled && !rec.members && onCancelScheduled && (
                        <>
                          <button
                            type="button"
                            className="admin-snap-hist-detaillink admin-snap-hist-cancel"
                            disabled={cancellingId === rec.id}
                            onClick={(e) => { e.stopPropagation(); cancelScheduled(rec); }}
                            data-testid={`snap-hist-cancel-${rec.id}`}
                          >
                            {labels.historyCancelScheduled}
                          </button>
                          <span className="admin-snap-hist-detaillink">{'\u00a0·\u00a0'}</span>
                        </>
                      )}
                      <span className="admin-snap-hist-detaillink">{labels.historyDetail} ▸</span>
                    </RosterTable.Cell>
                  </RosterTable.Row>
                ))}
              </RosterTable.Body>
            </RosterTable>
          </div>
          )}
        </div>

        {selected && !showRevisions && (
          <div className="admin-snap-hist-panel">
            <div className="admin-snap-hist-panel-head">
              <div>
                <div className="admin-snap-hist-panel-name">{selected.name}</div>
                <div className="admin-snap-hist-panel-meta">
                  <span className="admin-snap-mono">{selected.date}</span>
                  {selected.scheduled && <> {labels.historyScheduled}</>}
                  {' · '}
                  {selected.typeKey ? (labels.typeLabels[selected.typeKey] ?? selected.typeKey) : '-'}
                </div>
              </div>
              <button type="button" className="admin-snap-hist-panel-close" onClick={() => setSelected(null)}>×</button>
            </div>
            <div className="admin-snap-hist-panel-body">
              {selected.members ? (
                /* 대량 발령 묶음 — 사람마다 이름 + 변경 전/후 (§4 «전체 N명») */
                selected.members.map((m) => (
                  <div key={m.id} className="admin-snap-hist-member" data-testid="snap-hist-group-member">
                    <div className="admin-snap-hist-member-name">
                      {m.name || '—'}
                      {m.scheduled && <> · {labels.historyScheduled}</>}
                      {m.scheduled && onCancelScheduled && (
                        <button
                          type="button"
                          className="admin-snap-hist-detaillink admin-snap-hist-cancel"
                          disabled={cancellingId === m.id}
                          onClick={() => cancelScheduled(m)}
                          data-testid={`snap-hist-cancel-${m.id}`}
                        >
                          {' · '}{labels.historyCancelScheduled}
                        </button>
                      )}
                    </div>
                    <HistoryChangesTable changes={m.changes} labels={labels} />
                  </div>
                ))
              ) : (
                <HistoryChangesTable changes={selected.changes} labels={labels} />
              )}
              {selected.reason && (
                <>
                  <div className="admin-snap-hist-reason-label">{labels.historyReason}</div>
                  <div className="admin-snap-hist-reason">{selected.reason}</div>
                </>
              )}
              <div className="admin-snap-hist-processed" data-testid="snap-hist-processed">
                {String(labels.historyProcessed ?? '')
                  .replace('{by}', selected.by || '—')
                  .replace('{at}', selected.processedAt || '—')}
              </div>
            </div>
          </div>
        )}

        {revision && showRevisions && (
          <div className="admin-snap-hist-panel" data-testid="snap-revision-panel">
            <div className="admin-snap-hist-panel-head">
              <div>
                <div className="admin-snap-hist-panel-name">{labels.historyTypeRevision} #{revision.version}</div>
                <div className="admin-snap-hist-panel-meta">
                  <span className="admin-snap-mono">{revision.savedAt}</span>
                </div>
              </div>
              <button type="button" className="admin-snap-hist-panel-close" onClick={() => setRevision(null)}>×</button>
            </div>
            <div className="admin-snap-hist-panel-body">
              {revision.status === 'loading' && <LoadingState>{labels.revisionLoading}</LoadingState>}
              {revision.status === 'error' && (
                <div className="admin-snap-warnbox" role="alert">{revision.error}</div>
              )}
              {revision.status === 'ready' && revision.note && (
                <div className="admin-snap-sched-hint" data-testid="snap-revision-note">{revision.note}</div>
              )}
              {revision.status === 'ready' && (revision.changes.length === 0 ? (
                <EmptyState description={labels.revisionNoChanges} />
              ) : (
                <RosterTable scroll="none">
                  <RosterTable.Head>
                    <RosterTable.HeadCell>{labels.revisionUnit}</RosterTable.HeadCell>
                    <RosterTable.HeadCell>{labels.revisionBefore}</RosterTable.HeadCell>
                    <RosterTable.HeadCell>{labels.revisionAfter}</RosterTable.HeadCell>
                  </RosterTable.Head>
                  <RosterTable.Body>
                    {revision.changes.map((ch, i) => (
                      <RosterTable.Row key={i}>
                        <RosterTable.Cell className="admin-snap-ba-field">{ch.unit}</RosterTable.Cell>
                        <RosterTable.Cell className="admin-snap-ba-before">{ch.before || '-'}</RosterTable.Cell>
                        <RosterTable.Cell className="admin-snap-ba-after">{ch.after || '-'}</RosterTable.Cell>
                      </RosterTable.Row>
                    ))}
                  </RosterTable.Body>
                </RosterTable>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 구조 개정 목록 (§4 「구조 개정」 필터 · PW-1422) — 행 = 개정 번호 · 저장 시각 · 저장한 사람 ·
 * 바뀐 단위 수. 불러오기 실패는 「없습니다」가 아니라 사유로 보인다.
 */
function StructureRevisionTable({ revisions, error, selectedVersion, labels, onOpen }) {
  if (error) return <div className="admin-snap-warnbox" role="alert">{error}</div>;
  if (!revisions) return <LoadingState>{labels.revisionLoading}</LoadingState>;
  if (revisions.length === 0) return <EmptyState size="lg" description={labels.revisionEmpty} />;
  return (
    <div className="admin-snap-hist-tablewrap">
      <RosterTable>
        <RosterTable.Head>
          <RosterTable.HeadCell>{labels.revisionNo}</RosterTable.HeadCell>
          <RosterTable.HeadCell>{labels.revisionSavedAt}</RosterTable.HeadCell>
          <RosterTable.HeadCell>{labels.revisionSavedBy}</RosterTable.HeadCell>
          <RosterTable.HeadCell>{labels.revisionChangedUnits}</RosterTable.HeadCell>
          <RosterTable.HeadCell aria-hidden="true" />
        </RosterTable.Head>
        <RosterTable.Body>
          {revisions.map((rev) => (
            <RosterTable.Row
              key={rev.version}
              className="admin-snap-hist-row"
              tone={selectedVersion === rev.version ? 'selected' : undefined}
              onClick={() => onOpen(rev)}
              data-testid={`snap-revision-row-${rev.version}`}
            >
              <RosterTable.Cell className="admin-snap-hist-name">#{rev.version}</RosterTable.Cell>
              <RosterTable.Cell className="admin-snap-hist-date">{rev.savedAt ?? '-'}</RosterTable.Cell>
              <RosterTable.Cell className="admin-snap-hist-mode">{rev.savedBy ?? '-'}</RosterTable.Cell>
              <RosterTable.Cell className="admin-snap-hist-mode">{rev.changedUnits}</RosterTable.Cell>
              <RosterTable.Cell><span className="admin-snap-hist-detaillink">{labels.historyDetail} ▸</span></RosterTable.Cell>
            </RosterTable.Row>
          ))}
        </RosterTable.Body>
      </RosterTable>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
 * 5. As Of — 시점별 조직 스냅샷 (타임머신)
 * ════════════════════════════════════════════════════════════ */
/** 기록 시점 줄에 처음부터 보이는 버튼 수 — 정책서 «최신순 최대 3개». 넘치면 「더 보기」로 연다(PW-1438). */
const ASOF_RECORD_PRESETS_VISIBLE = 3;

/**
 * As Of 날짜 버튼 — 기록 시점 한 줄, 분기말 한 줄 (PW-1438).
 *
 * 한 줄에 섞어 두면 날짜순도 종류도 안 읽히고, 기록이 쌓일수록 세 줄 넘게 번졌다.
 * 기록 시점은 최신 몇 개만 보이고 나머지는 「더 보기」로 연다. 고른 날짜가 접힌 쪽에
 * 있으면 그 버튼은 접어도 남긴다 — 지금 보는 시점이 화면에서 사라지면 안 된다.
 * 버튼 문구는 짧게(`label`), 자세한 내용은 말풍선(`detail`)으로 둔다.
 * `kind` 가 없는 프리셋은 기록 시점으로 친다(옛 호출부).
 */
function AsOfPresetRows({ presets, labels, asOfDate, isPast, today, onAsOfDateChange }) {
  const [expanded, setExpanded] = useState(false);
  const records = presets.filter((p) => p.kind !== 'quarter');
  const quarters = presets.filter((p) => p.kind === 'quarter');
  const collapsedRecords = records.filter((p, i) => i < ASOF_RECORD_PRESETS_VISIBLE || p.date === asOfDate);
  const shownRecords = expanded ? records : collapsedRecords;
  // 「더 보기 +N」 은 접었을 때 실제로 숨는 수다 — 고른 날짜로 남긴 버튼은 세지 않는다.
  const hiddenCount = records.length - collapsedRecords.length;
  const canExpand = records.length > ASOF_RECORD_PRESETS_VISIBLE;

  const chip = (p) => (
    <Tooltip key={p.key} content={p.detail || undefined}>
      <button
        type="button"
        data-testid={`asof-preset-${p.date}`}
        className={`admin-snap-preset${asOfDate === p.date ? ' is-active' : ''}`}
        onClick={() => onAsOfDateChange?.(p.date)}
      >
        {p.label}
      </button>
    </Tooltip>
  );

  return (
    <div className="admin-snap-preset-rows">
      <div className="admin-snap-presets" data-testid="asof-preset-records">
        <button
          type="button"
          className={`admin-snap-preset${!isPast ? ' is-active' : ''}`}
          onClick={() => onAsOfDateChange?.(today)}
        >
          {labels.asofToday}
        </button>
        {shownRecords.map(chip)}
        {canExpand && (hiddenCount > 0 || expanded) && (
          <button
            type="button"
            className="admin-snap-preset-more"
            aria-expanded={expanded}
            data-testid="asof-preset-more"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded
              ? labels.asofPresetLess
              : String(labels.asofPresetMore).replace('{count}', String(hiddenCount))}
          </button>
        )}
      </div>
      {quarters.length > 0 && (
        <div className="admin-snap-presets" data-testid="asof-preset-quarters">
          {quarters.map(chip)}
        </div>
      )}
    </div>
  );
}

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
  onExport, onRosterMemberClick, rosterExtraColumns, rosterColumns, onRetry,
}) {
  const {
    presets = [], meta = null, delta = null, roster = [], totalMembers = 0, pending = false,
    error = null,
  } = data;
  // error — 명단 조회가 실패했다(`'failed'` · 시간 초과면 `'timeout'`). 정책 §3: 표 자리에
  // «불러오지 못했어요» + [다시 시도], 요약 카드는 직전 값을 남기지 않고 `—`. 실패를 빈 명단·
  // 0명으로 그리면 «그날 아무도 없었다»는 없는 사실이 된다.
  const failed = !!error && !pending;
  // 아직 한 번도 응답이 없다(첫 로딩) — 표 자리에 8줄 뼈대. 날짜를 바꾼 재조회는 직전 명단을
  // 흐리게 남긴다(아래 is-pending). 칩·날짜 칸은 어느 쪽이든 바로 누를 수 있다.
  const firstLoad = pending && !meta && roster.length === 0;
  // pending — 고른 날짜의 응답이 아직 안 왔다. 화면에 남은 숫자는 **이전 날짜의 것**이라
  // 그대로 보이면 새 날짜의 값으로 읽힌다(PW-1248). 카드 값은 자리 표시로 바꾸고 명단은
  // 흐리게 남긴다(정책 §3 「날짜 변경 재조회」 — 표를 비우지 않는다). 날짜 칸·칩은 그대로 둔다.
  const isPast = !!asOfDate && asOfDate !== today;
  // 커버리지 하한은 prop 우선, 없으면 응답 메타. 옛 백엔드와 섞여도 화면이 죽지 않는다.
  const minDate = coverageFrom || meta?.coverageFrom || undefined;
  const isOut = !failed && meta?.state === 'out_of_range';
  // C2 는 "재구성은 **됐는데** 그날 아무도 없었다" 이다 — 사실 주장이므로 재구성이
  // 실제로 성공했을 때만 쓴다. 응답이 없거나 실패해서 명단이 빈 것을 C2 로 그리면
  // "그날 아무도 없었다" 고 없는 사실을 만들어 낸다(이 티켓이 고치는 것과 같은 오류).
  const reconstructed = meta?.state === 'full' || meta?.state === 'partial';
  const isEmptyFact = !failed && !isOut && reconstructed && roster.length === 0;
  // 재구성 여부를 모른 채 명단만 빈 경우 — 중립 문구로 남긴다.
  const isEmptyUnknown = !failed && !isOut && !reconstructed && roster.length === 0 && isPast;
  // 그 날짜의 증빙 고정본에서 온 값인가(S2). 배지는 AI 출처 표기가 아니라 시점 출처다.
  const fromFixedCopy = meta?.reconstructedFrom === 'snapshot' && !!meta?.snapshotDate;

  // ⚠️ 0 금지 규칙 — 재구성 불가일 때 숫자 0 을 쓰지 않는다. "0명" 은 "그날 아무도
  // 없었다" 는 사실 주장이고, 실제로는 "그날은 기록이 없다" 이다.
  const dash = '—';
  const noValue = isOut || failed;
  const cards = [
    { key: 'total', value: noValue ? dash : totalMembers },
    { key: 'joined', value: noValue || !delta ? dash : `+${delta.joinedCount}` },
    { key: 'left', value: noValue || !delta ? dash : `-${delta.leftCount}` },
    {
      key: 'moved',
      value: noValue || !delta ? dash : delta.movedCount + (delta.statusChangedCount ?? 0),
    },
  ];

  return (
    <div className="admin-snap-canvas">
      <header className="admin-snap-header">
        <div>
          <div className="admin-snap-header-title">{labels.asofTitle}</div>
          <div className="admin-snap-header-sub">{labels.asofSubtitle}</div>
        </div>
        {/* 체크박스·날짜 칸·CSV 버튼은 한 줄에 세우고, 「기록 시작」 캡션은 그 줄 아래로 뺀다 —
            날짜 칸 밑에 붙이면 그 묶음만 키가 커져 세 요소의 높이가 어긋났다(PW-1438). */}
        <div className="admin-snap-header-side">
          <div className="admin-snap-header-actions">
            <label className="admin-snap-comp-toggle">
              <input
                type="checkbox"
                checked={!!showComp}
                onChange={(e) => onShowCompChange?.(e.target.checked)}
              />
              {labels.asofShowComp}
            </label>
            <div className="admin-snap-datepicker">
              <span className="admin-snap-datepicker-label">{labels.asofPresetLabel}</span>
              {/* 미래 시점은 재구성할 이력이 없다 — max 로 선택 자체를 막는다.
                  min 은 커버리지 하한 — 그 이전은 어떤 소스로도 재구성할 수 없다. */}
              <DateInput
                min={minDate}
                max={today}
                value={asOfDate}
                onChange={(v) => onAsOfDateChange?.(v)}
              />
            </div>
            {/* 0행 CSV 를 내보내면 "그날 아무도 없었다" 는 문서가 밖으로 나간다 */}
            <Tooltip content={isOut ? labels.asofOutOfRangeTitle : undefined}>
              <button
                type="button"
                className="admin-snap-export-btn"
                disabled={isOut || failed}
                onClick={() => onExport?.()}
              >
                ↓ {labels.asofExport}
              </button>
            </Tooltip>
          </div>
          {/* 상시 캡션 — 경계를 만난 뒤 알리면 늦다(정책 §2-1) */}
          {labels.asofCoverageCaption && (
            <div className="admin-snap-coverage-caption" data-testid="asof-coverage-caption">
              {labels.asofCoverageCaption}
            </div>
          )}
        </div>
      </header>

      {/* 프리셋 — 커버리지 밖 칩은 호출부에서 걸러진다. 비활성 칩을 남기면
          "누르면 되는데 왜 안 되지" 가 되므로 아예 렌더하지 않는다(§5). */}
      <AsOfPresetRows
        presets={presets}
        labels={labels}
        asOfDate={asOfDate}
        isPast={isPast}
        today={today}
        onAsOfDateChange={onAsOfDateChange}
      />

      {/* 타임머신 배너 — 앰버는 여기에만. C1 은 중립 톤이다(§5-A) */}
      {isPast && !isOut && !failed && (
        <div className="admin-snap-timemachine" role="status">
          <span>
            {String(labels.asofBanner).replace('{date}', asOfDate)}
            {data?.meta?.structureRevision && (
              <span className="admin-snap-timemachine-revision" data-testid="asof-structure-revision">
                {fill(labels.asofTreeRevision, {
                  version: data.meta.structureRevision.version,
                  date: data.meta.structureRevision.savedDate,
                })}
              </span>
            )}
          </span>
          <button type="button" onClick={() => onAsOfDateChange?.(today)}>
            {labels.asofBackToToday}
          </button>
        </div>
      )}

      <div className="admin-snap-summary-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }} aria-busy={pending || undefined}>
        {cards.map((c) => (
          <div key={c.key} className="admin-snap-summary-card">
            <p className="admin-snap-summary-label">{labels.asofCards[c.key]}</p>
            <p className="admin-snap-summary-value" data-testid={`asof-card-${c.key}`}>
              {pending ? <Skeleton width={56} height={24} inline /> : c.value}
            </p>
            {isOut && !pending && <p className="admin-snap-summary-norecord">{labels.asofNoRecord}</p>}
          </div>
        ))}
      </div>

      <div className={`admin-snap-content${pending ? ' is-pending' : ''}`} aria-busy={pending || undefined}>
        {failed ? (
          <EmptyState
            size="lg"
            data-testid="asof-load-error"
            title={labels.asofLoadError}
            description={error === 'timeout' ? labels.asofLoadErrorTimeout : undefined}
            actions={onRetry ? (
              <Button variant="secondary" size="sm" onClick={() => onRetry()}>
                {labels.asofRetry}
              </Button>
            ) : undefined}
          />
        ) : firstLoad ? (
          <SkeletonList count={8} height={28} gap={6} data-testid="asof-roster-skeleton" />
        ) : isOut ? (
          <EmptyState
            size="lg"
            data-testid="asof-empty-c1"
            title={labels.asofOutOfRangeTitle}
            description={labels.asofOutOfRangeBody}
            actions={(
              <>
                {minDate && (
                  <Button variant="primary" size="sm" onClick={() => onAsOfDateChange?.(minDate)}>
                    {labels.asofGoToCoverage}
                  </Button>
                )}
                <Button variant="secondary" size="sm" onClick={() => onAsOfDateChange?.(today)}>
                  {labels.asofBackToToday}
                </Button>
              </>
            )}
          />
        ) : isEmptyFact ? (
          <EmptyState
            size="lg"
            data-testid="asof-empty-c2"
            description={labels.asofEmptyFact || labels.asofEmpty}
            actions={(
              <Button variant="secondary" size="sm" onClick={() => onAsOfDateChange?.(today)}>
                {labels.asofBackToToday}
              </Button>
            )}
          />
        ) : isEmptyUnknown ? (
          <EmptyState size="lg" data-testid="asof-empty-unknown" description={labels.asofEmpty} />
        ) : (
          <SnapshotRoster
            rows={roster}
            labels={labels}
            showSalary={!!showComp && roster.some((r) => r.salary !== undefined)}
            changedHint={(col, row) => `${labels.roster[col]} · ${row.name}`}
            onMemberClick={onRosterMemberClick}
            extraColumns={rosterExtraColumns}
            baseColumns={rosterColumns}
            rowBadge={fromFixedCopy ? {
              label: labels.asofFixedCopy,
              title: labels.asofFixedCopyHint,
            } : null}
          />
        )}
      </div>
      {/* partial 은 명단을 가리지 않는다 — 한 줄만 붙인다(§5-A) */}
      {meta?.state === 'partial' && !isOut && !failed && (
        <p className="admin-snap-footnote">{labels.asofPartialNote}</p>
      )}
      {/* 그 날짜엔 아직 없던 열 — 열은 두고 값만 빈다(정책 E13·E18). 문장은 앱이 만든다(어느 열이 비는지는 서버가 안다). */}
      {labels.asofBlankColumnsNote && !isOut && !failed && (
        <p className="admin-snap-footnote" data-testid="asof-blank-columns-note">{labels.asofBlankColumnsNote}</p>
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
  /** As Of 명단 조회 실패(`asOf.error`) 때 [다시 시도] — 없으면 버튼을 그리지 않는다. */
  onAsOfRetry,
  // 발령 공통
  members = [],
  fieldOptions = {},
  changeableFields = [],
  bulkFields = [],
  selectFieldKeys = [],
  appointmentTypes = [],
  /**
   * 직군 > 직렬 > 직무 3단 축 `{ families, ladders, duties, laddersByFamily, dutiesByLadder }`
   * (PW-748). 발령 단건의 「변경 후」 세 칸이 이것으로 좁혀지고 서로 연동한다
   * (org-snapshot-spec §2 → admin-spec §3.5-A). 미주입이면 종전처럼 평면 목록이다.
   */
  jobAxis,
  /** 세 칸에 고를 값이 없을 때 [조직 설정 →] 이 부른다. 미주입이면 버튼 없이 사유만 */
  onOpenFieldOptions,
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
  onBulkRowAction,
  /** 템플릿에 덧붙일 겸직 열/샘플: `{ columns: [], sample: [], sampleByField: {} }` */
  bulkAffiliationTemplate,
  // 이력
  historyRecords = [],
  /** 발령 이력 목록을 못 불러왔을 때 사유 — 있으면 «이력이 없습니다» 대신 이것을 띄운다 (W66) */
  historyError,
  onExportHistory,
  /**
   * 예정 발령(행의 `scheduled: true`) 발효 전 취소 — `(record) => Promise` (PW-1422 · §4).
   * 거절되면 그 사유를 이력 화면 안에 띄운다. 미주입이면 취소 버튼이 없다.
   */
  onCancelScheduled,
  /**
   * 구조 개정 목록 `[{ version, savedAt, savedBy, changedUnits }]` (§4 · PW-1422).
   * 넘기면 발령 유형 필터에 「구조 개정」이 생긴다. `null` = 불러오는 중.
   */
  structureRevisions,
  /** 구조 개정 목록을 못 불러왔을 때 사유 — 「없습니다」 대신 이것이 보인다. */
  structureRevisionsError = '',
  /** 개정 한 건 상세 `(version) => Promise<{ changes: [{ unit, before, after }] }>` */
  onLoadStructureRevision,
  /**
   * 뷰 탭 위 안내 띠 `{ title, body }` (PW-760). 조직 현황을 과거 날짜로 조회했을 때
   * 「그 시점 스냅샷이 없어 가장 가까운 기록으로 재구성했다」를 앱이 문장으로 만들어 넘긴다 —
   * 재구성 상태 판정은 서버 응답을 읽는 앱의 몫이다. 없으면 안 그린다.
   */
  notice = null,
  /**
   * 원본 명단 표준 열 뒤에 덧붙일 열 `[{ key, comp }]` (PW-1295). 조직 현황·As Of 두 명단이 같이 쓴다.
   * `comp: true` 는 보상 열 — 보상 표시를 켜고 연봉 값이 실려 온 경우에만 나온다. 헤더는 `labels.roster[key]`.
   */
  rosterExtraColumns = [],
  rosterColumns,
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
      {notice && (
        <div className="admin-snap-asof-note" role="status">
          {notice.title && <strong>{notice.title}</strong>}
          {notice.body && <span>{notice.body}</span>}
        </div>
      )}
      {/* 화면 전환 탭 — 공용 Tabs(PW-836) */}
      <div className="tl-tabs-row adm-tabs-row">
        <Tabs
          items={viewKeys.map((v) => ({ value: v, label: labels.views[v] }))}
          value={view}
          onChange={(v) => onViewChange?.(v)}
        />
      </div>

      {loading ? (
        <LoadingState>{labels.loading}</LoadingState>
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
              rosterExtraColumns={rosterExtraColumns}
              rosterColumns={rosterColumns}
              today={today}
              coverageFrom={coverageFrom}
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
              onRetry={onAsOfRetry}
              onRosterMemberClick={onRosterMemberClick}
              rosterExtraColumns={rosterExtraColumns}
              rosterColumns={rosterColumns}
            />
          )}
          {view === 'single' && (
            <AppointmentSingleView
              members={members}
              fieldOptions={fieldOptions}
              changeableFields={changeableFields}
              selectFieldKeys={selectFieldKeys}
              appointmentTypes={appointmentTypes}
              jobAxis={jobAxis}
              onOpenFieldOptions={onOpenFieldOptions}
              labels={labels}
              onSubmit={onSubmitSingle}
              defaultDate={today}
              today={today}
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
              onRowAction={onBulkRowAction}
              affiliationTemplate={bulkAffiliationTemplate}
            />
          )}
          {view === 'history' && (
            <AppointmentHistoryView
              records={historyRecords}
              error={historyError}
              labels={labels}
              onExport={onExportHistory}
              onCancelScheduled={onCancelScheduled}
              structureRevisions={structureRevisions}
              structureRevisionsError={structureRevisionsError}
              onLoadStructureRevision={onLoadStructureRevision}
            />
          )}
        </>
      )}
    </div>
  );
}
