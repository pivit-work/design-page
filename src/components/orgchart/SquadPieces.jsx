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

import { useEffect, useRef } from 'react';
import { useDismissLayer, useViewportTick } from './hooks.js';
import {
  CAPACITY,
  CAPACITY_IDLE_HINT,
  HIST_LIST_MAX_H,
  POP_W,
  SQUAD_BASE,
  SQUAD_MENU_Z,
  SQUAD_ANCHOR_ASSIGN,
  assignPopoverVertical,
  capacityState,
  clampPct,
  cumulativePct,
  squadComposition,
  squadStatusLabel,
} from './squad-constants.js';
import { LeadStarIcon, LeadStarOutlineIcon } from './squadIcons.jsx';
import AnchoredLayer from '../shared/AnchoredLayer.jsx';

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
 * 배분 바 — 트랙 전체 = `max(100, 배분 합계)` (§5-3.4).
 *
 * 캐파 게이지(`CapacityBar`)와 **같은 규칙**으로 초과분에 빗금을 치고 100 지점에 눈금을
 * 긋는다. 다른 점은 분모다 — 여기는 **이 스쿼드의 볼륨 100**, 저기는 **그 사람의 캐파
 * 100**. 미배분(합계 < 100)은 잔여 구간을 회색으로 남겨 "아직 안 나눈 몫"을 숨기지 않는다.
 */
export function ShareBar({ rows, allotted, colorOf, height = 12 }) {
  const scale = Math.max(SQUAD_BASE, allotted);
  const pc = (v) => (v / scale) * 100;
  const filled = (rows || []).filter((r) => r.share > 0);
  // 각 세그먼트가 100을 넘긴 몫(빗금 구간)을 알려면 "끝나는 지점"이 필요하다.
  const cumulative = cumulativePct(filled.map((r) => ({ pct: r.share })));

  return (
    <div className="sq-share" data-testid="squad-share-bar">
      <div className="sq-share-track pj-progress-bar" style={{ height }}>
        {filled.map((r, i) => {
          const over = Math.max(0, Math.min(r.share, cumulative[i] - SQUAD_BASE));
          const c = colorOf(r.userId);
          return (
            <div
              key={r.userId}
              className="sq-share-seg"
              title={`${r.label} — 스쿼드 내 비중 ${r.share}% · 개인 캐파 사용 ${r.pct}%`}
              style={{ width: `${pc(r.share)}%` }}
            >
              <div
                className="sq-share-fill"
                style={{ width: `${((r.share - over) / r.share) * 100}%`, background: c }}
              />
              <div
                className="sq-share-over"
                style={{
                  width: `${(over / r.share) * 100}%`,
                  background: `repeating-linear-gradient(45deg, ${c}, ${c} 2px, var(--utility-error-200) 2px, var(--utility-error-200) 4px)`,
                }}
              />
            </div>
          );
        })}
        {allotted < SQUAD_BASE && (
          <div
            className="sq-share-rest"
            data-testid="squad-share-unallotted"
            title={`미배분 ${SQUAD_BASE - allotted}%p`}
            style={{ width: `${pc(SQUAD_BASE - allotted)}%` }}
          />
        )}
      </div>
      {allotted > SQUAD_BASE && (
        <div className="sq-share-mark" title="스쿼드 100%" style={{ left: `${pc(SQUAD_BASE)}%` }} />
      )}
    </div>
  );
}

/** `배분 완료` / `초과 n%p` / `미배분 n%p` — 카드·팝오버가 같은 문구를 쓴다. */
function allotmentNote(allotted) {
  const diff = allotted - SQUAD_BASE;
  if (diff === 0) return '배분 완료';
  return diff > 0 ? `초과 ${diff}%p` : `미배분 ${-diff}%p`;
}

/**
 * 팀원 리소스 구성 — **스쿼드 100 기준 비중** (§5-3.4).
 *
 * 🔴 소스는 `sharePct` **원값**이다. 캐파값에서 계산하지 않는다(§5-3.1).
 * 캐파 축(합계·인분)은 분모가 달라 **별도 줄**로 내린다 — 두 줄을 붙여 놓은 것이
 * 종전 오독의 출발점이었다. 인분(FTE) 환산이 가능한 쪽은 캐파뿐이다.
 */
