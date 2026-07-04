import { useState } from 'react';
import Icon from '../shared/Icon.jsx';

/**
 * AdminIntegrationsCanvas — 어드민 "연동(Integrations)" 탭 Pure 컴포넌트.
 * pivit-work 의 IntegrationsTab (+ SyncLogTable · SlackTransferPanel) 을
 * design-page 정본으로 포팅.
 *
 * 정본화 원칙 (AdminNotificationsCanvas 와 동일):
 *  - 데이터·IO 는 전부 호스트(pivit-work wrapper)가 소유. Canvas 는 fetch·poll·
 *    OAuth·i18n·상대시간 포매팅을 하지 않는다.
 *  - 각 연동 카드는 wrapper 가 만든 fully-resolved view-model(IntegrationCardVM)
 *    로 받는다. per-app sync 상태·토큰 로그·소유자·카운트·마지막 동기화 문자열은
 *    모두 props 로 들어오고, 액션은 콜백으로 방출한다.
 *  - 모든 카피는 labels prop 을 DEFAULT_LABELS(한국어) 위에 deep-merge 해 해소.
 *    Canvas 는 한국어/로케일을 하드코딩하지 않는다.
 *  - 내부 상태는 UI 임시상태만: 활성 탭(uncontrolled fallback)·열린 설정 모달의
 *    draft·토큰양도 패널의 만료/재인증 모달.
 *
 * 스타일: design-page 토큰 기반 src/admin-integrations.css (.intg-*) +
 * 공용 admin.css(.admin-canvas / .admin-card / .admin-stat-tile 등).
 * 호스트 앱은 두 스타일시트를 모두 import 해야 한다.
 */

const ICON_INFO = '/icons-solid/asterisk-01.svg';
const ICON_ALERT = '/icons-solid/alert-triangle.svg';

const DEFAULT_LABELS = {
  summary: {
    title: '연동 설정',
    description:
      '협업툴을 연동하여 스니핏 자동 보완, 프로젝트 기여도 산출, 원온원 브리핑에 활용합니다',
  },
  tabs: { appIntegrations: '앱 연동', syncLog: '동기화 로그' },
  loading: '불러오는 중...',
  close: '닫기',
  status: {
    disconnected: '미연결',
    connecting: '연결 중',
    connected: '연결됨',
    error: '오류',
    comingSoon: '준비 중',
  },
  actions: {
    connect: '연결하기',
    settings: '설정',
    disconnect: '연결 해제',
    reconnect: '재연결',
    retry: '다시 연결',
    cancel: '취소',
    comingSoon: '준비 중',
  },
  sync: {
    noSyncHistory: '동기화 기록 없음',
    count: '건',
    collect: '수집',
    collectingShort: '수집 중...',
    collecting: '{{completed}}/{{total}} 채널 · {{messages}}건 수집됨',
  },
  adminToken: {
    active: '관리자 토큰 활성',
    expired: '관리자 토큰 만료됨',
    expiredWarning:
      '관리자 토큰이 만료되었습니다. 봇 토큰으로 수집 중입니다(채널 참여 필요). 재연결하여 관리자 액세스를 복원하세요.',
    reconnectAdmin: '관리자 재연결',
  },
  settingsPanel: { title: '{{name}} 수집 범위 설정' },
  saveSettings: '설정 저장',
  error: {
    forbiddenTitle: '연동 설정 권한이 없습니다',
    forbiddenDesc:
      "이 화면은 '외부 연동 설정' 권한이 필요합니다. 조직 관리자에게 요청하거나, 권한 관리에서 역할에 권한을 부여하세요.",
    loadFailedTitle: '연동 정보를 불러오지 못했습니다',
    loadFailedDesc: '일시적인 문제일 수 있습니다. 잠시 후 다시 시도해주세요.',
    retry: '다시 시도',
  },
  syncLog: {
    service: '서비스',
    time: '시각',
    count: '건수',
    status: '상태',
    retry: '재시도',
    noLogs: '동기화 로그가 없습니다.',
    success: '성공',
    failed: '실패',
  },
  personalBanner: {
    message: '개인 계정 연동은 내 설정에서 별도 진행합니다',
    button: '내 설정으로 이동',
  },
  transfer: {
    ownerLabel: '소유자',
    slackAdmin: 'Slack Admin',
    expireToken: '토큰 만료',
    reauth: '재인증',
    tokenHistory: '토큰 이력',
    tokenHistoryFooter: '모든 토큰 이력은 감사 로그에 영구 보존됩니다.',
    actionExpire: '만료',
    actionReauth: '재인증',
    noLogs: '토큰 이력이 없습니다.',
    expiredBanner: {
      message: '관리자 토큰이 만료되었습니다. 데이터 수집이 제한됩니다.',
      reauthLink: '재인증',
    },
    expireModal: {
      title: '토큰 만료',
      description: '토큰을 만료시키면 Slack 데이터 수집이 즉시 중단됩니다.',
      warning:
        '이 작업은 되돌릴 수 없습니다. 토큰 만료 후 데이터를 다시 수집하려면 재인증이 필요합니다.',
      cancel: '취소',
      confirm: '토큰 만료 실행',
      error: '토큰 만료 처리 중 오류가 발생했습니다. 다시 시도해 주세요.',
    },
    reauthModal: {
      title: '재인증',
      slackAdminCheck: 'Slack Admin 확인',
      isAdmin: '관리자 권한 확인됨',
      notAdmin: '관리자 권한 없음',
      notAdminWarning:
        'Slack 워크스페이스에서 관리자 권한을 먼저 획득해야 인증할 수 있습니다.',
      cancel: '취소',
      confirm: 'Slack으로 인증하기',
      titleLabel: '직함',
    },
  },
};

