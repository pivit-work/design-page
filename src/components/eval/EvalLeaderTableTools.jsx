import { Fragment, useRef, useState } from "react";
import StatusBadge from "../shared/StatusBadge.jsx";
import RosterTable from "../shared/RosterTable.jsx";
import TextInput from "../shared/TextInput.jsx";
import Checkbox from "../shared/Checkbox.jsx";
import Select from "../shared/Select.jsx";
import SegmentedControl from "../shared/SegmentedControl.jsx";
import AnchoredLayer from "../shared/AnchoredLayer.jsx";
import useDismissLayer from "../shared/useDismissLayer.js";
import { CheckGlyph, ChevronDownGlyph, SearchGlyph } from "../shared/lineIcons.jsx";
import { AlertIcon, ChevronDownIcon, ChevronUpIcon } from "./evalIcons.jsx";
import { fill } from "./evalTemplateItemModel.js";
import { cellKey } from "./evalLeaderRounds.js";
import RetiringTag from "./RetiringTag.jsx";
import {
  LEADER_TOOL_LABELS,
  bulkResultText,
  LEADER_LEVEL_EMPTY,
  LEADER_SORT_NAME,
  LEADER_SORT_WARN,
  LEADER_STATUS_FILTERS,
} from "./evalLeaderTable.js";

/**
 * PW-2066 — 하향 평가자 표 다루기 도구(HR §5.13.10). 4단계 섹션과 진행 현황 블록이 같이 쓴다.
 *
 * 새 시각 언어를 만들지 않는다 — 거르기 칸은 공용 입력 칸 + `SearchSelect` 목록(`LeaderFilterSelect`), 보기 전환은 공용
 * `SegmentedControl`, 일괄 바는 같은 섹션 요약 바 `.evc-la-bar`(info 틴트), 사람 고르기는 칸 팝오버 `.evc-la-pop`,
 * 평가자 기준 표는 공용 `RosterTable` 이다.
 */


/** 이름 검색 칸 — 대상자 기준이면 대상자 이름, 평가자 기준이면 평가자 이름을 찾는다. */
export function LeaderSearch({ L, tools, searchLabel, testPrefix }) {
  const T = { ...LEADER_TOOL_LABELS, ...L };
  const target = tools.view === "target";
  return (
    <span className="evc-review-search evc-la-search">
      <span className="evc-review-search-icon">
        <SearchGlyph size={14} />
      </span>
      <TextInput
        className="evc-input"
        value={tools.query}
        placeholder={target ? searchLabel : T.leaderToolSearchEvaluator}
        aria-label={target ? searchLabel : T.leaderToolSearchEvaluator}
        onChange={(e) => tools.setQuery(e.target.value)}
        data-testid={`${testPrefix}-search`}
      />
    </span>
  );
}

/**
 * 조직·직급·상태 거르기 칸 하나 — 닫힌 칸은 옆 검색칸·정렬 칸과 같은 공용 입력 칸 모양, 펼친 목록은 공용
 * `SearchSelect` 목록(`.dp-search-select-menu/-item/-check`) 그대로다. 여럿 고르는 동작은 디자이너가 그린 타임라인
 * 「보기」 필터 목록(라벨 + 선택 체크, 눌러도 닫히지 않는다)을 따른다. 고른 것이 없으면 축 이름, 하나면 그 값,
 * 여럿이면 «축 이름 N». 예전에는 축마다 칩 줄을 깔아 조직이 많으면 칩이 몇 줄씩 쌓였다(2026-10-21 커트).
 */
