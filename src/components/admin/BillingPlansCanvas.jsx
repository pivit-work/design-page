import { useState } from 'react';

// ─────────────────────────────────────────────────────────────
// BillingPlansCanvas — 결제·구독 "플랜 선택" Pure 컴포넌트.
// pivit-specs 의 billing-plans.jsx 시안을 design-page 정본으로 포팅.
//
// 자기 완결적 캔버스: 인라인 스타일 + 로컬 팔레트(T) + 로컬 컴포넌트.
// 모든 데이터·라벨은 props 로 받는다 (page wrapper 가 fetch·매핑·i18n 소유).
//
// 과금 모델: 3단 추가형(Starter ⊂ Growth ⊂ Pro) + 시딩용 Free.
// 업그레이드 → checkout 위임 / 다운그레이드 → 확인 모달 후 변경 확정.
// 금액 표시는 클라이언트 프리뷰(예상치) — 실제 청구는 서버 재계산.
// ─────────────────────────────────────────────────────────────

const T = {
  font: "'Pretendard','Noto Sans KR',sans-serif",
  mono: "'DM Mono',monospace",
  bg: '#F8FAFC', card: '#fff',
  border: '#E2E8F0', bl: '#F1F5F9',
  text: '#0F172A', sub: '#64748B', muted: '#94A3B8',
  accent: '#4F6AF5',
  green: '#22C55E', greenBg: '#F0FDF4',
  amber: '#F59E0B', amberBg: '#FFFBEB',
  red: '#DC2626', redBg: '#FEF2F2',
  purple: '#7C3AED', purpleBg: '#F5F3FF',
};

const won = (n) => '₩' + Number(n || 0).toLocaleString('ko-KR');

