import { useState, useMemo, useRef, useEffect } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';
import { buildOrgTree } from './orgTree.js';
import ModalShell from '../shared/ModalShell.jsx';
import ConfirmModal from '../shared/ConfirmModal.jsx';
import Tabs from '../shared/Tabs.jsx';
import DateInput from '../shared/DateInput.jsx';
import {
  IconAlert, IconChevronDown, IconChevronUp, IconDownload, IconPlus, IconTrash, IconUpload, IconUser, IconX,
} from './employeesIcons.jsx';
import {
  INVITE_MAX_ROWS, FAIL_LABEL_KEY, emailOk, jobPairIssue, ladderLocked, laddersForFamily,
  nameHasEmail, normEmail, reconcilePrimary, fmt,
} from './inviteRules.js';
import {
  INVITE_CSV_DEFAULT_LABELS, INVITE_CSV_MAX_ROWS,
  buildInviteCsvContext, buildInviteTemplateCsv, employeeCodeKey, employeeCodeOwnerMap, inviteCsvColumns, inviteCsvIssues,
  inviteCsvNotes, inviteCsvPayload, parseInviteCsv, resolveInviteCsvRow,
} from './inviteCsv.js';
import InviteCsvStagingTable from './InviteCsvStagingTable.jsx';
import { readCsvFileText } from '../shared/csvFileText.js';

/**
 * AdminInviteModal — 구성원 초대 발송 모달.
 *
 * 정본: pivit-specs `J. Admin_관리자/screen-admin-employees-invite.policy.md` v1.0
 *      시안 `J. Admin_관리자/admin-employees-view.jsx` 의 InviteModal
 * 근거: 2026-08-10 정기미팅 §8 액션 10 (PW-114)
 *
 * 왜 생겼나: 구성원 관리에는 초대 진입점이 두 곳(탭 A `+ 구성원 초대`, 탭 C
 * `+ 새 초대 발송`) 있었는데 **둘 다 클릭 핸들러가 없는 데모**였다. 실제 발송
 * 경로가 온보딩에만 있어서, 온보딩을 끝낸 워크스페이스는 사람을 더 초대할
 * 수단이 없었다. 두 진입점이 이 모달 하나를 연다.
 *
 * 핵심 규칙
 *  · **직접 입력은 «한 명»이 기본이다**(PW-1310 · 정책서 §1). 사람 1명이면 일괄 지정 바가 없고,
 *    `+ 한 명 더 추가` 로 2명이 되면 바가 열린다. 한 사람 = 카드 한 장 — 주요 정보(소속·직급·
 *    직책·직군›직렬›직무·입사일·고용형태·근무지)는 펼치고 «추가 정보»(직위·직종·닉네임·사번·상급자)만 접는다
 *  · 겸직 다중 소속 + 주 소속(소속 2개 이상이면 주 소속 필수, §2-3·§4-3) — 소속은 검색해서 고른다
 *  · **조직장은 «예약»이다**(2026-09-15 David) — 가입 전에는 team_members 행이 없어
 *    "그 팀 소속자만 조직장"(§1-3-f L3)을 지금 만족할 수 없다. 소속 줄마다 예약하고 가입 때 적용된다
 *  · 직렬은 직군에, 직무는 직렬에 매달린 3단 선택이다(INV-3 · INV-8). 직함은 초대에서 받지 않는다
 *  · **직종은 조직이 켰을 때만 받는다**(`jobCategoryEnabled`) — 2026-09-15 David 확정
 *    (PW-644 · 정책서 §2-2·§2-3·§5 V12). 끈 조직에는 칸 자체가 없다
 *
 * 🔴 **인사 축은 이미 여러 번 뒤집혔다.** 「초대에서 직렬 제외」(2026-08-12)는 직군 칸이
 *    없는 **온보딩 초대 한정** 결정이고, 「초대 모달에 직무 칸이 있다」(2026-08-16)는
 *    라벨만 `직무` 였던 직렬 칸을 본 오독이었다(PW-189). 직무는 2026-09-15 에 받기로 했다.
 *    여기를 고치기 전에 정책서 §2-2 확정 배너를 먼저 읽을 것.
 *  · 좌석은 발송이 아니라 **가입 수락 시점**에 증가한다 → 헤더 문구가 미래형
 *  · 부분 성공은 모달을 **유지**한다(§3) — 닫으면 실패분의 이름·소속 입력이
 *    사라져 처음부터 다시 입력해야 한다
 *
 * 모든 문자열·데이터는 props 로 받는다. UI 상태(행·일괄값·확인 모달)만 내부 소유.
 */

const DEFAULT_LABELS = {
  // CSV 열 이름·칸 사유 — 온보딩과 같은 한 벌(`inviteCsv.js`)을 쓴다(PW-902).
  ...INVITE_CSV_DEFAULT_LABELS,
  title: '구성원 초대',
  close: '닫기',
  seatsUnlimited: '좌석 무제한',
  seatsLeft: '남은 좌석 {n}석',
  seatsUnknown: '좌석 정보를 불러오지 못했어요',
  // 좌석은 수락 시점에 증가한다 — 반드시 미래형(§4-4).
  seatsWillGrow: '초대 시 {n}명 증가 (수락 시점 반영)',
  seatShort: '남은 좌석 {left}석 — {need}명을 초대하려면 플랜을 변경해야 합니다.',
  seatNone: '남은 좌석이 없습니다. 플랜을 변경해야 초대할 수 있습니다.',
  goBilling: '결제·구독',
  bulkTitle: '일괄 지정',
  bulkHint: '여러 명에게 같은 값을 넣을 때 씁니다. 값을 바꿔도 이미 입력한 사람에게는 반영되지 않습니다.',
  // [PW-1310] 종전 「전체 적용」은 넣어 둔 값을 덮어쓴다는 것을 이름이 말하지 않았다(§4-2).
  bulkApplyEmpty: '빈 칸에만 적용',
  bulkApplyAll: '모두 덮어쓰기',
  bulkAppliedEmpty: '{n}명의 빈 칸에 적용했어요',
  bulkAppliedAll: '{n}명의 값을 모두 덮어썼어요',
  bulkUndo: '실행 취소',
  // 안내 줄(§2-3) — 어드민이 넣는 값과 본인이 채우는 값을 가른다
  guideLine1: '필수는 이메일·이름 둘이고 나머지는 아는 만큼 넣습니다. 여기서 넣는 값은 회사가 정하는 조직 배치 정보입니다.',
  guideLine2: '전화번호·생년월일·집 주소·비상연락처는 가입 후 본인이 «내 설정»에서 채웁니다.',
  singleHint: '여러 명이면 같은 값을 한꺼번에 넣는 칸이 열립니다 · 수십 명은 «CSV로 일괄 초대»가 빠릅니다',
  personN: '{n}번째 사람',
  extraInfo: '추가 정보',
  extraInfoCount: '추가 정보 · {n}개 입력됨',
  jobPosition: '직책',
  jobDuty: '직무',
  jobRank: '직위',
  hireDate: '입사일',
  nickname: '닉네임',
  employeeCode: '사번',
  manager: '상급자',
  dutyNeedsLadder: '직렬을 먼저 선택하세요',
  role: '권한',
  roleMember: '멤버',
  roleManager: '매니저',
  roleAdmin: '어드민',
  jobLevel: '직급',
  jobFamily: '직군',
  // ⚠ 키는 `jobTitle` 이지만 값은 **직렬**이다(M5-b 승격). 라벨을 `직무` 로 두었던
  // 것이 PW-412 의 문서·구현 혼선을 만든 직접 원인이라 기본값도 정정한다.
  jobTitle: '직렬',
  workLocation: '근무지',
  jobCategory: '직종',
  employmentType: '고용형태',
  unset: '미지정',
  optionsEmpty: '옵션 없음 — 직군/직렬/직무 설정에서 추가',
  // 직렬이 직군 때문에 잠겼을 때 — 「옵션 없음」이라고 하면 원인을 잘못 가리킨다
  ladderNeedsFamily: '직군을 먼저 선택하세요',
  email: '이메일',
  emailPlaceholder: 'name@company.com',
  name: '이름',
  namePlaceholder: '이름 (필수)',
  removeRow: '이 사람 빼기',
  addRow: '한 명 더 추가',
  maxRows: '한 번에 최대 {n}명까지 초대할 수 있어요',
  teams: '소속',
  teamsEmpty: '조직이 없습니다 — 팀 관리에서 먼저 만들어주세요',
  teamSearch: '조직 이름으로 검색',
  teamSearchExample: '조직 이름으로 검색 — 예: {name}',
  teamSearchNone: '검색 결과가 없어요 — 초대에서는 조직을 새로 만들지 않습니다',
  teamPicked: '고른 소속',
  teamAdd: '소속 추가 (겸직)',
  teamAddCancel: '추가 그만두기',
  teamRemove: '{path} 빼기',
  primaryTeam: '주 소속',
  primaryMoved: '주 소속이 {path}(으)로 변경되었습니다',
  leaderReserve: '이 조직의 조직장으로 초대',
  leaderNote: '조직장은 가입이 끝나는 시점에 적용됩니다.',
  squadNote: '스쿼드 배정은 조직도 스쿼드 뷰에서 별도로 합니다 (기능조직과 다른 축).',
  summary: '{n}명에게 초대를 보냅니다',
  /* [PW-1331 · 초대 V5·V6 2026-10-06 기획 확정] 이 창은 다시 보내지 않는다 — 가입 전 구성원은 목록의
     «초대 보내기», 대기 중인 초대는 그 줄의 [재발송]으로 보낸다. */
  noteUnjoinedMember: '가입 전 구성원이에요 — 전체 구성원 탭에서 «초대 보내기»로 보내세요',
  resendPending: '재발송',
  resendingPending: '보내는 중…',
  resendPendingError: '재발송하지 못했어요. 잠시 후 다시 시도해주세요.',
  cancel: '취소',
  send: '초대 보내기',
  sending: '보내는 중…',
  partialFail: '{n}건 실패 — 사유를 확인하세요',
  sendError: '초대를 보내지 못했어요. 잠시 후 다시 시도해주세요.',
  // 검증 문구 V1~V7
  errInvalidEmail: '유효하지 않은 이메일',
  errAlreadyMember: '이미 멤버입니다',
  errTerminatedMember: '퇴사한 구성원에게는 초대를 보낼 수 없어요',
  /* 재입사 모드(PW-1355 · 초대 §9 E8 · 퇴사 처리 §5-G) — 명부의 퇴사자 이메일을 넣은 행 */
  rehireBadge: '재입사',
  rehireNotice: '이전에 퇴사한 구성원이에요. 수락하면 이전 기록에 이어서 재입사로 등록됩니다.',
  rehireRevertNotice: '퇴사일부터 14일 안이에요 — 잘못 처리한 퇴사라면 상세 패널에서 «퇴사 취소»를 쓰세요',
  rehireRoleLocked: '재입사자는 멤버로 시작합니다 — 가입 뒤 권한을 바꾸세요',
  errRehireHireDate: '재입사는 새 입사일이 필요해요',
  errPendingInvite: '초대 대기 중',
  errDuplicate: '이 발송에 중복된 이메일이에요',
  errName: '이름을 입력해주세요',
  errNameTooLong: '이름은 {max}자까지 입력할 수 있어요',
  errNameEmail: '이름에 이메일 주소를 넣을 수 없어요. 실명을 입력해주세요',
  errPrimaryTeam: '주 소속을 지정해주세요',
  // V7 — (직군, 직렬) 쌍(INV-3)
  errLadderNeedsFamily: '직군을 먼저 선택해주세요',
  errJobPair: '직군에 없는 직렬입니다',
  // V11 — (직렬, 직무) 쌍(INV-8) · V16 — 사번 (PW-1310)
  errDutyNeedsLadder: '직렬을 먼저 선택해주세요',
  errDutyPair: '직렬에 없는 직무입니다',
  errEmployeeCodeDuplicate: '이 발송에 중복된 사번이에요',
  // 발송 실패 사유(§8)
  failAlreadyMember: '이미 멤버입니다',
  failTerminatedMember: '퇴사한 구성원에게는 초대를 보낼 수 없어요',
  failRehireHireDate: '재입사는 새 입사일이 필요해요',
  failPendingExists: '이미 초대 대기 중입니다',
  failSeatLimit: '좌석이 부족합니다',
  failPrimaryTeam: '주 소속을 지정해주세요',
  failTeamNotFound: '고른 소속을 찾을 수 없습니다',
  failNameRequired: '이름을 입력해주세요',
  failInvalidEmail: '유효하지 않은 이메일',
  failDuplicate: '이 발송에 중복된 이메일이에요',
  failSendFailed: '발송에 실패했어요',
  failInvalidJobPair: '직군에 없는 직렬입니다',
  failInvalidField: '회사에 등록되지 않았거나 형식이 맞지 않는 값이 있어요',
  failEmployeeCodeTaken: '이미 다른 구성원이 쓰는 사번이에요',
  failUnknown: '발송에 실패했어요',
  // 어드민 확인 모달(§6-1)
  adminConfirmTitle: '어드민 권한으로 초대합니다',
  adminConfirmBody: '{names}은(는) 가입 즉시 다음을 할 수 있습니다.',
  adminConfirmP1: '전 구성원의 인사 정보 열람·수정',
  adminConfirmP2: '연봉·계좌 등 민감 정보 열람',
  adminConfirmP3: '조직 구조·권한·필드 옵션 변경',
  adminConfirmOk: '어드민으로 초대',
  // 닫기 확인(§6-2)
  discardTitle: '작성 중인 초대가 있습니다',
  discardBody: '입력한 {n}명의 정보가 사라집니다.',
  discardKeep: '계속 작성',
  discardLeave: '입력 내용 버리기',
  // CSV 업로드 탭(§2-4 / PW-212)
  tabDirect: '직접 입력',
  // 목록의 [CSV 업로드](구성원 정보 일괄 수정)와 이름이 같아 헷갈렸다 — 용도로 가른다(PW-1299).
  tabCsv: 'CSV로 일괄 초대',
  csvIntro: '템플릿을 받아 채운 뒤 올리면, 반영 전에 값을 화면에서 검토·수정할 수 있어요.',
  csvTemplate: '템플릿 다운로드',
  csvDropHere: 'CSV 파일을 드래그하거나 클릭해서 선택',
  csvLimits: 'CSV 파일, 한 번에 최대 {max}행',
  csvReplaceFile: '다른 파일 올리기',
  csvSummary: '총 {total}건 · 정상 {ok} · 오류 {err}',
  csvErrorsOnly: '오류 행만 보기',
  csvNoErrorRows: '오류 행이 없습니다.',
  csvRowOk: '정상',
  csvRowErrors: '오류 {n}',
  csvIgnoredColumns: '건너뛴 열: {columns}',
  // 정상 줄만 보낸다(기획서 탭 4 「부분 발송을 막지 않는다」) — 빠지는 줄이 있다는 것을 버튼 곁에 적는다.
  csvSummarySkip: '{n}명에게 초대를 보냅니다 · 오류 {m}줄은 보내지 않습니다',
  csvSentKeepErrors: '{n}명에게 초대를 보냈어요. 오류 {m}줄은 고쳐서 다시 보낼 수 있게 남겨 두었어요.',
  // 직종을 끈 조직의 직종 열 — 막지 않고 버린 뒤 알린다(정책 §5 V12)
  csvJobCategoryIgnored: '직종은 이 회사에서 쓰지 않는 항목이라 직종 열의 값을 무시했습니다',
  // 파일 자체를 못 읽는 경우 — 스테이징을 만들지 않는다
  csvErrEmpty: '내용이 없는 파일이에요.',
  csvErrNotCsv: 'CSV 파일만 업로드할 수 있어요.',
  csvErrNotCsvOrXlsx: 'CSV 또는 XLSX 파일만 업로드할 수 있어요.',
  csvErrRead: '파일을 읽지 못했어요. 다시 시도해주세요.',
  csvErrNoRows: '헤더만 있고 읽을 행이 없어요.',
  csvErrMissingColumns: '필수 열이 없어요: {columns}',
  // 초과분을 잘라내지 않고 업로드 자체를 거부한다(§5 V10)
  csvErrTooManyRows: '{count}행이라 올릴 수 없어요. 한 번에 최대 {max}행까지 가능합니다 — 파일을 나눠 올려주세요.',
};

