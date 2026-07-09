import { useState } from 'react';

// ─────────────────────────────────────────────────────────────
// 결제·구독 — 구독 현황 (BillingOverviewCanvas)  /admin/billing
// pivit-specs 의 billing-overview.jsx 시안을 design-page 정본으로 포팅.
//
// 데이터·라벨·환불견적은 모두 props 로 받는다 (page wrapper 가 fetch·매핑·i18n·
// 서버 재계산을 소유). 캔버스는 인라인 스타일로 자기 완결적으로 렌더한다.
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
};

const won = (n) => '₩' + Number(n || 0).toLocaleString('ko-KR');

const STATUS_META = {
  free: { color: T.sub, bg: T.bl },
  active: { color: T.green, bg: T.greenBg },
  past_due: { color: T.red, bg: T.redBg },
  canceled: { color: T.sub, bg: T.bl },
};

const DEFAULT_LABELS = {
  viewOnly: '조회 전용',
  pageTitle: '결제·구독',
  pageSubtitle: '워크스페이스 구독 현황과 청구 정보를 관리합니다.',

  statusLabels: {
    free: '무료 플랜',
    active: '구독 중',
    past_due: '결제 실패',
    canceled: '구독 종료됨',
  },

  dunningTitle: '⚠ 결제에 실패했습니다',
  dunningDesc: (graceUntil) =>
    `${graceUntil} 까지 결제수단을 갱신하지 않으면 유료 기능이 잠금됩니다. (데이터는 보존됩니다)`,
  dunningNoPerm: '갱신 권한이 없습니다 — 결제 담당자(Owner·billing_admin)에게 문의하세요.',
  dunningAction: '지금 갱신',

  cancelReservedTitle: '해지 예약됨',
  cancelReservedDesc: (date) => `${date} 이후 Free 플랜으로 전환됩니다.`,
  undoCancel: '해지 취소',

  freeSeatPrice: (limit) => `좌석당 무료 · 최대 ${limit}명`,
  paidSeatPrice: (price) => `좌석당 ${won(price)} / 월`,
  upgradeCta: (target) => `${target}으로 업그레이드`,
  changePlan: '좌석·플랜 변경',
  updateMethod: '결제수단 갱신',

  activeSeats: '활성 좌석',
  seatsTooltip: 'active 구성원 기준, 매 청구일에 확정됩니다',
  seatsFreeCount: (seats, limit) => `${seats} / ${limit}`,
  seatsPaidCount: (seats) => `${seats}명`,
  nearLimitWarning: 'Free 좌석 한도에 근접했습니다. 구성원을 더 추가하려면 업그레이드가 필요합니다.',
  seatAutoNote: '좌석은 재직 구성원 수로 자동 산정됩니다. 구성원 초대·비활성으로 조정 → 다음 청구일 반영.',
  manageMembers: '구성원 관리 →',

  nextBillingLabel: '다음 청구',
  nextBillingSub: (date, seats, price) => `${date} · ${seats}좌석 × ${won(price)}`,
  methodLabel: '기본 결제수단',
  methodDisplay: (brand, last4) => `${brand} ···· ${last4}`,
  methodExp: (exp) => `유효기간 ${exp}`,
  noMethod: '등록된 결제수단 없음',

  viewHistory: '청구 내역·영수증 보기 →',
  cancelSubscription: '구독 해지',

  cancelModalTitle: '구독 해지 방식 선택',
  cancelModalSub: (planLabel, seats, interval) =>
    `${planLabel} · ${seats}좌석 · ${interval === 'annual' ? '연간 결제' : '월간 결제'}`,
  periodEndTitle: '기간말 해지',
  periodEndBadge: '(권장·환불 없음)',
  periodEndDesc: (date, planLabel) =>
    `${date}까지 ${planLabel} 기능을 계속 사용한 뒤 Free로 전환됩니다. 잔여기간 환불은 없습니다. 기간 내 해지 취소 가능.`,
  periodEndAction: '기간말 해지 예약',

  refundTitle: '즉시 해지 + 환불',
  refundCoolingDesc: '결제 후 7일 이내·유료기능 미사용 — 청약철회로 전액 환불됩니다.',
  refundAnnualDesc: (months, listMonthly) =>
    `연간 선결제 중도 해지 — 사용분(${months}개월 × 정가 ${won(listMonthly)})을 차감한 잔액을 환불합니다.`,
  expectedRefund: '예상 환불액',
  refundNote: '실제 환불액은 결제·해지 기준으로 서버에서 재계산됩니다. 즉시 해지 시 구독이 바로 종료됩니다.',
  refundAction: (amount) => `즉시 해지하고 ${won(amount)} 환불`,
  annualZeroNote: (months) =>
    `사용분이 결제액 이상이라 환불 대상 금액이 없습니다(${months}개월 사용). 기간말 해지를 권장합니다.`,
  monthlyNoRefundNote: '월간 구독은 중도 환불이 없습니다. 기간말 해지로 남은 기간까지 사용하세요.',
  close: '닫기',
};

