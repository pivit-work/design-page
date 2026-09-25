import { createContext, useContext } from 'react';

/**
 * 이름표·오류 문구 틀(`FormField`)이 그 안의 칸에 건네는 것 (PW-1012).
 *
 * 칸이 틀 안에 있으면 틀이 정한 id 와 «무엇이 이 칸을 설명하나»(안내·오류 문구의 id)를 받아
 * 스스로 붙인다. 그래서 화면은 `<FormField error={…}><TextInput …/></FormField>` 만 쓰면
 * 이름표 누르기·화면 읽기 프로그램의 「이 칸이 틀렸다」 안내가 따라온다.
 */
export const FormFieldContext = createContext(null);

const join = (...parts) => {
  const s = parts.filter(Boolean).join(' ').trim();
  return s || undefined;
};

/**
 * 칸 하나가 틀에서 받을 속성을 자기 속성과 합친다.
 *
 * - `id` — 칸이 직접 준 것이 이긴다. 없으면 틀이 정한 것.
 * - `aria-describedby` — 칸이 준 것 뒤에 틀의 안내·오류 문구 id 를 붙인다.
 * - `aria-invalid` — `invalid` 를 직접 주면 그것, 아니면 틀에 오류 문구가 있는가.
 *
 * 무리(라디오·체크박스 여러 개)를 감싼 틀에서는 `id` 를 나눠 주지 않는다 — 한 id 를
 * 여럿이 가질 수 없고, 무리 전체가 이름표를 갖는다(`role="group"`).
 */
export function useFieldControl({ id, invalid, describedBy }) {
  const field = useContext(FormFieldContext);
  // 무리 안의 칸 하나하나는 무리가 이미 읽어 주는 설명을 되풀이하지 않는다.
  const single = field && !field.group ? field : null;
  const isInvalid = invalid ?? field?.invalid ?? false;
  const out = { isInvalid };
  // 값이 없는 속성은 아예 싣지 않는다 — 부르는 쪽이 `{...rest}` 앞뒤 어디에 펼쳐도
  // 화면이 직접 준 `aria-*` 를 undefined 로 덮지 않게.
  const put = (k, v) => { if (v !== undefined) out[k] = v; };
  put('id', id ?? single?.controlId);
  put('aria-invalid', isInvalid ? true : undefined);
  put('aria-describedby', join(describedBy, single?.describedBy));
  put('aria-required', single?.required ? true : undefined);
  return out;
}

/**
 * 칸의 클래스.
 *
 * - `dp-control` 은 늘 붙는다 — 틀렸을 때의 빨간 테두리가 이 표시에 걸린다.
 * - 모양은 **둘 중 하나**다. 화면이 `className` 을 주면 그 클래스만, 안 주면 공용 기본 모양
 *   (`base`). 둘을 겹치지 않는 것은, 화면 클래스가 정하지 않은 값(최소 높이·줄 높이 등)을
 *   공용 기본값이 채워 넣어 옮기기 전과 모양이 달라지는 일을 막기 위해서다.
 */
export const controlClass = (base, className, isInvalid) =>
  ['dp-control', className || base, isInvalid ? 'is-invalid' : ''].filter(Boolean).join(' ');
