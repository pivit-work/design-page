/**
 * 초대 CSV 업로드 탭의 순수 규칙 — `screen-admin-employees-invite.policy.md` §2-4 (PW-212).
 *
 * 컴포넌트에서 분리한 이유는 `inviteRules.js` 와 같다.
 *  1. 파싱·해석 규칙은 렌더 없이 단독으로 검증할 수 있어야 한다 — 500행짜리 파일의
 *     경계(500/501)를 브라우저를 띄워 확인할 수는 없다.
 *  2. 모달 파일이 컴포넌트만 export 해야 fast-refresh 가 온전히 동작한다.
 *
 * 여기서 만드는 행은 **직접 입력 탭과 같은 모양**이다. 검증(V1~V7)·발송 페이로드·
 * 부분 성공 처리를 두 모드가 공유해야, CSV 가 이름 칸 이메일 차단(PW-207) 같은
 * 규칙의 우회 경로가 되지 않는다.
 *
 * 🔴 파싱 단계에서 잡은 문제를 **행에 문자열로 굳혀 두지 않는다.** 어드민은 스테이징
 * 테이블에서 그 값을 고칠 수 있고, 굳혀 두면 고친 뒤에도 옛 사유가 그대로 남는다.
 * 파싱은 "해석되지 않은 원본"(`rawRole`·`unresolvedPaths`·옵션에 없는 값)만 남기고,
 * 사유 문구는 렌더 때마다 `csvRowIssues()` 가 다시 만든다.
 */

/**
 * CSV 1회 상한(§1). 서버 `BulkInviteDto` 의 `@ArrayMaxSize(500)` 과 같은 값이며,
 * 서버는 최종 방어로 그대로 남는다. 화면이 먼저 막는 이유는 500행을 보내고 400 을
 * 받은 뒤에야 상한을 알게 되는 흐름을 없애기 위해서다.
 */
export const INVITE_CSV_MAX_ROWS = 500;

/**
 * 템플릿 열 — **초대 모달이 실제로 지원하는 필드만** 담는다.
 *
 * `조직장` 이 없는 이유: 가입 전에는 `team_members` 행이 없어 "그 팀 소속자만
 * 조직장"(L3)을 만족할 수 없다. `직종`(job_category)·`직무`(job_duty)가 없는 이유:
 * 직접 입력 탭에도 그 필드가 없어, 두 탭의 필드 집합을 같게 유지한다
 * (직무는 초대에서 받지 않는다 — PW-412 확정).
 *
 * ⚠ `jobTitle` 은 이름과 달리 **직렬(`job_ladder`)** 이다(2026-08-10 M5-b 승격).
 *
 * `key` 는 행 모델의 필드명, `labelKey` 는 헤더 문구를 주는 라벨 키다. 헤더를 라벨로
 * 받는 이유는 en 로케일에서 한국어 헤더가 새지 않게 하기 위해서다.
 */
export const INVITE_TEMPLATE_COLUMNS = [
  { key: 'email', labelKey: 'csvColEmail', required: true },
  { key: 'name', labelKey: 'csvColName', required: true },
  { key: 'role', labelKey: 'csvColRole' },
  { key: 'jobLevel', labelKey: 'csvColJobLevel', option: 'jobLevel' },
  { key: 'jobFamily', labelKey: 'csvColJobFamily', option: 'jobFamily' },
  { key: 'jobTitle', labelKey: 'csvColJobTitle', option: 'jobTitle' },
  { key: 'workLocation', labelKey: 'csvColWorkLocation', option: 'workLocation' },
  { key: 'orgPath', labelKey: 'csvColOrgPath' },
  { key: 'primaryPath', labelKey: 'csvColPrimaryPath' },
];

/** 옵션 목록 대조가 필요한 열만 추린 것 — 화면도 같은 목록으로 셀 select 를 그린다. */
export const INVITE_OPTION_COLUMNS = INVITE_TEMPLATE_COLUMNS.filter((c) => c.option);

/** 조직경로 구분자 — 계층은 `>`, 겸직 배열은 `|` (`org-snapshot-spec.md §3-A`). */
export const ORG_PATH_DEPTH_SEP = '>';
export const ORG_PATH_LIST_SEP = '|';

/** Excel 이 BOM 없는 UTF-8 CSV 의 한글을 깨뜨려 읽는다. */
export const CSV_BOM = '\uFEFF';

/** 역할 코드값 ↔ 라벨 키. 화면에는 코드값을 그대로 노출하지 않는다. */
export const ROLE_LABEL_KEY = {
  member: 'roleMember',
  manager: 'roleManager',
  admin: 'roleAdmin',
};

import { jobPairIssue } from './inviteRules.js';

const normalize = (v) => String(v ?? '').trim();