/* ── deep-merge (AdminNotificationsCanvas 와 동일) ───────────────────── */
function merge(base, provided) {
  if (!provided) return base;
  const out = { ...base };
  for (const k of Object.keys(provided)) {
    if (provided[k] && typeof provided[k] === 'object' && !Array.isArray(provided[k])) {
      out[k] = merge(base[k] || {}, provided[k]);
    } else if (provided[k] !== undefined) {
      out[k] = provided[k];
    }
  }
  return out;
}

/* {{key}} 치환 — labels 안의 템플릿 문자열용 (i18n interpolation 대체). */
function fmt(tpl, vars) {
  return String(tpl ?? '').replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] ?? ''));
}

/* ── 공통 UI 프리미티브 ─────────────────────────────────────────────── */

function StatusBadge({ status, labels }) {
  const known = ['connected', 'disconnected', 'connecting', 'error'].includes(status);
  const cls = known ? status : 'disconnected';
  return (
    <span className={`intg-status is-${cls}`}>
      <span className="intg-status-dot" />
      {labels.status[status] ?? status}
    </span>
  );
}

function SelectInput({ value, options, onChange, ariaLabel }) {
  return (
    <select
      className="intg-select"
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function ToggleSwitch({ checked, onChange, ariaLabel }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`intg-toggle${checked ? ' is-on' : ''}`}
    >
      <span className="intg-toggle-knob" />
    </button>
  );
}

function OwnerAvatar({ name, avatar, size = 40 }) {
  const initials = (name || '')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }}
      />
    );
  }
  return (
    <div className="intg-avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials}
    </div>
  );
}

/* ── 앱 카드 ────────────────────────────────────────────────────────── */

