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
 * 모든 데이터/라벨은 caller 에서 주입한다. 패키지 내부에는 demo fallback 이 없다.
 */

function MeetingRow({ meeting, onStart, onRowClick, statusLabels }) {
  const statusTag = meeting.status ? statusLabels[meeting.status] : null;
  const isOngoing = meeting.status === 'ongoing';
  const clickable = !!onRowClick;
  const handleRowClick = clickable ? () => onRowClick(meeting) : undefined;
  const handleRowKeyDown = clickable
    ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onRowClick(meeting);
        }
      }
    : undefined;
  return (
    <div
      className={`mtg-row ${isOngoing ? 'is-ongoing' : ''} ${clickable ? 'is-clickable' : ''}`}
      onClick={handleRowClick}
      onKeyDown={handleRowKeyDown}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
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
      {meeting.summaryFailed ? (
        // 생성이 멈춘 상태 — "생성 중" 과 구분되지 않으면 목록이 거짓말을 한다.
        // 상세로 들어가면 사유와 [다시 시도] 를 볼 수 있다.
        <span className="mtg-row-failed">{statusLabels.failedLabel}</span>
      ) : meeting.generating ? (
        <span className="mtg-row-generating">{statusLabels.generatingLabel}</span>
      ) : (
        isOngoing && (
          <button
            type="button"
            className="mtg-start-btn"
            onClick={(e) => {
              // 부모 행 클릭과 겹치지 않도록 stopPropagation.
              e.stopPropagation();
              onStart?.(meeting);
            }}
          >
            {statusLabels.startLabel}
          </button>
        )
      )}
    </div>
  );
}

export default function MeetingsCanvas({
  baseUrl = '',
  todayMeetings,
  pastMeetings,
  todayDateLabel,
  todayCountLabel,
  labels,
  // Google Calendar 연동 여부. true (기본) 면 헤더에 초록 체크 아이콘 노출,
  // false 면 체크 아이콘을 가리고 라벨에 경고 톤 색을 적용한다. caller 가
  // 미지정하면 backward-compat 차원에서 연동 됨으로 간주.
  gcalConnected = true,
  // 시작 버튼 클릭 훅: 호출 시 caller 가 직접 모달 렌더 + 실데이터 주입 가능.
  // 없으면 내부 state 로 MeetingInProgressModal 을 열기(단, modal 데이터도
  // caller 가 progressData/recordData/shareData/modalLabels 로 넘겨야 한다).
  onStartMeeting,
  // 행 전체 클릭 훅: completed 회의의 기록 보기 등, 시작 버튼과 별개 동작을
  // 연결하고 싶을 때 사용. 미지정 시 행은 클릭 불가.
  onRowClick,
  // 액션 아이템 전체 뷰(/meetings/actions) 진입 훅. 미지정 시 링크를 숨긴다.
  onViewActions,
  progressData,
  recordData,
  shareData,
  modalLabels,
}) {
  const L = { viewActions: '액션 아이템', ...labels };
  const statusLabels = {
    ongoing: { label: labels.ongoing, className: 'mtg-tag-ongoing' },
    scheduled: { label: labels.scheduled, className: 'mtg-tag-scheduled' },
    completed: { label: labels.completed, className: 'mtg-tag-completed' },
    startLabel: labels.start,
    generatingLabel: labels.generating,
    failedLabel: labels.summaryFailed,
  };

  const [activeMeeting, setActiveMeeting] = useState(null);
  return (
    <main className="mtg-page">
      {/* Page header — 타임라인/다른 페이지와 동일한 공용 스타일 재사용 */}
      <div className="tl-page-header">
        <div className="tl-page-title-wrap">
          <h1 className="tl-page-title">{labels.headerTitle}</h1>
          <div className="tl-page-meta">
            <span className="tl-meta-label">{labels.todayMetaLabel}</span>
            <span className="tl-meta-sep">·</span>
            <span className="tl-meta-count">{todayCountLabel}</span>
          </div>
        </div>
        {/* 액션 아이템 전체 뷰 진입 — 회의에서 나온 할 일을 모아 보는 화면
            (user-flow-spec: /meetings/actions). onViewActions 미지정 시 숨김. */}
        {onViewActions && (
          <button type="button" className="mtg-actions-link" onClick={onViewActions}>
            <Icon src="/icons-solid/file-02.svg" size={16} color="var(--text-secondary)" baseUrl={baseUrl} />
            <span>{L.viewActions}</span>
          </button>
        )}
      </div>

      <div className="mtg-content">
        {/* 오늘의 회의 */}
        <section className="mtg-section">
          <header className="mtg-section-head">
            <div className="mtg-section-title-wrap">
              <span className="mtg-section-date">{todayDateLabel}</span>
              <h2 className="mtg-section-title">{labels.todaySectionTitle}</h2>
            </div>
            <div className={`mtg-gcal-status ${gcalConnected ? '' : 'is-disconnected'}`}>
              <Icon src="/icons-solid/calendar-check-02.svg" size={14} color="var(--colors-foreground-fgTertiary)" baseUrl={baseUrl} />
              <span>{labels.gcalStatus}</span>
              {gcalConnected && (
                <Icon src="/icons-solid/check-circle.svg" size={14} color="#2dbd82" baseUrl={baseUrl} />
              )}
            </div>
          </header>
          <div className="mtg-list">
            {todayMeetings.map((m) => (
              <MeetingRow
                key={m.id}
                meeting={m}
                onStart={onStartMeeting ?? setActiveMeeting}
                onRowClick={onRowClick}
                statusLabels={statusLabels}
              />
            ))}
          </div>
        </section>

        {/* 지난 회의 — 섹션 전체 opacity 0.5 */}
        <section className="mtg-section mtg-section-past">
          <header className="mtg-section-head">
            <h2 className="mtg-section-title">{labels.pastSectionTitle}</h2>
          </header>
          <div className="mtg-list">
            {pastMeetings.map((m) => (
              <MeetingRow
                key={m.id}
                meeting={m}
                onRowClick={onRowClick}
                statusLabels={statusLabels}
              />
            ))}
          </div>
        </section>
      </div>

      {activeMeeting && !onStartMeeting && (
        <MeetingInProgressModal
          meeting={activeMeeting}
          baseUrl={baseUrl}
          onClose={() => setActiveMeeting(null)}
          labels={modalLabels}
          recordData={recordData}
          shareData={shareData}
          {...(progressData ?? {})}
        />
      )}
    </main>
  );
}