export function SquadComposition({ squad, members, personOf }) {
  const { allotted, capSum, fte, rows } = squadComposition(members);
  if (!members || members.length === 0) return null;

  const colorOf = (userId) => personOf(userId)?.color || squad.color;
  const nameOf = (userId) => personOf(userId)?.name || '알 수 없는 구성원';
  const over = allotted > SQUAD_BASE;

  return (
    <div data-testid="squad-composition">
      <div className="sq-comp-head">
        <span className="sq-comp-title">팀원 리소스 구성</span>
        <span className="sq-comp-basis">스쿼드 100 기준</span>
        <span className="sq-comp-total" data-testid="squad-allotment">
          배분 <b className={over ? 'is-over' : undefined}>{allotted}</b> / 100
          <span className={`sq-comp-note${over ? ' is-over' : ''}`}>{allotmentNote(allotted)}</span>
        </span>
      </div>

      {allotted === 0 ? (
        // 캐파는 잡혀 있는데 배분만 안 된 상태가 실제로 존재한다 — 아래 캐파 줄은 그대로 둔다(§10-A9).
        <div className="sq-comp-none">배분된 비중이 없습니다 (전원 0%)</div>
      ) : (
        <>
          <ShareBar
            rows={rows.map((r) => ({ ...r, label: nameOf(r.userId) }))}
            allotted={allotted}
            colorOf={colorOf}
          />

          {/* 범례 — 비중을 크게, 캐파 사용은 괄호로 병기해 두 축을 혼동하지 않게 한다 */}
          <div className="sq-comp-legend">
            {rows.map((r) => (
              <span
                key={r.userId}
                className="sq-comp-item"
                data-testid={`squad-comp-item-${r.userId}`}
                title={[
                  `${nameOf(r.userId)} — 스쿼드 내 비중 ${r.share}% · 개인 캐파 사용 ${r.capacityUnset ? '미설정' : `${r.pct}%`}`,
                  r.capacityIdle ? CAPACITY_IDLE_HINT : '',
                ].filter(Boolean).join('\n')}
              >
                <span className="sq-comp-swatch" style={{ background: colorOf(r.userId) }} />
                {r.role === 'lead' && (
                  <span className="sq-lead-mark"><LeadStarIcon size={11} /></span>
                )}
                <span className="sq-comp-name">{nameOf(r.userId)}</span>
                <span className="sq-comp-share">{r.share}%</span>
                <span className="sq-comp-raw">(캐파 {r.capacityUnset ? '—' : r.pct})</span>
                {/* 배분은 받았는데 그 시간이 아무의 캐파에도 안 잡힌 자리(§10-A15).
                    차단이 아니라 «여기 아직 안 정해졌다» 를 표에서 짚어 주는 표식이다 */}
                {r.capacityIdle && (
                  <span
                    className="sq-idle-dot"
                    data-testid={`squad-comp-cap-idle-${r.userId}`}
                    title={CAPACITY_IDLE_HINT}
                    aria-hidden
                  />
                )}
              </span>
            ))}
          </div>
        </>
      )}

      {/* 캐파 축 — 분모가 달라 같은 줄에 두지 않는다. 인분 환산이 가능한 쪽은 여기뿐이다 */}
      <div
        className="sq-comp-capline"
        data-testid="squad-capsum"
        title="스쿼드 내 비중과 분모가 다른 값입니다 (사람마다의 캐파 100 기준 합)"
      >
        <span className="sq-comp-capline-label">이 스쿼드가 쓰는 인력</span>
        <span className="sq-comp-capline-value">캐파 합 {capSum}% · 약 {fte.toFixed(1)}인분</span>
      </div>
    </div>
  );
}

/**
 * 배정 편집 팝오버 — **슬라이더 2개**(① 스쿼드 내 비중 · ② 개인 캐파 사용) · 리드 지정 ·
 * 배정 해제 (§5-3.3 · §5-3.7).
 *
 * 🔴 **두 슬라이더는 완전히 독립이다.** 한쪽을 움직여도 다른 쪽 값과 미리보기는 갱신되지
 * 않는다 — 스쿼드 볼륨(절대 공수) 원장이 없어 둘 사이의 변환식이 성립하지 않기 때문이다.
 * 한쪽이 다른 쪽을 따라 움직이면 그 순간 폐기한 파생 산식이 되살아난 것이고, 그것이
 * 버그다(§10-A17). 두 슬라이더 사이의 구분 캡션도 **생략할 수 없다** — 이 화면에서 오독이
 * 가장 잦은 지점이라 상시 노출한다.
 *
 * 권한도 축마다 다르다 — ① 비중은 조직이 정하고(`canEditShare`), ② 캐파는 본인이
 * 정한다(`canEditCapacity`). 본인에게 ①을 **감추지 않고 읽기 전용으로** 보여주는 이유:
 * 내 캐파를 정하려면 내가 이 스쿼드에서 어느 정도 몫을 지는지 알아야 한다.
 *
 * `othersPct`   = 이 사람이 **다른 활성 스쿼드**에 이미 쓰고 있는 캐파
 * `othersShare` = **이 스쿼드의 다른 팀원들**이 이미 가져간 비중
 */
