import { useEffect, useRef, useState } from 'react';
import DpStatusBadge from '../shared/StatusBadge.jsx';
import Icon from '../shared/Icon.jsx';
import { failureText } from '../shared/notifiedFailure.js';
import assetUrl from '../shared/assetUrl.js';
import ModalShell from '../shared/ModalShell.jsx';
import ConfirmModal from '../shared/ConfirmModal.jsx';
import Tabs from '../shared/Tabs.jsx';
import Switch from '../shared/Switch.jsx';
import Checkbox from '../shared/Checkbox.jsx';
import Toast from '../shared/Toast.jsx';
import SearchInput from '../shared/SearchInput.jsx';
import { CheckGlyph } from '../shared/lineIcons.jsx';
import { CATALOG_DEFAULT_LABELS } from './adminIntegrationsCatalogLabels.js';
import {
  AdminCatalogPanel,
  InactiveToolsArea,
  PersonalChips,
  RequestBanner,
  RequestToolModal,
} from './AdminIntegrationsCatalog.jsx';
import Select from '../shared/Select.jsx';
import Button from '../shared/Button.jsx';
import Spinner from '../shared/Spinner.jsx';
import AdminIntegrationsLeaveCalendar from './AdminIntegrationsLeaveCalendar.jsx';
import { LEAVE_CALENDAR_DEFAULT_LABELS } from './adminIntegrationsLeaveCalendarLabels.js';
import { FormModal, FrameTable, NoticeLines, Panel, StatStrip } from '../frames/index.js';
import { DescLines, IntgBand } from './adminIntegrationsParts.jsx';
import { sentences } from './adminIntegrationsText.js';
import { ArrowLeftGlyph, ArrowRightGlyph, UserGlyph } from '../shared/lineIcons.jsx';

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

const ICON_ALERT = '/icons-solid/alert-triangle.svg';
/* 동기화 로그 상태 칸 기호 ✓ · ⚠ · ✗ (screen-integrations.policy §2-5 «상태 칸은 셋» · pivit-work PW-3128) — 글리프 대신 아이콘 */
const ICON_SYNC_OK = '/icons-solid/check.svg';
const ICON_SYNC_FAILED = '/icons-solid/x-close.svg';

const BASE_LABELS = {
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
    connecting: '연결 중…',
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
    lastSyncRow: '마지막 동기화',
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
    label: '관리자 토큰',
    activeShort: '활성',
    expiredShort: '만료됨',
  },
  /* Slack 소유자 권한 관리 — 따로 화면 (기획서 admin-app.jsx SlackTransferView · SettingsPanel · PW-3126) */
  owner: {
    title: 'Slack 소유자 권한 관리',
    back: '연동 설정',
    settingsRow: '설치 · 수집 자격',
    open: '소유자 권한 관리',
    openFromCard: '권한 관리',
    needsAuth: '인증 필요',
  },
  settingsPanel: { title: '{{name}} 수집 범위 설정', saved: '저장됨' },
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
    partial: '일부 수집',
    failed: '실패',
  },
  personalBanner: {
    // policy §2-6 · 기획서 IntegrationsView 개인 연동 안내 (pivit-work PW-3126)
    message: '개인 계정 연동은 개인 설정에서 별도 진행',
    description: '어드민이 활성화하고 개인 연동을 허용한 툴만 본인 계정을 추가로 연결할 수 있습니다.',
    button: '개인 설정으로',
  },
  /* screen-integrations.policy §11 「모든 서비스 미연동」 */
  emptyBanner: '연동할수록 AI 맥락이 풍부해져요',
  /* integrations-spec §5 데이터 수집 현황 — 화면 하단 */
  collection: {
    title: '데이터 수집 현황',
    service: '서비스',
    lastSuccess: '마지막 성공',
    records7d: '지난 7일 수집',
    failures: '실패',
    noFailures: '없음',
    failedCount: '{{count}}건',
    never: '—',
    empty: '연결된 앱이 없습니다. 앱을 연결하면 수집 현황이 표시됩니다.',
  },
  /* 「연동 설정」 Slack 카드 · Admin 에게만 — 알림 발송 상태와 Slack 으로 받지 못하는 구성원
     (pivit-work PW-2054 · screen-integrations.policy §4-B ⑦ ⑧) */
  slackDelivery: {
    lastSuccess: '마지막 알림 발송 성공',
    lastSuccessNone: '아직 없음',
    failed7d: '최근 7일 발송 실패',
    failedCount: '{{count}}건',
    unmatched: 'Slack 으로 받지 못하는 구성원 {{count}}명',
    unmatchedView: '보기',
    modalTitle: 'Slack 으로 받지 못하는 구성원',
    modalDescription: 'Slack 프로필 메일을 회사 메일과 같게 맞추면 다음 발송부터 받습니다. 그때까지 필수 알림은 메일로 갑니다.',
    colName: '이름',
    colOrg: '소속',
    colEmail: 'Pivit 메일',
    colReason: '사유',
    reasonNoEmailMatch: 'Slack 에서 같은 메일을 찾지 못함',
    loadFailed: '목록을 불러오지 못했습니다',
    retry: '다시 시도',
    empty: 'Slack 으로 받지 못하는 구성원이 없습니다.',
    searchPlaceholder: '이름 · 소속 · 메일 검색',
    countLabel: '{{count}}명',
    noMatch: '검색에 맞는 구성원이 없습니다.',
    close: '닫기',
  },
  transfer: {
    // Slack 연결은 회사 설치의 것이라 «소유자»가 없다 — 「설치」(기록)와 「수집 자격」(수집에 쓰는 개인 자격)으로 가른다
    // (screen-integrations.policy §4-B ① ② · PW-1976). [토큰 만료]·[재인증]은 수집 자격에만 작동한다.
    installSection: '설치',
    credentialSection: '수집 자격',
    installerBadge: '설치한 관리자',
    credentialAccount: '{{name}}의 Slack 계정',
    expiredBadge: '만료됨',
    // 수집 자격자가 Slack 워크스페이스 관리자일 때 이름 옆 배지 (screen-slack-transfer.policy §2.1)
    slackAdminLabel: 'Slack 관리자',
    expireToken: '토큰 만료',
    reauth: '재인증',
    tokenHistory: '토큰 이력',
    tokenHistoryFooter: '모든 토큰 이력은 감사 로그에 영구 보존됩니다.',
    actionExpire: '토큰 만료',
    actionReauth: '재인증',
    noLogs: '토큰 이력이 없습니다.',
    // 이력을 못 읽었을 때 — 빈 이력 문구 대신 그 자리에(pivit-work PW-3128)
    logsLoadFailed: '토큰 이력을 불러오지 못했습니다.',
    logsRetry: '다시 시도',
    expiredBanner: {
      message: '관리자 토큰이 만료되었습니다. 데이터 수집이 제한됩니다.',
      reauthLink: '재인증',
    },
    expireModal: {
      title: '토큰 만료',
      description: '토큰을 만료시키면 Slack 데이터 수집이 즉시 중단됩니다.',
      // 기획서 ExpireModal 빨간 상자 (pivit-work PW-3126)
      warning: '토큰 만료 후 누군가 재인증 버튼을 눌러 본인 Slack 계정으로 인증을 완료해야 수집이 재개됩니다.',
      cancel: '취소',
      confirm: '토큰 만료 실행',
      error: '토큰 만료 처리 중 오류가 발생했습니다. 다시 시도해 주세요.',
    },
    reauthModal: {
      title: '재인증',
      // 누가 새 소유자가 되는지 먼저 말한다 (screen-slack-transfer.policy §3.2)
      guide: '본인의 Slack 계정으로 인증합니다. 인증 완료 시 본인이 새 소유자가 됩니다.',
      // 지금 어드민이 Slack 워크스페이스 관리자가 아니면 인증 버튼을 잠그고 이 문장을 보인다 (§3.2 · §6)
      notSlackAdmin: 'Slack 워크스페이스에서 관리자 권한을 먼저 획득해야 인증할 수 있습니다.',
      // 사람 칸 딱지 — 기획서 ReauthModal «Slack Admin ✓ / 없음»을 영어 없이 (pivit-work PW-3126)
      slackAdminBadge: 'Slack 관리자',
      notSlackAdminBadge: 'Slack 관리자 아님',
      // 현재 토큰을 인증한 계정과 다른 관리자가 재인증을 시도할 때 노출되는 경고.
      // 앞에 인증자 이름이 붙는다: "{이름}님이 인증한 상태입니다. …"
      differentOwnerWarning: '님이 인증한 상태입니다. 정말로 다시 인증하시겠습니까?',
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

// 카탈로그·요청 문구는 그 조각 파일이 갖고, 탭 이름만 이 화면 탭 묶음에 합친다.
const DEFAULT_LABELS = merge(
  { ...BASE_LABELS, ...CATALOG_DEFAULT_LABELS },
  { tabs: { ...BASE_LABELS.tabs, ...CATALOG_DEFAULT_LABELS.tabs } },
);

/* {{key}} 치환 — labels 안의 템플릿 문자열용 (i18n interpolation 대체). */
function fmt(tpl, vars) {
  return String(tpl ?? '').replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] ?? ''));
}

