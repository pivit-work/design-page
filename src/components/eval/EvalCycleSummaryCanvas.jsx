import { useState, useMemo, useEffect, useRef, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { AlertIcon, LockIcon } from './evalIcons.jsx';
import AvatarPhoto from './AvatarPhoto';

/**
 * EvalCycleSummaryCanvas — HR 종합 리포트.
 * 탭: 전사 요약 / 부서별 / 통합 요약. + 리포트 검수(생성)·발송.
 */

const DEFAULT_LABELS = {
  title: '종합 리포트',
  workspaceTitle: '캘리브레이션 워크스페이스',
  // TC-095/118 조회 기간 선택기
  periodLabel: '조회 기간',
  periodQuarter: '분기',
  periodHalf: '반기',
  periodAnnual: '연간',
  workspaceSubtitle: '조견표 로스터 → 9칼럼 조정 테이블 → 어필 1인 재검토',
  tabOverview: '전사 요약',
  tabDept: '부서별 분석',
  tabIntegrated: '피평가자 통합 요약',
  tabLeaderPattern: '리더별 평가 패턴',
  tabCalib: '캘리브레이션 결과',
  tabExec: '경영진 대시보드',
  tabCalibWork: '캘리브레이션 워크스페이스',
  // §10.G 캘리브레이션 워크스페이스
  cwBanner: '권한: 캘리브레이션 위원회=조정·확정 / HR=조회 전용. 동급자 이해상충 자동 제외.',
  cwPointerTitle: '캘리브레이션 워크스페이스',
  cwPointerBody: '등급 조정·확정·어필 재검토는 독립 화면인 캘리브레이션 워크스페이스에서 수행됩니다. 이 탭(캘리브레이션 결과)은 조정 결과 통계·분포만 표시합니다.',
  cwPointerCta: '워크스페이스 열기',
  cwSessionsTitle: '내가 초대된 캘리브레이션 세션',
  cwNoSessions: '참여할 캘리브레이션이 없습니다',
  cwNoSessionsSub: '현재 사이클에서 초대된 세션이 없습니다. HR Admin이 세션에 초대하면 이 목록에 표시됩니다.',
  cwSessionMeta: '대상자 {members}명 · 위원 {committee}명',
  cwRoleChair: '위원장',
  cwRoleMember: '위원',
  cwRoleHrView: 'HR 조회',
  cwCreateLevelLabel: '레벨 · 직급 (복수 선택, 미선택=전 레벨)',
  cwOpen: '→ 열기',
  cwStatusDraft: '준비',
  cwStatusInProgress: '진행 중',
  cwStatusClosed: '완료',
  cwBack: '← 목록',
  cwReadOnlyBadge: 'HR 조회 전용 — 조정 불가',
  cwColNo: '#',
  cwColName: '이름',
  cwColJob: '직무',
  cwColTeam: '소속팀',
  cwColLevel: '직급·레벨',
  cwColLeader: '팀장',
  cwColDates: '입사일/승급일',
  cwColCurrent: '현재등급',
  cwColTrend: '성과 추이',
  cwColAdjust: '1차→위원회 조정',
  cwColPromo: '승진마킹',
  cwNoPromotion: '승급 이력 없음',
  cwPromoRecommended: '매니저 추천',
  cwPromoNone: '—',
  cwPromoApprove: '가',
  cwPromoReject: '부',
  cwPromoApproved: '위원회 승진',
  cwPromoRejected: '승진 제외',
  cwEmptyRows: '이 세션 scope에 해당하는 대상자가 없습니다.',
  cwLoadingTable: '테이블을 불러오는 중…',
  cwDistTitle: '등급 분포',
  cwDistLive: '실시간',
  cwDistCount: '{n}명',
  cwDistRec: '권장 {pct}%',
  cwDistNote: '※ 권장 비율은 정규분포 근사 참고 가이드이며 상대평가를 강제하지 않습니다. 필터·등급 조정에 따라 분포가 실시간 갱신됩니다.',
  cwFilterBtn: '필터',
  cwFilterTitle: '대상자 선별 필터',
  cwFilterDesc: '메타데이터(조직·등급·직무·승진)를 조합해 대상자를 선별합니다. 같은 항목의 여러 값은 OR, 특정 조건은 제외할 수 있습니다.',
  cwFilterInclude: '포함 조건',
  cwFilterFieldOp: '필드 간 조합',
  cwFilterExclude: '제외 조건',
  cwFilterExcludeHint: '해당 값을 가진 인원 제외',
  cwFilterApply: '적용',
  cwFilterClear: '초기화',
  cwFilterCancel: '취소',
  cwFilterActive: '필터 {n}명 / 전체 {total}명',
  cwFilterOn: '필터 적용 중',
  cwFilterPresetsLabel: '저장된 프리셋',
  cwFilterPresetShared: '공용',
  cwFilterPresetMine: '개인',
  cwFilterPresetNamePlaceholder: '현재 필터를 프리셋으로 저장 (이름)',
  cwFilterPresetShareLabel: '조직 공용',
  cwFilterPresetSave: '프리셋 저장',
  cwExcludeMember: '이 대상 제외',
  cwExcludedTitle: '개인 제외',
  cwExcludedRemove: '제외 해제',
  cwInboxTitle: '어필 재검토 인박스',
  cwInboxEmpty: '재검토 대기 중인 어필이 없습니다. 확정 후 매니저가 이의를 제기하면 여기에 표시됩니다.',
  cwAppealPending: '재검토 대기',
  cwAppealReviewCta: '→ 재검토',
  cwBackToInbox: '← 어필 목록',
  cwAppealTitle: '어필 재검토',
  cwAppealReasonLabel: '이의 사유 (매니저)',
  cwAppealFromTo: '근거 확정 등급',
  cwAppealRaisedBy: '제출 매니저',
  cwReviewDecisionTitle: '위원회 재검토 결정',
  cwReviewNoteLabel: '재검토 결정 사유 (필수)',
  cwReviewNotePlaceholder: '재검토 근거를 입력하세요…',
  cwNewGradeLabel: '재조정 등급',
  cwAccept: '수용 (등급 재조정)',
  cwReject: '반려',
  cwStatusAccepted: '수용 완료',
  cwStatusRejected: '반려 완료',
  cwReviewedByLabel: '결정',
  cwReviewOnlyNote: 'HR은 조회 전용입니다. 재검토는 위원회 위원만 가능합니다.',
  cwExclusionBanner: '이해상충 자동 제외 적용 중 — {n}명(위원 겸 대상자) 제외됨',
  cwExportCsv: 'CSV',
  cwDetailSelf: '올해 셀프 서머리',
  cwDetailManager: '매니저 코멘트',
  cwDetailPeer: '동료 리뷰 요약(익명)',
  cwDetailUpward: '상향 리뷰 요약(익명)',
  cwDetailUpwardEmpty: '상향 리뷰 데이터가 없습니다.',
  cwDetailTrait: '강점 · 보완',
  cwDetailTimeline: '직급·레벨 변동',
  cwTimelineEmpty: '직급 변동 이력 없음',
  cwDetailLogs: '변경 로그',
  cwLevelMixWarn: '이 세션에 여러 직급·레벨이 혼재합니다. 동일 레벨끼리 비교하는 것을 권장합니다.',
  cwDetailEmpty: '내용 없음',
  cwDetailLoading: '불러오는 중…',
  cwDetailFinal: '최종 확정',
  cwDetailProfile: '프로필',
  cwDetailPerf: '성과 요약',
  cwCommentsTitle: '위원회 논의',
  cwCommentsEmpty: '아직 논의 코멘트가 없습니다.',
  cwCommentPlaceholder: '조정 근거·이견을 입력…',
  cwCommentSubmit: '등록',
  cwCommentReadonly: 'HR 조회 전용 — 위원만 논의 코멘트를 작성할 수 있습니다.',
  cwCreateBtn: '＋ 위원회 생성',
  cwCreateTitle: '캘리브레이션 위원회 생성',
  cwCreateDesc: '① 평가 대상자(조직) 선택 → ② 참여 위원 지정. HR 준비 · 조정·확정 권한은 위원회.',
  cwCreateNameLabel: '제목',
  cwCreateNamePlaceholder: '예: Engineering 팀장급 캘리브레이션',
  cwCreateTargetLabel: '① 평가 대상자 · 조직 (복수 선택)',
  cwCreateTargetHint: '선택 조직의 대상자가 자동 매핑됩니다. 대상 인원은 생성 후 조견표에 표시됩니다.',
  cwCreatePreview: '예상 대상자 {n}명 (위원 제외)',
  cwCreateCommitteeLabel: '② 참여 위원 (조직장·시니어 IC)',
  cwCreateCommitteeHint: '먼저 선택한 위원이 위원장이 됩니다.',
  cwCreateCommitteeSearch: '이름으로 검색',
  cwCreateCommitteeSearchEmpty: '검색 결과가 없습니다.',
  cwKindLead: '조직장',
  cwKindSeniorIc: '시니어 IC',
  cwChair: '위원장',
  cwCreateSubmit: '위원회 생성',
  cwCreateCancel: '취소',
  cwCreateNoCommittee: '선택 가능한 위원 후보가 없습니다.',
  cwCreateNoDept: '조직 옵션이 없습니다.',
  // PW-129 위원 관리 — 생성 모달을 '관리' 모드로 재사용한다(별도 화면 없음).
  cwManageBtn: '위원 {n}명 관리',
  cwManageTitle: '위원 관리',
  cwManageListLabel: '참여 위원',
  cwManageHint:
    '위원장을 제외하면 남은 위원 중 먼저 합류한 사람이 위원장을 이어받습니다.',
  cwManageDesc: '체크하면 위원으로 추가되고, 체크를 해제하면 제외됩니다.',
  cwManageSubmit: '저장',
  cwManageLocked: '확정이 완료된 위원회는 위원을 변경할 수 없습니다.',
  cwManageNoPermission: '위원 구성 변경은 HR·관리자만 할 수 있습니다.',
  cwManageAdjustWarn:
    '제외하는 위원 중 등급 조정 이력이 있는 사람이 있습니다({names}). 저장하면 조정 내역은 그대로 남고 위원 자격만 해제됩니다.',
  cwManagePastMembers: '이미 제외된 위원: {names}',
  cwManagePastMember: '{name}(조정 {n}건 보존)',
  cwManageAdjustCount: '조정 {n}건',
  // §9.F 경영진 대시보드
  execBanner: '접근: HR Admin(전체) · 조직장·위원회(집계 조회) — CSV 다운로드는 HR Admin만 가능',
  execJ1: 'J1 전사 서머리',
  execJ2: 'J2 리더 평가 패턴',
  execJ3: 'J3 9블록 + 승진 요청',
  execJ4: 'J4 필터/CSV',
  execJ4Title: 'J4 — 표 필터/정렬 + CSV 다운로드 (공통 컴포넌트)',
  j4SavePreset: '+ 프리셋 저장',
  j4Shared: '공용',
  j4Personal: '개인',
  j4NoPreset: '저장된 프리셋이 없습니다.',
  j4Desc: '헤더 클릭 정렬 / 칼럼 필터 드롭다운 / AND·OR 조합 / 프리셋 불러오기 / CSV 다운로드(HR Admin 전용) — J4·G6·G4 공통 컴포넌트. 프리셋은 G 탭 캘리브레이션 워크스페이스와 동일 eval_filter_presets 엔티티 공유.',
  j4Csv: 'CSV 다운로드 (HR Admin)',
  j4Reset: '필터 초기화',
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
  nbWorkspaceOpen: '승진 9블록 보기',
  cwClose: '닫기',
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
  prRequester: '요청자',
  prShowAll: '전체 목록 보기',
  prF1: '① 평가 이력 요약',
  prF2: '② 검토 배경·필요성',
  prF3: '③ 레벨 역할 수행 사례',
  prF4: '④ 추가 사항',
  prStatusDraft: '작성 중',
  prStatusSubmitted: '검토 대기',
  prStatusCommittee: '위원회 검토 중',
  prStatusApproved: '승인',
  prStatusRejected: '반려',
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
  remindErrorToast: '리마인드 발송에 실패했습니다. 다시 시도해주세요.',
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

// §10.G 성과 추이 미니 선그래프 (eval_grade_history 스파크라인).
function MiniSparkline({ trend, domain }) {
  const scores = (trend ?? []).map((t) => (t == null ? null : t.score));
  const valid = scores.filter((s) => s != null);
  if (valid.length < 2) return <span className="evs-cw-spark-empty">—</span>;
  const min = domain?.min ?? 1;
  const max = Math.max(domain?.max ?? 3, min + 1);
  const W = 60;
  const H = 18;
  const x = (i) => (scores.length > 1 ? (i / (scores.length - 1)) * W : 0);
  const y = (v) => H - ((v - min) / (max - min)) * (H - 4) - 2;
  const firstIdx = scores.findIndex((v) => v != null);
  const d = scores
    .map((v, i) =>
      v == null ? null : `${i === firstIdx ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`,
    )
    .filter(Boolean)
    .join(' ');
  // TC-077/167 호버 툴팁 — 각 점(사이클명: 점수)과 전체 추이를 네이티브 SVG title 로 노출.
  const summary = (trend ?? [])
    .filter((t) => t && t.score != null)
    .map((t) => `${t.cycleName}: ${t.score}`)
    .join('  ·  ');
  return (
    <svg
      width={W}
      height={H}
      className="evs-cw-spark"
      role="img"
      data-testid="evs-cw-spark"
    >
      <title>{summary}</title>
      <path d={d} className="evs-cw-spark-line" fill="none" />
      {scores.map((v, i) =>
        v == null ? null : (
          <circle key={i} cx={x(i)} cy={y(v)} r={2} className="evs-cw-spark-dot">
            <title>
              {trend[i]?.cycleName ? `${trend[i].cycleName}: ${v}` : String(v)}
            </title>
          </circle>
        ),
      )}
    </svg>
  );
}

// 등급 톤: 최상위=green, 최하위=red, 그 외=accent.
function gradeTone(gradeKey, orderedGrades) {
  if (!gradeKey || !orderedGrades?.length) return 'muted';
  const idx = orderedGrades.findIndex((g) => g.gradeKey === gradeKey);
  if (idx < 0) return 'muted';
  if (idx === 0) return 'green';
  if (idx === orderedGrades.length - 1) return 'red';
  return 'accent';
}

// TC-076/166 캘리 테이블 정렬 — 텍스트 컬럼은 로캘 비교, 등급 컬럼은 orderedGrades 순서.
function sortCalibRows(rows, sort, orderedGrades) {
  if (!sort?.key) return rows;
  const gradeRank = (key) => {
    const idx = orderedGrades.findIndex((g) => g.gradeKey === key);
    return idx < 0 ? Number.POSITIVE_INFINITY : idx;
  };
  const val = (row) => {
    switch (sort.key) {
      case 'name':
        return row.name ?? '';
      case 'job':
        return row.job ?? '';
      case 'team':
        return row.team ?? '';
      case 'level':
        return row.level ?? '';
      case 'leader':
        return row.leaderName ?? '';
      case 'hireDate':
        return row.hireDate ?? '';
      case 'current':
        return gradeRank(row.calibratedGradeKey ?? row.currentGradeKey);
      default:
        return '';
    }
  };
  const dir = sort.dir === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const va = val(a);
    const vb = val(b);
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
    return String(va).localeCompare(String(vb), 'ko') * dir;
  });
}

