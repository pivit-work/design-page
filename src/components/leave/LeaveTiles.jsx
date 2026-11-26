import { NoteText } from '../shared/SharedText.jsx';
import Tooltip from '../shared/Tooltip.jsx';

/**
 * 휴가 화면 숫자 칸 줄 — «내 휴가» 연차 카드 네 칸(PW-2564)을 꺼낸 것(pivit-work PW-2688).
 *
 * 칸은 매니저 KPI 칸(`ManagerStatTile` — stesslee 2026-05-09 의 `manager-kpi-card manager-stat-tile` ·
 * `manager-stat-label` · `manager-stat-value`) 그대로다. 같은 화면 연차 사용 촉진 카드의 «남은 연차 · 계획할 양 ·
 * 사용 계획 등록 기한» 세 칸도 이 줄을 써서 위 «연차» 네 칸과 같은 모양이 된다.
 *
 *   <LeaveTiles tiles={[{ key, label, value, valueAside, sub, tone, testId }]} />
 *
 * `tone` — 'brand'(사용 가능 강조) · 'warning'(소멸 · 기한 숫자). `valueAside` — 숫자 옆 작은 회색 글(«D-10»).
 * `labelTitle` — 칸 이름 전체(길면 칸에서 «…»로 줄고 공용 말풍선으로 보인다).
 * `onClick` — 칸을 누를 수 있다(pivit-work PW-2816 «다른 휴가» 카드 → 부여 내역 그 종류). 생김새는 같고 `<button>` 으로 그린다.
 *
 * `layout` — 'band'(기본 · PW-2930): 칸들을 테두리 하나 안에 세로선으로 나눈 한 띠(«연차» 네 칸 · 촉진 세 칸).
 *   'row': 칸마다 테두리 · 한 줄 다섯 칸 · 높이는 내용만큼(«다른 휴가»). 글씨는 둘 다 매니저 KPI 칸 그대로.
 */
export default function LeaveTiles({ tiles = [], layout = 'band', testId }) {
  return (
    <div className={`leave-tiles is-${layout}`} data-testid={testId}>
      {tiles.map((x) => {
        const Tag = x.onClick ? 'button' : 'div';
        return (
          <Tag
            key={x.key}
            type={x.onClick ? 'button' : undefined}
            onClick={x.onClick}
            className={`manager-kpi-card manager-stat-tile leave-tile${x.tone ? ` is-${x.tone}` : ''}${x.onClick ? ' is-openable' : ''}`}
            data-testid={x.testId}
            data-tone={x.tone || undefined}
          >
            {/* 칸 이름이 칸보다 길면 «…»로 줄이고 공용 말풍선(labelTitle)으로 전체 이름을 보인다(PW-2816). */}
            <Tooltip content={x.labelTitle} wrap={false}>
              <p className="manager-stat-label">{x.label}</p>
            </Tooltip>
            <p className="manager-stat-value">
              {x.value}
              {x.valueAside && <span className="leave-tile-aside">{x.valueAside}</span>}
            </p>
            {/* 설명 줄이 없는 칸도 그 줄 자리를 둔다 — 같은 화면 «연차» 칸(설명 줄 있음)과 높이가 같게(PW-2688 시안). */}
            {x.sub ? (
              <NoteText tone="read" data-testid={x.subTestId}>{x.sub}</NoteText>
            ) : (
              <NoteText aria-hidden="true">{'\u00a0'}</NoteText>
            )}
          </Tag>
        );
      })}
    </div>
  );
}