/* ── 공통 UI 프리미티브 ─────────────────────────────────────────────── */

/* 상태 딱지 — 앞 색 점 없이 뜻대로 색(PW-3126 · status-badge.css 뜻→색). 연결 중은 «기다림»이라 주황. */
const STATUS_TONE = { connected: 'success', connecting: 'warning', error: 'danger', disconnected: 'neutral' };

function StatusBadge({ status, labels }) {
  return (
    <DpStatusBadge className="admin-pill" tone={STATUS_TONE[status] ?? 'neutral'} data-status={status}>
      {labels.status[status] ?? status}
    </DpStatusBadge>
  );
}

/** 카드 안 정보 칸 한 줄 — 이름 왼쪽 · 값 오른쪽. `tone` 은 muted(0 · 없음) · error(실패 1 이상) · ok */
function KvRow({ label, value, tone, testId, children }) {
  return (
    <div className="intg-kv-row" data-testid={testId}>
      <span className="intg-kv-label">{label}</span>
      {value !== undefined && <span className={`intg-kv-value${tone ? ` is-${tone}` : ''}`}>{value}</span>}
      {children}
    </div>
  );
}

function SelectInput({ value, options, onChange, ariaLabel }) {
  return (
    <Select
      className="intg-select"
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </Select>
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

function AppCard({ card, labels, baseUrl, onConnect, onDisconnect, onReconnect, onCancelConnecting, onTriggerSync, onOpenSettings, onOpenSlackUnmatched, onOpenOwner }) {
  const { app, brandName, logo, description, usage, status } = card;
  const usageText = (usage ?? []).join(' · ');

  // 준비 중(미구현) 연동 — 로고/설명/사용처만 노출, 액션은 비활성.
  if (card.comingSoon) {
    return (
      <section className="admin-card intg-app-card" data-testid={`intg-card-${app}`}>
        <div className="intg-app-head">
          <span className="intg-app-logo">
            <img src={assetUrl(baseUrl, logo)} alt={brandName} loading="lazy" />
          </span>
          <div className="intg-app-titles">
            <span className="intg-app-name">{brandName}</span>
            <span className="intg-app-desc">{description}</span>
          </div>
          <DpStatusBadge className="admin-pill" tone="neutral">{labels.status.comingSoon}</DpStatusBadge>
        </div>
        {usageText && <div className="intg-usage">{usageText}</div>}
        <div className="intg-actions">
          <Button variant="secondary" size="sm" className="intg-btn" disabled>
            {labels.actions.comingSoon}
          </Button>
        </div>
      </section>
    );
  }

  const isConnected = status === 'connected';
  const isError = status === 'error';
  const isConnecting = status === 'connecting';
  const cardBusy = card.connectPending || isConnecting;
  const showRecords = typeof card.recordsLast7Days === 'number' && card.recordsLast7Days > 0;
  const dual = isConnected && app === 'slack' && card.tokenMode === 'dual';
  const delivery = card.slackDelivery;

  // 정보 칸 — 한 칸 안 «이름 왼쪽 · 값 오른쪽» 줄(PW-3126 · 리소스 팀 현황 사람 카드 칸). 글은 그대로, «:» 만 뺀다.
  const kvRows = [];
  if (isConnected) {
    kvRows.push(
      <KvRow
        key="sync"
        label={labels.sync.lastSyncRow}
        value={
          <>
            {card.lastSyncLabel ?? labels.sync.noSyncHistory}
            {showRecords && ` · ${card.recordsLast7Days.toLocaleString()}${labels.sync.count}`}
          </>
        }
        tone={card.lastSyncLabel ? undefined : 'muted'}
        testId={`intg-last-sync-${app}`}
      />,
    );
  }
  if (dual) {
    kvRows.push(
      <KvRow
        key="admin-token"
        label={labels.adminToken.label}
        value={card.adminTokenStatus === 'active' ? labels.adminToken.activeShort : labels.adminToken.expiredShort}
        tone={card.adminTokenStatus === 'active' ? 'ok' : 'error'}
        testId="intg-admin-token"
      />,
    );
  }
  // Admin 에게만 — 호스트가 값을 받았을 때만 `slackDelivery` 를 싣는다(못 받으면 숨김). 알림은 회사의 앱 설치로 나가
  // 수집 상태와 따로라, 카드 상태(연결 중·오류)와 관계없이 보인다 (pivit-work PW-2054 · 협업툴 연동 §4-B ⑦ ⑧).
  if (delivery) {
    kvRows.push(
      <KvRow
        key="last-success"
        label={labels.slackDelivery.lastSuccess}
        value={delivery.lastSuccessLabel ?? labels.slackDelivery.lastSuccessNone}
        tone={delivery.lastSuccessLabel ? undefined : 'muted'}
        testId="intg-slack-last-success"
      />,
      <KvRow
        key="failed"
        label={labels.slackDelivery.failed7d}
        value={fmt(labels.slackDelivery.failedCount, { count: delivery.failedLast7Days })}
        tone={delivery.failedLast7Days > 0 ? 'error' : 'muted'}
        testId="intg-slack-failed-7d"
      />,
    );
    if (delivery.unmatchedCount > 0) {
      kvRows.push(
        <KvRow
          key="unmatched"
          label={fmt(labels.slackDelivery.unmatched, { count: delivery.unmatchedCount })}
          testId="intg-slack-unmatched"
        >
          <Button
            variant="secondary"
            size="sm"
            className="intg-btn"
            data-testid="intg-slack-unmatched-view"
            onClick={() => onOpenSlackUnmatched(app)}
          >
            {labels.slackDelivery.unmatchedView}
          </Button>
        </KvRow>,
      );
    }
  }

  return (
    <section className="admin-card intg-app-card" data-testid={`intg-card-${app}`} aria-busy={cardBusy || undefined}>
      {/* «연결 중»이면 갈래 없이 카드 위 로딩 막 + 돌아가는 표시 — 연결 창이 열린 동안도, 토큰 만료 뒤의 «연결 중»도
          (policy 상태 표 connecting «카드 로딩 오버레이 + 스피너» · pivit-work PW-3126).
          아래 버튼 줄([다시 연결] · [취소])은 막 위에 남아 누를 수 있다. */}
      {cardBusy && (
        <div className="intg-card-busy" data-testid={`intg-card-busy-${app}`}>
          <Spinner size={24} />
        </div>
      )}
      <div className="intg-app-head">
        <span className="intg-app-logo">
          <img src={assetUrl(baseUrl, logo)} alt={brandName} loading="lazy" />
        </span>
        <div className="intg-app-titles">
          <span className="intg-app-name">{brandName}</span>
          <span className="intg-app-desc">{description}</span>
        </div>
        <StatusBadge status={status} labels={labels} />
      </div>

      {usageText && <div className="intg-usage">{usageText}</div>}

      {kvRows.length > 0 && <div className="intg-kv">{kvRows}</div>}

      {isConnected && app === 'slack' && card.adminTokenStatus === 'expired' && (
        <IntgBand
          tone="warning"
          lines={sentences(labels.adminToken.expiredWarning)}
          actions={
            <Button variant="secondary" size="sm" className="intg-btn" onClick={() => onReconnect(app)}>
              {labels.adminToken.reconnectAdmin}
            </Button>
          }
          testId="intg-admin-token-expired"
        />
      )}

      {/* 상태는 그대로 «연동됨»이고 덧붙이는 안내 한 줄 — 누르면 [재연결]과 같은 연결 창 (pivit-work PW-1671 · 협업툴 연동 §5-A). */}
      {isConnected && card.notice && (
        <IntgBand
          tone="info"
          lines={[card.notice.text]}
          actions={
            <Button variant="secondary" size="sm" className="intg-btn" onClick={() => onReconnect(app)}>
              {card.notice.actionLabel}
            </Button>
          }
          testId={`intg-notice-${app}`}
        />
      )}

      {isError && card.errorMessage && (
        <IntgBand tone="error" lines={sentences(card.errorMessage)} testId={`intg-error-${app}`} />
      )}

      {/* 방금 [연결하기]가 거절됐다 — 카드는 가기 전 상태 그대로 두고 사유만 보인다 (pivit-work PW-2509).
          연결 기록의 오류(위 띠)와 달리 화면에만 있는 값이라 호스트가 다음 [연결하기]·새로 열기에 비운다. */}
      {card.connectError && (
        <IntgBand tone="error" role="alert" lines={sentences(card.connectError)} testId={`intg-connect-error-${app}`} />
      )}

      {card.syncInProgress && card.syncProgress && (
        <div className="intg-progress">
          <span className="intg-progress-label">
            {fmt(labels.sync.collecting, {
              completed: card.syncProgress.completed,
              total: card.syncProgress.total,
              messages: card.syncProgress.messages,
            })}
          </span>
          <div className="ono-start-progress-track">
            <div
              className="ono-start-progress-fill"
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
          <Button variant="primary" size="sm" className="intg-btn" onClick={() => onConnect(app)}>
            {labels.actions.connect}
          </Button>
        )}
        {isConnected && (
          <>
            <Button variant="secondary" size="sm" className="intg-btn" onClick={() => onOpenSettings(app)}>
              {labels.actions.settings}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="intg-btn"
              onClick={() => onTriggerSync(app)}
              disabled={card.syncInProgress}
            >
              {card.syncInProgress ? labels.sync.collectingShort : labels.sync.collect}
            </Button>
            <Button variant="danger-ghost" size="sm" className="intg-btn" onClick={() => onDisconnect(app)}>
              {labels.actions.disconnect}
            </Button>
          </>
        )}
        {isError && (
          <Button variant="primary" size="sm" className="intg-btn" onClick={() => onReconnect(app)}>
            {labels.actions.reconnect}
          </Button>
        )}
        {/* 기획서 AppCard 오류 상태 Slack [권한 관리] — 설정 창이 없는 상태에서도 소유자 화면으로 간다 (admin-app.jsx 20992) */}
        {isError && app === 'slack' && onOpenOwner && (
          <Button variant="secondary" size="sm" className="intg-btn" onClick={onOpenOwner} data-testid="intg-open-owner-from-card">
            {labels.owner.openFromCard}
          </Button>
        )}
        {isConnecting && (
          <>
            <Button variant="secondary" size="sm" className="intg-btn" onClick={() => onReconnect(app)}>
              {labels.actions.retry}
            </Button>
            {/* 연결 창만 닫는다 — 연결을 끊는 일이 아니라 흰 보조 버튼(PW-3126) */}
            <Button variant="secondary" size="sm" className="intg-btn" onClick={() => onCancelConnecting(app)}>
              {labels.actions.cancel}
            </Button>
          </>
        )}
      </div>
    </section>
  );
}

/* ── 설정 모달 (일반화된 fields view-model) ─────────────────────────── */

/* 설정 창 칸 하나 — 디자이너 창 칸(FormModal.Field · 칸 이름 18/28 굵게 위 · 칸 전체 폭 · PW-3126) */
function SettingRow({ label, hint, group, testId, children }) {
  return (
    <FormModal.Field label={label} hint={hint} group={group} testId={testId}>
      {children}
    </FormModal.Field>
  );
}

/**
 * 세로 목록으로 고르는 체크 묶음 (pivit-work PW-1770 — Notion 데이터베이스·Slack 채널).
 *
 * 가로로 늘어놓으면 항목이 서너 개만 넘어도 창 밖으로 잘려서, 칸에 `list` 를 주면 이 모양으로 그린다.
 * 위에 검색칸·「2 / 6개 선택」·[전체 선택], 한 줄에 이름과 `meta`(마지막 수정일·멤버 수), 6줄이 넘으면
 * 목록 안에서만 스크롤된다. `list.message` 가 있으면(불러오는 중·실패·빈 목록) 목록 자리에 그 글을 보인다.
 * [전체 선택]은 지금 검색에 걸린 것만 고른다 — 걸린 것이 다 골라져 있으면 [선택 해제]로 바뀐다.
 */
function CheckboxListPicker({ field, selected, onToggle, onSetMany }) {
  const list = field.list;
  const [query, setQuery] = useState('');
  const options = field.options ?? [];
  const q = query.trim().toLowerCase();
  const visible = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  const chosen = options.filter((o) => selected.includes(o.value)).length;
  const allVisibleChosen = visible.length > 0 && visible.every((o) => selected.includes(o.value));
  const toggleVisible = () => {
    const ids = visible.map((o) => o.value);
    onSetMany(
      allVisibleChosen
        ? selected.filter((v) => !ids.includes(v))
        : [...selected, ...ids.filter((v) => !selected.includes(v))],
    );
  };
  return (
    <div role="group" aria-label={field.label} data-testid={`intg-picker-${field.key}`}>
      <div className="intg-picker">
        {list.message && list.messageTone === 'error' ? (
          // 못 읽음 — «빈 목록»과 구별되게 빨간 오류 띠(PW-3126). [다시 시도]는 앱에 없어 넣지 않는다(카드 본문).
          <IntgBand tone="error" role="alert" lines={sentences(list.message)} testId={`intg-picker-message-${field.key}`} />
        ) : list.message ? (
          <div className="intg-picker-message" data-testid={`intg-picker-message-${field.key}`}>{list.message}</div>
        ) : (
          <>
            <div className="intg-picker-head">
              <SearchInput
                className="dp-search intg-picker-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={list.searchPlaceholder}
                iconSize={14}
              />
              <span className="intg-picker-count" data-testid={`intg-picker-count-${field.key}`}>
                {fmt(list.countLabel, { selected: chosen, total: options.length })}
              </span>
              <button
                type="button"
                className="intg-picker-all"
                onClick={toggleVisible}
                disabled={visible.length === 0}
                data-testid={`intg-picker-all-${field.key}`}
              >
                {allVisibleChosen ? list.clearAll : list.selectAll}
              </button>
            </div>
            <div className="intg-picker-list">
              {visible.length === 0 && list.noMatch && (
                <div className="intg-picker-message">{list.noMatch}</div>
              )}
              {visible.map((o) => (
                // 네모는 공용 Checkbox (PW-1897). 줄 모양은 이 목록의 것을 그대로 쓴다.
                <div key={o.value} className={`intg-picker-item${o.dim ? ' is-dim' : ''}`}>
                  <Checkbox
                    className="intg-picker-item-main"
                    inputClassName="dp-check-input"
                    checked={selected.includes(o.value)}
                    onChange={() => onToggle(o.value)}
                    label={<span className="intg-picker-item-name" title={o.label}>{o.label}</span>}
                  />
                  {o.meta && <span className="intg-picker-item-meta">{o.meta}</span>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      {list.hint && (
        <div className="intg-picker-hint">
          <NoticeLines tone="muted" lines={sentences(list.hint)} />
        </div>
      )}
    </div>
  );
}

/** 칸 값이 처음 값과 같은가 — 체크 묶음은 고른 순서와 무관하게 비교한다. */
function sameFieldValue(a, b) {
  if (Array.isArray(a) || Array.isArray(b)) {
    const x = Array.isArray(a) ? a : [];
    const y = Array.isArray(b) ? b : [];
    return x.length === y.length && x.every((v) => y.includes(v));
  }
  return a === b;
}

/** 「✓ 저장됨」을 보이는 시간(연동 화면 기획 §6 — 2초 뒤 원래 단추로). */
const SAVED_FLASH_MS = 2000;

/**
 * 설정 창 — 처음 값으로 채우고, 값을 바꾼 뒤에만 [저장]이 눌린다(기획 §6). 버튼 줄은
 * [연결 해제] · [취소] · [저장](기획 §2-4).
 *
 * - `onSave(app, draft)` 가 `true` 로 끝나면 창을 닫지 않고 [저장] 자리에 「✓ 저장됨」을 2초 보인 뒤
 *   지금 값을 새 처음 값으로 삼는다. 다른 값(또는 undefined)이면 아무것도 하지 않는다 — 창을 닫는 것은 앱 몫이다.
 * - 체크 묶음 칸에 `minSelected` 가 있으면 그보다 적게 끌 수 없다. 막힐 때 `onMinSelectedBlocked(app, field)` 를
 *   불러 앱이 안내를 띄운다(기획 §11 「최소 1개 이상의 권한이 필요해요」).
 * - `onDisconnect(app)` 이 있으면 [연결 해제]를 그린다. 확인 창은 앱이 띄운다(기획 §7·§8).
 */
function SettingsModal({ modal, labels, baseUrl, onClose, onSave, onDisconnect, onMinSelectedBlocked, onOpenOwner }) {
  const initialOf = () => {
    const d = {};
    (modal.fields ?? []).forEach((f) => { d[f.key] = f.value; });
    return d;
  };
  const [draft, setDraft] = useState(initialOf);
  const [baseline, setBaseline] = useState(initialOf);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  useEffect(() => {
    if (!savedFlash) return undefined;
    const id = setTimeout(() => setSavedFlash(false), SAVED_FLASH_MS);
    return () => clearTimeout(id);
  }, [savedFlash]);
  const setField = (k, v) => setDraft((p) => ({ ...p, [k]: v }));

  // 저장하지 않는 칸(글자 링크)은 비교에서 뺀다.
  const dirty = (modal.fields ?? []).some(
    (f) => f.kind !== 'link' && !sameFieldValue(draft[f.key], baseline[f.key]),
  );

  const toggleInGroup = (field, optionValue) => {
    const k = field.key;
    const cur = Array.isArray(draft[k]) ? draft[k] : [];
    const removing = cur.includes(optionValue);
    if (removing && field.minSelected && cur.length - 1 < field.minSelected) {
      onMinSelectedBlocked?.(modal.app, field);
      return;
    }
    setField(k, removing ? cur.filter((x) => x !== optionValue) : [...cur, optionValue]);
  };

  const save = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      const ok = await onSave(modal.app, draft);
      if (ok === true) {
        setBaseline(draft);
        setSavedFlash(true);
      }
    } finally {
      setSaving(false);
    }
  };

  // 껍데기는 공용 창 틀(ModalShell · PW-836). 닫기는 X·막·Esc·[취소].
  return (
    <ModalShell
      title={
        <span className="intg-shell-title">
          <img src={assetUrl(baseUrl, modal.logo)} alt={modal.brandName} />
          {fmt(labels.settingsPanel.title, { name: modal.brandName })}
        </span>
      }
      titleId="intg-settings-title"
      closeLabel={labels.close}
      onClose={onClose}
      zIndex={10000}
      className="adm-shell"
      bodyClassName="tl-emp-modal-body intg-settings-body"
      testId="intg-settings-modal"
      overlayTestId="intg-settings-overlay"
      footer={
        <>
          {onDisconnect && (
            <button
              type="button"
              className="tl-group-modal-btn adm-btn-danger-ghost"
              onClick={() => onDisconnect(modal.app)}
              data-testid="intg-settings-disconnect"
            >
              {labels.actions.disconnect}
            </button>
          )}
          <button
            type="button"
            className="tl-group-modal-btn tl-group-modal-btn-secondary"
            onClick={onClose}
            data-testid="intg-settings-cancel"
          >
            {labels.actions.cancel}
          </button>
          <button
            type="button"
            className="tl-group-modal-btn tl-group-modal-btn-primary"
            onClick={save}
            disabled={!dirty || saving}
            aria-live="polite"
            data-testid="intg-settings-save"
          >
            {savedFlash && !dirty ? (
              <span className="intg-saved" data-testid="intg-settings-saved">
                <CheckGlyph size={14} aria-hidden />
                {labels.settingsPanel.saved}
              </span>
            ) : labels.saveSettings}
          </button>
        </>
      }
    >
      {(modal.fields ?? []).map((field) => {
        // `showWhen` 이 맞지 않는 칸은 숨긴다. draft 에는 남아 저장할 때 같이 나간다 — 범위를 「전체」로 바꿔도
        // 골라 둔 목록은 지워지지 않는다 (PW-1770).
        if (field.showWhen && draft[field.showWhen.key] !== field.showWhen.value) return null;
        if (field.kind === 'checkboxGroup' && field.list) {
          return (
            <SettingRow key={field.key} label={field.label} group testId={`intg-setting-${field.key}`}>
              <CheckboxListPicker
                field={field}
                selected={Array.isArray(draft[field.key]) ? draft[field.key] : []}
                onToggle={(v) => toggleInGroup(field, v)}
                onSetMany={(next) => setField(field.key, next)}
              />
            </SettingRow>
          );
        }
        return (
        <SettingRow key={field.key} label={field.label} group={field.kind === 'checkboxGroup'} testId={`intg-setting-${field.key}`}>
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
                <Checkbox
                  key={o.value}
                  checked={Array.isArray(draft[field.key]) && draft[field.key].includes(o.value)}
                  onChange={() => toggleInGroup(field, o.value)}
                  label={o.label}
                />
              ))}
            </div>
          )}
          {field.kind === 'toggle' && (
            <Switch
              checked={!!draft[field.key]}
              onChange={(v) => setField(field.key, v)}
              label={field.label}
            />
          )}
          {/* 고를 것 없이 읽기만 하는 한 줄 — 저장하지 않는다 (pivit-work PW-1671 「변경 사항을 바로 받습니다」). */}
          {field.kind === 'text' && (
            <span className="intg-setting-text" data-testid={`intg-setting-text-${field.key}`}>
              {field.text}
            </span>
          )}
          {/* 새 창으로 여는 글자 링크 — 값이 아니라 바깥 설정 화면으로 보낸다 (PW-1152 GitHub 저장소 범위).
              draft 에는 싣지만 저장하지 않는 칸이다. 주소가 없으면 그리지 않는다. */}
          {field.kind === 'link' && field.href && (
            <a
              className="intg-setting-link"
              href={field.href}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`intg-setting-link-${field.key}`}
            >
              {field.linkLabel ?? field.label}
            </a>
          )}
        </SettingRow>
        );
      })}
      {/* 기획서 SettingsPanel «설치 · 수집 자격» 줄 — Slack 토큰 관리는 이 버튼으로 여는 따로 화면이다 (PW-3126 · admin-app.jsx 20640) */}
      {modal.app === 'slack' && onOpenOwner && (
        <SettingRow label={labels.owner.settingsRow} testId="intg-setting-owner">
          <span>
            <Button variant="secondary" size="sm" className="intg-btn" onClick={onOpenOwner} data-testid="intg-open-owner">
              {labels.owner.open}
              <ArrowRightGlyph size={14} aria-hidden />
            </Button>
          </span>
        </SettingRow>
      )}
    </ModalShell>
  );
}

