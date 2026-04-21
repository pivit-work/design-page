import Icon from '../shared/Icon.jsx';

/**
 * MeetingsCanvas — 회의록 메뉴 페이지.
 *
 * Figma node-id=16708-26634. 오늘 회의 / 지난 회의 리스트.
 * 진행 중 회의는 연한 초록 배경 + 시작 버튼, 예정 회의는 흰 배경.
 * 지난 회의는 opacity 0.5 로 dimmed.
 */

const TODAY_MEETINGS = [
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

const PAST_MEETINGS = [
  {
    id: 'past-1',
    time: '16:00',
    duration: '1h',
    title: '투자자 미팅 — Series A',
    participants: 'David · Kurt',
  },
];

const STATUS_TAG = {
  ongoing: { label: '진행 중', className: 'mtg-tag-ongoing' },
  scheduled: { label: '예정', className: 'mtg-tag-scheduled' },
};

function MeetingRow({ meeting }) {
  const statusTag = meeting.status ? STATUS_TAG[meeting.status] : null;
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
        <button type="button" className="mtg-start-btn">시작</button>
      )}
    </div>
  );
}

export default function MeetingsCanvas({ baseUrl = '' }) {
  return (
    <main className="mtg-page">
      {/* Page header — 타임라인/다른 페이지와 동일한 공용 스타일 재사용 */}
      <div className="tl-page-header">
        <div className="tl-page-title-wrap">
          <h1 className="tl-page-title">회의 목록</h1>
          <div className="tl-page-meta">
            <span className="tl-meta-label">오늘회의</span>
            <span className="tl-meta-sep">·</span>
            <span className="tl-meta-count">5개</span>
          </div>
        </div>
      </div>

      <div className="mtg-content">
        {/* 오늘의 회의 */}
        <section className="mtg-section">
          <header className="mtg-section-head">
            <div className="mtg-section-title-wrap">
              <span className="mtg-section-date">2026년 4월 7일 화요일</span>
              <h2 className="mtg-section-title">오늘의 회의</h2>
            </div>
            <div className="mtg-gcal-status">
              <Icon src="/icons-solid/calendar-check-02.svg" size={14} color="var(--colors-foreground-fgTertiary)" baseUrl={baseUrl} />
              <span>Google Calendar 연동 중</span>
              <Icon src="/icons-solid/check-circle.svg" size={14} color="#2dbd82" baseUrl={baseUrl} />
            </div>
          </header>
          <div className="mtg-list">
            {TODAY_MEETINGS.map((m) => (
              <MeetingRow key={m.id} meeting={m} />
            ))}
          </div>
        </section>

        {/* 지난 회의 — 섹션 전체 opacity 0.5 */}
        <section className="mtg-section mtg-section-past">
          <header className="mtg-section-head">
            <h2 className="mtg-section-title">지난 회의</h2>
          </header>
          <div className="mtg-list">
            {PAST_MEETINGS.map((m) => (
              <MeetingRow key={m.id} meeting={m} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
