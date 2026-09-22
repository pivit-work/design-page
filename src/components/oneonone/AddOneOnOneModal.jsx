import { useMemo, useRef, useState } from 'react';
import ModalShell from '../shared/ModalShell.jsx';
import Icon from '../shared/Icon.jsx';

/**
 * "1on1 일정 추가 / 1on1 잡기" 모달.
 *
 * 두 가지 모드:
 *  1) member 미지정 — "1on1 일정 추가" (Figma 16955:18943): 상단에 팀원 검색.
 *  2) member 지정   — "1on1 잡기" (Figma 16815:19137): 상단에 멤버 표시(아바타+
 *     이름+배지+직무), 검색 없음. 멤버 카드의 "1on1 잡기" 버튼에서 호출.
 *
 * 인터랙션: 날짜 picker / 시간 dropdown / 미팅 시간 "직접입력" 시 input.
 *
 * member shape: { name, role, avatar, badge? }
 *
 * members: 검색 dropdown 에 보일 팀원 이름 배열. 🔴 **배열이면 빈 배열도 그대로 존중한다**
 *   — 「담당 팀원이 0명」을 그릴 수 있어야 하기 때문이다. 예시 이름은 이 prop 을 아예
 *   넘기지 않았을 때(시안·데모)만 쓴다 (PW-824).
 *
 * defaultTime: 시간 칸의 기본값 — 로케일과 무관한 24시간 `'HH:MM'`. 「일정변경」처럼
 *   이미 잡혀 있는 시각을 채워 여는 자리에서 쓴다 (PW-825). 생략하면 `'10:00'` 이다.
 *   날짜와 마찬가지로 **마운트 시점에** 잡히므로, 열 때마다 새로 잡히게 하려면
 *   호출부가 열림 상태를 `key` 에 실어야 한다.
 *
 * defaultDate: 날짜 칸의 기본값(Date). 호스트 앱은 «사용자 시간대의 내일» 을 넘긴다.
 *   생략하면 브라우저 로컬 기준 내일로 폴백한다 — 어느 쪽이든 «지나간 날짜» 가
 *   기본값으로 남지 않는다.
 *
 * onDelete: 주면 푸터 왼쪽에 «없애기» 버튼이 생긴다 — 이미 잡아 둔 1on1 을 여는
 *   「일정변경」 자리에서 그 1on1 을 아예 없애기 위한 것이다 (PW-825). 안 주면 버튼이
 *   없고 종전 화면 그대로다. 되돌릴 수 없는 조작이라 **확인은 호스트가 받는다** —
 *   이 부품은 누르면 부르기만 한다.
 *
 * locale / labels: 모달 안 글자를 호스트가 번역할 자리 (PW-469).
 *   - labels: 고정 문구를 키별로 덮어쓴다. 안 넘긴 키는 한국어 기본값 그대로다.
 *   - locale: 날짜·요일·시간처럼 «글자» 가 아니라 «형식» 인 것을 정한다(Intl).
 *   둘 다 생략하면 종전과 100% 같은 화면이다.
 *
 * 창은 공용 창 틀(ModalShell)로 그린다 (PW-836). 닫혀 있는 동안에는 틀을 그리지 않지만,
 * 입력 상태는 이 컴포넌트가 들고 있어 종전처럼 열고 닫아도 남는다(새로 잡으려면 `key`).
 * Esc·막 클릭·닫기 X 는 틀이 onClose 로 부른다. 막의 data-testid 는 `ono-add-modal-overlay`,
 * 창은 `ono-add-modal`. 푸터 두 버튼은 `type="button"` 이다 — 틀은 폼(form)이라 기본
 * 제출 버튼을 쓰면 검색칸에서 Enter 만 눌러도 예약이 나가 버린다.
 */

/** 모달 안 고정 문구의 한국어 기본값. 호스트가 labels 로 키별 덮어쓰기 한다. */
export const DEFAULT_LABELS = {
  titleWithMember: '1on1 잡기',
  titleNoMember: '1on1 일정 추가',
  close: '닫기',
  memberSearch: '팀원 검색',
  memberSearchPlaceholder: '이름으로 검색 해주세요.',
  memberSearchEmpty: '검색 결과 없음',
  /* 검색어와 무관하게 «고를 팀원이 아예 없을» 때. 기본값은 위와 같은 글자라, 안 넘기면
     종전 화면 그대로다. 호스트는 화면 본문의 「팀원 0명」 안내와 같은 문구를 넘긴다 (PW-824). */
  memberEmpty: '검색 결과 없음',
  duration: '미팅 시간',
  duration25: '25분',
  duration55: '55분',
  durationCustom: '직접입력',
  durationCustomPlaceholder: '시간을 입력하세요 (예: 30분)',
  date: '날짜',
  time: '시간',
  memo: '메모 (선택)',
  memoPlaceholder: '사전 아젠다 또는 주요 논의 포인트를 메모하세요.',
  cancel: '취소',
  submit: '예약완료',
  /* 푸터 왼쪽 «없애기». `onDelete` 를 준 호출부에서만 보인다 (PW-825). */
  delete: '이 1on1 없애기',
  prevMonth: '이전 달',
  nextMonth: '다음 달',
};