/* ── 동기화 로그 테이블 ─────────────────────────────────────────────── */

/* 상태 칸 — 딱지 대신 작은 상태 글자(매니저 KR `.mgr-kr-status` · PW-3126). 셋 — 성공 · 일부 수집 · 실패
   (screen-integrations.policy §2-5 · pivit-work PW-3128). 사유는 아래 줄에 옅게 · 길면 «…»(말풍선으로 전부). */
function SyncState({ log, labels, baseUrl }) {
  if (log.status === 'success') {
    return (
      <span className="mgr-kr-status is-success" data-status="success">
        <Icon src={ICON_SYNC_OK} size={12} baseUrl={baseUrl} />
        {labels.syncLog.success}
      </span>
    );
  }
  const partial = log.status === 'partial';
  return (
    <span className="intg-state" data-status={log.status}>
      <span className={`mgr-kr-status ${partial ? 'is-warning' : 'is-error'}`}>
        <Icon src={partial ? ICON_ALERT : ICON_SYNC_FAILED} size={12} baseUrl={baseUrl} />
        {partial ? labels.syncLog.partial : labels.syncLog.failed}
      </span>
      {log.error && (
        <span className="intg-state-reason" title={log.error}>
          {log.error}
        </span>
      )}
    </span>
  );
}

