import { useFieldControl } from './formField.js';

/**
 * Checkbox — 체크박스 하나 + 옆 글씨 (PW-1012).
 *
 * 글씨와 네모를 `<label>` 하나로 묶어 글씨를 눌러도 켜지고 꺼진다. 네모는 브라우저 기본
 * 체크박스에 제품 색(`accent-color`)을 입힌 것이다.
 *
 *   <Checkbox checked={on} onChange={(e) => setOn(e.target.checked)} label="휴직자 제외" />
 *
 * 줄 모양이 이미 있던 화면은 `className` 으로 그 클래스를 넘긴다(바깥 `<label>` 에 붙고, 공용
 * 줄 모양·네모 모양은 빠진다 — 옮기기 전과 모양이 같게).
 * `data-testid`·`aria-*`·`name` 등 나머지 속성은 **네모(`<input>`)에** 붙는다.
 *
 * Props: label(옆 글씨 · children 도 된다) · checked · onChange · disabled · invalid ·
 *        className(바깥 줄) · inputClassName(네모) · title(줄 전체에 뜨는 설명) · 기본 `<input>` 속성
 */
export default function Checkbox({
  label,
  children,
  className,
  inputClassName,
  title,
  invalid,
  id,
  'aria-describedby': describedBy,
  ref,
  ...rest
}) {
  const { isInvalid, ...a11y } = useFieldControl({ id, invalid, describedBy });
  return (
    <label className={[className || 'dp-check', isInvalid ? 'is-invalid' : ''].filter(Boolean).join(' ')} title={title}>
      <input
        ref={ref}
        type="checkbox"
        // 줄 모양을 화면이 정했으면 네모도 전처럼 브라우저 기본 그대로 둔다(모양이 바뀌지 않게).
        className={['dp-control', inputClassName ?? (className ? '' : 'dp-check-input')].filter(Boolean).join(' ')}
        {...a11y}
        {...rest}
      />
      {label ?? children}
    </label>
  );
}
