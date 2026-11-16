import { NoteText } from "../shared/SharedText.jsx";
import StatusBadge from "../shared/StatusBadge.jsx";

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
 * `onClick` — 칸을 누를 수 있다(pivit-work PW-2816 «다른 휴가» 카드 → 부여 내역 그 종류). 생김새는 같고 `<button>` 으로 그린다.
 *
 * `more` — 칸 줄 끝 점선 묶음(PW-2816 «그 밖에 신청할 수 있는 휴가» · 기획 시안 leave-app.jsx 점선 상자):
 *   { title, items: [{ key, label }], testId } — 칸 두 개 폭 · 회색 안내 한 줄 + 회색 딱지 목록.
 */
export default function LeaveTiles({ tiles = [], more = null, testId }) {
  return (
    <div className="leave-tiles" data-testid={testId}>
      {tiles.map((x) => {
        const Tag = x.onClick ? "button" : "div";
        return (
          <Tag
            key={x.key}
            type={x.onClick ? "button" : undefined}
            onClick={x.onClick}
            className={`manager-kpi-card manager-stat-tile leave-tile${x.tone ? ` is-${x.tone}` : ""}${x.onClick ? " is-openable" : ""}`}
            data-testid={x.testId}
            data-tone={x.tone || undefined}
          >
            <p className="manager-stat-label">{x.label}</p>
            <p className="manager-stat-value">
              {x.value}
              {x.valueAside && (
                <span className="leave-tile-aside">{x.valueAside}</span>
              )}
            </p>
            {/* 설명 줄이 없는 칸도 그 줄 자리를 둔다 — 같은 화면 «연차» 칸(설명 줄 있음)과 높이가 같게(PW-2688 시안). */}
            {x.sub ? (
              <NoteText data-testid={x.subTestId}>{x.sub}</NoteText>
            ) : (
              <NoteText aria-hidden="true">{"\u00a0"}</NoteText>
            )}
          </Tag>
        );
      })}
      {more && (
        <div className="leave-tiles-more" data-testid={more.testId}>
          <NoteText>{more.title}</NoteText>
          <div className="leave-tiles-more-items">
            {more.items.map((i) => (
              <StatusBadge
                key={i.key}
                tone="neutral"
                className="evc-status-badge"
              >
                {i.label}
              </StatusBadge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
