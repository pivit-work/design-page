import { useFieldControl } from './formField.js';

/**
 * Radio — 여럿 중 하나를 고르는 동그라미 + 글씨 (PW-1012).
 *
 * 전에는 화면 다섯 곳이 동그라미를 `<button>` 과 `<span>` 으로 직접 그려서, 키보드 화살표로
 * 옮겨 다닐 수 없고 화면 읽기 프로그램은 「버튼」으로 읽었다. 이 부품은 **브라우저 기본
 * 라디오를 감춰 두고 그 위에 동그라미를 그린다** — 조작·읽기는 기본 라디오 그대로다.
 *
 *   <FormField label="미팅 시간" group>
 *     {opts.map((o) => (
 *       <Radio key={o.key} name="dur" value={o.key} checked={v === o.key}
 *              onChange={() => setV(o.key)} label={o.label} />
 *     ))}
 *   </FormField>
 *
 * 모양 두 갈래:
 *   variant="card"   회색 바탕 칸 안의 동그라미(고르면 제품색 바탕) — 1on1 추가 창·직원 상태
 *   variant="plain"  바탕 없이 동그라미 + 글씨 (기본)
 * 칸 모양이 이미 있던 자리(직원 상태 — 상태별 색)는 `className` 으로 그 클래스를 넘기고, 그러면
 * 위 두 갈래 모양은 빠진다. 동그라미·흰 점·감춘 라디오는 어느 쪽이든 이 부품이 그린다.
 *
 * Props: label(children 도 된다) · name · value · checked · onChange · disabled · invalid ·
 *        variant · className(바깥 줄) · 기본 `<input>` 속성(`data-testid` 는 라디오에 붙는다)
 */
export default function Radio({
  label,
  children,
  className,
  variant = 'plain',
  invalid,
  id,
  style,
  'aria-describedby': describedBy,
  ref,
  ...rest
}) {
  const { isInvalid, ...a11y } = useFieldControl({ id, invalid, describedBy });
  return (
    <label
      className={[
        'dp-radio',
        // 모양은 둘 중 하나 — 화면이 준 클래스가 있으면 그것만(옮기기 전과 모양이 같게).
        className || `dp-radio-look dp-radio--${variant}`,
        rest.checked ? 'is-checked' : '',
        rest.disabled ? 'is-disabled' : '',
        isInvalid ? 'is-invalid' : '',
      ].filter(Boolean).join(' ')}
      style={style}
    >
      <input ref={ref} type="radio" className="dp-radio-input" {...a11y} {...rest} />
      <span className="dp-radio-circle" aria-hidden />
      <span className="dp-radio-label">{label ?? children}</span>
    </label>
  );
}
