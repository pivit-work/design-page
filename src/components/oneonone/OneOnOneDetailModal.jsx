import { useState } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';
import Icon from '../shared/Icon.jsx';
import ModalShell from '../shared/ModalShell.jsx';
import Tabs from '../shared/Tabs.jsx';
import { DatePickerPopover, TIME_SLOTS, formatTime } from './AddOneOnOneModal.jsx';

/**
 * OneOnOneDetailModal — 완료된 1on1 상세(열람모드) 모달.
 * Figma 17413:26357(요약) / 26611(액션 아이템) / 26771(대화 분석) / 26956(피드백).
 *
 * 650px 모달, 헤더(멤버 × 매니저 + DONE 배지 + '열람모드') → 30px 디스플레이 탭 4개
 * → 탭별 본문 → 공통 '다음 회의 일정 등록' 폼(날짜/시간/알림/캘린더 연동).
 *
 * detail 데이터는 전부 props(호스트/데모 소유). 탭·AI 요약 접기·일정 폼 입력만
 * UI 상태로 여기서 관리하고, onScheduleNext(payload) 로 등록을 위임한다.
 * payload = { date, time(화면 글자), time24('HH:MM'), remind } — 저장은 time24 를 읽는다.
 *
 * 실데이터를 받는 호스트(pivit-work)를 위한 자리 (PW-786):
 *  - labels / locale: 고정 문구 번역과 날짜·시간 형식. 안 넘긴 키는 한국어 기본값.
 *    숫자가 끼는 문구(`actionsDone`·`speakManager` 등)는 함수다.
 *  - 비어 있는 값: 요약·결정사항·재점검·액션·발화 비율·분위기·피드백 중 없는 것은
 *    그 블록만 빼거나 탭에 빈 안내를 띄운다. 가짜 0% 를 그리지 않는다.
 *  - calendarConnected: false 면 「Google Calendar 연동 중」 줄을 그리지 않는다.
 *  - showRemind: false 면 「전날 오전 9시 미리 알림」 체크를 그리지 않는다 — 그 알림을
 *    실제로 보내는 기능이 없는 호스트가 «눌러도 아무 일 없는» 칸을 보이지 않게.
 *  - renderAvatar(person): 호스트 앱 아바타(이니셜 폴백 등). 미지정 시 avatar URL.
 *  - scheduling: true 면 [일정 등록] 을 잠근다(중복 제출 방지).
 *
 * 창은 공용 창 틀(ModalShell), 네 탭은 공용 Tabs 로 그린다 (PW-836). 틀의 제목 자리에는
 * 멤버 × 매니저를, 설명 자리에는 상태 배지·「열람모드」를 둔다. [일정 등록] 이 본문 안에
 * 있어 틀의 취소/확인 푸터는 그리지 않는다. Esc·막 클릭·닫기 X 는 onClose 다.
 */
export const DETAIL_DEFAULT_LABELS = {
  viewMode: '열람모드',
  close: '닫기',
  tabSummary: '요약',
  tabActions: '액션 아이템',
  tabAnalysis: '대화 분석',
  tabFeedback: '피드백',
  aiSummary: 'AI 미팅 요약',
  fold: '접기',
  unfold: '펼치기',
  decisions: '주요 결정사항',
  recheck: '재점검 필요',
  summaryEmpty: '이 회차에는 AI 미팅 요약이 없습니다.',
  actionsDone: (done, total) => `${done}/${total} 완료`,
  actionsEmpty: '이 회차에 나온 액션 아이템이 없습니다.',
  aiTag: 'AI',
  speakRatio: '발화 비율',
  speakManager: (pct) => `매니저 ${pct}%`,
  speakMember: (pct) => `멤버 ${pct}%`,
  mood: '대화분위기',
  moodPositive: (pct) => `긍정 ${pct}%`,
  moodNeutral: (pct) => `중립 ${pct}%`,
  moodNegative: (pct) => `부정 ${pct}%`,
  analysisEmpty: '이 회차에는 대화 분석 결과가 없습니다.',
  managerFeedback: '매니저 피드백',
  strength: '강점',
  growth: '성장 영역 (SBI)',
  feedbackEmpty: '이 회차에 작성된 매니저 피드백이 없습니다.',
  scheduleTitle: '다음 회의 일정 등록',
  date: '날짜',
  time: '시간',
  datePlaceholder: '연도. 월. 일.',
  remind: '전날 오전 9시 미리 알림 추가',
  calendarConnected: 'Google Calendar 연동 중',
  scheduleSubmit: '일정 등록',
  scheduleHint: '날짜를 먼저 선택하세요',
  prevMonth: '이전 달',
  nextMonth: '다음 달',
};

