import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../shared/Icon.jsx';
import { DatePickerPopover, TIME_OPTIONS } from './AddOneOnOneModal.jsx';

/**
 * OneOnOneDetailModal — 완료된 1on1 상세(열람모드) 모달.
 * Figma 17413:26357(요약) / 26611(액션 아이템) / 26771(대화 분석) / 26956(피드백).
 *
 * 650px 모달, 헤더(멤버 × 매니저 + DONE 배지 + '열람모드') → 30px 디스플레이 탭 4개
 * → 탭별 본문 → 공통 '다음 회의 일정 등록' 폼(날짜/시간/알림/캘린더 연동).
 *
 * detail 데이터는 전부 props(호스트/데모 소유). 탭·AI 요약 접기·일정 폼 입력만
 * UI 상태로 여기서 관리하고, onScheduleNext(payload) 로 등록을 위임한다.
 */
const TABS = [
  { key: 'summary', label: '요약' },
  { key: 'actions', label: '액션 아이템' },
  { key: 'analysis', label: '대화 분석' },
  { key: 'feedback', label: '피드백' },
];

export default function OneOnOneDetailModal({ detail, icons, baseUrl = '', onClose, onScheduleNext }) {
  const [tab, setTab] = useState('summary');
  const [summaryOpen, setSummaryOpen] = useState(true);
  // 날짜/시간 UI 는 일정 추가 모달(AddOneOnOneModal)과 동일한 picker/dropdown 을 공유한다.
  const [date, setDate] = useState(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [time, setTime] = useState('오전 10:00');
  const [timeOpen, setTimeOpen] = useState(false);
  const [remind, setRemind] = useState(true);
  const closePopovers = () => { setDateOpen(false); setTimeOpen(false); };
  const dateLabel = date
    ? `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
    : '연도. 월. 일.';

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!detail) return null;
  const doneCount = detail.actions.filter((a) => a.done).length;

  return createPortal(
    <div className="ood-overlay" onClick={onClose}>
      <div className="ood-modal" onClick={(e) => { e.stopPropagation(); closePopovers(); }}>
        <div className="ood-head">
          <div className="ood-head-who">
            <span className="ood-person">
              <img src={detail.member.avatar} alt="" draggable={false} />
              <b>{detail.member.name}</b>
            </span>
            <Icon src={icons.xClose} size={16} color="var(--text-tertiary)" baseUrl={baseUrl} />
            <span className="ood-person">
              <img src={detail.manager.avatar} alt="" draggable={false} />
              <b>{detail.manager.name}</b>
            </span>
          </div>
          <div className="ood-head-meta">
            <span className="ood-done-badge">{detail.status ?? 'DONE'}</span>
            <span className="ood-mode">열람모드</span>
          </div>
        </div>

        <div className="ood-tabs">
          {TABS.map((t) => (
            <span
              key={t.key}
              className={`ood-tab${tab === t.key ? ' is-active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </span>
          ))}
        </div>

        {tab === 'summary' && (
          <div className="ood-ai-card">
            <div className="ood-ai-head">
              <span className="ood-ai-label">
                <Icon src={icons.aiChat} size={14} color="var(--utility-purple-500)" baseUrl={baseUrl} />
                <span>AI 미팅 요약</span>
              </span>
              <button type="button" className="ood-ai-fold" onClick={() => setSummaryOpen((v) => !v)}>
                {summaryOpen ? '접기' : '펼치기'}
              </button>
            </div>
            {summaryOpen && (
              <>
                <div className="ood-ai-block">
                  <p className="ood-ai-text">{detail.summary.text}</p>
                </div>
                <div className="ood-ai-block">
                  <p className="ood-ai-block-title">주요 결정사항</p>
                  <ul className="ood-ai-list">
                    {detail.summary.decisions.map((d) => <li key={d}>{d}</li>)}
                  </ul>
                </div>
                <div className="ood-ai-block">
                  <p className="ood-ai-block-title">재점검 필요</p>
                  <p className="ood-ai-text">{detail.summary.recheck}</p>
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'actions' && (
          <div className="ood-actions">
            <p className="ood-actions-count">{doneCount}/{detail.actions.length} 완료</p>
            {/* 시안 데이터에 동일 문구 항목이 중복 등장한다 — 위치 기반 키. */}
            {detail.actions.map((action, i) => (
              <div className="ood-action-row" key={i}>
                <span className={`ood-action-check${action.done ? ' is-done' : ''}`}>
                  {action.done && (
                    <Icon src={icons.check} size={14} color="var(--text-white)" baseUrl={baseUrl} />
                  )}
                </span>
                <span className={`ood-action-title${action.done ? ' is-done' : ''}`}>{action.title}</span>
                <span className="ood-action-meta">{action.owner}</span>
                <span className="ood-action-meta">{action.date}</span>
                <span className="ood-action-ai">
                  <Icon src={icons.aiChat} size={14} color="var(--utility-purple-500)" baseUrl={baseUrl} />
                  <span>AI</span>
                </span>
              </div>
            ))}
          </div>
        )}

        {tab === 'analysis' && (
          <>
            <div className="ood-analysis">
              <p className="ood-section-title">발화 비율</p>
              <div className="ood-speak-row">
                <div className="ood-speak-col">
                  <p className="ood-bar-label">매니저 {detail.analysis.speaking.manager}%</p>
                  <div className="ood-bar"><i className="is-blue" style={{ width: `${detail.analysis.speaking.manager}%` }} /></div>
                </div>
                <div className="ood-speak-col">
                  <p className="ood-bar-label">멤버 {detail.analysis.speaking.member}%</p>
                  <div className="ood-bar"><i className="is-green" style={{ width: `${detail.analysis.speaking.member}%` }} /></div>
                </div>
              </div>
              <p className="ood-analysis-note">{detail.analysis.note}</p>
            </div>
            <div className="ood-analysis">
              <p className="ood-section-title">대화분위기</p>
              <p className="ood-bar-label">매니저 {detail.analysis.speaking.manager}%</p>
              <div className="ood-mood-bar">
                <i className="is-green" style={{ width: `${detail.analysis.mood.positive}%` }} />
                <i className="is-blue" style={{ width: `${detail.analysis.mood.neutral}%` }} />
                <i className="is-red" style={{ width: `${detail.analysis.mood.negative}%` }} />
              </div>
              <div className="ood-mood-legend">
                <span><i className="is-green" /> 긍정 {detail.analysis.mood.positive}%</span>
                <span><i className="is-blue" /> 중립 {detail.analysis.mood.neutral}%</span>
                <span><i className="is-red" /> 부정 {detail.analysis.mood.negative}%</span>
              </div>
            </div>
          </>
        )}

        {tab === 'feedback' && (
          <div className="ood-feedback">
            <div className="ood-feedback-head">
              <p className="ood-section-title is-primary">매니저 피드백</p>
              <span className="ood-tag">{detail.feedback.visibility}</span>
            </div>
            <div className="ood-feedback-card is-strength">
              <p className="ood-feedback-label">강점</p>
              <p className="ood-feedback-text">{detail.feedback.strength}</p>
            </div>
            <div className="ood-feedback-card is-growth">
              <p className="ood-feedback-label">성장 영역 (SBI)</p>
              <p className="ood-feedback-text">{detail.feedback.growth}</p>
            </div>
          </div>
        )}

        <div className="ood-schedule">
          <p className="ood-section-title">다음 회의 일정 등록</p>
          <div className="ood-schedule-fields">
            <div className="ood-field">
              <p className="ood-field-label">날짜</p>
              <div className="ono-add-modal-popover-wrap" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="ono-add-modal-input ono-add-modal-input-with-icon"
                  onClick={() => { setDateOpen((v) => !v); setTimeOpen(false); }}
                >
                  <Icon src={icons.calendar} size={20} color="var(--text-secondary)" baseUrl={baseUrl} />
                  <span className="ono-add-modal-input-text">{dateLabel}</span>
                </button>
                {dateOpen && (
                  <DatePickerPopover value={date} onChange={(d) => { setDate(d); setDateOpen(false); }} />
                )}
              </div>
            </div>
            <div className="ood-field">
              <p className="ood-field-label">시간</p>
              <div className="ono-add-modal-popover-wrap" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="ono-add-modal-input"
                  onClick={() => { setTimeOpen((v) => !v); setDateOpen(false); }}
                >
                  <span className="ono-add-modal-input-text">{time}</span>
                  <Icon src={icons.chevronDown} size={20} color="var(--text-secondary)" baseUrl={baseUrl} />
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
            </div>
          </div>
          <label className="ood-remind">
            <span
              className={`ood-remind-check${remind ? ' is-on' : ''}`}
              role="checkbox"
              aria-checked={remind}
              tabIndex={0}
              onClick={() => setRemind((v) => !v)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setRemind((v) => !v); }}
            >
              {remind && <Icon src={icons.check} size={12} color="var(--text-white)" baseUrl={baseUrl} />}
            </span>
            <span className="ood-remind-label">전날 오전 9시 미리 알림 추가</span>
          </label>
          <div className="ood-calendar-row">
            <Icon src={icons.calendar} size={14} color="var(--text-secondary)" baseUrl={baseUrl} />
            <span>Google Calendar 연동 중</span>
            <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden>
              <circle cx="7" cy="7" r="7" fill="var(--fg-success-secondary)" />
              <path d="M4 7.2 6.2 9.4 10 5.2" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          {date ? (
            <button
              type="button"
              className="ood-schedule-btn"
              onClick={() => onScheduleNext?.({ date, time, remind })}
            >
              일정 등록
            </button>
          ) : (
            <p className="ood-schedule-hint">날짜를 먼저 선택하세요</p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
