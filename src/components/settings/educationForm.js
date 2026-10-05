// 학력 추가 폼의 기간 규칙 (PW-1302 · pivit-specs my-settings-spec §4-C-1).
// 값은 `YYYY-MM` 문자열, 화면 표시는 `YYYY.MM`. 서버(`education-period.ts`)도 같은 규칙으로 거른다.

/** 학위별 표준 수업연한 — 종료 휠을 처음 열 때의 위치에만 쓴다(값을 정하지 않는다) */
export const EDU_STD_YEARS = { high_school: 3, associate: 2, bachelor: 4, master: 2, doctorate: 3, other: 4 };
/** 종료가 지난 달까지만인 상태 */
export const EDU_PAST_STATUSES = ['graduated', 'completed', 'dropped'];
export const EDU_YM_FLOOR = '1950-01';
const EXPECTED_YEARS_AHEAD = 8;

const YM = /^(\d{4})-(0[1-9]|1[0-2])$/;

export const isYm = (v) => typeof v === 'string' && YM.test(v);
export const ymNum = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return y * 12 + (m - 1);
};
export const numYm = (n) => `${Math.floor(n / 12)}-${String((n % 12) + 1).padStart(2, '0')}`;
export const clampYm = (ym, min, max) => numYm(Math.min(Math.max(ymNum(ym), ymNum(min)), ymNum(max)));
export const nowYm = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/** `2019-03` → `2019.03`. 자유 입력 시절에 저장된 값(`2010`·`2000.03`)은 그대로 둔다 */
export const formatYm = (v) => (isYm(v) ? v.replace('-', '.') : v || '');

/** 목록 부 표시의 기간 — 재학이거나 종료가 없으면 `2024.03~` */
export const formatEduPeriod = (from, to) => {
  if (!from && !to) return '';
  return `${formatYm(from)}~${formatYm(to)}`;
};

/** 시작 칸이 고를 수 있는 범위와 처음 위치 */
export function fromRange(now) {
  return { min: EDU_YM_FLOOR, max: now, initial: `${now.slice(0, 4)}-03` };
}

/** 종료 칸이 고를 수 있는 범위와 처음 위치 — 상태·시작·학위에 따라 바뀐다 */
export function toRange({ status, from, degree }, now) {
  const expected = status === 'expected';
  const min = expected
    ? (from && ymNum(from) > ymNum(now) ? from : now)
    : (from || EDU_YM_FLOOR);
  const max = expected ? `${Number(now.slice(0, 4)) + EXPECTED_YEARS_AHEAD}-12` : now;
  const years = EDU_STD_YEARS[degree] ?? 4;
  const guess = from ? `${Number(from.slice(0, 4)) + years}-02` : `${now.slice(0, 4)}-02`;
  return { min, max, initial: clampYm(guess, min, max) };
}

/**
 * 종료 칸 아래 오류의 종류. 휠이 범위 밖을 못 고르게 해도 «시작·상태를 나중에 바꾼» 경우는 남는다 —
 * 그때 값을 지우지 않고 알린다(정책 §7).
 * @returns {'endBeforeStart' | 'pastOnly' | 'expectedFromNow' | null}
 */
export function eduEndError({ status, from, to }, now) {
  if (!to || status === 'enrolled') return null;
  if (from && ymNum(to) < ymNum(from)) return 'endBeforeStart';
  if (EDU_PAST_STATUSES.includes(status) && ymNum(to) > ymNum(now)) return 'pastOnly';
  if (status === 'expected' && ymNum(to) < ymNum(now)) return 'expectedFromNow';
  return null;
}

/** 「추가」를 누를 수 있나 — 학교 ∧ 전공(고졸 제외) ∧ 시작 ∧ (재학 ∨ 종료) ∧ 오류 없음 */
export function canAddEducation(d, now) {
  const school = (d.school || '').trim();
  const major = (d.major || '').trim();
  return Boolean(
    school
    && (d.degree === 'high_school' || major)
    && d.from
    && (d.status === 'enrolled' || d.to)
    && !eduEndError(d, now),
  );
}
