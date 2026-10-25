import FormField from '../shared/FormField.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import { PlusGlyph } from '../shared/lineIcons.jsx';
import Button from '../shared/Button.jsx';

/**
 * 내 설정의 «여러 건을 추가·지우는» 목록 칸 부품 (pivit-work PW-2188).
 *
 * 부양가족(가족 정보)과 학력·경력·자격증·증명서 첨부(조직 정보)가 같은 부품을 쓴다. 디자이너가 내 설정을
 * 직접 그린 적은 없어서, 디자이너가 그린 1:1 일정 추가 창의 «구성원 줄»·«칸 제목 + 입력»과 1:1 기록의
 * «작은 칩» 값을 따랐다. 점선 추가 줄·입력 묶음의 연초록 바탕·실패 안내 상자는 개발이 정한 것이라
 * 디자이너 검수 대상이다(design-review). 모양은 settings.css 의 `msc-rec-*`.
 */

/** 목록 — 줄 사이를 얇은 선으로 나눈 한 상자 */
export function RecordList({ children, testId }) {
  return <div className="msc-rec-list" data-testid={testId}>{children}</div>;
}

/**
 * 목록 줄 하나 — 앞 표시(이름 첫 글자 동그라미 또는 아이콘) · 이름(굵게) + 칩 · 아래 회색 한 줄 · 오른쪽 배지와 버튼.
 * `children` 이 있으면 줄 아래에 붙는다(그 줄을 고치는 칸).
 */
export function RecordRow({ lead, name, chips = [], tag, sub, badge, actions, testId, editing = false, children }) {
  return (
    <div className={`msc-rec-item${editing ? ' is-editing' : ''}`} data-testid={testId}>
      <div className="msc-rec-row">
        {lead}
        <div className="msc-rec-info">
          <div className="msc-rec-name-row">
            <span className="msc-rec-name">{name}</span>
            {chips.filter(Boolean).map((c, i) => <RecordChip key={i}>{c}</RecordChip>)}
            {tag}
          </div>
          {sub ? <div className="msc-rec-sub">{sub}</div> : null}
        </div>
        {badge}
        {actions ? <div className="msc-rec-actions">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

/** 작은 칩 — 1:1 기록 «작은 칩»(ono-mem-chip) 그대로. `brand` 는 이 화면의 초록 딱지(msc-vis-badge is-brand) */
export function RecordChip({ brand = false, children }) {
  return <StatusBadge className={brand ? 'msc-vis-badge is-brand' : 'ono-mem-chip'}>{children}</StatusBadge>;
}

/** 이름 첫 글자 동그라미 — 사람 줄(부양가족) */
export function RecordAvatar({ name }) {
  const first = (name || '').trim().charAt(0);
  return <span className="msc-rec-avatar" aria-hidden>{first}</span>;
}

/** 네모 아이콘 자리 — 사람이 아닌 줄(학교·회사·자격증·파일) */
export function RecordGlyph({ children }) {
  return <span className="msc-rec-glyph" aria-hidden>{children}</span>;
}

/** 줄 오른쪽 회색 아이콘 버튼. `danger` 면 마우스를 올렸을 때만 빨강 */
export function RecordIconButton({ label, onClick, danger = false, disabled = false, testId, children }) {
  return (
    <button
      type="button"
      className={`msc-rec-icon-btn${danger ? ' is-danger' : ''}`}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      data-testid={testId}
    >
      {children}
    </button>
  );
}

/** 카드 폭 점선 추가 줄 */
export function RecordAddRow({ onClick, testId, children }) {
  return (
    <button type="button" className="msc-rec-add" onClick={onClick} data-testid={testId}>
      <PlusGlyph size={16} />
      {children}
    </button>
  );
}

/** 입력 칸 묶음 — 연초록 바탕 + 왼쪽 초록 선. 목록 아래(추가)나 줄 안(고치기)에 놓인다 */
export function RecordForm({ children, testId }) {
  return <div className="msc-rec-form" data-testid={testId}>{children}</div>;
}

/** 칸 수에 맞춘 한 줄 — `cols` 2·3·4 */
export function RecordGrid({ cols, children }) {
  return <div className={`msc-rec-grid is-${cols}`}>{children}</div>;
}

/** 칸 하나 — 위에 이름표, 이름표 옆에 짧은 안내(`note`), 아래에 오류 */
export function RecordField({ label, note, error, errorTestId, children }) {
  return (
    <FormField
      className="msc-rec-field"
      labelClassName="msc-rec-label"
      label={label}
      error={error}
      errorTestId={errorTestId}
      labelExtra={note ? <span className="msc-rec-label-note">· {note}</span> : undefined}
    >
      {children}
    </FormField>
  );
}

/** 묶음 맨 아래 — 왼쪽에 전체 실패 안내(있을 때만), 오른쪽에 취소·저장 */
export function RecordFormFoot({ error, errorTestId, cancelLabel, onCancel, submitLabel, onSubmit, submitDisabled, submitTestId }) {
  return (
    <div className="msc-rec-foot">
      {error ? (
        <div className="msc-rec-alert" role="alert" data-testid={errorTestId}>{error}</div>
      ) : <span className="msc-rec-spacer" />}
      <Button variant="secondary" size="sm" className="admin-notif-btn" onClick={onCancel}>{cancelLabel}</Button>
      <Button variant="primary" size="sm" className="admin-notif-btn" onClick={onSubmit} disabled={submitDisabled} data-testid={submitTestId}>
        {submitLabel}
      </Button>
    </div>
  );
}
