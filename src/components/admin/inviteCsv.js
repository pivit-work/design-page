/**
 * 초대 CSV 업로드의 순수 규칙 — 열 정의·파싱·칸 검증·발송 본문 (PW-212 → PW-902).
 *
 * 🔴 **두 초대 화면이 이 파일 한 벌을 쓴다** — 어드민 「구성원 초대」 창의 CSV 업로드 탭과
 * 온보딩 「구성원 초대」 단계의 CSV 탭. 기획서가 두 화면을 «같은 칸·같은 검증»으로 정했고
 * (`8. onboarding/screen-onboarding-invite.policy.md` 탭 4 · `J. Admin_관리자/
 * screen-admin-employees-invite.policy.md` §2-4), 따로 두었을 때 한쪽만 넓어졌다(PW-902 발단:
 * 온보딩 4칸 · 어드민 9칸).
 *
 * 컴포넌트에서 분리한 이유는 `inviteRules.js` 와 같다.
 *  1. 파싱·해석 규칙은 렌더 없이 단독으로 검증할 수 있어야 한다 — 500행짜리 파일의
 *     경계(500/501)를 브라우저를 띄워 확인할 수는 없다.
 *  2. 화면 파일이 컴포넌트만 export 해야 fast-refresh 가 온전히 동작한다.
 *
 * 🔴 파싱 단계에서 잡은 문제를 **행에 굳혀 두지 않는다.** 행은 파일 칸의 **글자 그대로**
 * (`row.values`)만 들고, 조직경로 해석·역할 해석·사유 문구는 렌더 때마다 다시 만든다 —
 * 표의 칸에서 고치면 그 즉시 사유가 사라져야 하기 때문이다.
 */

import { emailOk, jobPairIssue, nameHasEmail, normEmail } from './inviteRules.js';

/**
 * 어드민 창 CSV 1회 상한(§1). 서버 `BulkInviteDto` 의 `@ArrayMaxSize(500)` 과 같은 값이며,
 * 서버는 최종 방어로 그대로 남는다. 온보딩은 200 이다(기획서 탭 4) — `parseInviteCsv` 의
 * `maxRows` 로 넘긴다.
 */
export const INVITE_CSV_MAX_ROWS = 500;

/**
 * 초대 CSV 의 열 — **제품에 담을 곳이 있는 인사 정보 전량** (PW-902).
 *
 * 기획서는 「구성원 관리에서 관리자가 입력·수정하는 인사 정보 칸 전부 + 직종 + 조직장」을
 * 받으라고 한다(64칸). 그중 **제품에 담을 칸이 아직 없는 25칸**(급여 유형·계좌·보험·교육 …)은
 * 여기 없다 — 받아도 가입 뒤 아무도 볼 수 없는 값이 되기 때문이다(2026-09-22 커트 결정 · PW-920).
 * 그 칸이 파일에 섞여 오면 「건너뛴 열」로 알린다.
 *
 * 열 속성:
 *  · `labelKey` 헤더·표 머리 문구의 라벨 키 — 헤더를 라벨로 받는 이유는 en 로케일에서 한국어
 *    헤더가 새지 않게 하기 위해서다. 파일 헤더는 라벨·`key`·`aliases` 어느 것으로 와도 알아본다
 *  · `option`  회사가 등록한 값만 받는 칸 — `fieldOptions` 의 키
 *  · `kind`    값 검사 종류(`email`·`date`·`fte`·`status`·`role`·`salary`·`leader`·`list`)
 *  · `masked`  🔒 표에서 값을 가린다(연봉 — 기획서 탭 4 T3 규칙)
 *  · `sticky`  표 왼쪽에 고정(이메일·이름 — 가로로 밀어도 누구 줄인지 보이게)
 *  · `width`   표 칸 폭(px)
 *  · `conditional: 'jobCategory'` 직종을 켠 회사만 받는다(PW-644)
 */
