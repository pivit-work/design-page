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

/**
 * [PW-585 · 정책 §5.2.1 엣지 · §6.10.3] 이 리마인더는 «단계가 열리기도 전»에 잡혔는가.
 *
 * 3일짜리 단계에 D-7 을 넣으면 발송 시각이 단계 시작보다 앞이라 **영영 나가지 않는다.**
 * 저장은 막지 않는다(§5.2.1 「저장은 허용」) — 대신 그 자리에서 알린다. 알리지 않으면
 * 인사담당자는 예약해 둔 독촉이 왜 안 왔는지 알 길이 없다(서버는 사유를 남기지만, 그건
 * 이미 나가지 않은 뒤의 이야기다).
 *
 * 🔴 판정은 «사람이 적어 넣은 벽시계 값» 끼리 비교한다. 시간대 변환을 하지 않는 이유는
 * 두 값이 같은 시간대의 같은 화면에서 온 것이기 때문이고, 실제 발송 시각을 정하는 쪽은
 * 서버(`eval-reminder-schedule.util.ts`)다. 여기서 한 판정은 «경고»에만 쓴다.
 *
 * 같은 판정을 마법사 3단계와 일정 수정 창이 함께 쓴다 — `isPastScheduleStart` 를 여기
 * 둔 것과 같은 이유다(한쪽만 고쳐지는 것을 막는다).
 */
export function isReminderBeforePhaseStart(reminder, slot) {
  const start = String(slot?.start ?? '');
  if (start.length < 16) return false;
  const anchorRaw = reminder?.anchor === 'before_start' ? slot?.start : slot?.end;
  const date = String(anchorRaw ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const offset = Number.isFinite(Number(reminder?.offset))
    ? Math.trunc(Number(reminder.offset))
    : 0;
  // [PW-1054] 시각을 안 적은 리마인더는 기준과 무관하게 09:00 에 나간다 — 실제로 보내는
  // 서버(`eval-reminder-schedule.util.ts` 의 `reminderScheduledAt`)가 그렇게 친다. 종전에는
  // 마감 기준이면 18:00 으로 쳐서 「안 나갑니다」 건수가 실제와 달랐다.
  const time = /^\d{2}:\d{2}$/.test(reminder?.time ?? '')
    ? reminder.time
    : '09:00';
  const day = new Date(`${date}T00:00:00`);
  if (Number.isNaN(day.getTime())) return false;
  day.setDate(day.getDate() - offset);
  const y = day.getFullYear();
  const m = String(day.getMonth() + 1).padStart(2, '0');
  const d = String(day.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}T${time}` < start.slice(0, 16);
}

/** 그 단계에서 «영영 안 나갈» 리마인더의 수. 0 이면 경고하지 않는다. */
export function countRemindersBeforePhaseStart(reminders, slot) {
  if (!Array.isArray(reminders)) return 0;
  return reminders.filter((r) => isReminderBeforePhaseStart(r, slot)).length;
}
