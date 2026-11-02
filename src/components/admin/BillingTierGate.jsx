// ─────────────────────────────────────────────────────────────
// 티어 게이팅 재사용 컴포넌트 (billing-tier-gate.jsx 포팅)
// 정책: screen-tier-gating.policy.md
// 권위 출처: spec-billing.md §6 (기능→티어 맵 단일 출처)
// 과금 모델: 3단 추가형 Free / Starter / Growth / Pro
// ─────────────────────────────────────────────────────────────

import Tooltip from '../shared/Tooltip.jsx';
import Button from '../shared/Button.jsx';
import ModalLayer from '../shared/ModalLayer.jsx';
import { resolveKoreanParticles } from '../shared/koreanParticle.js';

const T = {
  font: 'var(--font-family-body)',
  card: '#fff',
  border: '#E2E8F0',
  text: '#0F172A',
  sub: '#64748B',
  muted: '#94A3B8',
  accent: '#4F6AF5',
  green: '#22C55E',
  greenBg: '#F0FDF4',
  amber: '#F59E0B',
  amberBg: '#FFFBEB',
  purple: '#8B5CF6',
  purpleBg: '#F5F3FF',
};

/** 티어 서열 (숫자가 클수록 상위 — 추가형 사다리). */
export const TIER_RANK = {
  free: 0,
  starter: 1,
  growth: 2,
  pro: 3,
};

/** 기능 → 필요 최소 티어 (spec-billing.md §6 단일 출처). */
export const FEATURE_TIER = {
  org: 'free',
  admin: 'free',
  timeline: 'free',
  oneon1: 'starter',
  snippet: 'starter',
  okr: 'growth',
  meeting: 'growth',
  report: 'growth',
  eval: 'growth',
  aichat: 'pro',
  advperm: 'pro',
};

const TIER_LABEL = {
  free: 'Free',
  starter: 'Starter',
  growth: 'Growth',
  pro: 'Pro',
};

const DEFAULT_FEATURE_LABEL = {
  org: '조직도·어드민',
  admin: '어드민',
  timeline: '타임라인',
  oneon1: '1on1',
  snippet: '스니핏',
  okr: 'OKR',
  meeting: '회의록',
  report: '리포트',
  eval: '평가',
  aichat: 'AI Chat',
  advperm: '고급 권한·SSO',
};

/** 현재 티어가 필요 티어 이상인지. */
export function isAccessible(currentTier, requiredTier) {
  return (TIER_RANK[currentTier] ?? -1) >= (TIER_RANK[requiredTier] ?? 999);
}

/**
 * 요금제 잠금 딱지 속 작은 자물쇠 — 몸통을 칠한 12칸 그림이라 공용 선 자물쇠(`LockGlyph`)와 다른
 * 그림이다. 이 파일의 두 자리가 이 한 벌을 쓴다(PW-1011).
 */
function MiniLockIcon({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <rect x="2" y="5" width="8" height="6" rx="1.5" fill={color} />
      <path d="M4 5V3.5a2 2 0 0 1 4 0V5" stroke={color} strokeWidth="1.4" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/**
 * LockBadge — 메뉴/버튼 옆에 부착하는 작은 잠금 배지.
 * requiredTier: "starter" | "growth" | "pro" / size: "sm"(기본) | "md"
 */
export function LockBadge({ requiredTier, size = 'sm', labels, title }) {
  const isSm = size === 'sm';
  const tierLabel = labels?.[requiredTier] ?? TIER_LABEL[requiredTier];
  return (
    <Tooltip content={title ?? `${tierLabel} 플랜부터 제공`}>
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSm ? 2 : 3,
        fontSize: isSm ? 9 : 11,
        fontWeight: 700,
        color: T.amber,
        background: T.amberBg,
        border: '1px solid #FDE68A',
        borderRadius: 99,
        padding: isSm ? '1px 5px' : '2px 8px',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        fontFamily: T.font,
      }}
    >
      <MiniLockIcon size={isSm ? 8 : 10} color={T.amber} />
      {tierLabel}+
    </span>
    </Tooltip>
  );
}

/**
 * UpsellCard — 잠금 상태 대체 영역(콘텐츠 대신 렌더).
 * feature: FEATURE_TIER 키 / requiredTier: 필요 최소 티어 / onNavigate: 플랜 보기 CTA
 * labels: { featureLabels?, tierLabels?, title?, desc?, badge?, cta?, footer? } (선택)
 */
