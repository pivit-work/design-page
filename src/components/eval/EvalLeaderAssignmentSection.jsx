import { useRef, useState } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';
import RosterTable from '../shared/RosterTable.jsx';
import TextInput from '../shared/TextInput.jsx';
import Checkbox from '../shared/Checkbox.jsx';
import Tooltip from '../shared/Tooltip.jsx';
import Skeleton from '../shared/Skeleton.jsx';
import Chip from '../shared/Chip.jsx';
import Select from '../shared/Select.jsx';
import AnchoredLayer from '../shared/AnchoredLayer.jsx';
import useDismissLayer from '../shared/useDismissLayer.js';
import { SearchGlyph } from '../shared/lineIcons.jsx';
import { AlertIcon, CheckCircleIcon } from './evalIcons.jsx';
import { fill } from './evalTemplateItemModel.js';
import {
  cellKey,
  emptyLeaderRule,
  leaderRuleText,
  rowHasNoChain,
  summarizeLeaderWarnings,
} from './evalLeaderRounds.js';
import { withoutLeavingBefore } from './evalRetiring.js';
import RetiringTag from './RetiringTag.jsx';

/** 로딩 자리 표시 줄 수 — 표 높이를 미리 잡아 레이아웃이 튀지 않게(§5.13.4 「로딩」). */
const SKELETON_ROWS = 5;
/** 표 행 높이(§9-E-1 tbody tr h49). 스켈레톤 높이도 같은 값이다. */
const ROW_H = 49;

/**
 * PW-1594 — 위자드 4단계 ④ 「하향 평가자」 섹션 (정책 screen-eval-cycle-hr.policy.md §5.13.4).
 *
 * 행 = 리뷰 & 조정의 «대상» 명단(같은 사람 · 같은 순서), 열 = 1~N차. 칸은 추천 · 조정됨 · 평가자 없음 ·
 * 건너뜀 넷 중 하나이고, 눌러서 사람을 바꾸거나 건너뛴다. 본인·퇴사자 배정이 있으면 확정이 막힌다.
 *
 * 🔴 **상태는 위자드가 갖는다.** 칸 값은 초안(`draftState.leaderAssignments`)에 실려야 하고, 확정 여부는
 *    6단계 오픈 차단이 읽는다 — 이 섹션 로컬에 두면 위자드가 둘 다 모른다. 이 컴포넌트가 들고 있는 것은
 *    «보기 조건»(경고만 보기 · 이름 검색 · 열린 칸)뿐이다.
 *
 * 새 시각 언어를 만들지 않는다 — 요약 바는 2단계 확정 블록(§9-D-1 선택 요약 바)과 같은 틀, 칸 배지는
 * `.evc-status-badge`, 차수 머리는 `.evc-type-badge`, 표는 공용 `RosterTable` 이다.
 */