function durationOptions(L) {
  return [
    { key: '25', label: L.duration25 },
    { key: '55', label: L.duration55 },
    { key: 'custom', label: L.durationCustom },
  ];
}

/* 시안·데모 화면용 예시 이름. 🔴 **호스트 앱이 `members` 를 넘기면 절대 쓰지 않는다** —
   빈 배열도 「담당 팀원이 없다」는 뜻이라 그대로 존중한다. 예전엔 `members.length > 0`
   으로 갈라서 «빈 목록»과 «안 넘김»이 같은 취급을 받았고, 팀원이 0명인 계정에서 이 일곱
   사람이 실재하는 팀원처럼 떴다 (PW-824). */
const DEMO_MEMBERS = ['김서윤', '김정호', '최수현', '김유진', '윤다희', '이서현', '신예린'];

/* ── 날짜 기본값 ──────────────────────────────────────────────
   날짜 picker 는 Date 를 로컬 getter(`getFullYear/getMonth/getDate`)로만 읽고 쓴다.
   그래서 여기서도 «로컬 달력일» 만 다루고, 프롭 비교는 달력일 문자열로 한다 —
   호스트가 매 렌더 새 Date 객체를 넘겨도 «같은 날» 이면 같은 키라, 모달이 열려 있는
   동안 사용자가 고른 날짜를 기본값으로 되돌리지 않는다. */
function dayKey(d) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayKeyToDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m, d);
}

/** 브라우저 로컬 기준 «내일» 의 달력일 키. */
function tomorrowKey(now = new Date()) {
  return dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
}

/* ── 시간 ─────────────────────────────────────────────────────
   드롭다운이 들고 있는 값은 로케일과 무관한 24시간 «HH:MM» 이고, 화면 글자도
   그 값 그대로다. 예약을 저장하는 쪽은 그 값(onSubmit 의 `time24`)을 읽으면 되므로
   영어 '1:00 PM' 을 1시로 되읽는 사고가 아예 생기지 않는다.

   🔴 오전·오후를 붙이지 않는다 (PW-867). 예전 한국어 표기 «오후 13:00» 은 오전·오후와
   24시간 숫자를 함께 써서 한 목록에 두 표기가 섞였고, 영어만 «1:00 PM» 이었다.
   예약이 잡힌 뒤 1on1 카드·일정표가 보여 주는 시각은 언어와 무관하게 «13:00» 이라
   고르는 자리도 그쪽에 맞춘다(TimeInput·evalScheduleStamp 와 같은 24시간 규약). */
export const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30',
  '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00',
];

/**
 * 'HH:MM'(24h) → 화면에 보일 글자. 언어와 무관하게 24시간 그대로다 (PW-867).
 */
export function formatTime(value) {
  return value;
}

function formatDateLabel(date, locale) {
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
}

function formatMonthLabel(date, locale) {
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }).format(date);
}

/** 일요일 시작 요일 약칭 7개. (2024-01-07 이 일요일) */
function weekdayLabels(locale) {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2024, 0, 7 + i)));
}

// 상세(열람모드) 모달도 같은 시간 옵션·데이트피커를 쓴다 — export 해 공유.
export const TIME_OPTIONS = TIME_SLOTS.map((slot) => formatTime(slot));

