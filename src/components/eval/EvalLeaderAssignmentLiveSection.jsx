import { useRef, useState } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';
import RosterTable from '../shared/RosterTable.jsx';
import TextInput from '../shared/TextInput.jsx';
import Tooltip from '../shared/Tooltip.jsx';
import Skeleton from '../shared/Skeleton.jsx';
import AnchoredLayer from '../shared/AnchoredLayer.jsx';
import useDismissLayer from '../shared/useDismissLayer.js';
import { ChevronDownIcon, ChevronUpIcon, LockIcon } from './evalIcons.jsx';
import { fill } from './evalTemplateItemModel.js';
import {
  formatMonthDay,
  isLiveCellSkipped,
  liveCellActions,
  liveCellBadge,
  liveRoundCount,
} from './evalLeaderLive.js';

/** 로딩 자리 표시 줄 수 · 표 행 높이(§9-E-1 tbody tr h49) — 4단계 섹션과 같은 값. */
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
  /** 교체 후보 `[{ id, name, org, resigned }]` — 퇴사자는 목록에서 뺀다. */
  people = [],
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
}) {
  const L = { ...DEFAULT_LABELS, ...(labels ?? {}) };
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
          ) : (
            <RosterTable scroll="x" framed tableClassName="evc-la-table" testId="evmon-la-table">
              <RosterTable.Head>
                <RosterTable.HeadCell width={200}>{L.liveColTarget}</RosterTable.HeadCell>
                {roundList.map((k) => (
                  <RosterTable.HeadCell key={k}>
                    <StatusBadge className="evc-type-badge">{fill(L.liveColRound, { round: k })}</StatusBadge>
                  </RosterTable.HeadCell>
                ))}
              </RosterTable.Head>
              <RosterTable.Body>
                {rows.map((r) => (
                  <RosterTable.Row key={r.evaluateeId} data-testid={`evmon-la-row-${r.evaluateeId}`}>
                    <RosterTable.Cell>
                      <span className="evc-la-person">
                        <span className="evc-la-person-name">{r.evaluateeName}</span>
                        {r.orgName && <span className="evc-la-hint">{r.orgName}</span>}
                      </span>
                    </RosterTable.Cell>
                    {roundList.map((k) => (
                      <RosterTable.Cell key={k}>{renderCell(r, k)}</RosterTable.Cell>
                    ))}
                  </RosterTable.Row>
                ))}
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
