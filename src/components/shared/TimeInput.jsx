import { useState } from 'react';

/**
 * TimeInput — 브라우저 기본 시각 칸(`<input type="time">`)을 대신하는 24시간 시각 칸 (PW-793).
 *
 * 🔴 기본 시각 칸은 **브라우저 언어가 표기를 정한다** — 영어 크롬에서는 앱 언어가
 * 한국어여도 `09:00 AM` 으로 보이고, 한국어에서는 `오전 09:00` 이다가 칸이 좁으면
 * 「오전」 만 남는다(PW-435). 앱이 고칠 수 없어서 칸을 바꾼다.
 *
 * 값은 늘 24시간 `HH:MM` — 마감 시각에 「오후 6:00」 을 쓰면 6시인지 18시인지 되묻게
 * 된다(evalScheduleStamp.js 와 같은 이유). `0900`·`9:00`·`9` 처럼 쳐도 칸을 떠날 때
 * `09:00` 으로 맞춘다. 온전하지 않으면 마지막 값으로 되돌린다.
 *
 * 값 규약은 기본 시각 칸과 같다 — `''` 이거나 `HH:MM`. 겉 상자는 호출부 className.
 *
 * 🔴 디자인 원본이 없는 칸이다 — 평가·어드민·내 설정 화면(디자이너를 기다리지 않고
 * 개발이 만들어도 되는 화면)에서만 쓴다. 그 밖의 화면은 디자이너 카드(PW-803)를 기다린다.
 */
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function normalize(raw) {
  const v = String(raw ?? '').trim().replace(/[.\s]/g, ':');
  if (v === '') return '';
  let m = /^(\d{1,2})$/.exec(v);
  if (m) return pad(m[1], '00');
  m = /^(\d{1,2}):(\d{2})$/.exec(v);
  if (m) return pad(m[1], m[2]);
  m = /^(\d{2})(\d{2})$/.exec(v);
  if (m) return pad(m[1], m[2]);
  m = /^(\d)(\d{2})$/.exec(v);
  if (m) return pad(m[1], m[2]);
  return v;
}
function pad(h, mm) {
  return `${String(Number(h)).padStart(2, '0')}:${mm}`;
}

export default function TimeInput({ value, onChange, className, placeholder = 'HH:MM', size = 7, ...rest }) {
  const current = typeof value === 'string' ? value.slice(0, 5) : '';
  const [draft, setDraft] = useState(current);

  // 바깥에서 값이 바뀌면(달력·초기화·서버 값) 칸도 따라간다 — 렌더 중에 맞춘다.
  const [seen, setSeen] = useState(current);
  if (seen !== current) {
    setSeen(current);
    setDraft(current);
  }

  const commit = (next) => {
    if (next !== current) onChange?.(next);
  };

  return (
    <input
      {...rest}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      className={className}
      value={draft}
      placeholder={placeholder}
      maxLength={5}
      size={size}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        if (raw.trim() === '') commit('');
        else if (HHMM.test(raw)) commit(raw);
      }}
      onBlur={() => {
        const v = normalize(draft);
        if (v === '') { setDraft(''); commit(''); return; }
        if (HHMM.test(v)) { setDraft(v); commit(v); return; }
        setDraft(current);
      }}
    />
  );
}
