import { useState } from 'react';
import ModalShell from '../shared/ModalShell.jsx';
import Button from '../shared/Button.jsx';
import FormField, { FieldError } from '../shared/FormField.jsx';
import TextInput from '../shared/TextInput.jsx';
import TextArea from '../shared/TextArea.jsx';
import Radio from '../shared/Radio.jsx';
import Icon from '../shared/Icon.jsx';
import { DatePickerPopover, TIME_SLOTS } from './AddOneOnOneModal.jsx';
import { fill } from './sessionHelpers.js';

/**
 * 팀원의 1on1 신청 창 (pivit-work PW-2639 · 기획 oneonone-spec §13-10 «신청 창» · policy §6.8).
 *
 * 디자이너 원본이 없어 같은 화면군의 1on1 예약 창(`AddOneOnOneModal`)의 틀 · 칸 · 라디오 카드 ·
 * 날짜 피커 · 시각 목록 · 안내 줄 · 실패 줄을 그대로 쓴다 — 새 모양을 만들지 않는다.
 *
 * `onSubmit` 은 끝나기를 기다린다. 거부되면 창과 입력을 그대로 두고 `Error.message`(없으면
 * `labels.submitFailed`)를 버튼 위 빨간 줄로 보인다.
 */
export const DEFAULT_LABELS = {
  title: '1on1 신청',
  close: '닫기',
  to: '받는 사람',
  toValue: '{name} 매니저',
  upcomingNotice:
    '{when}에 잡힌 1on1 이 있습니다. 그때 이야기해도 된다면 그 1on1 준비 화면의 논의 주제에 적어 주세요.',
  text: '나누고 싶은 이야기',
  textPlaceholder: '어떤 이야기를 나누고 싶은지 적어 주세요. 매니저에게 그대로 보입니다.',
  textCount: '{count}/{max}',
  wish: '희망 시기',
  wishManager: '매니저가 정해 주세요',
  wishWeek: '이번 주 안에',
  wishPick: '날짜 · 시각 지정',
  duration: '미팅 길이',
  duration25: '25분',
  duration55: '55분',
  durationCustom: '직접 입력',
  durationCustomPlaceholder: '분을 입력하세요 (비우면 55분)',
  pastTime: '지난 시간은 선택할 수 없습니다',
  cancel: '취소',
  submit: '신청 보내기',
  submitting: '보내는 중…',
  submitFailed: '1on1 신청을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.',
  prevMonth: '이전 달',
  nextMonth: '다음 달',
};

export const REQUEST_TEXT_MAX = 300;

function tomorrow() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1);
}

function isPastLocal(date, time24) {
  const [h, m] = String(time24).split(':').map(Number);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m).getTime() <= Date.now();
}

/** 직접 입력 — 5분 이상인 정수만 길이로 읽고, 그 밖(빈칸 포함)은 비운 것으로 본다(서버가 55분으로 읽는다 · §13-10). */
function customMinutes(raw) {
  const n = parseInt(String(raw).match(/\d+/)?.[0] ?? '', 10);
  return Number.isFinite(n) && n >= 5 ? n : null;
}

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {string} props.managerName 받는 사람 — «내 매니저»
 * @param {string|null} [props.upcomingLabel] 잡아 둔 1on1 일시 글자 — 있으면 안내 한 줄(신청은 막지 않는다)
 * @param {(data: {text: string, wish: 'manager'|'week'|'pick', date: Date|null, time24: string|null, durationMin: number|null}) => Promise<void>|void} props.onSubmit
 */
