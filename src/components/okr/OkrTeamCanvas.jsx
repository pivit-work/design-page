import { useEffect, useMemo, useRef, useState } from 'react';
import OkrLinkedParents from './OkrLinkedParents.jsx';
import OkrBoard from './OkrBoard.jsx';
import OkrHistoryList from './OkrHistoryList.jsx';
import Tabs from '../shared/Tabs.jsx';
import SegmentedControl from '../shared/SegmentedControl.jsx';
import OkrTeamPicker, { TEAM_PICKER_MIN } from './OkrTeamPicker.jsx';
import { OkrLabelsContext, makeOkrLabels } from './okr-labels.jsx';
import OkrOrgPath from './OkrOrgPath.jsx';

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
 * periodAside: 기간 칩 줄 오른쪽 끝에 놓는 것 — 고른 팀에 쓸 수 있는지(「작성 가능」·「읽기 전용」). 권한은 팀마다
 *   달라서 팀 서브탭 아래 이 줄이 자리다(기획 시안 팀 화면 «모드 세그먼트 + 권한 배지»). 줄은 개인 캔버스와 같은
 *   `.okr-p-actions` 다. 안 주면 칩만 종전 그대로 선다.
 *
 * ## 경로 줄 · 폴더 목록 · 구성원 줄 (pivit-work PW-2763 · okr-policy §3.2-B)
 * 모두 선택 prop 이다. 안 주면 종전 화면 그대로다.
 * path: [{ key, label, onClick? }] — 서브탭 줄 바로 위 «전사 / … / 지금 조직». onClick 이 없는 마디가 지금 위치(굵게).
 *   pathLabel: 경로 줄의 화면 읽기용 이름.
 * teamItems: [{ value, label, mine?, folder? }] — 주면 `teams` 대신 이것으로 서브탭을 세운다.
 *   folder = 폴더 항목(이름 뒤 «/» · 앞에 모은다 · 밑줄을 받지 않는다 — 누르면 onFolderOpen(value)).
 *   mine = 내 소속(굵게 · 진한 글자). 값은 activeTeam 과 같은 열쇠(소비자가 고른다 — 이름이 겹쳐도 된다).
 * members: { label, items: [{ value, label, mine? }], value, onChange } — 서브탭 줄 바로 아래 «구성원» 줄.
 *   같은 공용 Tabs 를 한 번 더 쓴다(새 부품 없음).
 * tabsFallback: 서브탭 줄 자리에 대신 놓는 것 — 조직 목록을 못 불러왔을 때의 실패 안내.
 * body: 주면 기간 칩 줄과 보드 대신 그린다 — 폴더만 있는 폴더의 안내, 구성원 개인 OKR 조회 전용 보기.
 */
