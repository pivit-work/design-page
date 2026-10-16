import { useRef, useState } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';
import RosterTable from '../shared/RosterTable.jsx';
import TextInput from '../shared/TextInput.jsx';
import Skeleton from '../shared/Skeleton.jsx';
import AnchoredLayer from '../shared/AnchoredLayer.jsx';
import useDismissLayer from '../shared/useDismissLayer.js';
import { ChevronDownIcon, ChevronUpIcon } from './evalIcons.jsx';
import { fill } from './evalTemplateItemModel.js';

/** 로딩 자리 표시 줄 수 · 표 행 높이 — 「하향 평가자」 블록과 같은 값. */
const SKELETON_ROWS = 2;
const ROW_H = 49;

const DEFAULT_LABELS = {
  title: '퇴사로 빠진 동료 리뷰어',
  sub: '{{count}}건 · 대체 리뷰어 지정 필요',
  expand: '펼치기',
  collapse: '접기',
  hint: '사이클 도중 퇴사해 아직 쓰지 않은 동료 리뷰가 배정에서 빠졌습니다. 대체 리뷰어를 고르면 그 사람에게 동료 리뷰 작성이 배정됩니다.',
  colTarget: '대상자',
  colGone: '빠진 리뷰어',
  colReplace: '대체 리뷰어',
  resigned: '퇴사',
  pick: '대체 리뷰어 고르기',
  pickAria: '{{name}}의 대체 동료 리뷰어 고르기',
  pickSearch: '이름·소속 검색',
  pickEmpty: '검색 결과가 없습니다',
  loadFailed: '퇴사로 빠진 동료 리뷰어를 불러오지 못했습니다',
  retry: '다시 시도',
};

/**
 * EvalPeerResignedSection — 진행 현황 «퇴사로 빠진 동료 리뷰어» (PW-1845 · spec-eval-cycle §10
 * 「동료 리뷰어 중도 퇴사 — 리뷰어를 자동 제외 + HR 알림 발송 + 대체 리뷰어 지정 UI」).
 *
 * 디자이너 원본이 없어 같은 탭의 「하향 평가자」 블록(`EvalLeaderAssignmentLiveSection`)의 모양을
 * 그대로 따른다 — 접는 머리 · 안내 줄 · 표 · 퇴사 배지 · 사람 고르기 팝오버 (design-review).
 *
 * 줄이 없으면(불러오기 전·실패가 아닌데 0건) 아무것도 그리지 않는다 — 할 일이 있을 때만 보인다.
 */
