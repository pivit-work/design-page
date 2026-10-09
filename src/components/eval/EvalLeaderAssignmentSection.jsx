import { useRef, useState } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';
import RosterTable from '../shared/RosterTable.jsx';
import TextInput from '../shared/TextInput.jsx';
import Checkbox from '../shared/Checkbox.jsx';
import Tooltip from '../shared/Tooltip.jsx';
import Skeleton from '../shared/Skeleton.jsx';
import AnchoredLayer from '../shared/AnchoredLayer.jsx';
import useDismissLayer from '../shared/useDismissLayer.js';
import { SearchGlyph } from '../shared/lineIcons.jsx';
import { AlertIcon, CheckCircleIcon } from './evalIcons.jsx';
import { fill } from './evalTemplateItemModel.js';
import { cellKey, rowHasNoChain, summarizeLeaderWarnings } from './evalLeaderRounds.js';

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
  /** 칸 팝오버의 직원 검색 후보 `[{ id, name, org, resigned }]`. */
  people,
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
}) {
  const [warnOnly, setWarnOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [openCell, setOpenCell] = useState(null); // { key, evaluateeId, round }
  const [pickQuery, setPickQuery] = useState('');
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

  const pq = pickQuery.trim().toLowerCase();
  const pickList = (people ?? []).filter(
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
    const tip = adjusted ? fill(L.leaderAsgAdjustedTip, { name: recName || L.leaderAsgNone }) : undefined;
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
            <span className="evc-la-muted">{L.leaderAsgSkipped}</span>
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
              <StatusBadge
                className={`evc-status-badge ${adjusted ? 'tone-info' : 'tone-neutral'}`}
              >
                {adjusted ? L.leaderAsgBadgeAdjusted : L.leaderAsgBadgeRecommended}
              </StatusBadge>
            </span>
          )}
          {warns
            .filter((w) => w !== 'no_evaluator')
            .map((w) => (
              <span
                key={w}
                className={`evc-la-warn${w === 'duplicate' ? '' : ' is-block'}`}
                data-testid={`evc-la-warn-${key}-${w}`}
              >
                {w === 'self'
                  ? L.leaderAsgWarnSelf
                  : w === 'resigned'
                    ? L.leaderAsgWarnResigned
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
        <p className="evc-wiz-hint">{L.leaderAsgSub}</p>
      </div>

      <div
        className={`evc-la-bar${confirm && !reconfirmReason ? '' : ' is-warn'}`}
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
          })}
        </span>
        <Checkbox
          className="evc-la-bar-toggle"
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
              visibleRows.map((r) => {
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
                  {p.resigned && (
                    <StatusBadge className="evc-status-badge tone-error">
                      {L.leaderAsgResignedTag}
                    </StatusBadge>
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
                {L.leaderAsgRevert}
              </button>
            )}
          </div>
        </AnchoredLayer>
      )}
    </div>
  );
}