export default function AddOneOnOneModal({ open, onClose, onSubmit, onDelete, member, icons, baseUrl = '', members, defaultDate, defaultTime, locale = 'ko', labels }) {
  const L = { ...DEFAULT_LABELS, ...(labels || {}) };
  const memberList = Array.isArray(members) ? members : DEMO_MEMBERS;
  const [search, setSearch] = useState('');
  const [memberOpen, setMemberOpen] = useState(false);
  const [duration, setDuration] = useState('55');
  const [customDuration, setCustomDuration] = useState('');
  /* 날짜 기본값은 «마운트 시점» 에 잡는다. 이 모달은 닫혀도 언마운트되지 않고
     display 로만 숨기 때문에, 열 때마다 새로 잡히게 하려면 호출부가 열림 상태를
     `key` 에 실어야 한다 (`OneOnOneCanvasV2` 가 그렇게 한다). */
  const defaultKey = defaultDate ? dayKey(defaultDate) : '';
  const [date, setDate] = useState(() => dayKeyToDate(defaultKey || tomorrowKey()));
  const [dateOpen, setDateOpen] = useState(false);
  /* 값은 로케일과 무관한 24시간 'HH:MM'. 화면 글자는 formatTime 이 만든다.
     `defaultTime` 을 주면 그 시각으로 연다 — 「일정변경」처럼 **이미 잡혀 있는 시각을
     보여 주고 고치게** 하는 자리에서 쓴다(PW-825). 안 주면 종전대로 10:00 이다. */
  const [time, setTime] = useState(defaultTime || '10:00');
  const [timeOpen, setTimeOpen] = useState(false);
  const [memo, setMemo] = useState('');

  // 모든 popover/dropdown 닫기
  const closePopovers = () => {
    setMemberOpen(false);
    setDateOpen(false);
    setTimeOpen(false);
  };

  const filteredMembers = useMemo(() => {
    if (!search) return memberList;
    return memberList.filter((m) => m.includes(search));
  }, [search, memberList]);

  const dateLabel = formatDateLabel(date, locale);

  if (typeof document === 'undefined' || !open) return null;

  return (
    <ModalShell
      title={member ? L.titleWithMember : L.titleNoMember}
      titleId="ono-add-modal-title"
      closeLabel={L.close}
      onClose={() => onClose?.()}
      zIndex={1001}
      className="ono-add-shell"
      testId="ono-add-modal"
      overlayTestId="ono-add-modal-overlay"
      footer={
        <>
          {/* 없애기는 «이 미팅을 할 것인가» 를 되돌리는 조작이라 저장 버튼들과 같은 무게로
              놓지 않는다 — 왼쪽 끝에 두고 넓이를 차지하지 않게 한다 (PW-825). */}
          {onDelete && (
            <button
              type="button"
              className="tl-group-modal-btn ono-add-modal-btn-delete"
              data-testid="ono-add-modal-delete"
              onClick={() => onDelete()}
            >
              {L.delete}
            </button>
          )}
          <button type="button" className="tl-group-modal-btn tl-group-modal-btn-secondary" onClick={onClose}>
            {L.cancel}
          </button>
          <button
            type="button"
            className="tl-group-modal-btn tl-group-modal-btn-primary"
            /* time 은 «화면에 보인 글자», time24 는 로케일 무관 'HH:MM'. 저장하는
               쪽은 time24 를 읽는다 — 영어 '1:00 PM' 을 1시로 잘못 읽지 않게 (PW-469). */
            onClick={() => onSubmit?.({ member, search, duration, customDuration, date, time: formatTime(time), time24: time, memo })}
            disabled={!member && !search}
          >
            {L.submit}
          </button>
        </>
      }
    >
      <div className="ono-add-modal-form" onClick={closePopovers}>
        {member ? (
          /* "1on1 잡기" 모드 — 멤버 표시 (검색 없음) */
          <div className="ono-add-modal-member">
            <div className="ono-add-modal-member-avatar">
              {member.avatar && <img src={member.avatar} alt="" />}
            </div>
            <div className="ono-add-modal-member-info">
              <div className="ono-add-modal-member-name-row">
                <span className="ono-add-modal-member-name">{member.name}</span>
                {member.badge && (
                  <span className="ono-add-modal-member-badge">{member.badge}</span>
                )}
              </div>
              {member.role && (
                <span className="ono-add-modal-member-role">{member.role}</span>
              )}
            </div>
          </div>
        ) : (
          /* "1on1 일정 추가" 모드 — 팀원 검색 */
          <Field label={L.memberSearch}>
            <div className="ono-add-modal-popover-wrap" onClick={(e) => e.stopPropagation()}>
              <div className="ono-add-modal-input">
                <Icon src={icons?.search} size={20} color="var(--text-placeholder)" baseUrl={baseUrl} />
                <input
                  type="text"
                  placeholder={L.memberSearchPlaceholder}
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setMemberOpen(true); }}
                  onFocus={() => setMemberOpen(true)}
                  className="ono-add-modal-input-el"
                />
              </div>
              {memberOpen && (
                <div className="ono-add-modal-menu ono-add-modal-menu-wide">
                  {filteredMembers.length === 0 ? (
                    <div className="ono-add-modal-menu-empty">
                      {memberList.length === 0 ? L.memberEmpty : L.memberSearchEmpty}
                    </div>
                  ) : (
                    filteredMembers.map((m) => (
                      <button
                        key={m}
                        type="button"
                        className="ono-add-modal-menu-item"
                        onClick={() => { setSearch(m); setMemberOpen(false); }}
                      >
                        {m}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </Field>
        )}

        {/* 미팅 시간 */}
        <Field label={L.duration}>
          <div className="ono-add-modal-radio-group">
            {durationOptions(L).map((opt) => (
              <button
                key={opt.key}
                type="button"
                className={`ono-add-modal-radio ${duration === opt.key ? 'is-active' : ''}`}
                onClick={() => setDuration(opt.key)}
              >
                <span className="ono-add-modal-radio-circle">
                  {duration === opt.key && <span className="ono-add-modal-radio-dot" />}
                </span>
                <span className="ono-add-modal-radio-label">{opt.label}</span>
              </button>
            ))}
          </div>
          {duration === 'custom' && (
            <div className="ono-add-modal-input">
              <input
                type="text"
                placeholder={L.durationCustomPlaceholder}
                value={customDuration}
                onChange={(e) => setCustomDuration(e.target.value)}
                className="ono-add-modal-input-el"
              />
            </div>
          )}
        </Field>

        {/* 날짜 + 시간 */}
        <div className="ono-add-modal-row">
          {/* 날짜 */}
          <Field label={L.date}>
            <div className="ono-add-modal-popover-wrap" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="ono-add-modal-input ono-add-modal-input-with-icon"
                onClick={() => { setDateOpen((v) => !v); setTimeOpen(false); setMemberOpen(false); }}
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
          {/* 시간 */}
          <Field label={L.time}>
            <div className="ono-add-modal-popover-wrap" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="ono-add-modal-input"
                onClick={() => { setTimeOpen((v) => !v); setDateOpen(false); setMemberOpen(false); }}
              >
                <span className="ono-add-modal-input-text">{formatTime(time)}</span>
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
                      {formatTime(slot)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Field>
        </div>

        {/* 메모 */}
        <Field label={L.memo}>
          <textarea
            className="ono-add-modal-textarea"
            placeholder={L.memoPlaceholder}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        </Field>
      </div>
    </ModalShell>
  );
}

function Field({ label, children }) {
  return (
    <div className="ono-add-modal-field">
      <label className="ono-add-modal-field-label">{label}</label>
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────
   Date picker popover — month grid + 좌/우 month nav.
   ──────────────────────────────────────────────── */
export function DatePickerPopover({ value, onChange, locale = 'ko', labels = DEFAULT_LABELS }) {
  const weekdays = weekdayLabels(locale);
  // value 는 null 허용(미선택) — 뷰는 오늘 기준 달, 선택 하이라이트는 없음.
  const [view, setView] = useState(() => {
    const base = value ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const popoverRef = useRef(null);

  const grid = useMemo(() => buildMonthGrid(view), [view]);

  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  const today = new Date();

  const navMonth = (delta) => {
    const next = new Date(view.getFullYear(), view.getMonth() + delta, 1);
    setView(next);
  };

  return (
    <div ref={popoverRef} className="ono-add-modal-datepicker">
      <div className="ono-add-modal-datepicker-head">
        <button type="button" className="ono-add-modal-datepicker-nav" onClick={() => navMonth(-1)} aria-label={labels.prevMonth}>‹</button>
        <span className="ono-add-modal-datepicker-title">
          {formatMonthLabel(view, locale)}
        </span>
        <button type="button" className="ono-add-modal-datepicker-nav" onClick={() => navMonth(1)} aria-label={labels.nextMonth}>›</button>
      </div>
      <div className="ono-add-modal-datepicker-weekdays">
        {weekdays.map((w) => (
          <span key={w} className="ono-add-modal-datepicker-weekday">{w}</span>
        ))}
      </div>
      <div className="ono-add-modal-datepicker-grid">
        {grid.map((d, i) => {
          const isCurrent = d.getMonth() === view.getMonth();
          const isSelected = value ? isSameDay(d, value) : false;
          const isToday = isSameDay(d, today);
          return (
            <button
              key={i}
              type="button"
              className={`ono-add-modal-datepicker-day ${isCurrent ? '' : 'is-other-month'} ${isSelected ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}`}
              onClick={() => onChange(d)}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function buildMonthGrid(view) {
  const year = view.getFullYear();
  const month = view.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startDow = firstOfMonth.getDay(); // 0=일
  const start = new Date(year, month, 1 - startDow);
  const cells = [];
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }
  return cells;
}