export const INVITE_CSV_COLUMNS = [
  // 신원
  { key: 'email', labelKey: 'csvColEmail', required: true, kind: 'email', sticky: true, width: 200, aliases: ['이메일*'] },
  { key: 'name', labelKey: 'csvColName', required: true, sticky: true, width: 110, aliases: ['이름*'] },
  { key: 'nickname', labelKey: 'csvColNickname', width: 100 },
  { key: 'employeeCode', labelKey: 'csvColEmployeeCode', width: 100 },
  { key: 'birthDate', labelKey: 'csvColBirthDate', kind: 'date', width: 120 },
  { key: 'gender', labelKey: 'csvColGender', width: 80 },
  { key: 'maritalStatus', labelKey: 'csvColMaritalStatus', width: 90 },
  { key: 'nationality', labelKey: 'csvColNationality', width: 90 },
  // 연락
  { key: 'phone', labelKey: 'csvColPhone', width: 130 },
  { key: 'personalEmail', labelKey: 'csvColPersonalEmail', kind: 'email', width: 180 },
  { key: 'addressDetail', labelKey: 'csvColAddressDetail', width: 150 },
  { key: 'addressDistrict', labelKey: 'csvColAddressDistrict', width: 120 },
  { key: 'addressRegion', labelKey: 'csvColAddressRegion', width: 120 },
  { key: 'addressCountry', labelKey: 'csvColAddressCountry', width: 110 },
  { key: 'emergencyContactName', labelKey: 'csvColEmergencyName', width: 120 },
  { key: 'emergencyContactPhone', labelKey: 'csvColEmergencyPhone', width: 140, aliases: ['비상연락처 전화'] },
  { key: 'emergencyContactRelation', labelKey: 'csvColEmergencyRelation', width: 120 },
  // 직무
  { key: 'jobCategory', labelKey: 'csvColJobCategory', option: 'jobCategory', conditional: 'jobCategory', width: 110 },
  { key: 'jobFamily', labelKey: 'csvColJobFamily', option: 'jobFamily', width: 120 },
  // ⚠ 직렬이다 — 옛 어드민 템플릿의 `jobTitle` 키로 와도 알아본다(M5-b 승격 전 이름).
  { key: 'jobLadder', labelKey: 'csvColJobLadder', option: 'jobTitle', width: 120, aliases: ['jobTitle', 'job_title'] },
  { key: 'jobDuty', labelKey: 'csvColJobDuty', option: 'jobDuty', width: 120 },
  { key: 'jobLevel', labelKey: 'csvColJobLevel', option: 'jobLevel', width: 100, aliases: ['job_level'] },
  { key: 'jobRank', labelKey: 'csvColJobRank', option: 'jobRank', width: 100 },
  { key: 'jobPosition', labelKey: 'csvColJobPosition', option: 'jobPosition', width: 100 },
  // 조직
  { key: 'orgPath', labelKey: 'csvColOrgPath', width: 220, aliases: ['team', '팀', '소속팀'] },
  { key: 'primaryPath', labelKey: 'csvColPrimaryPath', width: 160 },
  { key: 'squad', labelKey: 'csvColSquad', kind: 'list', width: 140 },
  { key: 'managerEmail', labelKey: 'csvColManager', kind: 'email', width: 190, aliases: ['상급자'] },
  { key: 'leader', labelKey: 'csvColLeader', kind: 'leader', width: 110, aliases: ['조직장'] },
  // 고용
  { key: 'employmentType', labelKey: 'csvColEmploymentType', option: 'employmentType', width: 100 },
  { key: 'employmentStatus', labelKey: 'csvColEmploymentStatus', kind: 'status', width: 100 },
  { key: 'ftePercent', labelKey: 'csvColFte', kind: 'fte', width: 70 },
  { key: 'hireDate', labelKey: 'csvColHireDate', kind: 'date', width: 120 },
  { key: 'terminationDate', labelKey: 'csvColTerminationDate', kind: 'date', width: 120 },
  // 근무지
  { key: 'workCountry', labelKey: 'csvColWorkCountry', option: 'workCountry', width: 110 },
  { key: 'workLocation', labelKey: 'csvColWorkLocation', option: 'workLocation', width: 110, aliases: ['근무지'] },
  // 권한
  { key: 'role', labelKey: 'csvColRole', kind: 'role', width: 90 },
  // 급여·보상 — 🔒
  { key: 'salary', labelKey: 'csvColSalary', kind: 'salary', masked: true, width: 110, aliases: ['연봉'] },
  // 평가
  { key: 'certifications', labelKey: 'csvColCertifications', kind: 'list', width: 160, aliases: ['자격증'] },
];

/** 이 회사가 받는 열 — 직종을 끈 회사는 직종 열이 없다(PW-644). */
export function inviteCsvColumns({ jobCategoryEnabled = false } = {}) {
  return INVITE_CSV_COLUMNS.filter(
    (c) => c.conditional !== 'jobCategory' || jobCategoryEnabled,
  );
}

/** 옛 이름 — 템플릿 열과 받는 열은 같은 목록이다. */
export const inviteTemplateColumns = inviteCsvColumns;

/** 조직경로 구분자 — 계층은 `>`, 겸직 배열은 `|` (`org-snapshot-spec.md §3-A`). */
export const ORG_PATH_DEPTH_SEP = '>';
export const ORG_PATH_LIST_SEP = '|';

/** Excel 이 BOM 없는 UTF-8 CSV 의 한글을 깨뜨려 읽는다. */
export const CSV_BOM = '﻿';

/**
 * 역할 코드값 ↔ 라벨 키 — 초대에 실을 수 있는 권한은 **둘뿐이다** (PW-847).
 *
 * 🔴 `manager` 를 되살리지 말 것. 매니저는 저장하는 등급이 아니라 «그 사람이 어떤
 * 조직의 장인가» 라는 관계라, 초대에 실어 보낼 것이 없다.
 */
export const ROLE_LABEL_KEY = {
  member: 'roleMember',
  admin: 'roleAdmin',
};

/**
 * 예전엔 권한이었지만 이제 아닌 값 — 파일에 적혀 오면 **알 수 없는 값이 아니라 «없어진
 * 값»으로** 따로 알린다. 「알 수 없는 역할」이라고만 하면 올린 사람은 오타를 찾는다.
 */
export const RETIRED_ROLE_LABEL_KEY = {
  manager: 'roleManager',
};

