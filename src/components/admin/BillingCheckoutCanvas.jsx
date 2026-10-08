import { useState } from 'react';
import { BillingCard as Card } from './kit/BillingSurface.jsx';

// ─────────────────────────────────────────────────────────────
// 결제·구독 — 체크아웃 (BillingCheckoutCanvas)  /admin/billing/checkout
// pivit-specs 의 billing-checkout.jsx 시안을 design-page 정본으로 포팅.
//
// PG=포트원+국내 PG 인증결제 → 빌링키(token) 발급 → 첫 결제 즉시.
// 카드 원본 비저장(토큰만) / 금액 서버 재계산.
//
// 결제는 비동기 서버호출이므로 캔버스는 시뮬하지 않는다. payState 는 controlled
// prop 으로 받아 그대로 렌더하고, 결제 버튼 클릭 시 onPay() 만 발화한다.
// 데이터·금액·프로필은 모두 props 로 받는다 (page wrapper 가 fetch·서버 재계산·
// 라우팅·i18n 을 소유). 캔버스는 인라인 스타일로 자기 완결적으로 렌더한다.
// ─────────────────────────────────────────────────────────────

const T = {
  font: 'var(--font-family-body)',
  bg: '#F8FAFC', card: '#fff',
  border: '#E2E8F0', bl: '#F1F5F9',
  text: '#0F172A', sub: '#64748B', muted: '#94A3B8',
  accent: '#4F6AF5',
  green: '#22C55E', greenBg: '#F0FDF4',
  amber: '#F59E0B', amberBg: '#FFFBEB',
  red: '#DC2626', redBg: '#FEF2F2',
};

const won = (n) => '₩' + Number(n || 0).toLocaleString('ko-KR');

