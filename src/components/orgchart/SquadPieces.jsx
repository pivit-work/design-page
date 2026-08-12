/**
 * 스쿼드 뷰 구성 조각 — 캐파 게이지 · 팀원 리소스 구성 · 배정 편집 팝오버 · 상태 이력 팝오버.
 * 시안 `org-chart-v2.jsx` 의 CapacityBar / SquadComposition / AssignPopover /
 * SquadHistoryPopover 를 그대로 옮기되, 이름이 아니라 **userId** 를 키로 쓴다
 * (실서비스에는 동명이인이 있다).
 *
 * 치수·색은 `org_squad.css` 가 쥔다. 여기 인라인으로 남는 값은 **데이터에서 오는 것**
 * (스쿼드·구성원 색, 계산된 세그먼트 폭, 팝오버 좌표)과 z 층뿐이다.
 * 구성비 스택 바의 트랙은 프로젝트 카드의 진행 바(`pj-progress-bar`)를 그대로 쓴다.
 */

import { useEffect } from 'react';
import {
  CAPACITY,
  SQUAD_MENU_BACKDROP_Z,
  SQUAD_MENU_Z,
  capacityState,
  clampPct,
  cumulativePct,
  squadComposition,
  squadStatusLabel,
} from './squad-constants.js';
import { LeadStarIcon, LeadStarOutlineIcon } from './squadIcons.jsx';

/**
 * 캐파 게이지 — 트랙 전체 = max(100, 합계).
 * 100 지점에 눈금을 그어 초과분을 시각적으로 분리하고, 초과분은 빗금을 덧대
 * "캐파 밖" 임을 색만으로 말하지 않는다(§5-3.2).
 */
export function CapacityBar({ segments, total, width = 132, height = 8 }) {
  const scale = Math.max(CAPACITY, total);
  const pc = (v) => (v / scale) * 100;
  // 각 세그먼트가 100을 넘긴 몫(빗금 구간)을 알려면 "끝나는 지점"이 필요하다.
  const cumulative = cumulativePct(segments);
  return (
    <div className="sq-gauge" style={{ width }} data-testid="squad-capacity-bar">
      <div className="sq-gauge-track" style={{ height }}>
        {segments.map((s, i) => {
          const overStart = Math.max(0, Math.min(s.pct, cumulative[i] - CAPACITY)); // 이 세그먼트 중 100을 넘은 몫
          return (
            <div key={s.id} title={`${s.name} ${s.pct}%`} className="sq-gauge-seg" style={{ width: `${pc(s.pct)}%` }}>
              <div
                className="sq-gauge-fill"
                style={{ width: `${s.pct ? ((s.pct - overStart) / s.pct) * 100 : 0}%`, background: s.color }}
              />
              <div
                className="sq-gauge-over"
                style={{
                  width: `${s.pct ? (overStart / s.pct) * 100 : 0}%`,
                  background: `repeating-linear-gradient(45deg, ${s.color}, ${s.color} 2px, var(--utility-error-200) 2px, var(--utility-error-200) 4px)`,
                }}
              />
            </div>
          );
        })}
      </div>
      {total > CAPACITY && (
        <div className="sq-gauge-mark" title="캐파 100%" style={{ left: `${pc(CAPACITY)}%` }} />
      )}
    </div>
  );
}

/**
 * 팀원 리소스 구성 — **스쿼드 100 기준** 구성비 (§5-3.4).
 * 매트릭스의 캐파 사용과 분모가 다르므로 구성비(강조)와 캐파 원값(괄호)을 항상 병기한다.
 */
