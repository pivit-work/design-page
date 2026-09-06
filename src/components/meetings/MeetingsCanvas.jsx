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

function MeetingRow({ meeting, onStart, onRowClick, statusLabels, isStarting, startLock }) {
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
      ) : isStarting ? (
        // 이미 이 회의의 녹음이 진행 중(모달이 위젯으로 축소된 상태) —
        // Figma 16817:40731: 비활성 [진행 중] 버튼으로 중복 시작을 막는다.
        <button type="button" className="mtg-start-btn is-inprogress" disabled>
          {statusLabels.ongoing.label}
        </button>
      ) : (
        isOngoing &&
        (startLock ? (
          // 진행 중인 1on1 이 있어 마이크를 쥘 수 없다 (PW-579 · policy §5.8 X1·X6).
          // 🔴 위의 `isStarting` 잠금(= 이 회의가 이미 녹음 중 · PW-557)과 **다른 건**이라
          // 분기를 합치지 않는다. 사유가 다르면 사용자가 할 일도 다르다.
          // 라벨은 그대로 두고 비활성으로만 둔다 — 회의록 쪽 잠긴 버튼 문구는 기획서가
          // 정하지 않았고, 이유는 목록 위 배너와 툴팁이 말한다.
          <button
            type="button"
            className="mtg-start-btn is-locked"
            disabled
            title={startLock.tooltip || undefined}
          >
            {statusLabels.startLabel}
          </button>
        ) : (
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
        ))
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
  // 캘린더 일정과 무관하게 "지금 회의를 시작" 하는 진입 훅.
  // 시작 버튼은 오늘 회의 행에만 붙기 때문에, 캘린더가 비어 있으면 녹음 flow 로
  // 들어갈 문이 아예 없다 — 헤더에 항상 열려 있는 문을 하나 둔다.
  // 미지정 시 버튼을 숨긴다 (핸들러 없는 버튼은 눌러도 무동작이라 없느니만 못하다).
  onStartAdhoc,
  /** 시작 flow 가 이미 열려 있는(녹음 진행 중) 회의 id — 해당 행의 [시작] 을
   *  비활성 [진행 중] 버튼으로 바꾼다 (Figma 16817:40731). */
  startingMeetingId,
  /**
   * 진행 중인 1on1 때문에 **회의 녹음을 시작할 수 없는** 상태 (PW-579 · policy §5.8).
   *
   * `{ notice, actionLabel, onAction, tooltip }`. 주면 오늘 회의 행의 [시작] 과
   * 헤더의 [회의 시작] 이 모두 잠기고, 목록 위에 이유와 갈 곳을 담은 배너가 선다.
   *
   * 🔴 `startingMeetingId`(이 회의가 이미 녹음 중 · PW-557)와 **다른 축**이다. 그쪽은
   * 「그 한 행」의 중복 시작을 막고, 이쪽은 「마이크를 이미 다른 곳이 쥐고 있다」라서
   * **모든 시작 자리**를 막는다. 문구도 다르다.
   *
   * 문구·이동 동작은 소비처가 쥔다 — 어느 회차가 돌고 있는지는 여기서 알 수 없다.
   */
  startLock = null,
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
        <div className="mtg-header-actions">
          {/* 액션 아이템 전체 뷰 진입 — 회의에서 나온 할 일을 모아 보는 화면
              (user-flow-spec: /meetings/actions). onViewActions 미지정 시 숨김. */}
          {onViewActions && (
            <button type="button" className="mtg-actions-link" onClick={onViewActions}>
              <Icon src="/icons-solid/file-02.svg" size={16} color="var(--text-secondary)" baseUrl={baseUrl} />
              <span>{L.viewActions}</span>
            </button>
          )}
          {/* 캘린더 없이 지금 바로 녹음 — 목록 전체에서 유일하게 항상 열려 있는 진입점. */}
          {/* 캘린더 없이 지금 바로 녹음하는 문도 같은 규칙으로 잠근다 — 여기를 열어
              두면 잠금이 목록 행에만 걸리고 이 버튼으로 그대로 뚫린다. */}
          {onStartAdhoc && (
            <button
              type="button"
              className={`mtg-start-adhoc ${startLock ? 'is-locked' : ''}`}
              onClick={startLock ? undefined : onStartAdhoc}
              disabled={!!startLock}
              title={startLock?.tooltip || undefined}
            >
              <Icon src="/icons-solid/microphone-01.svg" size={16} color="currentColor" baseUrl={baseUrl} />
              <span>{L.startAdhoc}</span>
            </button>
          )}
        </div>
      </div>

      {/* 진행 중인 1on1 잠금 안내 (PW-579 · policy §5.8 X4 · 회의록 §5.6).
          🔴 목록 «위»에 둔다 — 잠긴 버튼은 행마다 흩어져 있어서, 이유를 행 옆에만 두면
          오늘 회의가 여러 개일 때 같은 문장이 여러 번 반복된다. 갈 곳(진행 중인 1on1)도
          하나뿐이라 한 자리에 있는 편이 맞다.
          시각은 새로 만들지 않았다 — 이 화면의 구글 동기화 배너와 같은 계열이다. */}
      {startLock?.notice && (
        <div className="mtg-lock-banner" role="status">
          <span className="mtg-lock-banner-text">{startLock.notice}</span>
          {startLock.actionLabel && startLock.onAction && (
            <button
              type="button"
              className="mtg-lock-banner-action"
              onClick={startLock.onAction}
            >
              {startLock.actionLabel}
            </button>
          )}
        </div>
      )}
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
          {/* 오늘 회의가 0건이면 제목 아래가 그냥 비어 버린다 — 왜 아무것도 없는지,
              그래서 무엇을 하면 되는지를 말해 준다 (라벨은 caller 주입). */}
          {todayMeetings.length === 0 ? (
            <div className="mtg-empty">
              <Icon
                src="/icons-solid/calendar.svg"
                size={28}
                color="var(--text-tertiary)"
                baseUrl={baseUrl}
              />
              <span className="mtg-empty-title">{L.emptyToday}</span>
              {L.emptyTodayHint && (
                <span className="mtg-empty-hint">{L.emptyTodayHint}</span>
              )}
            </div>
          ) : (
            <div className="mtg-list">
              {todayMeetings.map((m) => (
                <MeetingRow
                  key={m.id}
                  meeting={m}
                  onStart={onStartMeeting ?? setActiveMeeting}
                  onRowClick={onRowClick}
                  statusLabels={statusLabels}
                  isStarting={m.id === startingMeetingId}
                  startLock={startLock}
                />
              ))}
            </div>
          )}
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
