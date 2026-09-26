import { useState } from 'react';
import ModalShell from '../shared/ModalShell.jsx';
import Tooltip from '../shared/Tooltip.jsx';
import { BillingCard as Card, BillingBadge as Badge } from './kit/BillingSurface.jsx';

// ─────────────────────────────────────────────────────────────
// 결제·구독 — 구독 현황 (BillingOverviewCanvas)  /admin/billing
// pivit-specs 의 billing-overview.jsx 시안을 design-page 정본으로 포팅.
//
// 데이터·라벨·환불견적은 모두 props 로 받는다 (page wrapper 가 fetch·매핑·i18n·
// 서버 재계산을 소유). 캔버스는 인라인 스타일로 자기 완결적으로 렌더한다.
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

const STATUS_META = {
  free: { color: T.sub, bg: T.bl },
  active: { color: T.green, bg: T.greenBg },
  past_due: { color: T.red, bg: T.redBg },
  canceled: { color: T.sub, bg: T.bl },
  // 체험(PW-1025) — 기획서 시안 billing-app.jsx 의 `trial` 배지 그대로
  trial: { color: T.accent, bg: '#EEF2FF' },
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
    trial: '체험 중',
  },

  // 체험 배너 (PW-1025 · screen-billing-overview.policy.md 「체험 안내 배너」)
  trialTitle: (source, planLabel, endDate, daysLeft) =>
    `${source === 'ops' ? '베타 무상 제공' : '무료 체험'} · ${planLabel} · ${endDate}까지`
    + (daysLeft <= 3 ? (daysLeft === 0 ? ' · 오늘 종료' : ` · D-${daysLeft}`) : ''),
  trialDesc: '종료일까지 결제하지 않으면 Free 로 바뀝니다(데이터는 보존됩니다).',
  trialOverCap: (cap) => `체험 좌석 상한(${cap}명)을 넘었습니다. 구성원 추가는 계속 가능합니다.`,
  trialNoPerm: '결제 권한이 없습니다 — 결제 담당자(Owner·billing_admin)에게 문의하세요.',
  trialAction: '결제하고 계속 쓰기',
  trialSeatPrice: '체험 중 · 청구 없음',

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
  // 연간은 다음 갱신 때 1년분이 나간다 — 금액이 1년분이니 줄도 개월 수를 말한다 (PW-757).
  nextBillingSub: (date, seats, price, months = 1) =>
    `${date} · ${seats}좌석 × ${won(price)}${months > 1 ? ` × ${months}개월` : ''}`,
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

  // ── 협의 단가 계약 (PW-344 ⑤) ────────────────────────────
  contractBadge: '협의 단가 계약',
  contractSeatsLabel: '계약 좌석',
  contractSeatsValue: (min, max) => (max == null ? `${min}명 이상` : `${min}~${max}명`),
  contractMinNote: (min) => `최소 ${min}명은 청구 하한`,
  contractPeriodLabel: '계약 기간',
  contractPeriodNote: '종료 시 동일 단가 자동 갱신',
  contractBilledSeatsLabel: '청구 좌석',
  contractBilledSeatsValue: (seats) => `${seats}명`,
  contractBilledSeatsNote: (base, over, underMin) =>
    over > 0 ? `기본 ${base} + 초과 ${over}` : underMin ? '약정 하한 적용' : '활성 좌석 기준',
  contractOverMaxNotice: (max, over, unit) =>
    `계약 좌석 범위(${max}명)를 초과했습니다. 구성원 추가는 계속 가능하며, 초과 ${over}좌석은 ${won(unit)} 단가로 청구되고 영업팀에 통지됩니다.`,
  contractUnderMinNotice: (seats, min) =>
    `활성 좌석(${seats}명)이 약정 최소 좌석보다 적어 ${min}명 기준으로 청구됩니다. 구성원을 줄여도 청구 금액은 이 하한 아래로 내려가지 않습니다.`,
  contractRenewSoonNotice: (days) =>
    `계약 종료까지 D-${days} 입니다. 별도 조치가 없으면 현재 협의 단가 그대로 자동 갱신됩니다 — 구독이 끊기지 않습니다. 조건을 다시 협의하려면 영업팀에 문의해 주세요.`,
  contractContactSales: '영업팀 문의',
};