function ServiceName({ icon, name }) {
  return (
    <span className="intg-svc">
      {icon && icon.startsWith('/')
        ? <img src={icon} alt="" />
        : icon ? <span aria-hidden>{icon}</span> : null}
      {name}
    </span>
  );
}

function SyncLogTable({ logs, labels, baseUrl, onRetrySyncLog }) {
  if (!logs || logs.length === 0) {
    return <div className="intg-empty" data-testid="intg-sync-log-empty">{labels.syncLog.noLogs}</div>;
  }
  return (
    <FrameTable
      testId="intg-sync-log-table"
      rows={logs}
      rowKey={(log) => log.id}
      empty={labels.syncLog.noLogs}
      columns={[
        { key: 'service', header: labels.syncLog.service, render: (log) => <ServiceName icon={log.serviceIcon} name={log.service} /> },
        { key: 'time', header: labels.syncLog.time, render: (log) => log.timeLabel },
        { key: 'count', header: labels.syncLog.count, align: 'right', render: (log) => log.count.toLocaleString() },
        { key: 'status', header: labels.syncLog.status, lines: 2, render: (log) => <SyncState log={log} labels={labels} baseUrl={baseUrl} /> },
        {
          key: 'retry',
          header: '',
          align: 'center',
          render: (log) => log.status === 'failed' && log.retryable !== false && onRetrySyncLog ? (
            <Button variant="secondary" size="sm" className="intg-btn" onClick={() => onRetrySyncLog(log.service)}>
              {labels.syncLog.retry}
            </Button>
          ) : null,
        },
      ]}
    />
  );
}

