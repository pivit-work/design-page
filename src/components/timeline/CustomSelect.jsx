import { useState } from 'react';
import SearchSelect from '../shared/SearchSelect.jsx';
import { ChevronDownGlyph } from '../shared/lineIcons.jsx';

/**
 * CustomSelect — 타임라인 화면들의 «하나 고르기» 칸. 닫힌 칸은 Figma "Select" 인풋 모양(.tl-select-*)
 * 그대로이고, 펼친 목록·키보드·화면 읽기 동작은 공용 `SearchSelect` 가 맡는다 (PW-1954).
 *
 * 예전엔 목록을 칸 바로 밑에 `position: absolute` 로 그려 창(모달) 안에서 열면 잘렸고, 키보드로 고를 수
 * 없었다. 이제 목록은 `body` 에 띄워 잘리지 않고 ↑↓ · Enter · Esc 로 고른다.
 *
 * Trigger: bg rgba(0,0,0,0.03), r=10, pad 6/12 (md: 8/12), focused/open 시 brand border
 *
 * API:
 *   <CustomSelect
 *     value={v}
 *     onChange={setV}
 *     placeholder="선택해 주세요."
 *     options={[{value, label, subLabel?}]}
 *     size="sm" | "md"  // default sm (36px), md (40px)
 *     disabled?
 *     id?               // label for/htmlFor
 *     ariaLabel?
 *     emptyLabel?       // 옵션이 0개일 때 메뉴 안 문구 (기본 '옵션이 없습니다')
 *     searchable?       // 검색칸 (기본 끔)
 *   />
 */
export default function CustomSelect({
  value,
  onChange,
  placeholder = '선택해 주세요.',
  options = [],
  size = 'sm',
  disabled = false,
  id,
  ariaLabel,
  emptyLabel = '옵션이 없습니다',
  searchable = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className={`tl-select tl-select-size-${size} ${isOpen ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''}`}>
      <SearchSelect
        id={id}
        value={value}
        onChange={onChange}
        options={options}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        emptyLabel={emptyLabel}
        searchable={searchable}
        className="tl-select-trigger"
        valueClassName="tl-select-value"
        chevronClassName="tl-select-chevron"
        chevron={<ChevronDownGlyph size={16} strokeWidth={2.505} />}
        onOpenChange={setIsOpen}
      />
    </div>
  );
}
