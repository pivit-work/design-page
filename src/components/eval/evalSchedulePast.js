/**
 * 단계 일정의 「지난 날짜」 판정 [PW-614 · 정책 §5.2.1-A].
 *
 * ## 왜 별도 모듈인가
 *
 * 같은 `review_sequence.schedule` 을 고치는 화면이 **둘**이다 — 새 사이클 마법사 3단계
 * 「단계별 일정」과, 진행 중 사이클에서 여는 「단계별 일정 수정」 창. 정책 §5.2.1-B 는
 * 「같은 값을 두 화면이 다르게 보이면 그 자체가 버그」로 규정하는데, 실제로 그랬다 —
 * 마법사에만 경고가 붙고 일정 수정 창에는 없었다(PW-614). 판정을 두 벌 적으면 다음에도
 * 한쪽만 고쳐진다. `evalScheduleStamp.js` 를 따로 뺀 것과 같은 이유다.
 *
 * ## 판정 규칙
 *
 * 🔴 **날짜 기준이다. 시각을 보지 않는다.** 시각까지 비교하면 오늘 09:00 에 시작하는
 * 단계가 오전 내내 「지난 날짜」로 뜬다(§5.2.1-A 「과거 날짜」 행).
 *
 * 🔴 **로컬 시간대로 만든다.** `toISOString()`(UTC)으로 오늘을 구하면 KST(+9)에서
 * 하루가 밀린다 — 일정은 사람이 보는 날짜다(§5.2.1-A 「날짜 계산」 행).
 *
 * 🔴 **막지 않는다.** 소급 사이클(이미 지난 기간을 평가하는 사이클)이 정상이므로
 * 경고만 하고 저장·진행을 그대로 열어 둔다. 대상 기간을 벗어난 것 자체는 **경고조차
 * 하지 않는다** — 운영 일정이 대상 기간 뒤에 놓이는 것이 기본값이다.
 */

/** `Date` → 로컬 기준 `YYYY-MM-DD`. */
export function localIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 단계 시작값이 오늘보다 앞선 날짜인가. 값이 없거나 모양이 깨졌으면 `false`
 * (모르는 것을 경고로 만들지 않는다).
 */
export function isPastScheduleStart(start, now = new Date()) {
  const day = String(start ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  return day < localIsoDate(now);
}

/**
 * 평가지를 갖는 단계 — 이 단계들만 시작일이 도래하면 평가지가 잠긴다(PW-535 잠금의 L1).
 *
 * 🔴 캘리브레이션·요약 검수·결과 발송에는 **잠길 평가지가 없다.** 거기에 잠금 안내를
 * 붙이면 사실이 아닌 말을 화면이 하게 된다.
 *
 * ⚠️ 같은 목록이 서버에도 있다(`eval-phase-template-lock.ts` 의 `TEMPLATE_PHASES`).
 * 저장소가 달라 한 곳에 둘 수 없다 — 한쪽을 늘리면 다른 쪽도 함께 늘린다.
 * `manager` 는 하향의 시안 어휘로, 일부 사이클의 `order` 에 그 id 로 들어와 있다.
 */
export const TEMPLATE_PHASES = ['self', 'peer', 'upward', 'leader', 'manager'];

export function phaseHasTemplate(phaseId) {
  return TEMPLATE_PHASES.includes(phaseId);
}

export default isPastScheduleStart;
