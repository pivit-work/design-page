import { useMemo } from 'react';
import useSegmentedIndicator from './useSegmentedIndicator.js';

/**
 * Tabs — pivit 전역 tab 컴포넌트.
 *
 * 하단 underline 이 활성 tab 으로 슬라이딩 이동. Figma 의 tabButtonBase
 * 패턴 (height 36, text-md Medium 16/24, fgSecondary 2px underline).
 *
 * 컨테이너 (`.tl-tabs-row`) 의 border-bottom 1px 위에 indicator 가 얹어진다.
 * 항상 이 컴포넌트를 사용한다. 새로 만들지 말 것.
 *
 * Props:
 *   items     [{ value, label }]
 *   value     현재 선택된 value (controlled)
 *   onChange  (next) => void
 *   className 추가 클래스 (.tl-tabs 래퍼)
 */
export default function Tabs({ items, value, onChange, className = '' }) {
  const values = useMemo(() => items.map((it) => it.value), [items]);
  const { itemsRef, indicator } = useSegmentedIndicator(values, value);

  return (
    <div className={`tl-tabs ${className}`.trim()} role="tablist">
      {items.map((it, i) => (
        <button
          key={it.value}
          ref={(el) => {
            itemsRef.current[i] = el;
          }}
          type="button"
          role="tab"
          aria-selected={value === it.value}
          className={`tl-tab ${value === it.value ? 'is-active' : ''}`}
          onClick={() => onChange?.(it.value)}
        >
          {it.label}
        </button>
      ))}
      {indicator && (
        <span
          className="tl-tabs-indicator"
          style={{ left: indicator.left, width: indicator.width }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
