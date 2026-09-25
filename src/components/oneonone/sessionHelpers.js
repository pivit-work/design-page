/**
 * 1on1 회차 화면들이 함께 쓰는 순수 헬퍼 (컴포넌트 아님).
 *
 * 캔버스 파일에 두면 `react-refresh/only-export-components` 가 경고한다 — 컴포넌트
 * 파일이 컴포넌트 아닌 것을 export 하면 Fast Refresh 가 그 모듈 전체를 재실행해야
 * 해서 편집 중 상태가 날아간다. 그리고 이 셋은 멤버 캔버스와 매니저의 지난 1on1
 * 캔버스가 **똑같이** 쓰므로, 어느 한쪽 소유로 두는 것도 맞지 않는다.
 */

/** `{name}` 자리표시자 치환 — 호스트가 i18n 보간을 이미 했으면 그대로 지나간다. */
export const fill = (tpl, vars) =>
  String(tpl ?? '').replace(/\{(\w+)\}/g, (m, k) => (vars && k in vars ? vars[k] : m));

/**
 * 그 회차를 진행한 호스트(매니저) — **회차가 들고 있는 값이 먼저다** (PW-211).
 *
 * `manager` prop 은 화면 단위로 하나뿐이고 **현재** 매니저를 가리킨다. 그걸 과거
 * 회차에 그대로 쓰면 매니저가 바뀐 구성원은 히스토리가 통째로 현재 매니저 이름으로
 * 보인다 — 제목·아바타뿐 아니라 근거 발췌의 화자까지 남의 이름이 붙는다.
 * (dev 실측: 김우진이 한 말이 `박우진 매니저` 로 표시)
 *
 * 회차에 이름이 없는 응답(구버전)에서는 화면 단위 매니저로 폴백한다.
 */
export function hostOf(session, manager) {
  const fallback = manager || {};
  return {
    name: session?.managerName || fallback.name || '',
    avatar: session?.managerAvatar || fallback.avatar || '',
  };
}

/**
 * 그 회차를 **한 날**의 기준 시각 (PW-1088) — 시작 시각 → 예약 시각 → 만든 시각 순.
 *
 * 예전에는 끝난 화면·지난 1on1 목록·회의록 머리·팀원 결과 탭이 `createdAt` 을 날짜로
 * 보였다. `createdAt` 은 **예약을 잡은 순간**이라, 9/14 에 잡아 9/26 에 한 1on1 이
 * 「9월 14일」로 보였다. 예약 전날 잡은 아침 회차는 하루 전으로 보여 시간대 탓처럼 보였다.
 *
 * 시작 전 회차(예약만 됨)는 시작 시각이 없어 예약 시각으로, 그것도 없는 옛 회차만
 * `createdAt` 으로 내려간다. 시간대 변환은 호스트의 `formatDate` 가 한다 — 여기선 고르기만.
 */
export function heldAtOf(session) {
  return session?.startedAt || session?.scheduledAt || session?.createdAt || '';
}

/**
 * 그 회차의 헬스체크 — **회차가 들고 있는 값만 쓴다** (PW-213).
 *
 * 예전에는 화면 단위 `healthHistory` 를 회차 목록에 순서로 갖다 붙였다
 * (`healthHistory[healthHistory.length - 1 - i]`). 두 배열은 짝이 아니다 —
 * `healthHistory` 는 최근 30일 스니핏 최대 10개이고 회차 목록은 기간 제한 없는
 * DONE 1on1 전체라, 길이도 시간 축도 다르다. 두 달 전 회차 옆에 어제 점수가 붙었고,
 * 회차가 더 많으면 오래된 행부터 배지가 통째로 사라졌다.
 *
 * 값이 없으면 **숫자를 지어내지 않고 배지를 감춘다**(`null` 반환). 인덱스로 짝짓기는
 * 순서가 어긋나는 순간 조용히 틀리므로, 없는 값은 없는 채로 두는 편이 낫다.
 */
export function healthOf(session) {
  const v = session?.healthScore;
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/**
 * LIVE 경과 시간 — `MM:SS` (1시간 미만) / `H:MM:SS` (1시간 이상).
 *
 * 시안 `1on1-manager-view.jsx` 의 `fmtLiveElapsed` 를 그대로 옮긴 것. 1on1 은 보통
 * 1시간 이내라 기본은 `MM:SS` 이고, 길어질 때만 시가 붙는다 — 늘 `H:MM:SS` 로 두면
 * 55분짜리 회의 내내 앞자리 `0:` 이 붙어 읽는 비용만 는다.
 */
export function formatLiveElapsed(sec) {
  const total = Math.max(0, Math.floor(Number(sec) || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
