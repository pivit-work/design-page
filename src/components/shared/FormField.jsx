import { useId } from 'react';
import { FormFieldContext } from './formField.js';

/**
 * FormField — 칸 위 이름표 + 칸 + 칸 바로 아래 안내·오류 문구를 묶는 틀 (PW-1012).
 *
 * 화면마다 따로 있던 「이름표 · 칸 · 빨간 글씨」 묶음(26가지)을 이 하나로 모았다. 틀이 id 를
 * 정해 안의 칸(`TextInput`·`TextArea`·`Select`·`Checkbox`·`Radio`·`SearchInput`)에 건네므로:
 *
 * - 이름표를 누르면 그 칸으로 간다(`<label htmlFor>`).
 * - 오류 문구가 **그 칸 바로 아래**에 뜨고, 칸에 `aria-invalid` 와 `aria-describedby` 가
 *   붙어 화면 읽기 프로그램이 「이 칸이 틀렸다 — 이유」를 읽는다. 전에는 문구만 따로 떠서
 *   어느 칸 이야기인지 알려 주지 못했다.
 *
 *   <FormField label="이름" error={nameError}>
 *     <TextInput value={name} onChange={(e) => setName(e.target.value)} />
 *   </FormField>
 *
 *   <FormField label="미팅 시간" group>          // 라디오·체크박스 무리
 *     <Radio name="dur" value="25" … label="25분" />
 *     <Radio name="dur" value="55" … label="55분" />
 *   </FormField>
 *
 * ## 생김새
 *
 * 기본 모양은 `form-field.css` 의 `dp-field*` 가 그린다. 이미 자기 모양이 있던 화면은
 * `className`·`labelClassName` 으로 그 클래스를 넘겨 **보이는 모양을 그대로 둔다**
 * (상태 딱지를 모을 때와 같은 방식 — PW-840). 오류 문구 모양은 화면이 바꾸지 않는다 —
 * 어디서나 같은 빨간 글씨여야 「틀렸다」로 읽힌다.
 *
 * Props:
 *   label           이름표. 없으면 이름표 줄을 그리지 않는다(칸의 aria-label 을 쓴다)
 *   error           오류 문구. 있으면 칸이 «틀림» 이 된다. 문자열·노드 모두 된다
 *   hint            칸 아래 안내(오류가 없을 때만 보인다)
 *   required        이름표 뒤에 «필수» 표시(*)를 붙이고, 칸에 aria-required 를 붙인다
 *   group           라디오·체크박스 무리를 감쌀 때. 이름표가 `<label>` 대신 무리 이름이 된다
 *   id              칸의 id 를 직접 정할 때(없으면 자동)
 *   className       틀 바깥 상자 클래스
 *   labelClassName  이름표 클래스
 *   errorTestId     오류 문구의 data-testid
 *   labelExtra      이름표 줄 오른쪽에 붙일 것(글자 수 등)
 *   hintClassName   안내 문구 클래스
 *   hintAbove       안내를 칸 **위**(이름표 바로 아래)에 둔다 — 내 설정 화면이 그렇게 생겼다.
 *                   오류 문구는 언제나 칸 아래다
 */
export default function FormField({
  label,
  error,
  hint,
  required = false,
  group = false,
  id,
  className,
  labelClassName,
  errorTestId,
  labelExtra,
  hintClassName,
  hintAbove = false,
  children,
  ...rest
}) {
  const auto = useId();
  const controlId = id ?? `dpf${auto.replace(/:/g, '')}`;
  const labelId = `${controlId}-label`;
  const hintId = `${controlId}-hint`;
  const errorId = `${controlId}-error`;
  const hasError = error != null && error !== false && error !== '';
  const showHint = !hasError && hint != null && hint !== false && hint !== '';

  const ctx = {
    controlId,
    group,
    invalid: hasError,
    required,
    describedBy: hasError ? errorId : showHint ? hintId : undefined,
  };

  const labelNode = label == null ? null : group ? (
    <span id={labelId} className={labelClassName ?? 'dp-field-label'}>
      {label}
      {required && <span className="dp-field-required" aria-hidden>*</span>}
    </span>
  ) : (
    <label id={labelId} htmlFor={controlId} className={labelClassName ?? 'dp-field-label'}>
      {label}
      {required && <span className="dp-field-required" aria-hidden>*</span>}
    </label>
  );

  const hintNode = <p id={hintId} className={hintClassName ?? 'dp-field-hint'}>{hint}</p>;

  const groupProps = group
    ? {
        role: 'group',
        'aria-labelledby': label == null ? undefined : labelId,
        'aria-describedby': ctx.describedBy,
      }
    : {};

  return (
    // 모양 클래스는 둘 중 하나 — 화면이 준 것이 있으면 그것만(공용 기본값이 섞여 모양이 바뀌지 않게).
    <div className={className || 'dp-field'} {...groupProps} {...rest}>
      {labelNode && labelExtra ? (
        <div className="dp-field-label-row">{labelNode}{labelExtra}</div>
      ) : labelNode}
      {showHint && hintAbove && hintNode}
      <FormFieldContext.Provider value={ctx}>{children}</FormFieldContext.Provider>
      {showHint && !hintAbove && hintNode}
      {hasError && (
        <p id={errorId} className="dp-field-error" role="alert" data-testid={errorTestId}>
          {error}
        </p>
      )}
    </div>
  );
}