const DEFAULT_LABELS = {
  noPermission: '접근 권한이 없습니다.',
  backToPlans: '← 플랜 선택으로',
  pageTitle: '결제',

  successTitleRenewal: '구독이 재활성화되었습니다',
  successTitleNew: '구독이 시작되었습니다',
  successSummary: (planLabel, seats, total) => `${planLabel} · ${seats}좌석 · ${won(total)} 결제 완료`,
  successReconciled: ' · 미수금 정산 완료',
  successReceiptNote: '영수증(카드매출전표)은 결제 완료 후 청구 내역에서 다운로드할 수 있습니다.',
  successGoOverview: '구독 현황으로',

  orderSummary: '주문 요약',
  seatPriceLine: (planLabel, unitPrice) => `${planLabel} · 좌석당 ${won(unitPrice)} / 월`,
  registeredSeats: (n) => `등록 구성원 ${n}좌석`,
  subtotal: '소계',
  vat: (rate) => `부가세 (${Math.round(rate * 100)}%)`,
  payNow: '지금 결제',
  intervalNoteAnnual: '1년분을 선결제하며, 다음 갱신일에 자동 결제됩니다.',
  intervalNoteMonthly: '1개월분을 선결제하며, 다음 청구일부터 매월 자동 결제됩니다.',
  seatBasisNote: '금액은 결제일 기준 활성 좌석 수로 산정됩니다.',

  billingInfo: '청구 정보',
  billingInfoDisplay: (companyName, bizRegNo) => `${companyName} · ${bizRegNo}`,
  editProfile: '수정',
  billingInfoNeeded: '청구 정보가 필요합니다',
  goInputProfile: '입력하러 가기',

  payFailTitle: '결제 실패',

  refundAgreeIntro: '해지·환불 정책',
  refundAgreeSuffix: '에 동의합니다.',
  refundTermsAnnual: '연간 선결제는 중도 해지 시 사용분을 정가로 차감한 잔액만 환불됩니다(할인 회수).',
  refundTermsMonthly: '월간 구독은 중도 해지 시 잔여기간 환불이 없으며 기간말에 종료됩니다.',
  refundCoolingNote: '최초 결제 후 7일 이내·미사용 시 전액 환불(청약철회)됩니다.',
  viewFullPolicy: '전문 보기',

  payProcessing: '결제창을 여는 중...',
  payConfirming: '결제 확인 중...',
  payRetry: '다시 시도',
  payCta: (total) => `${won(total)} 결제하기`,
  agreeRefundHint: '해지·환불 정책에 동의해 주세요',

  securityNote: '🔒 포트원 보안 결제 · 국내 카드 지원 · 카드 정보는 PIVIT에 저장되지 않습니다',

  overlayProcessing: '결제창 처리 중...',
  overlayConfirming: '결제 확인 중... (구독 활성화까지 잠시 걸릴 수 있습니다)',

  // ── 협의 단가 (PW-344 ④) ────────────────────────────────
  negotiatedTag: '협의 단가 적용',
  negotiatedContract: (start, end, min, max, validUntil) =>
    `계약 기간 ${start} ~ ${end} · 계약 좌석 ${max == null ? `${min}명 이상` : `${min}~${max}명`} · 견적 유효기간 ${validUntil}`,
  negotiatedMinSeatsNote: (min) => `약정 최소 좌석 ${min}명 기준으로 청구됩니다.`,
  negotiatedOverageLine: (seats, unit) => `계약 범위 초과 ${seats}좌석 × ${won(unit)}`,
  negotiatedSeatBasisNote: (min) =>
    `금액은 결제일 기준 활성 좌석 수로 산정하되, 약정 최소 좌석(${min}명) 아래로는 내려가지 않습니다.`,
  negotiatedSuccessNote: ' · 협의 단가 적용',
  quoteBlockedTitleExpired: '견적이 만료되었습니다',
  quoteBlockedTitleSuperseded: '견적이 변경되었습니다',
  quoteBlockedBodyExpired:
    '협의 단가 견적의 유효기간이 지났습니다. 영업팀에 문의해 새 견적을 받아 주세요.',
  quoteBlockedBodySuperseded:
    '영업팀이 새 조건으로 견적을 다시 발행했습니다. 새 조건을 확인한 뒤 결제해 주세요.',
  quoteBlockedCta: '플랜 화면으로',
  // 변경된 견적의 새 조건 요약 (screen-billing-checkout.policy.md 「견적 변경 재확인 카드」).
  quoteNewTermsTitle: '새 조건',
  quoteNewTerms: (seatPrice, min, max, validUntil) =>
    `좌석당 ${won(seatPrice)} / 월 · 계약 좌석 ${max == null ? `${min}명 이상` : `${min}~${max}명`} · 견적 유효기간 ${validUntil}`,
  quoteRetryWithNewTerms: '새 조건으로 다시 결제',
  quoteContactSales: '영업팀 문의',

  // ── 청구 기준일 (PW-324 · screen-billing-checkout §2) ──────
  anchorNoteMonthly: (date, day) => (
    <>오늘({date})이 <b style={{ color: T.text }}>청구 기준일</b>이 되며, 이후 매월 {day}일에 자동 결제됩니다.{day >= 29 ? ' 해당 일자가 없는 달은 말일에 청구합니다.' : ''}</>
  ),
  anchorNoteAnnual: (date, month, day) => (
    <>오늘({date})이 <b style={{ color: T.text }}>청구 기준일</b>이 되며, 이후 매년 {month}월 {day}일에 자동 결제됩니다.{day >= 29 ? ' 해당 일자가 없는 해는 말일에 청구합니다.' : ''}</>
  ),
  firstCycleNote: (day) => (
    <>첫 결제 후 {day}일까지 구성원을 추가하면 <b style={{ color: T.text }}>남은 기간분이 즉시 추가 청구</b>됩니다(일할). 2주기부터는 다음 청구일에 반영됩니다.</>
  ),

  // ── 결제 조건 요약 (법무 D2 · D25-8 · screen-billing-checkout §2) ──
  termsTitle: '요금·자동 갱신·해지·환불 요약',
  termsSubtitle: '이용약관 제8~10조의 중요한 내용입니다.',
  termsViewFull: '이용약관 전문 보기',
  termsChargeMonthly: (total, day) =>
    `오늘 ${won(total)}이 결제되고, 이후 매월 ${day}일에 자동 결제됩니다(그 날짜가 없는 달은 말일).`,
  termsChargeAnnual: (total, month, day) =>
    `오늘 ${won(total)}이 결제되고, 이후 매년 ${month}월 ${day}일에 자동 결제됩니다(그 날짜가 없는 해는 말일).`,
  termsAmount: '매 결제 금액은 결제일의 활성 구성원 수 × 좌석 단가입니다. 구성원이 늘면 금액이 늘어납니다.',
  termsAmountNegotiated: (min) =>
    `매 결제 금액은 결제일의 활성 구성원 수 × 좌석 단가입니다. 약정 최소 좌석(${min}명) 아래로는 내려가지 않습니다.`,
  termsFirstCycle: '첫 결제 주기 안에 구성원이 늘면 남은 기간만큼 바로 추가 결제됩니다.',
  termsCancel: '해지는 구독 현황에서 언제든 할 수 있고, 해지해도 이번 주기 끝까지 이용하신 뒤 무료 플랜으로 바뀝니다.',
  termsRefundMonthly: '월간 구독은 중도 해지 시 남은 기간을 환불하지 않습니다.',
  termsRefundAnnual: '연간 구독은 중도 해지 시 사용분을 정가로 차감한 잔액을 환불합니다.',
  termsRefundCooling: '첫 결제 후 7일 이내·미사용이면 전액 환불됩니다.',
  termsViewRefund: '해지·환불 정책 보기',
  termsNoticeMonthly: '매월 결제는 따로 미리 알리지 않고, 결제 직후 영수증을 메일로 보내 드립니다.',
  termsNoticeAnnual: '자동 갱신 30일 전에 한 번 메일로 미리 알려 드립니다.',

  // ── 연간 협의 계약 약정 동의 (PW-344 · screen-billing-checkout §2) ──
  commitmentAgree: (total, start, end) => (
    <><b>연간 약정 조건</b>에 동의합니다. 지금 <b>1년분 {won(total)}</b>을 선결제하며, 약정 기간은 <b>{start} ~ {end}</b> 입니다. 중도 해지 시 사용분을 <b>정가로 차감</b>한 잔액만 환불됩니다(할인 회수).</>
  ),
  agreeCommitmentHint: '연간 약정 조건에 동의해 주세요',
};