/**
 * 데이터 수집 현황 (integrations-spec §5) — 앱마다 마지막 성공 시각 · 지난 7일 수집 건수 · 실패와 [재시도].
 * 행은 호스트가 만든다: `{ app, service, serviceIcon, lastSuccessLabel, records7d, failedCount }`.
 * [재시도] 는 동기화 로그의 [재시도] 와 같은 콜백 — 그 앱을 다시 연결한다(policy §7).
 * 흰 판 · 표는 공용 틀(Panel · FrameTable · PW-3126). 표 내용은 그대로, «없음»만 옅게.
 */
function CollectionStatus({ rows, labels, onRetrySyncLog }) {
  const l = labels.collection;
  return (
    <Panel title={l.title} testId="intg-collection-status">
      {rows.length === 0 ? (
        <div className="intg-empty">{l.empty}</div>
      ) : (
        <FrameTable
          rows={rows}
          rowKey={(r) => r.app}
          empty={l.empty}
          columns={[
            { key: 'service', header: l.service, render: (r) => <ServiceName icon={r.serviceIcon} name={r.service} /> },
            { key: 'lastSuccess', header: l.lastSuccess, render: (r) => r.lastSuccessLabel || <span className="intg-muted">{l.never}</span> },
            {
              key: 'records7d',
              header: l.records7d,
              align: 'right',
              render: (r) => (typeof r.records7d === 'number' ? r.records7d.toLocaleString() : <span className="intg-muted">{l.never}</span>),
            },
            {
              key: 'failures',
              header: l.failures,
              render: (r) => (r.failedCount > 0 ? (
                <span className="intg-row-value">
                  <DpStatusBadge className="admin-pill" tone="danger">{fmt(l.failedCount, { count: r.failedCount })}</DpStatusBadge>
                  {onRetrySyncLog && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="intg-btn"
                      data-testid={`intg-collection-retry-${r.app}`}
                      onClick={() => onRetrySyncLog(r.service)}
                    >
                      {labels.syncLog.retry}
                    </Button>
                  )}
                </span>
              ) : <span className="intg-muted" data-testid={`intg-collection-none-${r.app}`}>{l.noFailures}</span>),
            },
          ]}
        />
      )}
    </Panel>
  );
}

/* ── Slack 소유자 권한 관리 ─────────────────────────────────────────── */

function TokenLogItem({ entry, labels }) {
  const isExpire = entry.action === 'expire';
  return (
    <div className="intg-token-log" data-testid={`intg-token-log-${entry.id}`}>
      <span className="intg-token-log-date">{entry.dateLabel}</span>
      <span className="intg-token-log-text">{entry.description}</span>
      <span className={`mgr-kr-status ${isExpire ? 'is-error' : 'is-success'}`}>
        {isExpire ? labels.transfer.actionExpire : labels.transfer.actionReauth}
      </span>
    </div>
  );
}

/* 「Slack 으로 받지 못하는 구성원」 창 (PW-2054 · policy §4-B ⑧) — 공용 창 틀(ModalShell)에 공용 표 틀(FrameTable)을 담는다.
   사유는 하나뿐이다(메일로 Slack 멤버를 못 찾음). 읽기만 하는 창이라 [닫기] 하나짜리 버튼 줄.
   많아도 한 화면(PW-3126) — 표만 8줄 높이 안에서 넘기고 머리 줄은 고정, 위에 검색칸과 «N명».
   불러오기 실패는 창 안에 그대로 두고 [다시 시도] — 「없습니다」로 보이지 않게 빈 목록과 따로 그린다. */
const UNMATCHED_MAX_ROWS = 8;

function SlackUnmatchedModal({ modal, labels, onClose, onRetry }) {
  const L = labels.slackDelivery;
  const [query, setQuery] = useState('');
  const rows = modal.rows ?? [];
  const q = query.trim().toLowerCase();
  const shown = q
    ? rows.filter((r) => [r.name, r.orgPath, r.email].some((v) => String(v ?? '').toLowerCase().includes(q)))
    : rows;
  return (
    <ModalShell
      title={L.modalTitle}
      description={<DescLines text={L.modalDescription} />}
      titleId="intg-slack-unmatched-title"
      closeLabel={L.close}
      onClose={onClose}
      footer={
        <button
          type="button"
          className="tl-group-modal-btn tl-group-modal-btn-secondary"
          onClick={onClose}
          data-testid="intg-slack-unmatched-close"
        >
          {L.close}
        </button>
      }
      className="adm-shell is-xwide"
      bodyClassName="tl-emp-modal-body"
      testId="intg-slack-unmatched-modal"
    >
      {modal.state === 'loading' && <div className="intg-empty">{labels.loading}</div>}
      {modal.state === 'error' && (
        <IntgBand
          tone="error"
          role="alert"
          lines={[L.loadFailed]}
          actions={
            <Button variant="secondary" size="sm" className="intg-btn" onClick={onRetry}>
              {L.retry}
            </Button>
          }
          testId="intg-slack-unmatched-error"
        />
      )}
      {modal.state === 'ready' && (
        <>
          {rows.length > 0 && (
            <div className="intg-unmatched-head">
              <SearchInput
                className="dp-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={L.searchPlaceholder}
                aria-label={L.searchPlaceholder}
                iconSize={14}
                data-testid="intg-slack-unmatched-search"
              />
              <span className="intg-unmatched-count" data-testid="intg-slack-unmatched-count">
                {fmt(L.countLabel, { count: rows.length })}
              </span>
            </div>
          )}
          <FrameTable
            testId="intg-slack-unmatched-table"
            columns={[
              { key: 'name', header: L.colName, render: (r) => r.name || '—' },
              { key: 'orgPath', header: L.colOrg, render: (r) => r.orgPath || '—' },
              { key: 'email', header: L.colEmail, render: (r) => r.email || '—' },
              { key: 'reason', header: L.colReason, render: () => L.reasonNoEmailMatch },
            ]}
            rows={shown}
            rowKey={(r) => r.id}
            empty={rows.length === 0 ? L.empty : L.noMatch}
            maxRows={UNMATCHED_MAX_ROWS}
          />
        </>
      )}
    </ModalShell>
  );
}

/* 토큰 만료·재인증 확인 창 — 공용 확인 창(ConfirmModal · PW-836). 본문은 문장마다 줄(PW-3126). */
function ExpireModal({ labels, onClose, onConfirm, error, busy }) {
  const L = labels.transfer.expireModal;
  const warning = sentences(L.warning);
  return (
    <ConfirmModal
      testId="intg-expire-modal"
      title={L.title}
      body={
        <div className="intg-owner-view">
          <NoticeLines lines={sentences(L.description)} />
          <IntgBand tone="error" lines={warning} />
          {/* 서버 거절 사유가 있으면 그 문장, 없으면 고정 문구 — 빨간 줄은 하나(pivit-work PW-3126) */}
          {error && <IntgBand tone="error" role="alert" lines={sentences(error)} testId="intg-expire-error" />}
        </div>
      }
      cancelLabel={L.cancel}
      confirmLabel={L.confirm}
      danger
      busy={busy}
      zIndex={10000}
      onCancel={() => { if (!busy) onClose(); }}
      onConfirm={onConfirm}
    />
  );
}

