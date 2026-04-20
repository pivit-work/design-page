import { EMPLOYEE_COLOR_PALETTE } from './employeeModalConstants.js';

/**
 * ColorPicker — Figma "Frame 3" 색상 선택기.
 * 17 color palette, 28x28 원, gap 12, wrap 허용. 선택된 색상은
 * 2px offset ring (Figma 에 나타난 선택 표시) 으로 강조.
 */
export default function ColorPicker({ value, onChange }) {
  return (
    <div className="tl-emp-color-picker" role="radiogroup" aria-label="색상 선택">
      {EMPLOYEE_COLOR_PALETTE.map((hex) => {
        const isSelected = value === hex;
        return (
          <button
            key={hex}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={hex}
            className={`tl-emp-color-swatch ${isSelected ? 'is-selected' : ''}`}
            style={{ background: hex, '--swatch-ring': hex }}
            onClick={() => onChange(hex)}
          />
        );
      })}
    </div>
  );
}