function mergeLabels(provided) {
  if (!provided) return DEFAULT_LABELS;
  return { ...DEFAULT_LABELS, ...provided };
}

function Row({ label, value, strong }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0',
      fontSize: strong ? 16 : 14, fontWeight: strong ? 800 : 500,
      color: strong ? T.text : T.sub }}>
      <span>{label}</span><span style={{ color: T.text }}>{value}</span>
    </div>
  );
}

export default function BillingCheckoutCanvas({
  order = { planCode: 'growth', planLabel: 'Growth', unitPrice: 15000, interval: 'monthly', seatCount: 1 },
  profile = null,
  amounts = null,
  vatRate = 0.1,
  isRenewal = false,
  payState = 'idle',
  failReason = '',
  canEdit = true,
  labels: providedLabels,
  /**
   * 협의 단가 견적 (PW-344 ④). `?quote={id}` 로 진입했을 때 **서버가 재검증한 결과**를
   * 그대로 받는다 — 화면이 유효성을 판단하지 않는다.
   *
   * `{ quoteId, seatPrice, listPriceRef, overageSeatPrice, billingInterval,
   *    minSeats, maxSeats, contractStart, contractEnd, validUntil,
   *    blocked: null | 'expired' | 'superseded' | 'unavailable',
   *    replacement?: { seatPrice, minSeats, maxSeats, validUntil } | null }`
   *
   * `blocked === 'superseded'` 이고 `replacement`(지금 유효한 새 견적)가 있으면 새 조건을
   * 요약하고 [새 조건으로 다시 결제] 를 세운다 — 옛 단가로는 결제하지 않는다.
   * `unavailable`(철회 등)은 만료와 같은 안내를 쓴다.
   */
  quote = null,
  /** [새 조건으로 다시 결제] — 변경된 견적의 새 견적으로 결제를 다시 시작한다. */
  onRetryWithNewQuote,
  /** [영업팀 문의] — 만료·변경 카드에서 영업 문의로 보낸다. */
  onContactSales,
  /**
   * 청구 기준일 미리보기 — 서버 결제 세션 값 `{ chargeDate: 'YYYY-MM-DD', anchorDay, firstCycle }`.
   * 없으면 기준일 문장을 그리지 않는다(화면이 브라우저 시계로 따로 세지 않는다).
   */
  anchor = null,
  onPay,
  /**
   * 결제 조건 요약의 [이용약관 전문 보기] — 게시된 이용약관을 새 탭으로 연다. 게시 주소가
   * 정해지기 전에는 넘기지 않는다: 빈 링크를 두지 않는다(screen-billing-checkout §7).
   */
  onViewTerms,
  onEditProfile,
  onBackToPlans,
  onViewRefundPolicy,
  onSuccessGoOverview,
}) {
  const labels = mergeLabels(providedLabels);

  const [agreeRefund, setAgreeRefund] = useState(false);
  const [agreeCommitment, setAgreeCommitment] = useState(false);

  // 협의 단가 모드 (PW-344 ④). `blocked` 는 **서버 재검증 결과**다 — 화면이 유효기간을
  // 다시 계산하지 않는다(판정을 두 벌 두면 한쪽만 느슨해진다).
  const quoteBlocked = quote ? quote.blocked ?? null : null;
  const quoteOk = Boolean(quote) && !quoteBlocked;

  // 협의 단가 모드에서는 플랜·주기·단가·좌석 범위가 견적에서 확정돼 온다. 화면에서 바꿀
  // 수 있는 값은 없다.
  const minSeats = quoteOk ? quote.minSeats : 1;

  // 좌석 수 = 결제 시점의 등록 좌석(재직 구성원) 수 — **이 화면에서 고르지 않는다** (PW-1102 ·
  // spec-billing.md §2.2). 좌석 칸이 있으면 화면 합계와 실제 청구(등록 좌석 기준)가 갈린다.
  // 예상 비용 미리보기는 BillingPlansCanvas 의 좌석 칸 몫이다.
  const seatCount = order.seatCount || 0;

  const hasProfile = !!profile && !!profile.bizRegNo;

  // 단가는 협의 단가가 정가를 대체한다(`pricing-policy.md §8.2` 단가 결정 순서).
  const unitPrice = quoteOk ? quote.seatPrice : order.unitPrice;
  const overageUnit = quoteOk ? (quote.overageSeatPrice ?? quote.seatPrice) : unitPrice;
  // 청구 좌석은 하한을 밑돌지 않고, 상한 초과분은 초과 단가로 별도 라인이 된다.
  const billedSeats = quoteOk ? Math.max(seatCount, minSeats) : seatCount;
  const baseSeats =
    quoteOk && quote.maxSeats != null ? Math.min(billedSeats, quote.maxSeats) : billedSeats;
  const overSeats = billedSeats - baseSeats;
  const showStrike =
    quoteOk && quote.listPriceRef != null && quote.seatPrice < quote.listPriceRef;

  // 🔴 금액: **서버 재계산값(`amounts`) 이 언제나 우선**이다. 아래 계산은 서버 응답이
  // 아직 없을 때의 미리보기일 뿐이며, 협의 단가에서도 그 규약은 같다.
  const subtotal = amounts
    ? amounts.subtotal
    : baseSeats * unitPrice + overSeats * overageUnit;
  const vat = amounts ? amounts.vat : Math.round(subtotal * vatRate);
  const total = amounts ? amounts.total : subtotal + vat;

  const billInterval = quoteOk ? quote.billingInterval : order.interval;
  const annual = billInterval === 'annual';
  // 연간 협의 계약은 해지·환불 동의와 따로 약정 동의를 받는다 (PW-344).
  const needCommitment = quoteOk && annual;
  const [, anchorMonth, anchorDate] = anchor
    ? anchor.chargeDate.split('-').map(Number)
    : [0, 0, 0];

  const busy = payState === 'processing' || payState === 'confirming';
  const blocked = !hasProfile || !agreeRefund || busy
    || (needCommitment && !agreeCommitment);

  if (!canEdit) {
    return <div style={{ fontFamily: T.font, padding: 40 }}>{labels.noPermission}</div>;
  }

  return (
    <div style={{ fontFamily: T.font, background: T.bg, minHeight: '100vh', padding: 32, color: T.text }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>

        <button type="button" onClick={onBackToPlans}
          style={{ background: 'none', border: 'none', color: T.sub, fontSize: 13,
            cursor: 'pointer', padding: 0, marginBottom: 16 }}>{labels.backToPlans}</button>

        <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 24px' }}>{labels.pageTitle}</h1>

        {/* 견적이 막힌 상태 (PW-344 ④) — 만료·대체. **결제 UI 를 아예 그리지 않는다.**
            옛 단가로 결제할 수 있다고 읽히면 안 된다. */}
        {quoteBlocked && payState !== 'success' ? (
          <Card style={{ background: T.amberBg, border: '1px solid #FDE68A' }}>
            <div style={{ fontWeight: 800, color: T.amber, marginBottom: 6 }}>
              {quoteBlocked !== 'superseded'
                ? labels.quoteBlockedTitleExpired
                : labels.quoteBlockedTitleSuperseded}
            </div>
            <div style={{ fontSize: 13, color: T.text, marginBottom: 14 }}>
              {quoteBlocked !== 'superseded'
                ? labels.quoteBlockedBodyExpired
                : labels.quoteBlockedBodySuperseded}
            </div>
            {quoteBlocked === 'superseded' && quote.replacement && (
              <div data-testid="checkout-quote-new-terms"
                style={{ fontSize: 13, color: T.text, background: '#fff', borderRadius: 10,
                  border: `1px solid ${T.border}`, padding: '10px 14px', marginBottom: 14 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{labels.quoteNewTermsTitle}</div>
                {labels.quoteNewTerms(
                  quote.replacement.seatPrice,
                  quote.replacement.minSeats,
                  quote.replacement.maxSeats,
                  quote.replacement.validUntil,
                )}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {quoteBlocked === 'superseded' && quote.replacement && onRetryWithNewQuote && (
                <button type="button" onClick={onRetryWithNewQuote}
                  style={{ fontFamily: T.font, fontSize: 14, fontWeight: 700, padding: '10px 20px',
                    borderRadius: 10, border: 'none', background: T.accent,
                    color: '#fff', cursor: 'pointer' }}>
                  {labels.quoteRetryWithNewTerms}
                </button>
              )}
              {onContactSales && (
                <button type="button" onClick={onContactSales}
                  style={{ fontFamily: T.font, fontSize: 14, fontWeight: 700, padding: '10px 20px',
                    borderRadius: 10, border: `1px solid ${T.border}`, background: '#fff',
                    color: T.text, cursor: 'pointer' }}>
                  {labels.quoteContactSales}
                </button>
              )}
              <button type="button" onClick={onBackToPlans}
                style={{ fontFamily: T.font, fontSize: 14, fontWeight: 700, padding: '10px 20px',
                  borderRadius: 10, border: `1px solid ${T.border}`, background: '#fff',
                  color: T.text, cursor: 'pointer' }}>
                {labels.quoteBlockedCta}
              </button>
            </div>
          </Card>
        ) : payState === 'success' ? (
          <Card style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: T.greenBg,
              color: T.green, fontSize: 28, display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 16px' }}>✓</div>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
              {isRenewal ? labels.successTitleRenewal : labels.successTitleNew}
            </div>
            <div style={{ fontSize: 14, color: T.sub, marginBottom: 6 }}>
              {labels.successSummary(order.planLabel, billedSeats, total)}
              {quoteOk && labels.negotiatedSuccessNote}
              {isRenewal && labels.successReconciled}
            </div>
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 24 }}>
              {labels.successReceiptNote}
            </div>
            <button type="button" onClick={onSuccessGoOverview}
              style={{ fontFamily: T.font, fontSize: 14, fontWeight: 700, padding: '12px 24px',
                borderRadius: 10, border: 'none', background: T.accent, color: '#fff', cursor: 'pointer' }}>
              {labels.successGoOverview}
            </button>
          </Card>
        ) : (
          <>
            {/* 주문 요약 */}
            <Card style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 13, color: T.sub, fontWeight: 700 }}>{labels.orderSummary}</div>
                {quoteOk && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: T.accent,
                    padding: '3px 10px', borderRadius: 999 }}>{labels.negotiatedTag}</span>
                )}
              </div>
              {/* 계약 요약 — 견적에서 확정돼 오며 화면에서 바꿀 수 없다 (PW-344 ④). */}
              {quoteOk && (
                <div style={{ fontSize: 12, color: T.sub, marginBottom: 12, paddingBottom: 12,
                  borderBottom: `1px solid ${T.border}`, lineHeight: 1.7 }}>
                  {labels.negotiatedContract(
                    quote.contractStart, quote.contractEnd,
                    quote.minSeats, quote.maxSeats, quote.validUntil,
                  )}
                  {quote.minSeats > 1 && (
                    <div>{labels.negotiatedMinSeatsNote(quote.minSeats)}</div>
                  )}
                </div>
              )}
              {/* 결제 좌석 = 등록 좌석 — 읽기 전용 (PW-1102). 계약 좌석 범위는 위 계약 요약에 있다. */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, color: T.sub }}>
                  {/* 취소선은 참조 정가가 있고 **협의 단가가 그보다 쌀 때만** 쓴다 —
                      인상 계약에 「할인」을 붙이면 계약 조건을 잘못 말하는 것이다. */}
                  {showStrike && (
                    <span style={{ color: T.muted, textDecoration: 'line-through', marginRight: 4 }}>
                      {won(quote.listPriceRef)}
                    </span>
                  )}
                  {labels.seatPriceLine(order.planLabel, unitPrice)}
                </span>
                <span data-testid="checkout-registered-seats"
                  style={{ fontSize: 14, fontWeight: 700, color: T.text }}>
                  {labels.registeredSeats(seatCount)}
                </span>
              </div>
              {/* 계약 상한 초과분은 초과 단가로 별도 라인이 된다 — 차단이 아니라 과금이다
                  (spec-billing.md §2.6.5). 결제 버튼도 막지 않는다. */}
              {overSeats > 0 && (
                <Row
                  label={labels.negotiatedOverageLine(overSeats, overageUnit)}
                  value={won(overSeats * overageUnit)}
                />
              )}
              <Row label={labels.subtotal} value={won(subtotal)} />
              <Row label={labels.vat(vatRate)} value={won(vat)} />
              <div style={{ height: 1, background: T.border, margin: '8px 0' }} />
              <Row label={labels.payNow} value={won(total)} strong />
              <div style={{ fontSize: 12, color: T.muted, marginTop: 8 }}>
                {annual
                  ? labels.intervalNoteAnnual
                  : labels.intervalNoteMonthly}{' '}
                {quoteOk
                  ? labels.negotiatedSeatBasisNote(minSeats)
                  : labels.seatBasisNote}
              </div>
              {/* 청구 기준일 — 첫 결제 성공일의 일자가 이후 청구 기준일이 된다 (PW-324) */}
              {anchor && (
                <div data-testid="checkout-anchor-note"
                  style={{ fontSize: 12, color: T.sub, marginTop: 10, paddingTop: 10,
                    borderTop: `1px solid ${T.border}` }}>
                  {annual
                    ? labels.anchorNoteAnnual(anchor.chargeDate, anchorMonth, anchorDate)
                    : labels.anchorNoteMonthly(anchor.chargeDate, anchor.anchorDay)}
                </div>
              )}
              {/* 첫 주기 좌석 추가 = 즉시 일할 추가청구 (PW-324). 2주기 이후 재진입에는 없다. */}
              {anchor && anchor.firstCycle && (
                <div style={{ fontSize: 12, color: T.sub, marginTop: 6 }}>
                  {labels.firstCycleNote(anchor.anchorDay)}
                </div>
              )}
            </Card>

            {/* 청구 정보 */}
            {hasProfile ? (
              <Card style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, color: T.sub, marginBottom: 4 }}>{labels.billingInfo}</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{labels.billingInfoDisplay(profile.companyName, profile.bizRegNo)}</div>
                </div>
                <button type="button" onClick={onEditProfile}
                  style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 8,
                    padding: '6px 14px', fontSize: 13, cursor: 'pointer', color: T.text }}>{labels.editProfile}</button>
              </Card>
            ) : (
              <Card style={{ marginBottom: 16, background: T.redBg, border: '1px solid #FCA5A5' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.red, marginBottom: 8 }}>{labels.billingInfoNeeded}</div>
                <button type="button" onClick={onEditProfile}
                  style={{ background: T.red, color: '#fff', border: 'none', borderRadius: 8,
                    padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{labels.goInputProfile}</button>
              </Card>
            )}

            {/* 실패 안내 */}
            {payState === 'fail' && (
              <Card style={{ marginBottom: 16, background: T.redBg, border: '1px solid #FCA5A5' }}>
                <div style={{ fontSize: 14, color: T.red, fontWeight: 700 }}>{labels.payFailTitle}</div>
                {failReason && <div style={{ fontSize: 13, color: T.text, marginTop: 4 }}>{failReason}</div>}
              </Card>
            )}

            {/* 결제 조건 요약 (법무 D2 · D25-8) — 고지이지 동의가 아니다. 체크박스가 없고 버튼도
                막지 않는다. 금액·결제일은 주문 요약과 같은 값에서 그린다. */}
            <Card style={{ marginBottom: 16, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{labels.termsTitle}</div>
                {onViewTerms && (
                  <button type="button" onClick={onViewTerms}
                    style={{ background: 'none', border: 'none', color: T.accent, fontWeight: 700,
                      fontSize: 12, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                    {labels.termsViewFull}
                  </button>
                )}
              </div>
              <div style={{ fontSize: 12, color: T.muted, marginBottom: 8 }}>{labels.termsSubtitle}</div>
              <ul data-testid="checkout-terms-summary" style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: T.sub, lineHeight: 1.7 }}>
                {anchor && (
                  <li>
                    {annual
                      ? labels.termsChargeAnnual(total, anchorMonth, anchorDate)
                      : labels.termsChargeMonthly(total, anchor.anchorDay)}
                  </li>
                )}
                <li>{quoteOk ? labels.termsAmountNegotiated(minSeats) : labels.termsAmount}</li>
                <li>{labels.termsFirstCycle}</li>
                <li>{labels.termsCancel}</li>
                <li>
                  {annual ? labels.termsRefundAnnual : labels.termsRefundMonthly}{' '}
                  {labels.termsRefundCooling}{' '}
                  <button type="button" onClick={onViewRefundPolicy}
                    style={{ background: 'none', border: 'none', color: T.accent, fontWeight: 700,
                      fontSize: 12, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                    {labels.termsViewRefund}
                  </button>
                </li>
                <li>{annual ? labels.termsNoticeAnnual : labels.termsNoticeMonthly}</li>
              </ul>
            </Card>

            {/* 해지·환불 정책 동의 (결제 전 필수) */}
            {hasProfile && (
              <Card style={{ marginBottom: 16, padding: 16 }}>
                <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
                  <input type="checkbox" checked={agreeRefund}
                    onChange={(e) => setAgreeRefund(e.target.checked)}
                    style={{ marginTop: 3, width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: T.text, lineHeight: 1.6 }}>
                    <b>{labels.refundAgreeIntro}</b>{labels.refundAgreeSuffix}{' '}
                    {annual
                      ? labels.refundTermsAnnual
                      : labels.refundTermsMonthly}{' '}
                    {labels.refundCoolingNote}{' '}
                    <button type="button" onClick={onViewRefundPolicy}
                      style={{ background: 'none', border: 'none', color: T.accent, fontWeight: 700,
                        fontSize: 13, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                      {labels.viewFullPolicy}
                    </button>
                  </span>
                </label>
              </Card>
            )}

            {/* 연간 협의 계약 — 약정·선결제 동의 (PW-344). 해지·환불 동의와 따로 받는다. */}
            {hasProfile && needCommitment && (
              <Card style={{ marginBottom: 16, padding: 16 }}>
                <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
                  <input type="checkbox" checked={agreeCommitment}
                    data-testid="checkout-commitment-agree"
                    onChange={(e) => setAgreeCommitment(e.target.checked)}
                    style={{ marginTop: 3, width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: T.text, lineHeight: 1.6 }}>
                    {labels.commitmentAgree(total, quote.contractStart, quote.contractEnd)}
                  </span>
                </label>
              </Card>
            )}

            {/* 결제 버튼 */}
            <button type="button" onClick={() => { if (!blocked) onPay?.(); }} disabled={blocked}
              style={{ width: '100%', fontFamily: T.font, fontSize: 16, fontWeight: 800,
                padding: '16px', borderRadius: 12, border: 'none', color: '#fff',
                background: blocked ? T.muted : T.accent,
                cursor: blocked ? 'not-allowed' : 'pointer' }}>
              {payState === 'processing' ? labels.payProcessing
                : payState === 'confirming' ? labels.payConfirming
                : payState === 'fail' ? labels.payRetry
                : labels.payCta(total)}
            </button>
            {hasProfile && !agreeRefund && payState === 'idle' && (
              <div style={{ textAlign: 'center', fontSize: 12, color: T.amber, marginTop: 8 }}>
                {labels.agreeRefundHint}
              </div>
            )}
            {hasProfile && agreeRefund && needCommitment && !agreeCommitment && payState === 'idle' && (
              <div style={{ textAlign: 'center', fontSize: 12, color: T.amber, marginTop: 8 }}>
                {labels.agreeCommitmentHint}
              </div>
            )}

            <div style={{ textAlign: 'center', fontSize: 12, color: T.muted, marginTop: 12 }}>
              {labels.securityNote}
            </div>
          </>
        )}

        {/* 결제 진행 오버레이 (결제창 처리 / 서버 확정 대기) */}
        {busy && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: '28px 36px',
              fontSize: 15, fontWeight: 700, color: T.text }}>
              {payState === 'processing' ? labels.overlayProcessing : labels.overlayConfirming}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
