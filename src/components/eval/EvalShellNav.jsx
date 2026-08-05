/**
 * EvalShellNav — 평가 화면 공통 서브 내비게이션.
 *
 * 기획서 `G. 성과평과 & feedback/eval-app.jsx` 의 `EvalSubNav` 를 정본으로 포팅했다.
 * 3뎁스 구조: **도메인(정기 평가 / 수시 피드백) → 섹션 → 화면**.
 *   - 1행: 타이틀 + 도메인 1차 탭(언더라인)
 *   - 2행: 선택 도메인의 섹션별 화면 탭(알약) + 도메인 설명
 *
 * 시안의 '역할 전환기'는 데모용(`TODO(auth)`)이라 옮기지 않았다 — 실제 앱은
 * 로그인 사용자의 역할로 항목을 필터해서 넘긴다.
 *
 * 순수 컴포넌트: 라우팅을 모른다. 항목 구성·활성 판정·이동은 모두 호출측 몫이다.
 *
 * @param {object}   props
 * @param {string}   props.title            좌측 타이틀 (기본 '평가')
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
  const hasTabs = sections.some((s) => (s.items || []).length > 0);
  if (domains.length === 0) return null;

  return (
    <nav className="evnav-nav" aria-label={title}>
      <div className="evnav-row evnav-row-domain">
        <span className="evnav-title">{title}</span>
        <div className="evnav-domains" role="tablist" aria-label={title}>
          {domains.map((d) => {
            const on = d.id === activeDomain;
            return (
              <button
                key={d.id}
                type="button"
                role="tab"
                aria-selected={on}
                title={d.desc || ''}
                className={`evnav-domain${on ? ' is-active' : ''}`}
                onClick={() => onDomainChange?.(d.id)}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      {(hasTabs || desc) && (
        <div className="evnav-row evnav-row-views">
          {sections.map((sec, si) => {
            const items = sec.items || [];
            if (items.length === 0) return null;
            return (
              <div className="evnav-section" key={sec.id || sec.label || si}>
                {si > 0 && <span className="evnav-divider" aria-hidden="true" />}
                <div className="evnav-items">
                  {items.map((item) => {
                    const on = item.id === activeItemId;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`evnav-item${on ? ' is-active' : ''}`}
                        aria-current={on ? 'page' : undefined}
                        onClick={() => onSelect?.(item.id)}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {desc && <span className="evnav-desc">· {desc}</span>}
        </div>
      )}
    </nav>
  );
}
