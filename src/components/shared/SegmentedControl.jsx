import { useMemo } from 'react';
import useSegmentedIndicator from './useSegmentedIndicator.js';

/**
 * SegmentedControl — pivit 전역 segmented control.
 *
 * Figma 16961:27054 / image #14 기준. 컨테이너 alpha-black-3, 비선택은
 * transparent (텍스트만), 선택은 white pill + 0.5px fgQuaternary border +
 * shadowLg01. 활성 pill 은 useSegmentedIndicator 훅으로 슬라이딩 이동.
 *
 * 항상 이 컴포넌트를 사용한다. 새로 만들지 말 것.
 *
 * Props:
 *   items     [{ value, label }] — 표시될 segment 목록 (2~N)
 *   value     현재 선택된 value (controlled)
 *   onChange  (next) => void — segment 클릭 시 호출
 *   block     true 면 width:100% (가로 꽉 채움), false(기본) 는 content-sized
 *   ariaLabel role=tablist 의 aria-label
 *   className 추가 클래스 (래퍼)
 */
export default function SegmentedControl({
  items,
  value,
  onChange,
  block = false,
  ariaLabel,
  className = '',
}) {
  const values = useMemo(() => items.map((it) => it.value), [items]);
  const { itemsRef, indicator } = useSegmentedIndicator(values, value);

  return (
    <div
      className={`seg-control ${block ? 'is-block' : ''} ${className}`.trim()}
      role="tablist"
      aria-label={ariaLabel}
    >
      {indicator && (
        <span
          className="seg-indicator"
          style={{
            left: indicator.left,
            top: indicator.top,
            width: indicator.width,
            height: indicator.height,
          }}
          aria-hidden="true"
        />
      )}
      {items.map((it, i) => (
        <button
          key={it.value}
          ref={(el) => {
            itemsRef.current[i] = el;
          }}
          type="button"
          role="tab"
          aria-selected={value === it.value}
          className={`seg-item ${value === it.value ? 'is-active' : ''}`}
          onClick={() => onChange?.(it.value)}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