export function LeaderFilterSelect({ axis, label, options, selected, onToggle, testPrefix }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const close = () => setOpen(false);
  useDismissLayer(close, panelRef, `[data-leader-filter="${testPrefix}-${axis}"]`, open);
  const picked = options.filter(([v]) => selected.includes(v));
  const text = picked.length === 0 ? label : picked.length === 1 ? picked[0][1] : `${label} ${picked.length}`;
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`evc-input dp-search-select-trigger evc-la-filter${picked.length > 0 ? " is-active" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        data-leader-filter={`${testPrefix}-${axis}`}
        onClick={() => setOpen((o) => !o)}
        data-testid={`${testPrefix}-filter-${axis}`}
      >
        <span className="dp-search-select-value">{text}</span>
        <span className="dp-search-select-chevron" aria-hidden="true">
          <ChevronDownGlyph size={14} />
        </span>
      </button>
      {open && (
        <AnchoredLayer
          anchorRef={triggerRef}
          panelRef={panelRef}
          minWidth={200}
          maxHeight={320}
          className="dp-search-select-menu"
          data-testid={`${testPrefix}-filter-${axis}-menu`}
        >
          <div role="listbox" aria-multiselectable="true" aria-label={label} className="dp-search-select-list">
            {options.map(([v, optText]) => {
              const on = selected.includes(v);
              return (
                <button
                  key={v || "__empty"}
                  type="button"
                  role="option"
                  aria-selected={on}
                  className={`dp-search-select-item${on ? " is-selected" : ""}`}
                  onClick={() => onToggle(v)}
                  data-testid={`${testPrefix}-chip-${axis}-${v || "empty"}`}
                >
                  <span className="dp-search-select-item-label">{optText}</span>
                  {on && (
                    <span className="dp-search-select-item-check">
                      <CheckGlyph size={15} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </AnchoredLayer>
      )}
    </>
  );
}

/**
 * 도구 줄 — 보기 전환 · 조직/직급/상태 거르기 · 이름 검색 · 정렬(대상자 기준만)을 **한 줄**에 둔다.
 * `search={false}` 면 검색 칸을 빼고 그린다 — 4단계는 검색을 요약 줄 둘째 줄에 둔다(PW-2113).
 */
export function LeaderToolbar({ L, tools, groups, levels, searchLabel, testPrefix, search = true }) {
  const T = { ...LEADER_TOOL_LABELS, ...L };
  const target = tools.view === "target";
  const axes = target
    ? [
        ["groups", T.leaderToolOrg, groups.map((g) => [g.id, g.name])],
        [
          "levels",
          T.leaderToolLevel,
          levels.map((v) => [v, v === LEADER_LEVEL_EMPTY ? T.leaderToolLevelEmpty : v]),
        ],
        [
          "statuses",
          T.leaderToolStatus,
          LEADER_STATUS_FILTERS.map((s) => [s, T[`leaderToolStatus_${s}`]]),
        ],
      ]
    : [];
  return (
    <div className="evc-la-tools" data-testid={`${testPrefix}-tools`}>
      <SegmentedControl
        ariaLabel={T.leaderToolViewAria}
        value={tools.view}
        onChange={tools.setView}
        items={[
          { value: "target", label: T.leaderToolViewTarget, testId: `${testPrefix}-view-target` },
          {
            value: "evaluator",
            label: T.leaderToolViewEvaluator,
            testId: `${testPrefix}-view-evaluator`,
          },
        ]}
      />
      {axes.map(([axis, label, opts]) =>
        opts.length === 0 ? null : (
          <LeaderFilterSelect
            key={axis}
            axis={axis}
            label={label}
            options={opts}
            selected={tools.filter[axis]}
            onToggle={(v) => tools.toggleFilter(axis, v)}
            testPrefix={testPrefix}
          />
        ),
      )}
      <span className="evc-la-bar-right">
        {search && <LeaderSearch L={L} tools={tools} searchLabel={searchLabel} testPrefix={testPrefix} />}
        {target && (
          <span className="evc-la-sort-pick">
            <Select
              className="evc-input"
              value={tools.sort}
              aria-label={T.leaderToolSortAria}
              options={[
                { value: LEADER_SORT_WARN, label: T.leaderToolSortWarn },
                { value: LEADER_SORT_NAME, label: T.leaderToolSortName },
              ]}
              onChange={(e) => tools.setSort(e.target.value)}
              data-testid={`${testPrefix}-sort`}
            />
          </span>
        )}
      </span>
    </div>
  );
}

/**
 * 일괄 바 — 선택이 있을 때만. 대상자 기준은 차수 하나를 고르고, 평가자 기준은 칸마다 차수가 정해져 있다.
 * `onApply(action, personId)` — 'assign' | 'skip' | 'revert'.
 */
export function LeaderBulkBar({
  L,
  tools,
  rounds,
  count,
  people,
  loadBy = new Map(),
  busy = false,
  onApply,
  testPrefix,
}) {
  const T = { ...LEADER_TOOL_LABELS, ...L };
  const [picking, setPicking] = useState(false);
  const [pickQuery, setPickQuery] = useState("");
  const panelRef = useRef(null);
  const anchor = `[data-leader-bulk-assign="${testPrefix}"]`;
  const close = () => {
    setPicking(false);
    setPickQuery("");
  };
  useDismissLayer(close, panelRef, anchor, picking);
  const target = tools.view === "target";
  const pq = pickQuery.trim().toLowerCase();
  const pickList = (people ?? []).filter(
    (p) =>
      !p.resigned &&
      (!pq ||
        String(p.name ?? "").toLowerCase().includes(pq) ||
        String(p.org ?? "").toLowerCase().includes(pq)),
  );
  return (
    <>
      {count > 0 && (
        <div className="evc-la-bar is-info" data-testid={`${testPrefix}-bulk`}>
          <span className="evc-la-bar-count" data-testid={`${testPrefix}-bulk-count`}>
            {fill(target ? T.leaderBulkPeople : T.leaderBulkCells, { n: count })}
          </span>
          {target && (
            <span className="evc-la-rule-pick">
              <Select
                value={String(tools.bulkRound)}
                aria-label={T.leaderBulkRoundAria}
                options={Array.from({ length: rounds }, (_, i) => ({
                  value: String(i + 1),
                  label: fill(T.leaderEvCellRound, { round: i + 1 }),
                }))}
                onChange={(e) => tools.setBulkRound(Number(e.target.value))}
                data-testid={`${testPrefix}-bulk-round`}
              />
            </span>
          )}
          <button
            type="button"
            className="evc-btn is-ghost"
            disabled={busy}
            aria-haspopup="true"
            aria-expanded={picking}
            data-leader-bulk-assign={testPrefix}
            onClick={() => (picking ? close() : setPicking(true))}
            data-testid={`${testPrefix}-bulk-assign`}
          >
            {T.leaderBulkAssign}
          </button>
          <button
            type="button"
            className="evc-btn is-ghost"
            disabled={busy}
            onClick={() => onApply("skip")}
            data-testid={`${testPrefix}-bulk-skip`}
          >
            {T.leaderBulkSkip}
          </button>
          <button
            type="button"
            className="evc-btn is-ghost"
            disabled={busy}
            onClick={() => onApply("revert")}
            data-testid={`${testPrefix}-bulk-revert`}
          >
            {T.leaderBulkRevert}
          </button>
          <span className="evc-la-bar-right">
            <button
              type="button"
              className="evc-btn is-ghost"
              onClick={() => {
                close();
                tools.clearSelected();
              }}
              data-testid={`${testPrefix}-bulk-clear`}
            >
              {T.leaderBulkClear}
            </button>
          </span>
        </div>
      )}
      {count > 0 && picking && (
        <AnchoredLayer
          anchorSelector={anchor}
          panelRef={panelRef}
          width={260}
          maxHeight={320}
          className="evc-la-pop"
          role="group"
          aria-label={T.leaderAsgPickSearch ?? T.livePickSearch}
          data-testid={`${testPrefix}-bulk-pop`}
        >
          <TextInput
            className="evc-input"
            value={pickQuery}
            placeholder={T.leaderAsgPickSearch ?? T.livePickSearch}
            aria-label={T.leaderAsgPickSearch ?? T.livePickSearch}
            onChange={(e) => setPickQuery(e.target.value)}
            autoFocus
            data-testid={`${testPrefix}-bulk-pick-search`}
          />
          <div className="evc-la-pop-list">
            {pickList.length === 0 ? (
              <span className="evc-la-hint">{T.leaderAsgPickEmpty ?? T.livePickEmpty}</span>
            ) : (
              pickList.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  className="evc-la-pop-item"
                  onClick={() => {
                    close();
                    onApply("assign", p.id);
                  }}
                  data-testid={`${testPrefix}-bulk-pick-${p.id}`}
                >
                  <span className="evc-la-name">{p.name}</span>
                  {p.org && <span className="evc-la-hint">{p.org}</span>}
                  <span className="evc-la-hint">
                    {fill(T.leaderBulkPickLoad, { count: loadBy.get(p.id) ?? 0 })}
                  </span>
                  <RetiringTag label={p.retiringLabel} testId={`${testPrefix}-bulk-pick-retiring-${p.id}`} />
                </button>
              ))
            )}
          </div>
        </AnchoredLayer>
      )}
      {tools.result && (
        <span className="evc-la-bar-detail" role="status" data-testid={`${testPrefix}-bulk-result`}>
          {bulkResultText(T, tools.result)}
        </span>
      )}
    </>
  );
}

/**
 * 평가자 기준 보기(T-4) — 행 = 평가자, 차수별 담당 칸 수 · 합계(많은 순). 행을 누르면 담당 칸 목록이 펼쳐지고
 * 칸마다 체크해 같은 일괄 바로 옮긴다. `loadRows` = `evaluatorLoadRows` 결과(검색은 부르는 쪽이 거른다).
 * `cellLabel(cell)` = 펼친 칸 한 줄의 대상자 이름 · 배지.
 */
export function LeaderEvaluatorView({
  L,
  tools,
  rounds,
  loadRows,
  personOf,
  loadLimit = 0,
  cellLabel,
  canSelect = () => true,
  testPrefix,
}) {
  const T = { ...LEADER_TOOL_LABELS, ...L };
  const roundList = Array.from({ length: rounds }, (_, i) => i + 1);
  const cols = rounds + 3;
  if (loadRows.length === 0) {
    return (
      <p className="evc-la-blank" data-testid={`${testPrefix}-ev-empty`}>
        {T.leaderEvEmpty}
      </p>
    );
  }
  return (
    <RosterTable scroll="x" framed tableClassName="evc-la-table" testId={`${testPrefix}-ev-table`}>
      <RosterTable.Head>
        <RosterTable.HeadCell width={200}>{T.leaderEvColEvaluator}</RosterTable.HeadCell>
        {roundList.map((k) => (
          <RosterTable.HeadCell key={k}>
            <StatusBadge className="evc-type-badge">
              {fill(T.leaderEvCellRound, { round: k })}
            </StatusBadge>
          </RosterTable.HeadCell>
        ))}
        <RosterTable.HeadCell>{T.leaderEvColTotal}</RosterTable.HeadCell>
        <RosterTable.HeadCell>{T.leaderEvColState}</RosterTable.HeadCell>
      </RosterTable.Head>
      <RosterTable.Body>
        {loadRows.map((r) => {
          const p = personOf(r.evaluatorId);
          const name = p?.name ?? r.evaluatorId;
          const open = tools.expanded.has(r.evaluatorId);
          const over = loadLimit > 0 && r.total > loadLimit;
          return (
            <Fragment key={r.evaluatorId}>
              <RosterTable.Row
                onClick={() => tools.toggleExpanded(r.evaluatorId)}
                aria-expanded={open}
                aria-label={fill(T.leaderEvExpand, { name })}
                data-testid={`${testPrefix}-ev-row-${r.evaluatorId}`}
              >
                <RosterTable.Cell>
                  <span className="evc-la-person">
                    <span
                      className={`evc-la-person-name${p?.resigned ? " evc-la-muted" : ""}`}
                    >
                      {open ? <ChevronUpIcon size={12} /> : <ChevronDownIcon size={12} />} {name}
                    </span>
                    {p?.org && <span className="evc-la-hint">{p.org}</span>}
                  </span>
                </RosterTable.Cell>
                {roundList.map((k) => (
                  <RosterTable.Cell key={k}>{r.byRound[k - 1]}</RosterTable.Cell>
                ))}
                <RosterTable.Cell>
                  <span
                    className={over ? "evc-la-warn" : "evc-la-person-name"}
                    data-testid={`${testPrefix}-ev-total-${r.evaluatorId}`}
                  >
                    {r.total}
                  </span>
                </RosterTable.Cell>
                <RosterTable.Cell>
                  {over && (
                    <span
                      className="evc-la-warn"
                      data-testid={`${testPrefix}-ev-over-${r.evaluatorId}`}
                    >
                      <AlertIcon size={12} /> {fill(T.leaderEvOverload, { limit: loadLimit })}
                    </span>
                  )}
                  {p?.resigned && (
                    <StatusBadge className="evc-status-badge tone-error">
                      {T.leaderEvResigned}
                    </StatusBadge>
                  )}
                </RosterTable.Cell>
              </RosterTable.Row>
              {open && (
                <RosterTable.Row data-testid={`${testPrefix}-ev-cells-${r.evaluatorId}`}>
                  <RosterTable.Cell colSpan={cols}>
                    <span className="evc-la-ev-cells">
                      {r.cells.map((c) => {
                        const key = cellKey(c.evaluateeId, c.round);
                        return (
                          <Checkbox
                            key={key}
                            className="evc-la-bar-toggle"
                            inputClassName="dp-check-input"
                            checked={tools.selected.has(key)}
                            disabled={!canSelect(c)}
                            onChange={(e) => tools.setSelectedMany([key], e.target.checked)}
                            data-testid={`${testPrefix}-ev-cell-${key}`}
                          >
                            {cellLabel(c)}
                          </Checkbox>
                        );
                      })}
                    </span>
                  </RosterTable.Cell>
                </RosterTable.Row>
              )}
            </Fragment>
          );
        })}
      </RosterTable.Body>
    </RosterTable>
  );
}