export function SquadComposition({ squad, members, personOf }) {
  const { totalPct, fte, rows } = squadComposition(members);
  if (!members || members.length === 0) return null;

  const colorOf = (userId) => personOf(userId)?.color || squad.color;
  const nameOf = (userId) => personOf(userId)?.name || '알 수 없는 구성원';

  return (
    <div data-testid="squad-composition">
      <div className="sq-comp-head">
        <span className="sq-comp-title">팀원 리소스 구성</span>
        <span className="sq-comp-basis">스쿼드 100 기준</span>
        <span className="sq-comp-total">총 투입 {totalPct}% · 약 {fte.toFixed(1)}인분</span>
      </div>

      {totalPct === 0 ? (
        <div className="sq-comp-none">배정된 투입%가 없습니다 (전원 0%)</div>
      ) : (
        <>
          {/* 100% 스택 바 — 세그먼트 폭은 반올림 전 정확한 비율로 그린다.
              트랙은 프로젝트 카드의 진행 바를 그대로 쓴다. */}
          <div className="pj-progress-bar">
            {rows.filter((r) => r.pct > 0).map((r) => (
              <div
                key={r.userId}
                className="sq-seg"
                title={`${nameOf(r.userId)} — 스쿼드 내 ${r.share}% (개인 캐파 기준 ${r.pct}%)`}
                style={{ width: `${(r.pct / totalPct) * 100}%`, background: colorOf(r.userId) }}
              />
            ))}
          </div>

          {/* 범례 — 구성비를 크게, 캐파 원값은 괄호로 병기해 두 수를 혼동하지 않게 한다 */}
          <div className="sq-comp-legend">
            {rows.map((r) => (
              <span
                key={r.userId}
                className="sq-comp-item"
                title={`${nameOf(r.userId)} — 스쿼드 내 비중 ${r.share}% · 개인 캐파 기준 ${r.pct}%`}
              >
                <span className="sq-comp-swatch" style={{ background: colorOf(r.userId) }} />
                {r.role === 'lead' && (
                  <span className="sq-lead-mark"><LeadStarIcon size={11} /></span>
                )}
                <span className="sq-comp-name">{nameOf(r.userId)}</span>
                <span className="sq-comp-share">{r.share}%</span>
                <span className="sq-comp-raw">({r.pct})</span>
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * 배정 편집 팝오버 — 계획 투입% · 리드 지정 · 배정 해제.
 * `othersPct` = 이 사람이 **다른 활성 스쿼드**에 이미 쓰고 있는 캐파. 편집 중 합계를
 * 실시간으로 보여줘 내 조정이 어디에 얹히는지 드러낸다(§5-3.3).
 */
export function SquadAssignPopover({
  pos, squad, assignment, personName, othersPct = 0, counted = true,
  onSetPct, onToggleLead, onRemove, onClose,
}) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const isLead = assignment.role === 'lead';
  const W = 272;
  const x = Math.max(8, Math.min(pos.x, window.innerWidth - W - 16));
  const y = Math.max(8, Math.min(pos.y, window.innerHeight - 210));

  const total = othersPct + (counted ? assignment.allocationPct : 0);
  const cst = capacityState(total);
  const diff = total - CAPACITY;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: SQUAD_MENU_BACKDROP_Z }} />
      <div
        data-testid="squad-assign-popover"
        className="sq-pop"
        style={{ position: 'fixed', left: x, top: y, width: W, zIndex: SQUAD_MENU_Z }}
      >
        <div className="sq-pop-strip" style={{ background: squad.color }} />
        <div className="sq-pop-body">
          <p className="sq-pop-title">
            {personName} <span className="sq-pop-x">×</span> {squad.name}
          </p>
          <p className="sq-pop-desc">
            내 캐파 100 중 이 스쿼드에 쓰는 비율 · 리드 지정 (스쿼드당 1명)
          </p>

          <div className="sq-pop-row">
            <input
              type="range" min={0} max={100} step={5} value={assignment.allocationPct}
              aria-label="계획 투입%"
              onChange={(e) => onSetPct(clampPct(e.target.value))}
              style={{ flex: 1, accentColor: squad.color }}
            />
            <input
              type="number" min={0} max={100} value={assignment.allocationPct}
              aria-label="계획 투입% 직접 입력"
              className="sq-pop-num"
              onChange={(e) => onSetPct(clampPct(e.target.value))}
            />
            <span className="sq-pop-unit">%</span>
          </div>

          {/* 캐파 영향 미리보기 — 이 값이 그 사람의 100 중 어디에 놓이는지 즉시 보여준다 */}
          <div className="sq-pop-preview" style={{ background: cst.bg, borderColor: cst.bd }}>
            <div className="sq-pop-preview-head">
              <span className="sq-pop-preview-label">캐파 사용</span>
              <span className="sq-cap-total" style={{ color: cst.color }}>{total}</span>
              <span className="sq-cap-max">/ 100</span>
              <span className="sq-pop-preview-state" style={{ color: cst.color }}>
                {total === 0 ? '미배정' : diff > 0 ? `초과 ${diff}%p` : `여유 ${-diff}%p`}
              </span>
            </div>
            <CapacityBar
              segments={[
                { id: 'others', name: '다른 스쿼드', color: 'var(--text-quaternary)', pct: othersPct },
                { id: squad.id, name: squad.name, color: squad.color, pct: counted ? assignment.allocationPct : 0 },
              ].filter((s) => s.pct > 0)}
              total={total} width={240} height={8}
            />
            {!counted && (
              <div className="sq-pop-note">
                이 스쿼드는 {squadStatusLabel(squad.status)} 상태라 캐파 합계에 포함되지 않습니다.
              </div>
            )}
          </div>

          <div className="sq-pop-actions">
            <button
              type="button" onClick={onToggleLead}
              className={`sq-btn sq-btn-sm sq-btn-outline sq-btn-lead${isLead ? ' is-on' : ''}`}
            >
              {isLead ? <LeadStarIcon size={12} /> : <LeadStarOutlineIcon size={12} />}
              {isLead ? '리드 해제' : '리드 지정'}
            </button>
            <button
              type="button" onClick={onRemove}
              className="sq-btn sq-btn-sm sq-btn-unassign"
            >
              배정 해제
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * 상태 전이 이력 팝오버 — append-only 감사 로그(§5-2-A).
 * 생성 행(`fromStatus: null`)이 항상 있으므로 0건일 수 없다.
 */
export function SquadHistoryPopover({ squad, rows, loading, error, onRetry, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: SQUAD_MENU_BACKDROP_Z }} />
      <div
        data-testid="squad-history-popover"
        className="sq-hist"
        style={{ zIndex: SQUAD_MENU_Z }}
      >
        <p className="sq-hist-title">상태 이력</p>
        {loading && <div className="sq-hist-msg">불러오는 중…</div>}
        {!loading && error && (
          <div>
            <div className="sq-hist-msg is-error">이력을 불러오지 못했습니다</div>
            <button type="button" onClick={onRetry} className="sq-btn sq-btn-sm sq-btn-outline" style={{ marginTop: 8 }}>
              다시 시도
            </button>
          </div>
        )}
        {!loading && !error && (
          <div className="sq-hist-list">
            {(rows || []).map((h, i) => (
              <div key={`${h.changedAt}-${i}`} className="sq-hist-row">
                <span
                  className="sq-hist-dot"
                  style={i === 0 ? { background: squad.color } : undefined}
                />
                <div style={{ minWidth: 0 }}>
                  <div className="sq-hist-transition">
                    {h.fromStatus ? squadStatusLabel(h.fromStatus) : '생성'} → {squadStatusLabel(h.toStatus)}
                  </div>
                  <div className="sq-hist-meta">
                    {h.changedBy?.name || '알 수 없음'} · {String(h.changedAt || '').slice(2, 16).replace(/-/g, '.').replace('T', ' ')}
                  </div>
                </div>
              </div>
            ))}
            {(!rows || rows.length === 0) && (
              <div className="sq-hist-msg">기록이 없습니다</div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
