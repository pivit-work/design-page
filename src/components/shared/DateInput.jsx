import { useRef, useState } from 'react';
import DatePicker from './DatePicker.jsx';
import { resolveUiLocale } from './uiLocale.js';

/**
 * DateInput — 브라우저 기본 날짜 칸(`<input type="date">`)을 대신하는 날짜 칸 (PW-793).
 *
 * 🔴 왜 기본 날짜 칸을 안 쓰나: 그 칸의 표시 형식은 **브라우저 언어가 정한다.** 영어
 * 크롬에서는 앱 언어가 한국어여도 `09/29/2026` 으로 보이고, 앱이 바꿀 방법이 없다.
 * 그래서 평가 마법사의 날짜 칸(PW-528 ③ — 「직접 치기」 + 「달력으로 고르기」)을
 * 공용으로 옮겼다. 값은 늘 `2026-09-29` 로 보이고, 누르면 화면 언어의 달력이 뜬다.
 *
 * 값 규약은 기본 날짜 칸과 같다 — `''` 이거나 온전한 `YYYY-MM-DD`. 치는 중인 값
 * (`2026-0`)은 칸 안에만 있고 `onChange` 로 나가지 않는다. 칸을 떠날 때 온전하지
 * 않으면 마지막 값으로 되돌린다.
 *
 * 겉 상자는 **호출부의 className** 이 그린다 — 기존 기본 날짜 칸이 쓰던 클래스를 그대로
 * 넘기면 모양이 안 바뀐다.
 *
 * Props:
 *   value      '' | 'YYYY-MM-DD'
 *   onChange   (value: string) => void — '' 또는 온전한 날짜만
 *   min, max   'YYYY-MM-DD' — 달력에서 이 범위 밖은 못 고른다
 *   locale     화면 언어 (없으면 `<html lang>`)
 *   labels     DatePicker 문구를 직접 줄 때
 *   today      'YYYY-MM-DD' — 달력이 「오늘」로 칠 날. 비어 있는 칸을 열 때 보여 줄 달도 이 날이다.
 *              없으면 브라우저 시계의 오늘. 앱이 사용자 설정 시간대로 오늘을 정할 때 넘긴다 (PW-781)
 *   ...rest    aria-label·data-testid·disabled·id·name 등은 칸에 그대로 붙는다
 */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(v) {
  if (!ISO_DATE.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  const probe = new Date(y, m - 1, d);
  return probe.getFullYear() === y && probe.getMonth() === m - 1 && probe.getDate() === d;
}

const toDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const toIso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** `20260929` 처럼 줄표 없이 친 것도 받아 준다. */
function normalize(raw) {
  const v = String(raw ?? '').trim();
  if (/^\d{8}$/.test(v)) return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6)}`;
  return v.replace(/[./]/g, '-');
}

export default function DateInput({
  value,
  onChange,
  min,
  max,
  locale,
  labels,
  className,
  disabled,
  readOnly,
  placeholder = 'YYYY-MM-DD',
  // 기본 날짜 칸만 한 폭 — text 칸의 기본 폭(20자)은 줄 안에서 너무 넓다.
  size = 13,
  today,
  ...rest
}) {
  const current = typeof value === 'string' ? value.slice(0, 10) : '';
  const [draft, setDraft] = useState(current);
  const [picker, setPicker] = useState(null);
  const ref = useRef(null);

  // 바깥에서 값이 바뀌면(달력·초기화·서버 값) 칸도 따라간다 — 렌더 중에 맞춘다.
  const [seen, setSeen] = useState(current);
  if (seen !== current) {
    setSeen(current);
    setDraft(current);
  }

  const commit = (next) => {
    if (next === current) return;
    onChange?.(next);
  };

  const onType = (raw) => {
    setDraft(raw);
    const v = normalize(raw);
    if (v === '') commit('');
    else if (isIsoDate(v)) commit(v);
  };

  const onBlur = () => {
    const v = normalize(draft);
    if (v === '' || isIsoDate(v)) setDraft(v);
    else setDraft(current);
  };

  const open = () => {
    if (disabled || readOnly || !ref.current) return;
    setPicker({ rect: ref.current.getBoundingClientRect(), el: ref.current });
  };

  const todayDate = today && isIsoDate(today) ? toDate(today) : undefined;
  const selected = isIsoDate(current) ? toDate(current) : (todayDate ?? new Date());

  return (
    <>
      <input
        {...rest}
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className={className}
        value={draft}
        placeholder={placeholder}
        maxLength={10}
        size={size}
        disabled={disabled}
        readOnly={readOnly}
        onChange={(e) => onType(e.target.value)}
        onClick={open}
        onBlur={onBlur}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !picker) { e.preventDefault(); open(); }
        }}
      />
      {picker && (
        <DatePicker
          anchorRect={picker.rect}
          anchorEl={picker.el}
          selectedDate={selected}
          minDate={min && isIsoDate(min) ? toDate(min) : undefined}
          maxDate={max && isIsoDate(max) ? toDate(max) : undefined}
          locale={resolveUiLocale(locale)}
          labels={labels}
          today={todayDate}
          onSelect={(d) => {
            const iso = toIso(d);
            setDraft(iso);
            commit(iso);
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      )}
    </>
  );
}