export function SquadAssignPopover({
  pos, anchorSelector = null, anchorRect = null,
  squad, assignment, personName, othersPct = 0, othersShare = 0, counted = true,
  canEditShare = true, canEditCapacity = true, isSelf = false,
  onSetShare, onSetPct, onToggleLead, onRemove, onClose,
}) {
  const boxRef = useRef(null);
  // 바깥 클릭·Escape — 백드롭을 깔지 않는다. 깔면 뒤 화면 스크롤이 통째로 죽는다(PW-109).
  useDismissLayer(onClose, boxRef, SQUAD_ANCHOR_ASSIGN);
  // 배경이 스크롤되면 다시 그린다 — 아래에서 앵커를 실측해 따라간다.
  useViewportTick();

  const isLead = assignment.role === 'lead';

  // 앵커(셀·칩)가 열 때 자리에서 얼마나 움직였는지를 재서 팝오버도 같은 만큼 옮긴다.
  // 따라가지 않으면 배경 스크롤이 팝오버를 엉뚱한 행 위에 남긴다 — 배경을 잠그던
  // 종전 방식(§5-3.8)이 막으려던 것이 바로 이것이다(PW-109).
  //
  // 기준 좌표(`anchorRect`)는 **열 때 부모가 재서 넘긴다.** 여기서 ref 에 담아 두면
  // 렌더 중 ref 를 읽게 되고, 그러면 배치가 렌더 순서에 좌우된다. `pos`(클릭 지점)를
  // 기준으로 삼는 것은 §5-3.8 그대로다 — 따라가는 것은 그 기준점 자체다.
  //
  // 🔴 앵커는 **DOM 노드가 아니라 셀렉터로** 들고 있다가 매번 다시 찾는다. 노드를
  // 그대로 붙들면 슬라이더를 한 번 움직여 저장하는 순간(부모가 목록을 다시 그린다)
  // 그 노드가 문서에서 떨어져 나가고, 떨어진 노드의 `getBoundingClientRect()` 는
  // 전부 0 이라 **「앵커가 화면 밖」으로 오판해 팝오버가 저 혼자 닫힌다.**
  const anchorEl = anchorSelector ? document.querySelector(anchorSelector) : null;
  const rect = anchorEl ? anchorEl.getBoundingClientRect() : null;
  // 폭·높이가 0 이면 아직 그려지지 않았거나 숨겨진 것이다 — 그 값으로 배치를 옮기지 않는다.
  const live = rect && (rect.width > 0 || rect.height > 0) ? rect : null;
  const origin = live && anchorRect
    ? { x: pos.x + (live.left - anchorRect.left), y: pos.y + (live.top - anchorRect.top) }
    : pos;

  // 앵커가 뷰포트를 완전히 벗어나면 닫는다 — 보이지 않는 셀의 값을 고치고 있는 상태를
  // 만들지 않는다. 값은 조작 즉시 저장되므로 닫혀도 잃는 것이 없다.
  const anchorGone = !!live && (live.bottom <= 0 || live.top >= window.innerHeight);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });
  useEffect(() => { if (anchorGone) closeRef.current(); }, [anchorGone]);

  const x = Math.max(8, Math.min(origin.x, window.innerWidth - POP_W - 16));
  // 세로 배치는 **가용 공간을 재서** 고른다 — 높이를 상수로 가정하면 뷰포트 하단에서
  // ②·액션이 화면 밖으로 밀려나고 스크롤도 걸리지 않는다(§5-3.8 · PW-109).
  // 따라가는 중에도 매번 다시 계산해야 한다 — 안 그러면 따라가다 화면 밖으로 나간다.
  const vert = assignPopoverVertical(origin.y, window.innerHeight);

  const sharePct = assignment.sharePct || 0;
  // ① 배분 합계는 **스쿼드 상태와 무관**하다 — 그 스쿼드 안의 사실이기 때문(§5-3.3).
  const allotted = othersShare + sharePct;
  const shareOver = allotted > SQUAD_BASE;

  const capacityUnset = assignment.capacitySetBy == null;
  // ② 캐파 합계는 완료·보관 스쿼드를 뺀다 — 분모가 "지금 이 사람의 시간" 이라서다.
  const total = othersPct + (counted ? assignment.allocationPct : 0);
  const cst = capacityState(total);
  const diff = total - CAPACITY;

  return (
    <>
      <div
        ref={boxRef}
        data-testid="squad-assign-popover"
        className="sq-pop"
        style={{ position: 'fixed', left: x, ...vert, width: POP_W, zIndex: SQUAD_MENU_Z }}
      >
        <div className="sq-pop-strip" style={{ background: squad.color }} />
        {/* 헤더 — 함께 흘려보내지 않는다. 스크롤 중 대상을 잃으면 잘못된 사람의 값을 바꾼다(§5-3.8) */}
        <div className="sq-pop-head">
          <p className="sq-pop-title">
            {personName} <span className="sq-pop-x">×</span> {squad.name}
          </p>
          <p className="sq-pop-desc">
            분모가 다른 두 값을 따로 정합니다 · 리드 지정 (스쿼드당 1명)
          </p>
        </div>

        {/* 본문 — 넘치는 만큼 여기만 스크롤한다. `min-height: 0` 이 없으면 flex 자식이
            줄지 않아 스크롤이 걸리지 않는다(§5-3.8) */}
        <div className="sq-pop-body" data-testid="squad-assign-popover-body">
          {/* ① 스쿼드 내 비중 — 분모는 이 스쿼드의 볼륨 100 */}
          <p className="sq-pop-axis">
            ① 스쿼드 내 비중 <span className="sq-pop-axis-basis">이 스쿼드 100 기준</span>
            {!canEditShare && <span className="sq-pop-axis-owner">· 조직이 정하는 값</span>}
          </p>
          <div className={`sq-pop-row${canEditShare ? '' : ' is-readonly'}`}>
            <input
              type="range" min={0} max={100} step={5} value={sharePct} disabled={!canEditShare}
              aria-label="스쿼드 내 비중"
              onChange={(e) => onSetShare?.(clampPct(e.target.value))}
              style={{ flex: 1, accentColor: squad.color }}
            />
            <input
              type="number" min={0} max={100} value={sharePct} disabled={!canEditShare}
              aria-label="스쿼드 내 비중 직접 입력"
              className="sq-pop-num"
              onChange={(e) => onSetShare?.(clampPct(e.target.value))}
            />
            <span className="sq-pop-unit">%</span>
          </div>

          {/* 배분 미리보기 — 다른 팀원(회색) + 나(스쿼드색). 분모는 이 스쿼드 100 */}
          <div className={`sq-pop-preview${shareOver ? ' is-over' : ''}`} data-testid="squad-pop-share-preview">
            <div className="sq-pop-preview-head">
              <span className="sq-pop-preview-label">이 스쿼드 배분</span>
              <span className={`sq-cap-total${shareOver ? ' is-over' : ''}`}>{allotted}</span>
              <span className="sq-cap-max">/ 100</span>
              <span className={`sq-pop-preview-state${shareOver ? ' is-over' : ''}`}>
                {allotmentNote(allotted)}
              </span>
            </div>
            <ShareBar
              rows={[
                { userId: 'others', label: '다른 팀원', share: othersShare, pct: 0 },
                { userId: assignment.userId, label: personName, share: sharePct, pct: assignment.allocationPct },
              ]}
              allotted={allotted}
              colorOf={(id) => (id === 'others' ? 'var(--text-quaternary)' : squad.color)}
              height={7}
            />
          </div>

          {/* 두 축의 경계 — 생략 불가. 이 화면에서 오독이 가장 잦은 지점이다(§5-3.3) */}
          <div className="sq-pop-divider" data-testid="squad-pop-axis-divider">
            <span className="sq-pop-divider-line" />
            <span className="sq-pop-divider-label">두 값은 연동되지 않습니다</span>
            <span className="sq-pop-divider-line" />
          </div>
          <p className="sq-pop-divider-desc">
            스쿼드 볼륨(절대 공수)이 정해지기 전까지 캐파 사용은 직접 정합니다 — 비중을 바꿔도 아래 값은 그대로입니다.
          </p>

          {/* ② 개인 캐파 사용 — 분모는 이 사람의 캐파 100 */}
          <p className="sq-pop-axis">
            ② 개인 캐파 사용 <span className="sq-pop-axis-basis">내 캐파 100 기준</span>
            {isSelf
              ? <span className="sq-pop-axis-owner is-self">· 내가 정하는 값</span>
              : <span className="sq-pop-axis-owner">· 본인 대신 조정</span>}
          </p>
          {capacityUnset && (
            <p className="sq-pop-note">
              아직 설정되지 않았습니다 — 저장하기 전까지 캐파 합계에 포함되지 않습니다.
            </p>
          )}
          {assignment.capacitySetBy === 'manager' && !capacityUnset && (
            <p className="sq-pop-note">
              관리자가 조정한 값입니다. 본인이 다시 저장하면 본인 설정으로 돌아갑니다.
            </p>
          )}
          <div className={`sq-pop-row${canEditCapacity ? '' : ' is-readonly'}`}>
            <input
              type="range" min={0} max={100} step={5} value={assignment.allocationPct}
              disabled={!canEditCapacity}
              aria-label="개인 캐파 사용"
              onChange={(e) => onSetPct?.(clampPct(e.target.value))}
              style={{ flex: 1, accentColor: squad.color }}
            />
            <input
              type="number" min={0} max={100} value={assignment.allocationPct}
              disabled={!canEditCapacity}
              aria-label="개인 캐파 사용 직접 입력"
              className="sq-pop-num"
              onChange={(e) => onSetPct?.(clampPct(e.target.value))}
            />
            <span className="sq-pop-unit">%</span>
          </div>

          {/* 캐파 영향 미리보기 — 이 값이 그 사람의 100 중 어디에 놓이는지 즉시 보여준다 */}
          <div
            className="sq-pop-preview"
            data-testid="squad-pop-capacity-preview"
            style={{ background: cst.bg, borderColor: cst.bd }}
          >
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
                { id: squad.id, name: squad.name, color: squad.color, pct: counted && !capacityUnset ? assignment.allocationPct : 0 },
              ].filter((s) => s.pct > 0)}
              total={total} width={240} height={8}
            />
            {!counted && (
              <div className="sq-pop-note">
                이 스쿼드는 {squadStatusLabel(squad.status)} 상태라 캐파 합계에 포함되지 않습니다. (비중은 상태와 무관하게 계산됩니다)
              </div>
            )}
            {/* §5-3.6 — 안내는 이 한 조합에만. 「비중 50 · 캐파 10」 은 정상이라 경고하지 않는다 */}
            {sharePct > 0 && assignment.allocationPct === 0 && !capacityUnset && (
              <div className="sq-pop-note">
                비중은 잡혀 있는데 캐파 사용이 0입니다 — 저장은 되지만 과부하 판단에 반영되지 않습니다.
              </div>
            )}
          </div>

        </div>

        {/* 액션 — 하단 고정. 본문과 함께 흘려보내면 팝오버가 길어졌을 때 화면 밖으로
            밀려나고, 액션이 안 보이는 상태는 편집을 끝낼 수 없는 상태와 같다(§5-3.8).
            리드 지정·배정 해제는 조직의 결정이라 ① 권한을 따른다 — 본인에게는 미노출 */}
        {canEditShare && (
          <div className="sq-pop-foot" data-testid="squad-assign-popover-actions">
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
        )}
      </div>
    </>
  );
}