export function UpsellCard({ feature, requiredTier, onNavigate, labels }) {
  const featureLabel =
    labels?.featureLabels?.[feature] ??
    DEFAULT_FEATURE_LABEL[feature] ??
    feature;
  const tierLabel =
    labels?.tierLabels?.[requiredTier] ??
    TIER_LABEL[requiredTier] ??
    requiredTier;

  const tierColor =
    requiredTier === 'pro'
      ? T.purple
      : requiredTier === 'growth'
        ? T.accent
        : T.green;
  const tierBg =
    requiredTier === 'pro'
      ? T.purpleBg
      : requiredTier === 'growth'
        ? '#EEF2FF'
        : T.greenBg;
  const tierBd =
    requiredTier === 'pro'
      ? '#DDD6FE'
      : requiredTier === 'growth'
        ? '#C7D2FE'
        : '#BBF7D0';

  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: '40px 32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        textAlign: 'center',
        fontFamily: T.font,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: tierBg,
          border: `1.5px solid ${tierBd}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <rect
            x="4"
            y="11"
            width="16"
            height="11"
            rx="3"
            fill={tierColor}
            opacity=".18"
          />
          <rect
            x="4"
            y="11"
            width="16"
            height="11"
            rx="3"
            stroke={tierColor}
            strokeWidth="1.8"
          />
          <path
            d="M8 11V7a4 4 0 0 1 8 0v4"
            stroke={tierColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="12" cy="16.5" r="1.5" fill={tierColor} />
        </svg>
      </div>

      <div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 800,
            color: T.text,
            marginBottom: 6,
          }}
        >
          {labels?.title
            ? labels.title(featureLabel, tierLabel)
            : resolveKoreanParticles(`${featureLabel}은(는) ${tierLabel} 플랜부터 제공됩니다`)}
        </div>
        <div
          style={{ fontSize: 13, color: T.sub, lineHeight: 1.7, maxWidth: 360 }}
        >
          {labels?.desc
            ? labels.desc(tierLabel)
            : `현재 플랜에서는 이 기능을 사용할 수 없습니다. ${tierLabel} 플랜으로 업그레이드하면 즉시 이용 가능합니다.`}
        </div>
      </div>

      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: tierBg,
          border: `1px solid ${tierBd}`,
          borderRadius: 99,
          padding: '5px 14px',
          fontSize: 12,
          fontWeight: 700,
          color: tierColor,
        }}
      >
        <MiniLockIcon size={11} color={tierColor} />
        {labels?.badge ? labels.badge(tierLabel) : `${tierLabel}+ 전용 기능`}
      </div>

      <button
        onClick={() => onNavigate?.('/admin/billing/plans')}
        style={{
          fontFamily: T.font,
          fontSize: 14,
          fontWeight: 700,
          padding: '11px 28px',
          borderRadius: 10,
          cursor: 'pointer',
          background: tierColor,
          color: '#fff',
          border: 'none',
        }}
      >
        {labels?.cta ?? '플랜 보기'}
      </button>
      <div style={{ fontSize: 11, color: T.muted }}>
        {labels?.footer ?? '업그레이드 후 즉시 활성화됩니다'}
      </div>
    </div>
  );
}

/**
 * SuspendedNoticeCard — 구독 «이용 정지» 회사가 막힌 동작·내려받기를 눌렀을 때 UpsellCard 대신 그리는 안내 카드
 * (pivit-work PW-2549·PW-2550 · screen-tier-gating.policy.md §6.10 «막힌 동작을 누름»·«내려받기를 누름» 행).
 *
 * 같은 자리·같은 크기 — 겉 상자(흰 바탕·테두리·모서리 16·안쪽 여백 40/32·줄 사이 16·가운데 정렬)는 UpsellCard 와 같은 값을
 * 간격 토큰으로 적었다. 자물쇠 칸은 티어 색 대신 «결제 문제로 막힘» 빨강(오류 토큰)이다. 버튼은 공용 `Button`.
 * 문구·버튼(역할별)은 앱이 정해 넘긴다.
 *
 * Props:
 *   title    굵은 첫 줄 («지금은 기록 보기만 할 수 있습니다»)
 *   desc     둘째 줄
 *   note     결제 권한이 없는 사람에게 덧붙이는 한 줄(«결제 담당자에게 결제를 요청해 주세요.») — 없으면 그리지 않는다
 *   noteBelow true 면 note 를 버튼 줄 아래에 둔다(내려받기 안내 — 정본 «[고객지원 문의] + «…»» 순서). 기본은 버튼 위
 *   actions  `[{ key, label, onClick, variant: 'primary' | 'secondary' | 'danger', testId }]` — 넘긴 순서대로
 *   testId   겉 상자 data-testid
 */
export function SuspendedNoticeCard({ title, desc, note, noteBelow = false, actions = [], testId }) {
  return (
    <div
      data-testid={testId}
      role="status"
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: 'var(--spacing-5xl) var(--spacing-4xl)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--spacing-xl)',
        textAlign: 'center',
        fontFamily: T.font,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: 'var(--bg-error-primary)',
          border: '1.5px solid var(--utility-error-200)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="4" y="11" width="16" height="11" rx="3" stroke="var(--fg-error-primary)" strokeWidth="1.8" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="var(--fg-error-primary)" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <circle cx="12" cy="16.5" r="1.5" fill="var(--fg-error-primary)" />
        </svg>
      </div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 'var(--spacing-sm)' }}>{title}</div>
        <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.7, maxWidth: 360 }}>{desc}</div>
      </div>
      {note && !noteBelow && <div style={{ fontSize: 13, color: T.sub }}>{note}</div>}
      {actions.length > 0 && (
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'center', flexWrap: 'wrap' }}>
          {actions.map((a) => (
            <Button key={a.key} variant={a.variant ?? 'secondary'} onClick={a.onClick} data-testid={a.testId}>
              {a.label}
            </Button>
          ))}
        </div>
      )}
      {note && noteBelow && <div style={{ fontSize: 13, color: T.sub }}>{note}</div>}
    </div>
  );
}

/**
 * SuspendedNoticeDialog — 화면을 바꾸지 않는 자리(내려받기 버튼 등)에서 `SuspendedNoticeCard` 를 화면 가운데에 띄운다
 * (pivit-work PW-2550 · tier-gating §6.10 «내려받기를 누름» — 토스트 대신 안내 카드). 막·Esc·막 누르기 닫기는 공용
 * `ModalLayer` 그대로, 카드 폭은 UpsellScreen 의 본문 폭(680)과 같다. props 는 카드와 같고 `onClose` 를 더 받는다.
 */
export function SuspendedNoticeDialog({ onClose, ...cardProps }) {
  // 창 틀(제목 줄·닫기 X)이 없는 카드 한 장이라 ModalShell 이 아니라 막(ModalLayer)만 쓴다 — 카드가 `role="status"` 로 읽힌다.
  return (
    <ModalLayer onClose={onClose} testId="suspended-notice-dialog">
      <div style={{ width: 'min(680px, 100%)' }}>
        <SuspendedNoticeCard {...cardProps} />
      </div>
    </ModalLayer>
  );
}

/**
 * UpsellScreen — 잠긴 기능 화면을 통째로 대신하는 본문.
 * 본문 칸(`.content-area`) 안 가운데 680px 폭에 UpsellCard 를 놓는다. 칸 없이 카드만
 * 두면 고정 위쪽 바 아래로 깔려 위가 잘리고, 반투명 왼쪽 메뉴 뒤로 카드의 흰 배경이
 * 비친다. props 는 UpsellCard 와 같다.
 */
export function UpsellScreen(props) {
  return (
    <div className="content-area">
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 16px' }}>
        <UpsellCard {...props} />
      </div>
    </div>
  );
}

/**
 * TierGate — 메인 게이팅 래퍼.
 * feature: FEATURE_TIER 키 / currentTier: 현재 구독 티어 / onNavigate: 업셀 CTA
 * 맵에 없는 feature 는 허용(children 렌더).
 */
export function TierGate({ feature, currentTier, children, onNavigate, labels }) {
  const requiredTier = FEATURE_TIER[feature];
  if (!requiredTier) return children;
  if (isAccessible(currentTier, requiredTier)) return children;
  return (
    <UpsellCard
      feature={feature}
      requiredTier={requiredTier}
      onNavigate={onNavigate}
      labels={labels}
    />
  );
}
