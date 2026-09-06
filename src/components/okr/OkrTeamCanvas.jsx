import { useState } from 'react';
import OkrLinkedParents from './OkrLinkedParents.jsx';
import OkrBoard from './OkrBoard.jsx';
import OkrHistoryQuarter from './OkrHistoryQuarter.jsx';
import rowKey from './rowKey.js';

/**
 * OkrTeamCanvas — 팀 OKR 탭 콘텐츠.
 *
 * data: { teams: [string], periodLabel, links, parents, board, history }
 * 팀 서브탭(밑줄 탭) + 기간 칩(현재/히스토리 — 히스토리는 개인과 동일 구조)
 * 아래에 공용 OkrBoard 를 렌더한다. 데모 데이터는 wrapper 소유.
 *
 * 서브탭 선택은 controlled/uncontrolled 를 모두 지원한다:
 *   - activeTeam + onTeamChange 를 주면 소비자가 선택을 소유(보드를 팀별로
 *     재조회 가능). 안 주면 기존처럼 내부 state 로 동작(non-breaking).
 */
export default function OkrTeamCanvas({ data, icons, baseUrl = '', activeTeam, onTeamChange, onKrUpdate, onSubmitFeedback, onViewAllFeedback, onRefreshInsights, onInsightAction, onToggleInitiative, canEditInitiative = false }) {
  const { teams, periodLabel, links, parents, board, history } = data;
  const [internalTeam, setInternalTeam] = useState(teams[1] ?? teams[0]);
  const team = activeTeam ?? internalTeam;
  const selectTeam = (name) => {
    if (onTeamChange) onTeamChange(name);
    else setInternalTeam(name);
  };
  const [periodTab, setPeriodTab] = useState('current');

  return (
    <div className="okr-personal-area">
      <div className="okr-s-subtabs">
        {teams.map((name, i) => (
          <span
            key={rowKey(name, i)}
            className={`okr-s-subtab${team === name ? ' is-active' : ''}`}
            onClick={() => selectTeam(name)}
          >
            {name}
          </span>
        ))}
      </div>

      <div className="okr-p-period">
        <button className={`okr-p-period-btn${periodTab === 'current' ? ' is-active' : ''}`} onClick={() => setPeriodTab('current')}>{periodLabel}</button>
        <button className={`okr-p-period-btn${periodTab === 'history' ? ' is-active' : ''}`} onClick={() => setPeriodTab('history')}>히스토리</button>
      </div>

      {periodTab === 'history' ? (
        <div className="okr-h-list">
          {history?.map((quarter, i) => (
            <OkrHistoryQuarter key={rowKey(quarter, i, 'label')} quarter={quarter} icons={icons} baseUrl={baseUrl} />
          ))}
        </div>
      ) : (
        <>
          <OkrLinkedParents links={links} parents={parents} />
          <OkrBoard board={{ ...board, theme: board.theme.replace('{team}', team) }} icons={icons} baseUrl={baseUrl} onKrUpdate={onKrUpdate} onSubmitFeedback={onSubmitFeedback} onViewAllFeedback={onViewAllFeedback} onRefreshInsights={onRefreshInsights} onInsightAction={onInsightAction} onToggleInitiative={onToggleInitiative} canEditInitiative={canEditInitiative} />
        </>
      )}
    </div>
  );
}