export default function MemberRequestModal({
  open,
  managerName,
  upcomingLabel = null,
  onClose,
  onSubmit,
  labels,
  locale = 'ko',
  icons,
  baseUrl = '',
  isPastStart = isPastLocal,
}) {
  const L = { ...DEFAULT_LABELS, ...(labels || {}) };
  const [text, setText] = useState('');
  const [wish, setWish] = useState('manager');
  const [date, setDate] = useState(tomorrow);
  const [dateOpen, setDateOpen] = useState(false);
  const [time, setTime] = useState('10:00');
  const [timeOpen, setTimeOpen] = useState(false);
  const [duration, setDuration] = useState('55');
  const [custom, setCustom] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (typeof document === 'undefined' || !open) return null;

  const empty = !text.trim();
  const isPast = wish === 'pick' && !!isPastStart(date, time);
  const atMax = text.length >= REQUEST_TEXT_MAX;
  const dateLabel = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' }).format(date);

  const submit = async () => {
    if (saving || empty || isPast) return;
    setError('');
    setSaving(true);
    try {
      await onSubmit?.({
        text: text.trim(),
        wish,
        date: wish === 'pick' ? date : null,
        time24: wish === 'pick' ? time : null,
        durationMin: duration === 'custom' ? customMinutes(custom) : Number(duration),
      });
    } catch (err) {
      setError((err && err.message) || L.submitFailed);
    } finally {
      setSaving(false);
    }
  };

  const closePopovers = () => {
    setDateOpen(false);
    setTimeOpen(false);
  };

  return (
    <ModalShell
      title={L.title}
      titleId="ono-request-modal-title"
      closeLabel={L.close}
      onClose={() => onClose?.()}
      busy={saving}
      zIndex={1001}
      className="ono-add-shell"
      testId="ono-request-modal"
      overlayTestId="ono-request-modal-overlay"
      footer={
        <>
          {/* 예약 창 발 줄과 같은 모양(클래스)을 공용 버튼에 얹는다 — 모양은 그 창 그대로. */}
          <Button className="tl-group-modal-btn tl-group-modal-btn-secondary" onClick={onClose} disabled={saving}>
            {L.cancel}
          </Button>
          <Button
            className="tl-group-modal-btn tl-group-modal-btn-primary"
            data-testid="ono-request-modal-submit"
            onClick={() => void submit()}
            disabled={empty || saving || isPast}
          >
            {saving ? L.submitting : L.submit}
          </Button>
        </>
      }
    >
      <div className="ono-add-modal-form" onClick={closePopovers}>
        <Field label={L.to}>
          <p className="ono-add-modal-member-name" data-testid="ono-request-modal-to">
            {fill(L.toValue, { name: managerName })}
          </p>
        </Field>

        {upcomingLabel && (
          <p className="tl-event-helper ono-add-modal-hint" data-testid="ono-request-modal-upcoming">
            {fill(L.upcomingNotice, { when: upcomingLabel })}
          </p>
        )}

        <Field
          label={L.text}
          hint={atMax ? undefined : fill(L.textCount, { count: text.length, max: REQUEST_TEXT_MAX })}
          error={atMax ? fill(L.textCount, { count: REQUEST_TEXT_MAX, max: REQUEST_TEXT_MAX }) : undefined}
        >
          <TextArea
            className="ono-add-modal-textarea"
            placeholder={L.textPlaceholder}
            value={text}
            maxLength={REQUEST_TEXT_MAX}
            onChange={(e) => setText(e.target.value.slice(0, REQUEST_TEXT_MAX))}
            data-testid="ono-request-modal-text"
          />
        </Field>

        <Field label={L.wish} group>
          <div className="ono-add-modal-radio-group">
            {[
              ['manager', L.wishManager],
              ['week', L.wishWeek],
              ['pick', L.wishPick],
            ].map(([key, label]) => (
              <Radio
                key={key}
                variant="card"
                name="ono-request-wish"
                value={key}
                checked={wish === key}
                onChange={() => setWish(key)}
                label={label}
                data-testid={`ono-request-wish-${key}`}
              />
            ))}
          </div>
        </Field>

        {wish === 'pick' && (
          <div>
            <div className="ono-add-modal-row">
              <Field label={null}>
                <div className="ono-add-modal-popover-wrap" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="ono-add-modal-input ono-add-modal-input-with-icon"
                    data-testid="ono-request-modal-date"
                    onClick={() => { setDateOpen((v) => !v); setTimeOpen(false); }}
                  >
                    <Icon src={icons?.calendar} size={20} color="var(--text-secondary)" baseUrl={baseUrl} />
                    <span className="ono-add-modal-input-text">{dateLabel}</span>
                  </button>
                  {dateOpen && (
                    <DatePickerPopover
                      value={date}
                      onChange={(d) => { setDate(d); setDateOpen(false); }}
                      locale={locale}
                      labels={L}
                    />
                  )}
                </div>
              </Field>
              <Field label={null}>
                <div className="ono-add-modal-popover-wrap" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="ono-add-modal-input"
                    data-testid="ono-request-modal-time"
                    onClick={() => { setTimeOpen((v) => !v); setDateOpen(false); }}
                  >
                    <span className="ono-add-modal-input-text">{time}</span>
                    <Icon src={icons?.chevronDown} size={20} color="var(--text-secondary)" baseUrl={baseUrl} />
                  </button>
                  {timeOpen && (
                    <div className="ono-add-modal-menu ono-add-modal-menu-time">
                      {TIME_SLOTS.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          className={`ono-add-modal-menu-item ${slot === time ? 'is-selected' : ''}`}
                          onClick={() => { setTime(slot); setTimeOpen(false); }}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </Field>
            </div>
            {isPast && (
              <FieldError id="ono-request-modal-past" data-testid="ono-request-modal-past">{L.pastTime}</FieldError>
            )}
          </div>
        )}

        <Field label={L.duration} group>
          <div className="ono-add-modal-radio-group">
            {[
              ['25', L.duration25],
              ['55', L.duration55],
              ['custom', L.durationCustom],
            ].map(([key, label]) => (
              <Radio
                key={key}
                variant="card"
                name="ono-request-duration"
                value={key}
                checked={duration === key}
                onChange={() => setDuration(key)}
                label={label}
                data-testid={`ono-request-duration-${key}`}
              />
            ))}
          </div>
          {duration === 'custom' && (
            <div className="ono-add-modal-input">
              <TextInput
                type="number"
                min={5}
                placeholder={L.durationCustomPlaceholder}
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                className="ono-add-modal-input-el"
                aria-label={L.durationCustom}
                data-testid="ono-request-duration-input"
              />
            </div>
          )}
        </Field>

        {error && (
          <p className="ono-done-inline-error" role="alert" data-testid="ono-request-modal-error">
            {error}
          </p>
        )}
      </div>
    </ModalShell>
  );
}

/** 예약 창과 같은 칸 틀 — 공용 이름표 · 안내 · 오류 틀에 그 창의 모양 클래스를 얹는다. */
function Field({ label, group = false, hint, error, children }) {
  return (
    <FormField
      label={label}
      group={group}
      hint={hint}
      error={error}
      className="ono-add-modal-field"
      labelClassName="ono-add-modal-field-label"
    >
      {children}
    </FormField>
  );
}
