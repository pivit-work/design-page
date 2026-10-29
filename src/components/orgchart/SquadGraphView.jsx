/**
 * 스쿼드 그림 보기 — 스쿼드 · 사람 · 담당 프로젝트를 노드로 잇는 보기 전용 그림
 * (pivit-work PW-2356 · 기획 screen-org-chart-squad.policy.md v3.29 §5-6 · TC-ORG-144·145·159).
 *
 * 카드 그리드·매트릭스가 못 보이는 «한 사람이 여러 스쿼드에 걸친 것»(겸임)과 «한 프로젝트를 여러 스쿼드가
 * 맡은 것»(협업)을 선으로 보인다. 같은 스쿼드 응답(`squads`)으로 그리고 값을 고치지 않는다 — 편집은 카드 보기에서만.
 *
 * 디자이너 원본은 없다(design-page 에 그림 보기 시안이 없다). 새 모양을 짓지 않고 같은 스쿼드 탭의
 * 디자이너 모양을 옮겨 놓았다 — 대응표는 pivit-work `openspec/changes/pw-2356-squad-graph-view/design.md`.
 *   판·제목       = 매트릭스 판(.sq-panel) · 제목·안내(.pj-table-title · .pj-table-subtitle)
 *   스쿼드 노드   = 카드 이름 줄(.sq-color-box + 이름) · 상태 점(.pj-card-status + .pj-status-dot)
 *   사람 노드     = 매트릭스 이름 칸 사진 40(.sq-photo) · 이름(.pj-member-name) · 리드 별(.sq-lead-mark)
 *   선 위 칩      = 매트릭스 배정 칸(스쿼드 색 8% 블록 · 미설정 회색) — 윗줄 캐파 · 아랫줄 비중
 *   둘레 게이지   = 매트릭스 «캐파 사용» 열과 같은 값·같은 구간색(capacityState)
 *   프로젝트 노드 = 카드 «담당 프로젝트» 줄(파일 아이콘 · 이름 · 상태 딱지 · %)
 *   상태 필터     = 공용 필터 칩(Chip selected)
 */
import { useMemo, useState } from 'react';
import Chip from '../shared/Chip.jsx';
import Icon from '../shared/Icon.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import Tooltip from '../shared/Tooltip.jsx';
import { squadStatusText, useOrgLabels } from './orgchart-labels.jsx';
import { FileIcon, LeadStarIcon } from './squadIcons.jsx';
import { projectStatusText, projectStatusTone } from './project-constants.js';
import {
  CAPACITY,
  capacityState,
  isCountedStatus,
  plannedTotalPct,
  squadStatusMeta,
  unsetCapacityCount,
} from './squad-constants.js';
import { GRAPH_GEOM, memberEdgeWidth, squadGraphLayout } from './squadGraphLayout.js';

export const GRAPH_STATUS_ORDER = ['planned', 'active', 'done', 'archived'];
/** 기본 = 지금 움직이는 조직. 완료·보관은 켜야 보인다(§5-6 「상태 필터」). */
export const GRAPH_DEFAULT_STATUS = ['planned', 'active'];

const DIM = 0.15; // 마우스를 올린 노드와 안 이어진 것 — 흐려도 값은 읽힌다
const FADED = 0.6; // 완료·보관 스쿼드의 선·칩(캐파 합계 밖) · 보관 스쿼드 노드

/**
 * 사람 노드의 «직함 · 주 소속» 한 줄(§5-6 「사람 노드」 · 엣지 78).
 * 직급은 쓰지 않는다 — 명부의 `businessTitle`(직함)과 주 소속 1개(`unitKind`·`unitName`)만 본다. 겸직은 적지 않는다.
 * 소속 글자는 조직도 리스트 «소속» 칸과 같은 말이다(대표 · 대표 직속 · 미배정 · 조직 이름).
 * 직함이 비면 소속만, 소속을 모르면 «미배정». 줄을 비워 두지 않는다.
 */
export function graphPersonLine(L, person) {
  const kind = person?.unitKind;
  const unit = kind === 'unit' && person?.unitName
    ? person.unitName
    : L(`list.unit.${kind === 'ceo' || kind === 'ceoDirect' ? kind : 'unassigned'}`);
  const title = person?.businessTitle || '';
  return title ? `${title} · ${unit}` : unit;
}

