import { useEffect, useRef, useState } from 'react';
import Icon from '../shared/Icon.jsx';
import OkrSelectMenu from './OkrSelectMenu.jsx';

/**
 * OkrToolbar — 연도/분기 선택 버튼 + 우측 정렬 버튼 줄.
 * 버튼 클릭 시 드롭다운 메뉴가 열리고, 선택값은 wrapper(OkrPage)가 소유한다.
 * 바깥 클릭·ESC·선택 시 메뉴가 닫힌다.
 */
export default function OkrToolbar({
  year, years, onYearChange,
  quarter, quarters, onQuarterChange,
  icons, baseUrl = '',
}) {
  const [openMenu, setOpenMenu] = useState(null); // 'year' | 'quarter' | null
  const rootRef = useRef(null);

  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpenMenu(null);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpenMenu(null); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [openMenu]);

  const toggle = (menu) => setOpenMenu((prev) => (prev === menu ? null : menu));
  const select = (onChange) => (value) => { onChange(value); setOpenMenu(null); };

  return (
    <div className="okr-toolbar" ref={rootRef}>
      <div className="okr-toolbar-left">
        <div className="okr-select-wrap">
          <button className={`okr-select-btn${openMenu === 'year' ? ' is-open' : ''}`} onClick={() => toggle('year')}>
            <span>{year}년</span>
            <Icon src={icons.chevronDown} size={20} color="var(--text-secondary)" baseUrl={baseUrl} />
          </button>
          {openMenu === 'year' && (
            <OkrSelectMenu
              options={years.map((y) => ({ value: y, label: y }))}
              selected={year}
              onSelect={select(onYearChange)}
              icons={icons}
              baseUrl={baseUrl}
            />
          )}
        </div>
        <div className="okr-select-wrap">
          <button className={`okr-select-btn${openMenu === 'quarter' ? ' is-open' : ''}`} onClick={() => toggle('quarter')}>
            <span>{quarter}</span>
            <Icon src={icons.chevronDown} size={20} color="var(--text-secondary)" baseUrl={baseUrl} />
          </button>
          {openMenu === 'quarter' && (
            <OkrSelectMenu
              options={quarters.map((q) => ({ value: q, label: q }))}
              selected={quarter}
              onSelect={select(onQuarterChange)}
              icons={icons}
              baseUrl={baseUrl}
            />
          )}
        </div>
      </div>
      <button className="okr-icon-btn">
        <Icon src={icons.chevronSelector} size={20} color="var(--text-secondary)" baseUrl={baseUrl} />
      </button>
    </div>
  );
}
