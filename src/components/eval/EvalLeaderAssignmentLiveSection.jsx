import { Fragment, useMemo, useRef, useState } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';
import RosterTable from '../shared/RosterTable.jsx';
import TextInput from '../shared/TextInput.jsx';
import Checkbox from '../shared/Checkbox.jsx';
import Tooltip from '../shared/Tooltip.jsx';
import Skeleton from '../shared/Skeleton.jsx';
import AnchoredLayer from '../shared/AnchoredLayer.jsx';
import useDismissLayer from '../shared/useDismissLayer.js';
import { leavesBeforeDate } from './evalRetiring.js';
import RetiringTag from './RetiringTag.jsx';
import { ChevronDownIcon, ChevronUpIcon, LockIcon } from './evalIcons.jsx';
import { fill } from './evalTemplateItemModel.js';
import { LEADER_LOAD_LIMIT_DEFAULT, leaderRuleText } from './evalLeaderRounds.js';
import {
  formatMonthDay,
  isLiveCellSkipped,
  liveCellActions,
  liveCellBadge,
  liveRoundCount,
} from './evalLeaderLive.js';
import {
  LEADER_TOOL_LABELS,
  allOn,
  evaluatorLoadRows,
  filterLeaderRows,
  hasLeaderFilter,
  leaderLevelOptions,
  sortLeaderRows,
} from './evalLeaderTable.js';
import { LeaderBulkBar, LeaderEvaluatorView, LeaderToolbar } from './EvalLeaderTableTools.jsx';
import { useLeaderTableTools } from './useLeaderTableTools.js';

/** 로딩 자리 표시 줄 수 · 표 행 높이(§9-E-1 tbody tr h49) — 4단계 섹션과 같은 값. */
/** 최상위 조직이 없는 대상자 묶음. */
const NO_GROUP = '__none';
const SKELETON_ROWS = 4;
const ROW_H = 49;

const DEFAULT_LABELS = {
  liveTitle: '하향 평가자',
  liveSub: '{{rounds}}차 · 오픈 뒤 조정',
  liveExpand: '펼치기',
  liveCollapse: '접기',
  liveHint: '제출되지 않은 칸만 바꿀 수 있습니다. 앞 차수를 기다리는 칸은 「앞 차수 없이 열기」로 열 수 있습니다.',
  liveHintReadOnly: '캘리브레이션이 확정되어 조회만 할 수 있습니다.',
  liveColTarget: '대상자',
  liveColRound: '{{round}}차',
  liveSkipped: '건너뜀',
  liveWaiting: '앞 차수 대기',
  liveOpen: '작성 가능',
  liveInProgress: '작성 중',
  liveSubmitted: '제출 {{date}}',
  liveResigned: '퇴사',
  liveLockedTip: '제출된 하향 리뷰는 평가자를 바꿀 수 없습니다',
  liveForceOpen: '앞 차수 없이 열기',
  livePickSearch: '이름·소속 검색',
  livePickEmpty: '검색 결과가 없습니다',
  liveSkip: '이 차수 건너뛰기',
  liveRestoreHint: '사람을 지정하면 이 차수를 되살립니다',
  liveLoadFailed: '하향 평가자를 불러오지 못했습니다',
  liveRetry: '다시 시도',
  liveEmpty: '하향 평가 대상자가 없습니다.',
  liveCellAria: '{{name}} {{round}}차 평가자 바꾸기',
};

/**
 * PW-1594 — 진행 현황 「하향 평가자」 접이식 블록 (오픈 뒤 · 정책 screen-eval-cycle-hr.policy.md §5.13.6).
 *
 * 4단계 ④ 섹션(`EvalLeaderAssignmentSection`)과 같은 표 모양 — 행 = 대상자, 열 = 1~N차, 공용 `RosterTable`,
 * 칸 배지 `.evc-status-badge`, 차수 머리 `.evc-type-badge`, 칸 팝오버 `.evc-la-pop`. 다른 것은 칸이 «추천/조정»
 * 대신 서버가 정한 열림 상태(앞 차수 대기 · 작성 가능 · 작성 중 · 제출 · 건너뜀 · 퇴사)를 보이고, 확정 바가 없다는 것.
 *
 * 순수 표현이다 — 서버 호출·확인 창·토스트·원복은 호출부가 한다. 칸을 누르면 `onAssign(row, cell, person)` ·
 * `onSkip(row, cell)` · `onForceOpen(row, cell)`.
 */
