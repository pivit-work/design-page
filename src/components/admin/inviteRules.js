/**
 * 초대 발송 모달의 순수 규칙 — `screen-admin-employees-invite.policy.md`.
 *
 * 컴포넌트에서 분리한 이유는 두 가지다.
 *  1. 겸직 주 소속 규칙(§4-3)은 렌더 없이 단독으로 검증할 수 있어야 한다.
 *  2. 모달 파일이 컴포넌트만 export 해야 fast-refresh 가 온전히 동작한다.
 */

/** 직접 입력 탭 1회 상한(§1). CSV 상한(500)은 서버 DTO 가 따로 막는다. */
export const INVITE_MAX_ROWS = 50;

/**
 * 서버 실패 코드 → 라벨 키(§8).
 *
 * 코드값(`ALREADY_MEMBER`)을 화면에 그대로 렌더하면 안 된다 — 대문자 스네이크가
 * 그대로 보이면 라벨 해석이 끊긴 것이고, 버그로 취급한다.
 */
export const FAIL_LABEL_KEY = {
  ALREADY_MEMBER: 'failAlreadyMember',
  PENDING_INVITE_EXISTS: 'failPendingExists',
  SEAT_LIMIT_EXCEEDED: 'failSeatLimit',
  PRIMARY_TEAM_REQUIRED: 'failPrimaryTeam',
  TEAM_NOT_FOUND: 'failTeamNotFound',
  NAME_REQUIRED: 'failNameRequired',
  INVALID_EMAIL: 'failInvalidEmail',
  DUPLICATE_IN_REQUEST: 'failDuplicate',
  SEND_FAILED: 'failSendFailed',
  INVALID_JOB_PAIR: 'failInvalidJobPair',
};

/** V1 이메일 형식. 서버(IsCleanEmail)가 최종 판정이라 여기서는 모양만 본다. */
export const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());

/**
 * V7 이름 칸에 이메일 주소가 들어왔는지 (PW-207 / PW-185 후속).
 *
 * 판정의 정본은 서버 `common/validators/person-name.decorator.ts` 의
 * `NAME_FORBIDS_AT_PATTERN` 이다 — `@` 포함 여부만 본다. 도메인 형태까지 따지지
 * 않는 이유도 거기 주석과 같다: `manager1@pivit` 같은 절반짜리 주입도 이름이 아니다.
 *
 * 화면에 두는 이유는 서버를 못 믿어서가 아니라 **일괄 발송이기 때문**이다. 초대는
 * 여러 행을 한 요청으로 보내는데 `BulkInviteDto` 가 `@ValidateNested({ each: true })`
 * 라 한 행이 걸리면 요청 전체가 400 이다. 50명을 넣고 발송을 눌렀을 때 한 명 때문에
 * 전부 실패하고, 행별 실패 사유(`FAIL_LABEL_KEY`)에는 이 경우에 해당하는 코드가 없어
 * 어느 행이 문제인지 짚어 줄 수도 없다. 보내기 전에 그 행에 인라인으로 세운다.
 *
 * 원래 사고가 **브라우저 자동완성이 이름 칸에 계정 값을 채워 넣는 것**이라, 이름 칸이
 * 있는 화면은 전부 같은 자리다.
 */
export const nameHasEmail = (v) => String(v ?? '').includes('@');

export const normEmail = (v) => String(v || '').trim().toLowerCase();

/**
 * 소속 배열이 바뀔 때 주 소속을 정리한다(§4-3).
 *
 *  · 2번째 소속을 고르면 **첫 선택 조직**이 주 소속 기본값
 *  · 주 소속으로 지정된 조직을 제거하면 **남은 첫 조직으로 자동 이동**
 *  · 1개 이하로 줄면 그 하나가 자동으로 주 소속(선택 UI 자체가 사라진다)
 *
 * 서버(`resolveInviteProfile`)가 같은 규칙을 다시 적용한다 — 판정이 갈리면
 * 화면에 보이는 주 소속과 실제로 저장되는 주 소속이 달라진다.
 */
export function reconcilePrimary(teamIds, primaryTeamId) {
  if (teamIds.length === 0) return '';
  if (teamIds.length === 1) return teamIds[0];
  if (primaryTeamId && teamIds.includes(primaryTeamId)) return primaryTeamId;
  return teamIds[0];
}

/** `{n}` 자리 치환 — 문구는 소비자(i18n)가 주므로 여기서 조립만 한다. */
export function fmt(template, vars) {
  return String(template ?? '').replace(/\{(\w+)\}/g, (m, k) =>
    vars[k] === undefined || vars[k] === null ? m : String(vars[k]),
  );
}

/* ── (직군, 직렬) 쌍 — INV-3 (PW-412) ────────────────────────────────────────
 *
 * 직렬은 직군에 매달린 값이다. 초대가 직렬을 받기로 확정되면서(2026-08-22 David
 * 결정) 이 쌍 검증이 초대 경로에도 존재하게 됐다 — 직군 없이 직렬만 저장하면
 * `(job_family, job_ladder)` 불변식이 깨진다.
 *
 * 화면이 2단 연동으로 먼저 막지만, **서버가 최종 판정**이다(422 INVALID_JOB_PAIR).
 * CSV 업로드나 「직군을 바꾼 뒤 남은 직렬」처럼 연동 UI 를 우회하는 경로가 있다.
 */

/** 값 비교 정규화 — 공백·대소문자 차이로 쌍이 어긋나 보이지 않게 한다. */
const foldValue = (v) => String(v ?? '').trim().toLowerCase();

/**
 * 그 직군에 매달린 직렬 목록. 직군이 비면 **빈 목록**이다 — 전체 목록으로
 * 폴백하면 직군 없는 직렬(INV-3 위반 값)을 고를 수 있게 된다.
 *
 * 매핑을 못 받았을 때(`laddersByFamily` 가 통째로 비었을 때)는 좁히지 않고
 * `allLadders` 를 그대로 쓴다 — 매핑은 보조 정보라 조회 실패로 선택지를 0으로
 * 만들면 값을 아예 넣지 못하는데 화면은 그 이유를 말해주지 못한다.
 */
export function laddersForFamily(laddersByFamily, family, allLadders = []) {
  const map = laddersByFamily || {};
  if (Object.keys(map).length === 0) return allLadders;
  const f = String(family ?? '').trim();
  if (!f) return [];
  const hit = Object.keys(map).find((k) => foldValue(k) === foldValue(f));
  return hit ? map[hit] || [] : [];
}

/** 직렬 Select 를 잠글지 — 직군을 고르기 전에는 고를 수 없다. */
export function ladderLocked(laddersByFamily, family) {
  const map = laddersByFamily || {};
  if (Object.keys(map).length === 0) return false; // 매핑 미수신 시 잠그지 않는다
  return !String(family ?? '').trim();
}

/**
 * 쌍 위반 사유 — `null` 이면 통과.
 *  · `'family'` — 직렬은 있는데 직군이 없다
 *  · `'pair'`   — 쌍이 매핑에 없다
 * 직렬이 비어 있으면 언제나 통과다(직렬은 선택 입력).
 */
export function jobPairIssue(laddersByFamily, family, ladder) {
  const l = String(ladder ?? '').trim();
  if (!l) return null;
  if (!String(family ?? '').trim()) return 'family';
  const map = laddersByFamily || {};
  if (Object.keys(map).length === 0) return null; // 매핑 미수신 — 서버가 판정한다
  const list = laddersForFamily(map, family, []);
  return list.some((o) => foldValue(o) === foldValue(l)) ? null : 'pair';
}
