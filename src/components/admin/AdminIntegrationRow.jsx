import Icon from '../shared/Icon.jsx';

/**
 * 외부 연동 한 줄 — 브랜드 색 모노그램 타일 + 이름 + 연결 상태.
 *
 * connected=true → "✓ 연결됨" 상태 표시(버튼 아님).
 * connected=false → 중립 회색 "연결" 액션 버튼.
 *
 * integration: { name, color?, connected?, lastSync? }
 * labels: { connected, connectAction }
 */
export default function AdminIntegrationRow({ integration, labels, baseUrl = '', onConnect }) {
  const initial = integration.name.slice(0, 1);
  const tileStyle = integration.color ? { background: integration.color } : undefined;
  return (
    <div className={`admin-integration-row${integration.connected ? ' is-connected' : ''}`}>
      <span className="admin-integration-icon" style={tileStyle}>{initial}</span>
      <span className="admin-integration-name">{integration.name}</span>
      {integration.connected ? (
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