/**
 * 고용상태 코드값 ↔ 라벨 키. 파일에는 라벨(`재직`)로도 코드(`active`)로도 온다 — 서버는 코드만
 * 받는다. 라벨은 구성원 관리 화면의 재직상태와 같은 말이다.
 */
export const EMPLOYMENT_STATUS_LABEL_KEY = {
  active: 'csvStatusActive',
  probation: 'csvStatusProbation',
  on_leave: 'csvStatusOnLeave',
  terminated: 'csvStatusTerminated',
  pending: 'csvStatusPending',
  other: 'csvStatusOther',
};

/**
 * 이 파일이 쓰는 문구의 한국어 기본값. 화면은 `t()` 로 만든 라벨을 넘겨 덮는다.
 * 기본값을 여기 두는 이유: 두 화면이 같은 규칙을 쓰는데 라벨 한 벌이 빠지면 헤더를 못 알아본다.
 */
export const INVITE_CSV_DEFAULT_LABELS = {
  csvColEmail: '이메일',
  csvColName: '이름',
  csvColNickname: '닉네임',
  csvColEmployeeCode: '사번',
  csvColBirthDate: '생년월일',
  csvColGender: '성별',
  csvColMaritalStatus: '결혼 여부',
  csvColNationality: '국적',
  csvColPhone: '전화번호',
  csvColPersonalEmail: '개인 이메일',
  csvColAddressDetail: '집 주소(상세)',
  csvColAddressDistrict: '집 주소(동·구)',
  csvColAddressRegion: '집 주소(시·도)',
  csvColAddressCountry: '집 주소(국가)',
  csvColEmergencyName: '비상연락처 이름',
  csvColEmergencyPhone: '비상연락처 전화번호',
  csvColEmergencyRelation: '비상연락처 관계',
  csvColJobCategory: '직종',
  csvColJobFamily: '직군',
  csvColJobLadder: '직렬',
  csvColJobDuty: '직무',
  csvColJobLevel: '직급',
  csvColJobRank: '직위',
  csvColJobPosition: '직책',
  csvColOrgPath: '조직경로',
  csvColPrimaryPath: '주소속',
  csvColSquad: '스쿼드',
  csvColManager: '상급자(이메일)',
  csvColLeader: '조직장(예약)',
  csvColEmploymentType: '고용형태',
  csvColEmploymentStatus: '고용상태',
  csvColFte: 'FTE',
  csvColHireDate: '입사일',
  csvColTerminationDate: '퇴사일',
  csvColWorkCountry: '근무지(국가)',
  csvColWorkLocation: '근무지(도시)',
  csvColRole: '역할',
  csvColSalary: '연봉 총액',
  csvColCertifications: '자격증 및 면허',
  csvColStatus: '상태',
  roleMember: '멤버',
  roleAdmin: '어드민',
  roleManager: '매니저',
  csvStatusActive: '재직',
  csvStatusProbation: '수습',
  csvStatusOnLeave: '휴직',
  csvStatusTerminated: '퇴사',
  csvStatusPending: '대기',
  csvStatusOther: '기타',
  csvSampleName: '홍길동',
  csvErrEmpty: '내용이 없는 파일이에요.',
  csvErrNoRows: '헤더만 있고 읽을 행이 없어요.',
  csvErrMissingColumns: '필수 열이 없어요: {columns}',
  csvErrTooManyRows: '{count}행이라 올릴 수 없어요. 한 번에 최대 {max}행까지 가능합니다 — 파일을 나눠 올려주세요.',
  errInvalidEmail: '유효하지 않은 이메일',
  errAlreadyMember: '이미 멤버입니다',
  errPendingInvite: '초대 대기 중',
  errDuplicate: '이 발송에 중복된 이메일이에요',
  errName: '이름을 입력해주세요',
  errNameEmail: '이름에 이메일 주소를 넣을 수 없어요. 실명을 입력해주세요',
  errPrimaryTeam: '주 소속을 지정해주세요',
  csvErrUnknownRole: "'{value}'는 알 수 없는 역할이에요",
  csvErrRoleManagerRetired: "'{value}'는 이제 권한 값이 아니에요. 조직장으로 지정되면 자동으로 매니저가 됩니다 — 멤버나 어드민으로 고쳐 주세요",
  csvErrUnknownOption: "{column} '{value}'는 회사에 등록된 값이 아니에요",
  csvErrOrgPathNotFound: "조직경로 '{path}'를 찾을 수 없습니다",
  csvErrLadderNeedsFamily: '직군을 함께 지정해주세요',
  csvErrJobPair: '직군에 없는 직렬입니다',
  csvErrDutyNeedsLadder: '직렬을 함께 지정해주세요',
  csvErrDutyPair: '직렬에 없는 직무입니다',
  csvErrDate: "{column}은 YYYY-MM-DD 로 적어 주세요 ('{value}')",
  csvErrEmailFormat: "{column} '{value}'는 이메일 형식이 아니에요",
  csvErrStatus: "고용상태 '{value}'는 알 수 없는 값이에요",
  csvErrFte: "FTE 는 0~100 사이 정수로 적어 주세요 ('{value}')",
  csvErrSalary: '연봉은 숫자로 적어 주세요',
  csvErrManagerUnknown: "상급자 '{value}'는 회사에도 이 파일에도 없는 사람이에요",
  csvErrManagerSelf: '자기 자신을 상급자로 둘 수 없어요',
  csvErrLeaderFormat: '조직장은 조직경로와 같은 개수의 Y/N 을 | 로 이어 적어 주세요',
  csvErrSquadUnknown: "스쿼드 '{value}'를 찾을 수 없어요",
  csvNoteManagerIgnored: '조직장이 상급자가 됩니다 — 적은 상급자는 쓰지 않습니다',
};

