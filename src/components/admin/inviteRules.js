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
