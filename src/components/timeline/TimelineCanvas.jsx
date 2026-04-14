import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Icon from '../shared/Icon.jsx';
import NameColumn from './NameColumn.jsx';
import TimelineGrid from './TimelineGrid.jsx';
import WeekGrid from './WeekGrid.jsx';
import CalendarMonthView from './CalendarMonthView.jsx';
import MeetingModal from './MeetingModal.jsx';
import DatePickerPopover from './DatePickerPopover.jsx';
import {
  GROUPS as INITIAL_GROUPS,
  HEADER_H,
  BOTTOM_H,
  TODAY_STR,
  WEEK_DAY_COL_W,
  getWeekDates,
  getMonthDates,
  memberPalette,
} from './constants.js';

// 주별 뷰의 day 컬럼 min width. 이 값 아래로는 줄어들지 않음(가로 스크롤 발생).
const WEEK_DAY_COL_MIN = 130;

const formatKoreanDate = (d) =>
  `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;

const parseIsoDate = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export default function TimelineCanvas({ icons, baseUrl }) {
  const leftMidRef = useRef(null);
  const leftContentRef = useRef(null);
  const rightScrollRef = useRef(null);

  // 간트 / 캘린더 탭 — 캘린더 탭은 별도의 월 그리드 뷰.
  const [currentTab, setCurrentTab] = useState('gantt'); // 'gantt' | 'calendar'
  const [viewUnit, setViewUnit] = useState('day');
  // selectedDate 는 아래 useLayoutEffect (snippetDates) 에서 참조하기 때문에
  // 반드시 그 이전에 선언돼 있어야 함 (temporal dead zone 회피).
  const [selectedDate, setSelectedDate] = useState(() => parseIsoDate(TODAY_STR));

  // ── Segmented control sliding indicator ──────────────────────────────────
  // design-system-docs 의 SegmentedControl 모션 참고: 활성 세그먼트의
  // offset/size 를 측정해 indicator 박스를 절대 배치하고 transition 으로 이동.
  const VIEW_UNITS = [
    ['day', '일'],
    ['week', '주'],
    ['month', '월'],
  ];
  const segItemsRef = useRef([]);
  const [segIndicator, setSegIndicator] = useState(null);
  useLayoutEffect(() => {
    if (currentTab !== 'gantt') return;
    const idx = VIEW_UNITS.findIndex(([v]) => v === viewUnit);
    const node = segItemsRef.current[idx];
    if (!node) return;
    setSegIndicator({
      left: node.offsetLeft,
      top: node.offsetTop,
      width: node.offsetWidth,
      height: node.offsetHeight,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewUnit, currentTab]);

  // ── Left column follows right's vertical scroll via transform ────────────
  //
  // 좌/우 높이와 scroll range 가 서로 달라서 1:1 scrollTop sync 로는 끝에서
  // 필연적으로 어긋난다(한쪽이 먼저 clamp). 그래서 왼쪽 컬럼은 자체 스크롤을
  // 포기하고, 오른쪽의 scrollTop 을 그대로 transform: translateY 로 mirror
  // 한다. 왼쪽에서 휠이 발생하면 오른쪽 scrollTop 을 대신 갱신해서 동일한
  // 경로로 흐르게 한다. 단일 스크롤 소스 → 경쟁 상태 없음, clamp 없음.
  //
  // 오른쪽 inner 에는 spacerH 만큼의 빈 영역이 아래에 추가되는데, 이 spacer
  // 가 있어야 오른쪽을 끝까지 스크롤했을 때 왼쪽 마지막 멤버가 가시 영역
  // 하단에 정확히 걸린다. 필요한 spacer 크기는 `rightScroll.clientHeight -
  // leftMid.clientHeight - HEADER_H` 로 런타임에 측정 (.tl-left-bottom 실제
  // 렌더 높이를 하드코딩하지 않기 위함).
  const [spacerH, setSpacerH] = useState(BOTTOM_H);
  // 주/월별 day 컬럼 폭 — rightScroll.clientWidth / dayCount (min 130).
  // 남는 공간이 있으면 fill, 좁으면 130 으로 clamp + 가로 스크롤.
  const [dayColW, setDayColW] = useState(WEEK_DAY_COL_W);

  // 주/월별 보기에서 렌더할 날짜 배열. viewUnit 이 'day' 면 빈 배열.
  //   week  → 7일(일~토)
  //   month → 28~31일(selectedDate 가 속한 달의 1일~말일)
  const snippetDates =
    viewUnit === 'week'
      ? getWeekDates(selectedDate)
      : viewUnit === 'month'
      ? getMonthDates(selectedDate)
      : [];
  // ResizeObserver 의존성 용. viewUnit 이 같아도 월이 바뀌면 dayCount 가
  // 변할 수 있기 때문에(예: 4월 30일 → 5월 31일) 이 값으로 effect 를 트리거.
  const dayCount = snippetDates.length || 1;

  useLayoutEffect(() => {
    if (currentTab !== 'gantt') return;
    const leftMid = leftMidRef.current;
    const rightScroll = rightScrollRef.current;
    if (!leftMid || !rightScroll) return;
    const compute = () => {
      const targetSpacer = Math.max(
        0,
        rightScroll.clientHeight - leftMid.clientHeight - HEADER_H
      );
      setSpacerH((prev) => (prev === targetSpacer ? prev : targetSpacer));
      const targetColW = Math.max(
        WEEK_DAY_COL_MIN,
        rightScroll.clientWidth / dayCount
      );
      setDayColW((prev) => (prev === targetColW ? prev : targetColW));
    };
    compute();
    // view 가 바뀌면 새로 mount 된 grid 로 scrollTop 이 reset 되므로 왼쪽
    // transform 도 따라 0 으로 동기화. 주→월 전환 시 가로 스크롤 위치도 리셋.
    if (leftContentRef.current) {
      leftContentRef.current.style.transform = `translateY(${-rightScroll.scrollTop}px)`;
    }
    const ro = new ResizeObserver(compute);
    ro.observe(leftMid);
    ro.observe(rightScroll);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewUnit, dayCount, currentTab]);

  // ── Meeting modal state ──────────────────────────────────────────────────
  const [openMeeting, setOpenMeeting] = useState(null); // meeting object | null
  const [openMeetingAnchor, setOpenMeetingAnchor] = useState(null); // DOMRect

  const handleMeetingClick = (meeting, rect) => {
    setOpenMeeting(meeting);
    setOpenMeetingAnchor(rect);
  };
  const handleCloseMeeting = () => {
    setOpenMeeting(null);
    setOpenMeetingAnchor(null);
  };

  // ── Snippet CTA state ────────────────────────────────────────────────────
  // 'create'    → "스니핏 작성" 버튼 (아직 이번 주 스니핏 미작성)
  // 'edit'      → "스니핏 수정" 버튼 (작성 완료 상태, 다시 수정 가능)
  // 'requested' → "스니핏 수정 승인 요청 완료" 상태 텍스트 (비인터랙티브)
  //
  // NOTE: 작성/수정 모달은 아직 구현 전. 지금은 클릭 시 다음 상태로 직접
  // 전이시켜 state 머신 플로우만 연결해둔다. 모달을 붙이면
  // handleSnippetCreate/Edit 에서 모달을 열고, 모달의 완료/요청 콜백에서
  // setSnippetState 를 호출하도록 바꾸면 된다.
  const [snippetState, setSnippetState] = useState('create');
  const handleSnippetCreate = () => {
    // TODO: open snippet write modal. onComplete → setSnippetState('edit')
    setSnippetState('edit');
  };
  const handleSnippetEdit = () => {
    // TODO: open snippet edit modal (pre-filled).
    //       onRequestApproval → setSnippetState('requested')
    setSnippetState('requested');
  };

  // ── Date picker state ────────────────────────────────────────────────────
  // (selectedDate 는 상단에서 이미 선언됨)
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [datePickerAnchor, setDatePickerAnchor] = useState(null); // DOMRect
  const dateBtnRef = useRef(null);

  const toggleDatePicker = () => {
    if (datePickerOpen) {
      setDatePickerOpen(false);
      return;
    }
    const el = dateBtnRef.current;
    if (!el) return;
    setDatePickerAnchor(el.getBoundingClientRect());
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
    // rAF 콜백은 다음 페인트 직전에 실행되는데, 그 시점엔 React 의
    // useLayoutEffect 체인(ResizeObserver → setDayColW → 재렌더)이 이미
    // 동기적으로 전부 끝난 상태라 DOM 이 최종 값으로 settling 되어 있음.
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

  // ── Custom mouse-based drag-and-drop reorder ────────────────────────────
  // We DO NOT use the HTML5 drag-and-drop API. The native API forces a
  // semi-transparent drag image and has many edge cases (image elements
  // hijacking dragstart, dragend not firing when the source is removed, etc).
  // Instead we listen to mousedown/mousemove/mouseup directly and render the
  // floating preview ourselves — fully solid, fully under our control.
  const [groups, setGroups] = useState(INITIAL_GROUPS);
  // dragState: { member, fromGroupId, fromIndex, offsetX, offsetY,
  //              clientX, clientY, width, height } | null
  const [dragState, setDragState] = useState(null);
  // dragOver: { groupId, index } | null — placeholder position (filtered space)
  const [dragOver, setDragOver] = useState(null);
  // Refs mirror state so handlers attached to window can read latest values
  const dragStateRef = useRef(null);
  const dragOverRef = useRef(null);
  const groupsRef = useRef(groups);
  groupsRef.current = groups;

  // Compute the drop target based on the current cursor (clientX, clientY).
  // Uses elementFromPoint to find the row under the cursor. For each member
  // row found, we check if the cursor is in the upper or lower half of that
  // row to decide insert-before vs insert-after (in filtered space).
  const computeDropTarget = (clientX, clientY) => {
    // Hide the floating preview from the hit-test by giving it pointer-events:
    // none in CSS — it's already pointer-events:none, so elementFromPoint sees
    // the underlying row.
    const el = document.elementFromPoint(clientX, clientY);
    if (!el) return null;

    const memberRow = el.closest('.tl-member-row[data-tl-member]');
    if (memberRow) {
      const groupId = memberRow.getAttribute('data-tl-group');
      const filteredIdx = parseInt(memberRow.getAttribute('data-tl-filtered-idx'), 10);
      if (Number.isNaN(filteredIdx)) return null;
      const rect = memberRow.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const insertIdx = clientY < midY ? filteredIdx : filteredIdx + 1;
      return { groupId, index: insertIdx };
    }

    const groupHeader = el.closest('.tl-group-header[data-tl-group]');
    if (groupHeader) {
      return { groupId: groupHeader.getAttribute('data-tl-group'), index: 0 };
    }

    const placeholder = el.closest('.tl-member-placeholder-wrap[data-tl-group]');
    if (placeholder) {
      const groupId = placeholder.getAttribute('data-tl-group');
      const idx = parseInt(placeholder.getAttribute('data-tl-index'), 10);
      if (!Number.isNaN(idx)) return { groupId, index: idx };
    }

    return null;
  };

  // NameColumn calls this from each row's onMouseDown with (e, member, groupId, idx)
  const startDrag = (e, member, fromGroupId, fromIndex) => {
    e.preventDefault();
    const sourceEl = e.currentTarget;
    const rect = sourceEl.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    const drag = {
      member,
      fromGroupId,
      fromIndex,
      offsetX,
      offsetY,
      clientX: e.clientX,
      clientY: e.clientY,
      width: rect.width,
      height: rect.height,
    };
    const initialOver = { groupId: fromGroupId, index: fromIndex };
    dragStateRef.current = drag;
    dragOverRef.current = initialOver;
    setDragState(drag);
    setDragOver(initialOver);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
  };

  const moveDrag = (clientX, clientY) => {
    const drag = dragStateRef.current;
    if (!drag) return;
    // Update the floating preview position
    const next = { ...drag, clientX, clientY };
    dragStateRef.current = next;
    setDragState(next);

    // Update the drop target (placeholder position)
    const target = computeDropTarget(clientX, clientY);
    if (target) {
      const prev = dragOverRef.current;
      if (!prev || prev.groupId !== target.groupId || prev.index !== target.index) {
        dragOverRef.current = target;
        setDragOver(target);
      }
    }
  };

  const endDrag = (commit) => {
    const drag = dragStateRef.current;
    const target = dragOverRef.current;

    const clear = () => {
      dragStateRef.current = null;
      dragOverRef.current = null;
      setDragState(null);
      setDragOver(null);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    if (!commit || !drag || !target) {
      clear();
      return;
    }

    setGroups((prev) => {
      const next = prev.map((g) => ({
        ...g,
        memberIds: g.memberIds.filter((id) => id !== drag.member.id),
      }));
      const toG = next.find((g) => g.id === target.groupId);
      if (!toG) return prev;
      const clamped = Math.max(0, Math.min(target.index, toG.memberIds.length));
      toG.memberIds.splice(clamped, 0, drag.member.id);
      return next;
    });

    clear();
  };

  // Global mousemove + mouseup listeners — attached only while dragging
  useEffect(() => {
    if (!dragState) return;

    const onMove = (e) => {
      e.preventDefault();
      moveDrag(e.clientX, e.clientY);
    };
    const onUp = (e) => {
      e.preventDefault();
      // Recompute target one final time at the cursor's current position
      moveDrag(e.clientX, e.clientY);
      endDrag(true);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') endDrag(false);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragState !== null]);

  // 오른쪽이 세로로 스크롤될 때(휠/스크롤바 드래그/left forward 모두 포함)
  // 왼쪽 컬럼의 content wrapper 에 같은 양의 translateY 를 적용해 mirror.
  // DOM 직접 조작으로 매 스크롤마다 React 렌더를 피한다.
  const handleRightScroll = (e) => {
    const content = leftContentRef.current;
    if (!content) return;
    content.style.transform = `translateY(${-e.target.scrollTop}px)`;
  };

  // 왼쪽 컬럼 영역에서 휠이 발생하면 오른쪽 scrollTop 에 deltaY 를 더해줘서
  // 스크롤을 forward 한다. React 17+ 는 root 에 onWheel 을 passive 로 붙이기
  // 때문에 React 의 onWheel 에서는 preventDefault 가 무시된다 → 여기서
  // passive:false 로 직접 addEventListener 한다.
  useEffect(() => {
    if (currentTab !== 'gantt') return;
    const el = leftMidRef.current;
    if (!el) return;
    const onWheel = (e) => {
      const right = rightScrollRef.current;
      if (!right) return;
      e.preventDefault();
      right.scrollTop += e.deltaY;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [currentTab]);

  // Horizontal drag-to-scroll on right grid
  const dragRef = useRef({
    active: false,
    startX: 0,
    startScrollLeft: 0,
    moved: false,
  });

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    // Avoid dragging from interactive elements (buttons, blocks)
    if (e.target.closest('button, .tl-meeting-block')) return;
    const sc = rightScrollRef.current;
    if (!sc) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startScrollLeft: sc.scrollLeft,
      moved: false,
    };
    sc.classList.add('is-dragging');
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragRef.current.active) return;
      const dx = e.clientX - dragRef.current.startX;
      if (Math.abs(dx) > 3) dragRef.current.moved = true;
      const sc = rightScrollRef.current;
      if (sc) sc.scrollLeft = dragRef.current.startScrollLeft - dx;
    };
    const handleMouseUp = () => {
      if (!dragRef.current.active) return;
      dragRef.current.active = false;
      const sc = rightScrollRef.current;
      if (sc) sc.classList.remove('is-dragging');
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Scroll right grid so "current hour" is visible on first render
  useEffect(() => {
    const sc = rightScrollRef.current;
    if (!sc) return;
    // Center "10시" to start — roughly scroll to show 9시-14시 range
    sc.scrollLeft = 0;
  }, []);

  return (
    <main className="tl-page">
      {/* Page header */}
      <div className="tl-page-header">
        <div className="tl-page-title-wrap">
          <h1 className="tl-page-title">
            Timeline <span className="tl-page-title-sub">Weekly</span>
          </h1>
          <div className="tl-page-meta">
            <span className="tl-meta-label">진행 중 프로젝트</span>
            <span className="tl-meta-sep">·</span>
            <span className="tl-meta-count">2개</span>
          </div>
        </div>
      </div>

      {/* Tab row (간트 / 캘린더) + GCal status — Figma frameDiv */}
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
        {currentTab === 'gantt' && (
          <div className="tl-seg-control" role="tablist">
            {segIndicator && (
              <span
                className="tl-seg-indicator"
                style={segIndicator}
                aria-hidden="true"
              />
            )}
            {VIEW_UNITS.map(([v, label], i) => (
              <button
                key={v}
                ref={(el) => (segItemsRef.current[i] = el)}
                type="button"
                role="tab"
                aria-selected={viewUnit === v}
                className={`tl-seg-item ${viewUnit === v ? 'is-active' : ''}`}
                onClick={() => setViewUnit(v)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

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

        <button type="button" className="tl-filter-btn" aria-label="필터">
          <Icon src="/icons/filter-lines.svg" size={20} color="var(--colors-foreground-fgPrimary)" baseUrl={baseUrl} />
        </button>

        <div className="tl-toolbar-spacer" />

        {currentTab === 'gantt' && viewUnit === 'day' ? (
          <button type="button" className="tl-add-event">
            <Icon src={icons.plus} size={20} color="#fff" baseUrl={baseUrl} />
            <span>이벤트 추가</span>
          </button>
        ) : snippetState === 'create' ? (
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
          <CalendarMonthView selectedDate={selectedDate} />
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
          />
          {viewUnit === 'day' ? (
            <TimelineGrid
              ref={rightScrollRef}
              onScroll={handleRightScroll}
              onMouseDown={handleMouseDown}
              groups={groups}
              onMeetingClick={handleMeetingClick}
              spacerH={spacerH}
            />
          ) : (
            <WeekGrid
              ref={rightScrollRef}
              onScroll={handleRightScroll}
              onMouseDown={handleMouseDown}
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
        />
      )}

      {/* Date picker popover (mini calendar)
          캘린더 탭에서는 chevron 으로 월을 이동하면 main 월 그리드까지
          함께 이동해야 하므로 onMonthChange 를 주입. 기타 탭에서는 mini
          calendar 내부 view month 만 바뀌고 selectedDate 는 날짜 클릭
          시에만 커밋됨. */}
      {datePickerOpen && (
        <DatePickerPopover
          anchorRect={datePickerAnchor}
          anchorEl={dateBtnRef.current}
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

      {/* Floating drag preview — rendered at body level via fixed positioning.
          Fully solid (no opacity), follows the cursor, pointer-events:none so
          it doesn't interfere with elementFromPoint hit-testing. */}
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
  );
}

function DragPreview({ member, x, y, width, height }) {
  return (
    <div
      className="tl-drag-preview"
      style={{ left: x, top: y, width, height }}
    >
      <div className="tl-drag-handle" aria-hidden="true">
        <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
          <circle cx="1.25" cy="1.25" r="1.25" fill="#D2D6DB" />
          <circle cx="4.75" cy="1.25" r="1.25" fill="#D2D6DB" />
          <circle cx="1.25" cy="5" r="1.25" fill="#D2D6DB" />
          <circle cx="4.75" cy="5" r="1.25" fill="#D2D6DB" />
          <circle cx="1.25" cy="8.75" r="1.25" fill="#D2D6DB" />
          <circle cx="4.75" cy="8.75" r="1.25" fill="#D2D6DB" />
        </svg>
      </div>
      <div className="tl-member-avatar">
        <img src={member.photo} alt="" draggable={false} />
      </div>
      <div className="tl-member-info">
        <div className="tl-member-name">{member.name}</div>
        <div className="tl-member-title">{member.title}</div>
      </div>
      <button
        type="button"
        className="tl-member-arrow"
        style={{ background: memberPalette(member).solid }}
        tabIndex={-1}
      >
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
          <path d="M6 4l4 4-4 4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