const normalize = (v) => String(v ?? '').trim();

/** 공백·대소문자 차이로 열·옵션을 못 찾는 일이 없게 한다. */
const fold = (v) => normalize(v).toLowerCase().replace(/\s+/g, '');

/** 헤더 비교용 — 필수 표시(`*`)와 밑줄도 뺀다(`이메일*` · `job_level` 도 알아본다). */
const foldHeader = (v) => fold(v).replace(/[*_]/g, '');

/**
 * 조직경로 비교용 정규화 — 구분자 주변 공백과 대소문자를 없앤다.
 *
 * 화면 표기는 `›`(U+203A)이고 파일 표기는 `>` 라 서로 다르다(`orgTree.js`
 * `ORG_PATH_SEP` 주석). 화면에서 본 경로를 그대로 붙여 넣는 실수가 잦아 **둘 다 받는다**.
 */
const foldPath = (v) =>
  String(v ?? '')
    .replace(/›/g, ORG_PATH_DEPTH_SEP)
    .split(ORG_PATH_DEPTH_SEP)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .join('>');

/** `{n}` 자리 치환 — `inviteRules.fmt` 와 같은 규칙. */
function fmtCsv(template, vars) {
  return String(template ?? '').replace(/\{(\w+)\}/g, (m, k) =>
    vars[k] === undefined || vars[k] === null ? m : String(vars[k]),
  );
}

const withDefaults = (labels) => ({ ...INVITE_CSV_DEFAULT_LABELS, ...(labels || {}) });

/** `|` 로 이은 여러 값 → 배열(빈 칸은 뺀다). */
const splitList = (v) => normalize(v).split(ORG_PATH_LIST_SEP).map(normalize).filter(Boolean);

/**
 * CSV 텍스트 → 2차원 배열.
 *
 * 따옴표 안의 콤마·줄바꿈·이스케이프된 따옴표(`""`)를 처리한다. 라이브러리를 들이지
 * 않는 이유는 이 파일이 다루는 문법이 RFC 4180 그대로이고, design-page 에 파서
 * 의존성을 추가하는 판단이 따로 필요하기 때문이다.
 */
export function parseCsv(text) {
  const src = String(text ?? '').replace(/^﻿/, '');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  let i = 0;

  const endField = () => { row.push(field); field = ''; };
  const endRow = () => { endField(); rows.push(row); row = []; };

  while (i < src.length) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i += 2; continue; }
        quoted = false; i += 1; continue;
      }
      field += c; i += 1; continue;
    }
    if (c === '"') { quoted = true; i += 1; continue; }
    if (c === ',') { endField(); i += 1; continue; }
    if (c === '\r') { i += 1; continue; }  // CRLF 의 CR 은 버린다
    if (c === '\n') { endRow(); i += 1; continue; }
    field += c; i += 1;
  }
  // 마지막 줄에 개행이 없어도 한 행이다. 빈 문자열 입력은 행 0개.
  if (field !== '' || row.length > 0) endRow();

  // 완전히 빈 행(엑셀이 파일 끝에 남기는 것)은 버린다.
  return rows.filter((r) => r.some((cell) => normalize(cell) !== ''));
}

/**
 * 템플릿 예시 줄 — 파일만 보고 무엇을 넣어야 하는지 알 수 있어야 한다(기획서 탭 4 ·
 * PW-721 발단이 「설명이 하나도 없다」였다). 🔒 연봉 칸은 비운다 — 예시 값이 실제 급여처럼
 * 읽히지 않게.
 */
const TEMPLATE_SAMPLE = {
  email: 'hong@example.com',
  nickname: '길동',
  employeeCode: 'EMP001',
  birthDate: '1990-01-15',
  gender: '남',
  maritalStatus: '기혼',
  nationality: 'KR',
  phone: '010-1234-5678',
  personalEmail: 'hong@gmail.com',
  addressDetail: '101동 1001호',
  addressDistrict: '역삼동',
  addressRegion: '서울특별시',
  addressCountry: 'KR',
  emergencyContactName: '홍부모',
  emergencyContactPhone: '010-9876-5432',
  emergencyContactRelation: '부모',
  jobFamily: '개발',
  jobLadder: '백엔드',
  jobDuty: '서버 개발',
  jobLevel: '선임',
  jobRank: '책임',
  jobPosition: '팀원',
  orgPath: '프로덕트본부 > 플랫폼팀',
  managerEmail: 'lead@example.com',
  leader: 'N',
  employmentType: '정규직',
  ftePercent: '100',
  hireDate: '2026-10-01',
  workCountry: 'KR',
  workLocation: '서울',
  certifications: '정보처리기사',
};

