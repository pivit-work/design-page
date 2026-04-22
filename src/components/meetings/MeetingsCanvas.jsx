import { useState } from 'react';
import Icon from '../shared/Icon.jsx';
import MeetingInProgressModal from './MeetingInProgressModal.jsx';

/**
 * MeetingsCanvas — 회의록 메뉴 페이지.
 *
 * Figma node-id=16708-26634. 오늘 회의 / 지난 회의 리스트.
 * 진행 중 회의는 연한 초록 배경 + 시작 버튼, 예정 회의는 흰 배경.
 * 지난 회의는 opacity 0.5 로 dimmed.
 *
 * props 가 전달되지 않으면 Figma 시안 그대로 데모 데이터 + 한국어 라벨을 사용한다
 * (backward compat). 실서비스에서 사용할 때는 아래 props 로 주입.
 */

const DEFAULT_TODAY_MEETINGS = [
  {
    id: 'today-1',
    time: '10:00',
    duration: '1h',
    title: '스프린트 리뷰',
    status: 'ongoing',
    participants: 'David · Kurt',
  },
  {
    id: 'today-2',
    time: '14:00',
    duration: '1h',
    title: '1on1 - David & Kurt 그리고 점심식사',
    status: 'scheduled',
    participants: 'David · Kurt',
  },
  {
    id: 'today-3',
    time: '16:00',
    duration: '1h',
    title: '투자자 미팅 — Series A',
    status: 'scheduled',
    participants: 'David · Kurt',
  },
];

const DEFAULT_PAST_MEETINGS = [
  {
    id: 'past-1',
    time: '16:00',
    duration: '1h',
    title: '투자자 미팅 — Series A',
    participants: 'David · Kurt',
  },
];

const DEFAULT_LABELS = {
  headerTitle: '회의 목록',
  todayMetaLabel: '오늘회의',
  todaySectionTitle: '오늘의 회의',
  pastSectionTitle: '지난 회의',
  gcalStatus: 'Google Calendar 연동 중',
  ongoing: '진행 중',
  scheduled: '예정',
  start: '시작',
};

function MeetingRow({ meeting, onStart, statusLabels }) {
  const statusTag = meeting.status ? statusLabels[meeting.status] : null;
  const isOngoing = meeting.status === 'ongoing';
  return (
    <div className={`mtg-row ${isOngoing ? 'is-ongoing' : ''}`}>
      <div className="mtg-row-time">
        <span className="mtg-row-time-main">{meeting.time}</span>
        <span className="mtg-row-time-dur">{meeting.duration}</span>
      </div>
      <div className="mtg-row-body">
        <div className="mtg-row-head">
          <span className="mtg-row-title">{meeting.title}</span>
          {statusTag && (
            <span className={`mtg-tag ${statusTag.className}`}>{statusTag.label}</span>
          )}
        </div>
        <span className="mtg-row-participants">{meeting.participants}</span>
      </div>
      {isOngoing && (
        <button type="button" className="mtg-start-btn" onClick={() => onStart?.(meeting)}>
          {statusLabels.startLabel}
        </button>
      )}
    </div>
  );
}

export default function MeetingsCanvas({
  baseUrl = '',
  todayMeetings,
  pastMeetings,
  todayDateLabel = '2026년 4월 7일 화요일',
  todayCountLabel,
  labels = {},
}) {
  const mergedLabels = { ...DEFAULT_LABELS, ...labels };
  const resolvedToday = todayMeetings ?? DEFAULT_TODAY_MEETINGS;
  const resolvedPast = pastMeetings ?? DEFAULT_PAST_MEETINGS;
  const resolvedCount = todayCountLabel ?? `${resolvedToday.length}개`;
  const statusLabels = {
    ongoing: { label: mergedLabels.ongoing, className: 'mtg-tag-ongoing' },
    scheduled: { label: mergedLabels.scheduled, className: 'mtg-tag-scheduled' },
    startLabel: mergedLabels.start,
  };

  const [activeMeeting, setActiveMeeting] = useState(null);
  return (
    <main className="mtg-page">
      {/* Page header — 타임라인/다른 페이지와 동일한 공용 스타일 재사용 */}
      <div className="tl-page-header">
        <div className="tl-page-title-wrap">
          <h1 className="tl-page-title">{mergedLabels.headerTitle}</h1>
          <div className="tl-page-meta">
            <span className="tl-meta-label">{mergedLabels.todayMetaLabel}</span>
            <span className="tl-meta-sep">·</span>
            <span className="tl-meta-count">{resolvedCount}</span>
          </div>
        </div>
      </div>

      <div className="mtg-content">
        {/* 오늘의 회의 */}
        <section className="mtg-section">
          <header className="mtg-section-head">
            <div className="mtg-section-title-wrap">
              <span className="mtg-section-date">{todayDateLabel}</span>
              <h2 className="mtg-section-title">{mergedLabels.todaySectionTitle}</h2>
            </div>
            <div className="mtg-gcal-status">
              <Icon src="/icons-solid/calendar-check-02.svg" size={14} color="var(--colors-foreground-fgTertiary)" baseUrl={baseUrl} />
              <span>{mergedLabels.gcalStatus}</span>
              <Icon src="/icons-solid/check-circle.svg" size={14} color="#2dbd82" baseUrl={baseUrl} />
            </div>
          </header>
          <div className="mtg-list">
            {resolvedToday.map((m) => (
              <MeetingRow
                key={m.id}
                meeting={m}
                onStart={setActiveMeeting}
                statusLabels={statusLabels}
              />
            ))}
          </div>
        </section>

        {/* 지난 회의 — 섹션 전체 opacity 0.5 */}
        <section className="mtg-section mtg-section-past">
          <header className="mtg-section-head">
            <h2 className="mtg-section-title">{mergedLabels.pastSectionTitle}</h2>
          </header>
          <div className="mtg-list">
            {resolvedPast.map((m) => (
              <MeetingRow key={m.id} meeting={m} statusLabels={statusLabels} />
            ))}
          </div>
        </section>
      </div>

      {activeMeeting && (
        <MeetingInProgressModal
          meeting={activeMeeting}
          baseUrl={baseUrl}
          onClose={() => setActiveMeeting(null)}
        />
      )}
    </main>
  );
}
