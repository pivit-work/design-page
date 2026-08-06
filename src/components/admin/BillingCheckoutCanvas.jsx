import { useState } from 'react';

// ─────────────────────────────────────────────────────────────
// 결제·구독 — 체크아웃 (BillingCheckoutCanvas)  /admin/billing/checkout
// pivit-specs 의 billing-checkout.jsx 시안을 design-page 정본으로 포팅.
//
// PG=포트원+국내 PG 인증결제 → 빌링키(token) 발급 → 첫 결제 즉시.
// 카드 원본 비저장(토큰만) / 금액 서버 재계산.
//
// 결제는 비동기 서버호출이므로 캔버스는 시뮬하지 않는다. payState 는 controlled
// prop 으로 받아 그대로 렌더하고, 결제 버튼 클릭 시 onPay(seatCount) 만 발화한다.
// 데이터·금액·프로필은 모두 props 로 받는다 (page wrapper 가 fetch·서버 재계산·
// 라우팅·i18n 을 소유). 캔버스는 인라인 스타일로 자기 완결적으로 렌더한다.
// ─────────────────────────────────────────────────────────────

const T = {
  font: "'Pretendard','Noto Sans KR',sans-serif",
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
  seatDecrease: '좌석 감소',
  seatIncrease: '좌석 증가',
  seatUnit: '좌석',
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
};

function mergeLabels(provided) {
  if (!provided) return DEFAULT_LABELS;
  return { ...DEFAULT_LABELS, ...provided };
}

function Card({ children, style }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 16, padding: 24, ...style }}>
      {children}
    </div>
  );
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
  onPay,
  onSeatCountChange,
  onEditProfile,
  onBackToPlans,
  onViewRefundPolicy,
  onSuccessGoOverview,
}) {
  const labels = mergeLabels(providedLabels);

  const [agreeRefund, setAgreeRefund] = useState(false);
  const [seatCountState, setSeatCountState] = useState(order.seatCount || 1);

  // 좌석 수: onSeatCountChange 주입 시 controlled(위임), 아니면 내부 state
  const seatCount = onSeatCountChange ? (order.seatCount || 1) : seatCountState;
  const setSeatsClamped = (n) => {
    const clamped = Math.max(1, Math.min(999, isNaN(n) ? (order.seatCount || 1) : n));
    if (onSeatCountChange) onSeatCountChange(clamped);
    else setSeatCountState(clamped);
  };

  const hasProfile = !!profile && !!profile.bizRegNo;

  // 금액: 서버 재계산값(amounts) 우선, 없으면 seatCount 로 계산
  const subtotal = amounts ? amounts.subtotal : seatCount * order.unitPrice;
  const vat = amounts ? amounts.vat : Math.round(subtotal * vatRate);
  const total = amounts ? amounts.total : subtotal + vat;

  const busy = payState === 'processing' || payState === 'confirming';
  const blocked = !hasProfile || !agreeRefund || busy;

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

        {/* 성공 화면 */}
        {payState === 'success' ? (
          <Card style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: T.greenBg,
              color: T.green, fontSize: 28, display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 16px' }}>✓</div>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
              {isRenewal ? labels.successTitleRenewal : labels.successTitleNew}
            </div>
            <div style={{ fontSize: 14, color: T.sub, marginBottom: 6 }}>
              {labels.successSummary(order.planLabel, seatCount, total)}
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
              <div style={{ fontSize: 13, color: T.sub, fontWeight: 700, marginBottom: 12 }}>{labels.orderSummary}</div>
              {/* 결제 좌석 수 선택 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, color: T.sub }}>{labels.seatPriceLine(order.planLabel, order.unitPrice)}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button type="button" onClick={() => setSeatsClamped(seatCount - 1)} disabled={seatCount <= 1}
                    aria-label={labels.seatDecrease}
                    style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${T.border}`,
                      background: '#fff', fontSize: 17, fontWeight: 700, color: T.text,
                      cursor: seatCount <= 1 ? 'not-allowed' : 'pointer', opacity: seatCount <= 1 ? 0.4 : 1 }}>−</button>
                  <input type="number" min={1} value={seatCount}
                    onChange={(e) => setSeatsClamped(parseInt(e.target.value, 10))}
                    style={{ width: 60, textAlign: 'center', fontSize: 16, fontWeight: 800,
                      border: `1px solid ${T.border}`, borderRadius: 7, padding: '5px 4px' }} />
                  <button type="button" onClick={() => setSeatsClamped(seatCount + 1)}
                    aria-label={labels.seatIncrease}
                    style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${T.border}`,
                      background: '#fff', fontSize: 17, fontWeight: 700, color: T.text, cursor: 'pointer' }}>+</button>
                  <span style={{ fontSize: 13, color: T.sub }}>{labels.seatUnit}</span>
                </div>
              </div>
              <Row label={labels.subtotal} value={won(subtotal)} />
              <Row label={labels.vat(vatRate)} value={won(vat)} />
              <div style={{ height: 1, background: T.border, margin: '8px 0' }} />
              <Row label={labels.payNow} value={won(total)} strong />
              <div style={{ fontSize: 12, color: T.muted, marginTop: 8 }}>
                {order.interval === 'annual'
                  ? labels.intervalNoteAnnual
                  : labels.intervalNoteMonthly}{' '}
                {labels.seatBasisNote}
              </div>
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

            {/* 해지·환불 정책 동의 (결제 전 필수) */}
            {hasProfile && (
              <Card style={{ marginBottom: 16, padding: 16 }}>
                <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
                  <input type="checkbox" checked={agreeRefund}
                    onChange={(e) => setAgreeRefund(e.target.checked)}
                    style={{ marginTop: 3, width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: T.text, lineHeight: 1.6 }}>
                    <b>{labels.refundAgreeIntro}</b>{labels.refundAgreeSuffix}{' '}
                    {order.interval === 'annual'
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

            {/* 결제 버튼 */}
            <button type="button" onClick={() => { if (!blocked) onPay?.(seatCount); }} disabled={blocked}
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
