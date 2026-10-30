import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { measureHeaderLayout } from './okrTabHeaderWidth.js';

/**
 * OkrTabNav — OKR 페이지 상단 탭 헤더.
 * 탭 5개(대시보드·전사 OKR·팀 OKR·개인 OKR·내 리소스) + 연도∙분기 서브타이틀.
 * 탭 상태는 wrapper(OkrPage)가 소유한다.
 *
 * `year`·`quarter` 를 둘 다 생략하면 서브타이틀을 그리지 않는다 — 분기로 움직이지 않는 탭
 * (내 리소스는 달로 움직인다 · PW-1173)에서 분기가 보이면 바꿔 봐도 아무 일이 없어 고장으로 읽힌다.
 *
 * 탭 줄과 오른쪽 위 버튼은 서로 모르는 두 고정 상자라, 영어처럼 탭 글자가 길면 버튼이 탭을 덮었다
 * (pivit-work PW-2216). 그래서 탭 줄은 버튼 앞에서 멈추고, 넘치면 평가 화면 탭 줄(`.evnav-domains`)처럼
 * 줄바꿈 대신 가로로 민다. 자리가 넉넉하면(한국어) 모양은 종전 그대로다.
 * 그래도 밀린 탭은 표시 없이 잘려 버튼 뒤에 숨은 것처럼 보였다(pivit-work PW-2415) — 탭이 버튼 앞에 다 안
 * 들어가면 버튼 묶음을 탭 아래 서브타이틀 줄 오른쪽으로 내린다(`is-actions-below`, 자리는 okr.css).
 */
export default function OkrTabNav({ tabs, activeTab, onTabChange, year, quarter }) {
  const headerRef = useRef(null);
  const navRef = useRef(null);
  const [layout, setLayout] = useState({ maxWidth: null, below: false });
  const { maxWidth, below } = layout;
  const hasActions = maxWidth != null;

  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return undefined;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const next = measureHeaderLayout(header, navRef.current);
      setLayout((prev) => (prev.maxWidth === next.maxWidth && prev.below === next.below ? prev : next));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    // 버튼은 탭을 바꿀 때마다 다른 몸통이 새로 그린다 — 생기고 사라지는 것과 글자 폭 변화를 함께 본다.
    const mo = typeof MutationObserver === 'undefined' ? null : new MutationObserver(schedule);
    mo?.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener('resize', schedule);
    // 글꼴이 늦게 오면 버튼·탭 폭이 바뀐다 — 다 받은 뒤 한 번 더 잰다.
    document.fonts?.ready.then(schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      mo?.disconnect();
      window.removeEventListener('resize', schedule);
    };
  }, []);

  // 밀린 탭 줄은 맨 앞(대시보드)부터 보이고, 지금 탭이 가려질 때만 그만큼 민다.
  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector('.tab-active');
    if (!nav || !active) return;
    const activeEnd = active.getBoundingClientRect().right - nav.getBoundingClientRect().left + nav.scrollLeft;
    nav.scrollLeft = Math.max(0, activeEnd - nav.clientWidth);
  }, [activeTab, hasActions]);

  // 버튼이 늦게 그려져 폭이 줄면 지금 탭이 가려질 수 있다 — 그때만 모자란 만큼 민다(휠로 옮긴 자리는 지킨다).
  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector('.tab-active');
    if (!nav || !active) return;
    const navBox = nav.getBoundingClientRect();
    const box = active.getBoundingClientRect();
    if (box.right > navBox.right) nav.scrollLeft += Math.ceil(box.right - navBox.right);
    else if (box.left < navBox.left) nav.scrollLeft -= Math.ceil(navBox.left - box.left);
  }, [maxWidth]);

  // 마우스 휠은 세로로만 돈다 — 탭 줄이 밀렸을 때는 휠로 가로로 밀어 가려진 탭에 닿게 한다.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return undefined;
    const onWheel = (e) => {
      if (nav.scrollWidth <= nav.clientWidth || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      nav.scrollLeft += e.deltaY;
    };
    nav.addEventListener('wheel', onWheel, { passive: false });
    return () => nav.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <div
      ref={headerRef}
      className={`content-header okr-tab-header${hasActions ? ' has-actions' : ''}${below ? ' is-actions-below' : ''}`}
      style={hasActions ? { '--okr-tab-header-max': `${maxWidth}px` } : undefined}
    >
      <div ref={navRef} className="tab-nav">
        {tabs.map((tab) => (
          <span
            key={tab.id}
            className={tab.id === activeTab ? 'tab-active' : 'tab-inactive'}
            onClick={() => tab.id !== activeTab && onTabChange(tab.id)}
          >
            {tab.label}
          </span>
        ))}
      </div>
      {(year != null || quarter != null) && (
        <div className="header-subtitle">
          <b>{year}</b>
          <span className="dot">&#8729;</span>
          <span className="okr-subtitle-quarter">{quarter}</span>
        </div>
      )}
    </div>
  );
}
