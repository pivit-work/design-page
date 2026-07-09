// ─────────────────────────────────────────────────────────────
// 티어 게이팅 재사용 컴포넌트 (billing-tier-gate.jsx 포팅)
// 정책: screen-tier-gating.policy.md
// 권위 출처: spec-billing.md §6 (기능→티어 맵 단일 출처)
// 과금 모델: 3단 추가형 Free / Starter / Growth / Pro
// ─────────────────────────────────────────────────────────────

const T = {
  font: "'Pretendard','Noto Sans KR',sans-serif",
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
 * LockBadge — 메뉴/버튼 옆에 부착하는 작은 잠금 배지.
 * requiredTier: "starter" | "growth" | "pro" / size: "sm"(기본) | "md"
 */
export function LockBadge({ requiredTier, size = 'sm', labels }) {
  const isSm = size === 'sm';
  const tierLabel = labels?.[requiredTier] ?? TIER_LABEL[requiredTier];
  return (
    <span
      title={`${tierLabel} 플랜부터 제공`}
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
      <svg
        width={isSm ? 8 : 10}
        height={isSm ? 8 : 10}
        viewBox="0 0 12 12"
        fill="none"
      >
        <rect x="2" y="5" width="8" height="6" rx="1.5" fill={T.amber} />
        <path
          d="M4 5V3.5a2 2 0 0 1 4 0V5"
          stroke={T.amber}
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      {tierLabel}+
    </span>
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
            : `${featureLabel}은(는) ${tierLabel} 플랜부터 제공됩니다`}
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
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <rect x="2" y="5" width="8" height="6" rx="1.5" fill={tierColor} />
          <path
            d="M4 5V3.5a2 2 0 0 1 4 0V5"
            stroke={tierColor}
            strokeWidth="1.4"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
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
