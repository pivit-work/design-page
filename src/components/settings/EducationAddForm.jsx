import { useEffect, useRef, useState } from 'react';
import AnchoredLayer from '../shared/AnchoredLayer.jsx';
import useDismissLayer from '../shared/useDismissLayer.js';
import TextInput from '../shared/TextInput.jsx';
import Select from '../shared/Select.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import { CheckGlyph } from '../shared/lineIcons.jsx';
import {
  canAddEducation,
  clampYm,
  eduEndError,
  formatYm,
  fromRange,
  nowYm,
  toRange,
  ymNum,
} from './educationForm.js';

/**
 * 「내 설정 › 조직 정보」 학력 추가 폼 (PW-1302 · pivit-specs my-settings-spec §4-C-1 · 시안
 * `K. 내-설정/settings-app.jsx` 의 `EducationAddForm`).
 *
 * 자리와 순서는 예전 폼 그대로다 — 학교|전공 / 학위|상태 / 시작|종료 / 취소·추가.
 * 학교·전공은 입력하면 사전을 찾아 목록을 펴고(없으면 입력한 이름 그대로), 시작·종료는 눌러서 여는
 * 연·월 휠이다. 사전 검색은 호출부가 `onSearchSchools`·`onSearchMajors`(문자열 → Promise<목록>)로 준다.
 */

const SEARCH_MIN = 2;
const SEARCH_DELAY_MS = 250;
const WHEEL_ROW = 40; // 날짜 달력 칸 높이와 같다
const WHEEL_VISIBLE = 5;

const fill = (tpl, vars) => String(tpl || '').replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));

/** 학교·전공 검색 칸. value = { text, picked } — picked 는 목록에서 고른 값(✓), 아니면 «직접 입력» */
function RefSearchInput({ value, onChange, onSearch, placeholder, renderSub, customHint, F, testId }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [results, setResults] = useState([]);
  // 아무 행도 강조하지 않은 채 연다 — ↓ 한 번이 첫 행이어야 한다
  const [active, setActive] = useState(-1);
  const seq = useRef(0);
  const timer = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);
  useDismissLayer(() => setOpen(false), panelRef, inputRef, open);

  function query(text) {
    onChange({ text, picked: false }); // 고른 뒤 글자를 고치면 선택이 풀린다
    clearTimeout(timer.current);
    const my = ++seq.current; // 늦게 온 앞 질의 응답은 버린다
    if (text.trim().length < SEARCH_MIN) { setOpen(false); return; }
    setOpen(true); setLoading(true); setFailed(false); setActive(-1);
    timer.current = setTimeout(() => {
      Promise.resolve(onSearch ? onSearch(text.trim()) : [])
        .then((items) => {
          if (my !== seq.current) return;
          setResults(Array.isArray(items) ? items : []);
          setLoading(false);
        })
        .catch(() => {
          if (my !== seq.current) return;
          setResults([]); setFailed(true); setLoading(false);
        });
    }, SEARCH_DELAY_MS);
  }

  const t = value.text.trim();
  const exact = results.some((r) => r.name === t);
  const rows = loading ? [] : [
    ...results.map((item) => ({ kind: 'item', item })),
    ...(t && !exact ? [{ kind: 'custom' }] : []),
  ];

  function choose(row) {
    if (!row) return;
    onChange(row.kind === 'item' ? { text: row.item.name, picked: true } : { text: t, picked: false });
    setOpen(false);
  }

  function onKeyDown(e) {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, rows.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    // 고른 행이 없으면 입력값 그대로(직접 입력)로 닫는다
    else if (e.key === 'Enter') { e.preventDefault(); choose(rows[active] ?? { kind: 'custom' }); }
    else if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
  }

  return (
    <div className="msc-edu-field">
      <TextInput
        ref={inputRef}
        className="admin-emp-input msc-edu-input"
        value={value.text}
        placeholder={placeholder}
        aria-label={placeholder}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        data-testid={testId}
        onChange={(e) => query(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => setOpen(false)}
      />
      {value.text && (value.picked ? (
        <span className="msc-edu-picked" title={F.pickedTitle} data-testid={`${testId}-picked`}>
          <CheckGlyph size={14} aria-hidden />
        </span>
      ) : (
        <span className="msc-edu-custom-slot">
          <StatusBadge className="msc-vis-badge is-muted" data-testid={`${testId}-custom`}>{F.customTag}</StatusBadge>
        </span>
      ))}
      {open && (
        <AnchoredLayer
          anchorRef={inputRef}
          matchAnchorWidth
          panelRef={panelRef}
          maxHeight={320}
          className="msc-edu-menu"
          role="listbox"
          data-testid={`${testId}-menu`}
        >
          {loading && <div className="msc-edu-menu-note">{F.searching}</div>}
          {!loading && failed && <div className="msc-edu-menu-note">{F.searchFailed}</div>}
          {!loading && !failed && results.length === 0 && <div className="msc-edu-menu-note">{F.noResults}</div>}
          {rows.map((row, i) => (
            <button
              key={row.kind === 'item' ? row.item.id : 'custom'}
              type="button"
              role="option"
              aria-selected={i === active}
              className={`msc-edu-opt${i === active ? ' is-active' : ''}${row.kind === 'custom' ? ' is-custom' : ''}`}
              data-testid={row.kind === 'item' ? `${testId}-opt` : `${testId}-opt-custom`}
              onMouseDown={(e) => { e.preventDefault(); choose(row); }}
              onMouseEnter={() => setActive(i)}
            >
              {row.kind === 'item' ? (
                <>
                  <span className="msc-edu-opt-name">{row.item.name}</span>
                  <span className="msc-edu-opt-sub">{renderSub(row.item)}</span>
                </>
              ) : (
                <>
                  <span className="msc-edu-opt-name">{fill(F.customRow, { q: t })}</span>
                  <span className="msc-edu-opt-sub">{customHint}</span>
                </>
              )}
            </button>
          ))}
        </AnchoredLayer>
      )}
    </div>
  );
}

