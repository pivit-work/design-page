import { controlClass, useFieldControl } from './formField.js';

/**
 * TextInput — 한 줄 입력칸 (PW-1012).
 *
 * `FormField` 안에 두면 이름표·오류 문구와 저절로 이어진다. 밖에서 쓸 때는 `invalid` 와
 * `aria-describedby` 를 직접 준다.
 *
 * 기본 모양은 `dp-input`. 이미 자기 모양이 있던 화면은 `className` 으로 그 클래스를 넘기고,
 * 그러면 기본 모양은 빠진다(옮기기 전과 모양이 같게). 틀렸을 때의 빨간 테두리만은 어느
 * 모양에서나 같이 붙는다 — `form-field.css`.
 *
 * Props: 기본 `<input>` 속성 전부 + `invalid`(틀림 표시를 직접 켤 때) · `ref`
 */
export default function TextInput({
  className,
  invalid,
  id,
  type = 'text',
  'aria-describedby': describedBy,
  ref,
  ...rest
}) {
  const { isInvalid, ...a11y } = useFieldControl({ id, invalid, describedBy });
  return (
    <input
      ref={ref}
      type={type}
      className={controlClass('dp-input', className, isInvalid)}
      {...a11y}
      {...rest}
    />
  );
}
