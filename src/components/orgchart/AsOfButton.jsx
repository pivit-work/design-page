import { useRef, useState } from 'react';
import DatePicker from '../shared/DatePicker.jsx';
import { resolveUiLocale } from '../shared/uiLocale.js';
import { CalendarGlyph } from '../shared/lineIcons.jsx';
import { ISO, toDate, toIso, formatAsOf } from './asOfDate.js';

/**
 * 기준일 버튼 — 달력 아이콘 + 「2026년 4월 10일」. 누르면 공용 달력(DatePicker)이 뜬다 (Figma 17755:26872).
 *
 * 조직도 캔버스 툴바와 리스트 탭 툴바가 같은 버튼을 쓴다. 값 규약은 `asOfDate.js` 참조.
 *
 * @param {object} asOf  { value, min, max, onChange, label?, caption?, locale?, display?, pickerLabels? }
 * @param {(key: string, vars?: object) => string} L  화면 문구
 */
export default function AsOfButton({ asOf, L }) {
  const btnRef = useRef(null);
  const [picker, setPicker] = useState(null);
  const locale = resolveUiLocale(asOf?.locale);
  if (!asOf) return null;

  const openPicker = () => {
    if (!btnRef.current) return;
    setPicker({ rect: btnRef.current.getBoundingClientRect(), el: btnRef.current });
  };
  const valid = !!asOf.value && ISO.test(asOf.value);
  const maxDate = asOf.max && ISO.test(asOf.max) ? toDate(asOf.max) : undefined;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="org-tool-btn has-label org-asof-btn"
        title={asOf.caption || L('org.asOfPick')}
        aria-label={asOf.label ? `${asOf.label} ${formatAsOf(asOf, locale)}` : L('org.asOfPick')}
        aria-haspopup="dialog"
        aria-expanded={!!picker}
        onClick={openPicker}
        data-testid="org-asof"
      >
        <CalendarGlyph size={20} />
        <span>{formatAsOf(asOf, locale)}</span>
      </button>
      {picker && (
        <DatePicker
          anchorRect={picker.rect}
          anchorEl={picker.el}
          selectedDate={valid ? toDate(asOf.value) : (maxDate ?? new Date())}
          minDate={asOf.min && ISO.test(asOf.min) ? toDate(asOf.min) : undefined}
          maxDate={maxDate}
          locale={locale}
          labels={asOf.pickerLabels}
          today={maxDate}
          onSelect={(d) => { asOf.onChange?.(toIso(d)); setPicker(null); }}
          onClose={() => setPicker(null)}
          data-testid="org-asof-picker"
        />
      )}
    </>
  );
}
