import { controlClass, useFieldControl } from './formField.js';

const SearchGlyph = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

/**
 * SearchInput — 돋보기가 붙은 검색칸 (PW-1012).
 *
 * 화면마다(19곳) 「돋보기 + 입력칸」 상자를 따로 그리던 것을 모았다. 칸 이름이 눈에 안 보이는
 * 자리라 `aria-label` 이 없으면 `placeholder` 를 이름으로 쓴다 — 이름 없는 검색칸이 되지 않게.
 * 브라우저가 붙이는 지우기 ×(`type="search"`)는 쓰지 않는다 — 브라우저마다 모양이 달라서다.
 *
 *   <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름·이메일 검색" />
 *
 * 모양이 이미 있던 화면은 상자·돋보기·칸 클래스를 셋 다 넘긴다(`className`·`iconClassName`·
 * `inputClassName`). 넘긴 것은 공용 기본 모양 대신 쓰인다.
 *
 * Props: 기본 `<input>` 속성 전부 + className(바깥 상자) · iconClassName(돋보기 자리) ·
 *        inputClassName(칸) · iconSize · invalid · ref
 */
export default function SearchInput({
  className,
  iconClassName,
  inputClassName,
  iconSize = 16,
  invalid,
  id,
  placeholder,
  'aria-label': ariaLabel,
  'aria-describedby': describedBy,
  ref,
  ...rest
}) {
  const { isInvalid, ...a11y } = useFieldControl({ id, invalid, describedBy });
  return (
    <div className={className || 'dp-search'}>
      <span className={iconClassName || 'dp-search-icon'}><SearchGlyph size={iconSize} /></span>
      <input
        ref={ref}
        type="text"
        role="searchbox"
        autoComplete="off"
        className={controlClass('dp-input dp-search-input', inputClassName, isInvalid)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        {...a11y}
        {...rest}
      />
    </div>
  );
}