function ReauthModal({ owner, me, labels, onClose, onConfirm }) {
  const L = labels.transfer.reauthModal;
  // 현재 로그인 사용자가 토큰 소유자와 다르면 경고. 소유자 여부는 소비자가
  // owner.isCurrentUser 로 판단해 전달한다(기본 undefined → 경고 노출: 안전측).
  const isDifferentOwner = owner.isCurrentUser !== true;
  // Slack 워크스페이스 관리자만 인증할 수 있다. 소비자가 «아니다»(false)를 확인했을 때만 잠근다 —
  // 모르면(undefined·null) 막지 않는다(서버가 다시 확인한다).
  const notSlackAdmin = me?.isSlackAdmin === false;
  const person = me?.name ? { name: me.name, title: me.title, avatar: me.avatar } : owner;
  return (
    <ConfirmModal
      testId="intg-reauth-modal"
      title={L.title}
      body={
        <div className="intg-owner-view">
          {L.guide && (
            <div data-testid="intg-reauth-guide">
              <NoticeLines lines={sentences(L.guide)} />
            </div>
          )}
          {/* 사람 칸 — 누르는 사람(나) · 아바타 · 이름 · 직함 + Slack 관리자 딱지(기획서 ReauthModal `me` · pivit-work PW-3126).
              소비자가 me 이름을 안 주면 옛 동작대로 소유자를 그린다. */}
          <div className="intg-modal-usercard is-outline" data-testid="intg-reauth-person">
            <OwnerAvatar name={person.name} avatar={person.avatar} size={44} />
            <div className="intg-person-main">
              <div className="intg-owner-name">{person.name}</div>
              {/* 직함이 비면 «직함:» 만 남지 않게 줄을 그리지 않는다(PW-3151). */}
              {person.title ? (
                <div className="intg-owner-sub">
                  {L.titleLabel}: {person.title}
                </div>
              ) : null}
            </div>
            {/* 딱지는 «나»의 것 — 이름을 몰라 소유자를 그릴 때는 붙이지 않는다(남의 이름 옆에 내 딱지가 붙지 않게) */}
            {person !== owner && me?.isSlackAdmin === true && (
              <DpStatusBadge className="admin-pill" tone="success" data-testid="intg-reauth-slack-admin">{L.slackAdminBadge}</DpStatusBadge>
            )}
            {person !== owner && notSlackAdmin && (
              <DpStatusBadge className="admin-pill" tone="danger" data-testid="intg-reauth-not-slack-admin-badge">{L.notSlackAdminBadge}</DpStatusBadge>
            )}
          </div>

          {isDifferentOwner && (
            <IntgBand
              tone="warning"
              lines={sentences(`${owner.name}${L.differentOwnerWarning}`)}
              testId="intg-reauth-diff-owner-warning"
            />
          )}

          {notSlackAdmin && (
            <IntgBand tone="error" lines={sentences(L.notSlackAdmin)} testId="intg-reauth-not-slack-admin" />
          )}
        </div>
      }
      confirmDisabled={notSlackAdmin}
      cancelLabel={L.cancel}
      confirmLabel={L.confirm}
      zIndex={10000}
      onCancel={onClose}
      onConfirm={onConfirm}
    />
  );
}

/**
 * Slack 소유자 권한 관리 — 따로 화면 (기획서 admin-app.jsx SlackTransferView · PW-3126).
 * 연동 설정 Slack 설정 창의 [소유자 권한 관리 →] · 오류 카드 [권한 관리] 로 열고 [← 연동 설정] 으로 돌아간다.
 * 순서: 토큰 만료 띠 → Slack 머리(로고 · 이름 · 설명 · 상태) · 설치 · 수집 자격 · 숫자 셋 → 토큰 이력.
 */
function SlackOwnerView({ notices, transfer, card, labels, baseUrl, onBack, onExpireToken, onReauth, onRetryTokenLogs }) {
  const [showExpireModal, setShowExpireModal] = useState(false);
  const [showReauthModal, setShowReauthModal] = useState(false);
  // 창 안 실패 글(서버 사유 또는 고정 문구) — 빈 글이면 그리지 않는다.
  const [expireError, setExpireError] = useState('');
  // 요청이 도는 동안 확인을 잠근다 — 같은 틱의 두 번째 누름도 거른다(pivit-work PW-3126).
  const [expireBusy, setExpireBusy] = useState(false);
  const expireInFlight = useRef(false);
  const owner = transfer.owner;
  // 설치(기록)는 처음 설치한 관리자 — 재인증해도 안 바뀐다. 넘기지 않으면 수집 자격자와 같은 사람으로 본다.
  const installer = transfer.installer ?? owner;
  const app = transfer.app ?? 'slack';

  const handleExpireConfirm = async () => {
    if (expireInFlight.current) return;
    expireInFlight.current = true;
    setExpireBusy(true);
    try {
      setExpireError('');
      await onExpireToken(app);
      setShowExpireModal(false);
    } catch (e) {
      // 앱이 이미 알린 실패(이용 정지 등)는 창 안 글을 겹쳐 쓰지 않는다(PW-2907) — failureText 가 빈 글.
      // 앱이 실은 서버 사유(err.message)가 있으면 그 문장, 없으면 고정 문구(PW-3126).
      setExpireError(failureText(e, labels.transfer.expireModal.error));
    } finally {
      expireInFlight.current = false;
      setExpireBusy(false);
    }
  };

  const handleReauthConfirm = () => {
    onReauth(app);
    setShowReauthModal(false);
  };

  return (
    <div className="intg-owner-view" data-testid="intg-transfer-panel">
      <Button variant="secondary" size="sm" className="intg-btn intg-owner-back" onClick={onBack} data-testid="intg-owner-back">
        <ArrowLeftGlyph size={14} aria-hidden />
        {labels.owner.back}
      </Button>
      <h1 className="admin-page-title" data-testid="intg-owner-title">{labels.owner.title}</h1>
      {/* 구성원 못 읽음 같은 띠 — 제목 아래(제목을 밀어내지 않게). 소유자 이름이 «—»로 남는 바로 그 화면이다 (PW-217) */}
      {notices}

      {transfer.isExpired && (
        <IntgBand
          tone="warning"
          lines={sentences(labels.transfer.expiredBanner.message)}
          actions={
            <Button variant="secondary" size="sm" className="intg-btn" onClick={() => setShowReauthModal(true)}>
              {labels.transfer.expiredBanner.reauthLink}
              <ArrowRightGlyph size={14} aria-hidden />
            </Button>
          }
          testId="intg-owner-expired"
        />
      )}

      <Panel testId="intg-owner-panel">
        {card && (
          <div className="intg-app-head">
            <span className="intg-app-logo">
              <img src={assetUrl(baseUrl, card.logo)} alt={card.brandName} loading="lazy" />
            </span>
            <div className="intg-app-titles">
              <span className="intg-app-name">{card.brandName}</span>
              <span className="intg-app-desc">{card.description}</span>
            </div>
            {/* 토큰을 만료한 뒤에는 «인증 필요»(기획서 SlackTransferView statusConfig.connecting · admin-app.jsx 21181) */}
            {transfer.isExpired ? (
              <DpStatusBadge className="admin-pill" tone="warning" data-testid="intg-owner-status">{labels.owner.needsAuth}</DpStatusBadge>
            ) : (
              <StatusBadge status={card.status} labels={labels} />
            )}
          </div>
        )}

        {/* 설치 — 회사의 앱 설치를 누가 언제 했나. 기록일 뿐이라 버튼이 없다 */}
        <Panel.Section title={labels.transfer.installSection} testId="intg-install-section">
          <div className="intg-person">
            <OwnerAvatar name={installer.name} avatar={installer.avatar} />
            <div className="intg-person-main">
              <div className="intg-owner-name">
                {installer.name}
                <DpStatusBadge className="admin-pill" tone="neutral">{labels.transfer.installerBadge}</DpStatusBadge>
              </div>
              <div className="intg-owner-sub">
                {installer.title ? `${installer.title} · ` : ''}
                {transfer.installedLabel}
              </div>
            </div>
          </div>
        </Panel.Section>

        {/* 수집 자격 — 수집에 쓰는 개인 자격. [토큰 만료]·[재인증]은 이것만 바꾸고 Slack 알림은 계속 나간다 */}
        <Panel.Section title={labels.transfer.credentialSection} testId="intg-credential-section">
          <div className="intg-person">
            <OwnerAvatar name={owner.name} avatar={owner.avatar} />
            <div className="intg-person-main">
              <div className="intg-owner-name">
                {fmt(labels.transfer.credentialAccount, { name: owner.name })}
                {transfer.isExpired && (
                  <DpStatusBadge className="admin-pill" tone="warning" data-testid="intg-credential-expired">
                    {labels.transfer.expiredBadge}
                  </DpStatusBadge>
                )}
                {owner.isSlackAdmin && (
                  <DpStatusBadge className="admin-pill" tone="success" data-testid="intg-owner-slack-admin">
                    {labels.transfer.slackAdminLabel}
                  </DpStatusBadge>
                )}
              </div>
              <div className="intg-owner-sub">
                {owner.title ? `${owner.title} · ` : ''}
                {transfer.connectedLabel}
              </div>
            </div>
            <div className="intg-actions">
              {/* 누를 수 있는지는 앱이 정해 넘긴다(PW-1058) — 서버는 연결됨일 때만 만료를 받는다.
                  넘기지 않으면 예전처럼 늘 눌린다. */}
              <Button
                variant="danger-ghost"
                size="sm"
                className="intg-btn"
                onClick={() => setShowExpireModal(true)}
                disabled={transfer.canExpireToken === false}
                data-testid="intg-expire-token"
              >
                {labels.transfer.expireToken}
              </Button>
              <Button variant="primary" size="sm" className="intg-btn" onClick={() => setShowReauthModal(true)} data-testid="intg-reauth">
                {labels.transfer.reauth}
              </Button>
            </div>
          </div>

          <div className="intg-tri" data-testid="intg-owner-stats">
            {(transfer.stats ?? []).map((stat) => (
              <div key={stat.label}>
                <span className="intg-tri-label">{stat.label}</span>
                <span className={`intg-tri-value${stat.muted ? ' is-muted' : ''}${stat.tone === 'warning' ? ' is-warning' : ''}`}>{stat.value}</span>
              </div>
            ))}
          </div>
        </Panel.Section>
      </Panel>

      <Panel title={labels.transfer.tokenHistory} testId="intg-token-history">
        {transfer.tokenLogsFailed ? (
          // 못 읽음 — 빈 이력처럼 보이지 않게 이 자리에서 말한다(pivit-work PW-3128).
          <IntgBand
            tone="error"
            role="alert"
            lines={[labels.transfer.logsLoadFailed]}
            actions={onRetryTokenLogs && (
              <Button variant="secondary" size="sm" className="intg-btn" onClick={onRetryTokenLogs}>
                {labels.transfer.logsRetry}
              </Button>
            )}
            testId="intg-token-logs-failed"
          />
        ) : (transfer.tokenLogs ?? []).length === 0 ? (
          <div className="intg-muted" data-testid="intg-token-logs-empty">{labels.transfer.noLogs}</div>
        ) : (
          <div>
            {transfer.tokenLogs.map((entry) => <TokenLogItem key={entry.id} entry={entry} labels={labels} />)}
          </div>
        )}
        <NoticeLines tone="muted" lines={[labels.transfer.tokenHistoryFooter]} />
      </Panel>

      {showExpireModal && (
        <ExpireModal labels={labels} onClose={() => { setShowExpireModal(false); setExpireError(''); }} onConfirm={handleExpireConfirm} error={expireError} busy={expireBusy} />
      )}
      {showReauthModal && (
        <ReauthModal owner={owner} me={transfer.me} labels={labels} onClose={() => setShowReauthModal(false)} onConfirm={handleReauthConfirm} />
      )}
    </div>
  );
}