function AppCard({ card, labels, baseUrl, onConnect, onDisconnect, onReconnect, onCancelConnecting, onTriggerSync, onOpenSettings }) {
  const { app, brandName, logo, description, usage, status } = card;
  const usageText = (usage ?? []).join(' · ');

  // 준비 중(미구현) 연동 — 로고/설명/사용처만 노출, 액션은 비활성.
  if (card.comingSoon) {
    return (
      <section className="admin-card intg-app-card" data-testid={`intg-card-${app}`}>
        <div className="intg-app-head">
          <span className="intg-app-logo">
            <img src={`${baseUrl}${logo}`} alt={brandName} loading="lazy" />
          </span>
          <div className="intg-app-titles">
            <span className="intg-app-name">{brandName}</span>
            <span className="intg-app-desc">{description}</span>
          </div>
          <span className="intg-status is-disconnected">{labels.status.comingSoon}</span>
        </div>
        {usageText && <div className="intg-usage">{usageText}</div>}
        <div className="intg-actions">
          <button type="button" className="intg-btn intg-btn-neutral" disabled>
            {labels.actions.comingSoon}
          </button>
        </div>
      </section>
    );
  }

  const isConnected = status === 'connected';
  const isError = status === 'error';
  const isConnecting = status === 'connecting';
  const showRecords = typeof card.recordsLast7Days === 'number' && card.recordsLast7Days > 0;

  return (
    <section className="admin-card intg-app-card" data-testid={`intg-card-${app}`}>
      <div className="intg-app-head">
        <span className="intg-app-logo">
          <img src={`${baseUrl}${logo}`} alt={brandName} loading="lazy" />
        </span>
        <div className="intg-app-titles">
          <span className="intg-app-name">{brandName}</span>
          <span className="intg-app-desc">{description}</span>
        </div>
        <StatusBadge status={status} labels={labels} />
      </div>

      {usageText && <div className="intg-usage">{usageText}</div>}

      {isConnected && (
        <div className="intg-meta">
          {card.lastSyncLabel ?? labels.sync.noSyncHistory}
          {showRecords && (
            <span className="intg-meta-accent">
              · {card.recordsLast7Days.toLocaleString()}{labels.sync.count}
            </span>
          )}
        </div>
      )}

      {isConnected && app === 'slack' && card.tokenMode === 'dual' && (
        <div className="intg-meta">
          <span
            style={{
              color: card.adminTokenStatus === 'active' ? 'var(--utility-green-600)' : 'var(--colors-warning-600)',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <span className="intg-status-dot" />
            {card.adminTokenStatus === 'active' ? labels.adminToken.active : labels.adminToken.expired}
          </span>
        </div>
      )}

      {isConnected && app === 'slack' && card.adminTokenStatus === 'expired' && (
        <div className="intg-note is-warning">
          <span>{labels.adminToken.expiredWarning}</span>
          <button
            type="button"
            className="intg-btn intg-btn-neutral intg-btn-sm"
            onClick={() => onReconnect(app)}
          >
            {labels.adminToken.reconnectAdmin}
          </button>
        </div>
      )}

      {isError && card.errorMessage && (
        <div className="intg-note is-error">{card.errorMessage}</div>
      )}

      {card.syncInProgress && card.syncProgress && (
        <div>
          <div className="intg-meta" style={{ marginBottom: 6 }}>
            {fmt(labels.sync.collecting, {
              completed: card.syncProgress.completed,
              total: card.syncProgress.total,
              messages: card.syncProgress.messages,
            })}
          </div>
          <div className="intg-progress-track">
            <div
              className="intg-progress-fill"
              style={{
                width: card.syncProgress.total > 0
                  ? `${(card.syncProgress.completed / card.syncProgress.total) * 100}%`
                  : '0%',
              }}
            />
          </div>
        </div>
      )}

      <div className="intg-actions">
        {status === 'disconnected' && (
          <button type="button" className="intg-btn intg-btn-primary" onClick={() => onConnect(app)}>
            {labels.actions.connect}
          </button>
        )}
        {isConnected && (
          <>
            <button type="button" className="intg-btn intg-btn-neutral" onClick={() => onOpenSettings(app)}>
              {labels.actions.settings}
            </button>
            <button
              type="button"
              className="intg-btn intg-btn-neutral"
              onClick={() => onTriggerSync(app)}
              disabled={card.syncInProgress}
            >
              {card.syncInProgress ? labels.sync.collectingShort : labels.sync.collect}
            </button>
            <button type="button" className="intg-btn intg-btn-danger" onClick={() => onDisconnect(app)}>
              {labels.actions.disconnect}
            </button>
          </>
        )}
        {isError && (
          <button type="button" className="intg-btn intg-btn-primary" onClick={() => onReconnect(app)}>
            {labels.actions.reconnect}
          </button>
        )}
        {isConnecting && (
          <>
            <button type="button" className="intg-btn intg-btn-neutral" onClick={() => onReconnect(app)}>
              {labels.actions.retry}
            </button>
            <button type="button" className="intg-btn intg-btn-danger" onClick={() => onCancelConnecting(app)}>
              {labels.actions.cancel}
            </button>
          </>
        )}
      </div>
    </section>
  );
}

/* ── 설정 모달 (일반화된 fields view-model) ─────────────────────────── */

function SettingRow({ label, children }) {
  return (
    <div className="intg-setting-row">
      <span className="intg-setting-label">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function SettingsModal({ modal, labels, baseUrl, onClose, onSave }) {
  const [draft, setDraft] = useState(() => {
    const d = {};
    (modal.fields ?? []).forEach((f) => { d[f.key] = f.value; });
    return d;
  });
  const setField = (k, v) => setDraft((p) => ({ ...p, [k]: v }));

  const toggleInGroup = (k, optionValue) => {
    setDraft((p) => {
      const cur = Array.isArray(p[k]) ? p[k] : [];
      return {
        ...p,
        [k]: cur.includes(optionValue) ? cur.filter((x) => x !== optionValue) : [...cur, optionValue],
      };
    });
  };

  return (
    <div className="intg-modal-overlay" onClick={onClose} data-testid="intg-settings-overlay">
      <div className="intg-modal intg-modal-wide" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" data-testid="intg-settings-modal">
        <div className="intg-panel-head">
          <h3 className="intg-panel-title">
            <img src={`${baseUrl}${modal.logo}`} alt={modal.brandName} />
            {fmt(labels.settingsPanel.title, { name: modal.brandName })}
          </h3>
          <button type="button" onClick={onClose} aria-label={labels.close} className="intg-panel-close">&times;</button>
        </div>

        <div>
          {(modal.fields ?? []).map((field) => (
            <SettingRow key={field.key} label={field.label}>
              {field.kind === 'select' && (
                <SelectInput
                  value={draft[field.key]}
                  options={field.options ?? []}
                  onChange={(v) => setField(field.key, v)}
                  ariaLabel={field.label}
                />
              )}
              {field.kind === 'checkboxGroup' && (
                <div className="intg-setting-check">
                  {(field.options ?? []).map((o) => (
                    <label key={o.value}>
                      <input
                        type="checkbox"
                        checked={Array.isArray(draft[field.key]) && draft[field.key].includes(o.value)}
                        onChange={() => toggleInGroup(field.key, o.value)}
                        style={{ accentColor: 'var(--text-brand-tertiary)' }}
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
              )}
              {field.kind === 'toggle' && (
                <ToggleSwitch
                  checked={!!draft[field.key]}
                  onChange={(v) => setField(field.key, v)}
                  ariaLabel={field.label}
                />
              )}
            </SettingRow>
          ))}
          <div className="intg-panel-save">
            <button
              type="button"
              className="intg-btn intg-btn-primary"
              onClick={() => onSave(modal.app, draft)}
              data-testid="intg-settings-save"
            >
              {labels.saveSettings}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 동기화 로그 테이블 ─────────────────────────────────────────────── */

function SyncLogTable({ logs, labels, onRetrySyncLog }) {
  if (!logs || logs.length === 0) {
    return <div className="intg-table-empty">{labels.syncLog.noLogs}</div>;
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="intg-table">
        <thead>
          <tr>
            <th>{labels.syncLog.service}</th>
            <th>{labels.syncLog.time}</th>
            <th style={{ textAlign: 'right' }}>{labels.syncLog.count}</th>
            <th style={{ textAlign: 'center' }}>{labels.syncLog.status}</th>
            <th style={{ textAlign: 'center' }} aria-hidden />
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => {
            const ok = log.status === 'success';
            return (
              <tr key={log.id}>
                <td>
                  <span className="svc">
                    {log.serviceIcon && log.serviceIcon.startsWith('/')
                      ? <img src={log.serviceIcon} alt={log.service} />
                      : <span aria-hidden>{log.serviceIcon}</span>}
                    {log.service}
                  </span>
                </td>
                <td className="time">{log.timeLabel}</td>
                <td className="num">{log.count.toLocaleString()}</td>
                <td style={{ textAlign: 'center' }}>
                  <span className={`intg-status ${ok ? 'is-connected' : 'is-error'}`}>
                    {ok ? labels.syncLog.success : labels.syncLog.failed}
                  </span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  {log.status === 'failed' && onRetrySyncLog && (
                    <button
                      type="button"
                      className="intg-btn intg-btn-neutral intg-btn-sm"
                      onClick={() => onRetrySyncLog(log.service)}
                    >
                      {labels.syncLog.retry}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── Slack 토큰 양도 패널 ───────────────────────────────────────────── */

function TokenLogItem({ entry, labels }) {
  const isExpire = entry.action === 'expire';
  return (
    <div className="intg-logrow">
      <div className="intg-logrow-info">
        <span className="intg-logrow-date">{entry.dateLabel}</span>
        <span className="intg-logrow-desc">{entry.description}</span>
      </div>
      <span className={`intg-pill ${isExpire ? 'is-bad' : 'is-good'}`}>
        {isExpire ? labels.transfer.actionExpire : labels.transfer.actionReauth}
      </span>
    </div>
  );
}

function Overlay({ children, onClose, testid }) {
  return (
    <div className="intg-modal-overlay" onClick={onClose} data-testid={testid}>
      <div className="intg-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {children}
      </div>
    </div>
  );
}

function ExpireModal({ labels, onClose, onConfirm, error }) {
  const L = labels.transfer.expireModal;
  return (
    <Overlay onClose={onClose} testid="intg-expire-modal">
      <h3>{L.title}</h3>
      <p>{L.description}</p>
      <div className="intg-note is-error" style={{ marginBottom: 20 }}>{L.warning}</div>
      {error && (
        <div className="intg-note is-error" style={{ marginBottom: 12 }}>{L.error}</div>
      )}
      <div className="intg-modal-actions">
        <button type="button" className="intg-btn intg-btn-neutral" onClick={onClose}>{L.cancel}</button>
        <button type="button" className="intg-btn intg-btn-danger" onClick={onConfirm}>{L.confirm}</button>
      </div>
    </Overlay>
  );
}

function ReauthModal({ owner, labels, onClose, onConfirm }) {
  const L = labels.transfer.reauthModal;
  return (
    <Overlay onClose={onClose} testid="intg-reauth-modal">
      <h3>{L.title}</h3>

      <div className="intg-modal-usercard">
        <OwnerAvatar name={owner.name} avatar={owner.avatar} size={44} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{owner.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            {L.titleLabel}: {owner.title}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0 16px', fontSize: 12, color: 'var(--text-secondary)' }}>
        <span style={{ fontWeight: 600 }}>{L.slackAdminCheck}:</span>
        {owner.isSlackAdmin
          ? <span className="intg-pill is-good">{L.isAdmin}</span>
          : <span className="intg-pill is-bad">{L.notAdmin}</span>}
      </div>

      {!owner.isSlackAdmin && (
        <div className="intg-note is-warning" style={{ marginBottom: 16 }}>{L.notAdminWarning}</div>
      )}

      <div className="intg-modal-actions">
        <button type="button" className="intg-btn intg-btn-neutral" onClick={onClose}>{L.cancel}</button>
        <button
          type="button"
          className="intg-btn intg-btn-primary"
          onClick={owner.isSlackAdmin ? onConfirm : undefined}
          disabled={!owner.isSlackAdmin}
        >
          {L.confirm}
        </button>
      </div>
    </Overlay>
  );
}

function SlackTransferPanel({ transfer, labels, baseUrl, onExpireToken, onReauth }) {
  const [showExpireModal, setShowExpireModal] = useState(false);
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [expireError, setExpireError] = useState(false);
  const owner = transfer.owner;
  const app = transfer.app ?? 'slack';

  const handleExpireConfirm = async () => {
    try {
      setExpireError(false);
      await onExpireToken(app);
      setShowExpireModal(false);
    } catch {
      setExpireError(true);
    }
  };

  const handleReauthConfirm = () => {
    onReauth(app);
    setShowReauthModal(false);
  };

  return (
    <section className="admin-card" data-testid="intg-transfer-panel">
      {transfer.isExpired && (
        <div className="intg-note is-warning" style={{ marginBottom: 16 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon src={ICON_ALERT} size={16} color="var(--colors-warning-600)" baseUrl={baseUrl} />
            {labels.transfer.expiredBanner.message}
          </span>
          <button type="button" className="intg-btn intg-btn-neutral intg-btn-sm" onClick={() => setShowReauthModal(true)}>
            {labels.transfer.expiredBanner.reauthLink} &rarr;
          </button>
        </div>
      )}

      <div className="intg-owner-head">
        <div className="intg-owner-id">
          <OwnerAvatar name={owner.name} avatar={owner.avatar} />
          <div>
            <div className="intg-owner-name">
              {owner.name}
              <span className="intg-pill is-brand">{labels.transfer.ownerLabel}</span>
              {owner.isSlackAdmin && <span className="intg-pill is-good">{labels.transfer.slackAdmin}</span>}
            </div>
            <div className="intg-owner-sub">
              {owner.title} &middot; {transfer.connectedLabel}
            </div>
          </div>
        </div>
        <div className="intg-actions">
          <button type="button" className="intg-btn intg-btn-danger intg-btn-sm" onClick={() => setShowExpireModal(true)}>
            {labels.transfer.expireToken}
          </button>
          <button type="button" className="intg-btn intg-btn-primary intg-btn-sm" onClick={() => setShowReauthModal(true)}>
            {labels.transfer.reauth}
          </button>
        </div>
      </div>

      <div className="intg-stat-row">
        {(transfer.stats ?? []).map((stat) => (
          <div key={stat.label}>
            <div className="label">{stat.label}</div>
            <div className="value">{stat.value}</div>
          </div>
        ))}
      </div>

      <div>
        <h4 className="intg-loglist-title">{labels.transfer.tokenHistory}</h4>
        {(transfer.tokenLogs ?? []).length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: '8px 0' }}>
            {labels.transfer.noLogs}
          </div>
        ) : (
          transfer.tokenLogs.map((entry) => <TokenLogItem key={entry.id} entry={entry} labels={labels} />)
        )}
        <div className="intg-loglist-footer">{labels.transfer.tokenHistoryFooter}</div>
      </div>

      {showExpireModal && (
        <ExpireModal labels={labels} onClose={() => setShowExpireModal(false)} onConfirm={handleExpireConfirm} error={expireError} />
      )}
      {showReauthModal && (
        <ReauthModal owner={owner} labels={labels} onClose={() => setShowReauthModal(false)} onConfirm={handleReauthConfirm} />
      )}
    </section>
  );
}

/* ── 탭 스위처 ──────────────────────────────────────────────────────── */

function TabSwitcher({ active, labels, onChange }) {
  const tabs = [
    { id: 'apps', label: labels.tabs.appIntegrations },
    { id: 'syncLog', label: labels.tabs.syncLog },
  ];
  return (
    <div className="intg-tabs">
      {tabs.map((tab) => (
        <button
          type="button"
          key={tab.id}
          onClick={() => onChange(tab.id)}
          data-testid={`intg-tab-${tab.id}`}
          className={`intg-tab${tab.id === active ? ' is-active' : ''}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/* ── 메인 캔버스 ────────────────────────────────────────────────────── */

export default function AdminIntegrationsCanvas({
  activeTab,
  cards = [],
  stats = [],
  loading = false,
  errorState = null,
  toast = null,
  transfer = null,
  settingsModal = null,
  syncLogs = [],
  syncLogsLoading = false,
  labels: providedLabels,
  baseUrl = '',
  onTabChange,
  onConnect = () => {},
  onDisconnect = () => {},
  onReconnect = () => {},
  onCancelConnecting = () => {},
  onTriggerSync = () => {},
  onOpenSettings = () => {},
  onCloseSettings = () => {},
  onSaveSettings = () => {},
  onPersonalIntegrationClick = () => {},
  onExpireToken = () => {},
  onReauth = () => {},
  onRetrySyncLog = () => {},
  onRetryLoad = () => {},
}) {
  const labels = merge(DEFAULT_LABELS, providedLabels);

  // 탭: controlled(activeTab prop) + uncontrolled fallback. 항상 onTabChange 방출.
  const [internalTab, setInternalTab] = useState('apps');
  const tab = activeTab ?? internalTab;
  const changeTab = (next) => {
    setInternalTab(next);
    if (onTabChange) onTabChange(next);
  };

  // ── 전체화면 상태: 로딩 ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="admin-canvas" data-testid="intg-loading">
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-tertiary)', fontSize: 13 }}>
          {labels.loading}
        </div>
      </div>
    );
  }

  // ── 전체화면 상태: 권한없음(403) / 조회실패 ──────────────────────
  if (errorState) {
    const forbidden = errorState.kind === 'forbidden';
    return (
      <div className="admin-canvas" data-testid="intg-error">
        <header className="admin-header">
          <div className="admin-header-titles">
            <h1 className="admin-page-title">{labels.summary.title}</h1>
            <p className="admin-page-subtitle">{labels.summary.description}</p>
          </div>
        </header>
        <section className="admin-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
            {forbidden ? labels.error.forbiddenTitle : labels.error.loadFailedTitle}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
            {forbidden ? labels.error.forbiddenDesc : labels.error.loadFailedDesc}
          </p>
          {!forbidden && (
            <div style={{ marginTop: 16 }}>
              <button type="button" className="intg-btn intg-btn-neutral" onClick={() => onRetryLoad()}>
                {labels.error.retry}
              </button>
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="admin-canvas" data-testid="intg-canvas">
      {toast && (
        <div
          data-testid="intg-toast"
          style={{
            position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--colors-background-bgOverlay)', color: '#fff', padding: '10px 20px', borderRadius: 'var(--radius-full)',
            fontSize: 12, fontWeight: 600, boxShadow: '0 4px 20px rgba(10,13,18,.2)', zIndex: 9999,
          }}
        >
          {toast}
        </div>
      )}

      <header className="admin-header">
        <div className="admin-header-titles">
          <h1 className="admin-page-title">{labels.summary.title}</h1>
          <p className="admin-page-subtitle">{labels.summary.description}</p>
        </div>
      </header>

      <TabSwitcher active={tab} labels={labels} onChange={changeTab} />

      {tab === 'apps' && (
        <>
          <div className="intg-stats-grid">
            {stats.map((s) => (
              <div key={s.key ?? s.label} className="admin-stat-tile">
                <p className="admin-stat-label">{s.label}</p>
                <p className="admin-stat-value">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="intg-app-grid">
            {cards.map((card) => (
              <AppCard
                key={card.app}
                card={card}
                labels={labels}
                baseUrl={baseUrl}
                onConnect={onConnect}
                onDisconnect={onDisconnect}
                onReconnect={onReconnect}
                onCancelConnecting={onCancelConnecting}
                onTriggerSync={onTriggerSync}
                onOpenSettings={onOpenSettings}
              />
            ))}
          </div>

          {transfer && (
            <SlackTransferPanel
              transfer={transfer}
              labels={labels}
              baseUrl={baseUrl}
              onExpireToken={onExpireToken}
              onReauth={onReauth}
            />
          )}

          {settingsModal && (
            <SettingsModal
              key={settingsModal.app}
              modal={settingsModal}
              labels={labels}
              baseUrl={baseUrl}
              onClose={onCloseSettings}
              onSave={onSaveSettings}
            />
          )}

          <div className="intg-banner" data-testid="intg-personal-banner">
            <div className="intg-banner-msg">
              <Icon src={ICON_INFO} size={16} color="var(--text-brand-tertiary)" baseUrl={baseUrl} />
              {labels.personalBanner.message}
            </div>
            <button type="button" className="intg-btn intg-btn-primary" onClick={onPersonalIntegrationClick}>
              {labels.personalBanner.button}
            </button>
          </div>
        </>
      )}

      {tab === 'syncLog' && (
        <section className="admin-card">
          {syncLogsLoading
            ? <div className="intg-table-empty">{labels.loading}</div>
            : <SyncLogTable logs={syncLogs} labels={labels} onRetrySyncLog={onRetrySyncLog} />}
        </section>
      )}
    </div>
  );
}
