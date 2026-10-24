import { useEffect, useRef, useState } from 'react';
import OkrLinkedParents from './OkrLinkedParents.jsx';
import OkrBoard from './OkrBoard.jsx';
import OkrHistoryList from './OkrHistoryList.jsx';
import Tabs from '../shared/Tabs.jsx';
import SegmentedControl from '../shared/SegmentedControl.jsx';
import OkrTeamPicker, { TEAM_PICKER_MIN } from './OkrTeamPicker.jsx';

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
 *
 * 팀이 많을 때 (PW-1876): 탭 줄은 줄바꿈 없이 옆으로 굴러가고, 고른 탭이 보이게 굴려 둔다.
 * 팀이 TEAM_PICKER_MIN 개 이상이면 줄 오른쪽 끝에 검색 달린 「팀 고르기」(OkrTeamPicker)를 단다.
 * teamPickerLabels: { trigger, search, empty } — 소비자 번역. 안 주면 한국어 기본값.
 * notice: 팀 탭 줄 바로 아래 놓는 안내 한 줄(소비자가 NoteText 등으로 그려 넘긴다). 예: 조직장이 없어
 *   어드민만 쓸 수 있다는 안내(pivit-work PW-2039). 이 캔버스는 고정 자리라 바깥에 그리면 화면 맨 위 구석에 붙는다.
 */
export default function OkrTeamCanvas({ data, icons, baseUrl = '', activeTeam, onTeamChange, onKrUpdate, onSubmitFeedback, onViewAllFeedback, onWriteFeedback, onRefreshInsights, onInsightAction, onToggleInitiative, canEditInitiative = false, teamPickerLabels, notice = null, focusKrId = null, focusObjectiveId = null, historyEmptyLabel }) {
  const { teams, periodLabel, links, parents, board, history } = data;
  const [internalTeam, setInternalTeam] = useState(teams[1] ?? teams[0]);
  const team = activeTeam ?? internalTeam;
  const selectTeam = (name) => {
    if (onTeamChange) onTeamChange(name);
    else setInternalTeam(name);
  };
  const [periodTab, setPeriodTab] = useState('current');

  // 고른 탭이 굴러간 탭 줄 밖에 있으면 보이는 자리로 당긴다 — 「팀 고르기」로 먼 팀을 골랐을 때.
  const tabsScrollRef = useRef(null);
  useEffect(() => {
    const active = tabsScrollRef.current?.querySelector('[role="tab"][aria-selected="true"]');
    active?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [team]);

  // 팀 수가 적어도 화면이 좁으면 넘친다 — 넘치는 동안에도 「팀 고르기」를 단다.
  const [tabsOverflow, setTabsOverflow] = useState(false);
  const teamsKey = teams.join('\u0000');
  useEffect(() => {
    const el = tabsScrollRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const check = () => setTabsOverflow(el.scrollWidth > el.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [teamsKey]);

  return (
    <div className="okr-personal-area">
      {/* 팀 서브탭 — 공용 Tabs, 기간 칩 — 공용 SegmentedControl (PW-836). */}
      <div className="tl-tabs-row okr-s-tabs-row">
        <div className="okr-team-tabs-scroll" ref={tabsScrollRef}>
          <Tabs
            items={teams.map((name) => ({ value: name, label: name }))}
            value={team}
            onChange={selectTeam}
          />
        </div>
        {(teams.length >= TEAM_PICKER_MIN || tabsOverflow) && (
          <OkrTeamPicker teams={teams} value={team} onChange={selectTeam} labels={teamPickerLabels} />
        )}
      </div>

      {notice}

      <SegmentedControl
        className="okr-p-period"
        items={[
          { value: 'current', label: periodLabel },
          { value: 'history', label: '히스토리' },
        ]}
        value={periodTab}
        onChange={setPeriodTab}
      />

      {periodTab === 'history' ? (
        <OkrHistoryList history={history} icons={icons} baseUrl={baseUrl} emptyLabel={historyEmptyLabel} />
      ) : (
        <>
          <OkrLinkedParents links={links} parents={parents} />
          <OkrBoard board={{ ...board, theme: board.theme.replace('{team}', team) }} icons={icons} baseUrl={baseUrl} onKrUpdate={onKrUpdate} onSubmitFeedback={onSubmitFeedback} onViewAllFeedback={onViewAllFeedback} onWriteFeedback={onWriteFeedback} onRefreshInsights={onRefreshInsights} onInsightAction={onInsightAction} onToggleInitiative={onToggleInitiative} canEditInitiative={canEditInitiative} focusKrId={focusKrId} focusObjectiveId={focusObjectiveId} />
        </>
      )}
    </div>
  );
}
