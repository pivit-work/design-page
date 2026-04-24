import { useEffect, useState } from 'react';

import { Sidebar, TopNav, Icon } from './components';
import OneOnOneContent from './OneOnOnePage';
import OrgChartPage from './OrgChartPage';
import TimelinePage from './TimelinePage';
import MeetingsPage from './MeetingsPage';
import './App.css';
import './org_chart.css';
import './org_project.css';
import './one_on_one.css';
import './timeline.css';
import './meetings.css';

const BASE = import.meta.env.BASE_URL;

const ICONS = {
  calendar: '/icons-solid/calendar-heart-01.svg',
  target: '/icons-solid/target-04.svg',
  user: '/icons-solid/user-03.svg',
  layers: '/icons-solid/layers-three-01.svg',
  file: '/icons-solid/file-02.svg',
  edit: '/icons-solid/edit-02.svg',
  userEdit: '/icons-solid/user-edit.svg',
  aiChat: '/icons/message-chat-circle.svg',
  lock: '/icons-solid/lock-keyhole-square.svg',
  send: '/icons-solid/send-01.svg',
  search: '/icons/search-sm.svg',
  plus: '/icons/plus.svg',
  minus: '/icons/minus.svg',
  refresh: '/icons/refresh-ccw-05.svg',
  expand: '/icons-solid/expand-06.svg',
  settings: '/icons-solid/settings-02.svg',
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

const MENU = [
  { icon: ICONS.calendar, label: '타임라인', page: 'timeline' },
  { icon: ICONS.target, label: 'OKR' },
  { icon: ICONS.user, label: '원온원', page: 'oneonone' },
  { icon: ICONS.layers, label: '조직도', page: 'orgchart' },
  { icon: ICONS.file, label: '회의록', page: 'meetings' },
  { icon: ICONS.edit, label: '평가' },
  { icon: ICONS.userEdit, label: '매니저' },
  { icon: ICONS.aiChat, label: 'AI Chat' },
  { icon: ICONS.lock, label: '어드민' },
];

/**
 * App — thin demo router.
 *
 * 각 페이지의 demo 데이터/상태/조합은 <Page>.jsx wrapper 가 소유한다.
 * 여기서는 Sidebar + TopNav + currentPage 분기만 담당한다. 새 페이지를
 * 추가할 땐 `src/<FooPage>.jsx` wrapper 를 만든 뒤 여기서 분기에 걸면 된다.
 */
export default function App() {
  const [currentPage, setCurrentPage] = useState('orgchart');
  const [orgSubTab, setOrgSubTab] = useState('orgchart');

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
  };

  return (
    <div className="app">
      <Sidebar
        menu={MENU}
        currentPage={currentPage}
        onNavigate={handleNavigate}
        icons={ICONS}
        baseUrl={BASE}
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

      {currentPage === 'oneonone' && <OneOnOneContent Icon={Icon} />}
      {currentPage === 'timeline' && <TimelinePage icons={ICONS} baseUrl={BASE} />}
      {currentPage === 'meetings' && <MeetingsPage baseUrl={BASE} />}
    </div>
  );
}