/** 템플릿 CSV 텍스트 — BOM + 헤더 + 예시 1행. 직종을 켠 회사면 직종 열이 든다. */
export function buildInviteTemplateCsv(labels = {}, opts = {}) {
  const l = withDefaults(labels);
  const columns = inviteCsvColumns(opts);
  const header = columns.map((c) => l[c.labelKey] || c.key);
  const sample = columns.map((c) => {
    if (c.masked) return '';
    if (c.key === 'name') return l.csvSampleName;
    if (c.key === 'role') return l.roleMember;
    if (c.key === 'employmentStatus') return l.csvStatusActive;
    return TEMPLATE_SAMPLE[c.key] ?? '';
  });
  const esc = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  return `${CSV_BOM + [header, sample].map((r) => r.map(esc).join(',')).join('\r\n')}\r\n`;
}

/**
 * 조직 트리 → 경로 조회 맵.
 *
 * 전체 경로(`개발본부 > 프론트엔드팀`)와 **말단 이름만**(`프론트엔드팀`) 둘 다 받는다.
 * 이름 단독은 그 이름이 조직 안에서 유일할 때만 허용한다 — 동명이팀이 있으면 어느
 * 쪽인지 알 수 없으므로 전체 경로를 요구해야 한다.
 */
export function buildOrgPathIndex(orgTree = []) {
  const byPath = new Map();
  const nameCount = new Map();
  for (const e of orgTree) {
    byPath.set(foldPath((e.pathNames || [e.name]).join(ORG_PATH_DEPTH_SEP)), e.id);
    const n = foldPath(e.name);
    nameCount.set(n, (nameCount.get(n) || 0) + 1);
  }
  const byName = new Map();
  for (const e of orgTree) {
    const n = foldPath(e.name);
    if (nameCount.get(n) === 1 && !byPath.has(n)) byName.set(n, e.id);
  }
  return { byPath, byName };
}

export const lookupOrgPath = (index, raw) => {
  const k = foldPath(raw);
  if (!k) return null;
  return index.byPath.get(k) ?? index.byName.get(k) ?? null;
};

/** 역할 라벨/코드 → 코드값. 빈 값은 `member`, 모르는 값은 `null`(호출부가 오류로 세운다). */
export function resolveRole(raw, labels = {}) {
  const l = withDefaults(labels);
  const v = normalize(raw);
  if (!v) return 'member';
  const folded = fold(v);
  for (const code of Object.keys(ROLE_LABEL_KEY)) {
    if (folded === code) return code;
    if (fold(l[ROLE_LABEL_KEY[code]]) === folded) return code;
  }
  return null;
}

/** 없어진 권한 값(`매니저`·`manager`)인지 — 맞으면 그 코드값, 아니면 `null`. */
export function retiredRole(raw, labels = {}) {
  const l = withDefaults(labels);
  const folded = fold(raw);
  if (!folded) return null;
  for (const code of Object.keys(RETIRED_ROLE_LABEL_KEY)) {
    if (folded === code) return code;
    if (fold(l[RETIRED_ROLE_LABEL_KEY[code]]) === folded) return code;
  }
  return null;
}

/** 고용상태 라벨/코드 → 코드값. 빈 값은 `''`, 모르는 값은 `null`. */
export function resolveEmploymentStatus(raw, labels = {}) {
  const l = withDefaults(labels);
  const v = fold(raw);
  if (!v) return '';
  for (const [code, key] of Object.entries(EMPLOYMENT_STATUS_LABEL_KEY)) {
    if (v === fold(code) || v === fold(l[key])) return code;
  }
  return null;
}

/** 옵션 목록에 있는 값인지 — 빈 값은 항상 통과(전부 선택 필드다). */
export const optionKnown = (value, list) =>
  !normalize(value) || (Array.isArray(list) && list.some((o) => fold(o) === fold(value)));

/** 등록된 표기로 바꾼다 — 대소문자·공백만 다르게 적힌 값을 회사의 표기로 보낸다. */
const canonicalOption = (value, list) =>
  (Array.isArray(list) && list.find((o) => fold(o) === fold(value))) || normalize(value);