/**
 * 초대에 실을 수 있는 권한 — **둘뿐이다** (PW-847).
 *
 * 🔴 `'manager'` 를 되살리지 말 것. 매니저는 저장하는 등급이 아니라 «그 사람이 어떤
 * 조직의 장인가» 라는 관계라, 초대에 실어 보낼 것이 없다.
 */
const ROLE_IDS = ['member', 'admin'];

/**
 * 일괄 지정 바가 받는 칸(§2-2). 소속은 넣지 않는다 — 바에 넣으면 소속별 조직장 예약까지
 * 여러 사람에게 함께 실려 «한 팀에 조직장 예약 여러 명»을 화면이 쉽게 만든다.
 */
const BULK_KEYS = ['role', 'jobLevel', 'jobFamily', 'jobTitle', 'jobDuty', 'jobCategory', 'workLocation', 'employmentType'];
/** 직군·직렬·직무는 한 묶음이다 — 따로 채우면 다른 직군의 직렬이 들어간다(INV-3 · E22). */
const AXIS_KEYS = ['jobFamily', 'jobTitle', 'jobDuty'];

let rowSeq = 0;
function blankRow(bulk) {
  rowSeq += 1;
  const row = {
    key: `r${rowSeq}`,
    email: '',
    name: '',
    jobPosition: '',
    hireDate: '',
    jobRank: '',
    nickname: '',
    employeeCode: '',
    managerEmail: '',
    teamIds: [],
    primaryTeamId: '',
    /** 조직장 «예약» — teamIds 의 부분집합. 가입 때 적용된다(§2-3 · 2026-09-15 David) */
    leaderTeamIds: [],
    extraOpen: false,
    failReason: null,
  };
  for (const k of BULK_KEYS) row[k] = bulk[k];
  return row;
}

const EMPTY_BULK = {
  role: 'member',
  jobLevel: '',
  jobFamily: '',
  jobTitle: '',
  jobDuty: '',
  jobCategory: '',
  workLocation: '',
  employmentType: '',
};

/**
 * 직군·직렬·직무 한 칸을 바꾼 뒤 아래 칸 정리 — 사람 카드와 일괄 지정 바가 같이 쓴다.
 *
 * **직군을 바꾸면 그 직군에 없는 직렬을 버린다(E19)**, 직렬이 바뀌면 그 직렬에 없는 직무를 버린다(INV-8).
 * 새 상위에서도 유효한 값이면 남긴다 — CSV 스테이징에서 «직군을 고쳐 쌍을 맞추는» 것이 정상 경로라,
 * 무조건 지우면 어드민이 파일에 적어 넣은 직렬이 말없이 사라진다.
 */
/**
 * 재입사 모드 행 — 비어 있는 칸만 이전 값으로 채운다(초대 §9 E8 ② · PW-1355). 이미 고친 칸은 덮지 않는다.
 * 권한은 «멤버»로 두고, 새 입사일은 비워 둔다(필수 — 어드민이 넣는다).
 */
function withRehirePrefill(row, seed) {
  const next = { ...row, role: 'member' };
  for (const k of ['name', 'employeeCode', 'jobLevel', 'jobPosition', 'jobFamily', 'jobTitle', 'jobDuty', 'workLocation', 'employmentType']) {
    if (!String(next[k] ?? '').trim() && seed[k]) next[k] = seed[k];
  }
  if (!next.email) next.email = seed.email;
  if (next.teamIds.length === 0 && Array.isArray(seed.teamIds) && seed.teamIds.length > 0) {
    next.teamIds = [...seed.teamIds];
    next.primaryTeamId = seed.primaryTeamId || (seed.teamIds.length >= 2 ? seed.teamIds[0] : '');
  }
  return next;
}

function cleanAxis(next, p, laddersByFamily, dutiesByLadder) {
  const n = { ...next };
  if (p.jobFamily !== undefined && p.jobTitle === undefined) {
    if (jobPairIssue(laddersByFamily, n.jobFamily, n.jobTitle)) n.jobTitle = '';
  }
  if ((p.jobFamily !== undefined || p.jobTitle !== undefined) && p.jobDuty === undefined && n.jobDuty) {
    if (jobPairIssue(dutiesByLadder, n.jobTitle, n.jobDuty)) n.jobDuty = '';
  }
  return n;
}

/** 「추가 정보」에 접힌 칸 — 접혀 있어도 몇 개 넣었는지 버튼에 적는다(§2-3 · E6 개정). */
const EXTRA_KEYS = ['jobRank', 'jobCategory', 'nickname', 'employeeCode', 'managerEmail'];

/**
 * 옵션 목록 → Select 항목. 값이 비어 있어도 '미지정' 은 항상 남긴다.
 *
 * `placeholder` 는 **비활성 사유를 그 칸에서 말하기 위한 것**이다. 직렬은 직군을
 * 고르기 전까지 잠기는데(INV-3 · PW-412), 그때 목록이 비었다고 `옵션 없음 — 조직
 * 설정에서 추가` 를 띄우면 원인을 엉뚱한 곳으로 가리킨다 — 조직 설정에는 직렬이
 * 멀쩡히 있고, 어드민이 할 일은 직군을 먼저 고르는 것이다.
 */
