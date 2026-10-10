import { useRef, useState } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';
import Icon from '../shared/Icon.jsx';
import SegmentedControl from '../shared/SegmentedControl.jsx';
import OkrSelectMenu from './OkrSelectMenu.jsx';
import useDismissLayer from '../shared/useDismissLayer.js';

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
  // 전체 펼치기/접기 — 모든 노드의 Objective 요약을 한꺼번에 접고 편다. 기본 펼침
  // (okr-policy.md §3.4). 상태는 캔버스와 나눠 써야 해서 부모가 갖는다. 콜백을 안 넘기면
  // 버튼을 그리지 않는다 — 눌러도 아무 일 없는 버튼을 남기지 않는다(PW-1641).
  objectivesExpanded = true, onToggleObjectivesExpanded,
  expandLabel = '모든 노드의 Objective 요약을 펼칩니다',
  collapseLabel = '모든 노드의 Objective 요약을 접습니다',
  icons, baseUrl = '',
}) {
  const [openMenu, setOpenMenu] = useState(null); // 'year' | 'quarter' | null
  const rootRef = useRef(null);

  useDismissLayer(() => setOpenMenu(null), rootRef, null, !!openMenu);

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
          // 단위 고르기 — 공용 SegmentedControl (PW-836).
          <SegmentedControl
            ariaLabel={levelPickerLabel}
            items={levels.map((level) => ({ value: level.id, label: level.label }))}
            value={selectedLevelId}
            onChange={(id) => onLevelChange && onLevelChange(id)}
          />
        )}
        {levels.length > 1 && depthLabel && <span className="okr-depth-label">{depthLabel}</span>}
        {policyChip && (
          <StatusBadge className="okr-policy-chip" title={policyChip.title}>{policyChip.label}</StatusBadge>
        )}
      </div>
      {onToggleObjectivesExpanded && (
        <button
          type="button"
          className="okr-icon-btn"
          onClick={onToggleObjectivesExpanded}
          aria-expanded={objectivesExpanded}
          aria-label={objectivesExpanded ? collapseLabel : expandLabel}
          title={objectivesExpanded ? collapseLabel : expandLabel}
        >
          <Icon src={icons.chevronSelector} size={20} color="var(--text-secondary)" baseUrl={baseUrl} />
        </button>
      )}
    </div>
  );
}