/* ── 탭 스위처 ──────────────────────────────────────────────────────── */

function TabSwitcher({ active, labels, onChange, showAdminTab }) {
  return (
    <div className="tl-tabs-row adm-tabs-row">
      <Tabs
        items={[
          { value: 'apps', label: labels.tabs.appIntegrations, testId: 'intg-tab-apps' },
          { value: 'syncLog', label: labels.tabs.syncLog, testId: 'intg-tab-syncLog' },
          // 「어드민 관리」 — 어드민만(policy §2-2). 호스트가 adminTab 을 줄 때만 그린다.
          ...(showAdminTab ? [{ value: 'admin', label: labels.tabs.admin, testId: 'intg-tab-admin' }] : []),
        ]}
        value={active}
        onChange={onChange}
      />
    </div>
  );
}

/* ── 메인 캔버스 ────────────────────────────────────────────────────── */

export default function AdminIntegrationsCanvas({
  /** 제목 바로 오른쪽 «?» 튜토리얼 도움말 버튼 (pivit-work PW-2430). 안 주면 지금과 같다. */
  titleHelp,
  activeTab,
  cards = [],
  stats = [],
  loading = false,
  errorState = null,
  toast = null,
  toastTone = 'success',
  transfer = null,
  settingsModal = null,
  syncLogs = [],
  syncLogsLoading = false,
  /** 「모든 서비스 미연동」이면 true — 앱 목록 위에 안내 배너를 그린다(policy §11). */
  showEmptyBanner = false,
  /** 하단 데이터 수집 현황 행(integrations-spec §5). `null` 이면 구역을 그리지 않는다. */
  collectionStatus = null,
  /**
   * «휴가 캘린더 기록» 칸(pivit-work PW-2791 · 연동 정책 §4-C-2) — 서비스 카드 아래. `null` 이면 그리지 않는다
   * (휴가 패키지가 꺼졌거나 Google Calendar 가 꺼진 회사). `{ state, onTurnOff, onConnect, onSave, onDisconnect, onLoadCalendars }`
   * — 모양은 AdminIntegrationsLeaveCalendar.jsx 머리 주석. 문구는 `labels.leaveCalendar`.
   */
  leaveCalendar = null,
  /**
   * 숫자 칸 바로 위 경고 띠(PW-3126) — 일부 못 읽음 · 구성원 못 읽음처럼 호스트가 아는 실패.
   * `[{ key, tone: 'error'|'warning', text, actionLabel?, onAction?, testId? }]` — 글은 마침표에서 줄만 나눈다.
   */
  notices = [],
  /** 「회의실 불러오기」 블록 — 호스트가 그린 것을 앱 카드 바로 아래(기획서 순서)에 끼운다. 없으면 그리지 않는다 */
  roomImport = null,
  /**
   * 「시트에 기록 (워크플로우)」 블록(pivit-work PW-3207 · 연동 정책 §4-F-2) — 호스트가 그린 것을 «휴가 캘린더 기록» 칸 바로 아래에 끼운다.
   * 자리는 회의실 불러오기 · 휴가 캘린더 기록 다음(§4-F-2 머리). 없으면 그리지 않는다
   */
  sheetRecord = null,
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
  onSettingsMinSelectedBlocked = () => {},
  onPersonalIntegrationClick = () => {},
  onExpireToken = () => {},
  onReauth = () => {},
  onRetrySyncLog = () => {},
  /** 토큰 이력 [다시 시도] — `transfer.tokenLogsFailed` 일 때 이력 자리에 뜬다 */
  onRetryTokenLogs,
  onRetryLoad = () => {},
  /**
   * 「어드민 관리」 탭(policy §2-9). `null` 이면 탭을 그리지 않는다.
   * `{ catalog, catalogState, requests, requestsState, busyToolIds, busyRequestIds }`
   * — 행 모양은 AdminIntegrationsCatalog.jsx 머리 주석.
   */
  adminTab = null,
  /** 앱 연동 탭 하단 «어드민 활성화 필요» — 꺼진 수집 툴 `[{ id, name, logo? }]` (policy §2-7) */
  inactiveTools = [],
  /** 개인 연동 칩 — 수집 툴 `[{ id, name, status, allowPersonal }]` (policy §2-6). 비면 그리지 않는다 */
  personalChips = [],
  /** 연동 요청 배너를 그릴지 (policy §2-8) */
  showRequestBanner = false,
  /** 열린 요청 창 `{ email, submitting, error }` · 닫혀 있으면 null */
  requestModal = null,
  onToggleToolStatus = () => {},
  onTogglePersonal = () => {},
  onRequestAction = () => {},
  onRetryCatalog,
  onRetryRequests,
  onOpenRequestModal = () => {},
  onCloseRequestModal = () => {},
  onSubmitRequest = () => {},
  /**
   * 「Slack 으로 받지 못하는 구성원」 창 (PW-2054 · policy §4-B ⑧) · 닫혀 있으면 null.
   * `{ state: 'loading' | 'ready' | 'error', rows: [{ id, name, orgPath, email }] }` — 목록은 [보기] 를 누를 때 호스트가 받는다.
   */
  slackUnmatchedModal = null,
  onOpenSlackUnmatched = () => {},
  onCloseSlackUnmatched = () => {},
  onRetrySlackUnmatched = () => {},
}) {
  const labels = merge(DEFAULT_LABELS, providedLabels);

  // 탭: controlled(activeTab prop) + uncontrolled fallback. 항상 onTabChange 방출.
  const [internalTab, setInternalTab] = useState('apps');
  const tab = activeTab ?? internalTab;
  const changeTab = (next) => {
    setInternalTab(next);
    if (onTabChange) onTabChange(next);
  };
  // Slack 소유자 권한 관리 — 따로 화면(PW-3126). 설정 창 [소유자 권한 관리 →] · 오류 카드 [권한 관리] 로 연다.
  const [ownerOpen, setOwnerOpen] = useState(false);
  // 소유자 정보가 사라지면(해제 · 다시 읽기 실패) 닫힌 것으로 돌린다 — 정보가 다시 오면 누르지 않았는데 저절로 다시 뜨지 않게
  // (그리는 중에 고친다 — React «props 가 바뀔 때 state 맞추기» 방식)
  if (!transfer && ownerOpen) setOwnerOpen(false);
  const openOwner = transfer
    ? () => {
        onCloseSettings();
        setOwnerOpen(true);
      }
    : undefined;
  const noticeBands = notices.map((n) => (
    <IntgBand
      key={n.key}
      tone={n.tone ?? 'warning'}
      lines={sentences(n.text)}
      role="status"
      actions={n.actionLabel && n.onAction ? (
        <Button
          variant="secondary"
          size="sm"
          className="intg-btn"
          onClick={n.onAction}
          data-testid={n.testId ? `${n.testId}-retry` : undefined}
        >
          {n.actionLabel}
        </Button>
      ) : null}
      testId={n.testId}
    />
  ));

  // ── 전체화면 상태: 로딩 ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="admin-canvas" data-testid="intg-loading">
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)', fontSize: 13 }}>
          {labels.loading}
        </div>
      </div>
    );
  }

  // 개인 연동 안내는 «항상» 보인다 (기획 screen-integrations.policy.md §2-6 · PW-2474) —
  // 회사 연동 목록을 못 불러온 화면에서도 [내 설정으로 이동] 으로 내 설정 › 연동에 갈 수 있어야 한다.
  // 바탕 없는 흰 줄 + 흰 보조 버튼(PW-3126 · «다른 화면으로 가는 길»).
  const personalBanner = (
    <Panel testId="intg-personal-banner">
      <div className="intg-line">
        <UserGlyph size={20} aria-hidden />
        <div className="intg-line-text">
          <NoticeLines lines={[<strong key="m">{labels.personalBanner.message}</strong>, labels.personalBanner.description]} />
          <PersonalChips tools={personalChips} labels={labels} />
        </div>
        <Button variant="secondary" size="sm" className="intg-btn" onClick={onPersonalIntegrationClick}>
          {labels.personalBanner.button}
          <ArrowRightGlyph size={14} aria-hidden />
        </Button>
      </div>
    </Panel>
  );

  // ── 전체화면 상태: 권한없음(403) / 조회실패 ──────────────────────
  if (errorState) {
    const forbidden = errorState.kind === 'forbidden';
    return (
      <div className="admin-canvas" data-testid="intg-error">
        <header className="admin-header">
          <div className="admin-header-titles">
            <h1 className="admin-page-title">{labels.summary.title}{titleHelp}</h1>
            <p className="admin-page-subtitle">{labels.summary.description}</p>
          </div>
        </header>
        <div className="intg-apps">
          <Panel testId="intg-error-panel">
            <div className="intg-empty">
              <span className="intg-empty-title">
                {forbidden ? labels.error.forbiddenTitle : labels.error.loadFailedTitle}
              </span>
              <NoticeLines tone="muted" lines={sentences(forbidden ? labels.error.forbiddenDesc : labels.error.loadFailedDesc)} />
              {!forbidden && (
                <Button variant="secondary" size="sm" className="intg-btn" onClick={() => onRetryLoad()}>
                  {labels.error.retry}
                </Button>
              )}
            </div>
          </Panel>
          {personalBanner}
        </div>
      </div>
    );
  }

  const slackCard = cards.find((c) => c.app === 'slack');

  // ── Slack 소유자 권한 관리 — 따로 화면 ────────────────────────────
  if (ownerOpen && transfer) {
    return (
      <div className="admin-canvas" data-testid="intg-canvas">
        <Toast message={toast} tone={toastTone} data-testid="intg-toast" />
        <SlackOwnerView
          notices={noticeBands}
          transfer={transfer}
          card={slackCard}
          labels={labels}
          baseUrl={baseUrl}
          onBack={() => setOwnerOpen(false)}
          onExpireToken={onExpireToken}
          onReauth={onReauth}
          onRetryTokenLogs={onRetryTokenLogs}
        />
      </div>
    );
  }

  return (
    <div className="admin-canvas" data-testid="intg-canvas">
      {/* 알림 문구는 공용 Toast 한 벌 (PW-1010). 실패 문구는 toastTone="error" 로 빨강 */}
      <Toast message={toast} tone={toastTone} data-testid="intg-toast" />

      <header className="admin-header">
        <div className="admin-header-titles">
          <h1 className="admin-page-title">{labels.summary.title}{titleHelp}</h1>
          <p className="admin-page-subtitle">{labels.summary.description}</p>
        </div>
      </header>

      <TabSwitcher active={tab} labels={labels} onChange={changeTab} showAdminTab={!!adminTab} />

      {tab === 'apps' && (
        <div className="intg-apps">
          {noticeBands}

          <StatStrip
            testId="intg-stats"
            ariaLabel={labels.summary.title}
            items={stats.map((s) => ({ key: s.key ?? s.label, label: s.label, value: s.value, tone: s.tone }))}
          />

          {showEmptyBanner && (
            <IntgBand tone="info" lines={[labels.emptyBanner]} testId="intg-empty-banner" />
          )}

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
                onOpenSlackUnmatched={onOpenSlackUnmatched}
                onOpenOwner={openOwner}
              />
            ))}
          </div>

          {/* 기획서 순서 — 앱 카드 바로 아래 회의실 불러오기(policy §4-E · admin-app.jsx IntegrationsView) */}
          {roomImport}

          {leaveCalendar && (
            <AdminIntegrationsLeaveCalendar
              key={`${leaveCalendar.state.enabled}:${leaveCalendar.state.account ?? ''}:${leaveCalendar.state.calendarId ?? ''}`}
              {...leaveCalendar}
              labels={{ ...LEAVE_CALENDAR_DEFAULT_LABELS, ...labels.leaveCalendar }}
            />
          )}

          {/* 기획서 순서 — 회의실 불러오기 · 휴가 캘린더 기록 다음 «시트에 기록 (워크플로우)»(policy §4-F-2) */}
          {sheetRecord}

          {settingsModal && (
            <SettingsModal
              key={settingsModal.app}
              modal={settingsModal}
              labels={labels}
              baseUrl={baseUrl}
              onClose={onCloseSettings}
              onSave={onSaveSettings}
              onDisconnect={onDisconnect}
              onMinSelectedBlocked={onSettingsMinSelectedBlocked}
              onOpenOwner={openOwner}
            />
          )}

          {collectionStatus && (
            <CollectionStatus rows={collectionStatus} labels={labels} onRetrySyncLog={onRetrySyncLog} />
          )}

          <InactiveToolsArea tools={inactiveTools} labels={labels} baseUrl={baseUrl} />

          {showRequestBanner && <RequestBanner labels={labels} onOpen={onOpenRequestModal} />}

          {personalBanner}
        </div>
      )}

      {tab === 'admin' && adminTab && noticeBands}
      {tab === 'admin' && adminTab && (
        <AdminCatalogPanel
          {...adminTab}
          labels={labels}
          baseUrl={baseUrl}
          onToggleToolStatus={onToggleToolStatus}
          onTogglePersonal={onTogglePersonal}
          onRequestAction={onRequestAction}
          onRetryCatalog={onRetryCatalog}
          onRetryRequests={onRetryRequests}
        />
      )}
      {/* 개인 연동 안내는 세 탭 모두 아래에(policy §2-6 «항상» · 기획서 탭 블록 밖 · pivit-work PW-3126) */}
      {tab === 'admin' && adminTab && personalBanner}

      {slackUnmatchedModal && (
        <SlackUnmatchedModal
          modal={slackUnmatchedModal}
          labels={labels}
          onClose={onCloseSlackUnmatched}
          onRetry={onRetrySlackUnmatched}
        />
      )}

      {requestModal && (
        <RequestToolModal
          modal={requestModal}
          labels={labels}
          onClose={onCloseRequestModal}
          onSubmit={onSubmitRequest}
        />
      )}

      {tab === 'syncLog' && (
        <div className="intg-apps">
          {noticeBands}
          <Panel testId="intg-sync-log">
            {syncLogsLoading
              ? <div className="intg-empty">{labels.loading}</div>
              : <SyncLogTable logs={syncLogs} labels={labels} baseUrl={baseUrl} onRetrySyncLog={onRetrySyncLog} />}
          </Panel>
          {personalBanner}
        </div>
      )}
    </div>
  );
}
