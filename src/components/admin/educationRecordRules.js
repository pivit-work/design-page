/**
 * 어드민 HR 기록 «학력» 칸 규칙 — 서버 `assertEducationInput`(pivit-work backend/src/hr/member-profile/education-period.ts ·
 * 내 설정 my-settings-spec §4-C-1 「상태별 종료 규칙」)과 같은 규칙을 [학력 추가] 전에 본다 (pivit-work PW-2942).
 * 화면이 받아 준 줄을 페이지 [저장하기] 때 서버가 «종료를 입력해 주세요»로 거절하면, 어느 줄인지 모른 채 앞 기록만 저장됐다.
 *
 * 「이번 달」은 보는 사람 시간대의 오늘(`todayIso`)이다. 서버는 가장 앞선·늦은 시간대로 너그럽게 잡으므로
 * 여기서 통과한 값은 서버도 받는다. 전공 필수·입학 > 졸업은 칸 정의(`required`·`periodError`)가 따로 본다.
 */

export const EDUCATION_YM_FLOOR = 1950 * 12;
const EXPECTED_YEARS_AHEAD = 8;
const PAST_STATUSES = new Set(['graduated', 'completed', 'dropped']);
/** 서버가 규칙을 보는 칸 — 고치기로 연 줄에서 이 칸을 안 건드리면 서버도 규칙을 안 본다(updateEducation) */
export const EDUCATION_RULE_KEYS = ['degree', 'status', 'major', 'from', 'to'];

/** `2010-03` · `2010.3` · `2010-03-01` · `201003` → 달 번호. 못 읽으면 null — 창이 서버에 보내기 전 `YYYY-MM` 으로 바꾸는 모양과 같다 */
export const yearMonthOf = (value) => {
  const m = /^(\d{4})[-./\s]?(\d{1,2})(?:[-./\s]?\d{1,2})?\.?$/.exec(String(value ?? '').trim());
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) return null;
  return Number(m[1]) * 12 + Number(m[2]) - 1;
};

/**
 * 서버에 실려 갈 모양 — 창이 보내기 전 기간을 `YYYY-MM` 으로 바꾸고(pivit-work hrRecordPeriod.toYearMonth) 글자를 다듬는다.
 * «안 건드린 줄»은 이 값을 서버에 있던 값과 견준다: 서버도 바뀐 값을 DB 값과 견주므로, 옛 `2000.03` 줄은 손대지 않아도
 * `2000-03` 으로 실려 «바뀜»이 된다(적대적 리뷰 PW-2942).
 */
export const educationSentValue = (key, value) => {
  const s = String(value ?? '').trim();
  if (key !== 'from' && key !== 'to') return s;
  const n = yearMonthOf(s);
  return n === null ? s : `${Math.floor(n / 12)}-${String((n % 12) + 1).padStart(2, '0')}`;
};

const fill = (text, vars) => String(text).replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`));

/**
 * 지금 칸 값이 서버에서 거절될 이유 — `{ key: 'from' | 'to', message }` 또는 null.
 * 빈 «입학»은 필수 표시(`*`)가 막으므로 여기서 말하지 않는다. «입학 > 졸업»도 `periodError` 가 말한다.
 */
export function educationRuleError(form, todayIso, L = {}) {
  const today = yearMonthOf(String(todayIso ?? '').slice(0, 7));
  const fromRaw = String(form.from ?? '').trim();
  const toRaw = String(form.to ?? '').trim();
  const status = String(form.status ?? '');

  if (fromRaw) {
    const from = yearMonthOf(fromRaw);
    if (from === null || from < EDUCATION_YM_FLOOR || (today !== null && from > today)) {
      return { key: 'from', message: L.hrEduFromInvalid || '입학은 1950-01부터 이번 달까지 YYYY-MM 으로 넣어 주세요.' };
    }
  }
  if (!status) return null;
  if (status === 'enrolled') return null; // 재학이면 졸업(예정) 칸을 잠그고 비운다
  if (!toRaw) {
    return { key: 'to', message: L.hrEduEndRequired || '졸업(예정)을 넣어 주세요. 재학이 아니면 비워 둘 수 없습니다.' };
  }
  const to = yearMonthOf(toRaw);
  if (to === null) {
    return { key: 'to', message: L.hrEduEndFormat || '졸업(예정)은 YYYY-MM 으로 넣어 주세요.' };
  }
  if (today === null) return null;
  if (PAST_STATUSES.has(status) && to > today) {
    return { key: 'to', message: L.hrEduEndPastOnly || '졸업·수료·중퇴는 이번 달까지만 넣을 수 있습니다.' };
  }
  if (status === 'expected') {
    const year = Math.floor(today / 12) + EXPECTED_YEARS_AHEAD;
    if (to < today || to > year * 12 + 11) {
      return {
        key: 'to',
        message: fill(L.hrEduEndExpectedRange || '졸업예정은 이번 달부터 {year}년 12월까지 넣을 수 있습니다.', { year }),
      };
    }
  }
  return null;
}

/** 상태를 재학으로 바꾸면 넣어 둔 졸업(예정)을 비운다 — 서버는 재학에 졸업일이 있으면 거절한다(§4-C-1 「재학으로 바꾸면 이미 넣은 종료 값을 비운다」) */
// changedKey 를 주면 «상태»를 바꿀 때만 비운다 — 옛 줄에서 학교명만 고칠 때 남은 졸업일을 몰래 지우지 않게
export const normalizeEducationForm = (form, changedKey) =>
  (form.status === 'enrolled' && form.to && (changedKey === undefined || changedKey === 'status') ? { ...form, to: '' } : form);