/** 공백·대소문자 차이로 열·옵션을 못 찾는 일이 없게 한다. */
const fold = (v) => normalize(v).toLowerCase().replace(/\s+/g, '');

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

/** `{n}` 자리 치환 — `inviteRules.fmt` 와 같은 규칙(순환 import 를 피해 여기 둔다). */
function fmtCsv(template, vars) {
  return String(template ?? '').replace(/\{(\w+)\}/g, (m, k) =>
    vars[k] === undefined || vars[k] === null ? m : String(vars[k]),
  );
}

/**
 * CSV 텍스트 → 2차원 배열.
 *
 * 따옴표 안의 콤마·줄바꿈·이스케이프된 따옴표(`""`)를 처리한다. 라이브러리를 들이지
 * 않는 이유는 이 파일이 다루는 문법이 RFC 4180 그대로이고, design-page 에 파서
 * 의존성을 추가하는 판단이 따로 필요하기 때문이다.
 */
export function parseCsv(text) {
  const src = String(text ?? '').replace(/^\uFEFF/, '');
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

/** 템플릿 CSV 텍스트 — BOM + 헤더 + 예시 1행. */
export function buildInviteTemplateCsv(labels = {}) {
  const header = INVITE_TEMPLATE_COLUMNS.map((c) => labels[c.labelKey] || c.key);
  const sample = INVITE_TEMPLATE_COLUMNS.map((c) => {
    if (c.key === 'email') return 'hire1@example.com';
    if (c.key === 'name') return labels.csvSampleName || '홍길동';
    if (c.key === 'role') return labels.roleMember || '멤버';
    return '';
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

/** 역할 라벨/코드 → 코드값. 모르는 값은 `null` 이고 호출부가 행 오류로 세운다. */
export function resolveRole(raw, labels = {}) {
  const v = normalize(raw);
  if (!v) return 'member';
  const folded = fold(v);
  for (const code of Object.keys(ROLE_LABEL_KEY)) {
    if (folded === code) return code;
    if (fold(labels[ROLE_LABEL_KEY[code]]) === folded) return code;
  }
  return null;
}

/** 옵션 목록에 있는 값인지 — 빈 값은 항상 통과(전부 선택 필드다). */
export const optionKnown = (value, list) =>
  !normalize(value) || (Array.isArray(list) && list.some((o) => fold(o) === fold(value)));

let csvRowSeq = 0;

/**
 * CSV 텍스트 → 스테이징 행.
 *
 * @param {string} text
 * @param {{ orgTree: Array, labels: object }} ctx
 * @returns {{
 *   ok: boolean,
 *   error?: string,
 *   rows?: Array,
 *   ignoredColumns?: string[],
 *   leaderColumnIgnored?: boolean,
 * }}
 *
 * `ok:false` 면 **행을 하나도 만들지 않는다.** 특히 상한 초과는 앞 500행을 남기지
 * 않는다 — 조용한 절단은 정책 §5 V10 이 명시적으로 금지한다.
 *
 * 옵션 값(`직급`·`직군`·`직무`·`근무지`)은 **여기서 판정하지 않는다.** 원본을 그대로
 * 실어 두고 `csvRowIssues()` 가 렌더 때 옵션 목록과 대조한다 — 셀에서 고치면 사유가
 * 바로 사라져야 하기 때문이다.
 */
export function parseInviteCsv(text, { orgTree = [], labels = {} } = {}) {
  const table = parseCsv(text);
  if (table.length === 0) return { ok: false, error: labels.csvErrEmpty };

  const headerCells = table[0].map(normalize);
  const byKey = new Map();
  const ignoredColumns = [];
  let leaderColumnIgnored = false;
  const leaderHeader = fold(labels.csvColLeader);

  headerCells.forEach((cell, idx) => {
    const folded = fold(cell);
    if (!folded) return;
    const col = INVITE_TEMPLATE_COLUMNS.find(
      (c) => fold(labels[c.labelKey]) === folded || fold(c.key) === folded,
    );
    if (col && !byKey.has(col.key)) { byKey.set(col.key, idx); return; }
    // 모르는 열은 무시하되 **무시했다는 사실을 남긴다.** 조용히 버리면 어드민은
    // 그 값이 반영된 줄 알고 가입 후에 다시 확인하지 않는다.
    if (leaderHeader && folded === leaderHeader) leaderColumnIgnored = true;
    else ignoredColumns.push(cell);
  });

  const missing = INVITE_TEMPLATE_COLUMNS
    .filter((c) => c.required && !byKey.has(c.key))
    .map((c) => labels[c.labelKey] || c.key);
  if (missing.length > 0) {
    return { ok: false, error: fmtCsv(labels.csvErrMissingColumns, { columns: missing.join(', ') }) };
  }

  const body = table.slice(1);
  if (body.length === 0) return { ok: false, error: labels.csvErrNoRows };
  if (body.length > INVITE_CSV_MAX_ROWS) {
    return {
      ok: false,
      error: fmtCsv(labels.csvErrTooManyRows, { count: body.length, max: INVITE_CSV_MAX_ROWS }),
    };
  }

  const index = buildOrgPathIndex(orgTree);
  const cellAt = (cells, key) => {
    const idx = byKey.get(key);
    return idx === undefined ? '' : normalize(cells[idx]);
  };

  const rows = body.map((cells) => {
    csvRowSeq += 1;

    const rawRole = cellAt(cells, 'role');
    const role = resolveRole(rawRole, labels);

    /* 조직경로 해석 — 못 찾은 경로는 **버리지 않고 남긴다.** 버리면 화면에서 무엇이
       틀렸는지 사라져, 어드민은 소속이 비어 있는 이유를 알 수 없다. */
    const parts = cellAt(cells, 'orgPath')
      .split(ORG_PATH_LIST_SEP)
      .map(normalize)
      .filter(Boolean);
    const teamIds = [];
    const unresolvedPaths = [];
    for (const p of parts) {
      const id = lookupOrgPath(index, p);
      // 팀을 새로 만들자고 제안하지 않는다 — 초대 경로에서 조직을 만들면 오타가
      // 유령 조직이 된다(발령 CSV 와 다른 판단, `org-snapshot-spec.md §3-A-3`).
      if (!id) unresolvedPaths.push(p);
      else if (!teamIds.includes(id)) teamIds.push(id);
    }

    let primaryTeamId = '';
    if (teamIds.length === 1 && unresolvedPaths.length === 0) {
      primaryTeamId = teamIds[0];
    } else if (teamIds.length > 1) {
      const wanted = lookupOrgPath(index, cellAt(cells, 'primaryPath'));
      // 일치하지 않으면 비워 둔다 — 모달의 기존 V4(`주 소속을 지정해주세요`)가
      // 같은 자리에서 같은 문구로 잡고, 셀의 주 소속 select 로 고친다.
      if (wanted && teamIds.includes(wanted)) primaryTeamId = wanted;
    }

    return {
      key: `csv${csvRowSeq}`,
      email: cellAt(cells, 'email'),
      name: cellAt(cells, 'name'),
      // 모르는 역할은 빈 값으로 둔다 — 임의로 `멤버` 로 채우면 잘못된 권한이
      // 조용히 나간다. 화면이 select 를 비운 채 사유를 세운다.
      role: role ?? '',
      rawRole,
      jobLevel: cellAt(cells, 'jobLevel'),
      jobFamily: cellAt(cells, 'jobFamily'),
      jobTitle: cellAt(cells, 'jobTitle'),
      workLocation: cellAt(cells, 'workLocation'),
      teamIds,
      primaryTeamId,
      unresolvedPaths,
      open: false,
      failReason: null,
    };
  });

  return { ok: true, rows, ignoredColumns, leaderColumnIgnored };
}

/**
 * CSV 행의 **파일 유래** 문제 — 이메일·이름·중복 같은 공통 검증(V1~V6)은 모달이
 * 직접 입력 탭과 공유하는 코드로 따로 본다. 여기서는 CSV 에서 문제가 되는 것만 본다:
 * 해석 못 한 역할·옵션에 없는 값·못 찾은 조직경로, 그리고 `(직군, 직렬)` 쌍(V7).
 *
 * 렌더마다 다시 계산한다 — 셀에서 값을 고치면 그 즉시 사유가 사라져야 한다.
 */
export function csvRowIssues(row, { fieldOptions = {}, labels = {}, laddersByFamily = {} } = {}) {
  const issues = [];
  if (!row.role) {
    issues.push(fmtCsv(labels.csvErrUnknownRole, { value: row.rawRole || '' }));
  }
  for (const col of INVITE_OPTION_COLUMNS) {
    if (!optionKnown(row[col.key], fieldOptions[col.option])) {
      issues.push(fmtCsv(labels.csvErrUnknownOption, {
        column: labels[col.labelKey] || col.key,
        value: row[col.key],
      }));
    }
  }
  /* (직군, 직렬) 쌍 — INV-3 (PW-412 · E18·V7).
     직렬 값만 조용히 버리지 않는다. 어드민이 지정한 값이 말없이 사라지는 것이
     행 하나를 고치게 하는 것보다 나쁘고, 서버는 어차피 422 로 되돌린다. */
  const pair = jobPairIssue(laddersByFamily, row.jobFamily, row.jobTitle);
  if (pair === 'family') issues.push(labels.csvErrLadderNeedsFamily);
  else if (pair === 'pair') issues.push(labels.csvErrJobPair);
  for (const p of row.unresolvedPaths || []) {
    issues.push(fmtCsv(labels.csvErrOrgPathNotFound, { path: p }));
  }
  return issues;
}