/** 휠 한 열 — 행 40 · 5행 보임 · 가운데 행이 선택. 흐린 행은 고를 수 없다 */
function WheelColumn({ items, value, onChange, label, testId }) {
  const ref = useRef(null);
  const timer = useRef(null);
  const idx = Math.max(0, items.findIndex((it) => it.v === value));

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = idx * WHEEL_ROW;
  }, [idx]);
  useEffect(() => () => clearTimeout(timer.current), []);

  function nearestEnabled(i) {
    if (!items[i]?.disabled) return i;
    let best = -1;
    items.forEach((it, k) => {
      if (!it.disabled && (best < 0 || Math.abs(k - i) < Math.abs(best - i))) best = k;
    });
    return best;
  }

  function settle() {
    const el = ref.current;
    if (!el) return;
    const raw = Math.min(items.length - 1, Math.max(0, Math.round(el.scrollTop / WHEEL_ROW)));
    const i = nearestEnabled(raw);
    if (i < 0) return;
    if (el.scrollTop !== i * WHEEL_ROW) el.scrollTop = i * WHEEL_ROW;
    if (items[i].v !== value) onChange(items[i].v);
  }

  function step(d) {
    for (let k = idx + d; k >= 0 && k < items.length; k += d) {
      if (!items[k].disabled) { onChange(items[k].v); return; }
    }
  }

  return (
    <div
      ref={ref}
      tabIndex={0}
      role="listbox"
      aria-label={label}
      className="msc-edu-wheel-col"
      data-testid={testId}
      onScroll={() => { clearTimeout(timer.current); timer.current = setTimeout(settle, 90); }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); step(1); }
        if (e.key === 'ArrowUp') { e.preventDefault(); step(-1); }
      }}
    >
      {items.map((it) => (
        <div
          key={it.v}
          role="option"
          aria-selected={it.v === value}
          aria-disabled={it.disabled || undefined}
          className={`msc-edu-wheel-row${it.v === value ? ' is-selected' : ''}${it.disabled ? ' is-disabled' : ''}`}
          onClick={() => !it.disabled && onChange(it.v)}
        >
          {it.label}
        </div>
      ))}
    </div>
  );
}