// TC-076/166 정렬 가능한 테이블 헤더 — 클릭 시 asc↔desc 토글, 현재 정렬 방향 표시.
function SortTh({ sortKey, label, sort, onSort }) {
  const active = sort.key === sortKey;
  const arrow = active ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '';
  return (
    <th
      className={`evs-cw-th-sort${active ? ' is-active' : ''}`}
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      onClick={() =>
        onSort((prev) =>
          prev.key === sortKey
            ? { key: sortKey, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
            : { key: sortKey, dir: 'asc' },
        )
      }
      data-testid={`evs-cw-th-${sortKey}`}
    >
      {label}
      <span className="evs-cw-th-arrow">{arrow}</span>
    </th>
  );
}

// §4.1 실시간 등급 분포 바 — 유효등급(위원회조정 우선) 집계 + 권장비율 편차(±10%p).
function CalibDistributionBar({ rows, orderedGrades, L }) {
  const n = rows.length;
  const seg = orderedGrades.map((g) => ({
    ...g,
    tone: gradeTone(g.gradeKey, orderedGrades),
    count: rows.filter(
      (r) => (r.calibratedGradeKey ?? r.currentGradeKey) === g.gradeKey,
    ).length,
  }));
  const pct = (c) => (n ? Math.round((c / n) * 1000) / 10 : 0);
  return (
    <div className="evs-cw-dist" data-testid="evs-cw-dist">
      <div className="evs-cw-dist-head">
        <span className="evs-cw-dist-title">{L.cwDistTitle}</span>
        <span className="evs-cw-dist-live">{L.cwDistLive}</span>
        <span className="evs-cw-dist-count">{fmt(L.cwDistCount, { n })}</span>
      </div>
      <div className="evs-cw-dist-bar">
        {n === 0 ? (
          <div className="evs-cw-dist-empty">{L.cwEmptyRows}</div>
        ) : (
          seg.map((g) =>
            g.count > 0 ? (
              <div
                key={g.gradeKey}
                className={`evs-cw-dist-seg tone-${g.tone}`}
                style={{ width: `${(g.count / n) * 100}%` }}
                title={`${g.label} ${g.count} (${pct(g.count)}%)`}
              >
                {g.count / n >= 0.09 ? `${g.label} ${pct(g.count)}%` : ''}
              </div>
            ) : null,
          )
        )}
      </div>
      <div className="evs-cw-dist-chips">
        {seg.map((g) => {
          const p = pct(g.count);
          const rec = g.recommendedPct;
          const delta = rec == null ? 0 : Math.round((p - rec) * 10) / 10;
          const off = Math.abs(delta) >= 10;
          return (
            <div
              key={g.gradeKey}
              className={`evs-cw-dist-chip${off ? ' is-off' : ''} tone-${g.tone}`}
            >
              <span className={`evs-cw-dist-dot tone-${g.tone}`} />
              <span className="evs-cw-dist-chip-label">{g.label}</span>
              <span className="evs-cw-dist-chip-count">{g.count}</span>
              <span className={`evs-cw-dist-chip-pct tone-${g.tone}`}>{p}%</span>
              {rec != null && (
                <span className="evs-cw-dist-chip-rec">
                  {fmt(L.cwDistRec, { pct: rec })}
                  {delta !== 0 && (
                    <span className={`evs-cw-dist-delta${off ? ' is-off' : ''}`}>
                      {delta > 0 ? ' ▲' : ' ▼'}
                      {Math.abs(delta)}p
                    </span>
                  )}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="evs-cw-dist-note">{L.cwDistNote}</div>
    </div>
  );
}

// §6.3 R4 대상자 선별 필터 — 클라이언트 rows 필터.
const EMPTY_CALIB_FILTER = {
  includeConds: {},
  includeOp: 'AND',
  excludeConds: {},
  excludeIds: [], // R4b 개인(멤버) 제외
};
// 행에서 필터 필드값 추출. grade 는 유효등급(위원회 조정 우선).
function calibFilterFields(rows, L) {
  const defs = [
    { key: 'team', label: L.cwColTeam, get: (r) => r.team },
    {
      key: 'grade',
      label: L.cwColCurrent,
      get: (r) => r.calibratedGradeLabel ?? r.currentGradeLabel,
    },
    {
      key: 'promo',
      label: L.cwColPromo,
      get: (r) =>
        r.promotionStatus === 'recommended' ? L.cwPromoRecommended : '—',
    },
    { key: 'job', label: L.cwColJob, get: (r) => r.job || '—' },
  ];
  return defs.map((f) => ({
    ...f,
    values: [...new Set(rows.map(f.get).filter(Boolean))],
  }));
}
function condsMatch(row, conds, fields, op) {
  const active = fields.filter((f) => conds[f.key]?.length);
  if (active.length === 0) return true;
  const hit = (f) => conds[f.key].includes(f.get(row));
  return op === 'OR' ? active.some(hit) : active.every(hit);
}
function condsAny(row, conds, fields) {
  return fields.some(
    (f) => conds[f.key]?.length && conds[f.key].includes(f.get(row)),
  );
}
function rowPassesCalibFilter(row, fs, fields) {
  if (!fs) return true;
  if (fs.excludeIds?.includes(row.memberId)) return false;
  if (condsAny(row, fs.excludeConds, fields)) return false;
  return condsMatch(row, fs.includeConds, fields, fs.includeOp);
}
function isCalibFilterActive(fs) {
  return (
    Object.keys(fs.includeConds || {}).length > 0 ||
    Object.keys(fs.excludeConds || {}).length > 0 ||
    (fs.excludeIds || []).length > 0
  );
}

// TC-095/118 조회 기간 선택기 — 분기/반기/연간 세그먼트 + 시점 드롭다운 → cycleId 재조회.
const PERIOD_TYPE_KEYS = {
  quarter: 'periodQuarter',
  half: 'periodHalf',
  annual: 'periodAnnual',
};
function PeriodSelector({ periods, selectedCycleId, onChange, L }) {
  if (!periods || periods.length === 0) return null;
  const current = periods.find((p) => p.cycleId === selectedCycleId);
  const currentType = current?.type ?? periods[0].type;
  const typesPresent = ['quarter', 'half', 'annual'].filter((t) =>
    periods.some((p) => p.type === t),
  );
  const ofType = periods.filter((p) => p.type === currentType);
  return (
    <div className="evc-period" data-testid="evc-period">
      <span className="evc-period-label">{L.periodLabel}</span>
      <div className="evc-period-seg">
        {typesPresent.map((t) => (
          <button
            key={t}
            type="button"
            className={`evc-period-seg-btn${currentType === t ? ' is-on' : ''}`}
            onClick={() => {
              const latest = periods.filter((p) => p.type === t)[0];
              if (latest && latest.cycleId !== selectedCycleId)
                onChange?.(latest.cycleId);
            }}
            data-testid={`evc-period-type-${t}`}
          >
            {L[PERIOD_TYPE_KEYS[t]]}
          </button>
        ))}
      </div>
      <select
        className="evc-period-select"
        value={selectedCycleId ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        data-testid="evc-period-select"
      >
        {ofType.map((p) => (
          <option key={p.cycleId} value={p.cycleId}>
            {p.name} ({p.start} ~ {p.end})
          </option>
        ))}
      </select>
    </div>
  );
}

export default function EvalCycleSummaryCanvas({
  cycle,
  // TC-095/118 조회 기간 선택기(분기/반기/연간 → cycleId 재조회).
  periods = [],
  selectedCycleId = null,
  onPeriodChange,
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
  promotionRequests = [],
  filterPresets = [],
  execSummary = null,
  integrated = [],
  calibSessions = [],
  calibTable = null,
  calibTableLoading = false,
  selectedCalibSessionId = null,
  onSelectCalibSession,
  onAdjustGrade,
  onExportCalibCsv,
  calibComments = [],
  onAddCalibComment,
  onSetCommitteePromotion,
  canCreateSession = false,
  committeeCandidates = [],
  sessionDeptOptions = [],
  sessionLevelOptions = [],
  scopeRoster = [],
  onOpenCreateModal,
  onCreateSession,
  // PW-129 위원회 생성 후 위원 추가·제외.
  // 별도 화면을 만들지 않고 위 생성 모달을 '관리' 모드로 재사용한다.
  sessionCommittee = null,
  onOpenCommittee,
  onSaveCommittee,
  gradeAppeals = [],
  appealCanReview = false,
  selectedAppealId = null,
  onSelectAppeal,
  onReviewAppeal,
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
  onExportCsv,
  onSaveFilterPreset,
  workspaceOnly = false,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);
  const [tab, setTab] = useState(workspaceOnly ? 'calib_work' : 'overview');
  const [execSection, setExecSection] = useState('j1');
  const [nbSelectedMember, setNbSelectedMember] = useState(null);
  // R7b 워크스페이스 내 승진 9블록 모달
  const [showNineBox, setShowNineBox] = useState(false);
  // §10.G 어필 1인 재검토 폼 상태
  const [reviewNote, setReviewNote] = useState('');
  const [reviewGrade, setReviewGrade] = useState('');
  // §10.G4 캘리 테이블 행 펼침(아코디언)
  const [expandedCalibRow, setExpandedCalibRow] = useState(null);
  // TC-076/166 캘리 테이블 컬럼 정렬(헤더 클릭 → asc/desc 토글)
  const [calibSort, setCalibSort] = useState({ key: null, dir: 'asc' });
  const [commentDraft, setCommentDraft] = useState('');
  // §6.3 R4 대상자 선별 필터
  const [showCalibFilter, setShowCalibFilter] = useState(false);
  const [calibFilter, setCalibFilter] = useState(EMPTY_CALIB_FILTER);
  // R4b 프리셋 저장 입력
  const [presetName, setPresetName] = useState('');
  const [presetShared, setPresetShared] = useState(false);
  // R1(v0.3) 위원회 생성 모달
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDepts, setCreateDepts] = useState([]);
  const [createLevels, setCreateLevels] = useState([]);
  const [createCommittee, setCreateCommittee] = useState([]); // userId 배열, 순서=우선(첫=위원장)
  const [committeeSearch, setCommitteeSearch] = useState('');
  // 후보는 재직 구성원 전원(수백 명)이라 스크롤만으로는 못 찾는다 → 이름 부분일치 필터.
  // 검색 중에는 이미 고른 위원을 선택 순서대로 상단에 고정한다. 필터에 걸려 사라지면
  // 실수로 해제하거나 같은 사람을 다시 고르게 된다. 검색어를 비우면 원래 정렬로 복귀.
  const visibleCommitteeCandidates = useMemo(() => {
    const q = committeeSearch.trim().toLowerCase();
    if (!q) return committeeCandidates;
    const pinned = createCommittee
      .map((id) => committeeCandidates.find((c) => c.id === id))
      .filter(Boolean);
    const pinnedIds = new Set(pinned.map((c) => c.id));
    const matched = committeeCandidates.filter(
      (c) => !pinnedIds.has(c.id) && String(c.name ?? '').toLowerCase().includes(q),
    );
    return [...pinned, ...matched];
  }, [committeeCandidates, createCommittee, committeeSearch]);

  // PW-129 — 같은 모달을 '위원 관리' 로 재사용한다. 관리 모드에서는 제목/설명이 바뀌고
  // ①대상자·제목 입력이 숨으며, 후보 목록이 현재 위원으로 미리 체크된 채 열린다.
  const [committeeManage, setCommitteeManage] = useState(false);
  const activeCommittee = useMemo(
    () => (sessionCommittee?.members ?? []).filter((m) => m.isActive !== false),
    [sessionCommittee],
  );
  const pastCommittee = useMemo(
    () => (sessionCommittee?.members ?? []).filter((m) => m.isActive === false),
    [sessionCommittee],
  );
  // 위원 목록은 모달을 연 뒤 비동기로 도착한다. 도착 시 한 번만 체크 상태를 심는다 —
  // 매번 덮으면 사용자가 방금 바꾼 선택이 되돌아간다.
  const seededSessionRef = useRef(null);
  useEffect(() => {
    if (!showCreate || !committeeManage || !sessionCommittee) return;
    if (seededSessionRef.current === sessionCommittee.sessionId) return;
    seededSessionRef.current = sessionCommittee.sessionId;
    setCreateCommittee(activeCommittee.map((m) => m.userId));
  }, [showCreate, committeeManage, sessionCommittee, activeCommittee]);
  const committeeLocked = committeeManage && sessionCommittee?.locked === true;
  const committeeReadOnly =
    committeeManage &&
    (committeeLocked || sessionCommittee?.canManage === false);
  // 체크가 풀린 위원 중 조정 이력이 있는 사람 — 저장 전에 경고를 보여준다.
  const droppedWithHistory = useMemo(() => {
    if (!committeeManage) return [];
    const keep = new Set(createCommittee);
    return activeCommittee.filter(
      (m) => !keep.has(m.userId) && (m.adjustmentCount ?? 0) > 0,
    );
  }, [committeeManage, createCommittee, activeCommittee]);
  const adjustmentOf = useMemo(
    () =>
      new Map(
        (sessionCommittee?.members ?? []).map((m) => [
          m.userId,
          m.adjustmentCount ?? 0,
        ]),
      ),
    [sessionCommittee],
  );
  const committeeDirty = useMemo(() => {
    if (!committeeManage) return true;
    const before = activeCommittee.map((m) => m.userId).slice().sort();
    const after = createCommittee.slice().sort();
    return (
      before.length !== after.length || before.some((id, i) => id !== after[i])
    );
  }, [committeeManage, activeCommittee, createCommittee]);

  const closeCreateModal = () => {
    setShowCreate(false);
    setCommitteeManage(false);
    seededSessionRef.current = null;
  };
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
  const [remindError, setRemindError] = useState(false); // TC-202 발송 실패 토스트
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
    setRemindError(false);
    try {
      await onSendReminders(ids);
      setSent((prev) => new Set([...prev, ...ids]));
      setSelected(new Set());
      setRemindToast(ids.length);
    } catch {
      // TC-202 실패 시 전역 에러 대신 에러 토스트(선택 유지 → 재시도 가능).
      setRemindError(true);
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
    { key: 'calib_work', label: L.tabCalibWork },
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
  const prStatusMeta = {
    draft: { label: L.prStatusDraft, tone: 'neutral' },
    submitted: { label: L.prStatusSubmitted, tone: 'amber' },
    committee_review: { label: L.prStatusCommittee, tone: 'accent' },
    approved: { label: L.prStatusApproved, tone: 'green' },
    rejected: { label: L.prStatusRejected, tone: 'red' },
  };

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
          <h1 className="evc-title">
            {workspaceOnly ? L.workspaceTitle : L.title}
          </h1>
          {workspaceOnly ? (
            <p className="evc-summary">
              {L.workspaceSubtitle}
              {cycle?.name ? ` · ${cycle.name}` : ''}
            </p>
          ) : (
            cycle?.name && <p className="evc-summary">{cycle.name}</p>
          )}
          <PeriodSelector
            periods={periods}
            selectedCycleId={selectedCycleId}
            onChange={onPeriodChange}
            L={L}
          />
        </div>
        {!workspaceOnly && (
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
        )}
      </header>

      {!workspaceOnly && (
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
      )}

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
                          <span className="evs-leader-avatar" style={{ position: 'relative' }}>{(s.name || '?').slice(0, 1)}<AvatarPhoto photo={s.avatar} name={s.name} /></span>
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
                  <div className="evs-dept-outlier-title"><AlertIcon size={14} /> {L.deptOutlierTitle}</div>
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
                <p className="evs-lp-warn" data-testid="evs-lp-warn"><AlertIcon size={14} /> {L.lpMajorityWarn}</p>
              )}

              {/* Block 2 — 리더별 등급 분포 비교 */}
              <section className="evc-card">
                <h3 className="evc-card-name">{L.lpDistTitle}</h3>
                <div className="evs-lp-list">
                  {leaderPatterns.map((p) => (
                    <div className="evs-lp-row" key={p.leaderId} data-testid="evs-lp-row">
                      <div className="evs-lp-row-head">
                        <span className="evs-lp-lead">
                          <span className="evs-leader-avatar" style={{ position: 'relative' }}>{(p.name || '?').slice(0, 1)}<AvatarPhoto photo={p.avatar} name={p.name} /></span>
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
                <button
                  type="button"
                  className="evc-btn is-primary"
                  onClick={() => {
                    setTab('calib_work');
                    onOpenWorkspace?.();
                  }}
                  data-testid="evs-cd-workspace"
                >
                  {L.cdOpenWorkspace}
                </button>
              </div>
            </section>
          </>
        )}

        {tab === 'exec' && (
          <div className="evs-exec" data-testid="evs-exec">
            <p className="evs-exec-banner">{L.execBanner}</p>
            <div className="fb-tabs evs-exec-tabs">
              {[{ key: 'j1', label: L.execJ1 }, { key: 'j2', label: L.execJ2 }, { key: 'j3', label: L.execJ3 }, { key: 'j4', label: L.execJ4 }].map((s) => (
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
                              <span className="evs-leader-avatar" style={{ position: 'relative' }}>{(p.name || '?').slice(0, 1)}<AvatarPhoto photo={p.avatar} name={p.name} /></span>
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
                <p className="evs-exec-confidential"><LockIcon size={14} /> {L.nbConfidential}</p>
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
                                        <button type="button" className="evs-nb-name" key={m.memberId} onClick={() => { setNbSelectedMember(m.memberId); if (onNineBoxNameClick) onNineBoxNameClick(m.memberId); }}>{m.name || m.memberId}</button>
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
                    <div className="evs-pr-head">
                      <h3 className="evc-card-name">{L.prTitle}</h3>
                      {nbSelectedMember && (
                        <button type="button" className="evs-pr-showall" onClick={() => setNbSelectedMember(null)}>{L.prShowAll}</button>
                      )}
                    </div>
                    {(() => {
                      const list = nbSelectedMember
                        ? promotionRequests.filter((r) => r.memberId === nbSelectedMember)
                        : promotionRequests;
                      if (list.length === 0) return <p className="evc-empty-sub">{L.prEmpty}</p>;
                      return (
                        <div className="evs-pr-list">
                          {list.map((r) => {
                            const meta = prStatusMeta[r.status] ?? prStatusMeta.draft;
                            return (
                              <div className="evs-pr-card" key={r.memberId} data-testid="evs-pr-card">
                                <div className="evs-pr-card-head">
                                  <div>
                                    <span className="evs-pr-name">{r.memberName || r.memberId}</span>
                                    <span className="evs-pr-sub"> {r.dept} · {L.prRequester}: {r.requesterName || r.requesterId}</span>
                                  </div>
                                  <span className={`evs-lp-tag tone-${meta.tone}`}>{meta.label}</span>
                                </div>
                                {[
                                  { label: L.prF1, val: r.evalHistorySummary },
                                  { label: L.prF2, val: r.reviewBackground },
                                  { label: L.prF3, val: r.levelRoleExamples },
                                  { label: L.prF4, val: r.additionalNotes },
                                ].map((f) => f.val && (
                                  <div className="evs-pr-field" key={f.label}>
                                    <div className="evs-pr-field-label">{f.label}</div>
                                    <div className="evs-pr-field-val">{f.val}</div>
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </section>
                </div>
              </>
            )}

            {/* J4 — 필터 / CSV */}
            {execSection === 'j4' && (
              <section className="evc-card" data-testid="evs-exec-j4">
                <h3 className="evc-card-name">{L.execJ4Title}</h3>
                <div className="evs-j4-presets">
                  {filterPresets.length === 0 ? (
                    <span className="evc-empty-sub">{L.j4NoPreset}</span>
                  ) : (
                    filterPresets.map((p) => (
                      <span className="evs-j4-pill" key={p.id} data-testid="evs-j4-pill">
                        <span className={`evs-j4-pill-tag${p.isShared ? ' is-shared' : ''}`}>{p.isShared ? L.j4Shared : L.j4Personal}</span>
                        {p.name}
                      </span>
                    ))
                  )}
                  <button type="button" className="evs-j4-save" onClick={() => onSaveFilterPreset && onSaveFilterPreset()} data-testid="evs-j4-save">{L.j4SavePreset}</button>
                </div>
                <p className="evs-j4-desc">{L.j4Desc}</p>
                <div className="evs-j4-actions">
                  <button type="button" className="evc-btn is-primary" onClick={() => onExportCsv && onExportCsv()} data-testid="evs-j4-csv">{L.j4Csv}</button>
                  <button type="button" className="evc-btn is-ghost" data-testid="evs-j4-reset">{L.j4Reset}</button>
                </div>
              </section>
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
                          <span className="evs-leader-avatar" style={{ position: 'relative' }}>{(m.name || '?').slice(0, 1)}<AvatarPhoto photo={m.avatar} name={m.name} /></span>
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

        {tab === 'calib_work' && !workspaceOnly && (
          /* 요약 대시보드에서는 워크스페이스를 직접 렌더하지 않고 독립 화면으로 유도(포인터 카드). */
          <div className="evs-cw-pointer" data-testid="evs-calib-pointer">
            <div className="evs-cw-pointer-title">{L.cwPointerTitle}</div>
            <p className="evs-cw-pointer-body">{L.cwPointerBody}</p>
            <button
              type="button"
              className="evc-btn is-primary"
              onClick={() => onOpenWorkspace?.()}
              data-testid="evs-cw-pointer-cta"
            >
              {L.cwPointerCta}
            </button>
          </div>
        )}

        {tab === 'calib_work' && workspaceOnly && (
          <div className="evs-cw" data-testid="evs-calib-workspace">
            <div className="evs-cw-banner-row">
              <div className="evs-cw-banner">{L.cwBanner}</div>
              {nineBox && nineBox.assessedCount > 0 && (
                <button
                  type="button"
                  className="evc-btn is-ghost evs-cw-ninebox-btn"
                  onClick={() => setShowNineBox(true)}
                  data-testid="evs-cw-ninebox-open"
                >
                  {L.nbWorkspaceOpen}
                </button>
              )}
            </div>

            {showNineBox && nineBox && createPortal(
              <div
                className="evs-remind-overlay"
                data-testid="evs-cw-ninebox-modal"
                onClick={() => setShowNineBox(false)}
              >
                <div
                  className="evs-cw-ninebox-box"
                  role="dialog"
                  aria-modal="true"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="evs-cw-ninebox-head">
                    <h3 className="evc-card-name">{L.nbTitle}</h3>
                    <button
                      type="button"
                      className="evs-cw-ninebox-close"
                      onClick={() => setShowNineBox(false)}
                      aria-label={L.cwClose}
                    >
                      ×
                    </button>
                  </div>
                  <p className="evs-exec-confidential"><LockIcon size={14} /> {L.nbConfidential}</p>
                  {(() => {
                    const yKeys = ['recommended', 'not_yet', 'deferred'];
                    const xKeys = ['urgent', 'moderate', 'maintain'];
                    const yLabel = {
                      recommended: L.nbYRecommended,
                      not_yet: L.nbYNotYet,
                      deferred: L.nbYDeferred,
                    };
                    const xLabel = {
                      urgent: L.nbXUrgent,
                      moderate: L.nbXModerate,
                      maintain: L.nbXMaintain,
                    };
                    const yTone = {
                      recommended: 'green',
                      not_yet: 'neutral',
                      deferred: 'amber',
                    };
                    return (
                      <div className="evs-nb" data-testid="evs-cw-ninebox-grid">
                        <div className="evs-nb-grid">
                          <span className="evs-nb-corner" />
                          {xKeys.map((x) => (
                            <span className="evs-nb-xhead" key={x}>
                              {xLabel[x]}
                            </span>
                          ))}
                          {yKeys.map((y) => (
                            <Fragment key={y}>
                              <span className={`evs-nb-yhead tone-${yTone[y]}`}>
                                {yLabel[y]}
                              </span>
                              {xKeys.map((x) => {
                                const members = nineBox.cells[y][x];
                                const highlight =
                                  y === 'recommended' && x === 'urgent';
                                return (
                                  <div
                                    className={`evs-nb-cell x-${x}${highlight ? ' is-priority' : ''}`}
                                    key={x}
                                  >
                                    {members.length === 0 ? (
                                      <span className="evs-nb-empty-cell">—</span>
                                    ) : (
                                      members.map((m) => (
                                        <span
                                          className="evs-nb-name"
                                          key={m.memberId}
                                        >
                                          {m.name || m.memberId}
                                        </span>
                                      ))
                                    )}
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
                </div>
              </div>,
              document.body,
            )}

            {selectedAppealId ? (
              /* G5 — 어필 1인 재검토 */
              (() => {
                const appeal = gradeAppeals.find((a) => a.id === selectedAppealId);
                if (!appeal) return null;
                const decided = appeal.status !== 'open';
                const gradeOpts = gradeDistribution.map((d) => ({
                  gradeKey: d.gradeKey,
                  label: d.label,
                }));
                const submit = (decision) => {
                  if (!reviewNote.trim()) return;
                  onReviewAppeal?.(appeal.id, {
                    decision,
                    reviewNote: reviewNote.trim(),
                    newGradeKey:
                      decision === 'accept' ? reviewGrade || undefined : undefined,
                  });
                  setReviewNote('');
                  setReviewGrade('');
                };
                const statusTone = decided
                  ? appeal.status === 'accepted'
                    ? 'green'
                    : 'red'
                  : 'accent';
                const statusText = decided
                  ? appeal.status === 'accepted'
                    ? L.cwStatusAccepted
                    : L.cwStatusRejected
                  : L.cwAppealPending;
                return (
                  <div className="evs-cw-review" data-testid="evs-cw-review">
                    <div className="evs-cw-review-head">
                      <button
                        type="button"
                        className="evc-btn is-ghost"
                        onClick={() => {
                          onSelectAppeal?.(null);
                          setReviewNote('');
                          setReviewGrade('');
                        }}
                        data-testid="evs-cw-appeal-back"
                      >
                        {L.cwBackToInbox}
                      </button>
                      <div className="evs-cw-review-title">
                        {L.cwAppealTitle} · {appeal.memberName}
                      </div>
                      <span className="evs-cw-review-sub">
                        {appeal.job} · {appeal.team}
                      </span>
                      <span className={`evs-cw-status tone-${statusTone} evs-cw-review-status`}>
                        {statusText}
                      </span>
                    </div>
                    <div className="evc-card evs-cw-review-card">
                      <div className="evs-cw-review-grid">
                        <div>
                          <div className="evs-cw-review-k">{L.cwAppealRaisedBy}</div>
                          <div className="evs-cw-review-v">{appeal.raisedByName || '—'}</div>
                        </div>
                        <div>
                          <div className="evs-cw-review-k">{L.cwAppealFromTo}</div>
                          <div className="evs-cw-review-v">
                            {appeal.fromGradeLabel ? (
                              <span className="evs-cw-badge tone-muted">
                                {appeal.fromGradeLabel}
                              </span>
                            ) : (
                              '—'
                            )}
                            {appeal.toGradeLabel ? (
                              <>
                                {' '}
                                <span className="evs-cw-arrow">→</span>{' '}
                                <span className="evs-cw-badge tone-accent">
                                  {appeal.toGradeLabel}
                                </span>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <div className="evs-cw-review-reason">
                        <div className="evs-cw-review-k">{L.cwAppealReasonLabel}</div>
                        <div className="evs-cw-review-reason-body">{appeal.reason}</div>
                      </div>

                      {decided ? (
                        <div className="evs-cw-review-decided">
                          <div className="evs-cw-review-k">
                            {L.cwReviewedByLabel}
                            {appeal.reviewedByName ? ` · ${appeal.reviewedByName}` : ''}
                          </div>
                          <div className="evs-cw-review-v">{appeal.reviewNote}</div>
                        </div>
                      ) : appealCanReview ? (
                        <div className="evs-cw-review-form">
                          <div className="evs-cw-review-k">{L.cwReviewDecisionTitle}</div>
                          <div className="evs-cw-review-row">
                            <span className="evs-cw-review-k">{L.cwNewGradeLabel}</span>
                            <select
                              className="evs-cw-adjust-select"
                              data-testid="evs-cw-review-grade"
                              value={reviewGrade}
                              onChange={(e) => setReviewGrade(e.target.value)}
                            >
                              <option value="">—</option>
                              {gradeOpts.map((g) => (
                                <option key={g.gradeKey} value={g.gradeKey}>
                                  {g.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <textarea
                            className="evs-cw-review-note"
                            data-testid="evs-cw-review-note"
                            placeholder={L.cwReviewNotePlaceholder}
                            value={reviewNote}
                            onChange={(e) => setReviewNote(e.target.value)}
                            rows={3}
                          />
                          <div className="evs-cw-review-actions">
                            <button
                              type="button"
                              className="evc-btn is-ghost"
                              disabled={!reviewNote.trim()}
                              onClick={() => submit('reject')}
                              data-testid="evs-cw-appeal-reject"
                            >
                              {L.cwReject}
                            </button>
                            <button
                              type="button"
                              className="evc-btn is-primary"
                              disabled={!reviewNote.trim()}
                              onClick={() => submit('accept')}
                              data-testid="evs-cw-appeal-accept"
                            >
                              {L.cwAccept}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="evs-cw-review-readonly">{L.cwReviewOnlyNote}</div>
                      )}
                    </div>
                  </div>
                );
              })()
            ) : !selectedCalibSessionId ? (
              /* G1 — 어필 인박스 + 내가 초대된 세션 조견표 */
              <div className="evs-cw-roster">
                <div className="evs-cw-inbox">
                  <div className="evs-section-label">
                    {L.cwInboxTitle}
                    {gradeAppeals.filter((a) => a.status === 'open').length > 0
                      ? ` (${gradeAppeals.filter((a) => a.status === 'open').length})`
                      : ''}
                  </div>
                  {gradeAppeals.filter((a) => a.status === 'open').length === 0 ? (
                    <div className="evs-cw-empty">
                      <div className="evs-cw-empty-sub">{L.cwInboxEmpty}</div>
                    </div>
                  ) : (
                    gradeAppeals
                      .filter((a) => a.status === 'open')
                      .map((a) => (
                        <button
                          type="button"
                          key={a.id}
                          className="evs-cw-appeal"
                          onClick={() => onSelectAppeal?.(a.id)}
                          data-testid="evs-cw-appeal"
                        >
                          <span className="evs-cw-appeal-badge">{L.cwAppealPending}</span>
                          <div className="evs-cw-appeal-main">
                            <div className="evs-cw-appeal-name">
                              {a.memberName}
                              <span className="evs-cw-appeal-sub">
                                {' '}
                                · {a.job} · {a.team}
                              </span>
                            </div>
                            <div className="evs-cw-appeal-meta">
                              {a.fromGradeLabel && a.toGradeLabel
                                ? `${a.fromGradeLabel} → ${a.toGradeLabel} · `
                                : ''}
                              {a.raisedByName ? `${a.raisedByName} ` : ''}어필
                            </div>
                          </div>
                          <span className="evs-cw-appeal-cta">{L.cwAppealReviewCta}</span>
                        </button>
                      ))
                  )}
                </div>
                <div className="evs-cw-roster-head">
                  <div className="evs-section-label">{L.cwSessionsTitle}</div>
                  {canCreateSession && (
                    <button
                      type="button"
                      className="evc-btn is-primary evs-cw-create-btn"
                      onClick={() => {
                        setShowCreate(true);
                        setCreateName('');
                        setCreateDepts([]);
                        setCreateLevels([]);
                        setCreateCommittee([]);
                        setCommitteeSearch('');
                        onOpenCreateModal?.();
                      }}
                      data-testid="evs-cw-create"
                    >
                      {L.cwCreateBtn}
                    </button>
                  )}
                </div>
                {calibSessions.length === 0 ? (
                  <div className="evs-cw-empty" data-testid="evs-cw-empty">
                    <div className="evs-cw-empty-title">{L.cwNoSessions}</div>
                    <div className="evs-cw-empty-sub">{L.cwNoSessionsSub}</div>
                  </div>
                ) : (
                  calibSessions.map((s) => {
                    const statusLabel =
                      s.status === 'closed'
                        ? L.cwStatusClosed
                        : s.status === 'in_progress'
                          ? L.cwStatusInProgress
                          : L.cwStatusDraft;
                    const tone =
                      s.status === 'closed'
                        ? 'green'
                        : s.status === 'in_progress'
                          ? 'accent'
                          : 'muted';
                    const closed = s.status === 'closed';
                    return (
                      <button
                        type="button"
                        key={s.id}
                        className={`evs-cw-session${closed ? ' is-closed' : ''}`}
                        onClick={() => onSelectCalibSession?.(s.id)}
                        data-testid="evs-cw-session"
                      >
                        <div className="evs-cw-session-main">
                          <div className="evs-cw-session-name">
                            {s.name}
                            {s.myRole === 'chair' ? (
                              <span className="evs-cw-myrole tone-chair">
                                {L.cwRoleChair}
                              </span>
                            ) : s.myRole === 'member' ? (
                              <span className="evs-cw-myrole tone-member">
                                {L.cwRoleMember}
                              </span>
                            ) : s.myRole == null ? (
                              <span className="evs-cw-myrole tone-hr">
                                {L.cwRoleHrView}
                              </span>
                            ) : null}
                          </div>
                          <div className="evs-cw-session-meta">
                            {fmt(L.cwSessionMeta, {
                              members: s.memberCount,
                              committee: s.committeeCount,
                            })}
                          </div>
                        </div>
                        <span className={`evs-cw-status tone-${tone}`}>{statusLabel}</span>
                        <span className="evs-cw-open">{L.cwOpen}</span>
                      </button>
                    );
                  })
                )}
              </div>
            ) : (
              /* G2 — 세션 9칼럼 테이블 (read-only) */
              <div className="evs-cw-table-view">
                <div className="evs-cw-table-head">
                  <button
                    type="button"
                    className="evc-btn is-ghost evs-cw-back"
                    onClick={() => onSelectCalibSession?.(null)}
                    data-testid="evs-cw-back"
                  >
                    {L.cwBack}
                  </button>
                  <div className="evs-cw-table-title">{calibTable?.session?.name ?? ''}</div>
                  {calibTable?.readOnly && (
                    <span className="evs-cw-readonly" data-testid="evs-cw-readonly">
                      {L.cwReadOnlyBadge}
                    </span>
                  )}
                  <button
                    type="button"
                    className={`evc-btn is-ghost evs-cw-filter-btn${isCalibFilterActive(calibFilter) ? ' is-active' : ''}`}
                    onClick={() => setShowCalibFilter(true)}
                    data-testid="evs-cw-filter-btn"
                  >
                    {L.cwFilterBtn}
                    {isCalibFilterActive(calibFilter) ? ' ●' : ''}
                  </button>
                  {onOpenCommittee && (
                    <button
                      type="button"
                      className="evc-btn is-ghost evs-cw-committee-btn"
                      onClick={() => {
                        setShowCreate(true);
                        setCommitteeManage(true);
                        setCommitteeSearch('');
                        setCreateCommittee([]);
                        seededSessionRef.current = null;
                        onOpenCommittee?.();
                      }}
                      data-testid="evs-cw-committee"
                    >
                      {fmt(L.cwManageBtn, {
                        n: calibTable?.session?.committeeCount ?? 0,
                      })}
                    </button>
                  )}
                  <button
                    type="button"
                    className="evc-btn is-ghost evs-cw-csv"
                    onClick={() => onExportCalibCsv?.()}
                    data-testid="evs-cw-csv"
                  >
                    {L.cwExportCsv}
                  </button>
                </div>

                {calibTable && calibTable.excludedCount > 0 && (
                  <div className="evs-cw-exclusion" data-testid="evs-cw-exclusion">
                    {fmt(L.cwExclusionBanner, { n: calibTable.excludedCount })}
                  </div>
                )}

                {calibTableLoading || !calibTable ? (
                  <div className="evs-cw-empty">
                    <div className="evs-cw-empty-sub">{L.cwLoadingTable}</div>
                  </div>
                ) : calibTable.rows.length === 0 ? (
                  <div className="evs-cw-empty">
                    <div className="evs-cw-empty-sub">{L.cwEmptyRows}</div>
                  </div>
                ) : (
                  (() => {
                    const og = calibTable.orderedGrades ?? [];
                    const scores = og.map((g) => g.score);
                    const domain = {
                      min: scores.length ? Math.min(...scores) : 1,
                      max: scores.length ? Math.max(...scores) : 3,
                    };
                    const filterFields = calibFilterFields(calibTable.rows, L);
                    const filterActive = isCalibFilterActive(calibFilter);
                    const filteredRows = filterActive
                      ? calibTable.rows.filter((r) =>
                          rowPassesCalibFilter(r, calibFilter, filterFields),
                        )
                      : calibTable.rows;
                    const visibleRows = sortCalibRows(filteredRows, calibSort, og);
                    return (
                      <>
                      <CalibDistributionBar
                        rows={visibleRows}
                        orderedGrades={og}
                        L={L}
                      />
                      {filterActive && (
                        <div
                          className="evs-cw-filter-active"
                          data-testid="evs-cw-filter-active"
                        >
                          {L.cwFilterOn} ·{' '}
                          {fmt(L.cwFilterActive, {
                            n: visibleRows.length,
                            total: calibTable.rows.length,
                          })}
                          <button
                            type="button"
                            className="evs-cw-filter-clear"
                            onClick={() => setCalibFilter(EMPTY_CALIB_FILTER)}
                          >
                            {L.cwFilterClear}
                          </button>
                        </div>
                      )}
                      <div className="evc-card evs-cw-table-wrap">
                        <table className="evs-cw-table">
                          <thead>
                            <tr>
                              <th>{L.cwColNo}</th>
                              <SortTh sortKey="name" label={L.cwColName} sort={calibSort} onSort={setCalibSort} />
                              <SortTh sortKey="job" label={L.cwColJob} sort={calibSort} onSort={setCalibSort} />
                              <SortTh sortKey="team" label={L.cwColTeam} sort={calibSort} onSort={setCalibSort} />
                              <SortTh sortKey="level" label={L.cwColLevel} sort={calibSort} onSort={setCalibSort} />
                              <SortTh sortKey="leader" label={L.cwColLeader} sort={calibSort} onSort={setCalibSort} />
                              <SortTh sortKey="hireDate" label={L.cwColDates} sort={calibSort} onSort={setCalibSort} />
                              <SortTh sortKey="current" label={L.cwColCurrent} sort={calibSort} onSort={setCalibSort} />
                              <th>{L.cwColTrend}</th>
                              <th>{L.cwColAdjust}</th>
                              <th>{L.cwColPromo}</th>
                              <th aria-label="expand"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {visibleRows.map((row, i) => {
                              const expanded = expandedCalibRow === row.memberId;
                              const detail =
                                expanded && selectedMemberId === row.memberId
                                  ? memberDetail
                                  : null;
                              return (
                              <Fragment key={row.memberId}>
                              <tr data-testid="evs-cw-row">
                                <td className="evs-cw-num">{i + 1}</td>
                                <td className="evs-cw-name">{row.name}</td>
                                <td className="evs-cw-muted">{row.job || '—'}</td>
                                <td className="evs-cw-muted">{row.team}</td>
                                <td className="evs-cw-muted">{row.level || '—'}</td>
                                <td className="evs-cw-muted">{row.leaderName ?? '—'}</td>
                                <td>
                                  <div className="evs-cw-date">{row.hireDate ?? '—'}</div>
                                  <div className="evs-cw-date is-sub">
                                    {row.promotedAt ?? L.cwNoPromotion}
                                  </div>
                                </td>
                                <td>
                                  {row.currentGradeKey ? (
                                    <span
                                      className={`evs-cw-badge tone-${gradeTone(row.currentGradeKey, og)}`}
                                    >
                                      {row.currentGradeLabel}
                                    </span>
                                  ) : (
                                    <span className="evs-cw-muted">—</span>
                                  )}
                                </td>
                                <td>
                                  <MiniSparkline trend={row.gradeTrend} domain={domain} />
                                </td>
                                <td>
                                  <div className="evs-cw-adjust">
                                    <span
                                      className={`evs-cw-badge tone-${gradeTone(row.currentGradeKey, og)}`}
                                    >
                                      {row.currentGradeLabel ?? '—'}
                                    </span>
                                    {calibTable.readOnly ? (
                                      row.adjusted &&
                                      row.calibratedGradeKey !== row.currentGradeKey ? (
                                        <>
                                          <span className="evs-cw-arrow">→</span>
                                          <span
                                            className={`evs-cw-badge tone-${gradeTone(row.calibratedGradeKey, og)}`}
                                          >
                                            {row.calibratedGradeLabel}
                                          </span>
                                        </>
                                      ) : null
                                    ) : (
                                      <>
                                        <span className="evs-cw-arrow">→</span>
                                        <select
                                          className="evs-cw-adjust-select"
                                          data-testid="evs-cw-adjust-select"
                                          value={row.calibratedGradeKey ?? ''}
                                          onChange={(e) =>
                                            onAdjustGrade?.(row.memberId, e.target.value)
                                          }
                                        >
                                          {og.map((g) => (
                                            <option key={g.gradeKey} value={g.gradeKey}>
                                              {g.label}
                                            </option>
                                          ))}
                                        </select>
                                      </>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  <div className="evs-cw-promo-cell">
                                    {row.promotionStatus === 'recommended' && (
                                      <span className="evs-cw-promo tone-green">
                                        {L.cwPromoRecommended}
                                      </span>
                                    )}
                                    {calibTable.readOnly ? (
                                      row.committeePromotion ? (
                                        <span
                                          className={`evs-cw-promo tone-${row.committeePromotion === 'approved' ? 'green' : 'red'}`}
                                        >
                                          {row.committeePromotion === 'approved'
                                            ? L.cwPromoApproved
                                            : L.cwPromoRejected}
                                        </span>
                                      ) : row.promotionStatus !== 'recommended' ? (
                                        <span className="evs-cw-muted">
                                          {L.cwPromoNone}
                                        </span>
                                      ) : null
                                    ) : (
                                      <div className="evs-cw-promo-toggle">
                                        <button
                                          type="button"
                                          className={`evs-cw-promo-btn${row.committeePromotion === 'approved' ? ' is-on tone-green' : ''}`}
                                          data-testid="evs-cw-promo-approve"
                                          title={L.cwPromoApproved}
                                          onClick={() =>
                                            onSetCommitteePromotion?.(
                                              row.memberId,
                                              row.committeePromotion === 'approved'
                                                ? null
                                                : 'approved',
                                            )
                                          }
                                        >
                                          {L.cwPromoApprove}
                                        </button>
                                        <button
                                          type="button"
                                          className={`evs-cw-promo-btn${row.committeePromotion === 'rejected' ? ' is-on tone-red' : ''}`}
                                          title={L.cwPromoRejected}
                                          onClick={() =>
                                            onSetCommitteePromotion?.(
                                              row.memberId,
                                              row.committeePromotion === 'rejected'
                                                ? null
                                                : 'rejected',
                                            )
                                          }
                                        >
                                          {L.cwPromoReject}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className="evs-cw-expand"
                                    data-testid="evs-cw-expand"
                                    aria-expanded={expanded}
                                    onClick={() => {
                                      if (expanded) {
                                        setExpandedCalibRow(null);
                                      } else {
                                        setExpandedCalibRow(row.memberId);
                                        onSelectMember?.(row.memberId);
                                      }
                                    }}
                                  >
                                    {expanded ? '−' : '+'}
                                  </button>
                                </td>
                              </tr>
                              {expanded && (
                                <tr data-testid="evs-cw-detail">
                                  <td colSpan={12} className="evs-cw-detail-cell">
                                    {!detail ? (
                                      <div className="evs-cw-detail-loading">
                                        {L.cwDetailLoading}
                                      </div>
                                    ) : (
                                      <div className="evs-cw-detail evs-cw-detail-3col">
                                        {/* 좌: 프로필 */}
                                        <div className="evs-cw-detail-profile">
                                          <div className="evs-cw-detail-profile-name">
                                            {row.name}
                                          </div>
                                          <div className="evs-cw-detail-profile-role">
                                            {(row.job || '—') + ' · ' + row.team}
                                          </div>
                                          {row.level ? (
                                            <div className="evs-cw-detail-profile-level">
                                              {L.cwColLevel}: <strong>{row.level}</strong>
                                            </div>
                                          ) : null}
                                          <button
                                            type="button"
                                            className="evc-btn is-ghost evs-cw-exclude-btn"
                                            onClick={() =>
                                              setCalibFilter((fs) => ({
                                                ...fs,
                                                excludeIds: [
                                                  ...(fs.excludeIds || []),
                                                  row.memberId,
                                                ],
                                              }))
                                            }
                                            data-testid="evs-cw-exclude-member"
                                          >
                                            {L.cwExcludeMember}
                                          </button>
                                          {[
                                            ...new Set(
                                              visibleRows
                                                .map((r) => r.level)
                                                .filter(Boolean),
                                            ),
                                          ].length > 1 && (
                                            <div
                                              className="evs-cw-detail-levelmix"
                                              data-testid="evs-cw-levelmix"
                                            >
                                              <AlertIcon size={14} /> {L.cwLevelMixWarn}
                                            </div>
                                          )}
                                          <dl className="evs-cw-detail-facts">
                                            <div>
                                              <dt>{L.cwColCurrent}</dt>
                                              <dd>
                                                {row.currentGradeLabel ? (
                                                  <span
                                                    className={`evs-cw-badge tone-${gradeTone(row.currentGradeKey, og)}`}
                                                  >
                                                    {row.currentGradeLabel}
                                                  </span>
                                                ) : (
                                                  '—'
                                                )}
                                              </dd>
                                            </div>
                                            <div>
                                              <dt>{L.cwColLeader}</dt>
                                              <dd>{row.leaderName ?? '—'}</dd>
                                            </div>
                                            <div>
                                              <dt>{L.cwColDates}</dt>
                                              <dd>
                                                {(row.hireDate ?? '—') +
                                                  ' / ' +
                                                  (row.promotedAt ?? L.cwNoPromotion)}
                                              </dd>
                                            </div>
                                          </dl>
                                          {/* R5b 직급·레벨 변동 타임라인 */}
                                          <div className="evs-cw-timeline">
                                            <div className="evs-cw-review-k">
                                              {L.cwDetailTimeline}
                                            </div>
                                            {detail.assignmentHistory?.length ? (
                                              <ol className="evs-cw-timeline-list">
                                                {detail.assignmentHistory.map(
                                                  (h, ti) => (
                                                    <li
                                                      className="evs-cw-timeline-item"
                                                      key={ti}
                                                    >
                                                      <span className="evs-cw-timeline-at">
                                                        {fmtDate(h.at)}
                                                      </span>
                                                      <span className="evs-cw-timeline-move">
                                                        {(h.fromPosition ?? '—') +
                                                          ' → ' +
                                                          h.toPosition}
                                                      </span>
                                                      {h.note ? (
                                                        <span className="evs-cw-timeline-note">
                                                          {h.note}
                                                        </span>
                                                      ) : null}
                                                    </li>
                                                  ),
                                                )}
                                              </ol>
                                            ) : (
                                              <div className="evs-cw-timeline-empty">
                                                {L.cwTimelineEmpty}
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {/* 중: 성과 요약 */}
                                        <div className="evs-cw-detail-mid">
                                          <div className="evs-cw-detail-block">
                                            <div className="evs-cw-review-k">
                                              {L.cwDetailSelf}
                                            </div>
                                            <div className="evs-cw-detail-body">
                                              {detail.self?.answers?.filter(
                                                (a) => a.textAnswer,
                                              ).length
                                                ? detail.self.answers
                                                    .filter((a) => a.textAnswer)
                                                    .map((a) => a.textAnswer)
                                                    .join(' · ')
                                                : L.cwDetailEmpty}
                                            </div>
                                          </div>
                                          <div className="evs-cw-detail-block">
                                            <div className="evs-cw-review-k">
                                              {L.cwDetailManager}
                                            </div>
                                            <div className="evs-cw-detail-body">
                                              {detail.manager?.answers?.filter(
                                                (a) => a.textAnswer,
                                              ).length
                                                ? detail.manager.answers
                                                    .filter((a) => a.textAnswer)
                                                    .map((a) => a.textAnswer)
                                                    .join(' · ')
                                                : L.cwDetailEmpty}
                                            </div>
                                          </div>
                                          <div className="evs-cw-detail-block">
                                            <div className="evs-cw-review-k">
                                              {L.cwDetailPeer}
                                            </div>
                                            <div className="evs-cw-detail-body">
                                              {detail.peer?.answers?.filter(
                                                (a) => a.textAnswer,
                                              ).length
                                                ? detail.peer.answers
                                                    .filter((a) => a.textAnswer)
                                                    .map((a) => a.textAnswer)
                                                    .join(' · ')
                                                : L.cwDetailEmpty}
                                            </div>
                                          </div>
                                          <div className="evs-cw-detail-block">
                                            <div className="evs-cw-review-k">
                                              {L.cwDetailUpward}
                                            </div>
                                            <div className="evs-cw-detail-body">
                                              {detail.upward?.answers?.filter(
                                                (a) => a.textAnswer,
                                              ).length
                                                ? detail.upward.answers
                                                    .filter((a) => a.textAnswer)
                                                    .map((a) => a.textAnswer)
                                                    .join(' · ')
                                                : L.cwDetailUpwardEmpty}
                                            </div>
                                          </div>
                                          {(() => {
                                            const traits = [
                                              ...(detail.self?.answers ?? []),
                                              ...(detail.manager?.answers ?? []),
                                              ...(detail.peer?.answers ?? []),
                                            ].filter(
                                              (a) => a.growthType && a.textAnswer,
                                            );
                                            if (!traits.length) return null;
                                            return (
                                              <div className="evs-cw-detail-block">
                                                <div className="evs-cw-review-k">
                                                  {L.cwDetailTrait}
                                                </div>
                                                <div className="evs-cw-detail-body">
                                                  {traits
                                                    .map((a) => a.textAnswer)
                                                    .join(' · ')}
                                                </div>
                                              </div>
                                            );
                                          })()}
                                          {detail.calibration?.history?.length > 0 && (
                                            <div className="evs-cw-detail-logs">
                                              <div className="evs-cw-review-k">
                                                {L.cwDetailLogs}
                                              </div>
                                              {detail.calibration.history.map(
                                                (h, hi) => (
                                                  <div
                                                    className="evs-cw-detail-log"
                                                    key={hi}
                                                  >
                                                    <span className="evs-cw-badge tone-muted">
                                                      {h.fromLabel ?? '—'}
                                                    </span>
                                                    <span className="evs-cw-arrow">
                                                      →
                                                    </span>
                                                    <span className="evs-cw-badge tone-accent">
                                                      {h.toLabel}
                                                    </span>
                                                    {h.note ? (
                                                      <span className="evs-cw-detail-log-note">
                                                        {h.note}
                                                      </span>
                                                    ) : null}
                                                  </div>
                                                ),
                                              )}
                                            </div>
                                          )}
                                        </div>

                                        {/* 우: 위원회 논의 코멘트 */}
                                        <div className="evs-cw-detail-comments">
                                          <div className="evs-cw-review-k">
                                            {L.cwCommentsTitle}
                                          </div>
                                          <div className="evs-cw-comment-list">
                                            {calibComments.length === 0 ? (
                                              <div className="evs-cw-comment-empty">
                                                {L.cwCommentsEmpty}
                                              </div>
                                            ) : (
                                              calibComments.map((cm) => (
                                                <div
                                                  className="evs-cw-comment"
                                                  key={cm.id}
                                                  data-testid="evs-cw-comment"
                                                >
                                                  <span className="evs-cw-comment-author">
                                                    {cm.authorName || '위원'}
                                                  </span>
                                                  <span className="evs-cw-comment-body">
                                                    {cm.body}
                                                  </span>
                                                </div>
                                              ))
                                            )}
                                          </div>
                                          {calibTable.readOnly ? (
                                            <div className="evs-cw-comment-readonly">
                                              {L.cwCommentReadonly}
                                            </div>
                                          ) : (
                                            <div className="evs-cw-comment-form">
                                              <textarea
                                                className="evs-cw-comment-input"
                                                data-testid="evs-cw-comment-input"
                                                value={commentDraft}
                                                onChange={(e) =>
                                                  setCommentDraft(e.target.value)
                                                }
                                                placeholder={L.cwCommentPlaceholder}
                                                rows={2}
                                              />
                                              <button
                                                type="button"
                                                className="evc-btn is-primary evs-cw-comment-submit"
                                                data-testid="evs-cw-comment-submit"
                                                disabled={!commentDraft.trim()}
                                                onClick={() => {
                                                  onAddCalibComment?.(
                                                    row.memberId,
                                                    commentDraft.trim(),
                                                  );
                                                  setCommentDraft('');
                                                }}
                                              >
                                                {L.cwCommentSubmit}
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              )}
                              </Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      </>
                    );
                  })()
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* §6.3 R4 대상자 선별 필터 모달 */}
      {showCalibFilter && calibTable && createPortal(
        <div
          className="evs-remind-overlay"
          data-testid="evs-cw-filter-modal"
          onClick={() => setShowCalibFilter(false)}
        >
          <div
            className="evs-cw-filter"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const fields = calibFilterFields(calibTable.rows, L);
              const toggleCond = (which, key, value) =>
                setCalibFilter((prev) => {
                  const conds = { ...(prev[which] || {}) };
                  const cur = conds[key] || [];
                  const next = cur.includes(value)
                    ? cur.filter((v) => v !== value)
                    : [...cur, value];
                  if (next.length === 0) delete conds[key];
                  else conds[key] = next;
                  return { ...prev, [which]: conds };
                });
              const palette = (which, tone) => (
                <div className="evs-cw-filter-palette">
                  {fields.map((f) => (
                    <div key={f.key} className="evs-cw-filter-field">
                      <div className="evs-cw-filter-field-label">{f.label}</div>
                      <div className="evs-cw-filter-chips">
                        {f.values.map((v) => {
                          const on = (calibFilter[which]?.[f.key] || []).includes(
                            v,
                          );
                          return (
                            <button
                              type="button"
                              key={v}
                              className={`evs-cw-chip${on ? ` is-on tone-${tone}` : ''}`}
                              onClick={() => toggleCond(which, f.key, v)}
                            >
                              {on ? (tone === 'red' ? '✕ ' : '✓ ') : ''}
                              {v}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
              return (
                <>
                  <div className="evs-cw-filter-head">
                    <div className="evs-cw-create-title">{L.cwFilterTitle}</div>
                    <div className="evs-cw-create-desc">{L.cwFilterDesc}</div>
                  </div>
                  {filterPresets.length > 0 && (
                    <div
                      className="evs-cw-filter-presets"
                      data-testid="evs-cw-filter-presets"
                    >
                      <span className="evs-cw-filter-presets-label">
                        {L.cwFilterPresetsLabel}
                      </span>
                      {filterPresets.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="evs-cw-filter-preset-pill"
                          onClick={() =>
                            setCalibFilter({
                              includeConds: p.filterConditions?.includeConds ?? {},
                              includeOp: p.filterConditions?.includeOp ?? 'AND',
                              excludeConds: p.filterConditions?.excludeConds ?? {},
                              excludeIds: p.filterConditions?.excludeIds ?? [],
                            })
                          }
                          data-testid="evs-cw-filter-preset-pill"
                        >
                          {p.name}
                          <span className="evs-cw-filter-preset-tag">
                            {p.isShared ? L.cwFilterPresetShared : L.cwFilterPresetMine}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="evs-cw-filter-body">
                    <div className="evs-cw-filter-sec">
                      <div className="evs-cw-filter-sec-head">
                        <span className="evs-cw-filter-sec-title">
                          {L.cwFilterInclude}
                        </span>
                        <div className="evs-cw-filter-op">
                          <span className="evs-cw-filter-op-label">
                            {L.cwFilterFieldOp}
                          </span>
                          {['AND', 'OR'].map((op) => (
                            <button
                              type="button"
                              key={op}
                              className={`evs-cw-filter-op-btn${calibFilter.includeOp === op ? ' is-on' : ''}`}
                              onClick={() =>
                                setCalibFilter((prev) => ({
                                  ...prev,
                                  includeOp: op,
                                }))
                              }
                            >
                              {op}
                            </button>
                          ))}
                        </div>
                      </div>
                      {palette('includeConds', 'accent')}
                    </div>
                    <div className="evs-cw-filter-sec evs-cw-filter-sec-exclude">
                      <span className="evs-cw-filter-sec-title">
                        {L.cwFilterExclude}{' '}
                        <span className="evs-cw-filter-sec-hint">
                          · {L.cwFilterExcludeHint}
                        </span>
                      </span>
                      {palette('excludeConds', 'red')}
                    </div>
                  </div>
                  {calibFilter.excludeIds?.length > 0 && (
                    <div
                      className="evs-cw-filter-excluded"
                      data-testid="evs-cw-filter-excluded"
                    >
                      <span className="evs-cw-filter-sec-title">
                        {L.cwExcludedTitle} ({calibFilter.excludeIds.length})
                      </span>
                      <div className="evs-cw-filter-excluded-list">
                        {calibFilter.excludeIds.map((mid) => {
                          const m = calibTable.rows.find(
                            (r) => r.memberId === mid,
                          );
                          return (
                            <button
                              key={mid}
                              type="button"
                              className="evs-cw-filter-excluded-pill"
                              title={L.cwExcludedRemove}
                              onClick={() =>
                                setCalibFilter((fs) => ({
                                  ...fs,
                                  excludeIds: (fs.excludeIds || []).filter(
                                    (x) => x !== mid,
                                  ),
                                }))
                              }
                            >
                              {(m?.name || mid) + ' ×'}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className="evs-cw-filter-save">
                    <input
                      className="evs-cw-create-input evs-cw-filter-save-name"
                      placeholder={L.cwFilterPresetNamePlaceholder}
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      data-testid="evs-cw-filter-preset-name"
                    />
                    <label className="evs-cw-filter-save-shared">
                      <input
                        type="checkbox"
                        checked={presetShared}
                        onChange={(e) => setPresetShared(e.target.checked)}
                      />
                      {L.cwFilterPresetShareLabel}
                    </label>
                    <button
                      type="button"
                      className="evc-btn is-ghost"
                      disabled={!presetName.trim()}
                      onClick={() => {
                        onSaveFilterPreset?.(
                          presetName.trim(),
                          {
                            includeConds: calibFilter.includeConds,
                            includeOp: calibFilter.includeOp,
                            excludeConds: calibFilter.excludeConds,
                            excludeIds: calibFilter.excludeIds,
                          },
                          presetShared,
                        );
                        setPresetName('');
                        setPresetShared(false);
                      }}
                      data-testid="evs-cw-filter-preset-save"
                    >
                      {L.cwFilterPresetSave}
                    </button>
                  </div>
                  <div className="evs-cw-filter-foot">
                    <button
                      type="button"
                      className="evc-btn is-ghost"
                      onClick={() => setCalibFilter(EMPTY_CALIB_FILTER)}
                    >
                      {L.cwFilterClear}
                    </button>
                    <button
                      type="button"
                      className="evc-btn is-primary"
                      data-testid="evs-cw-filter-apply"
                      onClick={() => setShowCalibFilter(false)}
                    >
                      {L.cwFilterApply}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>,
        document.body,
      )}

      {/* R1(v0.3) 캘리브레이션 위원회 생성 모달 */}
      {showCreate && createPortal(
        <div
          className="evs-remind-overlay"
          data-testid="evs-cw-create-modal"
          onClick={closeCreateModal}
        >
          <div
            className="evs-cw-create"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="evs-cw-create-title">
              {committeeManage ? L.cwManageTitle : L.cwCreateTitle}
            </div>
            <div className="evs-cw-create-desc">
              {committeeManage ? L.cwManageDesc : L.cwCreateDesc}
            </div>

            {!committeeManage && (
              <>
                <label className="evs-cw-create-lbl">{L.cwCreateNameLabel}</label>
                <input
                  className="evs-cw-create-input"
                  data-testid="evs-cw-create-name"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder={L.cwCreateNamePlaceholder}
                />
              </>
            )}

            {!committeeManage && (
            <div className="evs-cw-create-section evs-cw-create-section-target">
              <div className="evs-cw-create-lbl">{L.cwCreateTargetLabel}</div>
              {sessionDeptOptions.length === 0 ? (
                <div className="evs-cw-create-muted">{L.cwCreateNoDept}</div>
              ) : (
                <div className="evs-cw-create-chips">
                  {sessionDeptOptions.map((d) => {
                    const on = createDepts.includes(d);
                    return (
                      <button
                        type="button"
                        key={d}
                        className={`evs-cw-chip${on ? ' is-on tone-accent' : ''}`}
                        onClick={() =>
                          setCreateDepts((prev) =>
                            prev.includes(d)
                              ? prev.filter((x) => x !== d)
                              : [...prev, d],
                          )
                        }
                      >
                        {on ? '✓ ' : ''}
                        {d}
                      </button>
                    );
                  })}
                </div>
              )}
              {sessionLevelOptions.length > 0 && (
                <>
                  <div className="evs-cw-create-lbl">{L.cwCreateLevelLabel}</div>
                  <div className="evs-cw-create-chips">
                    {sessionLevelOptions.map((lv) => {
                      const on = createLevels.includes(lv);
                      return (
                        <button
                          type="button"
                          key={lv}
                          className={`evs-cw-chip${on ? ' is-on tone-accent' : ''}`}
                          onClick={() =>
                            setCreateLevels((prev) =>
                              prev.includes(lv)
                                ? prev.filter((x) => x !== lv)
                                : [...prev, lv],
                            )
                          }
                        >
                          {on ? '✓ ' : ''}
                          {lv}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
              <div className="evs-cw-create-hint">{L.cwCreateTargetHint}</div>
              {scopeRoster.length > 0 &&
                (() => {
                  const committeeSet = new Set(createCommittee);
                  const n = scopeRoster.filter(
                    (m) =>
                      !committeeSet.has(m.memberId) &&
                      (createDepts.length === 0 ||
                        createDepts.includes(m.dept)) &&
                      (createLevels.length === 0 ||
                        createLevels.includes(m.level)),
                  ).length;
                  return (
                    <div
                      className="evs-cw-create-preview"
                      data-testid="evs-cw-create-preview"
                    >
                      {fmt(L.cwCreatePreview, { n })}
                    </div>
                  );
                })()}
            </div>
            )}

            <div className="evs-cw-create-section evs-cw-create-section-committee">
              <div className="evs-cw-create-lbl">
                {committeeManage ? L.cwManageListLabel : L.cwCreateCommitteeLabel}
              </div>
              {committeeCandidates.length === 0 ? (
                <div className="evs-cw-create-muted">{L.cwCreateNoCommittee}</div>
              ) : (
                <>
                <input
                  className="evs-cw-create-input evs-cw-create-search"
                  value={committeeSearch}
                  onChange={(e) => setCommitteeSearch(e.target.value)}
                  placeholder={L.cwCreateCommitteeSearch}
                  aria-label={L.cwCreateCommitteeSearch}
                  data-testid="evs-cw-committee-search"
                />
                {visibleCommitteeCandidates.length === 0 ? (
                  <div
                    className="evs-cw-create-muted"
                    data-testid="evs-cw-committee-search-empty"
                  >
                    {L.cwCreateCommitteeSearchEmpty}
                  </div>
                ) : (
                <div className="evs-cw-create-candidates">
                  {visibleCommitteeCandidates.map((c) => {
                    const idx = createCommittee.indexOf(c.id);
                    const on = idx >= 0;
                    return (
                      <button
                        type="button"
                        key={c.id}
                        className={`evs-cw-candidate${on ? ' is-on' : ''}`}
                        data-testid="evs-cw-candidate"
                        disabled={committeeReadOnly}
                        onClick={() =>
                          setCreateCommittee((prev) =>
                            prev.includes(c.id)
                              ? prev.filter((x) => x !== c.id)
                              : [...prev, c.id],
                          )
                        }
                      >
                        <span
                          className={`evc-member-check${on ? ' is-on' : ''}`}
                          data-testid={`evs-cw-candidate-check-${c.id}`}
                        />
                        <span className="evs-cw-candidate-name">{c.name}</span>
                        <span
                          className={`evs-cw-candidate-kind tone-${c.kind === 'lead' ? 'accent' : 'muted'}`}
                        >
                          {c.kind === 'lead' ? L.cwKindLead : L.cwKindSeniorIc}
                        </span>
                        {c.dept ? (
                          <span className="evs-cw-candidate-dept">{c.dept}</span>
                        ) : null}
                        {committeeManage && adjustmentOf.get(c.id) > 0 ? (
                          <span className="evs-cw-candidate-dept">
                            {fmt(L.cwManageAdjustCount, {
                              n: adjustmentOf.get(c.id),
                            })}
                          </span>
                        ) : null}
                        {on && idx === 0 ? (
                          <span className="evs-cw-candidate-chair">{L.cwChair}</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                )}
                </>
              )}
              <div className="evs-cw-create-hint">
                {committeeManage ? L.cwManageHint : L.cwCreateCommitteeHint}
              </div>
              {committeeManage && pastCommittee.length > 0 && (
                <div
                  className="evs-cw-create-hint"
                  data-testid="evs-cw-committee-past"
                >
                  {fmt(L.cwManagePastMembers, {
                    names: pastCommittee
                      .map((m) =>
                        fmt(L.cwManagePastMember, {
                          name: m.name,
                          n: m.adjustmentCount ?? 0,
                        }),
                      )
                      .join(', '),
                  })}
                </div>
              )}
              {committeeManage && committeeLocked && (
                <div
                  className="evs-cw-exclusion"
                  data-testid="evs-cw-committee-locked"
                >
                  {L.cwManageLocked}
                </div>
              )}
              {committeeManage &&
                !committeeLocked &&
                sessionCommittee?.canManage === false && (
                  <div
                    className="evs-cw-exclusion"
                    data-testid="evs-cw-committee-readonly"
                  >
                    {L.cwManageNoPermission}
                  </div>
                )}
              {committeeManage && droppedWithHistory.length > 0 && (
                <div
                  className="evs-cw-exclusion"
                  data-testid="evs-cw-committee-warn"
                >
                  {fmt(L.cwManageAdjustWarn, {
                    names: droppedWithHistory.map((m) => m.name).join(', '),
                  })}
                </div>
              )}
            </div>

            <div className="evs-cw-create-actions">
              <button
                type="button"
                className="evc-btn is-ghost"
                onClick={closeCreateModal}
              >
                {L.cwCreateCancel}
              </button>
              {committeeManage ? (
                <button
                  type="button"
                  className="evc-btn is-primary"
                  data-testid="evs-cw-committee-submit"
                  disabled={
                    committeeReadOnly ||
                    createCommittee.length === 0 ||
                    !committeeDirty
                  }
                  onClick={() => {
                    onSaveCommittee?.(createCommittee);
                    closeCreateModal();
                  }}
                >
                  {L.cwManageSubmit}
                </button>
              ) : (
                <button
                  type="button"
                  className="evc-btn is-primary"
                  data-testid="evs-cw-create-submit"
                  disabled={!createName.trim() || createCommittee.length === 0}
                  onClick={() => {
                    const scope = {};
                    if (createDepts.length > 0) scope.departments = createDepts;
                    if (createLevels.length > 0) scope.levels = createLevels;
                    onCreateSession?.({
                      name: createName.trim(),
                      scope,
                      committee: createCommittee.map((userId, i) => ({
                        userId,
                        role: i === 0 ? 'chair' : 'member',
                      })),
                    });
                    closeCreateModal();
                  }}
                >
                  {L.cwCreateSubmit}
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* §4.A 미제출자 리마인드 모달 */}
      {showRemind && createPortal(
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
                    <span className="evs-remind-avatar" style={{ position: 'relative', background: n.color || 'var(--utility-blue-500)' }}>
                      {(n.name || '?').slice(0, 1)}
                      <AvatarPhoto photo={n.avatar} name={n.name} />
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
            {remindError && (
              <div
                className="evs-remind-toast is-error"
                role="alert"
                data-testid="evs-remind-error"
              >
                {L.remindErrorToast}
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
        </div>,
        document.body,
      )}
    </div>
  );
}
