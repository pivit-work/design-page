import { resolveUiLocale } from '../shared/uiLocale.js';

/**
 * 구성원 표 «추가된 날» 필터의 값 — `시작~끝` (ISO 시각 두 개) · **시작 이상 · 끝 미만**.
 *
 * 왜 이 필터가 생겼나 (2026-09-23 커트 결정): 「새 멤버 합류」 알림을 한 건으로 묶으면서,
 * 어드민이 그 알림의 「구성원 보기」를 누르면 **그 알림에 묶인 사람들**만 걸린 채 구성원
 * 설정이 열려야 했다. 「최근 7일」로 걸면 일주일 뒤에 눌렀을 때 엉뚱한 사람들이 걸린다.
 * 그래서 값은 날짜가 아니라 **정확한 시각 범위**다 — 같은 날 명부를 두 번 올려도 알림마다
 * 따로 걸린다. 사람이 직접 고를 때는 날짜 두 칸으로 고르고, 하루 단위 범위가 된다.
 *
 * 🔴 끝을 «포함»으로 두지 않는다. 명부 한 번에 들어온 사람들은 추가 시각이 전부 같고,
 * 서버는 그 시각을 백만분의 1초까지 들고 있는데 ISO 문자열은 천분의 1초에서 잘린다.
 * 서버가 만드는 알림 링크는 끝을 «마지막 사람 + 1ms» 로 준다(`newMembersLink`).
 */
export const ADDED_AT_SEP = '~';

/** `시작~끝` → `{ from, to }`(ms). 모양이 틀리면 null — 거르지 않는다. */
export function parseAddedAtRange(value) {
  if (typeof value !== 'string') return null;
  const [a, b, extra] = value.split(ADDED_AT_SEP);
  if (extra !== undefined || !a || !b) return null;
  const from = Date.parse(a);
  const to = Date.parse(b);
  if (Number.isNaN(from) || Number.isNaN(to) || to <= from) return null;
  return { from, to };
}

/** 이 사람의 추가 시각이 범위 안인가. 추가 시각을 모르는 사람은 걸리지 않는다. */
export function inAddedAtRange(addedAt, range) {
  if (!range) return true;
  const t = typeof addedAt === 'string' ? Date.parse(addedAt) : NaN;
  if (Number.isNaN(t)) return false;
  return t >= range.from && t < range.to;
}

const ymdOf = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const localMidnight = (ymd) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/**
 * 날짜 두 칸(`YYYY-MM-DD`)으로 고른 범위 → 필터 값. 시작일 0시 ~ 종료일 다음 날 0시(브라우저 시간대).
 * 한 칸만 채우면 그날 하루다. 둘 다 비면 null(필터 해제). 순서가 뒤바뀌면 바로잡는다.
 */
export function rangeFromDates(startYmd, endYmd) {
  const s = startYmd || endYmd;
  const e = endYmd || startYmd;
  if (!s || !e) return null;
  const [lo, hi] = s <= e ? [s, e] : [e, s];
  const from = localMidnight(lo);
  const to = localMidnight(hi);
  to.setDate(to.getDate() + 1);
  return `${from.toISOString()}${ADDED_AT_SEP}${to.toISOString()}`;
}

/** 필터 값 → 날짜 두 칸에 채울 값. 끝은 미만이라 1ms 앞의 날짜가 종료일이다. */
export function datesOfRange(value) {
  const r = parseAddedAtRange(value);
  if (!r) return { start: '', end: '' };
  return { start: ymdOf(new Date(r.from)), end: ymdOf(new Date(r.to - 1)) };
}

const isMidnight = (ms) => {
  const d = new Date(ms);
  return d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0 && d.getMilliseconds() === 0;
};

/**
 * 칩에 보일 글자. 하루 단위로 고른 범위는 날짜만(`9월 20일 – 9월 23일`), 알림에서 온 정확한
 * 범위는 시각까지(`9월 23일 18:20`, `9월 23일 18:20–18:25`). 모양이 틀리면 빈 글자.
 */
export function formatAddedAtRange(value, locale) {
  const r = parseAddedAtRange(value);
  if (!r) return '';
  const loc = resolveUiLocale(locale);
  const day = new Intl.DateTimeFormat(loc, { month: 'short', day: 'numeric' });
  const time = new Intl.DateTimeFormat(loc, { hour: '2-digit', minute: '2-digit', hour12: false });
  const last = r.to - 1;
  if (isMidnight(r.from) && isMidnight(r.to)) {
    const a = day.format(r.from);
    const b = day.format(last);
    return a === b ? a : `${a} – ${b}`;
  }
  const sameDay = ymdOf(new Date(r.from)) === ymdOf(new Date(last));
  const t1 = time.format(r.from);
  const t2 = time.format(last);
  if (sameDay) {
    return t1 === t2 ? `${day.format(r.from)} ${t1}` : `${day.format(r.from)} ${t1}–${t2}`;
  }
  return `${day.format(r.from)} ${t1} – ${day.format(last)} ${t2}`;
}