function mergeLabels(provided) {
  if (!provided) return DEFAULT_LABELS;
  return {
    ...DEFAULT_LABELS,
    ...provided,
    statusLabels: { ...DEFAULT_LABELS.statusLabels, ...(provided.statusLabels || {}) },
  };
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
  /**
   * `seatPriceAnnual` 은 연간 할인 단가(월 환산)다. 연간 구독이면 좌석 단가를 이 값으로
   * 말한다 — 정가 월 단가를 보이면 실제 청구 단가와 다르다 (PW-757).
   */
  plan = { label: '', seatPrice: 0, seatPriceAnnual: null, seatLimit: null },
  upgradeTargetLabel = null,
  refundQuote = { eligible: false, reason: 'none' },
  canEdit = false,
  labels: providedLabels,
  /**
   * 협의 단가 **계약** (PW-344 ⑤). `accepted` 견적이 있을 때만 채워지고, 정가 플랜은
   * `null` 이라 계약 표기가 하나도 뜨지 않는다 — 수락되지 않은 견적이 계약처럼 보이면
   * 「견적은 결제가 아니다」 불변식이 화면에서 깨진다.
   *
   * `{ seatPrice, minSeats, maxSeats, overageSeatPrice, contractStart, contractEnd,
   *    billedSeats, overageSeats, daysUntilContractEnd }`
   */
  contract = null,
  /**
   * 녹음 풀 배너 (PW-1023 · screen-billing-overview.policy.md 「녹음 풀 배너」 행).
   * 회사 녹음 시간을 80% 이상 썼거나 다 썼을 때만 채운다 — `null` 이면 그리지 않는다.
   * 문구는 상태·요금제마다 달라 앱이 만들어 넘긴다. 녹음 화면에는 띄우지 않는다.
   *
   * `{ title, body, actionLabel, actionKind: 'primary' | 'secondary', onAction, noPermText? }`
   * - `actionKind` — Free 의 [결제하고 계속 쓰기]는 primary, 유료의 [영업팀 문의]는 secondary
   * - `noPermText` — 결제 권한이 없는 사람에게 버튼 대신 덧붙이는 한 줄(버튼은 잠긴다)
   */
  recordingBanner = null,
  /**
   * 체험 (PW-1025 · spec-billing.md §2.7.5). 유효한 체험일 때만 채운다 — `null` 이면 배너를
   * 그리지 않는다. 체험이 끝났는데 정리 배치 전이면 앱이 `null` 로 넘겨 Free 처럼 보이게 한다.
   *
   * `{ source: 'signup' | 'ops', endDate: 'YYYY-MM-DD', daysLeft, seatCap }`
   * - `daysLeft` — 종료일까지 남은 날(오늘이 종료일이면 0). 14 이하 앰버, 3 이하 D-n. 서버가 센다
   * - `seatCap` — 넘어도 막지 않는다. 넘으면 한 줄 안내만 붙인다
   */
  trial = null,
  onNavigateContactSales,
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
  // 이 구독이 실제로 내는 좌석당 월 단가 — 연간이면 연간 할인 단가 (PW-757).
  const planUnitPrice = sub.interval === 'annual' && plan.seatPriceAnnual != null
    ? plan.seatPriceAnnual
    : plan.seatPrice;
  const seatPct = plan.seatLimit
    ? Math.min(100, Math.round((sub.seats / plan.seatLimit) * 100))
    : null;
  // 좌석 한도 근접 경고: Free 플랜에서만 (활성 좌석 ≥ 상한×0.8)
  const nearLimit = sub.planCode === 'free' && plan.seatLimit != null
    && sub.seats >= plan.seatLimit * 0.8;

  // 협의 단가 계약 (PW-344 ⑤). 값은 전부 **서버 재계산값**이며 화면이 산식을 갖지 않는다.
  const contractUnderMin = Boolean(contract) && sub.seats < contract.minSeats;
  const contractOverSeats = contract?.overageSeats ?? 0;
  const contractOverageUnit = contract
    ? (contract.overageSeatPrice ?? contract.seatPrice)
    : 0;
  // D-30 부터는 재협의 알림 구간이다. 만료돼도 구독은 **끊기지 않고** 동일 단가로
  // 자동 갱신된다 — 갱신 실패가 곧 이 카드가 없애려는 미과금 상태다.
  const contractRenewSoon =
    Boolean(contract) && contract.daysUntilContractEnd <= 30;

  // 체험 (PW-1025) — 만료 임박 기준은 사전 알림 14·3·0일과 같다.
  const trialSoon = Boolean(trial) && trial.daysLeft <= 14;
  const trialOverCap = Boolean(trial) && trial.seatCap != null && sub.seats > trial.seatCap;

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

        {/* 체험 안내 배너 (PW-1025 §2.7.5) — 체험 중이면 항상. 베타(ops)와 기본 체험(signup)은 문구로 가른다.
            기획서 시안 billing-app.jsx 의 배너를 옮겼다 */}
        {trial && (
          <Card style={{ marginBottom: 16, background: trialSoon ? T.amberBg : T.bl,
            border: `1px solid ${trialSoon ? '#FDE68A' : T.border}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
            <div data-testid="billing-trial-banner" data-tone={trialSoon ? 'warning' : 'neutral'} role="status">
              <div style={{ fontWeight: 800, color: trialSoon ? T.amber : T.text, marginBottom: 4 }}>
                {labels.trialTitle(trial.source, plan.label, trial.endDate, trial.daysLeft)}
              </div>
              <div style={{ fontSize: 13, color: T.text }}>{labels.trialDesc}</div>
              {trialOverCap && (
                <div style={{ fontSize: 12, color: T.amber, marginTop: 6 }}>
                  {labels.trialOverCap(trial.seatCap)}
                </div>
              )}
              {!canEdit && (
                <div style={{ fontSize: 12, color: T.sub, marginTop: 6 }}>{labels.trialNoPerm}</div>
              )}
            </div>
            <Btn onClick={onNavigatePlans} disabled={!canEdit}>{labels.trialAction}</Btn>
          </Card>
        )}

        {/* 녹음 풀 배너 (PW-1023) — 80%·소진. 다음 달 풀이 다시 차면 사라진다 */}
        {recordingBanner && (
          <Card style={{ marginBottom: 16, background: T.amberBg, border: '1px solid #FDE68A',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
            <div data-testid="billing-recording-banner" role="status">
              <div style={{ fontWeight: 800, color: '#B45309', marginBottom: 4 }}>{recordingBanner.title}</div>
              <div style={{ fontSize: 13, color: T.text }}>{recordingBanner.body}</div>
              {!canEdit && recordingBanner.noPermText && (
                <div style={{ fontSize: 12, color: T.sub, marginTop: 6 }}>
                  {recordingBanner.noPermText}
                </div>
              )}
            </div>
            {recordingBanner.actionLabel && (
              <Btn kind={recordingBanner.actionKind === 'secondary' ? 'secondary' : 'primary'}
                onClick={recordingBanner.onAction} disabled={!canEdit}>
                {recordingBanner.actionLabel}
              </Btn>
            )}
          </Card>
        )}

        {/* 현재 플랜 카드 */}
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 22, fontWeight: 800 }}>{plan.label}</span>
                <Badge color={statusMeta.color} bg={statusMeta.bg}>{statusLabel}</Badge>
                {/* 청구 단가가 플랜 정가와 다른 이유를 한눈에 말한다 (PW-344 ⑤). */}
                {contract && <Badge color={T.accent} bg="#EEF2FF">{labels.contractBadge}</Badge>}
              </div>
              <div style={{ fontSize: 13, color: T.sub }}>
                {/* 플랜 카탈로그의 `seatPrice` 는 **시작가**이지 청구 단가가 아니다 —
                    협의 계약이면 계약 단가를 보여 준다. */}
                {sub.planCode === 'free'
                  ? labels.freeSeatPrice(plan.seatLimit)
                  : sub.status === 'trial'
                    ? labels.trialSeatPrice /* PW-1025 — 체험은 청구서를 만들지 않는다 */
                    : labels.paidSeatPrice(contract ? contract.seatPrice : planUnitPrice)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {/* 업그레이드 CTA: 다음 티어로 (동적 플랜명) */}
              {/* 체험 중에는 체험 배너의 [결제하고 계속 쓰기]가 대신한다 (PW-1025) */}
              {upgradeTargetLabel && !sub.cancelAtPeriodEnd && sub.status !== 'past_due' && sub.status !== 'trial' && (
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
              <Tooltip content={labels.seatsTooltip}>
                <span style={{ cursor: 'help', color: T.muted }}> ⓘ</span>
              </Tooltip>
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
          {/* 협의 단가 계약 정보 (PW-344 ⑤) — 정가 플랜에는 이 블록이 아예 없다. */}
          {contract && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.border}`,
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, fontSize: 12 }}>
              <div>
                <div style={{ color: T.sub, marginBottom: 2 }}>{labels.contractSeatsLabel}</div>
                <div style={{ fontWeight: 700 }}>
                  {labels.contractSeatsValue(contract.minSeats, contract.maxSeats)}
                </div>
                <div style={{ color: T.muted }}>{labels.contractMinNote(contract.minSeats)}</div>
              </div>
              <div>
                <div style={{ color: T.sub, marginBottom: 2 }}>{labels.contractPeriodLabel}</div>
                <div style={{ fontWeight: 700 }}>{contract.contractStart} ~ {contract.contractEnd}</div>
                <div style={{ color: T.muted }}>{labels.contractPeriodNote}</div>
              </div>
              <div>
                <div style={{ color: T.sub, marginBottom: 2 }}>{labels.contractBilledSeatsLabel}</div>
                <div style={{ fontWeight: 700 }}>
                  {labels.contractBilledSeatsValue(contract.billedSeats)}
                </div>
                <div style={{ color: T.muted }}>
                  {labels.contractBilledSeatsNote(
                    contract.billedSeats - contractOverSeats,
                    contractOverSeats,
                    contractUnderMin,
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 계약 좌석 상한 초과 — **차단하지 않는다.** 협의 계약 고객은 이미 결제 중이라
              Free 좌석 상한 게이팅과 경로가 다르다. */}
          {contractOverSeats > 0 && (
            <div style={{ marginTop: 10, padding: '10px 14px', background: T.amberBg,
              border: '1px solid #FDE68A', borderRadius: 10, fontSize: 12, color: T.text }}>
              {labels.contractOverMaxNotice(
                contract.maxSeats, contractOverSeats, contractOverageUnit,
              )}
            </div>
          )}

          {/* 약정 최소 좌석 미만 — 구성원을 줄였는데 금액이 그대로인 이유를 화면이 밝힌다.
              없으면 그 질문이 문의로 온다. */}
          {contractUnderMin && (
            <div style={{ fontSize: 12, color: T.amber, marginTop: 10 }}>
              {labels.contractUnderMinNotice(sub.seats, contract.minSeats)}
            </div>
          )}

          {/* 계약 만료 임박 — 만료를 「종료」로 읽히게 쓰지 않는다. */}
          {contractRenewSoon && (
            <div style={{ marginTop: 10, padding: '10px 14px', background: '#EEF2FF',
              border: `1px solid ${T.accent}`, borderRadius: 10, fontSize: 12, color: T.text,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span>
                {labels.contractRenewSoonNotice(Math.max(0, contract.daysUntilContractEnd))}
              </span>
              <button type="button" onClick={onNavigateContactSales} disabled={!canEdit}
                style={{ background: 'none', border: 'none', color: T.accent, fontWeight: 700,
                  fontSize: 12, cursor: canEdit ? 'pointer' : 'not-allowed', padding: 0, whiteSpace: 'nowrap' }}>
                {labels.contractContactSales}
              </button>
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
                {labels.nextBillingSub(
                  sub.nextBillingAt,
                  contract ? contract.billedSeats : sub.seats,
                  contract ? contract.seatPrice : planUnitPrice,
                  sub.interval === 'annual' ? 12 : 1,
                )}
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

        {/* 해지 방식 선택 창 — 공용 창 틀(ModalShell · PW-836). 해지 두 방식의 버튼은 본문 카드 안에 산다. */}
        {cancelOpen && (
          <ModalShell
            title={labels.cancelModalTitle}
            description={labels.cancelModalSub(plan.label, sub.seats, sub.interval)}
            titleId="billing-cancel-title"
            closeLabel={labels.close}
            onClose={() => setCancelOpen(false)}
            zIndex={1000}
            className="adm-shell"
            testId="billing-cancel-modal"
            footer={
              <button type="button" className="tl-group-modal-btn tl-group-modal-btn-secondary"
                onClick={() => setCancelOpen(false)}>
                {labels.close}
              </button>
            }
          >
            <div style={{ fontFamily: T.font }}>
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
            </div>
          </ModalShell>
        )}

      </div>
    </div>
  );
}
