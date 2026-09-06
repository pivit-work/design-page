import { useEffect, useRef, useState } from 'react';
import Icon from '../shared/Icon.jsx';
import OkrLinkedParents from './OkrLinkedParents.jsx';
import OkrBoard from './OkrBoard.jsx';
import OkrHistoryQuarter from './OkrHistoryQuarter.jsx';
import OkrSelectMenu from './OkrSelectMenu.jsx';
import rowKey from './rowKey.js';

/**
 * OkrPersonalCanvas — 개인 OKR 탭 콘텐츠 (스크롤 페이지).
 *
 * data: { person, periodLabel, links, parents, banner?, insights, overall,
 *   theme, objectives, history } — 데모 데이터는 wrapper(OkrPage)가 소유한다.
 * 기간 칩(현재/히스토리) 전환과 프로필·연결된 상위 OKR 를 담당하고,
 * 보드(인사이트·달성률·테이블·모달)는 공용 OkrBoard 가 처리한다. banner 는
 * team/company 처럼 OkrBoard 로 전달해 라벨·새로고침 표시를 커스터마이즈한다.
 *
 * ## 액션 줄 우측의 공개 범위 셀렉터 (PW-522)
 *
 * 개인 OKR 을 누가 볼 수 있는지 고르는 자리다. **이 캔버스 안에서만** 그린다 —
 * 🔴 `.okr-personal-area` 와 `.okr-p-period` 는 이름이 `personal` 인데도 팀 축
 * (`OkrTeamCanvas`)·전사 축(`OkrStrategyCanvas`)이 함께 쓰는 «공용» 클래스다. 그래서
 * 그 클래스의 선언을 고쳐 자리를 만들면 팀 화면에도 같은 자리가 생기고, 전사·팀은
 * 전체 공개 고정이라 고를 것이 없다는 규칙이 아무도 결정하지 않은 채 깨진다.
 * 감싸는 줄은 이 캔버스 전용 새 클래스(`.okr-p-actions`)로만 만든다.
 *
 * 값과 옵션은 호출부가 소유한다(`visibility` / `visibilityOptions`). 옵션을 주지
 * 않으면 셀렉터를 아예 그리지 않으므로, 이 부품을 쓰는 다른 화면이 생겨도 자동으로
 * 노출되지 않는다.
 *
 * ## 목표가 0건일 때 (PW-560)
 *
 * `emptyMessage` 를 주면 **본문 자리에만** 그 문구를 그린다 — 프로필과 액션 줄(모드
 * 세그먼트 + 공개 범위 셀렉터)은 그대로 선다. 🔴 이게 이 prop 이 있는 이유다: 호출부가
 * 「목표가 없으니 캔버스를 통째로 안내 문구로 바꾸는」 방식을 쓰면 공개 범위를 고를
 * 자리가 함께 사라져, 첫 목표를 쓰기 전에 미리 「본인만」으로 둘 수 없다
 * (`okr-policy.md §3.3-A E-0` 「개인 목표 0건」 · David 2026-09-06 확정).
 *
 * 문구는 호출부가 소유한다(i18n). 주지 않으면 종전대로 상위 OKR + 보드를 그린다.
 */
export default function OkrPersonalCanvas({
  data,
  icons,
  baseUrl = '',
  onKrUpdate,
  onSubmitFeedback,
  onViewAllFeedback,
  onRefreshInsights,
  onInsightAction,
  onToggleInitiative,
  canEditInitiative = false,
  visibility,
  visibilityOptions,
  onVisibilityChange,
  visibilityDisabled = false,
  visibilityAriaLabel = '개인 OKR 공개 범위',
  emptyMessage,
}) {
  const { person, periodLabel, links, parents, banner, insights, overall, theme, objectives, history } = data;
  const [periodTab, setPeriodTab] = useState('current'); // 'current' | 'history'
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const visibilityRef = useRef(null);

  const options = visibilityOptions ?? [];
  const showVisibility = options.length > 0;
  // 🔴 「열려 있는가」는 state 가 아니라 파생이다. 잠긴 순간 effect 로 닫으면 렌더가
  // 한 번 더 도는 데다, 잠긴 채 열린 패널이 한 프레임 보인다.
  const panelOpen = visibilityOpen && !visibilityDisabled;
  const currentOption = options.find((o) => o.value === visibility) ?? options[0];

  // 바깥 클릭·Escape 로 닫고 **고른 값은 유지**한다 — 툴바 셀렉터(OkrToolbar)와 같은 동작이라
  // 사용자가 셀렉터마다 다른 것을 배우지 않아도 된다.
  useEffect(() => {
    if (!panelOpen) return;
    const onDown = (e) => {
      if (visibilityRef.current && !visibilityRef.current.contains(e.target)) setVisibilityOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setVisibilityOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [panelOpen]);

  return (
    <div className="okr-personal-area">
      <div className="okr-p-profile">
        <img className="okr-p-avatar" src={person.avatar} alt={person.name} draggable={false} />
        <div>
          <p className="okr-p-name">{person.name}</p>
          <p className="okr-p-role">{person.role}</p>
        </div>
      </div>

      <div className="okr-p-actions">
        <div className="okr-p-period">
          <button className={`okr-p-period-btn${periodTab === 'current' ? ' is-active' : ''}`} onClick={() => setPeriodTab('current')}>{periodLabel}</button>
          <button className={`okr-p-period-btn${periodTab === 'history' ? ' is-active' : ''}`} onClick={() => setPeriodTab('history')}>히스토리</button>
        </div>

        {showVisibility && (
          <div className="okr-select-wrap okr-p-visibility" ref={visibilityRef}>
            <button
              type="button"
              className={`okr-select-btn${panelOpen ? ' is-open' : ''}`}
              aria-label={visibilityAriaLabel}
              aria-haspopup="listbox"
              aria-expanded={panelOpen}
              disabled={visibilityDisabled}
              onClick={() => setVisibilityOpen((prev) => !prev)}
            >
              <span>{currentOption?.label}</span>
              <Icon src={icons.chevronDown} size={20} color="var(--text-secondary)" baseUrl={baseUrl} />
            </button>
            {panelOpen && (
              <OkrSelectMenu
                options={options}
                selected={visibility}
                onSelect={(value) => {
                  setVisibilityOpen(false);
                  if (onVisibilityChange) onVisibilityChange(value);
                }}
                icons={icons}
                baseUrl={baseUrl}
              />
            )}
          </div>
        )}
      </div>

      {emptyMessage ? (
        <div className="okr-tab-placeholder okr-p-empty">{emptyMessage}</div>
      ) : periodTab === 'history' ? (
        <div className="okr-h-list">
          {history?.map((quarter, i) => (
            <OkrHistoryQuarter key={rowKey(quarter, i, 'label')} quarter={quarter} icons={icons} baseUrl={baseUrl} />
          ))}
        </div>
      ) : (
        <>
          <OkrLinkedParents links={links} parents={parents} />
          <OkrBoard board={{ banner, insights, overall, theme, objectives }} icons={icons} baseUrl={baseUrl} onKrUpdate={onKrUpdate} onSubmitFeedback={onSubmitFeedback} onViewAllFeedback={onViewAllFeedback} onRefreshInsights={onRefreshInsights} onInsightAction={onInsightAction} onToggleInitiative={onToggleInitiative} canEditInitiative={canEditInitiative} />
        </>
      )}
    </div>
  );
}