/** 연·월 휠 칸 — 눌러서 연다(타이핑 없음). 값은 [확인] 때만 칸에 들어간다 */
function MonthWheelField({ value, onChange, placeholder, disabled, disabledText, range, error, F, testId }) {
  const [open, setOpen] = useState(false);
  const [tmp, setTmp] = useState(range.initial);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  useDismissLayer(() => setOpen(false), panelRef, triggerRef, open);

  const [ty, tm] = tmp.split('-').map(Number);
  const minY = Number(range.min.slice(0, 4));
  const maxY = Number(range.max.slice(0, 4));
  const pad = (n) => String(n).padStart(2, '0');
  const off = (y, m) => {
    const n = ymNum(`${y}-${pad(m)}`);
    return n < ymNum(range.min) || n > ymNum(range.max);
  };
  const years = [];
  for (let y = minY; y <= maxY; y += 1) years.push({ v: y, label: fill(F.yearItem, { y }), disabled: false });
  const months = Array.from({ length: 12 }, (_, i) => ({
    v: i + 1,
    label: F.monthNames?.[i] ?? fill(F.monthItem, { m: i + 1 }),
    disabled: off(ty, i + 1),
  }));

  function openWheel() {
    if (disabled) return;
    setTmp(clampYm(value || range.initial, range.min, range.max));
    setOpen(true);
  }
  const confirm = () => { onChange(tmp); setOpen(false); };

  return (
    <div className="msc-edu-field">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={placeholder}
        className={`admin-emp-input msc-edu-input msc-edu-wheel-trigger${value ? '' : ' is-empty'}${error ? ' is-invalid' : ''}`}
        data-testid={testId}
        onClick={() => (open ? setOpen(false) : openWheel())}
      >
        {disabled ? disabledText : value ? formatYm(value) : placeholder}
      </button>
      {error && <div className="msc-edu-error" role="alert" data-testid={`${testId}-error`}>{error}</div>}
      {open && (
        <AnchoredLayer
          anchorRef={triggerRef}
          matchAnchorWidth
          panelRef={panelRef}
          className="msc-edu-wheel"
          role="group"
          aria-label={fill(F.wheelDialog, { field: placeholder })}
          data-testid={`${testId}-wheel`}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); confirm(); }
          }}
        >
          <div className="msc-edu-wheel-cols">
            <div className="msc-edu-wheel-band" aria-hidden />
            <WheelColumn label={F.yearCol} items={years} value={ty} testId={`${testId}-year`}
              onChange={(y) => setTmp(clampYm(`${y}-${pad(tm)}`, range.min, range.max))} />
            <WheelColumn label={F.monthCol} items={months} value={tm} testId={`${testId}-month`}
              onChange={(m) => setTmp(`${ty}-${pad(m)}`)} />
          </div>
          <div className="msc-add-actions">
            <button type="button" className="admin-notif-btn is-soft is-sm" onClick={() => setOpen(false)}>{F.wheelCancel}</button>
            <button type="button" className="admin-notif-btn is-primary is-sm" onClick={confirm} data-testid={`${testId}-confirm`}>{F.wheelConfirm}</button>
          </div>
        </AnchoredLayer>
      )}
    </div>
  );
}

export default function EducationAddForm({ L, onCancel, onSubmit, onSearchSchools, onSearchMajors, now: nowProp }) {
  const F = L.eduForm;
  const [school, setSchool] = useState({ text: '', picked: false });
  const [major, setMajor] = useState({ text: '', picked: false });
  const [degree, setDegree] = useState('bachelor');
  const [status, setStatus] = useState('graduated');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);

  const now = nowProp || nowYm();
  const enrolled = status === 'enrolled';
  const d = { school: school.text, major: major.text, degree, status, from, to: enrolled ? '' : to };
  const errKind = eduEndError(d, now);
  const canAdd = canAddEducation(d, now) && !busy;

  function submit() {
    if (!canAdd) return;
    setBusy(true);
    Promise.resolve(onSubmit({
      school: school.text.trim(),
      major: major.text.trim() || null,
      degree,
      from,
      to: enrolled ? null : to,
      status,
    })).finally(() => setBusy(false));
  }

  return (
    <div className="msc-add-form" data-testid="education-add-form">
      <div className="msc-grid-2col">
        <RefSearchInput
          value={school}
          onChange={setSchool}
          onSearch={onSearchSchools}
          placeholder={F.schoolSearch}
          renderSub={(s) => [F.schoolKinds?.[s.kind], F.regions?.[s.region] ?? s.region].filter(Boolean).join(' · ')}
          customHint={F.customSchoolHint}
          F={F}
          testId="education-school"
        />
        <RefSearchInput
          value={major}
          onChange={setMajor}
          onSearch={onSearchMajors}
          placeholder={degree === 'high_school' ? F.majorOptional : F.majorSearch}
          renderSub={(m) => F.majorFields?.[m.field] ?? ''}
          customHint={F.customMajorHint}
          F={F}
          testId="education-major"
        />
        <Select className="admin-emp-input" value={degree} onChange={(e) => setDegree(e.target.value)} aria-label={L.fields.degree} data-testid="education-degree">
          {Object.entries(L.degreeOptions).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Select
          className="admin-emp-input"
          value={status}
          aria-label={L.fields.status}
          data-testid="education-status"
          onChange={(e) => { setStatus(e.target.value); if (e.target.value === 'enrolled') setTo(''); }}
        >
          {Object.entries(L.eduStatusOptions).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <MonthWheelField
          value={from}
          onChange={setFrom}
          placeholder={L.fields.from}
          range={fromRange(now)}
          F={F}
          testId="education-from"
        />
        <MonthWheelField
          value={enrolled ? '' : to}
          onChange={setTo}
          placeholder={L.fields.to}
          disabled={enrolled}
          disabledText={F.enrolledNoEnd}
          range={toRange({ status, from, degree }, now)}
          error={errKind ? F.errors?.[errKind] : null}
          F={F}
          testId="education-to"
        />
      </div>
      <div className="msc-add-actions">
        <button type="button" className="admin-notif-btn is-soft is-sm" onClick={onCancel}>{L.cancel}</button>
        <button
          type="button"
          className="admin-notif-btn is-primary is-sm"
          disabled={!canAdd}
          onClick={submit}
          data-testid="education-add-submit"
        >
          {L.add}
        </button>
      </div>
    </div>
  );
}
