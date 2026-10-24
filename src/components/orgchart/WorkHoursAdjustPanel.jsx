import SegmentedControl from '../shared/SegmentedControl.jsx';
import FormField, { FieldError } from '../shared/FormField.jsx';
import DateInput from '../shared/DateInput.jsx';
import Select from '../shared/Select.jsx';
import TextInput from '../shared/TextInput.jsx';
import Button from '../shared/Button.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import { CloseGlyph } from '../shared/lineIcons.jsx';

/**
 * 공개 카드 «근무시간 조정» 창 — 본인 카드의 근무시간 칸을 누르면 카드 안에 펼쳐진다
 * (pivit-specs `K. 내-설정/Public-Card/screen-profile-work-hours.policy.md` §2-2 · pivit-work PW-1479).
 *
 * 화면만 그린다 — 값 검사·저장·삭제·확인 창은 소비자가 갖는다. 문구도 전부 `labels` 로 받는다.
 *
 * 생김새는 같은 창(ProfileModal)의 디자이너 모양을 따른다 — 머리글은 `.modal-info-label`,
 * 내역 줄은 «담당 프로젝트» 줄(`.modal-project-item`), 단건/기간 딱지는 소속 칩(`.modal-team-chip`),
 * 칸·버튼·범위 고르기는 공용 부품(FormField·DateInput·Select·TextInput·Button·SegmentedControl).
 *
 * Props:
 *   labels     { title, scope, scopeToday, scopeDate, scopeRange, date, range, rangeSep, time, timeSep,
 *                start, end, memo, memoOptional, memoPlaceholder, save, saving, cancel, history, showAll,
 *                showLess, delete }
 *   value      { scope: 'today'|'date'|'range', date, rangeStart, rangeEnd, start, end, memo }
 *   errors     { date, range, time, memo } — 칸 바로 아래에 뜬다
 *   formError  저장 실패 문구 — 버튼 위에 뜨고 창은 그대로다
 *   onChange   (patch) => void
 *   onSave, onCancel
 *   saving     저장 중 — 칸이 잠기고 버튼이 «저장 중»
 *   timeOptions [{ value, label }] — 30분 단위 시각
 *   minDate, maxDate, today  'YYYY-MM-DD' — 달력이 고를 수 있는 범위·오늘
 *   locale     달력 언어
 *   memoMaxLength 메모 길이 한도 — 소비자가 서버와 같은 표에서 넘긴다
 *   history    [{ id, dateText, kindLabel, timeText, memo }] — 이미 정해 둔 조정
 *   historyLimit 기본 5 — 넘으면 «전체 보기»
 *   showAll, onToggleShowAll
 *   deletingId 지우는 중인 줄 — 흐려지고 × 가 잠긴다
 *   onDelete   (id) => void
 */
