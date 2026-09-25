import { controlClass, useFieldControl } from './formField.js';

/**
 * TextArea — 여러 줄 입력칸 (PW-1012). 쓰는 법·모양 규칙은 `TextInput` 과 같다.
 *
 * Props: 기본 `<textarea>` 속성 전부 + `invalid` · `ref`
 */
export default function TextArea({
  className,
  invalid,
  id,
  'aria-describedby': describedBy,
  ref,
  ...rest
}) {
  const { isInvalid, ...a11y } = useFieldControl({ id, invalid, describedBy });
  return (
    <textarea
      ref={ref}
      className={controlClass('dp-input dp-textarea', className, isInvalid)}
      {...a11y}
      {...rest}
    />
  );
}
