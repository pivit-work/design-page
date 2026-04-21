import { useEffect, useRef, useState } from 'react';
import Icon from '../shared/Icon.jsx';
import NameColumn from './NameColumn.jsx';
import TimelineGrid from './TimelineGrid.jsx';
import WeekGrid from './WeekGrid.jsx';
import CalendarMonthView from './CalendarMonthView.jsx';
import MeetingModal from './MeetingModal.jsx';
import DatePickerPopover from './DatePickerPopover.jsx';
import DragPreview from './DragPreview.jsx';
import useScrollMirror from './hooks/useScrollMirror.js';
import useHorizontalDragScroll from './hooks/useHorizontalDragScroll.js';
import useTimelineDnD from './hooks/useTimelineDnD.js';
import { TimelineDataProvider } from './TimelineDataContext.jsx';
import TimelineWeeklyView from './TimelineWeeklyView.jsx';
import FilterMenuPopover, { FILTER_TYPES } from './FilterMenuPopover.jsx';
import GroupAddModal from './GroupAddModal.jsx';
import InternalEmployeeModal from './InternalEmployeeModal.jsx';
import ExternalEmployeeModal from './ExternalEmployeeModal.jsx';
import EventAddModal from './EventAddModal.jsx';
import SnippetModal from './SnippetModal.jsx';
import {
  GROUPS as DEFAULT_INITIAL_GROUPS,
  TODAY_STR,
  getWeekDates,
  getMonthDates,
  formatIsoDate,
} from './constants.js';

