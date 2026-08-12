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