const DEFAULT_LABELS = {
  back: '← 구독 현황으로',
  pageTitle: '플랜 선택',
  readOnlyBadge: '조회 전용',
  pageSubtitle: '워크스페이스에 적용할 플랜을 선택합니다. 상위 플랜은 하위 기능을 모두 포함합니다.',
  cancelReservedTitle: '해지 예약 중',
  cancelReservedBodyPre: '청구 기간 종료 후 Free 플랜으로 전환될 예정입니다. 플랜을 유지하려면 ',
  cancelReservedBodyStrong: '구독 현황',
  cancelReservedBodyPost: '에서 해지를 취소하세요.',
  profileWarningTitle: '청구 정보가 필요합니다',
  profileWarningBody: '결제를 진행하기 전에 사업자 정보를 먼저 입력해야 합니다.',
  profileWarningCta: '청구 정보 입력',
  billingCycleLabel: '청구 주기',
  monthly: '월간',
  annual: '연간',
  annualToggleNote: '연간 35% 할인(확정) — 체감 단가로 표시',
  currentPlanBadge: '현재 플랜',
  recommendedBadge: '추천 · Core',
  freePrice: '₩0',
  customPrice: '커스텀 견적',
  customPriceSuffix: (price) => `${won(price)}+ / 좌석 / 월 (약정 협의)`,
  perSeatMonth: ' / 좌석 / 월',
  annualPerSeatNote: '연간 35% 할인(확정) 적용 체감 단가',
  annualComingSoon: '연간 할인 추후 공개',
  ctaCurrentPlan: '현재 플랜',
  ctaContactSales: '영업팀 문의',
  ctaChangePlan: '이 플랜으로 변경',
  compareTitle: '기능 비교 (추가형)',
  compareFeatureHeader: '기능',
  compareRecommendedTag: '추천',
  recordingRowLabel: '녹음시간 한도',
  compareLegend: '✓ 포함  ◑ 제한적 포함  – 미포함  |  상위 티어는 하위 기능을 모두 포함합니다 (추가형). 단가·기능 범위 확정(pricing-policy.md, 2026-06-27).',
  seatCardTitle: '결제 좌석 수',
  seatTooltip: '예상 비용 산정용 인원입니다. 기본값은 현재 재직 구성원 수이며, 조정해 예상 청구액을 미리 볼 수 있습니다. 실제 청구는 청구일의 재직(활성) 좌석으로 확정됩니다(좌석 선구매·약정 쿼터 없음). 기간 요금은 선결제(월간 1개월분/연간 1년분).',
  seatDecreaseAria: '좌석 감소',
  seatIncreaseAria: '좌석 증가',
  seatUnit: '명',
  currentActiveSeats: (n) => `현재 재직 구성원 ${n}명`,
  seatDelta: (sel, diff) => `· 선택 ${sel}명 (${diff > 0 ? '+' : ''}${diff})`,
  matchActiveSeats: (n) => `재직 인원(${n}명)으로 맞추기`,
  prorationPre: '위 좌석 수는 ',
  prorationStrong1: '예상 비용 미리보기',
  prorationMid: '입니다. 실제 청구는 ',
  prorationStrong2: '청구일의 재직(활성) 구성원 좌석',
  prorationPost: '으로 확정됩니다(Proration A). 좌석 증감은 구성원 초대·비활성으로.',
  manageMembers: '구성원 관리 →',
  estimateTitle: '예상 청구액',
  estimateTitleUpgrade: (label) => `${label} 업그레이드 시 예상 청구액`,
  estimateSubnote: (seats) => `(선택 ${seats}명 기준 미리보기 · 실제 청구는 재직 좌석 · 확정 단가)`,
  estimateLineItem: (seats, unit) => `${seats}좌석 × ${won(unit)} / 좌석 / 월`,
  vatLabel: '부가세 (10%)',
  monthlyTotalLabel: '월 예상 합계',
  annualEstimateNote: '연간 체감 단가 적용 기준 — 연 35% 할인(확정)',
  estimateFootnote: '* 표시 금액은 현재 좌석 기준 예상치입니다. 실제 청구 금액은 청구일 서버 재계산값이 적용됩니다.',
  proCardTitle: 'Pro · Enterprise — 커스텀 견적',
  proCardBody: 'Pro 플랜은 100인+ 조직 및 엔터프라이즈 요건에 맞춰 커스텀 견적을 제공합니다. SSO·고급 권한·전용 AI 한도·약정 협의 할인이 포함됩니다.',
  proCardCta: '영업팀 문의하기',
  readOnlyNotice: '플랜 변경은 Owner 또는 billing_admin만 가능합니다.',
  cancelReservedNotice: '이미 해지 예약 중입니다 — 구독 현황에서 해지를 취소할 수 있습니다.',
  confirmDowngradeTitle: (label) => `${label} 플랜으로 다운그레이드할까요?`,
  confirmChangeTitle: (label) => `${label} 플랜으로 변경할까요?`,
  confirmDowngradeBody: '현재 청구 기간 종료 후 전환됩니다. 상위 기능 데이터는 보존(읽기 전용)되며 신규 생성이 차단됩니다.',
  confirmChangeBody: '다음 청구일에 변경된 플랜과 요금이 적용됩니다.',
  seatOverLimitTitle: '좌석 한도 초과 안내',
  seatOverLimitPre: (seats, limit) => `현재 활성 구성원(${seats}명)이 Free 한도(${limit}명)를 초과합니다. 다운그레이드 후 `,
  seatOverLimitStrong: '신규 구성원 추가가 차단',
  seatOverLimitPost: '되며, 기존 구성원은 유지됩니다.',
  seatOverLimitConfirm: '위 내용을 확인했습니다.',
  downgradeDataNotice: '상위 티어 기능으로 생성된 데이터(OKR·평가·AI Chat 등)는 보존되며 읽기 전용으로 유지됩니다. 신규 생성만 차단됩니다.',
  cancelButton: '취소',
  confirmDowngradeCta: '다운그레이드 확인',
  confirmChangeCta: '변경 확인',

  // ── 협의 단가 견적 (PW-344) ──────────────────────────────
  quoteExpiredTitle: '견적이 만료되었습니다',
  quoteExpiredBody:
    '협의 단가 견적의 유효기간이 지났습니다. 영업팀에 문의해 새 견적을 받아 주세요.',
  quoteExpiredCta: '영업팀 문의하기',
  quoteCardTitle: '협의 단가 적용됨 — Pro · Enterprise',
  quoteCardTitleRenewal: '갱신 견적 — 다음 계약 기간 조건',
  quoteValidBadge: (days) => `유효기간 D-${days}`,
  quoteExpiredBadge: '만료',
  quotePerSeat: '/ 좌석 / 월 (부가세 별도)',
  quoteNegotiatedTag: '협의 단가 적용',
  quoteContractSeats: '계약 좌석',
  quoteContractSeatsValue: (min, max) =>
    max == null ? `${min}명 이상` : `${min}~${max}명`,
  quoteMinSeatsNote: (min) => `최소 ${min}명은 청구 하한`,
  quoteContractPeriod: '계약 기간',
  quoteContractPeriodNote: '종료 시 동일 단가 자동 갱신',
  quoteInterval: '청구 주기',
  quoteIntervalAnnual: '연간 (1년분 선결제)',
  quoteIntervalMonthly: '월간',
  quoteValidUntil: '견적 유효기간',
  quoteOverMaxNotice: (max, price) =>
    `계약 좌석 범위(${max}명)를 초과했습니다. 구성원 추가는 차단되지 않으며, 초과분은 ${won(price)} 단가로 청구되고 영업팀에 통지됩니다.`,
  quoteRenewalNote:
    '동의하면 다음 계약 기간부터 위 조건이 적용됩니다. 현재 기간에는 소급되지 않습니다.',
  quotePayNote: (seats) =>
    `결제 시 ${seats}좌석 기준으로 청구됩니다. 결제 전까지 유료 기능은 열리지 않습니다.`,
  quotePayCta: '결제하기',
  quoteAcceptRenewalCta: '갱신 조건에 동의',
};

function mergeLabels(provided) {
  if (!provided) return DEFAULT_LABELS;
  return { ...DEFAULT_LABELS, ...provided };
}

// ── 공통 헬퍼 컴포넌트 ──────────────────────────────────────