const asList = (v) => (Array.isArray(v) ? v.filter(Boolean) : v ? [v] : []);

function Person({ person, renderAvatar }) {
  return (
    <span className="ood-person">
      {renderAvatar ? renderAvatar(person) : person.avatar && <img src={person.avatar} alt="" draggable={false} />}
      <b>{person.name}</b>
    </span>
  );
}

export default function OneOnOneDetailModal({
  detail,
  icons,
  baseUrl = '',
  onClose,
  onScheduleNext,
  locale = 'ko',
  labels,
  calendarConnected = true,
  showRemind = true,
  renderAvatar,
  scheduling = false,
}) {
  const L = { ...DETAIL_DEFAULT_LABELS, ...(labels || {}) };
  const [tab, setTab] = useState('summary');
  const [summaryOpen, setSummaryOpen] = useState(true);
  // 날짜/시간 UI 는 일정 추가 모달(AddOneOnOneModal)과 동일한 picker/dropdown 을 공유한다.
  // 시간은 로케일 무관 'HH:MM' 으로 들고, 화면 글자만 formatTime 으로 만든다.
  const [date, setDate] = useState(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [time, setTime] = useState('10:00');
  const [timeOpen, setTimeOpen] = useState(false);
  const [remind, setRemind] = useState(true);
  const closePopovers = () => { setDateOpen(false); setTimeOpen(false); };
  const dateLabel = date
    ? new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' }).format(date)
    : L.datePlaceholder;

  if (!detail) return null;
  const tabs = [
    { value: 'summary', label: L.tabSummary, testId: 'ood-tab-summary' },
    { value: 'actions', label: L.tabActions, testId: 'ood-tab-actions' },
    { value: 'analysis', label: L.tabAnalysis, testId: 'ood-tab-analysis' },
    { value: 'feedback', label: L.tabFeedback, testId: 'ood-tab-feedback' },
  ];
  const summaryText = detail.summary?.text;
  const decisions = asList(detail.summary?.decisions);
  const recheck = asList(detail.summary?.recheck);
  const hasSummary = !!summaryText || decisions.length > 0 || recheck.length > 0;
  const actions = detail.actions ?? [];
  const doneCount = actions.filter((a) => a.done).length;
  const speaking = detail.analysis?.speaking ?? null;
  const mood = detail.analysis?.mood ?? null;
  const feedback = detail.feedback ?? null;
  const hasFeedback = !!(feedback?.strength || feedback?.growth);

  return (
    <ModalShell
      title={
        <span className="ood-head-who">
          <Person person={detail.member} renderAvatar={renderAvatar} />
          <Icon src={icons.xClose} size={16} color="var(--text-tertiary)" baseUrl={baseUrl} />
          <Person person={detail.manager} renderAvatar={renderAvatar} />
        </span>
      }
      description={
        <span className="ood-head-meta">
          <StatusBadge className="ood-done-badge">{detail.status ?? 'DONE'}</StatusBadge>
          <span className="ood-mode">{L.viewMode}</span>
        </span>
      }
      titleId="ood-title"
      closeLabel={L.close}
      onClose={() => onClose?.()}
      footer={null}
      zIndex={1000}
      className="ood-shell"
      testId="ood-modal"
    >
      {/* 안쪽 아무 데나 누르면 열린 날짜·시간 고르기를 닫는다(종전 그대로). */}
      <div className="ood-shell-inner" onClick={closePopovers}>
        <div className="tl-tabs-row">
          <Tabs items={tabs} value={tab} onChange={setTab} />
        </div>

        {tab === 'summary' && (
          <div className="ood-ai-card">
            <div className="ood-ai-head">
              <span className="ood-ai-label">
                <Icon src={icons.aiChat} size={14} color="var(--utility-purple-500)" baseUrl={baseUrl} />
                <span>{L.aiSummary}</span>
              </span>
              {hasSummary && (
                <button type="button" className="ood-ai-fold" onClick={() => setSummaryOpen((v) => !v)}>
                  {summaryOpen ? L.fold : L.unfold}
                </button>
              )}
            </div>
            {!hasSummary && (
              <div className="ood-ai-block">
                <p className="ood-ai-text">{L.summaryEmpty}</p>
              </div>
            )}
            {hasSummary && summaryOpen && (
              <>
                {summaryText && (
                  <div className="ood-ai-block">
                    <p className="ood-ai-text">{summaryText}</p>
                  </div>
                )}
                {decisions.length > 0 && (
                  <div className="ood-ai-block">
                    <p className="ood-ai-block-title">{L.decisions}</p>
                    <ul className="ood-ai-list">
                      {decisions.map((d, i) => <li key={i}>{d}</li>)}
                    </ul>
                  </div>
                )}
                {recheck.length > 0 && (
                  <div className="ood-ai-block">
                    <p className="ood-ai-block-title">{L.recheck}</p>
                    {recheck.map((r, i) => <p className="ood-ai-text" key={i}>{r}</p>)}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab === 'actions' && (
          <div className="ood-actions">
            {actions.length === 0 && <p className="ood-actions-count">{L.actionsEmpty}</p>}
            {actions.length > 0 && <p className="ood-actions-count">{L.actionsDone(doneCount, actions.length)}</p>}
            {/* 시안 데이터에 동일 문구 항목이 중복 등장한다 — 위치 기반 키. */}
            {actions.map((action, i) => (
              <div className="ood-action-row" key={i}>
                <span className={`ood-action-check${action.done ? ' is-done' : ''}`}>
                  {action.done && (
                    <Icon src={icons.check} size={14} color="var(--text-white)" baseUrl={baseUrl} />
                  )}
                </span>
                <span className={`ood-action-title${action.done ? ' is-done' : ''}`}>{action.title}</span>
                <span className="ood-action-meta">{action.owner}</span>
                <span className="ood-action-meta">{action.date}</span>
                {action.ai !== false && (
                  <span className="ood-action-ai">
                    <Icon src={icons.aiChat} size={14} color="var(--utility-purple-500)" baseUrl={baseUrl} />
                    <span>{L.aiTag}</span>
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'analysis' && (
          <>
            {!speaking && !mood && (
              <div className="ood-analysis">
                <p className="ood-analysis-note">{L.analysisEmpty}</p>
              </div>
            )}
            {speaking && (
              <div className="ood-analysis">
                <p className="ood-section-title">{L.speakRatio}</p>
                <div className="ood-speak-row">
                  <div className="ood-speak-col">
                    <p className="ood-bar-label">{L.speakManager(speaking.manager)}</p>
                    <div className="ood-bar"><i className="is-blue" style={{ width: `${speaking.manager}%` }} /></div>
                  </div>
                  <div className="ood-speak-col">
                    <p className="ood-bar-label">{L.speakMember(speaking.member)}</p>
                    <div className="ood-bar"><i className="is-green" style={{ width: `${speaking.member}%` }} /></div>
                  </div>
                </div>
                {detail.analysis?.note && <p className="ood-analysis-note">{detail.analysis.note}</p>}
              </div>
            )}
            {mood && (
              <div className="ood-analysis">
                <p className="ood-section-title">{L.mood}</p>
                {speaking && <p className="ood-bar-label">{L.speakManager(speaking.manager)}</p>}
                <div className="ood-mood-bar">
                  <i className="is-green" style={{ width: `${mood.positive}%` }} />
                  <i className="is-blue" style={{ width: `${mood.neutral}%` }} />
                  <i className="is-red" style={{ width: `${mood.negative}%` }} />
                </div>
                <div className="ood-mood-legend">
                  <span><i className="is-green" /> {L.moodPositive(mood.positive)}</span>
                  <span><i className="is-blue" /> {L.moodNeutral(mood.neutral)}</span>
                  <span><i className="is-red" /> {L.moodNegative(mood.negative)}</span>
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'feedback' && (
          <div className="ood-feedback">
            <div className="ood-feedback-head">
              <p className="ood-section-title is-primary">{L.managerFeedback}</p>
              {hasFeedback && feedback.visibility && <StatusBadge className="ood-tag">{feedback.visibility}</StatusBadge>}
            </div>
            {!hasFeedback && <p className="ood-analysis-note">{L.feedbackEmpty}</p>}
            {feedback?.strength && (
              <div className="ood-feedback-card is-strength">
                <p className="ood-feedback-label">{L.strength}</p>
                <p className="ood-feedback-text">{feedback.strength}</p>
              </div>
            )}
            {feedback?.growth && (
              <div className="ood-feedback-card is-growth">
                <p className="ood-feedback-label">{L.growth}</p>
                <p className="ood-feedback-text">{feedback.growth}</p>
              </div>
            )}
          </div>
        )}

        <div className="ood-schedule">
          <p className="ood-section-title">{L.scheduleTitle}</p>
          <div className="ood-schedule-fields">
            <div className="ood-field">
              <p className="ood-field-label">{L.date}</p>
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
                  <DatePickerPopover
                    value={date}
                    locale={locale}
                    labels={L}
                    onChange={(d) => { setDate(d); setDateOpen(false); }}
                  />
                )}
              </div>
            </div>
            <div className="ood-field">
              <p className="ood-field-label">{L.time}</p>
              <div className="ono-add-modal-popover-wrap" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="ono-add-modal-input"
                  onClick={() => { setTimeOpen((v) => !v); setDateOpen(false); }}
                >
                  <span className="ono-add-modal-input-text">{formatTime(time)}</span>
                  <Icon src={icons.chevronDown} size={20} color="var(--text-secondary)" baseUrl={baseUrl} />
                </button>
                {timeOpen && (
                  <div className="ono-add-modal-menu ono-add-modal-menu-time">
                    {TIME_SLOTS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        className={`ono-add-modal-menu-item ${t === time ? 'is-selected' : ''}`}
                        onClick={() => { setTime(t); setTimeOpen(false); }}
                      >
                        {formatTime(t)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          {showRemind && (
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
              <span className="ood-remind-label">{L.remind}</span>
            </label>
          )}
          {calendarConnected && (
            <div className="ood-calendar-row">
              <Icon src={icons.calendar} size={14} color="var(--text-secondary)" baseUrl={baseUrl} />
              <span>{L.calendarConnected}</span>
              <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden>
                <circle cx="7" cy="7" r="7" fill="var(--fg-success-secondary)" />
                <path d="M4 7.2 6.2 9.4 10 5.2" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
          {date ? (
            <button
              type="button"
              className="ood-schedule-btn"
              disabled={scheduling}
              onClick={() => onScheduleNext?.({
                date,
                time: formatTime(time),
                time24: time,
                remind: showRemind && remind,
              })}
            >
              {L.scheduleSubmit}
            </button>
          ) : (
            <p className="ood-schedule-hint">{L.scheduleHint}</p>
          )}
        </div>
      </div>
    </ModalShell>
  );
}
