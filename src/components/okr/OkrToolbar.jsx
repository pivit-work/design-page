import { useEffect, useRef, useState } from 'react';
import Icon from '../shared/Icon.jsx';
import OkrSelectMenu from './OkrSelectMenu.jsx';

/**
 * OkrToolbar — 연도/분기 선택 버튼 + 하위 계층 셀렉터 + 우측 정렬 버튼 줄.
 * 버튼 클릭 시 드롭다운 메뉴가 열리고, 선택값은 wrapper(OkrPage)가 소유한다.
 * 바깥 클릭·ESC·선택 시 메뉴가 닫힌다.
 *
 * 하위 계층 셀렉터(`levels`)와 뎁스 문구(`depthLabel`)는 **선택지가 2개 이상일 때만**
 * 그린다. 트리가 「전사 + 고른 계층(+개인)」 2~3단인 것은 사양인데 화면이 그 사실을
 * 말하지 않아 「부서 계층 누락(버그)」으로 접수됐다 — 상시 노출이라야 답이 된다
 * (okr-policy.md §3.4-A T3-a·T3-c, PW-413). 툴팁은 「이미 의심한 사람」만 본다.
 */
export default function OkrToolbar({
  year, years, onYearChange,
  quarter, quarters, onQuarterChange,
  levels = [], selectedLevelId, onLevelChange, levelPickerLabel = '하위 계층 선택',
  depthLabel, policyChip,
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
        {levels.length > 1 && (
          <div className="okr-level-seg" role="group" aria-label={levelPickerLabel}>
            {levels.map((level) => (
              <button
                key={level.id}
                type="button"
                className={`okr-level-seg-btn${level.id === selectedLevelId ? ' is-active' : ''}`}
                aria-pressed={level.id === selectedLevelId}
                onClick={() => onLevelChange && onLevelChange(level.id)}
              >
                {level.label}
              </button>
            ))}
          </div>
        )}
        {levels.length > 1 && depthLabel && <span className="okr-depth-label">{depthLabel}</span>}
        {policyChip && (
          <span className="okr-policy-chip" title={policyChip.title}>{policyChip.label}</span>
        )}
      </div>
      <button className="okr-icon-btn">
        <Icon src={icons.chevronSelector} size={20} color="var(--text-secondary)" baseUrl={baseUrl} />
      </button>
    </div>
  );
}
