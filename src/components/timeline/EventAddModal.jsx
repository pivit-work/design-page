import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../shared/Icon.jsx';
import CustomSelect from './CustomSelect.jsx';
import { MEMBERS } from './constants.js';

const SUMMARY_TYPES = ['회의', '집중작업', '리뷰', '외부미팅', '기타'];

const START_TIMES = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00',
];

const DURATIONS = [
  '15분', '30분', '45분', '1시간', '1시간 30분', '2시간',
  '2시간 30분', '3시간', '4시간', '반나절', '하루 종일',
];

/**
 * EventAddModal — "이벤트 추가" 모달.
 * Figma "add event modal" (node 16713:38008): panel 650x1266, radius 16.
 *
 * 섹션 (Frame 220, gap 48):
 *   1. 타이틀 + 서브 (03.15 · 17:00)
 *   2. 요약  — 회의/집중작업/리뷰/외부미팅/기타 radio pills
 *   3. 이름  — text input
 *   4. 시작 시간 / 소요 시간  — 2 dropdowns side-by-side (gap 17)
 *   5. 결정 사항  — MEMBERS multi-select chip
 *   6. 외부 참석자  — input + 추가 버튼
 *   7. Google Calendar 등록 info row
 *
 * Footer: pad 24/48/48/48, gap 12, 버튼 2개 (271px 씩).
 */