export default function EvalLeaderAssignmentLiveSection({
  labels,
  /** 서버 `rounds`(없으면 칸에서 센다). */
  rounds,
  /** 서버 `rows` 그대로 — `[{ evaluateeId, evaluateeName, orgName, cells }]`. */
  rows = [],
  /** 교체 후보 `[{ id, name, org, resigned, lastServingDay?, retiringLabel? }]` — 퇴사자는 목록에서 뺀다. */
  people = [],
  /** PW-2029 — k차 하향 단계 끝. 그 전에 떠나는 사람은 그 칸 교체 후보에서 빠진다. */
  roundDeadline = () => '',
  /** 'loading' | 'error' | 'ready'. */
  status = 'ready',
  onRetry,
  /** 캘리브레이션 확정 뒤 — 편집 버튼을 모두 숨긴다. */
  readOnly = false,
  /** 서버에 보내는 중인 칸 id — 그 칸은 누르지 못한다. */
  pendingIds = [],
  onAssign,
  onSkip,
  onForceOpen,
  defaultOpen = false,
  /** PW-2065 — 오픈 때 굳은 배정 규칙(`unitNames`·`evaluatorName` 이 붙어 온다). 읽기만 한다. */
  rules = [],
  /** 부담 경고 기준(null = 기본 15 · 0 = 끔). */
  loadLimit = null,
  /**
   * PW-2066 · §5.13.10 — 일괄 조정 `(refs, action, personId) → Promise<{ applied, skippedSelf, skippedSubmitted } | null>`.
   * refs = `[{ evaluateeId, round, cell }]`. 확인 창·서버 호출·실패 토스트는 호출부가 한다(null = 취소·실패).
   */
  onBulk,
}) {
  const L = { ...DEFAULT_LABELS, ...LEADER_TOOL_LABELS, ...(labels ?? {}) };
  const [open, setOpen] = useState(!!defaultOpen);
  const [openCellId, setOpenCellId] = useState(null);
  const [pickQuery, setPickQuery] = useState('');
  const panelRef = useRef(null);
  const closePick = () => {
    setOpenCellId(null);
    setPickQuery('');
  };
  useDismissLayer(
    closePick,
    panelRef,
    openCellId ? `[data-leader-live-cell="${openCellId}"]` : undefined,
    !!openCellId,
  );

  const n = liveRoundCount(rounds, rows);
  const roundList = Array.from({ length: n }, (_, i) => i + 1);
  const pending = new Set(pendingIds ?? []);
  const loading = status === 'loading';
  const failed = status === 'error';

  /* PW-2066 · §5.13.10 — 4단계와 같은 도구. 조직별 확정·규칙 편집은 없다(T-5). */
  const tools = useLeaderTableTools(n);
  const [bulkBusy, setBulkBusy] = useState(false);
  const bulkOn = !readOnly && typeof onBulk === 'function';
  const toolRows = useMemo(
    () =>
      rows.map((r) => ({
        id: r.evaluateeId,
        name: r.evaluateeName,
        groupId: r.groupId ?? NO_GROUP,
        level: r.jobLevel || '',
        subOrg: r.orgName || '',
        src: r,
      })),
    [rows],
  );
  const groups = useMemo(() => {
    const seen = new Map();
    rows.forEach((r) => {
      const id = r.groupId ?? NO_GROUP;
      if (!seen.has(id)) {
        seen.set(id, {
          id,
          name: !r.groupId
            ? L.leaderToolGroupNone
            : r.groupRootDirect
              ? L.leaderToolGroupRootDirect
              : r.groupName || L.leaderToolGroupNone,
          rank: !r.groupId ? 2 : r.groupRootDirect ? 0 : 1,
        });
      }
    });
    return [...seen.values()].sort(
      (a, b) => a.rank - b.rank || String(a.name).localeCompare(String(b.name), 'ko'),
    );
  }, [rows, L.leaderToolGroupNone, L.leaderToolGroupRootDirect]);
  /** 오픈 뒤 «경고» = 퇴사한 평가자가 아직 안 낸 칸(재배정 대상 · §5.13.6). */
  const warned = useMemo(
    () => new Set(rows.filter((r) => r.cells?.some((c) => c.resigned && c.state !== 'submitted')).map((r) => r.evaluateeId)),
    [rows],
  );
  const liveCells = useMemo(
    () =>
      rows.flatMap((r) =>
        (r.cells ?? []).map((c) => ({ ...c, evaluateeId: r.evaluateeId, skipped: isLiveCellSkipped(c) })),
      ),
    [rows],
  );
  const cellsByRow = useMemo(() => {
    const m = new Map();
    liveCells.forEach((c) => m.set(c.evaluateeId, [...(m.get(c.evaluateeId) ?? []), c]));
    return m;
  }, [liveCells]);
  const visibleRows = useMemo(
    () =>
      sortLeaderRows(
        filterLeaderRows(toolRows, tools.filter, {
          query: tools.view === 'target' ? tools.query : '',
          warned,
          cellsOf: (id) => cellsByRow.get(id) ?? [],
        }),
        tools.sort,
        warned,
      ),
    [toolRows, tools.filter, tools.view, tools.query, tools.sort, warned, cellsByRow],
  );
  const levelOptions = useMemo(() => leaderLevelOptions(toolRows), [toolRows]);
  const personMap = useMemo(() => {
    const m = new Map((people ?? []).map((p) => [p.id, p]));
    liveCells.forEach((c) => {
      if (c.evaluatorId && !m.has(c.evaluatorId)) {
        m.set(c.evaluatorId, { id: c.evaluatorId, name: c.evaluatorName, resigned: !!c.resigned });
      } else if (c.evaluatorId && c.resigned) {
        m.set(c.evaluatorId, { ...m.get(c.evaluatorId), resigned: true });
      }
    });
    return m;
  }, [people, liveCells]);
  const personOf = (id) => personMap.get(id) ?? null;
  const loadBy = useMemo(() => {
    const m = new Map();
    liveCells.forEach((c) => !c.skipped && c.evaluatorId && m.set(c.evaluatorId, (m.get(c.evaluatorId) ?? 0) + 1));
    return m;
  }, [liveCells]);
  const evaluatorView = tools.view === 'evaluator';
  const evQuery = tools.query.trim().toLowerCase();
  const evaluatorRows = evaluatorView
    ? evaluatorLoadRows(liveCells, n, (id) => personOf(id)?.name).filter(
        (r) => !evQuery || String(personOf(r.evaluatorId)?.name ?? '').toLowerCase().includes(evQuery),
      )
    : [];
  const liveLoadLimit = loadLimit ?? LEADER_LOAD_LIMIT_DEFAULT;
  const filtered = hasLeaderFilter(tools.filter) || !!tools.query.trim();
  const visibleIds = visibleRows.map((r) => r.id);
  const cols = n + 1 + (bulkOn ? 1 : 0);
  const cellAt = (evaluateeId, round) => cellsByRow.get(evaluateeId)?.find((c) => c.round === round) ?? null;
  const applyBulk = async (action, personId) => {
    // 지난 결과 줄은 지운다 — 이번이 실패했는데 앞의 «적용했습니다»가 남으면 성공으로 읽힌다.
    tools.setResult(null);
    const refs = (
      evaluatorView
        ? [...tools.selected].map((k) => {
            const [evaluateeId, round] = k.split(':');
            return { evaluateeId, round: Number(round) };
          })
        : [...tools.selected].map((evaluateeId) => ({ evaluateeId, round: tools.bulkRound }))
    )
      .map((r) => ({ ...r, cell: cellAt(r.evaluateeId, r.round) }))
      .filter((r) => r.cell);
    setBulkBusy(true);
    try {
      const res = await onBulk(refs, action, personId);
      if (res) {
        tools.clearSelected();
        tools.setResult(res);
      }
    } finally {
      setBulkBusy(false);
    }
  };
  const evaluatorCellLabel = (c) => {
    const badge = liveCellBadge(c);
    const row = rows.find((r) => r.evaluateeId === c.evaluateeId);
    return (
      <span className="evc-la-name-row">
        <span className="evc-la-name">{row?.evaluateeName ?? ''}</span>
        <StatusBadge className="evc-type-badge">{fill(L.leaderEvCellRound, { round: c.round })}</StatusBadge>
        {badge && (
          <StatusBadge className={`evc-status-badge ${badge.tone}`}>
            {badge.key === 'liveSubmitted'
              ? fill(L.liveSubmitted, { date: formatMonthDay(c.submittedAt) }).trim()
              : L[badge.key]}
          </StatusBadge>
        )}
      </span>
    );
  };

  let openRow = null;
  let openCell = null;
  if (openCellId) {
    for (const r of rows) {
      const c = r.cells?.find((x) => x.id === openCellId);
      if (c) {
        openRow = r;
        openCell = c;
        break;
      }
    }
  }
  const pq = pickQuery.trim().toLowerCase();
  const pickList = openRow
    ? (people ?? []).filter(
        (p) =>
          !p.resigned &&
          !leavesBeforeDate(p.lastServingDay, roundDeadline(openCell?.round)) &&
          p.id !== openRow.evaluateeId &&
          p.id !== openCell?.evaluatorId &&
          (!pq ||
            String(p.name ?? '').toLowerCase().includes(pq) ||
            String(p.org ?? '').toLowerCase().includes(pq)),
      )
    : [];
  const openActs = openCell ? liveCellActions(openCell, readOnly) : null;

  const renderCell = (row, k) => {
    const c = row.cells?.find((x) => x.round === k);
    if (!c) return <span className="evc-la-muted">—</span>;
    const acts = liveCellActions(c, readOnly);
    const skipped = isLiveCellSkipped(c);
    const badge = liveCellBadge(c);
    const busy = pending.has(c.id);
    const body = skipped ? (
      <span className="evc-la-muted">{L.liveSkipped}</span>
    ) : (
      <span className="evc-la-name-row">
        <span className={`evc-la-name${c.resigned && c.state !== 'submitted' ? ' is-resigned' : ''}`}>
          {c.evaluatorName || '—'}
        </span>
        {badge && (
          <StatusBadge
            className={`evc-status-badge ${badge.tone}`}
            data-testid={`evmon-la-badge-${c.id}`}
            data-state={badge.key}
          >
            {badge.key === 'liveSubmitted'
              ? fill(L.liveSubmitted, { date: formatMonthDay(c.submittedAt) }).trim()
              : L[badge.key]}
          </StatusBadge>
        )}
        {acts.locked && !readOnly && (
          <span className="evc-la-hint" aria-hidden="true">
            <LockIcon size={11} />
          </span>
        )}
      </span>
    );
    const cellNode = acts.canEdit ? (
      <button
        type="button"
        className={`evc-la-cell${openCellId === c.id ? ' is-open' : ''}`}
        data-leader-live-cell={c.id}
        aria-haspopup="true"
        aria-expanded={openCellId === c.id}
        aria-label={fill(L.liveCellAria, { name: row.evaluateeName, round: k })}
        disabled={busy}
        onClick={() => {
          if (openCellId === c.id) closePick();
          else {
            setOpenCellId(c.id);
            setPickQuery('');
          }
        }}
        data-testid={`evmon-la-cell-${c.id}`}
        data-state={skipped ? 'skipped' : c.state}
      >
        {body}
      </button>
    ) : (
      <Tooltip content={acts.locked && !readOnly ? L.liveLockedTip : undefined}>
        <span
          className="evc-la-cell is-static"
          data-testid={`evmon-la-cell-${c.id}`}
          data-state={skipped ? 'skipped' : c.state}
          data-locked={acts.locked ? 'true' : undefined}
        >
          {body}
        </span>
      </Tooltip>
    );
    return (
      <>
        {cellNode}
        {acts.canForceOpen && (
          <button
            type="button"
            className="evc-link-btn evmon-la-force"
            disabled={busy}
            onClick={() => onForceOpen?.(row, c)}
            data-testid={`evmon-la-force-${c.id}`}
          >
            {L.liveForceOpen}
          </button>
        )}
      </>
    );
  };

  return (
    <section className="evc-card evmon-la" data-testid="evmon-leader-assign">
      <button
        type="button"
        className="evmon-la-toggle"
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o);
          closePick();
        }}
        data-testid="evmon-la-toggle"
      >
        <span className="evc-card-name">{L.liveTitle}</span>
        <span className="evc-la-hint">{fill(L.liveSub, { rounds: n })}</span>
        <span className="evmon-la-toggle-end">
          {open ? L.liveCollapse : L.liveExpand}
          {open ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
        </span>
      </button>

      {open && (
        <div className="evc-la" data-testid="evmon-la-body">
          <p className="evc-wiz-hint" data-testid="evmon-la-hint">
            {readOnly ? L.liveHintReadOnly : L.liveHint}
          </p>
          {/* PW-2065 · §5.13.11 ① 「오픈 뒤」 — 규칙은 오픈 때 칸으로 굳었다. 목록만 보인다(고쳐도 다시 계산하지 않는다). */}
          {rules.length > 0 && (
            <div className="evc-la-bar evc-la-rules" data-testid="evmon-la-rules">
              <span className="evc-la-bar-count">
                {fill(L.leaderRulesHead, { count: rules.length })}{' '}
                <span className="evc-la-bar-detail">
                  {(loadLimit ?? LEADER_LOAD_LIMIT_DEFAULT) > 0
                    ? fill(L.leaderRulesLoadOn, { limit: loadLimit ?? LEADER_LOAD_LIMIT_DEFAULT })
                    : L.leaderRulesLoadOff}
                </span>
              </span>
              {rules.map((r, i) => (
                <div key={i} className="evc-la-rule" data-testid={`evmon-la-rule-${i}`}>
                  <span className="evc-la-hint">{i + 1}</span>
                  <span className="evc-la-rule-text">
                    {leaderRuleText(
                      L,
                      r,
                      (u) => r.unitNames?.[r.units.indexOf(u)] ?? null,
                      () => r.evaluatorName ?? null,
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
          {rows.length > 0 && (
            <LeaderToolbar
              L={L}
              tools={tools}
              groups={groups}
              levels={levelOptions}
              searchLabel={L.leaderToolSearchTarget}
              testPrefix="evmon-la"
            />
          )}
          {bulkOn && (
            <LeaderBulkBar
              L={L}
              tools={tools}
              rounds={n}
              count={tools.selected.size}
              people={people}
              loadBy={loadBy}
              busy={bulkBusy}
              onApply={(action, personId) => void applyBulk(action, personId)}
              testPrefix="evmon-la"
            />
          )}
          {failed && (
            <p className="evc-wiz-warn evc-la-error" role="alert" data-testid="evmon-la-error">
              {L.liveLoadFailed}
              {onRetry && (
                <button
                  type="button"
                  className="evc-link-btn"
                  onClick={() => onRetry()}
                  data-testid="evmon-la-retry"
                >
                  {L.liveRetry}
                </button>
              )}
            </p>
          )}
          {/* 다시 읽기가 실패해도 읽어 둔 표는 남긴다 — 실패 문구만 위에 얹는다. */}
          {failed && rows.length === 0 ? null : loading && rows.length === 0 ? (
            <div className="evc-la-loading-rows" data-testid="evmon-la-loading">
              {Array.from({ length: SKELETON_ROWS }, (_, i) => (
                <Skeleton key={i} height={ROW_H - 8} />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="evc-la-blank" data-testid="evmon-la-empty">
              {L.liveEmpty}
            </p>
          ) : evaluatorView ? (
            <LeaderEvaluatorView
              L={L}
              tools={tools}
              rounds={n}
              loadRows={evaluatorRows}
              personOf={personOf}
              loadLimit={liveLoadLimit}
              cellLabel={evaluatorCellLabel}
              canSelect={() => bulkOn}
              testPrefix="evmon-la"
            />
          ) : (
            <RosterTable scroll="x" tableClassName="evc-la-table" testId="evmon-la-table">
              <RosterTable.Head>
                {bulkOn && (
                  <RosterTable.HeadCell width={36}>
                    <Checkbox
                      inputClassName="dp-check-input"
                      checked={allOn(tools.selected, visibleIds)}
                      disabled={visibleIds.length === 0}
                      aria-label={L.leaderToolCheckAll}
                      onChange={(e) => tools.setSelectedMany(visibleIds, e.target.checked)}
                      data-testid="evmon-la-check-all"
                    />
                  </RosterTable.HeadCell>
                )}
                <RosterTable.HeadCell width={200}>{L.liveColTarget}</RosterTable.HeadCell>
                {roundList.map((k) => (
                  <RosterTable.HeadCell key={k}>
                    <StatusBadge className="evc-type-badge">{fill(L.liveColRound, { round: k })}</StatusBadge>
                  </RosterTable.HeadCell>
                ))}
              </RosterTable.Head>
              <RosterTable.Body>
                {visibleRows.length === 0 ? (
                  <RosterTable.Row>
                    <RosterTable.Cell colSpan={cols}>
                      <span className="evc-la-blank" data-testid="evmon-la-empty-filter">
                        {L.leaderToolFilterEmpty}{' '}
                        {filtered && (
                          <button
                            type="button"
                            className="evc-link-btn"
                            onClick={() => tools.clearFilter()}
                            data-testid="evmon-la-show-all"
                          >
                            {L.leaderAsgShowAll}
                          </button>
                        )}
                      </span>
                    </RosterTable.Cell>
                  </RosterTable.Row>
                ) : (
                  groups.map((g) => {
                    const gRows = visibleRows.filter((r) => r.groupId === g.id);
                    if (gRows.length === 0) return null;
                    const gIds = gRows.map((r) => r.id);
                    const all = toolRows.filter((r) => r.groupId === g.id);
                    return (
                      <Fragment key={g.id}>
                        <RosterTable.GroupRow colSpan={cols} data-testid={`evmon-la-group-${g.id}`}>
                          <span className="evc-la-group">
                            {bulkOn && (
                              <Checkbox
                                inputClassName="dp-check-input"
                                checked={allOn(tools.selected, gIds)}
                                aria-label={fill(L.leaderToolCheckGroup, { name: g.name })}
                                onChange={(e) => tools.setSelectedMany(gIds, e.target.checked)}
                                data-testid={`evmon-la-group-check-${g.id}`}
                              />
                            )}
                            <span className="evc-la-person-name">{g.name}</span>
                            <span className="evc-la-hint">
                              {fill(L.leaderAsgGroupMeta, {
                                n: all.length,
                                w: all.filter((r) => warned.has(r.id)).length,
                              })}
                            </span>
                          </span>
                        </RosterTable.GroupRow>
                        {gRows.map(({ src: r }) => (
                          <RosterTable.Row
                            key={r.evaluateeId}
                            tone={tools.selected.has(r.evaluateeId) ? 'selected' : undefined}
                            data-testid={`evmon-la-row-${r.evaluateeId}`}
                          >
                            {bulkOn && (
                              <RosterTable.Cell>
                                <Checkbox
                                  inputClassName="dp-check-input"
                                  checked={tools.selected.has(r.evaluateeId)}
                                  aria-label={fill(L.leaderToolCheckRow, { name: r.evaluateeName })}
                                  onChange={(e) => tools.setSelectedMany([r.evaluateeId], e.target.checked)}
                                  data-testid={`evmon-la-check-${r.evaluateeId}`}
                                />
                              </RosterTable.Cell>
                            )}
                            <RosterTable.Cell>
                              <span className="evc-la-person">
                                <span className="evc-la-person-name">{r.evaluateeName}</span>
                                {(r.orgName || r.jobPosition || r.jobLevel) && (
                                  <span className="evc-la-hint">
                                    {[r.orgName, r.jobPosition, r.jobLevel].filter(Boolean).join(' · ')}
                                  </span>
                                )}
                              </span>
                            </RosterTable.Cell>
                            {roundList.map((k) => (
                              <RosterTable.Cell key={k}>{renderCell(r, k)}</RosterTable.Cell>
                            ))}
                          </RosterTable.Row>
                        ))}
                      </Fragment>
                    );
                  })
                )}
              </RosterTable.Body>
            </RosterTable>
          )}
        </div>
      )}

      {open && openCell && openActs?.canEdit && (
        <AnchoredLayer
          anchorSelector={`[data-leader-live-cell="${openCell.id}"]`}
          panelRef={panelRef}
          width={260}
          maxHeight={320}
          className="evc-la-pop"
          role="group"
          aria-label={L.livePickSearch}
          data-testid="evmon-la-pop"
        >
          {isLiveCellSkipped(openCell) && <span className="evc-la-hint">{L.liveRestoreHint}</span>}
          <TextInput
            className="evc-input"
            value={pickQuery}
            placeholder={L.livePickSearch}
            aria-label={L.livePickSearch}
            onChange={(e) => setPickQuery(e.target.value)}
            autoFocus
            data-testid="evmon-la-pick-search"
          />
          <div className="evc-la-pop-list">
            {pickList.length === 0 ? (
              <span className="evc-la-hint">{L.livePickEmpty}</span>
            ) : (
              pickList.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  className="evc-la-pop-item"
                  onClick={() => {
                    const row = openRow;
                    const cell = openCell;
                    closePick();
                    onAssign?.(row, cell, p);
                  }}
                  data-testid={`evmon-la-pick-${p.id}`}
                >
                  <span className="evc-la-name">{p.name}</span>
                  {p.org && <span className="evc-la-hint">{p.org}</span>}
                  <RetiringTag label={p.retiringLabel} testId={`evmon-la-pick-retiring-${p.id}`} />
                </button>
              ))
            )}
          </div>
          {openActs.canSkip && (
            <div className="evc-la-pop-actions">
              <button
                type="button"
                className="evc-btn is-ghost"
                onClick={() => {
                  const row = openRow;
                  const cell = openCell;
                  closePick();
                  onSkip?.(row, cell);
                }}
                data-testid="evmon-la-skip"
              >
                {L.liveSkip}
              </button>
            </div>
          )}
        </AnchoredLayer>
      )}
    </section>
  );
}