export default function EvalPeerResignedSection({
  labels,
  /** `[{ id, evaluateeId, evaluateeName, evaluatorId, evaluatorName }]`. */
  rows = [],
  /** 대체 후보 `[{ id, name, org, resigned }]` — 퇴사자·대상자 본인은 목록에서 뺀다. */
  people = [],
  /** 'loading' | 'error' | 'ready'. */
  status = 'ready',
  onRetry,
  /** 서버에 보내는 중인 줄 id — 그 줄은 누르지 못한다. */
  pendingIds = [],
  /** `(row, person) => void`. */
  onReplace,
  defaultOpen = true,
}) {
  const L = { ...DEFAULT_LABELS, ...(labels ?? {}) };
  const [open, setOpen] = useState(!!defaultOpen);
  const [openRowId, setOpenRowId] = useState(null);
  const [query, setQuery] = useState('');
  const panelRef = useRef(null);
  const closePick = () => {
    setOpenRowId(null);
    setQuery('');
  };
  useDismissLayer(
    closePick,
    panelRef,
    openRowId ? `[data-peer-resigned-row="${openRowId}"]` : undefined,
    !!openRowId,
  );

  const failed = status === 'error';
  const loading = status === 'loading';
  if (!failed && !loading && rows.length === 0) return null;

  const pending = new Set(pendingIds ?? []);
  const openRow = openRowId ? rows.find((r) => r.id === openRowId) ?? null : null;
  const q = query.trim().toLowerCase();
  const pickList = openRow
    ? (people ?? []).filter(
        (p) =>
          !p.resigned &&
          p.id !== openRow.evaluateeId &&
          p.id !== openRow.evaluatorId &&
          (!q ||
            String(p.name ?? '').toLowerCase().includes(q) ||
            String(p.org ?? '').toLowerCase().includes(q)),
      )
    : [];

  return (
    <section className="evc-card evmon-la" data-testid="evmon-peer-resigned">
      <button
        type="button"
        className="evmon-la-toggle"
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o);
          closePick();
        }}
        data-testid="evmon-pr-toggle"
      >
        <span className="evc-card-name">{L.title}</span>
        {/* 읽지 못했을 때 「0건」을 적지 않는다 — 없는 게 아니라 모르는 것이다. */}
        {rows.length > 0 && <span className="evc-la-hint">{fill(L.sub, { count: rows.length })}</span>}
        <span className="evmon-la-toggle-end">
          {open ? L.collapse : L.expand}
          {open ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
        </span>
      </button>

      {open && (
        <div className="evc-la" data-testid="evmon-pr-body">
          <p className="evc-wiz-hint">{L.hint}</p>
          {failed && (
            <p className="evc-wiz-warn evc-la-error" role="alert" data-testid="evmon-pr-error">
              {L.loadFailed}
              {onRetry && (
                <button
                  type="button"
                  className="evc-link-btn"
                  onClick={() => onRetry()}
                  data-testid="evmon-pr-retry"
                >
                  {L.retry}
                </button>
              )}
            </p>
          )}
          {failed && rows.length === 0 ? null : loading && rows.length === 0 ? (
            <div className="evc-la-loading-rows" data-testid="evmon-pr-loading">
              {Array.from({ length: SKELETON_ROWS }, (_, i) => (
                <Skeleton key={i} height={ROW_H - 8} />
              ))}
            </div>
          ) : (
            <RosterTable scroll="x" framed tableClassName="evc-la-table" testId="evmon-pr-table">
              <RosterTable.Head>
                <RosterTable.HeadCell width={200}>{L.colTarget}</RosterTable.HeadCell>
                <RosterTable.HeadCell>{L.colGone}</RosterTable.HeadCell>
                <RosterTable.HeadCell>{L.colReplace}</RosterTable.HeadCell>
              </RosterTable.Head>
              <RosterTable.Body>
                {rows.map((r) => (
                  <RosterTable.Row key={r.id} data-testid={`evmon-pr-row-${r.id}`}>
                    <RosterTable.Cell>
                      <span className="evc-la-person">
                        <span className="evc-la-person-name">{r.evaluateeName}</span>
                      </span>
                    </RosterTable.Cell>
                    <RosterTable.Cell>
                      <span className="evc-la-name-row">
                        <span className="evc-la-name is-resigned">{r.evaluatorName || '—'}</span>
                        <StatusBadge className="evc-status-badge tone-error">{L.resigned}</StatusBadge>
                      </span>
                    </RosterTable.Cell>
                    <RosterTable.Cell>
                      <button
                        type="button"
                        className={`evc-la-cell${openRowId === r.id ? ' is-open' : ''}`}
                        data-peer-resigned-row={r.id}
                        aria-haspopup="true"
                        aria-expanded={openRowId === r.id}
                        aria-label={fill(L.pickAria, { name: r.evaluateeName })}
                        disabled={pending.has(r.id)}
                        onClick={() => {
                          if (openRowId === r.id) closePick();
                          else {
                            setQuery('');
                            setOpenRowId(r.id);
                          }
                        }}
                        data-testid={`evmon-pr-pick-open-${r.id}`}
                      >
                        <span className="evc-la-muted">{L.pick}</span>
                      </button>
                    </RosterTable.Cell>
                  </RosterTable.Row>
                ))}
              </RosterTable.Body>
            </RosterTable>
          )}
        </div>
      )}

      {open && openRow && (
        <AnchoredLayer
          anchorSelector={`[data-peer-resigned-row="${openRow.id}"]`}
          panelRef={panelRef}
          width={260}
          maxHeight={320}
          className="evc-la-pop"
          role="group"
          aria-label={L.pickSearch}
          data-testid="evmon-pr-pop"
        >
          <TextInput
            className="evc-input"
            value={query}
            placeholder={L.pickSearch}
            aria-label={L.pickSearch}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            data-testid="evmon-pr-pick-search"
          />
          <div className="evc-la-pop-list">
            {pickList.length === 0 ? (
              <span className="evc-la-hint">{L.pickEmpty}</span>
            ) : (
              pickList.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  className="evc-la-pop-item"
                  onClick={() => {
                    const row = openRow;
                    closePick();
                    onReplace?.(row, p);
                  }}
                  data-testid={`evmon-pr-pick-${p.id}`}
                >
                  <span className="evc-la-name">{p.name}</span>
                  {p.org && <span className="evc-la-hint">{p.org}</span>}
                </button>
              ))
            )}
          </div>
        </AnchoredLayer>
      )}
    </section>
  );
}
