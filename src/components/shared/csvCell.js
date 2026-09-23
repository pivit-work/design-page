/**
 * 내려받는 CSV 의 칸 하나를 감싼다 (PW-970).
 *
 * 1) RFC 4180: 값을 `"` 로 감싸고 안의 `"` 는 `""` 로 바꾼다
 * 2) 엑셀 수식 막기: `= + - @`·탭·CR 로 시작하면 앞에 작은따옴표를 붙여 엑셀·시트가
 *    수식으로 실행하지 못하게 한다 — 이름·부서·매니저 이름은 사람이 직접 넣는 칸이다.
 *    **앞 공백을 건너뛰고** 본다. 엑셀은 ` =HYPERLINK(…)` 도 수식으로 받는다.
 *
 * pivit-work 의 `frontend/src/lib/csv.ts` `csvCell` · 백엔드 `platform/common/util/csv.util.ts`
 * 와 **같은 규칙**이다. 화면 안에서 CSV 를 만드는 캔버스는 칸을 직접 감싸지 말고 이것을 쓴다
 * — 수시 피드백 현황 내려받기가 따옴표만 감싸고 이 처리를 빠뜨려 수식이 실행됐다.
 */
const CSV_FORMULA_START = /^\s*[=+\-@]|^[\t\r]/;

export function csvCell(value) {
  let s = String(value ?? '');
  if (CSV_FORMULA_START.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}