function Badge({ children, color, bg }) {
  return (
    <span style={{ fontSize: 12, fontWeight: 700, color, background: bg,
      padding: '3px 10px', borderRadius: 999, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

function Card({ children, style }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 16, padding: 24, ...style }}>
      {children}
    </div>
  );
}

function Btn({ children, onClick, kind = 'primary', disabled, fullWidth }) {
  const styles = {
    primary: { bg: T.accent, color: '#fff', border: 'transparent' },
    secondary: { bg: '#fff', color: T.text, border: T.border },
    danger: { bg: '#fff', color: T.red, border: '#FCA5A5' },
    ghost: { bg: 'transparent', color: T.sub, border: 'transparent' },
  }[kind];
  return (
    <button type="button" onClick={disabled ? undefined : onClick} disabled={disabled}
      style={{ fontFamily: T.font, fontSize: 14, fontWeight: 700,
        padding: '10px 18px', borderRadius: 10, cursor: disabled ? 'not-allowed' : 'pointer',
        background: styles.bg, color: styles.color, border: `1px solid ${styles.border}`,
        opacity: disabled ? 0.5 : 1, width: fullWidth ? '100%' : undefined }}>
      {children}
    </button>
  );
}

function Divider() {
  return <div style={{ height: 1, background: T.border, margin: '16px 0' }} />;
}

// ── 기능 아이콘 (추가형: ✓ / ◑ / –) ─────────────────────────
function FeatureIcon({ status }) {
  if (status === true) return <span style={{ color: T.green, fontWeight: 800, fontSize: 15 }}>✓</span>;
  if (status === 'partial') return <span style={{ color: T.amber, fontWeight: 800, fontSize: 15 }}>◑</span>;
  return <span style={{ color: T.muted, fontSize: 15 }}>–</span>;
}

// ── 협의 단가 카드 (PW-344) ─────────────────────────────────
//
// 새 시각 언어를 만들지 않는다 — 이 파일의 Card/Badge/Btn/Divider 를 그대로 조합하고,
// 보라 계열(T.purple/T.purpleBg)은 기존 「Pro 커스텀 견적」 카드가 쓰던 색을 승계한다.
//
// 취소선은 참조 정가가 있고 **협의 단가가 그보다 쌀 때만** 쓴다. 인상 계약에 취소선·
// 「할인」 문구를 붙이면 계약 조건을 잘못 말하는 것이 된다.
function QuoteCard({ quote, canEdit, onPay, billedSeats, seatsOverMax, labels }) {
  const dLeft = quote.daysUntilValidUntil;
  const urgent = dLeft != null && dLeft <= 7;
  const showStrike =
    quote.listPriceRef != null && quote.seatPrice < quote.listPriceRef;

  return (
    <Card style={{ marginBottom: 24, background: T.purpleBg, border: `1px solid ${T.purple}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontWeight: 800, color: T.purple }}>
          {quote.isRenewal ? labels.quoteCardTitleRenewal : labels.quoteCardTitle}
        </div>
        <Badge color={urgent ? '#fff' : T.purple} bg={urgent ? T.amber : '#fff'}>
          {dLeft != null && dLeft > 0
            ? labels.quoteValidBadge(dLeft)
            : labels.quoteExpiredBadge}
        </Badge>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
        {showStrike && (
          <span style={{ fontSize: 14, color: T.muted, textDecoration: 'line-through' }}>
            {won(quote.listPriceRef)}
          </span>
        )}
        <span style={{ fontSize: 26, fontWeight: 800 }}>{won(quote.seatPrice)}</span>
        <span style={{ fontSize: 13, color: T.sub }}>{labels.quotePerSeat}</span>
      </div>

      <Divider />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, fontSize: 13 }}>
        <div>
          <div style={{ color: T.sub, marginBottom: 2 }}>{labels.quoteContractSeats}</div>
          <div style={{ fontWeight: 700 }}>
            {labels.quoteContractSeatsValue(quote.minSeats, quote.maxSeats)}
          </div>
          <div style={{ fontSize: 11, color: T.muted }}>{labels.quoteMinSeatsNote(quote.minSeats)}</div>
        </div>
        <div>
          <div style={{ color: T.sub, marginBottom: 2 }}>{labels.quoteContractPeriod}</div>
          <div style={{ fontWeight: 700 }}>{quote.contractStart} ~ {quote.contractEnd}</div>
          <div style={{ fontSize: 11, color: T.muted }}>{labels.quoteContractPeriodNote}</div>
        </div>
        <div>
          <div style={{ color: T.sub, marginBottom: 2 }}>{labels.quoteInterval}</div>
          <div style={{ fontWeight: 700 }}>
            {quote.billingInterval === 'annual'
              ? labels.quoteIntervalAnnual
              : labels.quoteIntervalMonthly}
          </div>
        </div>
        <div>
          <div style={{ color: T.sub, marginBottom: 2 }}>{labels.quoteValidUntil}</div>
          <div style={{ fontWeight: 700 }}>{quote.validUntil}</div>
        </div>
      </div>

      {/* 계약 좌석 범위 초과 — **차단하지 않고** 초과 단가로 과금한다. Free 좌석 상한
          게이팅과 경로가 다르다(협의 계약 고객은 이미 결제 중이다). */}
      {seatsOverMax && (
        <div style={{ marginTop: 14, padding: '10px 14px', background: T.amberBg,
          border: '1px solid #FDE68A', borderRadius: 10, fontSize: 12, color: T.text }}>
          {labels.quoteOverMaxNotice(
            quote.maxSeats,
            quote.overageSeatPrice ?? quote.seatPrice,
          )}
        </div>
      )}

      <div style={{ marginTop: 14, fontSize: 12, color: T.sub }}>
        {quote.isRenewal ? labels.quoteRenewalNote : labels.quotePayNote(billedSeats)}
      </div>

      <div style={{ marginTop: 12 }}>
        <Btn onClick={onPay} disabled={!canEdit}>
          {quote.isRenewal ? labels.quoteAcceptRenewalCta : labels.quotePayCta}
        </Btn>
      </div>
    </Card>
  );
}

// ── 4티어 플랜 카드 ──────────────────────────────────────────
function PlanCard({ plan, isCurrent, interval, onAction, canEdit, isCustomCta, featureKeys, featureLabelMap, labels, negotiatedPrice }) {
  const price = interval === 'annual' && plan.seatPriceAnnual != null
    ? plan.seatPriceAnnual
    : plan.seatPrice;
  const isFree = !plan.isCustom && !plan.seatPrice;

  return (
    <div style={{
      background: T.card,
      border: `2px solid ${isCurrent ? T.accent : plan.recommended ? T.purple : T.border}`,
      borderRadius: 16,
      padding: 24,
      position: 'relative',
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {isCurrent && (
        <div style={{ position: 'absolute', top: -12, left: 16 }}>
          <Badge color="#fff" bg={T.accent}>{labels.currentPlanBadge}</Badge>
        </div>
      )}
      {plan.recommended && !isCurrent && (
        <div style={{ position: 'absolute', top: -12, left: 16 }}>
          <Badge color="#fff" bg={T.purple}>{labels.recommendedBadge}</Badge>
        </div>
      )}

      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{plan.label}</div>
      <div style={{ fontSize: 12, color: T.sub, marginBottom: 12 }}>{plan.tagline}</div>

      {/* 협의 단가가 등록돼 있으면 커스텀 플랜의 「커스텀 견적」 대신 그 단가를 보여 준다
          (PW-344 ④) — 고객이 얼마를 내는지 모르는 채로 결제 버튼을 누르게 두지 않는다. */}
      {plan.isCustom && negotiatedPrice != null ? (
        <div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>
            {won(negotiatedPrice)}
            <span style={{ fontSize: 13, fontWeight: 500, color: T.sub }}>{labels.perSeatMonth}</span>
          </div>
          <div style={{ fontSize: 12, color: T.purple, fontWeight: 700, marginTop: 2 }}>
            {labels.quoteNegotiatedTag}
          </div>
        </div>
      ) : isFree ? (
        <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>{labels.freePrice}</div>
      ) : plan.isCustom ? (
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 2 }}>{labels.customPrice}</div>
          <div style={{ fontSize: 12, color: T.sub, marginBottom: 4 }}>
            {labels.customPriceSuffix(plan.seatPrice)}
          </div>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>
            {won(price)}
            <span style={{ fontSize: 13, fontWeight: 500, color: T.sub }}>{labels.perSeatMonth}</span>
          </div>
          {interval === 'annual' && plan.seatPriceAnnual != null && (
            <div style={{ fontSize: 12, color: T.amber, marginTop: 2 }}>{labels.annualPerSeatNote}</div>
          )}
          {interval === 'annual' && plan.seatPriceAnnual == null && (
            <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{labels.annualComingSoon}</div>
          )}
        </div>
      )}

      <div style={{ fontSize: 12, color: T.muted, marginBottom: 14, marginTop: 4 }}>
        {plan.recordingNote}
      </div>

      <Divider />

      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
        {featureKeys.map((key) => {
          const st = plan.featureStatus ? plan.featureStatus[key] : false;
          const feat = (plan.features || []).find((f) => f.key === key);
          return (
            <li key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <FeatureIcon status={st} />
              <span style={{ fontSize: 13, color: st ? T.text : T.muted }}>
                {featureLabelMap[key]}
                {feat?.note && <span style={{ color: T.sub, fontSize: 12 }}> — {feat.note}</span>}
              </span>
            </li>
          );
        })}
      </ul>

      {onAction && (
        <div style={{ marginTop: 'auto' }}>
          <Btn onClick={onAction} fullWidth
            disabled={!canEdit || isCurrent}
            kind={isCurrent ? 'secondary' : 'primary'}>
            {isCurrent
              ? labels.ctaCurrentPlan
              : isCustomCta
                ? /* 유효 견적이 있으면 커스텀 플랜의 CTA 가 [영업팀 문의] 에서
                     [결제하기] 로 바뀐다 (PW-344 ④). 견적이 없거나 만료·대체됐으면
                     종전 그대로다 — 결제할 방법이 없는데 결제 버튼을 두면 안 된다. */
                  (negotiatedPrice != null ? labels.quotePayCta : labels.ctaContactSales)
                : labels.ctaChangePlan}
          </Btn>
        </div>
      )}
    </div>
  );
}

// ── 기능 비교 테이블 ─────────────────────────────────────────
function FeatureCompareTable({ plans, featureKeys, featureLabelMap, currentPlanCode, labels }) {
  return (
    <Card style={{ marginBottom: 24, overflowX: 'auto' }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>{labels.compareTitle}</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '6px 10px', color: T.sub, fontWeight: 600, borderBottom: `1px solid ${T.border}` }}>
              {labels.compareFeatureHeader}
            </th>
            {plans.map((p) => (
              <th key={p.code} style={{
                textAlign: 'center', padding: '6px 10px', fontWeight: 700,
                borderBottom: `1px solid ${T.border}`,
                color: p.code === currentPlanCode ? T.accent : T.text,
              }}>
                {p.label}
                {p.recommended && <div style={{ fontSize: 10, color: T.purple, fontWeight: 700 }}>{labels.compareRecommendedTag}</div>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {featureKeys.map((key, i) => (
            <tr key={key} style={{ background: i % 2 === 0 ? T.bl : T.card }}>
              <td style={{ padding: '8px 10px', color: T.text, fontWeight: 500 }}>{featureLabelMap[key]}</td>
              {plans.map((p) => (
                <td key={p.code} style={{ textAlign: 'center', padding: '8px 10px' }}>
                  <FeatureIcon status={p.featureStatus ? p.featureStatus[key] : false} />
                </td>
              ))}
            </tr>
          ))}
          <tr style={{ background: T.card }}>
            <td style={{ padding: '8px 10px', color: T.sub, fontSize: 12 }}>{labels.recordingRowLabel}</td>
            {plans.map((p) => (
              <td key={p.code} style={{ textAlign: 'center', padding: '8px 10px', fontSize: 11, color: T.sub }}>
                {(p.recordingNote || '').split(' (')[0]}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <div style={{ fontSize: 11, color: T.muted, marginTop: 10 }}>{labels.compareLegend}</div>
    </Card>
  );
}

// ── 메인 컴포넌트 ────────────────────────────────────────────

export default function BillingPlansCanvas({
  plans = [],
  subscription = { planCode: 'free', status: 'free', cancelAtPeriodEnd: false, hasProfile: false },
  activeSeats = 0,
  vatRate = 0.1,
  canEdit = false,
  labels: providedLabels,
  interval: intervalProp,
  seats: seatsProp,
  onIntervalChange,
  onSeatsChange,
  onSelectPlanUpgrade = () => {},
  onConfirmChange = () => {},
  onNavigateCheckout = () => {},
  onNavigateContactSales = () => {},
  onNavigateBillingSettings = () => {},
  onNavigateMembers = () => {},
  onNavigateBillingOverview = () => {},
  /**
   * 협의 단가 견적 1건 또는 `null` (PW-344 ④). 워크스페이스당 유효 견적은 최대 1건이라
   * 목록·선택 UI 를 두지 않는다.
   *
   * ⚠️ 견적이 있어도 유료 기능·유료 좌석은 열리지 않는다 — 첫 선결제 성공까지 구독
   * 상태는 그대로다. 이 캔버스는 **결제로 가는 길만** 연다.
   *
   * `{ quoteId, planCode, seatPrice, listPriceRef, overageSeatPrice, billingInterval,
   *    minSeats, maxSeats, contractStart, contractEnd, validUntil,
   *    daysUntilValidUntil, expired, isRenewal }`
   */
  quote = null,
  /** 견적으로 체크아웃에 들어간다. 딥링크 `?quote={id}` 와 같은 지점이다. */
  onQuoteCheckout = () => {},
  /** 갱신 견적 동의 — 체크아웃을 재경유하지 않는다(빌링키·첫 결제가 이미 있다). */
  onAcceptQuoteRenewal = () => {},
}) {
  const labels = mergeLabels(providedLabels);

  const [intervalState, setIntervalState] = useState('monthly'); // monthly | annual
  const [seatsState, setSeatsState] = useState(activeSeats);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [downgradeChecked, setDowngradeChecked] = useState(false);
  const [profileWarning, setProfileWarning] = useState(false);
  const [previewPlanCode, setPreviewPlanCode] = useState(null);

  // 청구 주기·좌석 수는 onIntervalChange/onSeatsChange 주입 시 controlled(위임),
  // 아니면 내부 state (BillingCheckoutCanvas 의 onSeatCountChange 와 같은 규약).
  // 호스트가 위임받으면 화면을 떠났다 돌아와도 사용자의 선택이 유지된다.
  const interval = onIntervalChange ? (intervalProp ?? 'monthly') : intervalState;
  const setInterval = (v) => {
    if (onIntervalChange) onIntervalChange(v);
    else setIntervalState(v);
  };
  const seats = onSeatsChange ? (seatsProp ?? activeSeats) : seatsState;
  const setSeats = (n) => {
    if (onSeatsChange) onSeatsChange(n);
    else setSeatsState(n);
  };

  const setSeatsClamped = (n) => setSeats(Math.max(1, Math.min(999, isNaN(n) ? (activeSeats || 1) : n)));

  // 기능 키 순서·라벨을 플랜 카탈로그에서 파생 (prop 주도)
  const featureKeys = [];
  const featureLabelMap = {};
  plans.forEach((p) => {
    (p.features || []).forEach((f) => {
      if (!(f.key in featureLabelMap)) {
        featureKeys.push(f.key);
        featureLabelMap[f.key] = f.label;
      }
    });
  });

  const currentPlan = plans.find((p) => p.code === subscription.planCode);
  const currentRank = currentPlan?.tierRank ?? 0;
  const isCurrentFree = (currentPlan?.tierRank ?? 0) === 0;

  const lowestPaidPlan = plans
    .filter((p) => (p.tierRank ?? 0) > 0 && !p.isCustom)
    .sort((a, b) => (a.tierRank ?? 0) - (b.tierRank ?? 0))[0];

  const effectivePreview = previewPlanCode
    ?? (isCurrentFree ? (lowestPaidPlan?.code ?? subscription.planCode) : subscription.planCode);
  const billingPlan = plans.find((p) => p.code === effectivePreview) ?? currentPlan;
  const previewPlan = plans.find((p) => p.code === previewPlanCode);

  const unitPrice = interval === 'annual' && billingPlan?.seatPriceAnnual != null
    ? billingPlan.seatPriceAnnual
    : (billingPlan?.seatPrice ?? 0);
  const subtotal = seats * unitPrice;
  const vat = Math.round(subtotal * vatRate);
  const total = subtotal + vat;

  const onPlanAction = (plan) => {
    if (!canEdit) return;
    setPreviewPlanCode(plan.code);
    const targetRank = plan.tierRank ?? 0;

    // Pro·Enterprise: 유효 견적이 있으면 **결제 경로**, 없으면 종전대로 영업팀 문의.
    // 이 갈림길이 이 카드의 핵심이다 — 견적이 없으면 결제할 방법이 없어 운영이 콘솔
    // 밖에서 플랜을 부여하게 되고, 그게 미과금 기업을 만들었다.
    if (plan.isCustom) {
      if (validQuote && validQuote.planCode === plan.code) {
        if (validQuote.isRenewal) onAcceptQuoteRenewal(validQuote.quoteId);
        else onQuoteCheckout(validQuote.quoteId);
        return;
      }
      onNavigateContactSales();
      return;
    }

    // billing_profile 미입력 → 업그레이드 사전 차단
    if (targetRank > currentRank && !subscription.hasProfile) {
      setProfileWarning(true);
      return;
    }
    setProfileWarning(false);

    if (targetRank > currentRank) {
      // 업그레이드 → checkout 위임
      onSelectPlanUpgrade(plan.code, interval, seats);
      onNavigateCheckout();
    } else {
      // 다운그레이드/변경 → 확인 모달
      setDowngradeChecked(false);
      setConfirmTarget(plan);
    }
  };

  const handleConfirm = () => {
    if (!confirmTarget) return;
    const target = confirmTarget;
    setConfirmTarget(null);
    onConfirmChange(target.code, interval, seats);
  };

  const isDowngrade = confirmTarget ? (confirmTarget.tierRank ?? 0) < currentRank : false;
  const freeLimit = confirmTarget?.seatLimit;
  const seatOverLimit = isDowngrade
    && (confirmTarget?.tierRank ?? 0) === 0
    && freeLimit != null
    && seats > freeLimit;

  const showProCard = Boolean(currentPlan?.isCustom || previewPlan?.isCustom);

  // ── 협의 단가 (PW-344 ④) ───────────────────────────────────
  // 만료 견적의 **단가는 화면에 남기지 않는다** — 옛 금액을 보여 주면 고객이 그 값으로
  // 결제할 수 있다고 읽는다. 만료는 「단가 없는 안내」로만 말한다.
  const quoteExpired = Boolean(quote?.expired);
  const validQuote = quote && !quoteExpired ? quote : null;
  const quoteBilledSeats = validQuote
    ? Math.max(seats, validQuote.minSeats)
    : seats;
  const quoteSeatsOverMax =
    Boolean(validQuote) &&
    validQuote.maxSeats != null &&
    seats > validQuote.maxSeats;

  return (
    <div style={{ fontFamily: T.font, background: T.bg, minHeight: '100vh', padding: 32, color: T.text }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>

        {/* 뒤로가기 */}
        <button type="button" onClick={onNavigateBillingOverview}
          style={{ background: 'none', border: 'none', color: T.sub, fontSize: 13,
            cursor: 'pointer', padding: 0, marginBottom: 16 }}>
          {labels.back}
        </button>

        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{labels.pageTitle}</h1>
          {!canEdit && <Badge color={T.sub} bg={T.bl}>{labels.readOnlyBadge}</Badge>}
        </div>
        <p style={{ color: T.sub, fontSize: 14, marginTop: 4, marginBottom: 24 }}>{labels.pageSubtitle}</p>

        {/* 견적 만료 안내 (PW-344 ④) — 만료 견적의 단가는 여기에 쓰지 않는다. */}
        {quoteExpired && (
          <Card style={{ marginBottom: 16, background: T.amberBg, border: '1px solid #FDE68A' }}>
            <div style={{ fontWeight: 800, color: T.amber, marginBottom: 4 }}>{labels.quoteExpiredTitle}</div>
            <div style={{ fontSize: 13, color: T.text, marginBottom: 12 }}>{labels.quoteExpiredBody}</div>
            <Btn kind="secondary" onClick={onNavigateContactSales} disabled={!canEdit}>
              {labels.quoteExpiredCta}
            </Btn>
          </Card>
        )}

        {/* 해지 예약 상태 안내 */}
        {subscription.cancelAtPeriodEnd && (
          <Card style={{ marginBottom: 16, background: T.amberBg, border: '1px solid #FDE68A' }}>
            <div style={{ fontWeight: 800, color: T.amber, marginBottom: 4 }}>{labels.cancelReservedTitle}</div>
            <div style={{ fontSize: 13, color: T.text }}>
              {labels.cancelReservedBodyPre}
              <strong>{labels.cancelReservedBodyStrong}</strong>
              {labels.cancelReservedBodyPost}
            </div>
          </Card>
        )}

        {/* billing_profile 미입력 경고 */}
        {profileWarning && (
          <Card style={{ marginBottom: 16, background: T.redBg, border: '1px solid #FCA5A5' }}>
            <div style={{ fontWeight: 800, color: T.red, marginBottom: 4 }}>{labels.profileWarningTitle}</div>
            <div style={{ fontSize: 13, color: T.text, marginBottom: 12 }}>{labels.profileWarningBody}</div>
            <Btn onClick={onNavigateBillingSettings}>{labels.profileWarningCta}</Btn>
          </Card>
        )}

        {/* 청구 주기 토글 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <span style={{ fontSize: 14, color: T.sub }}>{labels.billingCycleLabel}</span>
          <div style={{ display: 'flex', border: `1px solid ${T.border}`, borderRadius: 10, overflow: 'hidden' }}>
            {['monthly', 'annual'].map((v) => (
              <button key={v} type="button" onClick={() => setInterval(v)}
                style={{ fontFamily: T.font, fontSize: 13, fontWeight: 600,
                  padding: '7px 18px', cursor: 'pointer', border: 'none',
                  background: interval === v ? T.accent : '#fff',
                  color: interval === v ? '#fff' : T.sub }}>
                {v === 'monthly' ? labels.monthly : labels.annual}
              </button>
            ))}
          </div>
          {interval === 'annual' && (
            <span style={{ fontSize: 12, color: T.amber }}>{labels.annualToggleNote}</span>
          )}
        </div>

        {/* 협의 단가 카드 (PW-344 ④) — 유효 견적이 있을 때만. */}
        {validQuote && (
          <QuoteCard
            quote={validQuote}
            canEdit={canEdit}
            billedSeats={quoteBilledSeats}
            seatsOverMax={quoteSeatsOverMax}
            labels={labels}
            onPay={() =>
              validQuote.isRenewal
                ? onAcceptQuoteRenewal(validQuote.quoteId)
                : onQuoteCheckout(validQuote.quoteId)
            }
          />
        )}

        {/* 4티어 플랜 카드 */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
          {plans.map((plan) => (
            <PlanCard
              key={plan.code}
              plan={plan}
              isCurrent={plan.code === subscription.planCode}
              interval={interval}
              canEdit={canEdit && !subscription.cancelAtPeriodEnd}
              isCustomCta={plan.isCustom}
              featureKeys={featureKeys}
              featureLabelMap={featureLabelMap}
              labels={labels}
              negotiatedPrice={
                plan.isCustom && validQuote && validQuote.planCode === plan.code
                  ? validQuote.seatPrice
                  : null
              }
              onAction={() => onPlanAction(plan)}
            />
          ))}
        </div>

        {/* 기능 비교 테이블 */}
        <FeatureCompareTable
          plans={plans}
          featureKeys={featureKeys}
          featureLabelMap={featureLabelMap}
          currentPlanCode={subscription.planCode}
          labels={labels}
        />

        {/* 결제 좌석 수 선택 카드 */}
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>
              {labels.seatCardTitle}
              <span title={labels.seatTooltip}
                style={{ cursor: 'help', color: T.muted, fontSize: 13, marginLeft: 4 }}>ⓘ</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button type="button"
                onClick={() => canEdit && setSeatsClamped(seats - 1)}
                disabled={!canEdit || seats <= 1}
                aria-label={labels.seatDecreaseAria}
                style={{
                  width: 36, height: 36, borderRadius: 8, border: `1px solid ${T.border}`,
                  background: '#fff', fontSize: 20, fontWeight: 700, color: T.text,
                  cursor: (!canEdit || seats <= 1) ? 'not-allowed' : 'pointer',
                  opacity: (!canEdit || seats <= 1) ? 0.4 : 1,
                }}>−</button>
              <input
                type="number" min={1} value={seats}
                onChange={(e) => setSeatsClamped(parseInt(e.target.value, 10))}
                disabled={!canEdit}
                style={{
                  width: 72, textAlign: 'center', fontSize: 20, fontWeight: 800,
                  fontFamily: T.mono, color: T.text,
                  border: `1px solid ${T.border}`, borderRadius: 8, padding: '6px 4px',
                  background: canEdit ? '#fff' : T.bl,
                }} />
              <button type="button"
                onClick={() => canEdit && setSeatsClamped(seats + 1)}
                disabled={!canEdit}
                aria-label={labels.seatIncreaseAria}
                style={{
                  width: 36, height: 36, borderRadius: 8, border: `1px solid ${T.border}`,
                  background: '#fff', fontSize: 20, fontWeight: 700, color: T.text,
                  cursor: !canEdit ? 'not-allowed' : 'pointer', opacity: !canEdit ? 0.4 : 1,
                }}>+</button>
              <span style={{ fontSize: 14, color: T.sub, fontWeight: 600 }}>{labels.seatUnit}</span>
            </div>
          </div>

          <div style={{ fontSize: 13, color: T.sub, display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span>
              {labels.currentActiveSeats(activeSeats)}
              {seats !== activeSeats && (
                <b style={{ color: seats > activeSeats ? T.accent : T.amber, marginLeft: 6 }}>
                  {labels.seatDelta(seats, seats - activeSeats)}
                </b>
              )}
            </span>
            {seats !== activeSeats && canEdit && (
              <button type="button" onClick={() => setSeatsClamped(activeSeats)}
                style={{ background: 'none', border: 'none', color: T.accent, fontWeight: 700,
                  fontSize: 13, cursor: 'pointer', padding: 0, whiteSpace: 'nowrap' }}>
                {labels.matchActiveSeats(activeSeats)}
              </button>
            )}
          </div>

          {/* Proration A 안내 배너 + 좌석 조정 동선 */}
          <div style={{ marginTop: 12, padding: '10px 14px', background: T.bl,
            borderRadius: 10, fontSize: 13, color: T.sub, borderLeft: `3px solid ${T.accent}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span>
              {labels.prorationPre}
              <b>{labels.prorationStrong1}</b>
              {labels.prorationMid}
              <b>{labels.prorationStrong2}</b>
              {labels.prorationPost}
            </span>
            <button type="button" onClick={onNavigateMembers}
              style={{ background: 'none', border: 'none', color: T.accent, fontWeight: 700,
                fontSize: 13, cursor: 'pointer', padding: 0, whiteSpace: 'nowrap' }}>
              {labels.manageMembers}
            </button>
          </div>
        </Card>

        {/* 예상 청구액 */}
        {seats > 0 && billingPlan && !billingPlan.isCustom && (
          <Card style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
              {isCurrentFree && (billingPlan.tierRank ?? 0) > 0
                ? labels.estimateTitleUpgrade(billingPlan.label)
                : labels.estimateTitle}
              <span style={{ fontSize: 12, color: T.muted, fontWeight: 400, marginLeft: 8 }}>
                {labels.estimateSubnote(seats)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: T.sub, marginBottom: 6 }}>
              <span>{labels.estimateLineItem(seats, unitPrice)}</span>
              <span style={{ color: T.text, fontWeight: 600 }}>{won(subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: T.sub, marginBottom: 8 }}>
              <span>{labels.vatLabel}</span>
              <span style={{ color: T.text, fontWeight: 600 }}>{won(vat)}</span>
            </div>
            <Divider />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 17, fontWeight: 800 }}>
              <span>{labels.monthlyTotalLabel}</span>
              <span>{won(total)}</span>
            </div>
            {interval === 'annual' && (
              <div style={{ fontSize: 12, color: T.amber, marginTop: 8 }}>{labels.annualEstimateNote}</div>
            )}
            <div style={{ fontSize: 12, color: T.muted, marginTop: 8 }}>{labels.estimateFootnote}</div>
          </Card>
        )}

        {/* Pro 커스텀 안내 */}
        {showProCard && (
          <Card style={{ marginBottom: 24, background: T.purpleBg, border: '1px solid #DDD6FE' }}>
            <div style={{ fontWeight: 800, color: T.purple, marginBottom: 4 }}>{labels.proCardTitle}</div>
            <div style={{ fontSize: 13, color: T.text }}>{labels.proCardBody}</div>
            <div style={{ marginTop: 12 }}>
              <Btn kind="secondary" onClick={onNavigateContactSales} disabled={!canEdit}>
                {labels.proCardCta}
              </Btn>
            </div>
          </Card>
        )}

        {/* 조회 전용 안내 */}
        {!canEdit && (
          <div style={{ fontSize: 13, color: T.sub, textAlign: 'center', marginTop: 8 }}>
            {labels.readOnlyNotice}
          </div>
        )}

        {/* 해지 예약 안내 */}
        {subscription.cancelAtPeriodEnd && canEdit && (
          <div style={{ fontSize: 13, color: T.sub, textAlign: 'center', marginTop: 8 }}>
            {labels.cancelReservedNotice}
          </div>
        )}

        {/* 다운그레이드·플랜 변경 확인 모달.
            오버레이 z-index 는 사이드바(App.css `.sidebar` = 100)보다 커야
            좌측 내비까지 덮인다. 하우스 값 1000(= org_chart.css .modal-overlay). */}
        {confirmTarget && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <Card style={{ maxWidth: 460, margin: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
                {isDowngrade
                  ? labels.confirmDowngradeTitle(confirmTarget.label)
                  : labels.confirmChangeTitle(confirmTarget.label)}
              </div>
              <div style={{ fontSize: 14, color: T.sub, marginBottom: 16 }}>
                {isDowngrade ? labels.confirmDowngradeBody : labels.confirmChangeBody}
              </div>

              {/* Free 다운그레이드 — 좌석 상한 초과 경고 */}
              {seatOverLimit && (
                <div style={{ padding: '12px 16px', background: T.amberBg,
                  border: '1px solid #FDE68A', borderRadius: 10, marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.amber, marginBottom: 4 }}>
                    {labels.seatOverLimitTitle}
                  </div>
                  <div style={{ fontSize: 13, color: T.text }}>
                    {labels.seatOverLimitPre(seats, freeLimit)}
                    <strong>{labels.seatOverLimitStrong}</strong>
                    {labels.seatOverLimitPost}
                  </div>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8,
                    marginTop: 10, fontSize: 13, cursor: 'pointer' }}>
                    <input type="checkbox" checked={downgradeChecked}
                      onChange={(e) => setDowngradeChecked(e.target.checked)}
                      style={{ marginTop: 2, accentColor: T.accent }} />
                    <span>{labels.seatOverLimitConfirm}</span>
                  </label>
                </div>
              )}

              {/* 상위 기능 데이터 보존 안내 (일반 다운그레이드) */}
              {isDowngrade && !seatOverLimit && (
                <div style={{ padding: '10px 14px', background: T.bl,
                  borderRadius: 10, fontSize: 13, color: T.sub, marginBottom: 16,
                  borderLeft: `3px solid ${T.amber}` }}>
                  {labels.downgradeDataNotice}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Btn kind="secondary" onClick={() => setConfirmTarget(null)}>{labels.cancelButton}</Btn>
                <Btn kind={isDowngrade ? 'danger' : 'primary'}
                  onClick={handleConfirm}
                  disabled={seatOverLimit && !downgradeChecked}>
                  {isDowngrade ? labels.confirmDowngradeCta : labels.confirmChangeCta}
                </Btn>
              </div>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}