export default function SquadGraphView({ squads, personOf, renderAvatar, onMemberClick }) {
  const L = useOrgLabels();
  const G = GRAPH_GEOM;
  const [statusOn, setStatusOn] = useState(GRAPH_DEFAULT_STATUS);
  const [focus, setFocus] = useState(null); // { kind: 'sq' | 'p' | 'pj', id } — 마우스를 올린 노드

  const shown = useMemo(() => squads.filter((sq) => statusOn.includes(sq.status)), [squads, statusOn]);
  const layout = useMemo(() => squadGraphLayout({ squads: shown, personOf }), [shown, personOf]);
  const toggleStatus = (st) => setStatusOn((on) => (on.includes(st) ? on.filter((x) => x !== st) : [...on, st]));

  // 강조 — 올린 노드에 직접 이어진 선·칩·노드만 진하게(§5-6 「마우스 올림」)
  const edgeOn = (squadId, userId, projectId) => {
    if (!focus) return true;
    if (focus.kind === 'sq') return focus.id === squadId;
    if (focus.kind === 'p') return userId != null && focus.id === userId;
    return projectId != null && focus.id === projectId;
  };
  const squadOn = (sq) => {
    if (!focus) return true;
    if (focus.kind === 'sq') return focus.id === sq.id;
    if (focus.kind === 'p') return (sq.members || []).some((m) => m.userId === focus.id);
    return (sq.projects || []).some((p) => p.id === focus.id);
  };
  const opacity = (on, faded = false) => (on ? 1 : DIM) * (faded ? FADED : 1);
  const inactive = (sq) => !isCountedStatus(sq.status);

  return (
    <div className="pj-table-section sq-matrix-section" data-testid="squad-graph">
      <div className="pj-table-header-text sq-matrix-head sq-graph-head">
        <div>
          <p className="pj-table-title">{L('squad.graph.title')}</p>
          <p className="pj-table-subtitle">{L('squad.graph.subtitle')}</p>
        </div>
        {/* 상태 필터 — 여러 개를 함께 켠다. 버튼마다 그 상태의 스쿼드 수(필터와 무관한 전체 수) */}
        <div className="sq-graph-filters" role="group" aria-label={L('squad.graph.filterLabel')}>
          {GRAPH_STATUS_ORDER.map((st) => {
            const meta = squadStatusMeta(st);
            const on = statusOn.includes(st);
            return (
              <Chip
                key={st}
                selected={on}
                onClick={() => toggleStatus(st)}
                data-testid={`squad-graph-filter-${st}`}
                icon={<span className="pj-status-dot" style={{ background: meta.dotColor }} aria-hidden />}
              >
                {L('squad.graph.filterCount', {
                  status: squadStatusText(L, st),
                  count: squads.filter((sq) => sq.status === st).length,
                })}
              </Chip>
            );
          })}
        </div>
      </div>

      <div className="sq-panel">
        {shown.length === 0 ? (
          <div className="sq-empty sq-graph-empty" data-testid="squad-graph-empty">
            <p className="sq-empty-title">{L('squad.graph.emptyTitle')}</p>
            <p className="sq-empty-desc">{L('squad.graph.emptyDesc')}</p>
          </div>
        ) : (
          <div className="sq-graph-scroll">
            <div
              className="sq-graph-canvas"
              style={{ width: layout.width, height: layout.height }}
              onMouseLeave={() => setFocus(null)}
            >
              {/* ── 선 — 칩·노드보다 아래 ── */}
              <svg className="sq-graph-lines" width={layout.width} height={layout.height} aria-hidden>
                {layout.projectEdges.map((e) => (
                  <line
                    key={`pl-${e.squad.id}-${e.project.id}`}
                    data-testid={`squad-graph-project-edge-${e.squad.id}-${e.project.id}`}
                    data-primary={e.isPrimary ? 'true' : 'false'}
                    className={`sq-graph-project-edge${e.isPrimary ? ' is-primary' : ''}`}
                    x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
                    style={{ opacity: opacity(edgeOn(e.squad.id, null, e.project.id), inactive(e.squad)) }}
                  />
                ))}
                {layout.memberEdges.map((e) => (
                  <line
                    key={`ml-${e.squad.id}-${e.userId}`}
                    data-testid={`squad-graph-edge-${e.squad.id}-${e.userId}`}
                    data-width={memberEdgeWidth(e.member).toFixed(2)}
                    className={`sq-graph-edge${e.capUnset ? ' is-cap-unset' : ''}`}
                    x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
                    strokeWidth={memberEdgeWidth(e.member)}
                    style={{
                      opacity: opacity(edgeOn(e.squad.id, e.userId, null), inactive(e.squad)),
                      ...(e.capUnset ? {} : { stroke: e.squad.color }),
                    }}
                  />
                ))}
              </svg>

              {/* ── 主 표시 — 주 스쿼드 선 가운데 ── */}
              {layout.projectEdges.filter((e) => e.isPrimary).map((e) => (
                <div
                  key={`pm-${e.squad.id}-${e.project.id}`}
                  className="sq-graph-at"
                  style={{
                    left: (e.x1 + e.x2) / 2, top: (e.y1 + e.y2) / 2,
                    opacity: opacity(edgeOn(e.squad.id, null, e.project.id), inactive(e.squad)),
                  }}
                >
                  <StatusBadge tone="accent" className="sq-proj-primary" data-testid={`squad-graph-primary-${e.squad.id}-${e.project.id}`}>
                    {L('squad.project.primaryMark')}
                  </StatusBadge>
                </div>
              ))}

              {/* ── 선 위 두 줄 칩 — 윗줄 캐파 사용 · 아랫줄 스쿼드 내 비중. 늘 보인다(David 2026-10-28) ── */}
              {layout.memberEdges.map((e) => {
                const m = e.member;
                const isLead = m.role === 'lead';
                const name = personOf(e.userId)?.name || '';
                return (
                  <div
                    key={`mc-${e.squad.id}-${e.userId}`}
                    className="sq-graph-at"
                    style={{ left: e.cx, top: e.cy, opacity: opacity(edgeOn(e.squad.id, e.userId, null), inactive(e.squad)) }}
                  >
                    <Tooltip
                      content={[
                        `${name} · ${e.squad.name}`,
                        e.capUnset ? L('squad.tip.cellCapacityUnset') : L('squad.tip.cellCapacity', { capacity: `${m.allocationPct}%` }),
                        L('squad.tip.cellShare', { share: m.sharePct || 0 }),
                        isLead ? L('squad.tip.lead') : '',
                        inactive(e.squad) ? L('squad.graph.tipInactive', { status: squadStatusText(L, e.squad.status) }) : '',
                      ].filter(Boolean).join('\n')}
                    >
                      <div
                        className={`sq-graph-cell${e.capUnset ? ' is-cap-unset' : ''}`}
                        data-testid={`squad-graph-chip-${e.squad.id}-${e.userId}`}
                      >
                        <div className="sq-graph-cell-fill" style={e.capUnset ? undefined : { background: `${e.squad.color}14` }}>
                          <span className="sq-graph-cell-cap">
                            {isLead && <span className="sq-lead-mark" aria-hidden><LeadStarIcon size={11} /></span>}
                            {e.capUnset ? L('squad.graph.chipCapNone') : L('squad.graph.chipCap', { pct: m.allocationPct })}
                          </span>
                          <span className="sq-graph-cell-share">
                            {m.sharePct ? L('squad.graph.chipShare', { pct: m.sharePct }) : L('squad.graph.chipShareNone')}
                          </span>
                        </div>
                      </div>
                    </Tooltip>
                  </div>
                );
              })}

              {/* ── 노드: 프로젝트 — 눌러도 아무 일 없다(원장은 카드 보기에서 연다) ── */}
              {layout.projectNodes.map((p) => {
                const on = !focus || (focus.kind === 'pj' ? focus.id === p.project.id : p.sis.some((si) => squadOn(shown[si])));
                return (
                  <div
                    key={`pj-${p.project.id}`}
                    className="sq-graph-project"
                    data-testid={`squad-graph-project-${p.project.id}`}
                    style={{ left: p.x - G.pjW / 2, top: G.yPj, width: G.pjW, height: G.pjH, opacity: opacity(on) }}
                    onMouseEnter={() => setFocus({ kind: 'pj', id: p.project.id })}
                    title={p.project.name}
                  >
                    <span className="sq-proj-main">
                      <FileIcon size={14} />
                      <span className="sq-proj-name">{p.project.name}</span>
                    </span>
                    <span className="sq-proj-side">
                      <StatusBadge tone={projectStatusTone(p.project.status)} className="sq-proj-status">
                        {projectStatusText(L, p.project.status)}
                      </StatusBadge>
                      <span className="sq-proj-pct">{p.project.progress || 0}%</span>
                    </span>
                  </div>
                );
              })}

              {/* ── 노드: 스쿼드 ── */}
              {layout.squadNodes.map(({ squad: sq, x }) => {
                const st = squadStatusMeta(sq.status);
                const lead = (sq.members || []).find((m) => m.role === 'lead');
                const leadName = lead ? (personOf(lead.userId)?.name || '') : L('squad.card.leadUnset');
                return (
                  <div
                    key={`sq-${sq.id}`}
                    className="sq-graph-squad"
                    data-testid={`squad-graph-squad-${sq.id}`}
                    style={{
                      left: x - G.sqW / 2, top: G.ySq, width: G.sqW, height: G.sqH,
                      opacity: opacity(squadOn(sq), sq.status === 'archived'),
                    }}
                    onMouseEnter={() => setFocus({ kind: 'sq', id: sq.id })}
                    title={sq.name}
                  >
                    <p className="pj-card-name sq-card-name sq-graph-squad-name">
                      <span className="sq-color-box" style={{ background: `${sq.color}cc` }} aria-hidden />
                      <span className="sq-graph-ellipsis">{sq.name}</span>
                    </p>
                    <div className="sq-graph-squad-meta">
                      {/* 카드의 상태 배지와 같은 부품 — 준비중·완료는 아이콘, 나머지는 점(전환은 카드 보기에서만) */}
                      <StatusBadge className="pj-card-status sq-status" style={{ color: st.textColor }} data-testid={`squad-graph-status-${sq.id}`}>
                        {st.icon ? (
                          <Icon src={st.icon} size={16} color="currentColor" />
                        ) : (
                          <span className="pj-status-dot" style={{ background: st.dotColor }} />
                        )}
                        <span>{squadStatusText(L, sq.status)}</span>
                      </StatusBadge>
                      <span className="sq-graph-ellipsis" data-testid={`squad-graph-squad-meta-${sq.id}`}>
                        {L('squad.graph.squadMeta', { count: (sq.members || []).length, lead: leadName })}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* ── 노드: 사람 — 둘레 = 캐파 합계(매트릭스 «캐파 사용» 열과 같은 값 · 필터와 무관) ── */}
              {layout.personNodes.map((p) => {
                const person = personOf(p.userId);
                // 합계는 켜진 스쿼드가 아니라 전체 스쿼드로 센다 — 필터는 «무엇을 그리나»이고 합계는 «그 사람의 사실»이다
                const total = plannedTotalPct(squads, p.userId);
                const unset = unsetCapacityCount(squads, p.userId);
                const cst = capacityState(total);
                const ringR = G.pR + 4;
                const C = 2 * Math.PI * ringR;
                const filled = (Math.min(total, CAPACITY) / CAPACITY) * C;
                const on = !focus || (focus.kind === 'p' ? focus.id === p.userId : p.links.some((l) => squadOn(l.squad)));
                const line = graphPersonLine(L, person);
                const over = total > CAPACITY;
                return (
                  <div
                    key={`p-${p.userId}`}
                    className={`sq-graph-person${person && onMemberClick ? ' is-clickable' : ''}`}
                    data-testid={`squad-graph-person-${p.userId}`}
                    style={{ left: p.x - G.personGap / 2, top: G.yP - G.pR - 4, width: G.personGap, opacity: opacity(on) }}
                    onMouseEnter={() => setFocus({ kind: 'p', id: p.userId })}
                    onClick={person && onMemberClick ? () => onMemberClick(person) : undefined}
                  >
                    <span className="sq-graph-avatar">
                      <svg className="sq-graph-ring" width={ringR * 2 + 4} height={ringR * 2 + 4} aria-hidden>
                        <circle className="sq-graph-ring-track" cx={ringR + 2} cy={ringR + 2} r={ringR} />
                        {total > 0 && (
                          <circle
                            className="sq-graph-ring-fill"
                            data-testid={`squad-graph-ring-${p.userId}`}
                            cx={ringR + 2} cy={ringR + 2} r={ringR}
                            transform={`rotate(-90 ${ringR + 2} ${ringR + 2})`}
                            style={{ stroke: cst.color, strokeDasharray: `${filled} ${C}` }}
                          />
                        )}
                      </svg>
                      {renderAvatar(person || { name: p.name }, 40)}
                    </span>
                    <span className="pj-member-name sq-graph-person-name">
                      {p.isLead && <span className="sq-lead-mark" aria-hidden><LeadStarIcon size={11} /></span>}
                      <span className="sq-graph-ellipsis">{person?.name || p.name}</span>
                    </span>
                    <Tooltip content={line}>
                      <span className="sq-graph-person-line sq-graph-ellipsis" data-testid={`squad-graph-person-line-${p.userId}`}>
                        {line}
                      </span>
                    </Tooltip>
                    <span
                      className={`sq-graph-person-total${over ? ' is-over' : ''}`}
                      data-testid={`squad-graph-total-${p.userId}`}
                    >
                      {over ? L('squad.graph.totalOver', { total }) : L('squad.graph.total', { total })}
                      {unset > 0 && <> {L('squad.graph.totalUnset', { count: unset })}</>}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 범례 세 줄(§5-6 「범례」 · 엣지 75·77) */}
      <div className="sq-graph-legend" data-testid="squad-graph-legend">
        <p className="pj-table-subtitle">{L('squad.graph.legendChip')}</p>
        <p className="pj-table-subtitle">{L('squad.graph.legendLine')}</p>
        <p className="pj-table-subtitle">{L('squad.graph.legendProject')}</p>
      </div>
    </div>
  );
}
