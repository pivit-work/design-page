import Icon from '../shared/Icon.jsx';

/**
 * 외부 연동 한 줄 — 브랜드 로고 타일 + 이름 + 연결 상태.
 *
 * connected=true → "✓ 연결됨" 상태 표시(버튼 아님).
 * connected=false → 중립 회색 "연결" 액션 버튼.
 *
 * 아이콘: 정식 브랜드 로고(public/icons-brand/*.svg)를 화이트 타일에 올린다.
 * 로고가 없는 연동은 브랜드 색 모노그램 타일로 폴백.
 *
 * integration: { name, color?, connected?, lastSync?, logo?, comingSoonLabel? }
 *   - logo: 명시 src(예: '/icons-brand/slack.svg'). 없으면 name 으로 자동 매칭.
 *   - comingSoonLabel: 아직 구현되지 않은 연동. 주면 '연결' 버튼 대신 이 문구를
 *     비활성 상태 텍스트로 보인다 — 연동 설정 화면의 '준비 중' 과 같은 표기(PW-22).
 * labels: { connected, connectAction }
 */

// 내장 브랜드 로고 — name(대소문자 무시) 기준 자동 매칭.
const BRAND_LOGOS = {
  slack: '/icons-brand/slack.svg',
  jira: '/icons-brand/jira.svg',
  notion: '/icons-brand/notion.svg',
  github: '/icons-brand/github.svg',
};

function resolveLogo(integration) {
  if (integration.logo) return integration.logo;
  const key = (integration.name || '').trim().toLowerCase();
  return BRAND_LOGOS[key] || null;
}

export default function AdminIntegrationRow({ integration, labels, baseUrl = '', onConnect }) {
  const logo = resolveLogo(integration);
  const initial = integration.name.slice(0, 1);
  const tileStyle = integration.color ? { background: integration.color } : undefined;
  return (
    <div className={`admin-integration-row${integration.connected ? ' is-connected' : ''}`}>
      {logo ? (
        <span className="admin-integration-icon is-logo">
          <img src={`${baseUrl}${logo}`} alt={integration.name} loading="lazy" />
        </span>
      ) : (
        <span className="admin-integration-icon" style={tileStyle}>{initial}</span>
      )}
      <span className="admin-integration-name">{integration.name}</span>
      {integration.comingSoonLabel ? (
        <span className="admin-integration-status is-muted">{integration.comingSoonLabel}</span>
      ) : integration.connected ? (
        <>
          {integration.lastSync && <span className="admin-integration-sync">{integration.lastSync}</span>}
          <span className="admin-integration-status">
            <Icon src="/icons-solid/check-circle.svg" size={13} color="currentColor" baseUrl={baseUrl} />
            {labels.connected}
          </span>
        </>
      ) : (
        <button
          type="button"
          className="admin-integration-connect"
          onClick={() => onConnect && onConnect(integration.name)}
        >
          {labels.connectAction}
        </button>
      )}
    </div>
  );
}