export default function EventAddModal({ date, time = '17:00', baseUrl, onClose, onSubmit }) {
  const [summary, setSummary] = useState('회의');
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState(time);
  const [duration, setDuration] = useState('1시간');
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [externalInput, setExternalInput] = useState('');
  const [externalList, setExternalList] = useState([]);
  const [gcalRegister, setGcalRegister] = useState(true);

  const panelRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const handleOverlayMouseDown = (e) => {
    if (panelRef.current && panelRef.current.contains(e.target)) return;
    onClose();
  };

  const toggleMember = (id) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleAddExternal = () => {
    const v = externalInput.trim();
    if (!v) return;
    setExternalList((prev) => [...prev, v]);
    setExternalInput('');
  };
  const handleExternalKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddExternal();
    }
  };

  const canSubmit = name.trim() && summary && startTime && duration;
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      summary,
      name: name.trim(),
      startTime,
      duration,
      memberIds: selectedMemberIds,
      external: externalList,
      gcalRegister,
    });
  };

  // 헤더의 "MM.DD · HH:MM" 서브타이틀
  const subtitle = (() => {
    const d = date ?? new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${mm}.${dd}  •  ${time}`;
  })();

  return createPortal(
    <div className="tl-modal-overlay" onMouseDown={handleOverlayMouseDown} role="presentation">
      <form
        ref={panelRef}
        className="tl-group-modal tl-event-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tl-event-modal-title"
        onSubmit={handleSubmit}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Top bar — 닫기 X */}
        <div className="tl-group-modal-top">
          <button
            type="button"
            className="tl-group-modal-close"
            aria-label="닫기"
            onClick={onClose}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="tl-group-modal-content tl-event-modal-content">
          {/* Header */}
          <div className="tl-event-modal-header">
            <h2 id="tl-event-modal-title" className="tl-group-modal-title">이벤트 추가</h2>
            <p className="tl-event-modal-subtitle">{subtitle}</p>
          </div>

          <div className="tl-event-modal-body">
            {/* 요약 */}
            <div className="tl-event-field">
              <label className="tl-event-label">요약</label>
              <div className="tl-event-radio-group" role="radiogroup" aria-label="요약 타입">
                {SUMMARY_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={summary === t}
                    className={`tl-event-radio-pill ${summary === t ? 'is-selected' : ''}`}
                    onClick={() => setSummary(t)}
                  >
                    <span className="tl-event-radio-dot" aria-hidden="true" />
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* 이름 */}
            <div className="tl-event-field">
              <label htmlFor="tl-event-name" className="tl-event-label">이름</label>
              <input
                id="tl-event-name"
                type="text"
                className="tl-emp-input"
                placeholder="이름을 입력해주세요."
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={500}
              />
              <span className="tl-event-count">{name.length} / 500</span>
            </div>

            {/* 시작 시간 / 소요 시간 */}
            <div className="tl-event-row">
              <div className="tl-event-field">
                <label htmlFor="tl-event-start" className="tl-event-label">시작 시간</label>
                <CustomSelect
                  id="tl-event-start"
                  size="md"
                  value={startTime}
                  onChange={setStartTime}
                  options={START_TIMES.map((t) => ({ value: t, label: t }))}
                />
              </div>
              <div className="tl-event-field">
                <label htmlFor="tl-event-duration" className="tl-event-label">소요 시간</label>
                <CustomSelect
                  id="tl-event-duration"
                  size="md"
                  value={duration}
                  onChange={setDuration}
                  options={DURATIONS.map((t) => ({ value: t, label: t }))}
                />
              </div>
            </div>

            {/* 내부 참석자 */}
            <div className="tl-event-field">
              <label className="tl-event-label">내부 참석자</label>
              <div className="tl-event-member-group">
                {MEMBERS.map((m) => {
                  const isSel = selectedMemberIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className={`tl-event-member-chip ${isSel ? 'is-selected' : ''}`}
                      onClick={() => toggleMember(m.id)}
                    >
                      <img
                        className="tl-event-member-avatar"
                        src={m.photo}
                        alt=""
                        aria-hidden="true"
                      />
                      {m.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 외부 참석자 */}
            <div className="tl-event-field">
              <label htmlFor="tl-event-external" className="tl-event-label">외부 참석자</label>
              <div className="tl-event-external-row">
                <input
                  id="tl-event-external"
                  type="text"
                  className="tl-emp-input"
                  placeholder="이름 혹은 & % 입력 후 Enter"
                  value={externalInput}
                  onChange={(e) => setExternalInput(e.target.value)}
                  onKeyDown={handleExternalKey}
                />
                <button
                  type="button"
                  className="tl-event-add-btn"
                  onClick={handleAddExternal}
                  disabled={!externalInput.trim()}
                >
                  추가
                </button>
              </div>
              {externalList.length > 0 && (
                <div className="tl-event-external-list">
                  {externalList.map((x, i) => (
                    <span key={i} className="tl-event-external-tag">
                      {x}
                      <button
                        type="button"
                        className="tl-event-external-x"
                        aria-label="삭제"
                        onClick={() => setExternalList((prev) => prev.filter((_, j) => j !== i))}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <span className="tl-event-helper">외부 고객·파트너·협력사 담당자를 추가하세요</span>
            </div>

            {/* Google Calendar 등록 */}
            <label className="tl-event-gcal-row">
              <input
                type="checkbox"
                className="tl-event-gcal-check"
                checked={gcalRegister}
                onChange={(e) => setGcalRegister(e.target.checked)}
              />
              <span className="tl-event-gcal-icon" aria-hidden="true">
                <Icon
                  src="/icons-solid/calendar-check-02.svg"
                  size={24}
                  color={gcalRegister
                    ? 'var(--colors-foreground-fgBrandPrimary, #2dbd82)'
                    : 'var(--text-tertiary)'}
                  baseUrl={baseUrl}
                />
              </span>
              <span className="tl-event-gcal-text">
                <span className="tl-event-gcal-title">
                  Google Calendar에도 등록
                  <span className="tl-event-gcal-badge" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                      <path d="M7 0a7 7 0 1 0 7 7A7 7 0 0 0 7 0zm3.3 5.7-4 4a1 1 0 0 1-1.4 0l-2-2a1 1 0 1 1 1.4-1.4L5.6 7.6l3.3-3.3a1 1 0 0 1 1.4 1.4z" />
                    </svg>
                  </span>
                </span>
                <span className="tl-event-gcal-desc">참석자에게 캘린더 초대가 발송됩니다</span>
              </span>
            </label>
          </div>
        </div>

        {/* Footer — 취소 / 이벤트 추가 */}
        <div className="tl-group-modal-actions tl-event-modal-actions">
          <button
            type="button"
            className="tl-group-modal-btn tl-group-modal-btn-secondary"
            onClick={onClose}
          >
            취소
          </button>
          <button
            type="submit"
            className="tl-group-modal-btn tl-group-modal-btn-primary"
            disabled={!canSubmit}
          >
            이벤트 추가
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
