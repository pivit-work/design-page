/**
 * 외부 전사 가져오기 창 안쪽 부품 (pivit-work PW-2992 · 개발 추가 · design-review).
 *
 * 창 틀은 디자이너 «그룹 추가» 창(ModalShell)이고, 이 창 전용 원본은 없다. 커트가 11-18 검토한 시안
 * (pivit-work worklog/meeting-import-reconsent-designer-2026-11-18)을 설계도로, 값은 이미 있는 디자이너 부품에서 가져왔다.
 *   - 칸 이름표·칸 간격·두 칸 한 줄 — 원온원 «1on1 추가» 창(.ono-add-modal-field-label · -field · -row)
 *   - 체크 20px — 회의록 공유 창 체크(.mtg-share-checkbox)
 *   - 회색 동의 칸 — 가입 화면 안내 상자(.login-notice 의 alpha-black-3 · r10)
 *   - 오류·경고 글 — 칸 오류 글(p.dp-field-error) 12px · 경고는 .login-warning 의 경고 토큰
 * 모양은 meetings.css «외부 전사 가져오기 창» 절.
 */
import { useId } from 'react';
import Button from '../shared/Button.jsx';
import {
  AlertCircleGlyph,
  AlertTriangleGlyph,
  CalendarGlyph,
  CheckGlyph,
  ClockGlyph,
} from '../shared/lineIcons.jsx';

const cx = (...xs) => xs.filter(Boolean).join(' ');
const GLYPH = { focusable: false, 'aria-hidden': true };

/** 이름표 옆 작은 글 — «고르지 않아도 됩니다». FormField label 안에 이름표 글과 함께 넣는다. */
export function ImportLabelNote({ children }) {
  return <small className="mtg-import-label-note">{children}</small>;
}

/**
 * 하나만 고르는 칩 줄 — 고르지 않아도 되는 칸. 누르면 고르고, 고른 칩을 다시 누르면 푼다(onChange(null)).
 * options: [{ value, label }]
 */
export function ImportChips({ options = [], value = null, onChange, disabled = false, label, testId }) {
  return (
    <div className="mtg-import-chips" role="group" aria-label={label} data-testid={testId}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Button
            key={o.value}
            className={cx('mtg-import-chip', on && 'is-on')}
            aria-pressed={on}
            disabled={disabled}
            onClick={() => onChange?.(on ? null : o.value)}
            data-testid={testId ? `${testId}-${o.value}` : undefined}
          >
            {o.label}
          </Button>
        );
      })}
    </div>
  );
}

/** 두 칸을 한 줄에 — 원온원 «1on1 추가» 창 날짜·시간 줄(.ono-add-modal-row · gap 17). 뒤 칸은 `narrow` 면 150. */
export function ImportFieldRow({ children }) {
  return <div className="ono-add-modal-row mtg-import-row">{children}</div>;
}

/** 칸 오른쪽에 달력·시계 아이콘을 얹는다 — 아이콘은 누름을 받지 않아 칸을 눌러 연다. */
export function ImportIconInput({ icon = 'calendar', children }) {
  const Glyph = icon === 'clock' ? ClockGlyph : CalendarGlyph;
  return (
    <div className="mtg-import-icon-input">
      {children}
      <Glyph size={18} {...GLYPH} className="mtg-import-icon-input-glyph" />
    </div>
  );
}

/** 칸 아래 한 줄 — muted(흐린 안내) · warning(채워야 할 곳 · 주황 + 경고 아이콘) · error(빨강 + 아이콘). */
export function ImportHint({ tone = 'muted', role, testId, children }) {
  const Glyph = tone === 'error' ? AlertCircleGlyph : tone === 'warning' ? AlertTriangleGlyph : null;
  return (
    <p className={cx('mtg-import-hint', tone !== 'muted' && `is-${tone}`)} role={role} data-testid={testId}>
      {Glyph && <Glyph size={14} {...GLYPH} />}
      <span>{children}</span>
    </p>
  );
}

/**
 * 20px 체크 네모 — 회의록 공유 창 체크(.mtg-share-checkbox)와 같은 값. 진짜 checkbox 라 글(label)을 눌러도 켜진다.
 * 재동의 창 동의 줄도 이것을 쓴다.
 */
export function ModalCheck({ id, checked, onChange, disabled = false, testId, ariaLabel }) {
  return (
    <span className="mtg-modal-check">
      <input
        id={id}
        type="checkbox"
        className="mtg-modal-check-input"
        checked={!!checked}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => onChange?.(e.target.checked)}
        data-testid={testId}
      />
      {checked && <CheckGlyph size={12} strokeWidth={3.5} {...GLYPH} className="mtg-modal-check-mark" />}
    </span>
  );
}

/** 회색 칸 하나에 체크 + 굵은 첫 줄 + 둘째 줄 안내 — [가져오기]를 켜는 동의 확인(기획서 동의 행). */
export function ImportAgree({ checked, onChange, disabled = false, title, sub, testId }) {
  const id = useId();
  return (
    <div className="mtg-import-agree">
      <ModalCheck id={id} checked={checked} onChange={onChange} disabled={disabled} testId={testId} />
      <label htmlFor={id} className="mtg-import-agree-text">
        <b className="mtg-import-agree-title">{title}</b>
        {sub && <span className="mtg-import-agree-sub">{sub}</span>}
      </label>
    </div>
  );
}
