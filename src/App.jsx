import { useEffect, useState } from 'react';

import { Sidebar, TopNav, Icon } from './components';
import { SIDEBAR_MENU } from './menu';
import { pageFromPath, pathFromPage, DEFAULT_PAGE } from './routing.js';
import OneOnOnePage from './OneOnOnePage';
import OrgChartPage from './OrgChartPage';
import TimelinePage from './TimelinePage';
import ReportPage from './ReportPage';
import SnippetPage from './SnippetPage';
import MeetingsPage from './MeetingsPage';
import ManagerPage from './ManagerPage';
import OkrPage from './OkrPage';
import SettingsPage from './SettingsPage';
import './App.css';
import './org_chart.css';
import './org_project.css';
import './org_squad.css';
import './one_on_one.css';
import './timeline.css';
import './meetings.css';
import './manager.css';
import './report.css';
import './snippet.css';
import './okr.css';

const BASE = import.meta.env.BASE_URL;

const ICONS = {
  asterisk: '/icons-solid/asterisk-01.svg',
  calendarSolid: '/icons-solid/calendar.svg',
  dotpoints: '/icons-solid/dotpoints-01.svg',
  target: '/icons-solid/target-04.svg',
  user: '/icons-solid/user-03.svg',
  layers: '/icons-solid/layers-three-01.svg',
  file: '/icons-solid/file-02.svg',
  edit: '/icons-solid/edit-02.svg',
  userEdit: '/icons-solid/user-edit.svg',
  aiChat: '/icons-solid/ai-chat-01.svg',
  lock: '/icons-solid/lock-keyhole-square.svg',
  send: '/icons-solid/send-01.svg',
  search: '/icons/search-sm.svg',
  userOutline: '/icons/user-03.svg',
  messageText: '/icons/message-text-circle-02.svg',
  summarySparkle: '/icons-solid/ai-chat-01.svg',
  clockCheck: '/icons-solid/clock-check.svg',
  activityHeart: '/icons-solid/activity-heart.svg',
  alertTriangle: '/icons-solid/alert-triangle.svg',
  messageSmile: '/icons-solid/message-smile-square.svg',
  calendar: '/icons/calendar.svg',
  chevronDown: '/icons/chevron-down.svg',
  plus: '/icons/plus.svg',
  minus: '/icons/minus.svg',
  refresh: '/icons/refresh-ccw-05.svg',
  expand: '/icons-solid/expand-06.svg',
  settings: '/icons-solid/settings-02.svg',
  chevronSelector: '/icons-solid/chevron-selector-vertical.svg',
  xClose: '/icons-solid/x-close.svg',
  refreshCw: '/icons-solid/refresh-cw-01.svg',
  check: '/icons-solid/check.svg',
};

const STAT_ICONS = {
  okr: `${BASE}badge-okr.png`,
  hc: `${BASE}badge-hc.png`,
  oneOnOne: `${BASE}badge-1on1.png`,
  workHours: `${BASE}badge-hours.png`,
  employment: `${BASE}badge-employment.png`,
  rank: `${BASE}badge-rank.png`,
  workHoursAdmin: `${BASE}badge-workhours.png`,
};

// 사이드바 구성(항목·순서·배치·아이콘)은 menu.js 의 SIDEBAR_MENU 가 정본이다.
// 여기서는 데모 전용 라우팅(id → 데모 페이지 슬러그)만 얹는다. 슬러그가 없는
// 항목(평가·AI Chat·어드민)은 데모에서 비활성 — 클릭해도 이동하지 않는다.
const DEMO_PAGES = {
  snippet: 'snippet',
  timeline: 'timeline',
  report: 'report',
  okr: 'okr',
  oneonone: 'oneonone',
  orgchart: 'orgchart',
  meetings: 'meetings',
  manager: 'manager',
};

const MENU = SIDEBAR_MENU
  .filter((m) => m.section === 'top')
  .map((m) => (DEMO_PAGES[m.id]
    ? { icon: m.icon, label: m.label, page: DEMO_PAGES[m.id] }
    : { icon: m.icon, label: m.label }));

// '어드민' 은 일상 메뉴가 아니라 컨텍스트 전환 진입점이라 하단(의견보내기·설정
// 사이) bottomItem 슬롯에 둔다 — SIDEBAR_MENU 에서 section: 'bottom' 으로 정의됨.
const ADMIN_ITEM = SIDEBAR_MENU.find((m) => m.section === 'bottom');

/**
 * App — thin demo router.
 *
 * 각 페이지의 demo 데이터/상태/조합은 <Page>.jsx wrapper 가 소유한다.
 * 여기서는 Sidebar + TopNav + currentPage 분기만 담당한다. 새 페이지를
 * 추가할 땐 `src/<FooPage>.jsx` wrapper 를 만든 뒤 여기서 분기에 걸면 된다.
 */
