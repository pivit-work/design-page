import { NoteText, SectionTitle } from '../shared/SharedText.jsx';

/**
 * 구성원 «내 휴가» 맨 위 연차 카드 (pivit-work PW-2564 · 기획 screen-leave-my §2 «연차 요약 4칸» · «진행 막대»).
 *
 * 디자이너 휴가 화면 원본이 아직 없어 개발이 만든 틀이다(design-review). 숫자 칸은 매니저 KPI 칸
 * (`ManagerStatTile` — stesslee 2026-05-09 의 `manager-kpi-card manager-stat-tile` · `manager-stat-label` · `manager-stat-value`)을
 * 그대로 쓰고 아래 보조 줄만 더했다. 상자는 같은 화면 촉진 카드 상자와 같은 틀(바탕 · 둥근 모서리 · 안쪽 16)이다.
 * 글과 숫자는 앱이 다 만들어 넘긴다 — 이 부품은 자리만 정한다.
 *
 *   <LeaveAnnualCard title="연차" aside="기산일 …" tiles={[{ key, label, value, sub, tone }]}
 *     bar={[{ key: 'used'|'planned'|'available', minutes, title }]} legend={[{ part, text }]} legendEnd="다음 부여 …">
 *     {회색 안내 줄 — 범례 아래}
 *   </LeaveAnnualCard>
 *
 * `bar` 를 비우면(부여 0) 막대 · 범례 대신 `children` 만 그 자리에 놓는다(정책서 §3 «부여 0 — 이유별 안내»).
 * `tone` — 'brand'(사용 가능 강조) · 'warning'(소멸 30일 이하 숫자).
 */
export default function LeaveAnnualCard({
  title,
  aside,
  tiles = [],
  bar = null,
  legend = [],
  legendEnd = null,
  children,
  testId,
  asideTestId,
  barTestId,
  legendEndTestId,
}) {
  const total = (bar || []).reduce((s, p) => s + Math.max(p.minutes, 0), 0) || 1;
  return (
    <section className="leave-card" data-testid={testId}>
      <div className="leave-card-head">
        <SectionTitle as="h2">{title}</SectionTitle>
        {aside && (
          <NoteText className="leave-card-aside" data-testid={asideTestId}>
            {aside}
          </NoteText>
        )}
      </div>
      <div className="leave-tiles">
        {tiles.map((x) => (
          <div
            key={x.key}
            className={`manager-kpi-card manager-stat-tile leave-tile${x.tone ? ` is-${x.tone}` : ''}`}
            data-testid={x.testId}
            data-tone={x.tone || undefined}
          >
            <p className="manager-stat-label">{x.label}</p>
            <p className="manager-stat-value">{x.value}</p>
            {x.sub && <NoteText>{x.sub}</NoteText>}
          </div>
        ))}
      </div>
      <div className="leave-card-foot">
        {bar && bar.length > 0 && (
          <>
            <div className="leave-bar" data-testid={barTestId}>
              {bar.map((p) => (
                <div
                  key={p.key}
                  className={`leave-bar-part is-${p.key}`}
                  data-part={p.key}
                  title={p.title}
                  style={{ width: `${(Math.max(p.minutes, 0) / total) * 100}%` }}
                />
              ))}
            </div>
            <div className="leave-legend">
              {legend.map((l) => (
                <span key={l.part} className="leave-legend-item">
                  <span aria-hidden="true" className={`leave-legend-swatch is-${l.part}`} />
                  {l.text}
                </span>
              ))}
              {legendEnd && (
                <span className="leave-legend-item leave-legend-end" data-testid={legendEndTestId}>
                  {legendEnd}
                </span>
              )}
            </div>
          </>
        )}
        {children}
      </div>
    </section>
  );
}