export default function WorkHoursAdjustPanel({
  labels: L,
  value,
  errors = {},
  formError,
  onChange,
  onSave,
  onCancel,
  saving = false,
  timeOptions,
  minDate,
  maxDate,
  today,
  locale,
  memoMaxLength,
  history = [],
  historyLimit = 5,
  showAll = false,
  onToggleShowAll,
  deletingId,
  onDelete,
}) {
  const shownHistory = showAll ? history : history.slice(0, historyLimit);
  return (
    <section className="modal-wh-panel" aria-label={L.title} data-testid="work-hours-panel">
      <div className="modal-info-label">{L.title}</div>

      <FormField label={L.scope} group>
        <SegmentedControl
          block
          ariaLabel={L.scope}
          value={value.scope}
          onChange={(scope) => onChange({ scope })}
          items={[
            { value: 'today', label: L.scopeToday, disabled: saving, testId: 'work-hours-scope-today' },
            { value: 'date', label: L.scopeDate, disabled: saving, testId: 'work-hours-scope-date' },
            { value: 'range', label: L.scopeRange, disabled: saving, testId: 'work-hours-scope-range' },
          ]}
        />
      </FormField>

      {value.scope === 'date' && (
        <FormField label={L.date} error={errors.date}>
          <DateInput
            className="dp-input modal-wh-date"
            value={value.date}
            onChange={(date) => onChange({ date })}
            min={minDate}
            max={maxDate}
            today={today}
            locale={locale}
            disabled={saving}
            data-testid="work-hours-date"
          />
        </FormField>
      )}

      {value.scope === 'range' && (
        <FormField label={L.range} group error={errors.range}>
          <div className="modal-wh-pair">
            <DateInput
              className="dp-input modal-wh-date"
              aria-label={L.rangeStartLabel}
              value={value.rangeStart}
              onChange={(rangeStart) => onChange({ rangeStart })}
              min={minDate}
              max={maxDate}
              today={today}
              locale={locale}
              disabled={saving}
              data-testid="work-hours-range-start"
            />
            <span className="modal-wh-sep" aria-hidden>{L.rangeSep}</span>
            <DateInput
              className="dp-input modal-wh-date"
              aria-label={L.rangeEndLabel}
              value={value.rangeEnd}
              onChange={(rangeEnd) => onChange({ rangeEnd })}
              min={value.rangeStart || minDate}
              today={today}
              locale={locale}
              disabled={saving}
              data-testid="work-hours-range-end"
            />
          </div>
        </FormField>
      )}

      <FormField label={L.time} group error={errors.time}>
        <div className="modal-wh-pair">
          <Select
            aria-label={L.start}
            value={value.start}
            options={timeOptions}
            onChange={(e) => onChange({ start: e.target.value })}
            disabled={saving}
            data-testid="work-hours-start"
          />
          <span className="modal-wh-sep" aria-hidden>{L.timeSep}</span>
          <Select
            aria-label={L.end}
            value={value.end}
            options={timeOptions.map((o) => ({ ...o, disabled: !!value.start && o.value <= value.start }))}
            onChange={(e) => onChange({ end: e.target.value })}
            disabled={saving}
            data-testid="work-hours-end"
          />
        </div>
      </FormField>

      <FormField
        label={<>{L.memo} <span className="modal-wh-optional">{L.memoOptional}</span></>}
        error={errors.memo}
        hint={memoMaxLength ? `${value.memo.length}/${memoMaxLength}` : undefined}
       
      >
        <TextInput
          value={value.memo}
          onChange={(e) => onChange({ memo: e.target.value })}
          placeholder={L.memoPlaceholder}
          maxLength={memoMaxLength}
          disabled={saving}
          data-testid="work-hours-memo"
        />
      </FormField>

      {formError && <FieldError role="alert" data-testid="work-hours-form-error">{formError}</FieldError>}

      <div className="modal-wh-actions">
        <Button variant="secondary" onClick={onCancel} disabled={saving} data-testid="work-hours-cancel">
          {L.cancel}
        </Button>
        <Button variant="primary" pending={saving} onClick={onSave} data-testid="work-hours-save">
          {saving ? L.saving : L.save}
        </Button>
      </div>

      {history.length > 0 && (
        <div className="modal-wh-history" data-testid="work-hours-history">
          <div className="modal-wh-history-head">
            <span className="modal-info-label">{L.history}</span>
            {history.length > historyLimit && onToggleShowAll && (
              <button type="button" className="modal-wh-link" onClick={onToggleShowAll} data-testid="work-hours-show-all">
                {showAll ? L.showLess : L.showAll}
              </button>
            )}
          </div>
          <ul className="modal-project-list">
            {shownHistory.map((h) => (
              <li
                key={h.id}
                className={`modal-project-item modal-wh-item ${deletingId === h.id ? 'is-deleting' : ''}`.trim()}
                data-testid="work-hours-history-item"
              >
                <span className="modal-wh-item-main">
                  <span className="modal-wh-item-date">{h.dateText}</span>
                  <StatusBadge tone="neutral" className="modal-team-chip">{h.kindLabel}</StatusBadge>
                  <span className="modal-wh-item-time">{h.timeText}</span>
                  {h.memo && <span className="modal-wh-item-memo">· {h.memo}</span>}
                </span>
                <button
                  type="button"
                  className="modal-wh-delete"
                  aria-label={`${L.delete} ${h.dateText}`}
                  disabled={!!deletingId}
                  onClick={() => onDelete(h.id)}
                  data-testid="work-hours-delete"
                >
                  <CloseGlyph size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