export default function App() {
  const [currentPage, setCurrentPage] = useState(() => pageFromPath(window.location.pathname, BASE) || DEFAULT_PAGE);
  const [orgSubTab, setOrgSubTab] = useState('orgchart');

  // ── URL ↔ page 동기화 ────────────────────────────────────────────────
  // 마운트 시 pathname 에 슬러그가 없거나 알 수 없는 값이면 DEFAULT_PAGE 로
  // replaceState 하여 새로고침/공유 링크 흐름을 안정시킨다. popstate 로
  // 브라우저 내비게이션을 currentPage 상태에 반영한다.
  useEffect(() => {
    const initial = pageFromPath(window.location.pathname, BASE) || DEFAULT_PAGE;
    const initialPath = pathFromPage(initial, BASE);
    if (window.location.pathname !== initialPath) {
      window.history.replaceState({ page: initial }, '', initialPath);
    }
    const onPop = () => {
      const next = pageFromPath(window.location.pathname, BASE) || DEFAULT_PAGE;
      setCurrentPage(next);
      if (next === 'orgchart') setOrgSubTab('orgchart');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // ── Global scrollbar auto-hide ──────────────────────────────────────────
  // 기본적으로 모든 스크롤 가능한 요소의 thumb 는 숨김(CSS). 여기서는
  // scroll / mousemove 이벤트를 가장 가까운 scrollable ancestor 에 올려주고
  // 800ms 무액션 시 상태를 해제한다. 결과적으로 사용자 액션이 있을 때만
  // 스크롤바가 자연스럽게 나타났다 사라진다.
  useEffect(() => {
    const timers = new WeakMap();
    const show = (el) => {
      if (!el || el === document || el === document.documentElement) {
        document.documentElement.classList.add('is-scrolling');
        clearTimeout(timers.get(document.documentElement));
        timers.set(
          document.documentElement,
          setTimeout(() => document.documentElement.classList.remove('is-scrolling'), 800)
        );
        return;
      }
      el.classList.add('is-scrolling');
      clearTimeout(timers.get(el));
      timers.set(
        el,
        setTimeout(() => el.classList.remove('is-scrolling'), 800)
      );
    };
    const findScrollableAncestor = (node) => {
      let el = node;
      while (el && el.nodeType === 1) {
        const s = getComputedStyle(el);
        if (/(auto|scroll|overlay)/.test(s.overflowY + s.overflow)) {
          const scrollable = el.scrollHeight > el.clientHeight;
          if (scrollable) return el;
        }
        el = el.parentElement;
      }
      return document.documentElement;
    };
    const onScroll = (e) => show(e.target === document ? document.documentElement : e.target);
    const onMove = (e) => show(findScrollableAncestor(e.target));
    window.addEventListener('scroll', onScroll, { capture: true, passive: true });
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('mousemove', onMove);
    };
  }, []);

  const handleNavigate = (page) => {
    setCurrentPage(page);
    if (page === 'orgchart') setOrgSubTab('orgchart');
    const nextPath = pathFromPage(page, BASE);
    if (nextPath && window.location.pathname !== nextPath) {
      window.history.pushState({ page }, '', nextPath);
    }
  };

  return (
    <div className="app">
      <Sidebar
        menu={MENU}
        currentPage={currentPage}
        onNavigate={handleNavigate}
        icons={ICONS}
        baseUrl={BASE}
        bottomItem={{ icon: ADMIN_ITEM.icon, label: ADMIN_ITEM.label, onClick: () => {} }}
        onFeedbackClick={() => { window.location.href = 'mailto:m@pivit.work'; }}
        onSettingsClick={() => handleNavigate('settings')}
      />
      <TopNav icons={ICONS} baseUrl={BASE} />

      {currentPage === 'orgchart' && (
        <OrgChartPage
          icons={ICONS}
          statIcons={STAT_ICONS}
          baseUrl={BASE}
          subTab={orgSubTab}
          onSubTabChange={setOrgSubTab}
        />
      )}

      {currentPage === 'oneonone' && <OneOnOnePage icons={ICONS} baseUrl={BASE} />}
      {currentPage === 'timeline' && <TimelinePage icons={ICONS} baseUrl={BASE} />}
      {currentPage === 'report' && <ReportPage baseUrl={BASE} />}
      {currentPage === 'snippet' && <SnippetPage baseUrl={BASE} />}
      {currentPage === 'meetings' && <MeetingsPage baseUrl={BASE} />}
      {currentPage === 'manager' && <ManagerPage icons={ICONS} baseUrl={BASE} />}
      {currentPage === 'okr' && <OkrPage icons={ICONS} baseUrl={BASE} />}
      {currentPage === 'settings' && <SettingsPage />}
    </div>
  );
}
