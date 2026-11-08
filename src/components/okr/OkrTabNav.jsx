import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { measureHeaderLayout } from './okrTabHeaderWidth.js';
import StepNavButton, { StepNav } from '../shared/StepNav.jsx';

const DEFAULT_LABELS = { prevTabs: '이전 탭 보기', nextTabs: '다음 탭 보기' };

/** 탭 줄이 넘치나 · 맨 앞인가 · 맨 끝인가. 넘침은 ‹ › 를 뺀 줄 폭(row)으로 잰다 — 버튼 때문에 넘치는 일이 없게. */
export function measureTabEdge(row, nav) {
  if (!row || !nav) return { over: false, atStart: true, atEnd: true };
  return {
    over: nav.scrollWidth > row.clientWidth,
    atStart: nav.scrollLeft <= 0,
    atEnd: nav.scrollLeft + nav.clientWidth >= nav.scrollWidth - 1,
  };
}

/** 그 탭이 다 보일 만큼만 민다. 이미 다 보이면 그대로 둔다 — 사용자가 밀어 놓은 자리를 지킨다. */
export function revealTab(nav, el) {
  if (!nav || !el) return;
  const navBox = nav.getBoundingClientRect();
  const box = el.getBoundingClientRect();
  if (box.right > navBox.right) nav.scrollLeft += Math.ceil(box.right - navBox.right);
  else if (box.left < navBox.left) nav.scrollLeft -= Math.ceil(navBox.left - box.left);
}

/** ‹(-1)·›(1) — 그 방향에서 아직 다 안 보이는 가장 가까운 탭. 없으면 null. */
export function nextHiddenTab(nav, dir) {
  const navBox = nav.getBoundingClientRect();
  const tabs = [...nav.children];
  return dir > 0
    ? tabs.find((t) => t.getBoundingClientRect().right > navBox.right + 1) ?? null
    : tabs.reverse().find((t) => t.getBoundingClientRect().left < navBox.left - 1) ?? null;
}

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
 * 그래도 칸의 끝이 탭과 탭 사이에 걸리면 잘린 글자조차 없어 뒤 탭이 없는 회사로 읽혔다(pivit-work PW-2633 —
 * 목표 체계 이름이 긴 회사). 넘칠 때만 탭 줄 오른쪽 끝에 `‹` `›` 한 쌍을 둔다 — 버튼은 내 리소스 `‹ 2026년 9월 ›`
 * 와 같은 공용 `StepNav` 다. 넘치지 않으면 그리지 않아 화면이 종전과 같다(OKR 정책서 §2B.3).
 *
 * @param {{ prevTabs?: string, nextTabs?: string }} [labels] ‹ › 툴팁·읽기 이름. 빠진 키는 한국어 기본값
 * @param {string} [baseUrl] 화살표 아이콘 경로 앞머리(`Icon` 과 같다)
 */
export default function OkrTabNav({ tabs, activeTab, onTabChange, year, quarter, labels, baseUrl = '' }) {
  const L = { ...DEFAULT_LABELS, ...labels };
  const headerRef = useRef(null);
  const rowRef = useRef(null);
  const navRef = useRef(null);
  const [layout, setLayout] = useState({ maxWidth: null, below: false });
  const { maxWidth, below } = layout;
  const hasActions = maxWidth != null;
  const [edge, setEdge] = useState({ over: false, atStart: true, atEnd: true });
  const measureEdge = useCallback(() => {
    const next = measureTabEdge(rowRef.current, navRef.current);
    setEdge((prev) =>
      prev.over === next.over && prev.atStart === next.atStart && prev.atEnd === next.atEnd ? prev : next,
    );
  }, []);
  const revealActive = useCallback(() => {
    const nav = navRef.current;
    revealTab(nav, nav?.querySelector('.tab-active'));
  }, []);
  // 탭 글자가 화면이 뜬 뒤에 바뀌면(목표 체계 이름을 늦게 불러옴) 지금 탭을 다시 보이게 한다 — 글자로만 비교한다.
  const labelKey = tabs.map((tab) => tab.label).join('\u0000');

  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return undefined;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const next = measureHeaderLayout(header, navRef.current);
      setLayout((prev) => (prev.maxWidth === next.maxWidth && prev.below === next.below ? prev : next));
      measureEdge();
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
  }, [measureEdge]);

  // 밀린 탭 줄은 맨 앞(대시보드)부터 보이고, 지금 탭이 가려질 때만 그만큼 민다.
  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector('.tab-active');
    if (!nav || !active) return;
    const activeEnd = active.getBoundingClientRect().right - nav.getBoundingClientRect().left + nav.scrollLeft;
    nav.scrollLeft = Math.max(0, activeEnd - nav.clientWidth);
  }, [activeTab, hasActions]);

  // 칸 폭이 줄거나(버튼이 늦게 그려짐 · ‹ › 가 생김) 탭 글자가 길어지면 지금 탭이 가려질 수 있다 —
  // 그때만 모자란 만큼 민다(휠·‹ › 로 옮긴 자리는 지킨다). 끝 표시(‹ › 잠금)도 함께 다시 잰다.
  useEffect(() => {
    revealActive();
    measureEdge();
  }, [maxWidth, edge.over, labelKey, revealActive, measureEdge]);

  // 창 폭이 바뀌어 칸이 좁아지면(버튼이 없는 탭도) 지금 탭이 보이게 하고 ‹ › 를 내거나 걷는다(정책서 §2B.3 T1).
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return undefined;
    const onResize = () => {
      measureEdge();
      revealActive();
    };
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(onResize);
    ro?.observe(nav);
    window.addEventListener('resize', onResize);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [measureEdge, revealActive]);

  const pushTabs = (dir) => {
    const nav = navRef.current;
    if (!nav) return;
    revealTab(nav, nextHiddenTab(nav, dir));
    measureEdge();
  };

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
      <div ref={rowRef} className="okr-tab-row">
        <div ref={navRef} className="tab-nav" onScroll={measureEdge}>
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
        {edge.over && (
          <StepNav className="okr-tab-step">
            <StepNavButton
              direction="prev"
              baseUrl={baseUrl}
              disabled={edge.atStart}
              onClick={() => pushTabs(-1)}
              title={L.prevTabs}
              aria-label={L.prevTabs}
            />
            <StepNavButton
              direction="next"
              baseUrl={baseUrl}
              disabled={edge.atEnd}
              onClick={() => pushTabs(1)}
              title={L.nextTabs}
              aria-label={L.nextTabs}
            />
          </StepNav>
        )}
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
