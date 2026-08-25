/**
 * 단계 일정 확정 표기 [PW-435 ①] — `2026-07-01T18:00` → `2026-07-01(수) 18:00`.
 *
 * 🔴 `<input type="datetime-local">` 의 시각 표기는 **브라우저·OS 로케일이 정한다 —
 * 우리가 정할 수 없다.** `ko-KR` 에서는 12시간제(`오전/오후`)로 그려지고, 칸 폭이
 * 좁으면 시·분이 잘려 **「오전」만 남는다.** 제보가 본 것이 정확히 그 화면이다.
 * 그래서 입력 위젯을 바꾸는 것으로는 해결되지 않고, **값을 우리가 한 줄 더 적어야** 한다.
 *
 * 24시간제 고정 — 마감 시각에 `오후 6:00` 을 쓰면 6시인지 18시인지 되묻게 된다.
 * 요일을 함께 적는 이유는 마감이 금요일인지 월요일인지가 실제 제출률을 가르기 때문이다.
 * 값이 없거나 형식이 깨지면 `—` 를 적는다 — 줄이 사라지면 「표기가 없는 것」과 구분되지 않는다.
 *
 * 컴포넌트 파일이 아니라 별도 모듈에 둔다. 위자드 3단계와 사이클 목록의 일정 수정 창이
 * **같은 표기**를 써야 하고(같은 값이 두 화면에서 다르게 보이면 그 자체가 혼선이다),
 * 컴포넌트 파일에서 함수를 내보내면 Fast Refresh 가 깨진다.
 */
const WEEKDAY_KEYS = [
  'weekdaySun', 'weekdayMon', 'weekdayTue', 'weekdayWed',
  'weekdayThu', 'weekdayFri', 'weekdaySat',
];

export function stampScheduleDateTime(value, labels) {
  const v = String(value ?? '');
  if (v.length < 16) return '—';
  const [d, t] = v.slice(0, 16).split('T');
  if (!d || !t) return '—';
  const dt = new Date(`${d}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return '—';
  const wd = labels?.[WEEKDAY_KEYS[dt.getDay()]] ?? '';
  return `${d}(${wd}) ${t}`;
}

export default stampScheduleDateTime;