function OptionSelect({ id, label, value, onChange, options, labels, disabled, placeholder }) {
  const list = Array.isArray(options) ? options.filter(Boolean) : [];
  return (
    <label className="admin-inv-field">
      <span className="admin-inv-label" id={`${id}-label`}>{label}</span>
      <select
        id={id}
        className="admin-inv-select"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">
          {placeholder || (list.length === 0 ? labels.optionsEmpty : labels.unset)}
        </option>
        {list.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

/**
 * 소속 칸 — 검색해서 고른다 (§2-3 「소속 칸」 · PW-1310).
 *
 * 검색어가 있을 때만 결과를 연다 — 종전처럼 빈 검색어로 전체 트리를 늘어놓으면 조직이 많을 때
 * 길고 상·하위가 헷갈렸다(알파 테스트 제보). 결과에는 맞는 조직과 그 **조상 경로**를 남기고
 * 조상은 고를 수 없게 흐리게 둔다(P5 — 종전은 조상을 지워 어느 «개발팀»인지 몰랐다).
 * depth 당 들여쓰기(P1) · 상위 조직도 고를 수 있다(P3) · 이미 고른 조직은 다시 못 고른다.
 * 결과 0건이어도 조직을 만들자고 하지 않는다 — 초대 경로에서 만들면 오타가 유령 조직이 된다(V8 · E24).
 */
function TeamSearchField({ rowKey, tree, row, labels, disabled, onPick, onRemove, onPrimary, onLeader }) {
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const q = query.trim().toLowerCase();
  const picked = row.teamIds;
  const searching = picked.length === 0 || adding;

  const results = useMemo(() => {
    if (!q) return [];
    const hits = new Set(tree.filter((e) => e.name.toLowerCase().includes(q)).map((e) => e.id));
    const keep = new Set(hits);
    for (const e of tree) if (hits.has(e.id)) for (const a of e.ancestorIds) keep.add(a);
    return tree.filter((e) => keep.has(e.id)).map((e) => ({ ...e, isHit: hits.has(e.id) }));
  }, [tree, q]);

  if (tree.length === 0) {
    return <p className="admin-inv-hint">{labels.teamsEmpty}</p>;
  }

  const byId = new Map(tree.map((e) => [e.id, e]));
  const example = tree.find((e) => e.depth > 0)?.name ?? tree[0].name;
  const pick = (id) => {
    onPick(id);
    setQuery('');
    setAdding(false);
  };

  return (
    <div className="admin-inv-teams">
      {picked.length > 0 && (
        <ul className="admin-inv-picked" aria-label={labels.teamPicked}>
          {picked.map((id) => {
            const e = byId.get(id);
            const names = e ? e.pathNames : [id];
            const path = names.join(' › ');
            const leader = row.leaderTeamIds.includes(id);
            return (
              <li key={id} className="admin-inv-picked-row">
                <span className="admin-inv-picked-path" title={path}>
                  {names.slice(0, -1).map((n, i) => (
                    <span key={`${n}-${i}`} className="admin-inv-picked-anc">{n} › </span>
                  ))}
                  {/* 조직장 예약이면 사람 표시(P9) */}
                  {leader && <IconUser size={12} />}
                  <span className="admin-inv-picked-name">{names[names.length - 1]}</span>
                </span>
                {picked.length >= 2 && (
                  <label className="admin-inv-picked-opt">
                    <input
                      type="radio"
                      name={`inv-${rowKey}-primary`}
                      checked={row.primaryTeamId === id}
                      disabled={disabled}
                      onChange={() => onPrimary(id)}
                    />
                    {labels.primaryTeam}
                  </label>
                )}
                <label className="admin-inv-picked-opt">
                  <input
                    type="checkbox"
                    checked={leader}
                    disabled={disabled}
                    onChange={() => onLeader(id)}
                  />
                  {labels.leaderReserve}
                </label>
                <button
                  type="button"
                  className="admin-emp-btn is-ghost is-sm"
                  aria-label={fmt(labels.teamRemove, { path })}
                  title={fmt(labels.teamRemove, { path })}
                  disabled={disabled}
                  onClick={() => onRemove(id)}
                >
                  <IconX size={12} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {searching ? (
        <div className="admin-inv-team-searchbox">
          <input
            type="text"
            className="admin-inv-team-search"
            value={query}
            disabled={disabled}
            placeholder={fmt(labels.teamSearchExample, { name: example })}
            aria-label={labels.teamSearch}
            onChange={(e) => setQuery(e.target.value)}
          />
          {q && (
            <div className="admin-inv-team-list" role="listbox" aria-label={labels.teams}>
              {results.map((e) => {
                const already = picked.includes(e.id);
                const selectable = e.isHit && !already;
                return (
                  <button
                    key={e.id}
                    type="button"
                    role="option"
                    aria-selected={already}
                    aria-disabled={!selectable}
                    disabled={!selectable || disabled}
                    className={`admin-inv-team-row${e.isHit ? '' : ' is-ancestor'}${already ? ' is-on' : ''}`}
                    // 들여쓰기는 depth 별 시각 표현이다(P1 · depth 당 12px).
                    style={{ paddingLeft: 8 + e.depth * 12 }}
                    title={e.pathLabel}
                    onClick={() => pick(e.id)}
                  >
                    <span className="admin-inv-team-name">{e.name}</span>
                    {already && <span className="admin-inv-hint">{labels.teamPicked}</span>}
                  </button>
                );
              })}
              {results.length === 0 && <p className="admin-inv-hint admin-inv-team-none">{labels.teamSearchNone}</p>}
            </div>
          )}
          {adding && picked.length > 0 && (
            <button
              type="button"
              className="admin-emp-btn is-ghost is-sm"
              onClick={() => { setAdding(false); setQuery(''); }}
            >
              {labels.teamAddCancel}
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          className="admin-emp-btn is-ghost is-sm admin-inv-team-add"
          disabled={disabled}
          onClick={() => setAdding(true)}
        >
          <IconPlus size={14} />{labels.teamAdd}
        </button>
      )}
    </div>
  );
}

const DEFAULT_MODES = ['direct', 'csv'];

export default function AdminInviteModal({
  open = false,
  onClose,
  onSend,
  orgUnits = [],
  /** 이미 워크스페이스 멤버인 이메일 (V5) */
  existingEmails = [],
  /**
   * CSV 상급자(이메일) 칸이 「회사 구성원인가」를 볼 명부. 안 주면 `existingEmails` 를
   * 쓴다(종전 동작). 「이미 구성원」과 기준이 다를 수 있어 따로 받는다(PW-1056).
   */
  supervisorEmails,
  /**
   * 직접 입력 «상급자» 칸의 후보 — `{ email, name }`(퇴사자 제외 · PW-1310). 안 주면 칸이 없다.
   * 값은 CSV 상급자 열과 같은 이메일로 싣는다.
   */
  supervisorCandidates = null,
  /** 대기 중 초대가 있는 이메일 (V6) — «초대 대기 중»으로 막고, `onResendPending` 이 있으면 그 줄에 [재발송]을 둔다 */
  pendingEmails = [],
  /**
   * V6 [재발송] — `(email) => Promise`. 그 이메일의 대기 초대를 새 링크로 다시 보낸다. 성공하면 그 줄을 걷는다.
   * 거절되거나 `false` 로 끝나면 줄을 남기고 오류를 보인다.
   * 안 주면 버튼이 없다(PW-1331).
   */
  onResendPending,
  /**
   * 명부에 있지만 **아직 가입하지 않은** 사람의 이메일 (V5) — «이미 멤버입니다»로 막고, 목록의 «초대 보내기»를
   * 가리키는 안내를 붙인다(PW-1331 · 2026-10-06 기획 확정). 다시 보내는 입구는 목록 하나다.
   */
  resendEmails = [],
  /** 명부의 퇴사자 이메일 — 초대를 보내지 않는다 (PW-1331). 재입사 대상(`rehireMembers`)이면 그쪽이 먼저다. */
  terminatedEmails = [],
  /**
   * 재입사 대상 퇴사자 (PW-1355 · 초대 §9 E8) — `{ email, name, employeeCode, teamIds, primaryTeamId, jobLevel,
   * jobPosition, jobFamily, jobTitle(직렬), jobDuty, workLocation, employmentType, revertOpen }`.
   * 이 이메일을 넣은 행은 «재입사 모드»다: 배지·안내, 새 입사일 필수, 권한 «멤버» 고정, 비어 있는 칸은 이전 값으로 채운다.
   */
  rehireMembers = [],
  /** 이 이메일의 재입사 대상으로 미리 채운 한 명으로 연다 — 목록 행 «재입사 초대» (PW-1355). */
  rehireOf = null,
  /** { limit, remaining } — null 이면 조회 실패(발송은 허용, 서버 402 가 최종 방어) */
  seats = null,
  /**
   * 머리글 좌석 요약 뒤에 붙는 청구 안내 — `{ text, emphasis }` (초대 정책 §4-4-A · W60).
   * 첫 주기 즉시 청구는 `emphasis: true`(강조색), 다음 청구일 반영은 `false`. 문구·금액은 앱이
   * 서버 미리보기로 만든다(화면은 금액을 계산하지 않는다). null 이면 안 붙인다(무료·유효 행 0).
   */
  billingNotice = null,
  /** 좌석을 차지할 유효 행 수가 바뀔 때 `(n) => void` — 앱이 이 수로 청구 미리보기를 다시 부른다. */
  onSeatNeedChange,
  /**
   * { jobLevel: [], jobFamily: [], jobTitle: [], workLocation: [], employmentType: [] } — `jobTitle` 은 **직렬**.
   * `employmentType` 은 회사가 등록하는 값이 아니라 시스템 고정 4종이다(PW-1299) — 비어 있어도
   * «옵션 없음 — 설정에서 추가»로 보내지 않는다(추가할 화면이 없다).
   */
  fieldOptions = {},
  /**
   * 직군 값 → 그 직군의 직렬 값 목록 (§1-3-d 매핑, INV-3).
   *
   * 직렬 Select 를 이 표로 좁히고, 직군을 고르기 전에는 잠근다. **비어 있으면
   * 좁히지 않는다** — 매핑 조회 실패로 선택지를 0으로 만들면 값을 아예 넣지 못하는데
   * 화면은 그 이유를 말해주지 못한다. 그 경우 서버(422 INVALID_JOB_PAIR)가 판정한다.
   */
  laddersByFamily = {},
  /** 직렬 값 → 그 직렬의 직무 값 목록 (INV-8). CSV 의 `(직렬, 직무)` 짝을 본다(PW-902). */
  dutiesByLadder = {},
  /** 이 회사 스쿼드 이름 — CSV 스쿼드 칸 확인. 못 받았으면 `null`(서버가 판정한다). */
  squadNames = null,
  /** 조직장이 있는 조직 id — CSV 상급자 칸이 쓰이지 않는 줄을 안내한다(PW-902). */
  headTeamIds = [],
  /**
   * 이 조직이 직종을 쓰는가 (PW-644 · 선택 적용). `true` 일 때만 직종 칸·CSV 열이 생긴다.
   * 켰는지 못 읽었으면 호출부가 `false` 를 넘긴다 — 칸이 없을 뿐 초대는 그대로 된다
   * (정책 §7: 스위치 하나 때문에 초대를 막지 않는다). 선택지는 `fieldOptions.jobCategory`.
   */
  jobCategoryEnabled = false,
  onGoBilling,
  maxRows = INVITE_MAX_ROWS,
  /*
    ── 앱이 정하는 규칙 (PW-1057) ──
    초대는 서버가 최종 판정한다. 화면이 서버와 다른 기준으로 줄을 통과시키면 일괄 발송에서
    그 한 줄 때문에 나머지까지 못 나갔다. 규칙은 앱이 서버와 맞춰 넘기고 이 창은 쓰기만 한다.
    안 넘기면 예전 판정 그대로다.
  */
  /** 초대 이메일 칸 판정 — 기본은 모양만 보는 `emailOk`. */
  emailValid = emailOk,
  /** 이름 글자 수 상한 — `null` 이면 보지 않는다. */
  nameMaxLength = null,
  /** CSV 칸(열 key) → `{ maxLength?, maxItems?, itemMaxLength? }`. */
  csvFieldLimits = {},
  /** CSV 조직경로 글자 → 조직 id(못 찾으면 `null`). 없으면 이 창의 경로 해석을 쓴다. */
  resolveOrgPath = null,
  /** CSV 고용상태 중 초대에 쓸 수 없는 코드(예: `['terminated']`) — 그 줄을 오류로 세운다(PW-1042). */
  csvBlockedEmploymentStatuses = [],
  /**
   * 사번 겹침 확인 — 회사 사람들의 `{ code, email }`. 못 받았으면 `null`(서버가 판정한다).
   * CSV 탭과 직접 입력 탭(V16 · PW-1310)이 같은 명부를 쓴다.
   */
  csvEmployeeCodeOwners = null,
  /**
   * `.xlsx` 파일 → CSV 글자. 넘기면 CSV 탭이 `.xlsx` 도 받는다(엑셀 읽기는 앱이 맡는다).
   * 안 넘기면 `.csv` 만 받는다.
   */
  readSpreadsheet = null,
  /**
   * 남은 좌석을 쓰지 않는 이메일 — 예: 이 회사를 떠났던 사람을 다시 부르는 초대.
   * 이 이메일의 줄은 좌석 부족 판정에서 세지 않는다(서버와 같은 셈).
   */
  seatExemptEmails = [],
  /*
    ── 다른 화면이 이 창을 빌려 쓸 때 (PW-1233 · 온보딩 「구성원 초대」의 CSV) ──
    안 넘기면 어드민 창 그대로다.
  */
  /** 보여 줄 탭 — `['csv']` 처럼 하나만 주면 탭 줄을 그리지 않고 그 탭으로 연다. */
  modes = DEFAULT_MODES,
  /** 창을 열 때 바로 읽을 CSV 파일 — 다른 화면에서 이미 고른 파일을 이어받는다. */
  initialCsvFile = null,
  /** CSV 한 번에 받는 줄 수 상한. */
  csvMaxRows = INVITE_CSV_MAX_ROWS,
  /**
   * `(csvRows, fieldOptions) => { fieldOptions, notices? }` — CSV 판정·칸 선택지에 쓸 값을
   * 호출부가 고친다(예: 온보딩은 목록에 없는 직급·직책을 「새로 추가될 값」으로 받는다, PW-1235).
   * `notices` 는 표 위에 안내로 보인다. 안 넘기면 `fieldOptions` 그대로.
   */
  prepareCsvOptions = null,
  labels: providedLabels,
}) {
  const labels = useMemo(
    () => ({ ...DEFAULT_LABELS, ...(providedLabels || {}) }),
    [providedLabels],
  );
  const tree = useMemo(() => buildOrgTree(orgUnits), [orgUnits]);
  const rehireByEmail = useMemo(
    () => new Map(rehireMembers.filter((m) => m?.email).map((m) => [normEmail(m.email), m])),
    [rehireMembers],
  );

  const [bulk, setBulk] = useState(EMPTY_BULK);
  /* 목록 행 «재입사 초대»로 열면 그 퇴사자로 미리 채운 한 명으로 시작한다(PW-1355). 창은 열 때 새로 붙으므로
     처음 상태에서 채운다 — 아래 «다시 열기» 정리는 이미 붙어 있던 창에만 돈다. */
  const rehireSeedOf = () => (rehireOf ? rehireByEmail.get(normEmail(rehireOf)) : null);
  const [rows, setRows] = useState(() => {
    const seed = rehireSeedOf();
    return [seed ? withRehirePrefill(blankRow(EMPTY_BULK), seed) : blankRow(EMPTY_BULK)];
  });
  /* 모드 2종(§1). CSV 행은 **직접 입력 행과 따로** 들고 있다 — 탭을 옮겼다고 반대
     탭의 입력이 사라지면, 500행을 올려 두고 직접 입력을 확인하러 간 순간 파일을
     다시 올려야 한다. 발송은 보고 있는 탭의 행만 보낸다. */
  const firstMode = modes[0] ?? 'direct';
  const [mode, setMode] = useState(initialCsvFile ? 'csv' : firstMode);
  const [csvRows, setCsvRows] = useState([]);
  const [csvError, setCsvError] = useState('');
  const [csvNotices, setCsvNotices] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [confirmAdmin, setConfirmAdmin] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  // 닫기 확인이 뜨면 초점은 [계속 작성]에 둔다(§6-2) — 버리기가 빨간 버튼이라도
  // 습관처럼 Enter 를 누르면 입력이 남아야 한다 (PW-1311).
  const discardKeepRef = useRef(null);
  useEffect(() => {
    if (confirmDiscard) discardKeepRef.current?.focus();
  }, [confirmDiscard]);
  const [banner, setBanner] = useState('');
  const [sending, setSending] = useState(false);
  const [undoRows, setUndoRows] = useState(null);
  const [applyToast, setApplyToast] = useState('');
  const undoTimer = useRef(null);

  /* 모달을 다시 열면 깨끗한 상태로 시작한다 — 지난 발송의 실패 행이 남아 있으면
     어드민이 "또 보내야 하는 사람" 으로 오해한다.

     "이전 props 와 비교해 렌더 중 상태 조정" 패턴(OrgTreePicker 선례)을 쓴다.
     effect 안 setState 는 캐스케이드 렌더가 되고, 한 프레임 동안 **지난 입력이
     그대로 보이는** 화면이 실제로 그려진다. */
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setBulk(EMPTY_BULK);
      const rehireSeed = rehireSeedOf();
      setRows([rehireSeed ? withRehirePrefill(blankRow(EMPTY_BULK), rehireSeed) : blankRow(EMPTY_BULK)]);
      setMode(initialCsvFile ? 'csv' : firstMode);
      setCsvRows([]);
      setCsvError('');
      setCsvNotices([]);
      setBanner('');
      setConfirmAdmin(false);
      setConfirmDiscard(false);
      setUndoRows(null);
      setApplyToast('');
    }
  }

  useEffect(() => () => { if (undoTimer.current) clearTimeout(undoTimer.current); }, []);

  const existing = useMemo(() => new Set(existingEmails.map(normEmail)), [existingEmails]);
  const pending = useMemo(() => new Set(pendingEmails.map(normEmail)), [pendingEmails]);
  const resend = useMemo(() => new Set(resendEmails.map(normEmail)), [resendEmails]);
  const terminated = useMemo(() => new Set(terminatedEmails.map(normEmail)), [terminatedEmails]);
  const rehireOfEmail = (email) => rehireByEmail.get(normEmail(email)) ?? null;

  /* 활성 탭의 행 — 검증·발송·부분 성공 처리는 전부 이 목록에 적용된다.
     두 탭이 같은 코드를 지나야 CSV 가 이름 칸 이메일 차단(PW-207) 같은 규칙의
     우회 경로가 되지 않는다. */
  const isCsv = mode === 'csv';
  const activeRows = isCsv ? csvRows : rows;
  const setActiveRows = isCsv ? setCsvRows : setRows;

  /**
   * 행 한 칸 수정.
   *
   * **직군을 바꾸면 그 행의 직렬을 정리한다(E19).** 구 직군의 직렬이 남으면
   * `(직군, 직렬)` 쌍(INV-3)을 깬 값이 그대로 발송된다. 새 직군에서도 유효한
   * 직렬이면 남긴다 — CSV 스테이징에서 «직군을 고쳐 쌍을 맞추는» 것이 정상 경로라,
   * 무조건 지우면 어드민이 파일에 적어 넣은 직렬이 말없이 사라진다.
   */
  /* V6 [재발송] — 그 줄의 대기 초대를 새 링크로 다시 보내고, 끝난 줄은 걷는다(보낼 것이 남지 않게). */
  const [resendingKey, setResendingKey] = useState(null);
  const [resendErrorKey, setResendErrorKey] = useState(null);
  const resendPendingRow = async (row) => {
    setResendingKey(row.key);
    setResendErrorKey(null);
    try {
      // 호스트가 실패를 알림으로 삼키고 `false` 를 돌려줘도 실패다 — 그 줄을 걷으면 안 보낸 사람이 사라진다.
      if ((await onResendPending(normEmail(row.email))) === false) throw new Error('resend failed');
      setRows((rs) => {
        const rest = rs.filter((x) => x.key !== row.key);
        return rest.length > 0 ? rest : [blankRow(EMPTY_BULK)];
      });
    } catch {
      setResendErrorKey(row.key);
    } finally {
      setResendingKey(null);
    }
  };

  const patch = (key, p) =>
    setActiveRows((rs) => rs.map((r) => {
      if (r.key !== key) return r;
      const next = cleanAxis({ ...r, ...p, failReason: null }, p, laddersByFamily, dutiesByLadder);
      // 퇴사자 이메일을 넣으면 그 자리에서 재입사 모드 — 비어 있는 칸만 이전 값으로 채운다(E8 ②)
      const seed = !isCsv && 'email' in p ? rehireOfEmail(p.email) : null;
      return seed ? withRehirePrefill(next, seed) : next;
    }));

  /* 소속 고르기·빼기 — 주 소속 자동 처리(§4-3). 2번째를 고르면 첫 소속이 주 소속,
     주 소속을 빼면 남은 첫 소속으로 옮기고 그 사실을 한 줄로 알린다. 뺀 조직의 조직장 예약도 함께 뺀다. */
  const addTeam = (row, teamId) => {
    const teamIds = [...row.teamIds, teamId];
    patch(row.key, { teamIds, primaryTeamId: reconcilePrimary(teamIds, row.primaryTeamId), primaryNote: '' });
  };
  const removeTeam = (row, teamId) => {
    const teamIds = row.teamIds.filter((t) => t !== teamId);
    const primaryTeamId = reconcilePrimary(teamIds, row.primaryTeamId);
    const moved = row.primaryTeamId === teamId && teamIds.length >= 2;
    patch(row.key, {
      teamIds,
      primaryTeamId,
      leaderTeamIds: row.leaderTeamIds.filter((t) => t !== teamId),
      primaryNote: moved
        ? fmt(labels.primaryMoved, { path: tree.find((e) => e.id === primaryTeamId)?.pathLabel ?? '' })
        : '',
    });
  };
  const toggleLeader = (row, teamId) => patch(row.key, {
    leaderTeamIds: row.leaderTeamIds.includes(teamId)
      ? row.leaderTeamIds.filter((t) => t !== teamId)
      : [...row.leaderTeamIds, teamId],
  });

  const codeOwner = useMemo(() => employeeCodeOwnerMap(csvEmployeeCodeOwners), [csvEmployeeCodeOwners]);
  const headTeams = useMemo(() => new Set(headTeamIds.map(String)), [headTeamIds]);
  const reservedLeaders = new Set(rows.flatMap((r) => r.leaderTeamIds));

  /* 행별 검증 V1~V6. 서버가 최종 판정이지만, 화면이 먼저 막아야 50명을 넣고
     발송을 눌러서야 사유를 알게 되는 일이 없다.
     행이 50개뿐이라 memo 없이 매 렌더 계산한다 — 의존성을 손으로 나열하는 쪽이
     빠뜨리기 쉽고(검증이 옛 값으로 굳는다) 이득도 없다. */
  const errorsByKey = {};
  for (const r of rows) {
    const e = [];
    const key = normEmail(r.email);
    if (!(emailValid || emailOk)(r.email)) e.push(labels.errInvalidEmail);
    // [PW-1331 · V5·V6] 가입한 사람·가입 전 구성원은 «이미 멤버», 퇴사자는 막고, 대기 중 초대는 «초대 대기 중».
    else if (existing.has(key) || resend.has(key)) e.push(labels.errAlreadyMember);
    else if (terminated.has(key) && !rehireOfEmail(key)) e.push(labels.errTerminatedMember);
    else if (pending.has(key)) e.push(labels.errPendingInvite);
    else if (rows.filter((x) => normEmail(x.email) === key).length > 1) {
      e.push(labels.errDuplicate);
    }
    // V7 은 길이 검사와 배타다 — 한 칸에 두 줄이 서면 무엇부터 고쳐야 할지 흐려진다.
    const name = String(r.name || '').trim();
    if (name.length < 2) e.push(labels.errName);
    else if (nameMaxLength && name.length > nameMaxLength) {
      e.push(fmt(labels.errNameTooLong, { max: nameMaxLength }));
    } else if (nameHasEmail(r.name)) e.push(labels.errNameEmail);
    if (rehireOfEmail(key) && !r.hireDate) e.push(labels.errRehireHireDate);
    if (r.teamIds.length >= 2 && !r.primaryTeamId) e.push(labels.errPrimaryTeam);
    const pair = jobPairIssue(laddersByFamily, r.jobFamily, r.jobTitle);
    if (pair === 'family') e.push(labels.errLadderNeedsFamily);
    else if (pair === 'pair') e.push(labels.errJobPair);
    const dutyPair = jobPairIssue(dutiesByLadder, r.jobTitle, r.jobDuty);
    if (dutyPair === 'family') e.push(labels.errDutyNeedsLadder);
    else if (dutyPair === 'pair') e.push(labels.errDutyPair);
    // V16 — 같은 사람(같은 이메일)이 이미 그 사번을 가졌으면 겹친 것이 아니다(CSV 탭과 같은 판정)
    const code = employeeCodeKey(r.employeeCode);
    if (code) {
      const owner = codeOwner?.get(code);
      if (owner !== undefined && owner !== key) {
        e.push(fmt(labels.csvErrEmployeeCodeTaken, { value: r.employeeCode.trim() }));
      } else if (rows.filter((x) => employeeCodeKey(x.employeeCode) === code).length > 1) {
        e.push(labels.errEmployeeCodeDuplicate);
      }
    }
    errorsByKey[r.key] = e;
  }

  /* CSV 탭 — 칸마다 사유를 만든다. 두 초대 화면이 같은 판정(`inviteCsvIssues`)을 쓴다(PW-902).
     파싱 때 굳혀 두지 않고 매 렌더 다시 만든다 — 표에서 고친 칸의 사유가 바로 사라져야 한다. */
  const csvColumns = inviteCsvColumns({ jobCategoryEnabled });
  const csvPrepared = prepareCsvOptions ? prepareCsvOptions(csvRows, fieldOptions) : null;
  const csvFieldOptions = csvPrepared?.fieldOptions ?? fieldOptions;
  const csvPreparedNotices = csvPrepared?.notices ?? [];
  const csvCtx = buildInviteCsvContext(csvRows, {
    orgTree: tree, fieldOptions: csvFieldOptions, laddersByFamily, dutiesByLadder, jobCategoryEnabled,
    squadNames, memberEmails: existingEmails, supervisorEmails, pendingEmails, resendEmails, terminatedEmails, rehireEmails: rehireMembers.map((m) => m.email), headTeamIds, labels,
    emailValid, nameMaxLength, fieldLimits: csvFieldLimits, resolveOrgPath,
    blockedEmploymentStatuses: csvBlockedEmploymentStatuses, employeeCodeOwners: csvEmployeeCodeOwners,
  });
  const csvIssuesByKey = {};
  const csvNotesByKey = {};
  for (const r of csvRows) {
    csvIssuesByKey[r.key] = inviteCsvIssues(r, csvCtx);
    csvNotesByKey[r.key] = inviteCsvNotes(r, csvCtx);
  }
  const csvValidRows = csvRows.filter((r) => csvIssuesByKey[r.key].length === 0 && !r.failReason);
  const csvErrorCount = csvRows.length - csvValidRows.length;

  const validRows = isCsv ? csvValidRows : rows.filter((r) => errorsByKey[r.key].length === 0);
  const validCount = validRows.length;
  const seatsLeft = seats && seats.limit !== null ? seats.remaining : null;
  const seatExempt = new Set(seatExemptEmails.map(normEmail));
  const seatNeed = validRows
    .filter((r) => !seatExempt.has(normEmail(isCsv ? r.values.email : r.email)))
    .length;
  const seatShort = seatsLeft !== null && seatNeed > seatsLeft;
  useEffect(() => {
    if (open) onSeatNeedChange?.(seatNeed);
  }, [open, seatNeed, onSeatNeedChange]);
  const adminRows = isCsv
    ? csvValidRows
      .filter((r) => resolveInviteCsvRow(r, csvCtx).role === 'admin')
      .map((r) => ({ name: r.values.name, email: r.values.email }))
    : validRows.filter((r) => r.role === 'admin');

  /* 발송 버튼 활성 조건 E1~E7.
     · 직접 입력 — 오류 행이 하나라도 있으면 막는다. 오류 행을 조용히 빼고 보내면 어드민은 그
       사람들도 초대된 줄 안다.
     · CSV — **정상 줄만 보낸다**(기획서 탭 4 「부분 발송을 막지 않는다」 · PW-902). 빠지는 줄이
       있다는 것은 버튼 곁 요약(`csvSummarySkip`)이 적고, 보낸 뒤 오류 줄은 표에 남는다. */
  const canSend = !sending && !seatShort && (isCsv
    ? validCount > 0
    : activeRows.length > 0 && validCount === activeRows.length);

  /** 입력이 있는지 — 빈 행 1개뿐이면 확인 없이 닫는다(§6-2). */
  const isDirty =
    rows.length > 1 ||
    rows.some(
      (r) => r.email.trim() || r.name.trim() || r.teamIds.length > 0 || r.employeeCode.trim() || r.hireDate,
    ) ||
    csvRows.length > 0;

  const requestClose = () => {
    if (sending) return; // 발송 중에는 닫기를 막는다(§3)
    if (isDirty) setConfirmDiscard(true);
    else onClose?.();
  };

  /**
   * 일괄 적용(§4-2 · PW-1310) — 둘로 나눴다.
   *  · `empty` — 사람마다 **비어 있는 칸만** 채운다. 직군·직렬·직무는 한 묶음이라 직군이 빈 사람에게만
   *    셋을 함께 넣는다(E22). 권한은 늘 값이 있어 바뀌지 않는다.
   *  · `all` — 종전 「전체 적용」 그대로 덮어쓴다. 소속은 바에 없으니 건드리지 않는다.
   * 둘 다 5초 실행 취소를 준다 — 사람마다 다르게 넣어 둔 값을 되돌릴 길이 있어야 한다.
   */
  const applyBulk = (how) => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndoRows(rows);
    let changed = 0;
    const next = rows.map((r) => {
      const n = { ...r };
      if (how === 'all') {
        for (const k of BULK_KEYS) n[k] = bulk[k];
      } else {
        for (const k of BULK_KEYS) {
          if (k === 'role' || AXIS_KEYS.includes(k)) continue;
          if (!n[k] && bulk[k]) n[k] = bulk[k];
        }
        if (!n.jobFamily && bulk.jobFamily) for (const k of AXIS_KEYS) n[k] = bulk[k];
      }
      if (BULK_KEYS.some((k) => n[k] !== r[k])) changed += 1;
      return n;
    });
    setRows(next);
    setApplyToast(fmt(how === 'all' ? labels.bulkAppliedAll : labels.bulkAppliedEmpty, {
      n: how === 'all' ? rows.length : changed,
    }));
    undoTimer.current = setTimeout(() => {
      setUndoRows(null);
      setApplyToast('');
    }, 5000);
  };

  const undoBulk = () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    if (undoRows) setRows(undoRows);
    setUndoRows(null);
    setApplyToast('');
  };

  /* ── CSV 업로드(§2-4) ────────────────────────────────────────────────── */

  const downloadTemplate = () => {
    const blob = new Blob([buildInviteTemplateCsv(labels, { jobCategoryEnabled })], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pivit_invite_template.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const readCsvFile = async (file) => {
    setCsvError('');
    setCsvNotices([]);
    if (!file) return;
    // 확장자·MIME 둘 다 본다 — 브라우저·OS 조합에 따라 CSV 의 MIME 이
    // `application/vnd.ms-excel` 로 오거나 아예 비어 있다.
    const name = String(file.name || '').toLowerCase();
    const isXlsx = Boolean(readSpreadsheet) && name.endsWith('.xlsx');
    if (!isXlsx && !name.endsWith('.csv') && !String(file.type || '').includes('csv')) {
      setCsvError(readSpreadsheet ? labels.csvErrNotCsvOrXlsx : labels.csvErrNotCsv);
      return;
    }
    let text;
    try {
      // 한국어 엑셀이 저장한 EUC-KR 파일도 열 이름이 깨지지 않게 읽는다 (PW-968).
      text = isXlsx ? await readSpreadsheet(file) : await readCsvFileText(file);
    } catch {
      setCsvError(labels.csvErrRead);
      return;
    }
    const res = parseInviteCsv(text, { labels, jobCategoryEnabled, maxRows: csvMaxRows });
    if (!res.ok) {
      // 상한 초과·필수 열 누락은 **스테이징을 만들지 않는다.** 앞 500행만 남기는
      // 조용한 절단은 정책 §5 V10 이 금지한다.
      setCsvError(res.error);
      setCsvRows([]);
      return;
    }
    const notices = [];
    if (res.jobCategoryIgnored) notices.push(labels.csvJobCategoryIgnored);
    if (res.ignoredColumns.length > 0) {
      notices.push(fmt(labels.csvIgnoredColumns, { columns: res.ignoredColumns.join(', ') }));
    }
    setCsvNotices(notices);
    setCsvRows(res.rows);
    setBanner('');
  };

  /* 이어받은 파일은 창이 열릴 때 한 번 읽는다(PW-1233). `readCsvFile` 은 매 렌더 새로 만들어지므로
     ref 로 들고, 열림·파일이 바뀔 때만 읽는다. */
  const readCsvFileRef = useRef(readCsvFile);
  useEffect(() => {
    readCsvFileRef.current = readCsvFile;
  });
  useEffect(() => {
    if (open && initialCsvFile) void readCsvFileRef.current(initialCsvFile);
  }, [open, initialCsvFile]);

  /** 표의 칸 하나를 고친다 — 그 줄만 새 객체가 되어 그 줄만 다시 그린다. */
  const patchCsvCell = (rowKey, colKey, value) =>
    setCsvRows((rs) => rs.map((r) => (r.key === rowKey
      ? { ...r, values: { ...r.values, [colKey]: value }, failReason: null, failField: null }
      : r)));

  const resetCsv = () => {
    setCsvRows([]);
    setCsvError('');
    setCsvNotices([]);
    setBanner('');
  };

  /** 서버 실패 사유의 칸(요청 키) → 표의 칸. */
  const CSV_FAIL_FIELD = { squadNames: 'squad', leaderTeamIds: 'leader', teamId: 'primaryPath', teamIds: 'orgPath' };

  const doSendCsv = async () => {
    setSending(true);
    setBanner('');
    const sendRows = csvValidRows;
    try {
      const res = await onSend?.(sendRows.map((r) => inviteCsvPayload(r, csvCtx)));
      const failed = res?.failed ?? [];
      const failedByKey = new Map();
      for (const f of failed) {
        const row = sendRows[f.index] ?? sendRows.find((r) => normEmail(r.values.email) === normEmail(f.email));
        if (row) failedByKey.set(row.key, f);
      }
      const sentKeys = new Set(sendRows.filter((r) => !failedByKey.has(r.key)).map((r) => r.key));
      const remaining = csvRows
        .filter((r) => !sentKeys.has(r.key))
        .map((r) => {
          const f = failedByKey.get(r.key);
          if (!f) return r;
          const key = FAIL_LABEL_KEY[f.reason];
          return {
            ...r,
            failReason: (key && labels[key]) || labels.failUnknown,
            failField: CSV_FAIL_FIELD[f.detail] ?? f.detail ?? null,
          };
        });
      if (remaining.length === 0) {
        onClose?.();
        return;
      }
      setCsvRows(remaining);
      setBanner(failed.length > 0
        ? fmt(labels.partialFail, { n: failed.length })
        : fmt(labels.csvSentKeepErrors, { n: sentKeys.size, m: remaining.length }));
    } catch {
      // 전건 실패 — 표를 그대로 두고 창 안에 사유를 남긴다(§3).
      setBanner(labels.sendError);
    } finally {
      setSending(false);
    }
  };

  const doSend = async () => {
    if (isCsv) {
      await doSendCsv();
      return;
    }
    setSending(true);
    setBanner('');
    try {
      const payload = activeRows.map((r) => ({
        email: r.email.trim(),
        name: r.name.trim(),
        // 재입사자는 멤버로 시작한다(E8 ③) — 서버도 멤버로 바꾸지만 보내는 값부터 맞춘다
        role: rehireOfEmail(r.email) ? 'member' : r.role,
        jobLevel: r.jobLevel || undefined,
        jobFamily: r.jobFamily || undefined,
        // 계약 키는 `jobLadder` 다(arch-admin-data-model 초대 발송 API · PW-412).
        // 행 모델의 `jobTitle` 은 컬럼 이름이 남은 것일 뿐 값은 직렬이다.
        jobLadder: r.jobTitle || undefined,
        // 끈 조직은 **키째** 싣지 않는다 — 서버도 버리지만(V12) 보내지 않는 쪽이 계약이 분명하다.
        ...(jobCategoryEnabled && r.jobCategory ? { jobCategory: r.jobCategory } : {}),
        workLocation: r.workLocation || undefined,
        employmentType: r.employmentType || undefined,
        teamIds: r.teamIds.length ? r.teamIds : undefined,
        teamId: r.primaryTeamId || undefined,
        // [PW-1310] 직접 입력이 새로 받는 칸 — 서버는 CSV 초대 때부터 같은 키로 받는다(PW-902).
        jobDuty: r.jobDuty || undefined,
        jobPosition: r.jobPosition || undefined,
        jobRank: r.jobRank || undefined,
        hireDate: r.hireDate || undefined,
        nickname: r.nickname.trim() || undefined,
        employeeCode: r.employeeCode.trim() || undefined,
        managerEmail: r.managerEmail || undefined,
        // 조직장 예약은 고른 소속 안에서만 — 가입 때 그 조직 소속이 생긴 뒤 적용된다(L3)
        leaderTeamIds: r.leaderTeamIds.length ? r.leaderTeamIds : undefined,
      }));
      const res = await onSend?.(payload);
      const failed = res?.failed ?? [];
      if (failed.length === 0) {
        onClose?.();
        return;
      }
      /* 부분 성공 — 모달을 유지하고 **실패 행만** 남긴다(§3).
         닫아 버리면 그 행들의 이름·소속·직군 입력이 통째로 사라져
         처음부터 다시 입력해야 한다. */
      setBanner(fmt(labels.partialFail, { n: failed.length }));
      setActiveRows((rs) =>
        failed
          .map((f) => {
            const row = rs[f.index] ?? rs.find((r) => normEmail(r.email) === normEmail(f.email));
            if (!row) return null;
            const key = FAIL_LABEL_KEY[f.reason];
            return {
              ...row,
              failReason: (key && labels[key]) || labels.failUnknown,
            };
          })
          .filter(Boolean),
      );
    } catch {
      // 전건 실패 — 입력을 보존한 채 모달에 사유를 남긴다(§3).
      setBanner(labels.sendError);
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  const seatSummary =
    seats === null
      ? labels.seatsUnknown
      : seats.limit === null
        ? labels.seatsUnlimited
        : fmt(labels.seatsLeft, { n: seats.remaining });

  /* 직군 › 직렬 › 직무 3단 — 직렬은 직군에, 직무는 직렬에 매달린다(INV-3 · INV-8).
     위 칸을 고르기 전에는 아래 칸을 잠그고 그 칸에서 이유를 말한다. */
  const axisFields = (idPrefix, v, disabled, onPatch) => (
    <>
      <OptionSelect
        id={`${idPrefix}-jobFamily`} label={labels.jobFamily} labels={labels}
        value={v.jobFamily} options={fieldOptions.jobFamily} disabled={disabled}
        onChange={(x) => onPatch({ jobFamily: x })}
      />
      <OptionSelect
        id={`${idPrefix}-jobTitle`} label={labels.jobTitle} labels={labels}
        value={v.jobTitle}
        options={laddersForFamily(laddersByFamily, v.jobFamily, fieldOptions.jobTitle)}
        disabled={disabled || ladderLocked(laddersByFamily, v.jobFamily)}
        placeholder={ladderLocked(laddersByFamily, v.jobFamily) ? labels.ladderNeedsFamily : undefined}
        onChange={(x) => onPatch({ jobTitle: x })}
      />
      <OptionSelect
        id={`${idPrefix}-jobDuty`} label={labels.jobDuty} labels={labels}
        value={v.jobDuty}
        options={laddersForFamily(dutiesByLadder, v.jobTitle, fieldOptions.jobDuty)}
        disabled={disabled || ladderLocked(dutiesByLadder, v.jobTitle)}
        placeholder={ladderLocked(dutiesByLadder, v.jobTitle) ? labels.dutyNeedsLadder : undefined}
        onChange={(x) => onPatch({ jobDuty: x })}
      />
    </>
  );

  const bulkFields = (
    <>
      <label className="admin-inv-field">
        <span className="admin-inv-label">{labels.role}</span>
        <select
          className="admin-inv-select"
          value={bulk.role}
          onChange={(e) => setBulk({ ...bulk, role: e.target.value })}
        >
          {ROLE_IDS.map((id) => (
            <option key={id} value={id}>
              {labels[`role${id[0].toUpperCase()}${id.slice(1)}`]}
            </option>
          ))}
        </select>
      </label>
      <OptionSelect
        id="inv-bulk-jobLevel" label={labels.jobLevel} labels={labels}
        value={bulk.jobLevel} options={fieldOptions.jobLevel}
        onChange={(v) => setBulk({ ...bulk, jobLevel: v })}
      />
      {axisFields('inv-bulk', bulk, false, (p) => setBulk((b) => cleanAxis({ ...b, ...p }, p, laddersByFamily, dutiesByLadder)))}
      {jobCategoryEnabled && (
        <OptionSelect
          id="inv-bulk-jobCategory" label={labels.jobCategory} labels={labels}
          value={bulk.jobCategory} options={fieldOptions.jobCategory}
          onChange={(v) => setBulk((b) => ({ ...b, jobCategory: v }))}
        />
      )}
      <OptionSelect
        id="inv-bulk-workLocation" label={labels.workLocation} labels={labels}
        value={bulk.workLocation} options={fieldOptions.workLocation}
        onChange={(v) => setBulk({ ...bulk, workLocation: v })}
      />
      <OptionSelect
        id="inv-bulk-employmentType" label={labels.employmentType} labels={labels}
        value={bulk.employmentType} options={fieldOptions.employmentType}
        placeholder={labels.unset}
        onChange={(v) => setBulk({ ...bulk, employmentType: v })}
      />
      <button
        type="button"
        className="admin-emp-btn is-soft is-sm"
        onClick={() => applyBulk('empty')}
      >
        {labels.bulkApplyEmpty}
      </button>
      <button
        type="button"
        className="admin-emp-btn is-ghost is-sm"
        onClick={() => applyBulk('all')}
      >
        {labels.bulkApplyAll}
      </button>
    </>
  );

  const footer = (
    <div className="adm-shell-foot">
      <span className="admin-inv-summary">
        {validCount > 0
          ? (isCsv && csvErrorCount > 0
            ? fmt(labels.csvSummarySkip, { n: validCount, m: csvErrorCount })
            : fmt(labels.summary, { n: validCount }))
          : ''}
      </span>
      <div className="adm-shell-foot-actions">
        <button
          type="button"
          className="tl-group-modal-btn tl-group-modal-btn-secondary"
          disabled={sending}
          onClick={requestClose}
        >
          {labels.cancel}
        </button>
        <button
          type="button"
          className="tl-group-modal-btn tl-group-modal-btn-primary"
          disabled={!canSend}
          onClick={() => (adminRows.length > 0 ? setConfirmAdmin(true) : doSend())}
        >
          {sending ? labels.sending : labels.send}
        </button>
      </div>
    </div>
  );

  /* 껍데기는 공용 창 틀(ModalShell · PW-836). 헤더 — 좌석 요약. 좌석은 '수락 시점' 에
     증가하므로 미래형 문구(§4-4). 막·닫기 X·Esc 는 모두 requestClose 로 간다 — 입력이
     있으면 버릴지 먼저 묻는다. 발송 중(busy)에는 닫지 않는다(§3).
     🔴 확인 창 둘은 창 틀의 «형제»로 둔다 — 틀 안에 두면 확인 창 막 클릭이 React 트리를
     따라 틀까지 올라간다. */
  return (
    <>
    <ModalShell
      title={labels.title}
      description={
        <>
          {`${seatSummary} · ${fmt(labels.seatsWillGrow, { n: seatNeed })}`}
          {billingNotice?.text && (
            <>
              {' · '}
              <span
                className={billingNotice.emphasis ? 'admin-inv-billing is-emphasis' : 'admin-inv-billing'}
                data-testid="admin-invite-billing-notice"
              >
                {billingNotice.text}
              </span>
            </>
          )}
        </>
      }
      titleId="admin-invite-title"
      closeLabel={labels.close}
      onClose={requestClose}
      busy={sending}
      zIndex={1000}
      className={`adm-shell has-own-footer admin-inv-modal${isCsv && csvRows.length > 0 ? ' is-csv-wide' : ''}`}
      testId="admin-invite-modal"
      footer={footer}
    >
        {/* 모드 탭(§2-1). 탭 전환은 반대 탭의 입력을 지우지 않는다 — 각자 행 목록을
            따로 들고 있고, 발송은 보고 있는 탭의 행만 보낸다. 발송 중에는 바꾸지 않는다. */}
        {modes.length > 1 && (
        <div className="tl-tabs-row adm-tabs-row">
          <Tabs
            items={[
              { value: 'direct', label: labels.tabDirect, disabled: sending },
              { value: 'csv', label: labels.tabCsv, disabled: sending },
            ].filter((it) => modes.includes(it.value))}
            value={mode}
            onChange={(id) => {
              setMode(id);
              setBanner('');
            }}
          />
        </div>
        )}

        {(seatShort || banner) && (
          <div className="admin-inv-banners">
            {seatShort && (
              <div className="admin-inv-banner is-warn" role="status">
                <IconAlert size={16} />
                <span>
                  {seatsLeft === 0
                    ? labels.seatNone
                    : fmt(labels.seatShort, { left: seatsLeft, need: seatNeed })}
                </span>
                {onGoBilling && (
                  <button type="button" className="admin-emp-btn is-ghost is-sm" onClick={onGoBilling}>
                    {labels.goBilling}
                  </button>
                )}
              </div>
            )}
            {banner && (
              <div className="admin-inv-banner is-error" role="alert">
                <IconAlert size={16} />
                <span>{banner}</span>
              </div>
            )}
          </div>
        )}

        {/* 일괄 지정 바 — **사람이 2명 이상일 때만**(§1·§2-2 · PW-1310). 한 명 초대에는 쓸 일이
            없는 칸이 화면 맨 위를 차지했다(알파 테스트 제보). 1명으로 줄면 사라지되 넣어 둔 값은
            남는다(E21). 값 변경은 기존 사람에게 전파하지 않는다(§4-2) — 전파는 두 버튼으로만.
            CSV 탭에는 없다 — 값은 파일이 들고 오고, 잘못된 값은 그 행에서 고친다. */}
        {!isCsv && rows.length >= 2 && (
        <div className="admin-inv-bulk" data-testid="admin-invite-bulk">
          <div className="admin-inv-bulk-head">
            <span className="admin-inv-bulk-title">{labels.bulkTitle}</span>
            <span className="admin-inv-hint">{labels.bulkHint}</span>
          </div>
          <div className="admin-inv-bulk-fields">{bulkFields}</div>
          {applyToast && (
            <div className="admin-inv-undo" role="status">
              <span>{applyToast}</span>
              <button type="button" className="admin-emp-btn is-ghost is-sm" onClick={undoBulk}>
                {labels.bulkUndo}
              </button>
            </div>
          )}
        </div>
        )}

        <div className="admin-inv-body">
          {/* 안내 줄(§2-3) — 어드민이 넣는 값과 가입 후 본인이 채우는 값을 가른다 */}
          {!isCsv && (
            <p className="admin-inv-guide">
              {labels.guideLine1}
              <br />
              {labels.guideLine2}
            </p>
          )}
          {isCsv && (
            <div className="admin-inv-csv">
              <div className="admin-inv-csv-head">
                <p className="admin-inv-hint">{labels.csvIntro}</p>
                <button
                  type="button"
                  className="admin-emp-btn is-ghost is-sm"
                  onClick={downloadTemplate}
                >
                  <IconDownload size={14} />{labels.csvTemplate}
                </button>
              </div>

              {csvRows.length === 0 ? (
                <>
                  {/* 드롭존 — label 로 감싸 클릭·드래그 둘 다 같은 input 을 쓴다 */}
                  <label
                    className={`admin-inv-drop${dragOver ? ' is-over' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      readCsvFile(e.dataTransfer?.files?.[0]);
                    }}
                  >
                    <input
                      type="file"
                      accept={readSpreadsheet ? '.csv,text/csv,.xlsx' : '.csv,text/csv'}
                      className="admin-inv-drop-input"
                      aria-label={labels.csvDropHere}
                      onChange={(e) => { readCsvFile(e.target.files?.[0]); e.target.value = ''; }}
                    />
                    <IconUpload size={22} />
                    <span className="admin-inv-drop-title">{labels.csvDropHere}</span>
                    <span className="admin-inv-hint">
                      {fmt(labels.csvLimits, { max: csvMaxRows })}
                    </span>
                  </label>
                  {csvError && (
                    <p className="admin-inv-row-error" role="alert">{csvError}</p>
                  )}
                </>
              ) : (
                <>
                  <div className="admin-inv-csv-head">
                    <button
                      type="button"
                      className="admin-emp-btn is-ghost is-sm"
                      disabled={sending}
                      onClick={resetCsv}
                    >
                      {labels.csvReplaceFile}
                    </button>
                  </div>

                  {/* 무시한 열은 조용히 버리지 않는다 — 어드민이 그 값이 반영된 줄
                      알고 가입 후에 다시 확인하지 않는다(§2-4). */}
                  {csvNotices.map((n) => (
                    <div key={n} className="admin-inv-banner is-warn" role="status">
                      <IconAlert size={16} />
                      <span>{n}</span>
                    </div>
                  ))}
                  {csvPreparedNotices.map((n) => (
                    <div key={n} className="admin-inv-banner" role="status" data-testid="admin-invite-csv-prepared-notice">
                      <span>{n}</span>
                    </div>
                  ))}

                  {/* 미리보기 표 — 온보딩과 같은 부품이다(PW-902). 모든 칸을 그 자리에서 고친다. */}
                  <InviteCsvStagingTable
                    rows={csvRows}
                    columns={csvColumns}
                    issuesByKey={csvIssuesByKey}
                    notesByKey={csvNotesByKey}
                    fieldOptions={csvFieldOptions}
                    labels={labels}
                    disabled={sending}
                    onChangeCell={patchCsvCell}
                  />
                </>
              )}
            </div>
          )}

          {!isCsv && rows.map((r, idx) => {
            /* 아직 아무것도 입력하지 않은 사람에는 오류를 띄우지 않는다.
               창을 열자마자 빈 카드가 빨갛게 "유효하지 않은 이메일 · 이름을
               입력해주세요" 를 외치면, 사용자가 뭘 잘못한 줄 알고 멈칫한다.
               발송 버튼은 어차피 비활성이라 잘못 나갈 위험은 없다. */
            const touched =
              r.email.trim() !== '' || r.name.trim() !== '' || r.teamIds.length > 0;
            const errs = touched ? errorsByKey[r.key] : [];
            const bad = errs.length > 0 || Boolean(r.failReason);
            const rehire = rehireOfEmail(r.email);
            const extraCount = EXTRA_KEYS
              .filter((k) => (k !== 'jobCategory' || jobCategoryEnabled) && String(r[k] ?? '').trim()).length;
            // 주 소속 조직에 조직장이 있으면(이번 발송의 예약 포함) 상급자는 조직장이 된다 — CSV 탭과 같은 규칙(PW-902)
            const managerIgnored = Boolean(r.managerEmail) && Boolean(r.primaryTeamId)
              && (headTeams.has(r.primaryTeamId) || reservedLeaders.has(r.primaryTeamId));
            const sel = (k, label, opts, extra = {}) => (
              <OptionSelect
                id={`inv-${r.key}-${k}`} label={label} labels={labels}
                value={r[k]} options={opts} disabled={sending}
                onChange={(v) => patch(r.key, { [k]: v })}
                {...extra}
              />
            );
            const text = (k, label) => (
              <label className="admin-inv-field">
                <span className="admin-inv-label">{label}</span>
                <input
                  type="text"
                  id={`inv-${r.key}-${k}`}
                  className="admin-inv-input"
                  value={r[k]}
                  disabled={sending}
                  onChange={(e) => patch(r.key, { [k]: e.target.value })}
                />
              </label>
            );
            return (
              <div key={r.key} className={`admin-inv-row admin-inv-card${bad ? ' is-error' : ''}`} data-testid="admin-invite-person">
                {rows.length > 1 && (
                  <div className="admin-inv-card-head">
                    <span className="admin-inv-bulk-title">{fmt(labels.personN, { n: idx + 1 })}</span>
                    <button
                      type="button"
                      className="admin-emp-btn is-ghost is-sm admin-emp-danger"
                      aria-label={labels.removeRow}
                      title={labels.removeRow}
                      disabled={sending}
                      onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                    >
                      <IconTrash size={14} />
                    </button>
                  </div>
                )}
                <div className="admin-inv-row-main">
                  <label className="admin-inv-field admin-inv-field-email">
                    <span className="admin-inv-label">{labels.email}</span>
                    <input
                      type="email"
                      className="admin-inv-input"
                      value={r.email}
                      placeholder={labels.emailPlaceholder}
                      disabled={sending}
                      onChange={(e) => patch(r.key, { email: e.target.value })}
                    />
                  </label>
                  <label className="admin-inv-field admin-inv-field-name">
                    <span className="admin-inv-label">{labels.name}</span>
                    <input
                      type="text"
                      className="admin-inv-input"
                      value={r.name}
                      placeholder={labels.namePlaceholder}
                      disabled={sending}
                      onChange={(e) => patch(r.key, { name: e.target.value })}
                    />
                  </label>
                  <label className="admin-inv-field" title={rehire ? labels.rehireRoleLocked : undefined}>
                    <span className="admin-inv-label">{labels.role}</span>
                    <select
                      className="admin-inv-select"
                      value={rehire ? 'member' : r.role}
                      disabled={sending || Boolean(rehire)}
                      data-testid="admin-invite-role"
                      onChange={(e) => patch(r.key, { role: e.target.value })}
                    >
                      {ROLE_IDS.map((id) => (
                        <option key={id} value={id}>
                          {labels[`role${id[0].toUpperCase()}${id.slice(1)}`]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {/* 재입사 모드(초대 §9 E8 · PW-1355) — 배지·안내, 정정 기간 안이면 «퇴사 취소» 안내 한 줄 */}
                {rehire && (
                  <div className="admin-inv-hint" role="status" data-testid="admin-invite-rehire">
                    <StatusBadge tone="neutral" className="admin-emp-role-pill">{labels.rehireBadge}</StatusBadge>{' '}
                    {labels.rehireNotice}
                    {rehire.revertOpen && <div>{labels.rehireRevertNotice}</div>}
                  </div>
                )}

                {/* 소속 — 조직 배치에 가장 중요한 값이라 접지 않는다(§2-3) */}
                <div className="admin-inv-teams-block">
                  <span className="admin-inv-label">{labels.teams}</span>
                  <TeamSearchField
                    rowKey={r.key}
                    tree={tree}
                    row={r}
                    labels={labels}
                    disabled={sending}
                    onPick={(id) => addTeam(r, id)}
                    onRemove={(id) => removeTeam(r, id)}
                    onPrimary={(id) => patch(r.key, { primaryTeamId: id, primaryNote: '' })}
                    onLeader={(id) => toggleLeader(r, id)}
                  />
                  {r.primaryNote && <p className="admin-inv-hint" role="status">{r.primaryNote}</p>}
                </div>

                {/* 주요 정보 — 접지 않는다(§2-3). 종전에는 전부 [상세] 안에 있었다. */}
                <div className="admin-inv-row-fields">
                  {sel('jobLevel', labels.jobLevel, fieldOptions.jobLevel)}
                  {sel('jobPosition', labels.jobPosition, fieldOptions.jobPosition)}
                  {axisFields(`inv-${r.key}`, r, sending, (p) => patch(r.key, p))}
                  <label className="admin-inv-field">
                    <span className="admin-inv-label">{labels.hireDate}</span>
                    <DateInput
                      id={`inv-${r.key}-hireDate`}
                      className="admin-inv-input"
                      value={r.hireDate}
                      disabled={sending}
                      aria-label={labels.hireDate}
                      onChange={(v) => patch(r.key, { hireDate: v })}
                    />
                  </label>
                  {sel('employmentType', labels.employmentType, fieldOptions.employmentType, { placeholder: labels.unset })}
                  {sel('workLocation', labels.workLocation, fieldOptions.workLocation)}
                </div>

                {/* 추가 정보 — 덜 쓰는 칸만 접는다. 접혀 있어도 몇 개 넣었는지 버튼이 말한다(E6 개정) */}
                <button
                  type="button"
                  className="admin-emp-btn is-ghost is-sm admin-inv-extra-toggle"
                  aria-expanded={r.extraOpen}
                  onClick={() => patch(r.key, { extraOpen: !r.extraOpen })}
                >
                  {r.extraOpen ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                  {extraCount > 0 ? fmt(labels.extraInfoCount, { n: extraCount }) : labels.extraInfo}
                </button>
                {r.extraOpen && (
                  <div className="admin-inv-row-fields admin-inv-extra">
                    {sel('jobRank', labels.jobRank, fieldOptions.jobRank)}
                    {jobCategoryEnabled && sel('jobCategory', labels.jobCategory, fieldOptions.jobCategory)}
                    {text('nickname', labels.nickname)}
                    {text('employeeCode', labels.employeeCode)}
                    {supervisorCandidates && (
                      <div className="admin-inv-field">
                        <label className="admin-inv-label" htmlFor={`inv-${r.key}-managerEmail`}>{labels.manager}</label>
                        <select
                          id={`inv-${r.key}-managerEmail`}
                          className="admin-inv-select"
                          value={r.managerEmail}
                          disabled={sending}
                          onChange={(e) => patch(r.key, { managerEmail: e.target.value })}
                        >
                          <option value="">{labels.unset}</option>
                          {supervisorCandidates.map((c) => (
                            <option key={c.email} value={c.email}>
                              {c.name ? `${c.name} (${c.email})` : c.email}
                            </option>
                          ))}
                        </select>
                        {managerIgnored && <span className="admin-inv-hint">{labels.csvNoteManagerIgnored}</span>}
                      </div>
                    )}
                  </div>
                )}

                {errs.length > 0 && (
                  <p className="admin-inv-row-error">{errs.join(' · ')}</p>
                )}
                {resend.has(normEmail(r.email)) && !existing.has(normEmail(r.email)) && (
                  <p className="admin-inv-note" data-testid="admin-invite-unjoined-note">{labels.noteUnjoinedMember}</p>
                )}
                {onResendPending && errs.includes(labels.errPendingInvite) && (
                  <div className="admin-inv-addrow">
                    <button
                      type="button"
                      className="admin-emp-btn is-ghost is-sm"
                      data-testid="admin-invite-resend-pending"
                      disabled={sending || resendingKey === r.key}
                      onClick={() => resendPendingRow(r)}
                    >
                      {resendingKey === r.key ? labels.resendingPending : labels.resendPending}
                    </button>
                    {resendErrorKey === r.key && (
                      <span className="admin-inv-row-error" role="alert">{labels.resendPendingError}</span>
                    )}
                  </div>
                )}
                {r.failReason && (
                  <p className="admin-inv-row-error">{r.failReason}</p>
                )}
              </div>
            );
          })}

          {!isCsv && (
            <div className="admin-inv-addrow">
              <button
                type="button"
                className="admin-emp-btn is-ghost is-sm"
                disabled={rows.length >= maxRows || sending}
                onClick={() => setRows((rs) => [...rs, blankRow(bulk)])}
              >
                <IconPlus size={14} />{labels.addRow}
              </button>
              {rows.length >= maxRows && (
                <span className="admin-inv-hint">{fmt(labels.maxRows, { n: maxRows })}</span>
              )}
              {rows.length === 1 && <span className="admin-inv-hint">{labels.singleHint}</span>}
            </div>
          )}

          {/* 조직장은 소속 줄에서 «예약»하고 가입 때 적용된다(§2-3). 스쿼드는 직접 입력에서 받지 않는다. */}
          {!isCsv && (
          <p className="admin-inv-note">
            {labels.leaderNote}
            <br />
            {labels.squadNote}
          </p>
          )}
        </div>

    </ModalShell>

      {/* 어드민 역할 초대 확인(§6-1) — 건수만 쓰지 않고 **이름을 나열**한다.
          건수만 보여주면 누구인지 확인하지 않고 넘긴다. */}
      {confirmAdmin && (
        <ConfirmModal
          testId="admin-invite-admin-confirm"
          title={labels.adminConfirmTitle}
          body={
            <>
              <p className="admin-inv-confirm-body">
                {fmt(labels.adminConfirmBody, {
                  names: adminRows.map((r) => `${r.name}(${r.email})`).join(', '),
                })}
              </p>
              <ul className="admin-inv-confirm-list">
                <li>{labels.adminConfirmP1}</li>
                <li>{labels.adminConfirmP2}</li>
                <li>{labels.adminConfirmP3}</li>
              </ul>
            </>
          }
          cancelLabel={labels.cancel}
          confirmLabel={labels.adminConfirmOk}
          onCancel={() => setConfirmAdmin(false)}
          onConfirm={() => { setConfirmAdmin(false); doSend(); }}
        />
      )}

      {/* 입력 중 닫기 확인(§6-2) — 50명 입력은 복원되지 않으므로(E11)
          이 확인이 실수 유실을 막는 유일한 장치다. */}
      {confirmDiscard && (
        <ConfirmModal
          testId="admin-invite-discard-confirm"
          title={labels.discardTitle}
          body={fmt(labels.discardBody, { n: activeRows.length })}
          cancelLabel={labels.discardKeep}
          confirmLabel={labels.discardLeave}
          danger
          cancelRef={discardKeepRef}
          onCancel={() => setConfirmDiscard(false)}
          onConfirm={() => { setConfirmDiscard(false); onClose?.(); }}
        />
      )}
    </>
  );
}
