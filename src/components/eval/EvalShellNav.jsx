import Tabs from '../shared/Tabs.jsx';
import Tooltip from '../shared/Tooltip.jsx';

/**
 * EvalShellNav — 평가 화면 공통 서브 내비게이션.
 *
 * 기획서 `G. 성과평과 & feedback/eval-app.jsx` 의 `EvalSubNav` 를 옮긴 것이다.
 * 3뎁스 구조: **도메인(정기 평가 / 수시 피드백) → 섹션 → 화면**.
 *
 * 모양은 여러 화면이 같이 쓰는 조각을 따른다 (PW-832 · 2026-09-22 커트 결정 (나)):
 *   - 1행: 도메인 — OKR·조직도 맨 위와 같은 큰 제목 탭(`org_chart.css` 의 `.tab-nav`).
 *     그 스타일시트는 소비측이 함께 불러야 한다(OKR 화면과 같은 방식).
 *   - 2행: 선택 도메인의 화면들 — 공용 `Tabs`(타임라인 「간트 / 캘린더」와 같은 밑줄 탭).
 *     섹션 사이 세로 구분선은 탭 부품에 자리가 없어 없앴고, 도메인 설명은 줄 오른쪽에 둔다.
 *
 * 시안의 '역할 전환기'는 데모용(`TODO(auth)`)이라 옮기지 않았다 — 실제 앱은
 * 로그인 사용자의 역할로 항목을 필터해서 넘긴다.
 *
 * 순수 컴포넌트: 라우팅을 모른다. 항목 구성·활성 판정·이동은 모두 호출측 몫이다.
 *
 * @param {object}   props
 * @param {string}   props.title            내비의 이름표(aria-label). 화면에는 쓰지 않는다 — OKR 도 맨 위 줄에 따로 제목이 없다
 * @param {Array}    props.domains          [{ id, label, desc }]
 * @param {string}   props.activeDomain     활성 도메인 id
 * @param {Function} props.onDomainChange   (domainId) => void
 * @param {Array}    props.sections         활성 도메인의 섹션 [{ id, label, items: [{ id, label }] }]
 * @param {string}   props.activeItemId     활성 화면 id (부모 탭 하이라이트는 호출측이 부모 id 를 넘겨 처리)
 * @param {Function} props.onSelect         (itemId) => void
 */
export default function EvalShellNav({
  title = '평가',
  domains = [],
  activeDomain,
  onDomainChange,
  sections = [],
  activeItemId,
  onSelect,
}) {
  const desc = domains.find((d) => d.id === activeDomain)?.desc || '';
  const items = sections.flatMap((sec) =>
    (sec.items || []).map((item) => ({ value: item.id, label: item.label, testId: `evnav-item-${item.id}` })),
  );
  if (domains.length === 0) return null;

  return (
    <nav className="evnav-nav" aria-label={title}>
      <div className="tab-nav evnav-domains">
        {domains.map((d) => {
          const on = d.id === activeDomain;
          return (
            <Tooltip key={d.id} content={d.desc || undefined}>
            <button
              type="button"
              aria-current={on ? 'true' : undefined}
              className={on ? 'tab-active' : 'tab-inactive'}
              onClick={() => !on && onDomainChange?.(d.id)}
              data-testid={`evnav-domain-${d.id}`}
            >
              {d.label}
            </button>
            </Tooltip>
          );
        })}
      </div>

      {(items.length > 0 || desc) && (
        <div className="tl-tabs-row evnav-views">
          {items.length > 0 ? (
            <Tabs items={items} value={activeItemId} onChange={(id) => onSelect?.(id)} />
          ) : (
            <span />
          )}
          {desc && <span className="evnav-desc">{desc}</span>}
        </div>
      )}
    </nav>
  );
}