export default function OkrTeamCanvas({ data, icons, baseUrl = '', activeTeam, onTeamChange, onKrUpdate, onSubmitFeedback, onViewAllFeedback, onWriteFeedback, onRefreshInsights, onInsightAction, onCloseInsights, showInsights = true, onToggleInitiative, canEditInitiative = false, teamPickerLabels, notice = null, periodAside = null, focusKrId = null, focusObjectiveId = null, historyEmptyLabel, labels, path = null, pathLabel, teamItems = null, onFolderOpen, members = null, tabsFallback = null, body = null }) {
  // 화면 문구 — 소비자가 번역을 넘긴다(PW-2415). 안 넘기면 종전 한국어.
  const L = useMemo(() => makeOkrLabels(labels), [labels]);
  const { teams, periodLabel, links, parents, board, history } = data;
  const [internalTeam, setInternalTeam] = useState(teams[1] ?? teams[0]);
  const team = activeTeam ?? internalTeam;
  const selectTeam = (name) => {
    if (onTeamChange) onTeamChange(name);
    else setInternalTeam(name);
  };
  // 서브탭 항목 — teamItems 가 있으면 폴더 항목(앞)·조직 항목(뒤)으로, 없으면 종전 이름 목록 (PW-2763).
  const folderValues = useMemo(
    () => new Set((teamItems ?? []).filter((it) => it.folder).map((it) => it.value)),
    [teamItems],
  );
  const tabItems = teamItems
    ? [...teamItems.filter((it) => it.folder), ...teamItems.filter((it) => !it.folder)].map((it) => ({
        value: it.value,
        label: (
          <span className={`okr-team-tab-label${it.mine ? ' is-mine' : ''}`}>
            {it.label}
            {it.folder && <span className="okr-team-tab-slash" aria-hidden="true">/</span>}
          </span>
        ),
      }))
    : teams.map((name) => ({ value: name, label: name }));
  const onTabChange = (value) => {
    if (folderValues.has(value)) onFolderOpen?.(value);
    else selectTeam(value);
  };
  // 「팀 고르기」는 조직 항목만 — 이름으로 고르므로 값으로 되돌린다.
  const pickerItems = teamItems ? teamItems.filter((it) => !it.folder) : null;
  const pickerTeams = pickerItems ? pickerItems.map((it) => it.label) : teams;
  const pickerValue = pickerItems ? (pickerItems.find((it) => it.value === team)?.label ?? '') : team;
  const onPickerChange = (label) => {
    if (!pickerItems) return selectTeam(label);
    const hit = pickerItems.find((it) => it.label === label);
    if (hit) selectTeam(hit.value);
    return undefined;
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
  const teamsKey = (teamItems ? teamItems.map((it) => it.value) : teams).join('\u0000');
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

  const periodChip = (
    <SegmentedControl
      className="okr-p-period"
      items={[
        { value: 'current', label: periodLabel },
        { value: 'history', label: L('period.history') },
      ]}
      value={periodTab}
      onChange={setPeriodTab}
    />
  );

  return (
    <OkrLabelsContext.Provider value={L}>
    <div className="okr-personal-area">
      {path && <OkrOrgPath path={path} ariaLabel={pathLabel} />}

      {/* 팀 서브탭 — 공용 Tabs, 기간 칩 — 공용 SegmentedControl (PW-836). */}
      {tabsFallback ?? (
        <div className="tl-tabs-row okr-s-tabs-row">
          <div className="okr-team-tabs-scroll" ref={tabsScrollRef}>
            <Tabs items={tabItems} value={team} onChange={onTabChange} />
          </div>
          {(pickerTeams.length >= TEAM_PICKER_MIN || tabsOverflow) && (
            <OkrTeamPicker teams={pickerTeams} value={pickerValue} onChange={onPickerChange} labels={teamPickerLabels} />
          )}
        </div>
      )}

      {/* 구성원 줄 — 서브탭과 같은 Tabs (PW-2763 · okr-policy §3.2-B M3). */}
      {members && members.items.length > 0 && (
        <div className="tl-tabs-row okr-s-tabs-row okr-team-members">
          <span className="okr-team-members-label">{members.label}</span>
          <div className="okr-team-tabs-scroll">
            <Tabs
              items={members.items.map((it) => ({
                value: it.value,
                label: <span className={`okr-team-tab-label${it.mine ? ' is-mine' : ''}`}>{it.label}</span>,
              }))}
              value={members.value ?? ''}
              onChange={members.onChange}
            />
          </div>
        </div>
      )}

      {notice}

      {body ?? (<>
      {periodAside ? (
        <div className="okr-p-actions">
          {periodChip}
          {periodAside}
        </div>
      ) : periodChip}

      {periodTab === 'history' ? (
        <OkrHistoryList history={history} icons={icons} baseUrl={baseUrl} emptyLabel={historyEmptyLabel} />
      ) : (
        <>
          <OkrLinkedParents links={links} parents={parents} />
          <OkrBoard board={{ ...board, theme: board.theme.replace('{team}', team) }} icons={icons} baseUrl={baseUrl} onKrUpdate={onKrUpdate} onSubmitFeedback={onSubmitFeedback} onViewAllFeedback={onViewAllFeedback} onWriteFeedback={onWriteFeedback} onRefreshInsights={onRefreshInsights} onInsightAction={onInsightAction} onCloseInsights={onCloseInsights} showInsights={showInsights} onToggleInitiative={onToggleInitiative} canEditInitiative={canEditInitiative} focusKrId={focusKrId} focusObjectiveId={focusObjectiveId} />
        </>
      )}
      </>)}
    </div>
    </OkrLabelsContext.Provider>
  );
}
