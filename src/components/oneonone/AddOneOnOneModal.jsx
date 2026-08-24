import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
 * defaultDate: 날짜 칸의 기본값(Date). 호스트 앱은 «사용자 시간대의 내일» 을 넘긴다.
 *   생략하면 브라우저 로컬 기준 내일로 폴백한다 — 어느 쪽이든 «지나간 날짜» 가
 *   기본값으로 남지 않는다.
 */

const DURATION_OPTIONS = [
  { key: '25', label: '25분' },
  { key: '55', label: '55분' },
  { key: 'custom', label: '직접입력' },
];

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

// 상세(열람모드) 모달도 같은 시간 옵션·데이트피커를 쓴다 — export 해 공유.
export const TIME_OPTIONS = [
  '오전 09:00', '오전 09:30', '오전 10:00', '오전 10:30',
  '오전 11:00', '오전 11:30', '오후 12:00', '오후 12:30',
  '오후 13:00', '오후 13:30', '오후 14:00', '오후 14:30',
  '오후 15:00', '오후 15:30', '오후 16:00', '오후 16:30',
  '오후 17:00', '오후 17:30', '오후 18:00',
];

export default function AddOneOnOneModal({ open, onClose, onSubmit, member, icons, baseUrl = '', members, defaultDate }) {
  const memberList = members && members.length > 0 ? members : DEMO_MEMBERS;
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
  const [time, setTime] = useState('오전 10:00');
  const [timeOpen, setTimeOpen] = useState(false);
  const [memo, setMemo] = useState('');

  // 모든 popover/dropdown 닫기
  const closePopovers = () => {
    setMemberOpen(false);
    setDateOpen(false);
    setTimeOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const filteredMembers = useMemo(() => {
    if (!search) return memberList;
    return memberList.filter((m) => m.includes(search));
  }, [search, memberList]);

  const dateLabel = `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;

  if (typeof document === 'undefined') return null;

  const node = (
    <>
      <div
        className="ono-add-modal-overlay"
        onClick={onClose}
        style={{ display: open ? '' : 'none' }}
      />
      <div
        className="ono-add-modal-scroll-wrap"
        onClick={onClose}
        style={{ display: open ? '' : 'none' }}
      >
        <div className="ono-add-modal-card" onClick={(e) => e.stopPropagation()}>
          <div className="ono-add-modal-topbar">
            <button type="button" className="ono-add-modal-close" onClick={onClose} aria-label="닫기">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          <div className="ono-add-modal-body" onClick={closePopovers}>
            <div className="ono-add-modal-header">
              <h2 className="ono-add-modal-title">{member ? '1on1 잡기' : '1on1 일정 추가'}</h2>
            </div>

            <div className="ono-add-modal-form">
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
                <Field label="팀원 검색">
                  <div className="ono-add-modal-popover-wrap" onClick={(e) => e.stopPropagation()}>
                    <div className="ono-add-modal-input">
                      <Icon src={icons?.search} size={20} color="var(--text-placeholder)" baseUrl={baseUrl} />
                      <input
                        type="text"
                        placeholder="이름으로 검색 해주세요."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setMemberOpen(true); }}
                        onFocus={() => setMemberOpen(true)}
                        className="ono-add-modal-input-el"
                      />
                    </div>
                    {memberOpen && (
                      <div className="ono-add-modal-menu ono-add-modal-menu-wide">
                        {filteredMembers.length === 0 ? (
                          <div className="ono-add-modal-menu-empty">검색 결과 없음</div>
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
              <Field label="미팅 시간">
                <div className="ono-add-modal-radio-group">
                  {DURATION_OPTIONS.map((opt) => (
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
                      placeholder="시간을 입력하세요 (예: 30분)"
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
                <Field label="날짜">
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
                      />
                    )}
                  </div>
                </Field>
                {/* 시간 */}
                <Field label="시간">
                  <div className="ono-add-modal-popover-wrap" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="ono-add-modal-input"
                      onClick={() => { setTimeOpen((v) => !v); setDateOpen(false); setMemberOpen(false); }}
                    >
                      <span className="ono-add-modal-input-text">{time}</span>
                      <Icon src={icons?.chevronDown} size={20} color="var(--text-secondary)" baseUrl={baseUrl} />
                    </button>
                    {timeOpen && (
                      <div className="ono-add-modal-menu ono-add-modal-menu-time">
                        {TIME_OPTIONS.map((t) => (
                          <button
                            key={t}
                            type="button"
                            className={`ono-add-modal-menu-item ${t === time ? 'is-selected' : ''}`}
                            onClick={() => { setTime(t); setTimeOpen(false); }}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </Field>
              </div>

              {/* 메모 */}
              <Field label="메모 (선택)">
                <textarea
                  className="ono-add-modal-textarea"
                  placeholder="사전 아젠다 또는 주요 논의 포인트를 메모하세요."
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                />
              </Field>
            </div>
          </div>

          <div className="ono-add-modal-footer">
            <button type="button" className="ono-add-modal-btn ono-add-modal-btn-secondary" onClick={onClose}>
              취소
            </button>
            <button
              type="button"
              className="ono-add-modal-btn ono-add-modal-btn-primary"
              onClick={() => onSubmit?.({ member, search, duration, customDuration, date, time, memo })}
              disabled={!member && !search}
            >
              예약완료
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(node, document.body);
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
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function DatePickerPopover({ value, onChange }) {
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
        <button type="button" className="ono-add-modal-datepicker-nav" onClick={() => navMonth(-1)} aria-label="이전 달">‹</button>
        <span className="ono-add-modal-datepicker-title">
          {view.getFullYear()}년 {view.getMonth() + 1}월
        </span>
        <button type="button" className="ono-add-modal-datepicker-nav" onClick={() => navMonth(1)} aria-label="다음 달">›</button>
      </div>
      <div className="ono-add-modal-datepicker-weekdays">
        {WEEKDAYS.map((w) => (
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
