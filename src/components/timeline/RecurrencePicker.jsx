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
 *   notices      [{ text, tone?: 'warning' | 'error', actions?: [{ label, onClick, testId }], detail?, testId }] — 팝업이 바닥에 띄울 안내
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
        /* 맞춤 칸 (pivit-work PW-2989) — 흰 칸 + 가는 테두리, 왼쪽 이름표 열 · 오른쪽 값. 머리 줄 오른쪽에 [완료]. */
        <div className="tl-recurrence-panel" data-testid={`${testId}-custom`}>
          <div className="tl-recurrence-panel-head">
            <span className="tl-event-label tl-recurrence-label">{labels.customTitle}</span>
            <Button type="button" variant="secondary" size="sm" data-testid={`${testId}-custom-done`} onClick={onCustomDone}>
              {labels.done}
            </Button>
          </div>
          <span className="tl-recurrence-key">{labels.interval}</span>
          <div className="tl-recurrence-row">
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
            <>
              <span className="tl-recurrence-key">{labels.weekdays}</span>
              <div className="tl-recurrence-row tl-recurrence-weekdays" role="group" aria-label={labels.weekdays}>
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
            </>
          )}
          {unit === 'month' && (
            <div className="tl-recurrence-row tl-recurrence-value">
              <CustomSelect id={`${testId}-month-mode`} size="md" ariaLabel={labels.customTitle} value={monthMode} onChange={onMonthModeChange} options={monthModeOptions} />
            </div>
          )}
        </div>
      )}

      {notices.map((n, i) => (
        /* tone 'error' — 막는 안내(끝없는 반복과 회의실 · pivit-work PW-2638 TC-1ON1-216 «빨간 한 줄»)는 공용 칸 오류 글씨. */
        n.tone === 'error' ? (
          <p key={i} className="dp-field-error" role="status" data-testid={n.testId}>{n.text}</p>
        ) : (
        /* 글과 버튼 · 버튼과 버튼 사이를 바닥 버튼 묶음과 같은 간격으로 띄운다 — 글이 길어 줄이 넘어가도 붙지 않는다(pivit-work PW-2989 · 11-18 커트). */
        <div key={i} className={`tl-event-helper tl-recurrence-notice${n.tone === 'warning' ? ' is-warning' : ''}`} role="status" data-testid={n.testId}>
          <span>{n.text}</span>
          {(n.actions || []).map((a) => (
            <Button key={a.testId || a.label} type="button" variant="ghost" size="sm" data-testid={a.testId} onClick={a.onClick}>
              {a.label}
            </Button>
          ))}
          {n.detail && <span className="tl-recurrence-detail">{n.detail}</span>}
        </div>
        )
      ))}
    </div>
  );
}
