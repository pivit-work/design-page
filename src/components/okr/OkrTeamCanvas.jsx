import { useState } from 'react';
import OkrLinkedParents from './OkrLinkedParents.jsx';
import OkrBoard from './OkrBoard.jsx';
import OkrHistoryQuarter from './OkrHistoryQuarter.jsx';

/**
 * OkrTeamCanvas — 팀 OKR 탭 콘텐츠.
 *
 * data: { teams: [string], periodLabel, links, parents, board, history }
 * 팀 서브탭(밑줄 탭) + 기간 칩(현재/히스토리 — 히스토리는 개인과 동일 구조)
 * 아래에 공용 OkrBoard 를 렌더한다. 데모 데이터는 wrapper 소유.
 */
export default function OkrTeamCanvas({ data, icons, baseUrl = '' }) {
  const { teams, periodLabel, links, parents, board, history } = data;
  const [team, setTeam] = useState(teams[1] ?? teams[0]);
  const [periodTab, setPeriodTab] = useState('current');

  return (
    <div className="okr-personal-area">
      <div className="okr-s-subtabs">
        {teams.map((name) => (
          <span
            key={name}
            className={`okr-s-subtab${team === name ? ' is-active' : ''}`}
            onClick={() => setTeam(name)}
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
          {history?.map((quarter) => (
            <OkrHistoryQuarter key={quarter.label} quarter={quarter} icons={icons} baseUrl={baseUrl} />
          ))}
        </div>
      ) : (
        <>
          <OkrLinkedParents links={links} parents={parents} />
          <OkrBoard board={{ ...board, theme: board.theme.replace('{team}', team) }} icons={icons} baseUrl={baseUrl} />
        </>
      )}
    </div>
  );
}