/** `YYYY-MM-DD` 이고 실제로 있는 날짜인가 — 서버 `isIsoDate` 와 같은 규칙. */
export function isIsoDate(value) {
  const v = normalize(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** 조직장 칸 한 원소 → true/false. 알 수 없으면 null. */
const leaderFlag = (v) => {
  const f = fold(v);
  if (['y', 'yes', 'o', '예', 'true'].includes(f)) return true;
  if (['n', 'no', 'x', '아니오', 'false'].includes(f)) return false;
  return null;
};

let csvRowSeq = 0;

/** 빈 CSV 행 — 모든 칸이 빈 글자다. */
export function blankInviteCsvRow(values = {}) {
  csvRowSeq += 1;
  const base = {};
  for (const c of INVITE_CSV_COLUMNS) base[c.key] = '';
  return { key: `csv${csvRowSeq}`, values: { ...base, ...values }, failReason: null, failField: null };
}

/**
 * CSV 텍스트 → 스테이징 행.
 *
 * @returns {{ ok: boolean, error?: string, rows?: Array, ignoredColumns?: string[],
 *   jobCategoryIgnored?: boolean }}
 *
 * `ok:false` 면 **행을 하나도 만들지 않는다.** 특히 상한 초과는 앞 N행을 남기지 않는다 —
 * 조용한 절단은 정책 §5 V10 이 명시적으로 금지한다.
 *
 * 행은 파일 칸의 **글자 그대로**만 든다. 옵션 대조·조직경로 해석은 `inviteCsvIssues()` 가
 * 렌더 때 한다 — 표에서 고치면 사유가 바로 사라져야 하기 때문이다.
 */
export function parseInviteCsv(
  text, { labels = {}, jobCategoryEnabled = false, maxRows = INVITE_CSV_MAX_ROWS } = {},
) {
  const l = withDefaults(labels);
  const table = parseCsv(text);
  if (table.length === 0) return { ok: false, error: l.csvErrEmpty };

  const columns = inviteCsvColumns({ jobCategoryEnabled });
  const namesOf = (c) => [
    l[c.labelKey], INVITE_CSV_DEFAULT_LABELS[c.labelKey], c.key, ...(c.aliases || []),
  ].map(foldHeader).filter(Boolean);
  const categoryColumn = INVITE_CSV_COLUMNS.find((c) => c.key === 'jobCategory');

  const byKey = new Map();
  const ignoredColumns = [];
  let jobCategoryIgnored = false;
  table[0].map(normalize).forEach((cell, idx) => {
    const folded = foldHeader(cell);
    if (!folded) return;
    const col = columns.find((c) => namesOf(c).includes(folded));
    if (col && !byKey.has(col.key)) { byKey.set(col.key, idx); return; }
    // 직종을 끈 조직의 직종 열 — 「모르는 열」이 아니라 «이 회사가 안 쓰는 항목»이라고
    // 따로 알린다(V12). 모르는 열로 뭉뚱그리면 어드민은 오타를 찾는다.
    if (!jobCategoryEnabled && namesOf(categoryColumn).includes(folded)) {
      jobCategoryIgnored = true;
      return;
    }
    // 모르는 열은 무시하되 **무시했다는 사실을 남긴다.** 조용히 버리면 올린 사람은 그 값이
    // 반영된 줄 알고 가입 후에 다시 확인하지 않는다. 담을 곳이 없는 25칸(PW-920)도 여기로 온다.
    ignoredColumns.push(cell);
  });

  const missing = columns.filter((c) => c.required && !byKey.has(c.key)).map((c) => l[c.labelKey]);
  if (missing.length > 0) {
    return { ok: false, error: fmtCsv(l.csvErrMissingColumns, { columns: missing.join(', ') }) };
  }

  const body = table.slice(1);
  if (body.length === 0) return { ok: false, error: l.csvErrNoRows };
  if (body.length > maxRows) {
    return { ok: false, error: fmtCsv(l.csvErrTooManyRows, { count: body.length, max: maxRows }) };
  }

  const rows = body.map((cells) => {
    const values = {};
    for (const [key, idx] of byKey) values[key] = normalize(cells[idx]);
    return blankInviteCsvRow(values);
  });

  return { ok: true, rows, ignoredColumns, jobCategoryIgnored, leaderColumnIgnored: false };
}

/**
 * 표 전체를 한 번 훑어 두는 것 — 행마다 다시 세지 않는다.
 *
 * @param {Array} rows 지금 표의 행
 * @param {object} opts
 * @param {Array}  [opts.orgTree]          `buildOrgTree(orgUnits)`
 * @param {Record<string,string[]>} [opts.fieldOptions] 옵션 키 → 등록된 값
 * @param {Record<string,string[]>} [opts.laddersByFamily] 직군 → 직렬(INV-3)
 * @param {Record<string,string[]>} [opts.dutiesByLadder] 직렬 → 직무(INV-8)
 * @param {boolean} [opts.jobCategoryEnabled]
 * @param {string[]} [opts.squadNames]     이 회사 스쿼드 이름. 받지 못했으면 `null` — 스쿼드를 보지 않는다
 * @param {string[]} [opts.memberEmails]   이 회사 구성원 이메일(이미 멤버·상급자 확인)
 * @param {string[]} [opts.pendingEmails]  대기 중 초대 이메일
 * @param {string[]} [opts.headTeamIds]    조직장이 있는 조직 id(상급자 안내)
 * @param {object} [opts.labels]
 */
export function buildInviteCsvContext(rows, {
  orgTree = [], fieldOptions = {}, laddersByFamily = {}, dutiesByLadder = {},
  jobCategoryEnabled = false, squadNames = null, memberEmails = [], pendingEmails = [],
  headTeamIds = [], labels = {},
} = {}) {
  const l = withDefaults(labels);
  const index = buildOrgPathIndex(orgTree);
  const fileEmailCount = new Map();
  for (const r of rows) {
    const e = normEmail(r.values.email);
    if (e) fileEmailCount.set(e, (fileEmailCount.get(e) || 0) + 1);
  }
  const ctx = {
    labels: l,
    index,
    fieldOptions,
    laddersByFamily,
    dutiesByLadder,
    jobCategoryEnabled,
    squadNames: squadNames ? new Set(squadNames.map(fold)) : null,
    memberEmails: new Set(memberEmails.map(normEmail)),
    pendingEmails: new Set(pendingEmails.map(normEmail)),
    fileEmailCount,
    headTeamIds: new Set(headTeamIds),
    reservedLeaderTeamIds: new Set(),
  };
  // 파일 안에서 조직장을 예약한 조직도 「조직장이 있는 조직」으로 본다 — 그 사람이 가입하면
  // 장이 된다(상급자 안내가 가입 뒤의 모습과 맞아야 한다).
  for (const r of rows) {
    for (const id of resolveInviteCsvRow(r, ctx).leaderTeamIds) ctx.reservedLeaderTeamIds.add(id);
  }
  return ctx;
}

/**
 * 행 하나의 해석 — 조직경로·주소속·조직장·역할·고용상태.
 * 렌더마다 부른다(행은 글자 그대로만 들고 있다).
 */
export function resolveInviteCsvRow(row, ctx) {
  const v = row.values;
  const parts = splitList(v.orgPath);
  const slots = parts.map((raw) => ({ raw, id: lookupOrgPath(ctx.index, raw) }));
  const teamIds = [...new Set(slots.filter((s) => s.id).map((s) => s.id))];
  const unresolvedPaths = slots.filter((s) => !s.id).map((s) => s.raw);

  let primaryTeamId = '';
  if (teamIds.length === 1 && unresolvedPaths.length === 0) {
    primaryTeamId = teamIds[0];
  } else if (teamIds.length > 1) {
    const wanted = lookupOrgPath(ctx.index, v.primaryPath);
    if (wanted && teamIds.includes(wanted)) primaryTeamId = wanted;
  }

  const flags = splitList(v.leader).map(leaderFlag);
  const leaderOk = flags.length === 0
    || (flags.length === slots.length && flags.every((f) => f !== null));
  const leaderTeamIds = leaderOk
    ? [...new Set(slots.filter((s, i) => s.id && flags[i]).map((s) => s.id))]
    : [];

  return {
    teamIds,
    unresolvedPaths,
    primaryTeamId,
    leaderOk,
    leaderTeamIds,
    role: resolveRole(v.role, ctx.labels),
    employmentStatus: resolveEmploymentStatus(v.employmentStatus, ctx.labels),
  };
}

/**
 * 행 하나의 문제 — `[{ key, message }]`. `key` 는 고칠 칸(표가 그 칸을 빨갛게 칠한다).
 *
 * 두 초대 화면이 같은 판정을 쓴다 — 이메일·이름·중복·이미 멤버·대기 중(직접 입력 탭과 같은
 * V1~V6)부터 등록 옵션·짝·날짜·조직경로·상급자까지. 서버도 같은 판정으로 행을 돌려보낸다.
 */
export function inviteCsvIssues(row, ctx) {
  const l = ctx.labels;
  const v = row.values;
  const r = resolveInviteCsvRow(row, ctx);
  const issues = [];
  const add = (key, message) => issues.push({ key, message });
  const labelOf = (key) => l[INVITE_CSV_COLUMNS.find((c) => c.key === key)?.labelKey] || key;

  const email = normEmail(v.email);
  if (!emailOk(v.email)) add('email', l.errInvalidEmail);
  else if (ctx.memberEmails.has(email)) add('email', l.errAlreadyMember);
  else if (ctx.pendingEmails.has(email)) add('email', l.errPendingInvite);
  else if ((ctx.fileEmailCount.get(email) || 0) > 1) add('email', l.errDuplicate);

  // 길이 검사와 이메일 검사는 배타다 — 한 칸에 두 줄이 서면 무엇부터 고쳐야 할지 흐려진다.
  if (normalize(v.name).length < 2) add('name', l.errName);
  else if (nameHasEmail(v.name)) add('name', l.errNameEmail);

  if (!r.role) {
    add('role', retiredRole(v.role, l)
      ? fmtCsv(l.csvErrRoleManagerRetired, { value: v.role })
      : fmtCsv(l.csvErrUnknownRole, { value: v.role }));
  }

  for (const col of inviteCsvColumns({ jobCategoryEnabled: ctx.jobCategoryEnabled })) {
    if (col.option && !optionKnown(v[col.key], ctx.fieldOptions[col.option])) {
      add(col.key, fmtCsv(l.csvErrUnknownOption, { column: labelOf(col.key), value: v[col.key] }));
    }
    if (col.kind === 'date' && normalize(v[col.key]) && !isIsoDate(v[col.key])) {
      // 틀려도 적은 값을 지우지 않는다(기획서 탭 4) — 칸에는 원문이 그대로 남는다.
      add(col.key, fmtCsv(l.csvErrDate, { column: labelOf(col.key), value: v[col.key] }));
    }
  }

  /* (직군, 직렬) 쌍 — INV-3. (직렬, 직무) 쌍 — INV-8. 값 하나만 조용히 버리지 않는다 —
     올린 사람이 지정한 값이 말없이 사라지는 것이 행 하나를 고치게 하는 것보다 나쁘다. */
  const ladderPair = jobPairIssue(ctx.laddersByFamily, v.jobFamily, v.jobLadder);
  if (ladderPair === 'family') add('jobFamily', l.csvErrLadderNeedsFamily);
  else if (ladderPair === 'pair') add('jobLadder', l.csvErrJobPair);
  const dutyPair = jobPairIssue(ctx.dutiesByLadder, v.jobLadder, v.jobDuty);
  if (dutyPair === 'family') add('jobLadder', l.csvErrDutyNeedsLadder);
  else if (dutyPair === 'pair') add('jobDuty', l.csvErrDutyPair);

  for (const p of r.unresolvedPaths) add('orgPath', fmtCsv(l.csvErrOrgPathNotFound, { path: p }));
  if (r.teamIds.length >= 2 && !r.primaryTeamId) add('primaryPath', l.errPrimaryTeam);
  if (!r.leaderOk) add('leader', l.csvErrLeaderFormat);

  if (normalize(v.personalEmail) && !emailOk(v.personalEmail)) {
    add('personalEmail', fmtCsv(l.csvErrEmailFormat, { column: labelOf('personalEmail'), value: v.personalEmail }));
  }
  const manager = normEmail(v.managerEmail);
  if (manager) {
    if (!emailOk(manager)) {
      add('managerEmail', fmtCsv(l.csvErrEmailFormat, { column: labelOf('managerEmail'), value: v.managerEmail }));
    } else if (manager === email) {
      add('managerEmail', l.csvErrManagerSelf);
    } else if (
      !ctx.memberEmails.has(manager)
      && !ctx.fileEmailCount.has(manager)
      // 먼저 초대해 둔(아직 가입 전인) 사람도 된다 — 그 사람이 가입하는 순간 서버가 잇는다.
      && !ctx.pendingEmails.has(manager)
    ) {
      add('managerEmail', fmtCsv(l.csvErrManagerUnknown, { value: v.managerEmail }));
    }
  }

  if (r.employmentStatus === null) add('employmentStatus', fmtCsv(l.csvErrStatus, { value: v.employmentStatus }));
  const fte = normalize(v.ftePercent);
  if (fte && !(/^\d+$/.test(fte) && Number(fte) <= 100)) add('ftePercent', fmtCsv(l.csvErrFte, { value: fte }));
  if (normalize(v.salary) && !/\d/.test(v.salary)) add('salary', l.csvErrSalary);

  if (ctx.squadNames) {
    for (const s of splitList(v.squad)) {
      if (!ctx.squadNames.has(fold(s))) add('squad', fmtCsv(l.csvErrSquadUnknown, { value: s }));
    }
  }
  return issues;
}

/**
 * 행 하나의 안내 — 오류는 아니지만 보낸 사람이 알아야 하는 것.
 *
 * 상급자는 주 소속 조직에 조직장이 없을 때만 쓰인다(2026-09-22 커트 결정). 조직장이 있으면
 * 적은 상급자가 쓰이지 않는다는 것을 그 줄에서 말한다 — 말하지 않으면 올린 사람은 파일대로
 * 들어간 줄 안다.
 */
export function inviteCsvNotes(row, ctx) {
  const notes = [];
  if (!normEmail(row.values.managerEmail)) return notes;
  const { primaryTeamId } = resolveInviteCsvRow(row, ctx);
  if (primaryTeamId && (ctx.headTeamIds.has(primaryTeamId) || ctx.reservedLeaderTeamIds.has(primaryTeamId))) {
    notes.push({ key: 'managerEmail', message: ctx.labels.csvNoteManagerIgnored });
  }
  return notes;
}

/**
 * 옛 모양 — 사유 문구만. 어드민 창·온보딩 모두 `inviteCsvIssues` 로 옮겼다.
 */
export function csvRowIssues(row, ctx) {
  return inviteCsvIssues(row, ctx).map((i) => i.message);
}

/**
 * 행 하나 → 발송 요청 본문의 한 항목. 빈 칸은 싣지 않는다(서버가 기존 값을 지우지 않게).
 *
 * 두 초대 화면이 같은 본문을 보낸다 — 어드민은 일괄 발송, 온보딩은 한 사람씩 보내지만 항목
 * 모양은 같다(`CreateInviteDto`).
 */
export function inviteCsvPayload(row, ctx) {
  const v = row.values;
  const r = resolveInviteCsvRow(row, ctx);
  const out = { email: normalize(v.email), name: normalize(v.name), role: r.role || 'member' };
  const put = (key, value) => { if (value !== undefined && value !== null && value !== '') out[key] = value; };

  for (const col of inviteCsvColumns({ jobCategoryEnabled: ctx.jobCategoryEnabled })) {
    const raw = normalize(v[col.key]);
    if (!raw) continue;
    if (col.option) { put(col.key, canonicalOption(raw, ctx.fieldOptions[col.option])); continue; }
    switch (col.key) {
      case 'email': case 'name': case 'role': case 'orgPath': case 'primaryPath': case 'leader':
        break;
      case 'squad': put('squadNames', splitList(raw)); break;
      case 'certifications': put('certifications', splitList(raw)); break;
      case 'managerEmail': put('managerEmail', normEmail(raw)); break;
      case 'employmentStatus': put('employmentStatus', r.employmentStatus); break;
      default: put(col.key, raw);
    }
  }
  if (r.teamIds.length) out.teamIds = r.teamIds;
  put('teamId', r.primaryTeamId);
  if (r.leaderTeamIds.length) out.leaderTeamIds = r.leaderTeamIds;
  return out;
}
