/**
 * 스쿼드 뷰 구성 조각 — 캐파 게이지 · 팀원 리소스 구성 · 배정 편집 팝오버 · 상태 이력 팝오버.
 * 시안 `org-chart-v2.jsx` 의 CapacityBar / SquadComposition / AssignPopover /
 * SquadHistoryPopover 를 그대로 옮기되, 이름이 아니라 **userId** 를 키로 쓴다
 * (실서비스에는 동명이인이 있다).
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

const MONO = "'DM Mono',monospace";
const FONT = "'Pretendard','Noto Sans KR',sans-serif";

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
    <div style={{ width, position: 'relative' }} data-testid="squad-capacity-bar">
      <div style={{ display: 'flex', height, borderRadius: 99, overflow: 'hidden', background: '#F1F5F9' }}>
        {segments.map((s, i) => {
          const overStart = Math.max(0, Math.min(s.pct, cumulative[i] - CAPACITY)); // 이 세그먼트 중 100을 넘은 몫
          return (
            <div key={s.id} title={`${s.name} ${s.pct}%`} style={{ width: `${pc(s.pct)}%`, display: 'flex' }}>
              <div style={{ width: `${s.pct ? ((s.pct - overStart) / s.pct) * 100 : 0}%`, background: s.color }} />
              <div
                style={{
                  width: `${s.pct ? (overStart / s.pct) * 100 : 0}%`,
                  background: `repeating-linear-gradient(45deg, ${s.color}, ${s.color} 2px, #FECACA 2px, #FECACA 4px)`,
                }}
              />
            </div>
          );
        })}
      </div>
      {total > CAPACITY && (
        <div
          title="캐파 100%"
          style={{
            position: 'absolute', top: -2, bottom: -2, left: `${pc(CAPACITY)}%`,
            width: 2, background: '#DC2626', borderRadius: 1,
          }}
        />
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
    <div style={{ marginBottom: 12 }} data-testid="squad-composition">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 5 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#64748B' }}>팀원 리소스 구성</span>
        <span style={{ fontSize: 9, color: '#CBD5E1' }}>스쿼드 100 기준</span>
        <span style={{ marginLeft: 'auto', fontSize: 9, color: '#94A3B8', fontFamily: MONO }}>
          총 투입 {totalPct}% · 약 {fte.toFixed(1)}인분
        </span>
      </div>

      {totalPct === 0 ? (
        <div style={{ fontSize: 9, color: '#CBD5E1' }}>배정된 투입%가 없습니다 (전원 0%)</div>
      ) : (
        <>
          {/* 100% 스택 바 — 세그먼트 폭은 반올림 전 정확한 비율로 그린다 */}
          <div style={{ display: 'flex', height: 10, borderRadius: 99, overflow: 'hidden', background: '#F1F5F9' }}>
            {rows.filter((r) => r.pct > 0).map((r) => (
              <div
                key={r.userId}
                title={`${nameOf(r.userId)} — 스쿼드 내 ${r.share}% (개인 캐파 기준 ${r.pct}%)`}
                style={{
                  width: `${(r.pct / totalPct) * 100}%`,
                  background: colorOf(r.userId),
                  borderRight: '1px solid #fff',
                }}
              />
            ))}
          </div>

          {/* 범례 — 구성비를 크게, 캐파 원값은 괄호로 병기해 두 수를 혼동하지 않게 한다 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 10px', marginTop: 6 }}>
            {rows.map((r) => (
              <span
                key={r.userId}
                title={`${nameOf(r.userId)} — 스쿼드 내 비중 ${r.share}% · 개인 캐파 기준 ${r.pct}%`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9 }}
              >
                <span style={{ width: 6, height: 6, borderRadius: 2, background: colorOf(r.userId) }} />
                {r.role === 'lead' && (
                  <span style={{ color: '#F59E0B', display: 'inline-flex' }}><LeadStarIcon size={9} /></span>
                )}
                <span style={{ color: '#475569', fontWeight: 600 }}>{nameOf(r.userId)}</span>
                <span style={{ color: '#0F172A', fontWeight: 800, fontFamily: MONO }}>{r.share}%</span>
                <span style={{ color: '#CBD5E1', fontFamily: MONO }}>({r.pct})</span>
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
  const W = 248;
  const x = Math.max(8, Math.min(pos.x, window.innerWidth - W - 16));
  const y = Math.max(8, Math.min(pos.y, window.innerHeight - 190));

  const total = othersPct + (counted ? assignment.allocationPct : 0);
  const cst = capacityState(total);
  const diff = total - CAPACITY;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 10000 }} />
      <div
        data-testid="squad-assign-popover"
        style={{
          position: 'fixed', left: x, top: y, width: W, zIndex: 10001,
          background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 12,
          boxShadow: '0 12px 40px rgba(0,0,0,.16)', overflow: 'hidden', fontFamily: FONT,
        }}
      >
        <div style={{ height: 3, background: squad.color }} />
        <div style={{ padding: '12px 14px' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#0F172A' }}>
            {personName} <span style={{ color: '#94A3B8', fontWeight: 600 }}>×</span> {squad.name}
          </div>
          <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2, marginBottom: 10 }}>
            내 캐파 100 중 이 스쿼드에 쓰는 비율 · 리드 지정 (스쿼드당 1명)
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <input
              type="range" min={0} max={100} step={5} value={assignment.allocationPct}
              aria-label="계획 투입%"
              onChange={(e) => onSetPct(clampPct(e.target.value))}
              style={{ flex: 1, accentColor: squad.color }}
            />
            <input
              type="number" min={0} max={100} value={assignment.allocationPct}
              aria-label="계획 투입% 직접 입력"
              onChange={(e) => onSetPct(clampPct(e.target.value))}
              style={{
                width: 52, padding: '5px 6px', borderRadius: 7, border: '1px solid #E2E8F0',
                fontSize: 12, fontWeight: 700, color: '#0F172A', fontFamily: MONO, textAlign: 'right',
              }}
            />
            <span style={{ fontSize: 11, color: '#94A3B8' }}>%</span>
          </div>

          {/* 캐파 영향 미리보기 — 이 값이 그 사람의 100 중 어디에 놓이는지 즉시 보여준다 */}
          <div
            style={{
              marginBottom: 10, padding: '7px 9px', borderRadius: 8,
              background: cst.bg, border: `1px solid ${cst.bd}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 5 }}>
              <span style={{ fontSize: 10, color: '#64748B' }}>캐파 사용</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: cst.color, fontFamily: MONO }}>{total}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#CBD5E1', fontFamily: MONO }}>/ 100</span>
              <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 800, color: cst.color }}>
                {total === 0 ? '미배정' : diff > 0 ? `초과 ${diff}%p` : `여유 ${-diff}%p`}
              </span>
            </div>
            <CapacityBar
              segments={[
                { id: 'others', name: '다른 스쿼드', color: '#CBD5E1', pct: othersPct },
                { id: squad.id, name: squad.name, color: squad.color, pct: counted ? assignment.allocationPct : 0 },
              ].filter((s) => s.pct > 0)}
              total={total} width={220} height={7}
            />
            {!counted && (
              <div style={{ fontSize: 9, color: '#94A3B8', marginTop: 4 }}>
                이 스쿼드는 {squadStatusLabel(squad.status)} 상태라 캐파 합계에 포함되지 않습니다.
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button" onClick={onToggleLead}
              style={{
                flex: 1, padding: '7px 8px', borderRadius: 8,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                border: `1.5px solid ${isLead ? '#F59E0B' : '#E2E8F0'}`,
                background: isLead ? '#FFFBEB' : '#fff', color: isLead ? '#D97706' : '#475569',
                cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: FONT,
              }}
            >
              {isLead ? <LeadStarIcon size={11} /> : <LeadStarOutlineIcon size={11} />}
              {isLead ? '리드 해제' : '리드 지정'}
            </button>
            <button
              type="button" onClick={onRemove}
              style={{
                flex: 1, padding: '7px 8px', borderRadius: 8,
                border: '1.5px solid #FECACA', background: '#FEF2F2', color: '#DC2626',
                cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: FONT,
              }}
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
        style={{
          position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: SQUAD_MENU_Z,
          background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10,
          boxShadow: '0 8px 28px rgba(15,23,42,.14)', padding: 12, width: 250,
          fontFamily: FONT, textAlign: 'left',
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>상태 이력</div>
        {loading && <div style={{ fontSize: 10, color: '#94A3B8' }}>불러오는 중…</div>}
        {!loading && error && (
          <div>
            <div style={{ fontSize: 10, color: '#DC2626' }}>이력을 불러오지 못했습니다</div>
            <button
              type="button" onClick={onRetry}
              style={{
                marginTop: 6, padding: '4px 9px', borderRadius: 6, border: '1px solid #E2E8F0',
                background: '#fff', color: '#475569', fontSize: 10, fontWeight: 700, cursor: 'pointer',
                fontFamily: FONT,
              }}
            >
              다시 시도
            </button>
          </div>
        )}
        {!loading && !error && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(rows || []).map((h, i) => (
              <div key={`${h.changedAt}-${i}`} style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                <div style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: i === 0 ? squad.color : '#CBD5E1', marginTop: 4, flexShrink: 0,
                }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#334155' }}>
                    {h.fromStatus ? squadStatusLabel(h.fromStatus) : '생성'} → {squadStatusLabel(h.toStatus)}
                  </div>
                  <div style={{ fontSize: 9, color: '#94A3B8', fontFamily: MONO, marginTop: 1 }}>
                    {h.changedBy?.name || '알 수 없음'} · {String(h.changedAt || '').slice(2, 16).replace(/-/g, '.').replace('T', ' ')}
                  </div>
                </div>
              </div>
            ))}
            {(!rows || rows.length === 0) && (
              <div style={{ fontSize: 10, color: '#CBD5E1' }}>기록이 없습니다</div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