const formatKoreanDate = (d) =>
  `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;

const parseIsoDate = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

// 주/월별 보기에서 렌더할 날짜 배열. viewUnit 이 'day' 면 빈 배열.
//   week  → 7일(일~토)
//   month → 28~31일(selectedDate 가 속한 달의 1일~말일)
const getSnippetDates = (viewUnit, selectedDate) => {
  if (viewUnit === 'week') return getWeekDates(selectedDate);
  if (viewUnit === 'month') return getMonthDates(selectedDate);
  return [];
};

export default function TimelineCanvas({
  icons,
  baseUrl,
  // 데이터 주입 — 생략하면 constants 의 mock 데이터 사용 (디자인 프리뷰 용도).
  members,
  meetings,
  snippets,
  getEventsForDate,
  // 초기 그룹. 드래그 리오더는 내부 state 로 관리되며 변경 시 onGroupsChange 가 호출된다.
  initialGroups,
  onGroupsChange,
  // 간트 일 뷰에서 미팅 필터 기준 날짜 (ISO YYYY-MM-DD). 기본값은 TODAY_STR(mock용).
  ganttDayDate,
  // 스니핏 CTA 상태머신은 상위에서 제어할 수도 있다. 생략 시 내부 상태 사용.
  snippetState: snippetStateProp,
  onSnippetCreate,
  onSnippetEdit,
  // 일 뷰에서만 보이는 "이벤트 추가" 버튼 클릭.
  onAddEvent,
  // NameColumn 하단 버튼 3종. 미주입 시 no-op(버튼 클릭해도 아무 일 없음).
  onAddGroup,
  onAddInternalMember,
  onAddExternalMember,
}) {
  // 페이지 레벨 상단 탭 — Timeline(간트/캘린더) vs Weekly(AI 리포트)
  const [pageMode, setPageMode] = useState('timeline'); // 'timeline' | 'weekly'
  // 간트 / 캘린더 탭 — 캘린더 탭은 별도의 월 그리드 뷰.
  const [currentTab, setCurrentTab] = useState('gantt'); // 'gantt' | 'calendar'
  const [viewUnit] = useState('day');
  const [selectedDate, setSelectedDate] = useState(() => parseIsoDate(TODAY_STR));

  const isGantt = currentTab === 'gantt';
  const snippetDates = getSnippetDates(viewUnit, selectedDate);
  // viewUnit 이 같아도 월이 바뀌면 dayCount 가 변할 수 있기 때문에(예: 4월
  // 30일 → 5월 31일) 이 값으로 effect 를 트리거.
  const dayCount = snippetDates.length || 1;

  const {
    leftMidRef,
    leftContentRef,
    rightScrollRef,
    spacerH,
    dayColW,
    handleRightScroll,
  } = useScrollMirror({ enabled: isGantt, dayCount });

  const handleHorizontalDragMouseDown = useHorizontalDragScroll(rightScrollRef);

  // 그룹 state — 외부 initialGroups 가 바뀌면 동기화 (부모가 새 그룹 추가 등
  // 외부에서 변경한 경우를 반영). "Adjusting state while rendering" 패턴으로
  // initialGroups ref 변경 시에만 로컬 state 를 갱신.
  const [groups, setGroupsState] = useState(
    initialGroups ?? DEFAULT_INITIAL_GROUPS
  );
  const [syncedInitialGroups, setSyncedInitialGroups] = useState(initialGroups);
  if (initialGroups !== syncedInitialGroups) {
    setSyncedInitialGroups(initialGroups);
    if (initialGroups) setGroupsState(initialGroups);
  }

  const handleGroupsCommit = (next) => {
    setGroupsState(next);
    onGroupsChange?.(next);
  };

  const { dragState, dragOver, startDrag } = useTimelineDnD({
    groups,
    setGroups: handleGroupsCommit,
  });

  // ── Meeting modal state ──────────────────────────────────────────────────
  const [openMeeting, setOpenMeeting] = useState(null);
  const [openMeetingAnchor, setOpenMeetingAnchor] = useState(null);
  const [meetingVariant, setMeetingVariant] = useState(null); // 'calendar' | null

  const handleMeetingClick = (meeting, rect) => {
    setOpenMeeting(meeting);
    setOpenMeetingAnchor(rect);
    setMeetingVariant(null);
  };
  // 캘린더 셀의 이벤트 pill 클릭 — 간트 미팅 모달과 동일 UI 를 variant 로 열고
  // 캘린더 이벤트 데이터(time/title/color)를 미팅 shape 로 어댑트. width 410.
  const handleCalendarEventClick = (ev, rect) => {
    const WEEKDAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const d = parseIsoDate(ev.date);
    const meetingShape = {
      id: ev.id,
      title: ev.title,
      color: '#15b79e',
      timeLabel: `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]}) · ${ev.time}`,
      repeatLabel: '매주 일요일, 수요일',
      participants: ['m1', 'm2', 'm3', 'm4', 'm5'],
      organizer: 'm1',
      notification: '30분 전',
    };
    setOpenMeeting(meetingShape);
    setOpenMeetingAnchor(rect);
    setMeetingVariant('calendar');
  };
  const handleCloseMeeting = () => {
    setOpenMeeting(null);
    setOpenMeetingAnchor(null);
    setMeetingVariant(null);
  };

  // ── Snippet CTA state ────────────────────────────────────────────────────
  // 'create'    → "스니핏 작성" 버튼 (아직 이번 주 스니핏 미작성)
  // 'edit'      → "스니핏 수정" 버튼 (작성 완료 상태, 다시 수정 가능)
  // 'requested' → "스니핏 수정 승인 요청 완료" 상태 텍스트 (비인터랙티브)
  const [internalSnippetState, setInternalSnippetState] = useState('create');
  const snippetState = snippetStateProp ?? internalSnippetState;
  const [snippetModalOpen, setSnippetModalOpen] = useState(false);
  const handleSnippetCreate = () => {
    if (onSnippetCreate) onSnippetCreate();
    else setSnippetModalOpen(true);
  };
  const handleSnippetEdit = () => {
    if (onSnippetEdit) onSnippetEdit();
    else setSnippetModalOpen(true);
  };
  const handleSnippetSubmit = () => {
    setSnippetModalOpen(false);
    setInternalSnippetState((prev) => (prev === 'create' ? 'edit' : 'requested'));
  };

  // ── Filter menu (popover) ────────────────────────────────────────────────
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterAnchor, setFilterAnchor] = useState(null);
  const [filterSelected, setFilterSelected] = useState(FILTER_TYPES);
  const filterBtnRef = useRef(null);
  const toggleFilter = () => {
    if (filterOpen) { setFilterOpen(false); return; }
    const el = filterBtnRef.current;
    if (!el) return;
    setFilterAnchor(el.getBoundingClientRect());
    setFilterOpen(true);
  };
  const handleToggleFilterType = (type) => {
    setFilterSelected((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  // ── 그룹 / 내부·외부 직원 / 이벤트 모달 — parent callback 없을 때 내부 fallback
  const [groupAddOpen, setGroupAddOpen] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const [externalOpen, setExternalOpen] = useState(false);
  const [eventAddOpen, setEventAddOpen] = useState(false);
  const handleAddGroupClick = onAddGroup ?? (() => setGroupAddOpen(true));
  const handleAddInternalClick = onAddInternalMember ?? (() => setInternalOpen(true));
  const handleAddExternalClick = onAddExternalMember ?? (() => setExternalOpen(true));
  const handleAddEventClick = onAddEvent ?? (() => setEventAddOpen(true));
  const handleAddGroup = (name) => {
    handleGroupsCommit([
      ...groups,
      { id: `g-${Date.now()}`, label: name, memberIds: [] },
    ]);
    setGroupAddOpen(false);
  };
  const handleAddInternal = ({ memberId, groupId }) => {
    handleGroupsCommit(
      groups.map((g) =>
        g.id === groupId && !g.memberIds.includes(memberId)
          ? { ...g, memberIds: [...g.memberIds, memberId] }
          : g
      )
    );
    setInternalOpen(false);
  };
  const handleAddExternal = () => setExternalOpen(false);
  const handleAddEvent = () => setEventAddOpen(false);

  // ── Date picker state ────────────────────────────────────────────────────
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [datePickerAnchor, setDatePickerAnchor] = useState(null);
  // anchorEl 은 popover 의 outside-click 핸들러에서 "anchor 버튼 클릭은 무시"
  // 판정을 위해 필요. 렌더 중 ref.current 를 읽지 않도록 toggle 시점에 캡처.
  const [datePickerAnchorEl, setDatePickerAnchorEl] = useState(null);
  const dateBtnRef = useRef(null);

  const toggleDatePicker = () => {
    if (datePickerOpen) {
      setDatePickerOpen(false);
      return;
    }
    const el = dateBtnRef.current;
    if (!el) return;
    setDatePickerAnchor(el.getBoundingClientRect());
    setDatePickerAnchorEl(el);
    setDatePickerOpen(true);
  };
  const handleCloseDatePicker = () => setDatePickerOpen(false);
  const handleSelectDate = (d) => {
    setSelectedDate(d);
    setDatePickerOpen(false);
  };

  // 날짜 이동 단위:
  //   캘린더 탭       → 1 개월
  //   간트 일         → 하루
  //   간트 주         → 7 일
  //   간트 월         → 1 개월
  const shiftByViewUnit = (direction) => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      if (currentTab === 'calendar') next.setMonth(next.getMonth() + direction);
      else if (viewUnit === 'week') next.setDate(next.getDate() + direction * 7);
      else if (viewUnit === 'month') next.setMonth(next.getMonth() + direction);
      else next.setDate(next.getDate() + direction);
      return next;
    });
  };
  const goPrevDate = () => shiftByViewUnit(-1);
  const goNextDate = () => shiftByViewUnit(1);
  const goToday = () => {
    setSelectedDate(parseIsoDate(TODAY_STR));
    // 월별 뷰에서는 오늘 컬럼이 가로 스크롤의 중앙에 오도록 이동.
    // setSelectedDate 이후 React 가 새 dates/dayColW 로 grid 를 commit
    // 해야 실제 column offsetWidth 가 확정되므로 rAF 로 1 프레임 defer.
    if (viewUnit !== 'month') return;
    requestAnimationFrame(() => {
      const rightScroll = rightScrollRef.current;
      if (!rightScroll) return;
      // 렌더된 헤더 셀에서 실제 column 폭을 측정 → state 스테일 이슈 회피.
      const headerCell = rightScroll.querySelector('.tl-week-header-cell');
      if (!headerCell) return;
      const colW = headerCell.offsetWidth;
      const todayDate = parseIsoDate(TODAY_STR);
      const idx = todayDate.getDate() - 1; // 1일 = index 0
      const colCenter = idx * colW + colW / 2;
      const target = colCenter - rightScroll.clientWidth / 2;
      const maxScroll = rightScroll.scrollWidth - rightScroll.clientWidth;
      rightScroll.scrollLeft = Math.max(0, Math.min(target, maxScroll));
    });
  };

  // Scroll right grid so "current hour" is visible on first render.
  useEffect(() => {
    const sc = rightScrollRef.current;
    if (!sc) return;
    sc.scrollLeft = 0;
  }, [rightScrollRef]);

  return (
    <TimelineDataProvider
      members={members}
      meetings={meetings}
      snippets={snippets}
      getEventsForDate={getEventsForDate}
    >
    <main className="tl-page">
      {/* Page header — Timeline / Weekly 페이지 레벨 탭 */}
      <div className="tl-page-header">
        <div className="tl-page-title-wrap">
          <h1 className="tl-page-title">
            <button
              type="button"
              className={`tl-page-title-tab ${pageMode === 'timeline' ? 'is-active' : ''}`}
              onClick={() => setPageMode('timeline')}
            >
              Timeline
            </button>
            <button
              type="button"
              className={`tl-page-title-tab ${pageMode === 'weekly' ? 'is-active' : ''}`}
              onClick={() => setPageMode('weekly')}
            >
              Weekly
            </button>
          </h1>
          <div className="tl-page-meta">
            <span className="tl-meta-label">진행 중 프로젝트</span>
            <span className="tl-meta-sep">·</span>
            <span className="tl-meta-count">2개</span>
          </div>
        </div>
      </div>

      {pageMode === 'weekly' && <TimelineWeeklyView baseUrl={baseUrl} />}
      {pageMode === 'timeline' && (
      <>

      {/* Tab row (간트 / 캘린더) + GCal status */}
      <div className="tl-tabs-row">
        <div className="tl-tabs">
          <button
            type="button"
            className={`tl-tab ${currentTab === 'gantt' ? 'is-active' : ''}`}
            onClick={() => setCurrentTab('gantt')}
          >
            간트
          </button>
          <button
            type="button"
            className={`tl-tab ${currentTab === 'calendar' ? 'is-active' : ''}`}
            onClick={() => setCurrentTab('calendar')}
          >
            캘린더
          </button>
        </div>
        <div className="tl-gcal-status">
          <Icon src="/icons-solid/calendar-check-02.svg" size={14} color="var(--colors-foreground-fgTertiary)" baseUrl={baseUrl} />
          <span>Google Calendar 연동 중</span>
          <Icon src="/icons-solid/check-circle.svg" size={14} color="#2dbd82" baseUrl={baseUrl} />
        </div>
      </div>

      {/* Toolbar row (일/주/월, date nav, filter, + 이벤트 추가)
          캘린더 탭에서는 segmented control 숨김 — viewUnit 개념이 없음. */}
      <div className="tl-toolbar">
        <button
          ref={dateBtnRef}
          type="button"
          className={`tl-date-picker ${datePickerOpen ? 'is-open' : ''}`}
          onClick={toggleDatePicker}
          aria-haspopup="dialog"
          aria-expanded={datePickerOpen}
        >
          <Icon src="/icons/calendar.svg" size={20} color="var(--colors-foreground-fgTertiary)" baseUrl={baseUrl} />
          <span>{formatKoreanDate(selectedDate)}</span>
        </button>

        <div className="tl-date-nav">
          <button type="button" className="tl-nav-btn" aria-label="이전" onClick={goPrevDate}>
            <Icon src="/icons/chevron-left.svg" size={20} color="var(--colors-foreground-fgPrimary)" baseUrl={baseUrl} />
          </button>
          <button type="button" className="tl-nav-btn tl-nav-today" onClick={goToday}>오늘</button>
          <button type="button" className="tl-nav-btn" aria-label="다음" onClick={goNextDate}>
            <Icon src="/icons/chevron-right.svg" size={20} color="var(--colors-foreground-fgPrimary)" baseUrl={baseUrl} />
          </button>
        </div>

        <button
          ref={filterBtnRef}
          type="button"
          className={`tl-filter-btn ${filterOpen ? 'is-open' : ''}`}
          aria-label="필터"
          aria-haspopup="menu"
          aria-expanded={filterOpen}
          onClick={toggleFilter}
        >
          <Icon src="/icons/filter-lines.svg" size={20} color="var(--colors-foreground-fgPrimary)" baseUrl={baseUrl} />
        </button>

        <div className="tl-toolbar-spacer" />

        {isGantt && viewUnit === 'day' && (
          <button
            type="button"
            className="tl-add-event tl-add-event-secondary"
            onClick={handleAddEventClick}
          >
            <Icon src={icons.plus} size={20} color="var(--colors-foreground-fgBrandPrimary, #2dbd82)" baseUrl={baseUrl} />
            <span>이벤트 추가</span>
          </button>
        )}

        {snippetState === 'create' ? (
          <button type="button" className="tl-add-event" onClick={handleSnippetCreate}>
            <Icon src="/icons-solid/file-06.svg" size={20} color="#fff" baseUrl={baseUrl} />
            <span>스니핏 작성</span>
          </button>
        ) : snippetState === 'edit' ? (
          <button type="button" className="tl-add-event" onClick={handleSnippetEdit}>
            <Icon src="/icons-solid/pencil-01.svg" size={20} color="#fff" baseUrl={baseUrl} />
            <span>스니핏 수정</span>
          </button>
        ) : (
          <div className="tl-snippet-status" role="status">
            <Icon src="/icons-solid/hand.svg" size={20} color="var(--colors-text-textBrandTertiary, #21a67a)" baseUrl={baseUrl} />
            <span>스니핏 수정 승인 요청 완료</span>
          </div>
        )}
      </div>

      {/* Body — 캘린더 탭이면 monthly grid, 간트 탭이면 기존 name col + grid */}
      {currentTab === 'calendar' ? (
        <div className="tl-body tl-body-calendar">
          <CalendarMonthView selectedDate={selectedDate} onEventClick={handleCalendarEventClick} />
        </div>
      ) : (
        <div className="tl-body">
          <NameColumn
            ref={leftMidRef}
            contentRef={leftContentRef}
            icons={icons}
            baseUrl={baseUrl}
            groups={groups}
            dragState={dragState}
            dragOver={dragOver}
            onStartDrag={startDrag}
            onAddGroup={handleAddGroupClick}
            onAddInternalMember={handleAddInternalClick}
            onAddExternalMember={handleAddExternalClick}
          />
          {viewUnit === 'day' ? (
            <TimelineGrid
              ref={rightScrollRef}
              onScroll={handleRightScroll}
              onMouseDown={handleHorizontalDragMouseDown}
              groups={groups}
              onMeetingClick={handleMeetingClick}
              spacerH={spacerH}
              targetDate={ganttDayDate ?? formatIsoDate(selectedDate)}
            />
          ) : (
            <WeekGrid
              ref={rightScrollRef}
              onScroll={handleRightScroll}
              onMouseDown={handleHorizontalDragMouseDown}
              groups={groups}
              dates={snippetDates}
              spacerH={spacerH}
              dayColW={dayColW}
            />
          )}
        </div>
      )}

      </>
      )}

      {/* Meeting detail modal */}
      {openMeeting && (
        <MeetingModal
          meeting={openMeeting}
          anchorRect={openMeetingAnchor}
          onClose={handleCloseMeeting}
          variant={meetingVariant}
        />
      )}

      {filterOpen && (
        <FilterMenuPopover
          anchorRect={filterAnchor}
          anchorEl={filterBtnRef.current}
          selected={filterSelected}
          onToggle={handleToggleFilterType}
          onClose={() => setFilterOpen(false)}
          baseUrl={baseUrl}
        />
      )}

      {groupAddOpen && (
        <GroupAddModal
          onClose={() => setGroupAddOpen(false)}
          onSubmit={handleAddGroup}
        />
      )}

      {internalOpen && (
        <InternalEmployeeModal
          groups={groups}
          onClose={() => setInternalOpen(false)}
          onSubmit={handleAddInternal}
        />
      )}

      {externalOpen && (
        <ExternalEmployeeModal
          groups={groups}
          onClose={() => setExternalOpen(false)}
          onSubmit={handleAddExternal}
        />
      )}

      {eventAddOpen && (
        <EventAddModal
          date={selectedDate}
          baseUrl={baseUrl}
          onClose={() => setEventAddOpen(false)}
          onSubmit={handleAddEvent}
        />
      )}

      {snippetModalOpen && (
        <SnippetModal
          date={selectedDate}
          baseUrl={baseUrl}
          onClose={() => setSnippetModalOpen(false)}
          onSubmit={handleSnippetSubmit}
        />
      )}

      {/* Date picker popover (mini calendar)
          캘린더 탭에서는 chevron 으로 월을 이동하면 main 월 그리드까지
          함께 이동해야 하므로 onMonthChange 를 주입. */}
      {datePickerOpen && (
        <DatePickerPopover
          anchorRect={datePickerAnchor}
          anchorEl={datePickerAnchorEl}
          selectedDate={selectedDate}
          onSelect={handleSelectDate}
          onClose={handleCloseDatePicker}
          onMonthChange={
            currentTab === 'calendar'
              ? (y, m) => setSelectedDate(new Date(y, m, 1))
              : undefined
          }
        />
      )}

      {dragState && (
        <DragPreview
          member={dragState.member}
          x={dragState.clientX - dragState.offsetX}
          y={dragState.clientY - dragState.offsetY}
          width={dragState.width}
          height={dragState.height}
        />
      )}
    </main>
    </TimelineDataProvider>
  );
}
