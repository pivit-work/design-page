import Button from '../shared/Button.jsx';
import DateInput from '../shared/DateInput.jsx';
import CustomSelect from './CustomSelect.jsx';

/**
 * RecurrencePicker — «반복 · 종료 · 맞춤» 고르기 (pivit-work PW-2637 · 기획 arch-meeting-room §5-B · 타임라인 정책서 §7.8 A).
 *
 * «일시 · 회의실» 고르기 팝업 바닥(고른 것 한 줄 위)과 날짜를 넘겨 직접 입력하는 칸 아래에 놓인다. 1on1 예약 창도 같은 부품을 쓴다.
 * 화면만 그린다 — 선택지 글자 · 값 · 바꾸기는 호스트가 준다.
 *
 * 디자이너 원본은 없다. 같은 «이벤트 추가» 창의 이름표(`.tl-event-label`) · 고르기 칸(`CustomSelect md`) · 날짜 칸
 * (`DateInput` + `.tl-emp-input`) · 유형 알약(`.tl-event-radio-pill`) · 도움말 글씨(`.tl-event-helper`)를 그대로 쓰고,
 * 맞춤 패널 바탕은 고르기 팝업의 칸 줄 바탕(`--bg-secondary` · `--border-secondary`)과 같다. 디자이너 검수 대상(design-review).
 *
 * Props:
 *   labels       { repeat, end, countUnit, untilDate, countInput, customTitle, interval, every, weekdays, done, edit }
 *   kind, kindOptions, onKindChange             반복 선택지(«반복 안 함»이 첫 값 'none')
 *   endType, endOptions, onEndTypeChange       종료(none · date · count) — kind 가 'none' 이면 그리지 않는다
 *   untilDate, minDate, onUntilChange           «날짜까지»
 *   count, onCountChange                        «횟수»
 *   customOpen, onEditCustom, onCustomDone      맞춤 패널 열림 · [맞춤 고치기] · [완료]
 *   interval, onIntervalChange, unit, unitOptions, onUnitChange
 *   weekdayItems [{ index, label, on }], onToggleWeekday(index)   unit === 'week' 일 때
 *   monthMode, monthModeOptions, onMonthModeChange                unit === 'month' 일 때
 *   notices      [{ text, tone?: 'warning', actions?: [{ label, onClick, testId }], detail?, testId }] — 팝업이 바닥에 띄울 안내
 *                (끝없는 반복 · 겹치는 회차). 반복 고르기 바로 아래에 놓인다
 *   testId
 */
export default function RecurrencePicker({
  labels,
  kind,
  kindOptions,
  onKindChange,
  endType,
  endOptions,
  onEndTypeChange,
  untilDate,
  minDate,
  onUntilChange,
  count,
  onCountChange,
  customOpen,
  onEditCustom,
  onCustomDone,
  interval,
  onIntervalChange,
  unit,
  unitOptions,
  onUnitChange,
  weekdayItems = [],
  onToggleWeekday,
  monthMode,
  monthModeOptions = [],
  onMonthModeChange,
  notices = [],
  testId = 'recurrence',
}) {
  const repeating = kind !== 'none';
  return (
    <div className="tl-recurrence" data-testid={testId}>
      <div className="tl-recurrence-row">
        <span className="tl-event-label tl-recurrence-label">{labels.repeat}</span>
        <CustomSelect id={`${testId}-kind`} size="md" ariaLabel={labels.repeat} value={kind} onChange={onKindChange} options={kindOptions} />
        {repeating && (
          <>
            <span className="tl-event-label tl-recurrence-label">{labels.end}</span>
            <CustomSelect id={`${testId}-end`} size="md" ariaLabel={labels.end} value={endType} onChange={onEndTypeChange} options={endOptions} />
            {endType === 'date' && (
              <DateInput
                className="tl-emp-input tl-recurrence-date"
                value={untilDate || ''}
                min={minDate}
                aria-label={labels.untilDate}
                data-testid={`${testId}-until`}
                onChange={onUntilChange}
              />
            )}
            {endType === 'count' && (
              <span className="tl-recurrence-inline">
                <input
                  type="number"
                  min={1}
                  className="tl-emp-input tl-recurrence-number"
                  aria-label={labels.countInput}
                  data-testid={`${testId}-count`}
                  value={count}
                  onChange={(e) => onCountChange(e.target.value)}
                />
                <span className="tl-event-helper">{labels.countUnit}</span>
              </span>
            )}
            {kind === 'custom' && !customOpen && (
              <Button type="button" variant="ghost" size="sm" data-testid={`${testId}-custom-edit`} onClick={onEditCustom}>
                {labels.edit}
              </Button>
            )}
          </>
        )}
      </div>

      {kind === 'custom' && customOpen && (
        <div className="tl-recurrence-panel" data-testid={`${testId}-custom`}>
          <span className="tl-event-label tl-recurrence-label">{labels.customTitle}</span>
          <div className="tl-recurrence-row">
            <span className="tl-event-helper">{labels.interval}</span>
            <input
              type="number"
              min={1}
              className="tl-emp-input tl-recurrence-number"
              aria-label={labels.interval}
              data-testid={`${testId}-interval`}
              value={interval}
              onChange={(e) => onIntervalChange(e.target.value)}
            />
            <CustomSelect id={`${testId}-unit`} size="md" ariaLabel={labels.interval} value={unit} onChange={onUnitChange} options={unitOptions} />
            <span className="tl-event-helper">{labels.every}</span>
          </div>
          {unit === 'week' && (
            <div className="tl-recurrence-row" role="group" aria-label={labels.weekdays}>
              <span className="tl-event-helper">{labels.weekdays}</span>
              {weekdayItems.map((w) => (
                <button
                  key={w.index}
                  type="button"
                  aria-pressed={w.on}
                  data-testid={`${testId}-weekday-${w.index}`}
                  className={`tl-event-radio-pill${w.on ? ' is-selected' : ''}`}
                  onClick={() => onToggleWeekday(w.index)}
                >
                  {w.label}
                </button>
              ))}
            </div>
          )}
          {unit === 'month' && (
            <div className="tl-recurrence-row">
              <CustomSelect id={`${testId}-month-mode`} size="md" ariaLabel={labels.customTitle} value={monthMode} onChange={onMonthModeChange} options={monthModeOptions} />
            </div>
          )}
          <div className="tl-recurrence-row tl-recurrence-end">
            <Button type="button" variant="ghost" size="sm" data-testid={`${testId}-custom-done`} onClick={onCustomDone}>
              {labels.done}
            </Button>
          </div>
        </div>
      )}

      {notices.map((n, i) => (
        <span key={i} className={`tl-event-helper${n.tone === 'warning' ? ' is-warning' : ''}`} role="status" data-testid={n.testId}>
          {n.text}
          {(n.actions || []).map((a) => (
            <Button key={a.testId || a.label} type="button" variant="ghost" size="sm" data-testid={a.testId} onClick={a.onClick}>
              {a.label}
            </Button>
          ))}
          {n.detail && <span className="tl-recurrence-detail">{n.detail}</span>}
        </span>
      ))}
    </div>
  );
}