/**
 * 상태 전이 이력 팝오버 — append-only 감사 로그(§5-2-A).
 * 생성 행(`fromStatus: null`)이 항상 있으므로 0건일 수 없다.
 *
 * 행이 지워지지 않고 **쌓이기만 하므로** 오래된 스쿼드는 반드시 넘친다 — 목록에
 * `maxHeight` + 스크롤을 건다(§5-3.8, 배정 편집 팝오버와 같은 규칙).
 */
export function SquadHistoryPopover({
  anchorSelector = null, squad, rows, loading, error, onRetry, onClose,
}) {
  const boxRef = useRef(null);
  // 백드롭 없이 바깥 클릭·Escape 로 닫는다 — 이력을 보는 동안에도 뒤 화면은 움직인다(PW-109).
  // 이력은 `⋯ > 이력` 메뉴 항목에서 열리고 그 항목은 곧바로 사라지므로 제외할 트리거가 없다.
  useDismissLayer(onClose, boxRef);

  // 배치는 `AnchoredLayer` 가 카드 우상단 액션 줄을 실측해서 준다 (PW-313).
  // 종전에는 `.sq-hist { position: absolute; top: calc(100% + 6px) }` 뿐이라 카드의
  // `overflow: hidden` 에 잘리고, 창이 낮으면 300px 짜리 팝오버가 화면 아래로 넘어갔다.
  return (
    <>
      <AnchoredLayer
        anchorSelector={anchorSelector}
        align="right"
        panelRef={boxRef}
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
          <div
            className="sq-hist-list"
            data-testid="squad-history-list"
            style={{ maxHeight: HIST_LIST_MAX_H }}
          >
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
      </AnchoredLayer>
    </>
  );
}
