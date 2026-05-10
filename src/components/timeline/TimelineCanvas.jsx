import { useEffect, useMemo, useRef, useState } from 'react';
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
import Tabs from '../shared/Tabs.jsx';

const TIMELINE_TAB_ITEMS = [
  { value: 'gantt', label: '간트' },
  { value: 'calendar', label: '캘린더' },
];
import { TimelineDataProvider } from './TimelineDataContext.jsx';
import FilterMenuPopover, { FILTER_TYPES } from './FilterMenuPopover.jsx';
import GroupAddModal from './GroupAddModal.jsx';
import InternalEmployeeModal from './InternalEmployeeModal.jsx';
import ExternalEmployeeModal from './ExternalEmployeeModal.jsx';
import EventAddModal from './EventAddModal.jsx';
import SnippetModal from './SnippetModal.jsx';
import SnippetPromptModal from './SnippetPromptModal.jsx';
import {
  TODAY_STR,
  HOURS,
  HOUR_W,
  getWeekDates,
  getMonthDates,
  formatIsoDate,
  getTodayStr,
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
  // 필터 타입 controlled — 주입 시 외부 state 로 동기화되고 onFilterChange 로
  // 통지. 생략하면 내부 state (전체 선택) 로 자체 관리. 선택된 type 에 해당하는
  // meeting/event 만 간트·캘린더에 렌더된다.
  filterSelected: filterSelectedProp,
  onFilterChange,
  // 구글 캘린더 연동 상태. 기본 true — 연동됨 라벨 + 초록 체크 아이콘.
  // false 면 "Google Calendar 미연동" 라벨 + 회색 아이콘으로 대체.
  gcalConnected = true,
  // 초기 selectedDate. 생략 시 TODAY_STR(데모용 고정 2026-04-15). 실 운영
  // 환경에서는 new Date() 를 넘겨 앱 진입 시 실제 오늘이 보이도록.
  initialDate,
  // 헤더 우측 "진행 중 프로젝트 · N개" 카운트. 생략하면 2(디자인 프리뷰용).
  // 실 운영에서는 실제 active project 수를 넘긴다. 0 이면 "0개" 로 렌더.
  activeProjectCount = 2,
}) {
  // 간트 / 캘린더 탭 — 캘린더 탭은 별도의 월 그리드 뷰.
  const [currentTab, setCurrentTab] = useState('gantt'); // 'gantt' | 'calendar'
  const [viewUnit] = useState('day');
  const [selectedDate, setSelectedDate] = useState(() =>
    initialDate ?? parseIsoDate(TODAY_STR),
  );

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
  const [groups, setGroupsState] = useState(initialGroups ?? []);
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
  // 타임라인 진입 시 자동으로 스니핏 작성 유도 프롬프트 띄움.
  const [snippetPromptOpen, setSnippetPromptOpen] = useState(true);
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
  // anchorEl 을 state 로 캡처 — 렌더 중 ref.current 접근 금지 규칙 대응.
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [internalFilter, setInternalFilter] = useState(FILTER_TYPES);
  // controlled (props) vs uncontrolled (internal) 모두 지원.
  const filterSelected = filterSelectedProp ?? internalFilter;
  const filterBtnRef = useRef(null);
  const toggleFilter = () => {
    if (filterOpen) { setFilterOpen(false); return; }
    const el = filterBtnRef.current;
    if (!el) return;
    setFilterAnchor(el.getBoundingClientRect());
    setFilterAnchorEl(el);
    setFilterOpen(true);
  };
  const handleToggleFilterType = (type) => {
    const next = filterSelected.includes(type)
      ? filterSelected.filter((t) => t !== type)
      : [...filterSelected, type];
    if (filterSelectedProp === undefined) setInternalFilter(next);
    onFilterChange?.(next);
  };

  // 필터가 렌더에 실제로 반영되도록 meeting/event 를 category 기준으로 거른다.
  // meeting.category 또는 event.category 가 FilterMenuPopover 의 FILTER_TYPES
  // (회의/1on1/집중작업/리뷰/외부미팅/기타) 중 하나의 한글 라벨이어야 한다.
  // category 필드가 없는 레거시 데이터는 전체 통과시켜 호환성을 유지.
  const filterSet = useMemo(() => new Set(filterSelected), [filterSelected]);
  const filteredMeetings = useMemo(
    () =>
      (meetings ?? []).filter(
        (m) => m.category == null || filterSet.has(m.category),
      ),
    [meetings, filterSet],
  );
  const wrappedGetEventsForDate = useMemo(() => {
    if (!getEventsForDate) return getEventsForDate;
    return (iso) =>
      (getEventsForDate(iso) ?? []).filter(
        (ev) => ev.category == null || filterSet.has(ev.category),
      );
  }, [getEventsForDate, filterSet]);

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
    // 항상 실시간 오늘. 장시간 세션 중 자정을 넘겨도 올바르게 동작.
    const todayIso = getTodayStr();
    setSelectedDate(parseIsoDate(todayIso));
    // 월별 뷰에서는 오늘 컬럼이 가로 스크롤의 중앙에 오도록 이동.
    // setSelectedDate 이후 React 가 새 dates/dayColW 로 grid 를 commit
    // 해야 실제 column offsetWidth 가 확정되므로 rAF 로 1 프레임 defer.
    if (viewUnit !== 'month') return;
    requestAnimationFrame(() => {
      const rightScroll = rightScrollRef.current;
      if (!rightScroll) return;
      const headerCell = rightScroll.querySelector('.tl-week-header-cell');
      if (!headerCell) return;
      const colW = headerCell.offsetWidth;
      const todayDate = parseIsoDate(todayIso);
      const idx = todayDate.getDate() - 1;
      const colCenter = idx * colW + colW / 2;
      const target = colCenter - rightScroll.clientWidth / 2;
      const maxScroll = rightScroll.scrollWidth - rightScroll.clientWidth;
      rightScroll.scrollLeft = Math.max(0, Math.min(target, maxScroll));
    });
  };

  // selectedDate 가 바뀔 때마다 간트 일 뷰의 가로 스크롤 위치를 조정.
  //   selectedDate === 오늘 → 현재 시각(NOW)이 화면 중앙에 오도록
  //   그 외            → 9시 시작 지점이 좌측에 오도록
  // rAF 로 한 프레임 defer 해 grid 가 commit 된 뒤 측정한다.
  useEffect(() => {
    const sc = rightScrollRef.current;
    if (!sc) return;
    if (!isGantt || viewUnit !== 'day') return;
    requestAnimationFrame(() => {
      const selectedIso = formatIsoDate(selectedDate);
      const startH = HOURS[0];
      if (selectedIso === getTodayStr()) {
        const now = new Date();
        const h = now.getHours() + now.getMinutes() / 60;
        const offset = (h - startH) * HOUR_W;
        const target = offset - sc.clientWidth / 2;
        const maxScroll = sc.scrollWidth - sc.clientWidth;
        sc.scrollLeft = Math.max(0, Math.min(target, maxScroll));
      } else {
        const offset = (9 - startH) * HOUR_W;
        const maxScroll = sc.scrollWidth - sc.clientWidth;
        sc.scrollLeft = Math.max(0, Math.min(offset, maxScroll));
      }
    });
  }, [selectedDate, isGantt, viewUnit, rightScrollRef]);

  return (
    <TimelineDataProvider
      members={members}
      meetings={filteredMeetings}
      snippets={snippets}
      getEventsForDate={wrappedGetEventsForDate}
    >
    <main className="tl-page">
      <div className="tl-page-header">
        <div className="tl-page-title-wrap">
          <h1 className="tl-page-title">Timeline</h1>
          <div className="tl-page-meta">
            <span className="tl-meta-label">진행 중 프로젝트</span>
            <span className="tl-meta-sep">·</span>
            <span className="tl-meta-count">{activeProjectCount}개</span>
          </div>
        </div>
      </div>

      {/* Tab row (간트 / 캘린더) + GCal status */}
      <div className="tl-tabs-row">
        <Tabs
          items={TIMELINE_TAB_ITEMS}
          value={currentTab}
          onChange={setCurrentTab}
        />
        <div className={`tl-gcal-status ${gcalConnected ? '' : 'is-disconnected'}`}>
          <Icon src="/icons-solid/calendar-check-02.svg" size={14} color="var(--colors-foreground-fgTertiary)" baseUrl={baseUrl} />
          <span>{gcalConnected ? 'Google Calendar 연동 중' : 'Google Calendar 미연동'}</span>
          {gcalConnected && (
            <Icon src="/icons-solid/check-circle.svg" size={14} color="#2dbd82" baseUrl={baseUrl} />
          )}
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
          anchorEl={filterAnchorEl}
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

      {snippetPromptOpen && (
        <SnippetPromptModal
          onCancel={() => setSnippetPromptOpen(false)}
          onConfirm={() => {
            setSnippetPromptOpen(false);
            setSnippetModalOpen(true);
          }}
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
