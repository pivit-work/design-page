import { NoteText } from '../shared/SharedText.jsx';

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
 */
export default function LeaveTiles({ tiles = [], testId }) {
  return (
    <div className="leave-tiles" data-testid={testId}>
      {tiles.map((x) => (
        <div
          key={x.key}
          className={`manager-kpi-card manager-stat-tile leave-tile${x.tone ? ` is-${x.tone}` : ''}`}
          data-testid={x.testId}
          data-tone={x.tone || undefined}
        >
          <p className="manager-stat-label">{x.label}</p>
          <p className="manager-stat-value">
            {x.value}
            {x.valueAside && <span className="leave-tile-aside">{x.valueAside}</span>}
          </p>
          {/* 설명 줄이 없는 칸도 그 줄 자리를 둔다 — 같은 화면 «연차» 칸(설명 줄 있음)과 높이가 같게(PW-2688 시안). */}
          {x.sub ? (
            <NoteText data-testid={x.subTestId}>{x.sub}</NoteText>
          ) : (
            <NoteText aria-hidden="true">{'\u00a0'}</NoteText>
          )}
        </div>
      ))}
    </div>
  );
}