export default function EvalLeaderAssignmentSection({
  labels: L,
  rounds,
  /** `[{ id, name, sub }]` — 리뷰 & 조정 «대상» 명단 순서 그대로. */
  rows,
  /** 대상 × 차수 칸(`alignLeaderCells` 로 맞춘 것). */
  cells,
  /** cellKey → 경고 목록. */
  warningsByCell,
  /** 칸 팝오버의 직원 검색 후보 `[{ id, name, org, resigned, lastServingDay?, retiringLabel? }]`. */
  people,
  /** PW-2029 — k차 하향 단계 끝(`YYYY-MM-DDTHH:mm`). 그 전에 떠나는 사람은 그 칸 고르기에서 빠진다. */
  roundDeadline = () => '',
  /** 사람 id → `{ name, org, resigned }`(없으면 null). */
  personOf,
  /** 'loading' | 'error' | 'ready' — 추천 계산 상태. */
  status,
  onRetry,
  /** `{ confirmedAt, confirmedBy }` | null. */
  confirm,
  /** 확정이 풀린 사유(사람이 읽는 문장) — 있으면 요약 바가 「다시 확정 필요」로 바뀐다. */
  reconfirmReason,
  confirming = false,
  onConfirm,
  onAssign,
  onSkip,
  onRevert,
  /** L2 — 최고 차수에 추천 평가자가 있는 대상자가 없다. */
  topRoundEmpty = false,
  /** 확정 시각 표기(`MM/DD HH:MM`). */
  formatStamp = (iso) => iso,
  /* ── PW-2065 · HR §5.13.11 ─────────────────────────────────────────────── */
  /** 최상위 조직 묶음 `[{ id, name }]` — 행의 `groupId` 와 짝. 비면 묶음 머리 줄 없이 종전처럼 그린다. */
  groups = [],
  /** 묶음 id → `{ confirmed, at }`. */
  groupStates = {},
  /** 조직 하나 확정. 없으면 종전 «확정» 버튼 하나(`onConfirm`). */
  onConfirmGroup,
  /** 남은 조직 모두 확정. */
  onConfirmRemaining,
  /** 모든 조직이 확정됐는데 전체 확정(서버)만 남았다 — 「남은 조직 모두 확정」이 그것을 보낸다. */
  pendingFinal = false,
  /** 배정 규칙 목록. */
  rules = [],
  /** 규칙 목록을 바꾼다. 없으면 규칙 칸이 읽기 전용이다(오픈 뒤). */
  onRulesChange,
  /** 평가자 부담 경고 기준(0 = 끔). */
  loadLimit = 0,
  onLoadLimitChange,
  /** 규칙 조건·평가자 값 목록 `{ units: [{ id, label }], levels: [], positions: [], people: [{ id, name, org }] }`. */
  ruleOptions = { units: [], levels: [], positions: [], people: [] },
  /** 조직 단위 id → 이름(없는 조직이면 null). */
  unitLabelOf = () => null,
  /** 조직장이 비어 있는 조직 `[{ id, path, count, climbedName }]`. */
  vacantUnits = [],
  /** 평가자 id → 맡은 칸 수. */
  loadBy = new Map(),
}) {
  const [warnOnly, setWarnOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [openCell, setOpenCell] = useState(null); // { key, evaluateeId, round }
  const [pickQuery, setPickQuery] = useState('');
  const [rulesOpen, setRulesOpen] = useState(false);
  const [ruleDraft, setRuleDraft] = useState(() => emptyLeaderRule(Math.min(2, rounds)));
  const panelRef = useRef(null);
  useDismissLayer(
    () => {
      setOpenCell(null);
      setPickQuery('');
    },
    panelRef,
    openCell ? `[data-leader-cell="${openCell.key}"]` : undefined,
    !!openCell,
  );

  const roundList = Array.from({ length: rounds }, (_, i) => i + 1);
  const cellsByKey = new Map(cells.map((c) => [cellKey(c.evaluateeId, c.round), c]));
  const cellOf = (id, k) => cellsByKey.get(cellKey(id, k)) ?? null;
  const warnOf = (id, k) => warningsByCell.get(cellKey(id, k)) ?? [];
  const rowWarned = (id) => roundList.some((k) => warnOf(id, k).length > 0);

  const summary = summarizeLeaderWarnings(warningsByCell);
  const loading = status === 'loading';
  const failed = status === 'error';
  const q = query.trim().toLowerCase();
  const visibleRows = rows.filter(
    (r) => (!warnOnly || rowWarned(r.id)) && (!q || String(r.name ?? '').toLowerCase().includes(q)),
  );
  const confirmBlocked = summary.blocking > 0;
  const confirmDisabled =
    !onConfirm || confirming || loading || failed || confirmBlocked || !!confirm || rows.length === 0;
  const byName = (by) => (by && typeof by === 'object' ? by.name : by) || '';

  /* PW-2065 — 조직별 확정. 묶음마다 경고·차단 수, 확정 상태. */
  const grouped = groups.length > 0 && typeof onConfirmGroup === 'function';
  const groupKeys = (gid) =>
    new Set(
      rows
        .filter((r) => r.groupId === gid)
        .flatMap((r) => roundList.map((k) => cellKey(r.id, k))),
    );
  const groupSummary = (gid) => summarizeLeaderWarnings(warningsByCell, groupKeys(gid));
  const confirmedGroups = groups.filter((g) => groupStates[g.id]?.confirmed).length;
  const remainingConfirmable = groups.filter(
    (g) => !groupStates[g.id]?.confirmed && groupSummary(g.id).blocking === 0,
  ).length;
  const remainingDisabled =
    confirming ||
    loading ||
    failed ||
    rows.length === 0 ||
    (remainingConfirmable === 0 && !pendingFinal);
  const fullyConfirmed = !!confirm && !reconfirmReason;
  const overloadPeople = loadLimit > 0 ? [...loadBy.values()].filter((n) => n > loadLimit).length : 0;

  /* 규칙 요약 — 조건(빈 축 생략 · 다 비면 «모든 대상자») → 동작. 없어진 조직은 취소선 + «없는 조직»(R7). */
  const ruleRoundMissing = (r) => r.round > rounds;
  const ruleEvaluatorGone = (r) =>
    r.action === 'assign' && !!r.evaluatorId && !!personOf(r.evaluatorId)?.resigned;
  const ruleCondition = (r) => {
    const parts = [];
    if (r.units.length > 0) {
      parts.push(
        <span key="u">
          {L.leaderRuleAxisUnit}{' '}
          {r.units.map((u, i) => {
            const name = unitLabelOf(u);
            return (
              <span key={u}>
                {i > 0 ? '·' : ''}
                {name ?? (
                  <>
                    <s>{u}</s> <span className="evc-la-hint is-warn">{L.leaderRuleUnitMissing}</span>
                  </>
                )}
              </span>
            );
          })}
        </span>,
      );
    }
    if (r.levels.length > 0) parts.push(<span key="l">{`${L.leaderRuleAxisLevel} ${r.levels.join('·')}`}</span>);
    if (r.positions.length > 0)
      parts.push(<span key="p">{`${L.leaderRuleAxisPosition} ${r.positions.join('·')}`}</span>);
    if (parts.length === 0) return L.leaderRuleAll;
    return parts.flatMap((el, i) => (i === 0 ? [el] : [` ${L.leaderRuleAnd} `, el]));
  };
  const ruleAction = (r) =>
    r.action === 'skip'
      ? fill(L.leaderRuleActSkip, { round: r.round })
      : fill(L.leaderRuleActAssign, {
          round: r.round,
          name: personOf(r.evaluatorId)?.name ?? L.leaderAsgNone,
        });
  /** 툴팁용 글 — 요소가 아니라 문장. */
  const ruleTextPlain = (r) =>
    leaderRuleText(L, r, unitLabelOf, (id) => (id ? personOf(id)?.name ?? null : null));
  const moveRule = (i, d) => {
    const next = [...rules];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onRulesChange?.(next);
  };
  const toggleIn = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const draftInvalid = ruleDraft.action === 'assign' && !ruleDraft.evaluatorId;
  const addRule = () => {
    if (draftInvalid) return;
    onRulesChange?.([
      ...rules,
      { ...ruleDraft, evaluatorId: ruleDraft.action === 'assign' ? ruleDraft.evaluatorId : null },
    ]);
    setRuleDraft(emptyLeaderRule(Math.min(ruleDraft.round, rounds)));
  };
  const editable = typeof onRulesChange === 'function';

  const pq = pickQuery.trim().toLowerCase();
  const pickList = withoutLeavingBefore(people, openCell ? roundDeadline(openCell.round) : '').filter(
    (p) =>
      !pq ||
      String(p.name ?? '').toLowerCase().includes(pq) ||
      String(p.org ?? '').toLowerCase().includes(pq),
  );
  const closePick = () => {
    setOpenCell(null);
    setPickQuery('');
  };

  const renderCell = (row, k) => {
    const c = cellOf(row.id, k);
    if (!c) return null;
    const key = cellKey(row.id, k);
    const warns = warnOf(row.id, k);
    const ev = !c.skipped && c.evaluatorId ? personOf(c.evaluatorId) : null;
    const recName = c.recommendedEvaluatorId ? personOf(c.recommendedEvaluatorId)?.name : null;
    const adjusted = c.origin === 'adjusted';
    const rule = c.origin === 'rule' ? rules[c.ruleIndex ?? -1] : null;
    const tip = adjusted
      ? fill(L.leaderAsgAdjustedTip, { name: recName || L.leaderAsgNone })
      : rule
        ? fill(L.leaderAsgRuleTip, { rule: ruleTextPlain(rule) })
        : c.ruleSelf
          ? L.leaderAsgRuleSelfTip
          : undefined;
    const ruleBadge = c.origin === 'rule' && (
      <StatusBadge tone="accent" className="evc-status-badge" data-testid={`evc-la-rule-${key}`}>
        {L.leaderAsgBadgeRule}
      </StatusBadge>
    );
    return (
      <Tooltip content={tip}>
        <button
          type="button"
          className={`evc-la-cell${openCell?.key === key ? ' is-open' : ''}`}
          data-leader-cell={key}
          aria-haspopup="true"
          aria-expanded={openCell?.key === key}
          aria-label={fill(L.leaderAsgCellAria, { name: row.name, round: k })}
          onClick={() => {
            if (openCell?.key === key) closePick();
            else {
              setOpenCell({ key, evaluateeId: row.id, round: k });
              setPickQuery('');
            }
          }}
          data-testid={`evc-la-cell-${key}`}
          data-state={c.skipped ? 'skipped' : ev || c.evaluatorId ? c.origin : 'empty'}
        >
          {c.skipped ? (
            <span className="evc-la-name-row">
              <span className="evc-la-muted">{L.leaderAsgSkipped}</span>
              {ruleBadge}
            </span>
          ) : !c.evaluatorId ? (
            <>
              <span className="evc-la-empty">
                <AlertIcon size={12} /> {L.leaderAsgNoEvaluator}
              </span>
              <span className="evc-la-hint">{L.leaderAsgNoEvaluatorHint}</span>
            </>
          ) : (
            <span className="evc-la-name-row">
              <span className={`evc-la-name${ev?.resigned ? ' is-resigned' : ''}`}>
                {ev?.name ?? c.evaluatorName ?? c.evaluatorId}
              </span>
              {ruleBadge || (
                <StatusBadge
                  className={`evc-status-badge ${adjusted ? 'tone-info' : 'tone-neutral'}`}
                >
                  {adjusted ? L.leaderAsgBadgeAdjusted : L.leaderAsgBadgeRecommended}
                </StatusBadge>
              )}
            </span>
          )}
          {warns
            .filter((w) => w !== 'no_evaluator')
            .map((w) => (
              <span
                key={w}
                className={`evc-la-warn${w === 'duplicate' || w === 'overload' ? '' : ' is-block'}`}
                data-testid={`evc-la-warn-${key}-${w}`}
              >
                {w === 'self'
                  ? L.leaderAsgWarnSelf
                  : w === 'resigned'
                    ? L.leaderAsgWarnResigned
                    : w === 'leaving'
                      ? L.leaderAsgWarnLeaving
                      : w === 'overload'
                        ? fill(L.leaderAsgWarnOverload, {
                            count: loadBy.get(c.evaluatorId) ?? 0,
                            limit: loadLimit,
                          })
                        : L.leaderAsgWarnDuplicate}
              </span>
            ))}
        </button>
      </Tooltip>
    );
  };

  const openCellObj = openCell ? cellOf(openCell.evaluateeId, openCell.round) : null;

  return (
    <div className="evc-la" data-testid="evc-leader-assign">
      <div className="evc-la-head">
        <span className="evc-field-label">{L.leaderAsgTitle}</span>
        <p className="evc-wiz-hint">{grouped ? L.leaderAsgSubGrouped : L.leaderAsgSub}</p>
        {grouped && editable && (
          <span className="evc-la-hint" data-testid="evc-la-order">
            {L.leaderAsgOrder}
          </span>
        )}
      </div>

      {/* PW-2065 · §5.13.11 ② — 조직장이 비어 있는 조직. 막지 않는 안내라 디자이너의 연회색 안내 띠. */}
      {editable && vacantUnits.length > 0 && (
        <div className="evx-notice evc-la-vacant" data-testid="evc-la-vacant">
          <span>
            {fill(L.leaderAsgVacantHead, { count: vacantUnits.length })}
            {vacantUnits.map((v) => (
              <span key={v.id} className="evc-la-vacant-line" data-testid={`evc-la-vacant-${v.id}`}>
                {fill(L.leaderAsgVacantLine, { path: v.path, count: v.count, name: v.climbedName })}
              </span>
            ))}
            <span className="evc-la-hint">{L.leaderAsgVacantFoot}</span>
          </span>
        </div>
      )}

      {/* PW-2065 · §5.13.11 ①③ — 배정 규칙 · 부담 경고 기준(접기). 오픈 뒤에는 목록만 읽는다. */}
      {(editable || rules.length > 0) && (
        <div className="evc-la-bar evc-la-rules" data-testid="evc-la-rules">
          <button
            type="button"
            className="evc-la-rules-head"
            aria-expanded={rulesOpen}
            onClick={() => setRulesOpen((o) => !o)}
            data-testid="evc-la-rules-toggle"
          >
            <span className="evc-la-bar-count">
              {fill(L.leaderRulesHead, { count: rules.length })}
            </span>
            <span className="evc-la-bar-detail">
              {loadLimit > 0 ? fill(L.leaderRulesLoadOn, { limit: loadLimit }) : L.leaderRulesLoadOff}
            </span>
            <span className="evc-la-hint">{rulesOpen ? L.leaderRulesCollapse : L.leaderRulesExpand}</span>
          </button>
          {rulesOpen && (
            <div className="evc-la-rules-body">
              {editable && <span className="evc-la-hint">{L.leaderRulesGuide}</span>}
              {rules.length === 0 ? (
                <span className="evc-la-hint" data-testid="evc-la-rules-empty">
                  {L.leaderRulesEmpty}
                </span>
              ) : (
                rules.map((r, i) => (
                  <div
                    key={i}
                    className={`evc-la-rule${ruleRoundMissing(r) ? ' is-off' : ''}`}
                    data-testid={`evc-la-rule-row-${i}`}
                  >
                    <span className="evc-la-hint">{i + 1}</span>
                    <span className="evc-la-rule-text">
                      {ruleCondition(r)} → {ruleAction(r)}
                      {ruleRoundMissing(r) && (
                        <span className="evc-la-hint" data-testid={`evc-la-rule-off-${i}`}>
                          {' '}
                          {fill(L.leaderRuleNoRound, { round: r.round })}
                        </span>
                      )}
                      {ruleEvaluatorGone(r) && (
                        <span className="evc-la-warn is-block" data-testid={`evc-la-rule-gone-${i}`}>
                          {L.leaderRuleResigned}
                        </span>
                      )}
                    </span>
                    {editable && (
                      <>
                        <button
                          type="button"
                          className="evc-btn is-ghost"
                          disabled={i === 0}
                          aria-label={L.leaderRuleUp}
                          onClick={() => moveRule(i, -1)}
                          data-testid={`evc-la-rule-up-${i}`}
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          className="evc-btn is-ghost"
                          disabled={i === rules.length - 1}
                          aria-label={L.leaderRuleDown}
                          onClick={() => moveRule(i, 1)}
                          data-testid={`evc-la-rule-down-${i}`}
                        >
                          ▼
                        </button>
                        <button
                          type="button"
                          className="evc-btn is-ghost"
                          onClick={() => onRulesChange(rules.filter((_, j) => j !== i))}
                          data-testid={`evc-la-rule-del-${i}`}
                        >
                          {L.leaderRuleDelete}
                        </button>
                      </>
                    )}
                  </div>
                ))
              )}
              {editable && (
                <div className="evc-la-rule-form" data-testid="evc-la-rule-form">
                  <span className="evc-la-bar-detail">{L.leaderRuleAddHead}</span>
                  {[
                    ['units', L.leaderRuleAxisUnit, ruleOptions.units.map((u) => [u.id, u.label])],
                    ['levels', L.leaderRuleAxisLevel, ruleOptions.levels.map((v) => [v, v])],
                    ['positions', L.leaderRuleAxisPosition, ruleOptions.positions.map((v) => [v, v])],
                  ].map(([axis, label, opts]) =>
                    opts.length === 0 ? null : (
                      <div key={axis} className="evc-la-rule-axis">
                        <span className="evc-la-hint">{label}</span>
                        {opts.map(([v, text]) => (
                          <Chip
                            key={v}
                            selected={ruleDraft[axis].includes(v)}
                            onClick={() => setRuleDraft((d) => ({ ...d, [axis]: toggleIn(d[axis], v) }))}
                            data-testid={`evc-la-rule-chip-${axis}-${v}`}
                          >
                            {text}
                          </Chip>
                        ))}
                      </div>
                    ),
                  )}
                  <div className="evc-la-rule-axis">
                    <span className="evc-la-hint">{L.leaderRuleThen}</span>
                    <Select
                      value={String(ruleDraft.round)}
                      options={roundList.map((k) => ({
                        value: String(k),
                        label: fill(L.leaderAsgColRound, { round: k }),
                      }))}
                      aria-label={L.leaderRuleRound}
                      onChange={(e) => setRuleDraft((d) => ({ ...d, round: Number(e.target.value) }))}
                      data-testid="evc-la-rule-round"
                    />
                    <Select
                      value={ruleDraft.action}
                      options={[
                        { value: 'skip', label: L.leaderRuleActionSkip },
                        { value: 'assign', label: L.leaderRuleActionAssign },
                      ]}
                      aria-label={L.leaderRuleAction}
                      onChange={(e) =>
                        setRuleDraft((d) => ({ ...d, action: e.target.value, evaluatorId: null }))
                      }
                      data-testid="evc-la-rule-action"
                    />
                    {ruleDraft.action === 'assign' && (
                      <Select
                          searchable
                        value={ruleDraft.evaluatorId ?? ''}
                        placeholder={L.leaderRulePickPerson}
                        options={ruleOptions.people.map((p) => ({
                          value: p.id,
                          label: p.org ? `${p.name} · ${p.org}` : p.name,
                        }))}
                        aria-label={L.leaderRulePickPerson}
                        onChange={(e) => setRuleDraft((d) => ({ ...d, evaluatorId: e.target.value || null }))}
                        data-testid="evc-la-rule-person"
                      />
                    )}
                    <button
                      type="button"
                      className="evc-btn is-ghost"
                      disabled={draftInvalid}
                      onClick={addRule}
                      data-testid="evc-la-rule-add"
                    >
                      {L.leaderRuleAdd}
                    </button>
                  </div>
                </div>
              )}
              <div className="evc-la-rule-axis" data-testid="evc-la-load">
                <span className="evc-la-hint">{L.leaderLoadBefore}</span>
                <TextInput
                  className="evc-input evc-la-load-input"
                  type="number"
                  min={0}
                  value={String(loadLimit)}
                  disabled={!onLoadLimitChange}
                  aria-label={L.leaderLoadAria}
                  onChange={(e) => onLoadLimitChange?.(Math.max(0, Math.trunc(Number(e.target.value) || 0)))}
                  data-testid="evc-la-load-input"
                />
                <span className="evc-la-hint">{L.leaderLoadAfter}</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div
        className={`evc-la-bar${fullyConfirmed || !editable ? '' : ' is-warn'}`}
        data-testid="evc-la-bar"
      >
        <span className="evc-la-bar-count" data-testid="evc-la-summary">
          {fill(L.leaderAsgSummary, { n: rows.length, rounds, w: summary.total })}
        </span>
        <span className="evc-la-bar-detail">
          {fill(L.leaderAsgSummaryDetail, {
            a: summary.no_evaluator,
            b: summary.self,
            c: summary.duplicate,
            d: summary.resigned,
            e: summary.leaving,
            f: overloadPeople,
          })}
        </span>
        <Checkbox
          className="evc-la-bar-toggle"
          inputClassName="dp-check-input"
          checked={warnOnly}
          onChange={(e) => setWarnOnly(e.target.checked)}
          label={L.leaderAsgWarnOnly}
          data-testid="evc-la-warn-only"
        />
        <span className="evc-review-search evc-la-search">
          <span className="evc-review-search-icon">
            <SearchGlyph size={14} />
          </span>
          <TextInput
            className="evc-input"
            value={query}
            placeholder={L.leaderAsgSearch}
            aria-label={L.leaderAsgSearch}
            onChange={(e) => setQuery(e.target.value)}
            data-testid="evc-la-search"
          />
        </span>
        {grouped ? (
          <span className="evc-la-bar-right">
            {fullyConfirmed ? (
              <span className="evc-la-state is-done" data-testid="evc-la-state">
                <CheckCircleIcon size={13} />{' '}
                {byName(confirm.confirmedBy)
                  ? fill(L.leaderAsgConfirmedAll, {
                      at: formatStamp(confirm.confirmedAt),
                      by: byName(confirm.confirmedBy),
                    })
                  : fill(L.leaderAsgConfirmedAllNoBy, { at: formatStamp(confirm.confirmedAt) })}
              </span>
            ) : (
              <span className="evc-la-state is-warn" data-testid="evc-la-state">
                {fill(L.leaderAsgGroupProgress, { a: confirmedGroups, b: groups.length })}
                {reconfirmReason ? ` · ${L.leaderAsgReconfirm} — ${reconfirmReason}` : ''}
              </span>
            )}
            <Tooltip
              content={
                confirmBlocked && remainingConfirmable === 0 && !fullyConfirmed
                  ? fill(L.leaderAsgConfirmBlocked, { count: summary.blocking })
                  : undefined
              }
            >
              <button
                type="button"
                className="evc-btn is-primary"
                disabled={remainingDisabled}
                onClick={() => onConfirmRemaining?.()}
                data-testid="evc-la-confirm"
              >
                {confirming ? L.leaderAsgConfirming : L.leaderAsgConfirmRemaining}
              </button>
            </Tooltip>
          </span>
        ) : (
        <span className="evc-la-bar-right">
          {confirm && !reconfirmReason ? (
            <span className="evc-la-state is-done" data-testid="evc-la-state">
              <CheckCircleIcon size={13} />{' '}
              {/* 확정한 사람 이름을 못 받았으면(사이클 응답이 id 만 줄 때) 이름 자리를 비우지 않고 뺀다. */}
              {byName(confirm.confirmedBy)
                ? fill(L.leaderAsgConfirmed, {
                    at: formatStamp(confirm.confirmedAt),
                    by: byName(confirm.confirmedBy),
                  })
                : fill(L.leaderAsgConfirmedNoBy, { at: formatStamp(confirm.confirmedAt) })}
            </span>
          ) : (
            <span className="evc-la-state is-warn" data-testid="evc-la-state">
              {reconfirmReason ? `${L.leaderAsgReconfirm} — ${reconfirmReason}` : L.leaderAsgUnconfirmed}
            </span>
          )}
          <Tooltip
            content={
              confirmBlocked ? fill(L.leaderAsgConfirmBlocked, { count: summary.blocking }) : undefined
            }
          >
            <button
              type="button"
              className="evc-btn is-primary"
              disabled={confirmDisabled}
              onClick={() => onConfirm?.()}
              data-testid="evc-la-confirm"
            >
              {confirming ? L.leaderAsgConfirming : L.leaderAsgConfirm}
            </button>
          </Tooltip>
        </span>
        )}
      </div>

      {failed && (
        <p className="evc-wiz-warn evc-la-error" role="alert" data-testid="evc-la-error">
          {L.leaderAsgLoadFailed}
          {onRetry && (
            <button
              type="button"
              className="evc-link-btn"
              onClick={() => onRetry()}
              data-testid="evc-la-retry"
            >
              {L.leaderAsgRetry}
            </button>
          )}
        </p>
      )}
      {topRoundEmpty && !loading && (
        <p className="evx-notice is-warn" data-testid="evc-la-top-empty">
          {fill(L.leaderAsgTopRoundEmpty, { round: rounds })}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="evc-la-blank" data-testid="evc-la-empty-targets">
          {L.leaderAsgEmptyTargets}
        </p>
      ) : loading && cells.every((c) => !c.computed && c.origin !== 'adjusted') ? (
        <div className="evc-la-loading-rows" data-testid="evc-la-loading">
          {Array.from({ length: SKELETON_ROWS }, (_, i) => (
            <Skeleton key={i} height={ROW_H - 8} />
          ))}
        </div>
      ) : (
        <RosterTable scroll="x" framed tableClassName="evc-la-table" testId="evc-la-table">
          <RosterTable.Head>
            <RosterTable.HeadCell width={200}>{L.leaderAsgColTarget}</RosterTable.HeadCell>
            {roundList.map((k) => (
              <RosterTable.HeadCell key={k}>
                <StatusBadge className="evc-type-badge">{fill(L.leaderAsgColRound, { round: k })}</StatusBadge>
              </RosterTable.HeadCell>
            ))}
          </RosterTable.Head>
          <RosterTable.Body>
            {visibleRows.length === 0 ? (
              <RosterTable.Row>
                <RosterTable.Cell colSpan={rounds + 1}>
                  <span className="evc-la-blank" data-testid="evc-la-empty-warn">
                    {L.leaderAsgEmptyWarn}{' '}
                    <button
                      type="button"
                      className="evc-link-btn"
                      onClick={() => {
                        setWarnOnly(false);
                        setQuery('');
                      }}
                      data-testid="evc-la-show-all"
                    >
                      {L.leaderAsgShowAll}
                    </button>
                  </span>
                </RosterTable.Cell>
              </RosterTable.Row>
            ) : (
              (grouped
                ? groups.flatMap((g) => {
                    const gRows = visibleRows.filter((r) => r.groupId === g.id);
                    return gRows.length === 0 ? [] : [{ group: g, count: rows.filter((r) => r.groupId === g.id).length }, ...gRows];
                  })
                : visibleRows
              ).map((r) => {
                if (r.group) {
                  const g = r.group;
                  const gs = groupSummary(g.id);
                  const st = groupStates[g.id] ?? {};
                  return (
                    <RosterTable.GroupRow key={`g:${g.id}`} colSpan={rounds + 1} data-testid={`evc-la-group-${g.id}`}>
                      <span className="evc-la-group">
                        <span className="evc-la-person-name">{g.name}</span>
                        <span className="evc-la-hint">
                          {fill(L.leaderAsgGroupMeta, { n: r.count, w: gs.total })}
                        </span>
                        {editable && (
                          <span className="evc-la-bar-right">
                            {st.confirmed ? (
                              <span className="evc-la-state is-done" data-testid={`evc-la-group-done-${g.id}`}>
                                <CheckCircleIcon size={13} />{' '}
                                {fill(L.leaderAsgGroupConfirmed, { at: formatStamp(st.at) })}
                              </span>
                            ) : (
                              <Tooltip
                                content={
                                  gs.blocking > 0
                                    ? fill(L.leaderAsgConfirmBlocked, { count: gs.blocking })
                                    : undefined
                                }
                              >
                                <button
                                  type="button"
                                  className="evc-btn is-ghost"
                                  disabled={gs.blocking > 0 || confirming || loading || failed}
                                  onClick={() => onConfirmGroup(g.id)}
                                  data-testid={`evc-la-group-confirm-${g.id}`}
                                >
                                  {L.leaderAsgGroupConfirm}
                                </button>
                              </Tooltip>
                            )}
                          </span>
                        )}
                      </span>
                    </RosterTable.GroupRow>
                  );
                }
                const rowCells = roundList.map((k) => cellOf(r.id, k)).filter(Boolean);
                const noChain = rowHasNoChain(rowCells) && rowCells.every((c) => c.origin !== 'adjusted');
                return (
                  <RosterTable.Row key={r.id} data-testid={`evc-la-row-${r.id}`}>
                    <RosterTable.Cell>
                      <span className="evc-la-person">
                        <span className="evc-la-person-name">{r.name}</span>
                        {r.sub && <span className="evc-la-hint">{r.sub}</span>}
                        {noChain && (
                          <span className="evc-la-hint is-warn" data-testid={`evc-la-nochain-${r.id}`}>
                            {L.leaderAsgNoChainRow}
                          </span>
                        )}
                      </span>
                    </RosterTable.Cell>
                    {roundList.map((k) => (
                      <RosterTable.Cell key={k}>{renderCell(r, k)}</RosterTable.Cell>
                    ))}
                  </RosterTable.Row>
                );
              })
            )}
          </RosterTable.Body>
        </RosterTable>
      )}

      {openCell && openCellObj && (
        <AnchoredLayer
          anchorSelector={`[data-leader-cell="${openCell.key}"]`}
          panelRef={panelRef}
          width={260}
          maxHeight={320}
          className="evc-la-pop"
          role="group"
          aria-label={L.leaderAsgPickSearch}
          data-testid="evc-la-pop"
        >
          <TextInput
            className="evc-input"
            value={pickQuery}
            placeholder={L.leaderAsgPickSearch}
            aria-label={L.leaderAsgPickSearch}
            onChange={(e) => setPickQuery(e.target.value)}
            autoFocus
            data-testid="evc-la-pick-search"
          />
          <div className="evc-la-pop-list">
            {pickList.length === 0 ? (
              <span className="evc-la-hint">{L.leaderAsgPickEmpty}</span>
            ) : (
              pickList.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  className="evc-la-pop-item"
                  onClick={() => {
                    onAssign?.(openCell.evaluateeId, openCell.round, p.id);
                    closePick();
                  }}
                  data-testid={`evc-la-pick-${p.id}`}
                >
                  <span className={p.resigned ? 'evc-la-name is-resigned' : 'evc-la-name'}>{p.name}</span>
                  {p.org && <span className="evc-la-hint">{p.org}</span>}
                  {loadLimit > 0 && (loadBy.get(p.id) ?? 0) >= loadLimit && (
                    <span className="evc-la-hint is-warn" data-testid={`evc-la-pick-load-${p.id}`}>
                      {fill(L.leaderAsgPickLoad, { count: loadBy.get(p.id) })}
                    </span>
                  )}
                  {p.resigned && (
                    <StatusBadge className="evc-status-badge tone-error">
                      {L.leaderAsgResignedTag}
                    </StatusBadge>
                  )}
                  {!p.resigned && (
                    <RetiringTag label={p.retiringLabel} testId={`evc-la-pick-retiring-${p.id}`} />
                  )}
                </button>
              ))
            )}
          </div>
          <div className="evc-la-pop-actions">
            <button
              type="button"
              className="evc-btn is-ghost"
              disabled={openCellObj.skipped}
              onClick={() => {
                onSkip?.(openCell.evaluateeId, openCell.round);
                closePick();
              }}
              data-testid="evc-la-skip"
            >
              {L.leaderAsgSkip}
            </button>
            {openCellObj.origin === 'adjusted' && (
              <button
                type="button"
                className="evc-btn is-ghost"
                onClick={() => {
                  onRevert?.(openCell.evaluateeId, openCell.round);
                  closePick();
                }}
                data-testid="evc-la-revert"
              >
                {openCellObj.ruleCell ? L.leaderAsgRevertRule : L.leaderAsgRevert}
              </button>
            )}
          </div>
        </AnchoredLayer>
      )}
    </div>
  );
}