function mergeLabels(provided) {
  if (!provided) return DEFAULT_LABELS;
  return {
    ...DEFAULT_LABELS,
    ...provided,
    statusLabels: { ...DEFAULT_LABELS.statusLabels, ...(provided.statusLabels || {}) },
  };
}

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

function Btn({ children, onClick, kind = 'primary', disabled }) {
  const styles = {
    primary: { bg: T.accent, color: '#fff', border: 'transparent' },
    secondary: { bg: '#fff', color: T.text, border: T.border },
    danger: { bg: '#fff', color: T.red, border: '#FCA5A5' },
  }[kind];
  return (
    <button type="button" onClick={disabled ? undefined : onClick} disabled={disabled}
      style={{ fontFamily: T.font, fontSize: 14, fontWeight: 700,
        padding: '10px 18px', borderRadius: 10, cursor: disabled ? 'not-allowed' : 'pointer',
        background: styles.bg, color: styles.color, border: `1px solid ${styles.border}`,
        opacity: disabled ? 0.5 : 1 }}>
      {children}
    </button>
  );
}

export default function BillingOverviewCanvas({
  subscription = {
    planCode: 'free', status: 'free', seats: 0, cancelAtPeriodEnd: false,
    interval: 'monthly', nextBillingAt: null, periodAmount: 0, method: null,
  },
  plan = { label: '', seatPrice: 0, seatLimit: null },
  upgradeTargetLabel = null,
  refundQuote = { eligible: false, reason: 'none' },
  canEdit = false,
  labels: providedLabels,
  onNavigateMethods,
  onNavigatePlans,
  onNavigateMembers,
  onNavigateHistory,
  onUndoCancel,
  onCancelPeriodEnd,
  onCancelRefund,
}) {
  const labels = mergeLabels(providedLabels);
  const [cancelOpen, setCancelOpen] = useState(false); // 해지 방식 선택 모달

  const sub = subscription;
  const quote = refundQuote;
  const statusMeta = STATUS_META[sub.status] || STATUS_META.free;
  const statusLabel = labels.statusLabels[sub.status] || labels.statusLabels.free;
  const seatPct = plan.seatLimit
    ? Math.min(100, Math.round((sub.seats / plan.seatLimit) * 100))
    : null;
  // 좌석 한도 근접 경고: Free 플랜에서만 (활성 좌석 ≥ 상한×0.8)
  const nearLimit = sub.planCode === 'free' && plan.seatLimit != null
    && sub.seats >= plan.seatLimit * 0.8;

  const handlePeriodEnd = () => { setCancelOpen(false); onCancelPeriodEnd?.(); };
  const handleRefund = () => { setCancelOpen(false); onCancelRefund?.(); };

  return (
    <div style={{ fontFamily: T.font, background: T.bg, minHeight: '100vh', padding: 32, color: T.text }}>
      <div style={{ maxWidth: 880, margin: '0 auto' }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{labels.pageTitle}</h1>
          {!canEdit && <Badge color={T.sub} bg={T.bl}>{labels.viewOnly}</Badge>}
        </div>
        <p style={{ color: T.sub, fontSize: 14, marginTop: 0, marginBottom: 24 }}>
          {labels.pageSubtitle}
        </p>

        {/* Dunning 경고 배너 */}
        {sub.status === 'past_due' && (
          <Card style={{ marginBottom: 16, background: T.redBg, border: '1px solid #FCA5A5',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
            <div>
              <div style={{ fontWeight: 800, color: T.red, marginBottom: 4 }}>{labels.dunningTitle}</div>
              <div style={{ fontSize: 13, color: T.text }}>
                {labels.dunningDesc(sub.graceUntil)}
              </div>
              {!canEdit && (
                <div style={{ fontSize: 12, color: T.sub, marginTop: 6 }}>
                  {labels.dunningNoPerm}
                </div>
              )}
            </div>
            <Btn kind="danger" onClick={onNavigateMethods} disabled={!canEdit}>{labels.dunningAction}</Btn>
          </Card>
        )}

        {/* 해지 예약 배너 */}
        {sub.cancelAtPeriodEnd && sub.status === 'active' && (
          <Card style={{ marginBottom: 16, background: T.amberBg, border: '1px solid #FDE68A',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
            <div>
              <div style={{ fontWeight: 800, color: T.amber, marginBottom: 4 }}>{labels.cancelReservedTitle}</div>
              <div style={{ fontSize: 13, color: T.text }}>{labels.cancelReservedDesc(sub.nextBillingAt)}</div>
            </div>
            <Btn kind="secondary" onClick={onUndoCancel} disabled={!canEdit}>{labels.undoCancel}</Btn>
          </Card>
        )}

        {/* 현재 플랜 카드 */}
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 22, fontWeight: 800 }}>{plan.label}</span>
                <Badge color={statusMeta.color} bg={statusMeta.bg}>{statusLabel}</Badge>
              </div>
              <div style={{ fontSize: 13, color: T.sub }}>
                {sub.planCode === 'free'
                  ? labels.freeSeatPrice(plan.seatLimit)
                  : labels.paidSeatPrice(plan.seatPrice)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {/* 업그레이드 CTA: 다음 티어로 (동적 플랜명) */}
              {upgradeTargetLabel && !sub.cancelAtPeriodEnd && sub.status !== 'past_due' && (
                <Btn onClick={onNavigatePlans} disabled={!canEdit}>
                  {labels.upgradeCta(upgradeTargetLabel)}
                </Btn>
              )}
              {sub.status === 'active' && !sub.cancelAtPeriodEnd && (
                <Btn kind="secondary" onClick={onNavigatePlans} disabled={!canEdit}>{labels.changePlan}</Btn>
              )}
              {sub.status === 'past_due' && (
                <Btn onClick={onNavigateMethods} disabled={!canEdit}>{labels.updateMethod}</Btn>
              )}
            </div>
          </div>

          {/* 좌석 사용량 게이지 */}
          <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: T.sub }}>
              {labels.activeSeats}
              <span title={labels.seatsTooltip} style={{ cursor: 'help', color: T.muted }}> ⓘ</span>
            </span>
            <span style={{ fontWeight: 700 }}>
              {/* Free: 사용/상한 표기, 유료 티어: 사용 좌석만 표기 */}
              {plan.seatLimit
                ? labels.seatsFreeCount(sub.seats, plan.seatLimit)
                : labels.seatsPaidCount(sub.seats)}
            </span>
          </div>
          {plan.seatLimit && (
            <div style={{ height: 8, background: T.bl, borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${seatPct}%`, height: '100%',
                background: seatPct >= 100 ? T.red : nearLimit ? T.amber : T.accent }} />
            </div>
          )}
          {/* 좌석 한도 근접 경고: Free에서만 */}
          {nearLimit && (
            <div style={{ fontSize: 12, color: T.amber, marginTop: 8 }}>
              {labels.nearLimitWarning}
            </div>
          )}
          {/* 좌석 조정 동선 안내 */}
          <div style={{ fontSize: 12, color: T.muted, marginTop: 10, display: 'flex',
            justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span>{labels.seatAutoNote}</span>
            <button type="button" onClick={onNavigateMembers}
              style={{ background: 'none', border: 'none', color: T.accent, fontWeight: 700,
                fontSize: 12, cursor: 'pointer', padding: 0, whiteSpace: 'nowrap' }}>
              {labels.manageMembers}
            </button>
          </div>
        </Card>

        {/* 청구 정보 (active/past_due) */}
        {(sub.status === 'active' || sub.status === 'past_due') && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <Card>
              <div style={{ fontSize: 13, color: T.sub, marginBottom: 8 }}>{labels.nextBillingLabel}</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{won(sub.periodAmount)}</div>
              <div style={{ fontSize: 13, color: T.sub, marginTop: 4 }}>
                {labels.nextBillingSub(sub.nextBillingAt, sub.seats, plan.seatPrice)}
              </div>
            </Card>
            <Card>
              <div style={{ fontSize: 13, color: T.sub, marginBottom: 8 }}>{labels.methodLabel}</div>
              {sub.method ? (
                <>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>
                    {labels.methodDisplay(sub.method.brand, sub.method.last4)}
                  </div>
                  <div style={{ fontSize: 13, color: T.sub, marginTop: 4 }}>
                    {labels.methodExp(sub.method.exp)}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 14, color: T.red }}>{labels.noMethod}</div>
              )}
            </Card>
          </div>
        )}

        {/* 하단 액션 */}
        <Card style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button type="button" onClick={onNavigateHistory}
            style={{ background: 'none', border: 'none', color: T.accent, fontWeight: 700,
              fontSize: 14, cursor: 'pointer', padding: 0 }}>
            {labels.viewHistory}
          </button>
          {sub.status === 'active' && !sub.cancelAtPeriodEnd && canEdit && (
            <Btn kind="danger" onClick={() => setCancelOpen(true)}>{labels.cancelSubscription}</Btn>
          )}
        </Card>

        {/* 해지 방식 선택 모달 */}
        {cancelOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 16 }}>
            <Card style={{ maxWidth: 460, width: '100%' }}>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>{labels.cancelModalTitle}</div>
              <div style={{ fontSize: 13, color: T.sub, marginBottom: 16 }}>
                {labels.cancelModalSub(plan.label, sub.seats, sub.interval)}
              </div>

              {/* ⓐ 기간말 해지 (항상 노출, 기본·무환불) */}
              <div style={{ border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>
                  {labels.periodEndTitle}{' '}
                  <span style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>{labels.periodEndBadge}</span>
                </div>
                <div style={{ fontSize: 13, color: T.sub, marginBottom: 12 }}>
                  {labels.periodEndDesc(sub.nextBillingAt, plan.label)}
                </div>
                <Btn kind="secondary" onClick={handlePeriodEnd}>{labels.periodEndAction}</Btn>
              </div>

              {/* ⓑ 즉시 해지+환불 (환불 사유 충족 시에만 노출) */}
              {quote.eligible ? (
                <div style={{ border: `1px solid ${T.green}`, borderRadius: 12, padding: 16, marginBottom: 8, background: T.greenBg }}>
                  <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>{labels.refundTitle}</div>
                  <div style={{ fontSize: 13, color: T.sub, marginBottom: 8 }}>
                    {quote.reason === 'cooling_off'
                      ? labels.refundCoolingDesc
                      : labels.refundAnnualDesc(quote.monthsUsed, quote.listMonthly)}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontSize: 13, color: T.text, marginBottom: 12 }}>
                    <span>{labels.expectedRefund}</span>
                    <span style={{ fontSize: 20, fontWeight: 800, color: T.green }}>{won(quote.amount)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: T.muted, marginBottom: 12 }}>
                    {labels.refundNote}
                  </div>
                  <Btn kind="danger" onClick={handleRefund}>{labels.refundAction(quote.amount)}</Btn>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: T.muted, background: T.bl,
                  borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
                  {quote.reason === 'annual_zero'
                    ? labels.annualZeroNote(quote.monthsUsed)
                    : labels.monthlyNoRefundNote}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <Btn kind="secondary" onClick={() => setCancelOpen(false)}>{labels.close}</Btn>
              </div>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}
