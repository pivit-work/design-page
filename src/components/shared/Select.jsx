import { controlClass, useFieldControl } from './formField.js';

/**
 * Select — 목록에서 하나 고르는 칸 (PW-1012). 브라우저 기본 목록(`<select>`)을 그대로 쓴다 —
 * 키보드·화면 읽기 프로그램 동작을 새로 만들지 않기 위해서다. 쓰는 법·모양 규칙은
 * `TextInput` 과 같다.
 *
 *   <Select value={v} onChange={(e) => setV(e.target.value)} options={[{ value, label }]} />
 *   <Select value={v} onChange={…}><option …/></Select>     // 무리(optgroup)가 필요할 때
 *
 * Props: 기본 `<select>` 속성 전부 + `options`([{ value, label, disabled }]) ·
 *        `placeholder`(값이 없을 때 보일 첫 줄 — 고를 수 없다) · `invalid` · `ref`
 */
export default function Select({
  className,
  invalid,
  id,
  options,
  placeholder,
  children,
  'aria-describedby': describedBy,
  ref,
  ...rest
}) {
  const { isInvalid, ...a11y } = useFieldControl({ id, invalid, describedBy });
  return (
    <select
      ref={ref}
      className={controlClass('dp-input dp-select', className, isInvalid)}
      {...a11y}
      {...rest}
    >
      {placeholder != null && <option value="" disabled>{placeholder}</option>}
      {options
        ? options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>
        ))
        : children}
    </select>
  );
}
