import Button from '../shared/Button.jsx';

/**
 * OkrOrgPath — OKR 조직 축 탭·개인 탭의 경로 줄 «전사 / … / 지금 위치» (pivit-work PW-2763 · okr-policy §3.2-B P1 · §3.3).
 *
 * path: [{ key, label, onClick? }]
 *   - onClick 이 있는 마디 = 링크(누르면 그 조직이 폴더가 된다)
 *   - onClick 이 없는 마디 = 글자. 마지막 마디는 지금 위치라 굵게(aria-current)
 *   개인 탭처럼 조직 마디를 누를 수 없는 화면은 onClick 을 안 넘기면 된다 — 링크 색을 칠하지 않는다.
 * 마디 사이는 회색 «/». GitHub 경로 줄의 복사 아이콘은 두지 않는다(조직 경로는 복사해 쓸 곳이 없다).
 */
export default function OkrOrgPath({ path, ariaLabel = '조직 경로' }) {
  if (!path || path.length === 0) return null;
  return (
    <nav className="okr-org-path" aria-label={ariaLabel}>
      {path.map((crumb, i) => {
        const last = i === path.length - 1;
        return (
          <span key={crumb.key} className="okr-org-path-item">
            {i > 0 && <span className="okr-org-path-sep" aria-hidden="true">/</span>}
            {crumb.onClick ? (
              <Button className="okr-org-path-link" onClick={crumb.onClick}>
                {crumb.label}
              </Button>
            ) : (
              <span
                className={`okr-org-path-text${last ? ' is-current' : ''}`}
                {...(last ? { 'aria-current': 'location' } : {})}
              >
                {crumb.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
