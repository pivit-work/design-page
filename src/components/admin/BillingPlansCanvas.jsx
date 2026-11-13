import { ArrowRightGlyph } from '../shared/lineIcons.jsx';
import { useState, useId, useEffect, useRef } from 'react';
import Checkbox from '../shared/Checkbox.jsx';
import ModalShell from '../shared/ModalShell.jsx';
import Button from '../shared/Button.jsx';
import Tooltip from '../shared/Tooltip.jsx';
import SegmentedControl from '../shared/SegmentedControl.jsx';
import RosterTable from '../shared/RosterTable.jsx';
import { BillingCard as Card, BillingBadge as Badge } from './kit/BillingSurface.jsx';

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
  font: 'var(--font-family-body)',
  bg: '#F8FAFC', card: '#fff',
  border: '#E2E8F0', bl: '#F1F5F9',
  text: '#0F172A', sub: '#64748B', muted: '#94A3B8',
  // 강조색은 앱 브랜드 토큰 (PW-1894) — 채움·테두리는 기본 버튼(.dp-btn--primary) 바탕, 글씨는 1on1 화면의 브랜드 글씨
  accent: 'var(--bg-brand-solid)', accentText: 'var(--text-brand-secondary)',
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
  pageSubtitle: '회사에 적용할 플랜을 선택합니다. 상위 플랜은 하위 기능을 모두 포함합니다.',
  cancelReservedTitle: '해지 예약 중',
  cancelReservedBodyPre: '청구 기간 종료 후 Free 플랜으로 전환될 예정입니다. 플랜을 유지하려면 ',
  cancelReservedBodyStrong: '구독 현황',
  cancelReservedBodyPost: '에서 해지를 취소하세요.',
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
  // 베타 출시 혜택 (pivit-work PW-2360 · spec-billing §2.7.3-A 3 · screen-billing-plans «(출시 혜택)» 행)
  launchBenefitPlanTag: (until) => `베타 출시 혜택 · ${until}까지 월간도 연간 단가`,
  // 끝 구절 — 동의하지 않으면 이용 정지 (pivit-work PW-2549 · plans «베타 출시 혜택 단가» 행)
  launchBenefitPlanAfter: (price) => `그 뒤 ${won(price)} / 좌석 / 월 — 바뀌기 30일 전에 동의를 여쭙니다 · 동의하지 않으시면 혜택이 끝난 뒤 첫 결제일부터 이용이 정지됩니다(기록 보기 · 결제는 됩니다)`,
  annualComingSoon: '연간 할인 추후 공개',
  ctaCurrentPlan: '현재 플랜',
  ctaContactSales: '영업팀 문의',
  ctaChangePlan: '이 플랜으로 변경',
  compareTitle: '기능 비교 (추가형)',
  compareFeatureHeader: '기능',
  compareRecommendedTag: '추천',
  recordingRowLabel: '녹음시간 한도',
  aiRunsRowLabel: 'AI 실행',
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
  estimateLineItem: (seats, unit, months = 1) =>
    `${seats}좌석 × ${won(unit)} / 좌석 / 월${months > 1 ? ` × ${months}개월` : ''}`,
  vatLabel: '부가세 (10%)',
  monthlyTotalLabel: '월 예상 합계',
  // 연간은 1년분을 선결제한다 — 합계도 1년분이다 (PW-757, 결제하기 화면 합계와 같은 금액).
  annualTotalLabel: '1년분 예상 합계',
  annualEstimateNote: '연간 체감 단가 적용 기준 — 연 35% 할인(확정)',
  // 협의 단가 견적의 예상 청구액 (PW-1620 · screen-billing-plans §2 「협의 단가 좌석 라인」·§7)
  estimateQuoteLineItem: (seats, unit, months = 1) =>
    `${seats}좌석 × ${won(unit)} / 좌석 / 월${months > 1 ? ` × ${months}개월` : ''} · 협의 단가`,
  estimateOverageLineItem: (seats, unit, months = 1) =>
    `계약 범위 초과 ${seats}좌석 × ${won(unit)} / 좌석 / 월${months > 1 ? ` × ${months}개월` : ''}`,
  estimateMinSeatsNote: (min) => `약정 최소 좌석 ${min}명 기준으로 청구됩니다.`,
  estimateQuoteLoading: '협의 단가로 계산하는 중입니다…',
  estimateQuoteFailed: '예상 청구액을 불러오지 못했습니다.',
  estimateQuoteRetry: '다시 시도',
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
  // 문자열 또는 `(planLabel, switchedInterval: 'monthly'|'annual'|null) => string` (PW-2475).
  // Free 로 내릴 때만 쓰는 본문. 비워 두면 confirmDowngradeBody 를 쓴다.
  confirmDowngradeFreeBody: null,
  seatOverLimitTitle: '좌석 한도 초과 안내',
  seatOverLimitPre: (seats, limit) => `현재 활성 구성원(${seats}명)이 Free 한도(${limit}명)를 초과합니다. 다운그레이드 후 `,
  seatOverLimitStrong: '신규 구성원 추가가 차단',
  seatOverLimitPost: '되며, 기존 구성원은 유지됩니다.',
  seatOverLimitConfirm: '위 내용을 확인했습니다.',
  downgradeDataNotice: '상위 티어 기능으로 생성된 데이터(OKR·평가·AI Chat 등)는 보존되며 읽기 전용으로 유지됩니다. 신규 생성만 차단됩니다.',
  cancelButton: '취소',
  /* 창 오른쪽 위 닫기 X 의 이름 — [취소]와 같은 이름이면 화면 읽기 프로그램이 둘을 못 가른다(pivit-work PW-2744) */
  close: '닫기',
  confirmDowngradeCta: '다운그레이드 확인',
  confirmChangeCta: '변경 확인',
  // 변경 요청이 실패하면 창을 닫지 않고 확인 버튼이 다시 시도가 된다(screen-billing-plans §3).
  confirmRetryCta: '다시 시도',
  confirmBusyCta: '변경 중...',
  // 구독을 못 읽었을 때 — 현재 플랜을 모른다(§3 「현재 플랜 배지 대신 "–"」). 비교는 그대로 보인다.
  currentPlanUnknown: '현재 플랜: –',
  // 수락된 계약의 상한을 지금 활성 구성원이 넘었을 때(screen-billing-plans §2).
  contractOverMaxNotice: (max, price) =>
    `계약 좌석 범위(${max}명)를 초과했습니다. 초과분은 ${won(price)} 단가로 청구되며 영업팀에 통지됩니다.`,

  // ── 협의 단가 견적 (PW-344) ──────────────────────────────
  quoteExpiredTitle: '견적이 만료되었습니다',
  quoteExpiredBody:
    '협의 단가 견적의 유효기간이 지났습니다. 영업팀에 문의해 새 견적을 받아 주세요.',
  quoteExpiredCta: '영업팀 문의하기',
  // 약정 기간 중 하향 차단 안내 (spec-billing.md §2.6.4 · 시안 billing-app.jsx PW-344)
  commitmentNotice: (contractEnd) =>
    `약정 기간(~${contractEnd}) 중에는 하위 플랜으로 변경할 수 없습니다.`,
  commitmentContactCta: '영업팀 문의 →',
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
  // PW-2473 — 견적의 «좌석당 월 녹음 시간». 요금제 기본값보다 크면 «계약으로 늘린 시간»을 덧붙인다.
  quoteRecording: '녹음',
  quoteRecordingValue: (hours) => `좌석당 월 ${hours}시간`,
  quoteRecordingExtendedNote: '계약으로 늘린 시간',
  quoteOverMaxNotice: (max, price) =>
    `계약 좌석 범위(${max}명)를 초과했습니다. 구성원 추가는 차단되지 않으며, 초과분은 ${won(price)} 단가로 청구되고 영업팀에 통지됩니다.`,
  quoteRenewalNote:
    '동의하면 다음 계약 기간부터 위 조건이 적용됩니다. 현재 기간에는 소급되지 않습니다.',
  quotePayNote: (seats) =>
    `결제 시 ${seats}좌석 기준으로 청구됩니다. 결제 전까지 유료 기능은 열리지 않습니다.`,
  quotePayCta: '결제하기',
  quoteAcceptRenewalCta: '갱신 조건에 동의',
  // 즉시 해지·환불이 끝나지 않은 동안 (pivit-work PW-2476 · screen-billing-plans §2 «갱신 견적» 행)
  quoteRenewalLockedNote: '환불이 끝날 때까지 계약 조건을 바꿀 수 없습니다',
  // ── 이용 정지 안내 띠 (pivit-work PW-2549·PW-2550 · screen-billing-plans «이용 정지 안내 띠» 행) ──
  suspendedTitle: '서비스 이용이 정지된 상태입니다',
  suspendedBody:
    '유료 요금제를 정가로 결제하시면 그 순간 다시 이용하실 수 있고, 결제한 날이 새 청구일이 됩니다. Free 로 바꾸거나 해지하시려면 구독 현황에서 [해지 신청]을 눌러 주세요.',
  suspendedBackToOverview: '구독 현황으로',
  // ── «전자결재 · 휴가 패키지» 카드 (pivit-work PW-2782 · spec-billing §2.4-A·§2.4-C · plans «애드온» 행) ──
  addonSectionTitle: '애드온',
  addonName: '전자결재 · 휴가 패키지',
  addonDesc: '전자결재 · 워크플로우 + 휴가 · 연차 — 함께 켜고 함께 끕니다',
  addonPrice: (price) => `좌석당 ${won(price)} / 월`,
  addonAnnualDiscount: '연 30% 할인',
  addonSeatsNote: (n) => `좌석 수는 요금제와 같습니다 · 지금 ${n}좌석`,
  addonBadgeTrial: (date) => `체험 중 · ${date}까지`,
  addonBadgeActive: '사용 중',
  addonBadgeCancelScheduled: (date) => `해지 예정 · ${date}까지`,
  addonBadgeLapsed: '꺼짐 · 읽기 전용',
  addonBadgeLocked: '결제 실패로 잠김',
  addonLapsedNote: '결재 문서·휴가 기록은 지우지 않고 읽기 전용으로 남아 있습니다. 다시 사면 바로 켜집니다.',
  addonTrialCta: (days) => `${days ?? 30}일 무료로 써 보기`,
  addonBuyNowCta: '바로 구매',
  addonBuyCta: '애드온 구매',
  addonCancelCta: '애드온 해지',
  addonUndoCancelCta: '해지 취소',
  addonViewPlansCta: '플랜 보기',
  addonManageMethodsCta: '결제수단 관리',
  addonBlockFree: '유료 요금제로 바꾼 뒤 구매할 수 있습니다.',
  addonBlockPastDue: '결제를 복구한 뒤 구매할 수 있습니다.',
  addonBlockSuspended: '요금제를 결제한 뒤 구매할 수 있습니다.',
  addonBlockPlanCancel: (date) => `요금제 해지가 예약돼 있습니다 — 애드온도 ${date}에 함께 끝납니다.`,
  addonBlockSubscriptionTrial: '요금제를 결제한 뒤 이 카드에서 살 수 있습니다 — 체험 중에는 이미 켜져 있습니다.',
  addonBlockDeletion: (date) => `회사 삭제가 예정돼 있습니다 · ${date}에 닫힙니다 — 다시 구독하시려면 회사 설정에서 삭제 요청을 먼저 취소해 주세요`,
  addonLoadFailed: '애드온 정보를 불러오지 못했습니다',
  addonRetry: '다시 시도',
  addonBuyTitle: '전자결재 · 휴가 패키지 구매',
  addonBuyLoading: '결제 금액을 계산하고 있습니다',
  addonBuyLoadFailed: '결제 금액을 불러오지 못했습니다',
  addonBuyTodayLabel: '오늘 결제',
  addonBuyTodayDetail: (lastDay, days, periodDays, seats, unit, months = 1) =>
    `오늘 ~ ${lastDay} ${days}일분 · ${seats}좌석 × ${won(unit)}${months > 1 ? ` × ${months}개월` : ''} × ${days}/${periodDays}일`,
  addonBuyVat: (vat) => `부가세 ${won(vat)}`,
  addonBuyCarry: '다음 청구일에 함께 청구됩니다',
  addonBuyNextLabel: (date) => `${date}부터 매 주기`,
  addonBuyNextDetail: (seats, unit, months = 1) =>
    `${seats}좌석 × ${won(unit)}${months > 1 ? ` × ${months}개월` : ''} · 지금 좌석 기준 예상 · 부가세 별도`,
  addonBuyCardLabel: '결제 카드',
  addonBuyCard: (brand, last4) => `${brand ?? ''} ···· ${last4}`,
  addonBuyCancelNote: '언제든 해지할 수 있고, 해지하면 이번 청구 기간 끝까지 쓸 수 있습니다',
  addonBuyAgree: '위 금액과 정기결제에 동의합니다',
  addonBuySubmit: '결제하고 켜기',
  addonBuyBusy: '결제 중…',
  addonBuyFailed: (reason) => `결제하지 못했습니다 — ${reason}`,
  addonBuyRetry: '다시 시도',
  addonCancelTitle: '전자결재 · 휴가 패키지 해지',
  addonCancelBody: (date) =>
    `${date}까지 쓸 수 있고, 그 뒤 결재 문서·양식과 휴가 기록은 읽기 전용이 되고 휴가 메뉴가 사라집니다. 진행 중인 결재(휴가 신청 포함)는 끝까지 할 수 있고, 업무 자동화는 멈춥니다.`,
  addonCancelSubmit: '해지 예약',
  // 창을 열 때 불러온 환불 견적이 «환불 대상»일 때만 — 보조 선택 (pivit-work PW-2782 · plans 정책 92행)
  addonRefundCta: (amount) => `지금 해지하고 ${won(amount)} 환불받기`,
  addonBusy: '처리 중…',
};

function mergeLabels(provided) {
  if (!provided) return DEFAULT_LABELS;
  return { ...DEFAULT_LABELS, ...provided };
}

// ── 공통 헬퍼 컴포넌트 ──────────────────────────────────────

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
function QuoteCard({ quote, canEdit, onPay, billedSeats, seatsOverMax, labels, renewalLocked = false }) {
  // 갱신 동의만 잠근다 — 새 견적 [결제하기]는 서버가 따로 막고, 해지된 회사에는 갱신 견적이 오지 않는다.
  const locked = Boolean(quote.isRenewal && renewalLocked);
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
        {/* PW-2473 — 녹음 시간이 없는 옛 견적은 칸을 그리지 않는다. 옆 칸(계약 좌석·계약 기간)과 같은 이름표·값·보조 줄 모양. */}
        {quote.recordHoursPerSeat != null && (
          <div>
            <div style={{ color: T.sub, marginBottom: 'var(--spacing-xxs)' }}>{labels.quoteRecording}</div>
            <div style={{ fontWeight: 700 }}>{labels.quoteRecordingValue(quote.recordHoursPerSeat)}</div>
            {quote.planRecordHoursPerSeat != null && quote.recordHoursPerSeat > quote.planRecordHoursPerSeat && (
              <div style={{ fontSize: 11, color: T.muted }}>{labels.quoteRecordingExtendedNote}</div>
            )}
          </div>
        )}
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
        <Btn onClick={onPay} disabled={!canEdit || locked}>
          {quote.isRenewal ? labels.quoteAcceptRenewalCta : labels.quotePayCta}
        </Btn>
        {locked && (
          <div data-testid="billing-quote-renewal-locked" style={{ fontSize: 12, color: T.amber, marginTop: 'var(--spacing-xs)' }}>
            {labels.quoteRenewalLockedNote}
          </div>
        )}
      </div>
    </Card>
  );
}

// ── 4티어 플랜 카드 ──────────────────────────────────────────
/** 베타 출시 혜택 단가가 이 카드에 걸리나 — 월간 · 연간 단가가 있는 정가 요금제 · 혜택 기간 안(PW-2360). */
function launchBenefitApplies(plan, interval, launchBenefitUntil) {
  return Boolean(launchBenefitUntil) && interval === 'monthly'
    && plan != null && !plan.isCustom && plan.seatPriceAnnual != null;
}

function PlanCard({ plan, isCurrent, interval, onAction, canEdit, isCustomCta, featureKeys, featureLabelMap, labels, negotiatedPrice, launchBenefitUntil = null, trialNote = null }) {
  const isFree = !plan.isCustom && !plan.seatPrice;
  // 베타 출시 혜택(PW-2360) — 기간 안이면 월간도 연간 단가. 연간은 원래 연간 단가라 겹쳐 주지 않고, 커스텀(Pro)은 대상이 아니다.
  const benefit = launchBenefitApplies(plan, interval, launchBenefitUntil);
  const price = (interval === 'annual' || benefit) && plan.seatPriceAnnual != null
    ? plan.seatPriceAnnual
    : plan.seatPrice;
  // 체험으로 받은 요금제(pivit-work PW-2657) — «현재 플랜» 표시는 붙이되 버튼은 끄지 않는다.
  // 체험이 끝나기 전에 그 요금제로 결제할 수 있어야 한다.
  const markedCurrent = isCurrent || Boolean(trialNote);

  return (
    <div style={{
      background: T.card,
      border: `2px solid ${markedCurrent ? T.accent : plan.recommended ? T.purple : T.border}`,
      borderRadius: 16,
      padding: 24,
      position: 'relative',
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {markedCurrent && (
        <div style={{ position: 'absolute', top: -12, left: 16 }}>
          <Badge color="#fff" bg={T.accent}>{labels.currentPlanBadge}</Badge>
        </div>
      )}
      {plan.recommended && !markedCurrent && (
        <div style={{ position: 'absolute', top: -12, left: 16 }}>
          <Badge color="#fff" bg={T.purple}>{labels.recommendedBadge}</Badge>
        </div>
      )}

      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{plan.label}</div>
      {trialNote && (
        <div data-testid={`billing-plan-trial-${plan.code}`}
          style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-md)' }}>
          {/* 색은 구독 현황의 «체험 중» 상태 배지와 같다 (BillingOverviewCanvas STATUS_META.trial).
              배지는 줄바꿈이 없어 이름만 담고, 종료일은 옆 글자로 둔다 — 카드 넷이 나란히면 글 칸이 160px 남짓이다. */}
          <Badge color={T.accentText} bg="var(--bg-brand-secondary)">{trialNote.badge}</Badge>
          <span style={{ fontSize: 12, color: T.sub }}>{trialNote.until}</span>
        </div>
      )}
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
          {benefit && (
            <div data-testid={`billing-plan-launch-benefit-${plan.code}`}
              style={{ fontSize: 12, color: T.accentText, fontWeight: 700, marginTop: 'var(--spacing-xxs)' }}>
              {/* 날짜가 «2027-02-» / «07까지»로 끊기지 않게 줄바꿈 없는 하이픈으로 (PW-2360) */}
              {labels.launchBenefitPlanTag(launchBenefitUntil.replace(/-/g, '\u2011'))}
              <div style={{ fontWeight: 500, color: T.muted }}>{labels.launchBenefitPlanAfter(plan.seatPrice)}</div>
            </div>
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
// ── «전자결재 · 휴가 패키지» 카드 (pivit-work PW-2782 · spec-billing §2.4-A ⑤ · §2.4-C) ──
//
// 새 시각 언어를 만들지 않는다 — 이 파일의 Card/Badge/Btn 을 그대로 조합한다(협의 단가 카드와 같은 방식).
// 배지 색: 사용 중 = 초록(성공) · 체험 = 브랜드(14일 이하 주황) · 해지 예정 = 주황(경고) · 꺼짐 = 회색 · 잠김 = 빨강.
// 상태·버튼은 서버가 판정한 값(`addon.phase` · `purchaseBlock` · `canStartTrial`)만 읽는다.
function addonBadgeOf(addon, labels) {
  switch (addon.phase) {
    case 'trial': {
      const soon = addon.trialDaysLeft != null && addon.trialDaysLeft <= 14;
      return {
        text: labels.addonBadgeTrial(addon.trialEndDate),
        color: soon ? T.amber : T.accentText,
        bg: soon ? T.amberBg : T.bl,
      };
    }
    case 'active':
      return { text: labels.addonBadgeActive, color: T.green, bg: T.greenBg };
    case 'cancel_scheduled':
      return { text: labels.addonBadgeCancelScheduled(addon.lastDay), color: T.amber, bg: T.amberBg };
    case 'lapsed':
      return { text: labels.addonBadgeLapsed, color: T.sub, bg: T.bl };
    case 'locked':
      return { text: labels.addonBadgeLocked, color: T.red, bg: T.redBg };
    default:
      return null;
  }
}

function addonBlockMessage(addon, labels) {
  switch (addon.purchaseBlock) {
    case 'free_plan': return labels.addonBlockFree;
    case 'past_due': return labels.addonBlockPastDue;
    case 'suspended': return labels.addonBlockSuspended;
    case 'plan_cancel_scheduled': return labels.addonBlockPlanCancel(addon.periodLastDay ?? '');
    case 'subscription_trial': return labels.addonBlockSubscriptionTrial;
    case 'workspace_deletion': return labels.addonBlockDeletion(addon.deletionCloseDate ?? '');
    default: return null;
  }
}

function AddonCard({ addon, interval, canEdit, highlight, labels, onTrial, onBuy, onCancel, onUndoCancel,
  onViewPlans, onManageMethods, busy }) {
  const ref = useRef(null);
  const [flash, setFlash] = useState(Boolean(highlight));
  useEffect(() => {
    if (!highlight || !ref.current) return undefined;
    ref.current.scrollIntoView?.({ block: 'center' });
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 2400);
    return () => clearTimeout(t);
  }, [highlight]);

  const badge = addonBadgeOf(addon, labels);
  const block = addonBlockMessage(addon, labels);
  const price = interval === 'annual' ? addon.priceAnnual : addon.priceMonthly;
  const disabled = !canEdit || busy;

  let action = null;
  if (addon.purchaseBlock === 'free_plan') {
    action = <Btn kind="secondary" onClick={onViewPlans}>{labels.addonViewPlansCta}</Btn>;
  } else if (addon.purchaseBlock === 'past_due') {
    action = <Btn kind="secondary" onClick={onManageMethods}>{labels.addonManageMethodsCta} <ArrowRightGlyph size={13} /></Btn>;
  } else if (addon.phase === 'active') {
    action = <Btn kind="danger" onClick={onCancel} disabled={disabled}>{labels.addonCancelCta}</Btn>;
  } else if (addon.phase === 'cancel_scheduled' && addon.cancelScheduledByAddon) {
    action = <Btn kind="secondary" onClick={onUndoCancel} disabled={disabled}>{labels.addonUndoCancelCta}</Btn>;
  } else if (addon.canStartTrial) {
    action = (
      <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
        <Btn onClick={onTrial} disabled={disabled}>{labels.addonTrialCta(addon.trialDays)}</Btn>
        <Btn kind="secondary" onClick={onBuy} disabled={disabled}>{labels.addonBuyNowCta}</Btn>
      </div>
    );
  } else if (addon.phase !== 'cancel_scheduled') {
    action = (
      <Btn kind={addon.phase === 'trial' ? 'secondary' : 'primary'} onClick={onBuy}
        disabled={disabled || Boolean(addon.purchaseBlock)}>
        {labels.addonBuyCta}
      </Btn>
    );
  }

  return (
    <div ref={ref} id="addon-approval_leave" data-testid="billing-addon-card" style={{ marginBottom: 'var(--spacing-3xl)' }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 'var(--spacing-lg)' }}>{labels.addonSectionTitle}</div>
      <Card style={{ border: `1px solid ${flash ? T.accent : T.border}`, transition: 'border-color .4s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--spacing-xl)', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', flexWrap: 'wrap', marginBottom: 'var(--spacing-sm)' }}>
              <span style={{ fontSize: 16, fontWeight: 800 }}>{labels.addonName}</span>
              {badge && <Badge color={badge.color} bg={badge.bg}>{badge.text}</Badge>}
            </div>
            <div style={{ fontSize: 13, color: T.sub, marginBottom: 'var(--spacing-md)' }}>{labels.addonDesc}</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              {labels.addonPrice(price)}
              {interval === 'annual' && (
                <span style={{ fontSize: 12, color: T.green, fontWeight: 700, marginLeft: 'var(--spacing-md)' }}>{labels.addonAnnualDiscount}</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: T.sub, marginTop: 'var(--spacing-xs)' }}>{labels.addonSeatsNote(addon.seats)}</div>
            {addon.state === 'lapsed' && (
              <div style={{ fontSize: 12, color: T.sub, marginTop: 'var(--spacing-md)' }}>{labels.addonLapsedNote}</div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--spacing-sm)' }}>
            {action}
            {block && (
              <div data-testid="billing-addon-block" style={{ fontSize: 12, color: T.sub, maxWidth: 320, textAlign: 'right' }}>{block}</div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

function AddonLoadFailed({ labels, onRetry }) {
  return (
    <div style={{ marginBottom: 'var(--spacing-3xl)' }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 'var(--spacing-lg)' }}>{labels.addonSectionTitle}</div>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--spacing-lg)', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: T.sub }}>{labels.addonLoadFailed}</span>
          <Btn kind="secondary" onClick={onRetry}>{labels.addonRetry}</Btn>
        </div>
      </Card>
    </div>
  );
}

const ADDON_ROW = { display: 'flex', justifyContent: 'space-between', gap: 'var(--spacing-lg)', fontSize: 13 };

function AddonBuyModal({ preview, previewFailed, labels, onClose, onSubmit, onRetryPreview, onManageMethods }) {
  const agreeId = useId();
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState(null);
  const submit = async () => {
    setBusy(true);
    setFailure(null);
    try {
      await onSubmit(preview.today.total);
    } catch (err) {
      setFailure(err?.message || '');
    } finally {
      setBusy(false);
    }
  };
  return (
    <ModalShell
      title={labels.addonBuyTitle}
      titleId="billing-addon-buy-title"
      closeLabel={labels.close}
      onClose={onClose}
      zIndex={1000}
      className="adm-shell"
      testId="billing-addon-buy"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{labels.cancelButton}</Button>
          <Button variant="primary" data-testid="billing-addon-buy-submit" pending={busy}
            pendingLabel={labels.addonBuyBusy}
            onClick={() => void submit()} disabled={!preview || !agreed}>
            {failure != null ? labels.addonBuyRetry : labels.addonBuySubmit}
          </Button>
        </>
      }
    >
      <div style={{ fontFamily: T.font, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        {!preview && !previewFailed && <div style={{ fontSize: 13, color: T.sub }}>{labels.addonBuyLoading}</div>}
        {previewFailed && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--spacing-lg)' }}>
            <span style={{ fontSize: 13, color: T.red }}>{labels.addonBuyLoadFailed}</span>
            <Btn kind="secondary" onClick={onRetryPreview}>{labels.addonRetry}</Btn>
          </div>
        )}
        {preview && (
          <>
            <div>
              <div style={ADDON_ROW}>
                <span style={{ fontWeight: 700 }}>{labels.addonBuyTodayLabel}</span>
                <span style={{ fontWeight: 800 }}>{won(preview.today.total)}</span>
              </div>
              <div style={{ fontSize: 12, color: T.sub, marginTop: 'var(--spacing-xs)' }}>{labels.addonBuyTodayDetail(preview.lastDay, preview.remainingDays, preview.periodDays, preview.seats, preview.unitPrice, preview.months)}</div>
              {preview.kind === 'charge' ? (
                <div style={{ fontSize: 12, color: T.sub, marginTop: 'var(--spacing-xxs)' }}>{labels.addonBuyVat(preview.today.vat)}</div>
              ) : (
                <div style={{ fontSize: 12, color: T.amber, marginTop: 'var(--spacing-xxs)' }}>{labels.addonBuyCarry}</div>
              )}
            </div>
            <div>
              <div style={ADDON_ROW}>
                <span style={{ fontWeight: 700 }}>{labels.addonBuyNextLabel(preview.nextBillingDate)}</span>
                <span style={{ fontWeight: 700 }}>{won(preview.perPeriod)}</span>
              </div>
              <div style={{ fontSize: 12, color: T.sub, marginTop: 'var(--spacing-xs)' }}>{labels.addonBuyNextDetail(preview.seats, preview.unitPrice, preview.months)}</div>
            </div>
            {preview.cardLast4 && (
              <div style={ADDON_ROW}>
                <span style={{ fontWeight: 700 }}>{labels.addonBuyCardLabel}</span>
                <span>{labels.addonBuyCard(preview.cardBrand, preview.cardLast4)}</span>
              </div>
            )}
            <div style={{ padding: 'var(--spacing-md) var(--spacing-lg)', background: T.bl, borderRadius: 10, fontSize: 13, color: T.sub }}>
              {labels.addonBuyCancelNote}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-md)', fontSize: 13 }}>
              <Checkbox id={agreeId} checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
              <label htmlFor={agreeId} style={{ cursor: 'pointer' }}>{labels.addonBuyAgree}</label>
            </div>
          </>
        )}
        {failure != null && (
          <div data-testid="billing-addon-buy-failed" style={{ padding: 'var(--spacing-md) var(--spacing-lg)', background: T.redBg, borderRadius: 10 }}>
            <div style={{ fontSize: 13, color: T.red, fontWeight: 700, marginBottom: 'var(--spacing-md)' }}>{labels.addonBuyFailed(failure)}</div>
            <Btn kind="secondary" onClick={onManageMethods}>{labels.addonManageMethodsCta} <ArrowRightGlyph size={13} /></Btn>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

function AddonCancelModal({ addon, labels, onClose, onSubmit, onRefundQuote, onRefund }) {
  const [busy, setBusy] = useState(false);
  const [refundBusy, setRefundBusy] = useState(false);
  const [refundQuote, setRefundQuote] = useState(null);
  useEffect(() => {
    let alive = true;
    // 못 불러오면 보조 선택 없이 기간말 해지만 — 환불 대상이 아닌 것과 같다.
    Promise.resolve(onRefundQuote?.())
      .then((q) => { if (alive) setRefundQuote(q ?? null); })
      .catch(() => { if (alive) setRefundQuote(null); });
    return () => { alive = false; };
  }, [onRefundQuote]);
  const submit = async () => {
    setBusy(true);
    try {
      await onSubmit();
    } catch {
      // 창을 연 채 둔다 — 실패 안내(토스트)는 앱이 한다(plans §5 «창 유지 + 에러 토스트»).
    } finally {
      setBusy(false);
    }
  };
  const refund = async () => {
    setRefundBusy(true);
    try {
      await onRefund?.(refundQuote.amount);
    } catch {
      // 창을 연 채 둔다 — 금액이 바뀌었으면 앱이 견적을 다시 준다.
      Promise.resolve(onRefundQuote?.()).then((q) => setRefundQuote(q ?? null)).catch(() => setRefundQuote(null));
    } finally {
      setRefundBusy(false);
    }
  };
  return (
    <ModalShell
      title={labels.addonCancelTitle}
      titleId="billing-addon-cancel-title"
      closeLabel={labels.close}
      onClose={onClose}
      zIndex={1000}
      className="adm-shell"
      testId="billing-addon-cancel"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{labels.cancelButton}</Button>
          <Button variant="danger-ghost" data-testid="billing-addon-cancel-submit" pending={busy}
            pendingLabel={labels.addonBusy} onClick={() => void submit()}>
            {labels.addonCancelSubmit}
          </Button>
        </>
      }
    >
      <div style={{ fontFamily: T.font, fontSize: 14, color: T.sub }}>
        {labels.addonCancelBody(addon.periodLastDay ?? '')}
      </div>
      {refundQuote?.eligible && refundQuote.amount > 0 && (
        /* 보조 선택 — 구독 현황 해지 창의 «즉시 해지 + 환불» 칸과 같은 초록 테두리 */
        <div data-testid="billing-addon-refund"
          style={{ border: `1px solid ${T.green}`, borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-xl)', marginTop: 'var(--spacing-xl)', background: T.greenBg }}>
          <Button variant="secondary" data-testid="billing-addon-refund-submit" pending={refundBusy}
            pendingLabel={labels.addonBusy} disabled={busy} onClick={() => void refund()}>
            {labels.addonRefundCta(refundQuote.amount)}
          </Button>
        </div>
      )}
    </ModalShell>
  );
}

function FeatureCompareTable({ plans, featureKeys, featureLabelMap, currentPlanCode, labels }) {
  return (
    <Card style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>{labels.compareTitle}</div>
      <RosterTable>
        <RosterTable.Head>
          <RosterTable.HeadCell>{labels.compareFeatureHeader}</RosterTable.HeadCell>
          {plans.map((p) => (
            <RosterTable.HeadCell key={p.code} align="center">
              <span style={{ fontWeight: 700, color: p.code === currentPlanCode ? T.accentText : T.text }}>{p.label}</span>
              {p.recommended && <div style={{ fontSize: 10, color: T.purple, fontWeight: 700 }}>{labels.compareRecommendedTag}</div>}
            </RosterTable.HeadCell>
          ))}
        </RosterTable.Head>
        <RosterTable.Body>
          {featureKeys.map((key) => (
            <RosterTable.Row key={key}>
              <RosterTable.Cell style={{ fontWeight: 500 }}>{featureLabelMap[key]}</RosterTable.Cell>
              {plans.map((p) => (
                <RosterTable.Cell key={p.code} align="center">
                  <FeatureIcon status={p.featureStatus ? p.featureStatus[key] : false} />
                </RosterTable.Cell>
              ))}
            </RosterTable.Row>
          ))}
          <RosterTable.Row>
            <RosterTable.Cell style={{ color: T.sub, fontSize: 12 }}>{labels.recordingRowLabel}</RosterTable.Cell>
            {plans.map((p) => (
              <RosterTable.Cell key={p.code} align="center" style={{ fontSize: 11, color: T.sub }}>
                {(p.recordingNote || '').split(' (')[0]}
              </RosterTable.Cell>
            ))}
          </RosterTable.Row>
          <RosterTable.Row>
            <RosterTable.Cell style={{ color: T.sub, fontSize: 12 }}>{labels.aiRunsRowLabel}</RosterTable.Cell>
            {plans.map((p) => (
              <RosterTable.Cell key={p.code} align="center" style={{ fontSize: 11, color: T.sub }}>
                {p.aiRunsNote}
              </RosterTable.Cell>
            ))}
          </RosterTable.Row>
        </RosterTable.Body>
      </RosterTable>
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
  /**
   * 즉시 해지·환불이 끝나지 않았다(처리 중·실패) — 갱신 견적 [갱신 조건에 동의]를 끄고
   * «환불이 끝날 때까지 계약 조건을 바꿀 수 없습니다»를 보인다 (pivit-work PW-2476).
   */
  renewalLocked = false,
  /**
   * 약정 기간 중 하향 차단 (spec-billing.md §2.6.4 · `screen-billing-plans.policy.md`
   * 「약정 기간 중 하향 CTA 비활성」). `{ contractEnd, lockedPlanCodes }` 또는 `null`.
   * `lockedPlanCodes` 의 카드는 버튼이 꺼지고, 카드 아래에 안내 줄 + [영업팀 문의 →] 가 뜬다.
   * 어느 카드가 «하위»인지는 앱이 정한다 — 계약 종료일·현재 요금제를 앱이 안다.
   */
  commitment = null,
  /**
   * 구독 조회가 실패해 현재 플랜을 모른다. 플랜 비교는 그대로 보이고, 현재 플랜 자리는 「–」,
   * 플랜 카드 버튼은 꺼진다 — 어느 쪽이 올리기·내리기인지 모르는 채 바꾸게 두지 않는다.
   */
  subscriptionUnavailable = false,
  /**
   * 수락된 협의 계약 `{ maxSeats, overageSeats, overageSeatPrice, seatPrice }` 또는 `null`.
   * 지금 활성 구성원이 상한을 넘었으면(`overageSeats > 0`) 초과 안내를 띄운다.
   */
  contract = null,
  /**
   * 유효 견적의 플랜(Pro)을 미리보기할 때 «예상 청구액» 칸에 그릴 **서버 계산 금액** (PW-1620).
   * 캔버스는 협의 단가 금액을 직접 셈하지 않는다 — 결제하기 화면과 같은 서버 값을 그대로 그린다.
   * `{ seats, billedSeats, minSeats, baseSeats, overageSeats, unitPrice, overageUnitPrice,
   *    months, baseAmount, overageAmount, subtotal, vat, total }` 또는 `null`(불러오는 중).
   * 고른 좌석(`seats`)과 다른 좌석으로 계산된 값이면 불러오는 중으로 본다.
   */
  quoteEstimate = null,
  /** 위 금액을 불러오지 못했다 — 「없음」이 아니라 실패 안내와 [다시 시도]를 그린다. */
  quoteEstimateFailed = false,
  onRetryQuoteEstimate = () => {},
  /**
   * 베타 출시 혜택 종료일 `YYYY-MM-DD` — 혜택 기간 안일 때만 앱이 넘긴다(pivit-work PW-2360). 있으면 월간 Starter·Growth
   * 카드 가격과 예상 청구액이 연간 단가다. 결제 금액은 서버가 다시 정한다.
   */
  launchBenefitUntil = null,
  /**
   * 이용 정지 (pivit-work PW-2549·PW-2550 · plans «이용 정지 안내 띠» 행) — 구독이 «이용 정지»면 앱이 `{}`(참)를 넘긴다.
   * 맨 위 빨간 띠 + [구독 현황으로], «현재 플랜» 배지 없음(정지 전 요금제도 다시 고른다), Free 카드 버튼 잠금,
   * 유료 카드는 모두 결제(체크아웃)로 간다 — 정지 전보다 낮은 요금제도 «변경 확인 창»이 아니라 결제다.
   */
  suspension = null,
  /**
   * 체험으로 받은 요금제 (pivit-work PW-2657) — 유효한 체험 중이면 앱이 `{ planCode, badge, until }` 을 넘긴다
   * (`badge` «베타 무상 제공 중» · `until` «2027-02-04까지» — 다 만든 글). 그 카드에 «현재 플랜» 배지와 체험 배지·종료일을 붙이고
   * 비교표도 그 요금제를 강조한다. 버튼은 끄지 않는다 — 결제 흐름은 `subscription.planCode`(체험이면 Free)를
   * 그대로 따라 모든 유료 카드가 결제로 간다. Free 카드는 «현재 플랜»이 아니고 버튼은 꺼진다(체험 중 Free 로 바꾸는 길은 없다).
   */
  trialPlan = null,
  /**
   * 결제 문제 안내 띠 (pivit-work PW-2526 · plans «결제 문제 안내 띠» 행) — 결제 실패 회사·미납이 남은 해지 회사에 앱이
   * `{ title, body, action }` 을 넘긴다. 뜨는 동안 요금제 카드 버튼은 Free·Pro·견적 결제까지 모두 비활성이다.
   */
  payBlock = null,
  onPayBlockAction,
  /**
   * «전자결재 · 휴가 패키지» (pivit-work PW-2782 · plans «애드온» 행) — 서버 `GET billing/addons` 응답.
   * `null` 이면(판매 전) 카드도 제목도 없다. `addonLoadFailed` 면 카드 자리에 «불러오지 못했습니다».
   * 사고·해지하는 함수는 Promise — 거부되면 창을 연 채 실패를 보인다. 금액은 서버가 다시 센다.
   */
  addon = null,
  addonLoadFailed = false,
  addonHighlight = false,
  addonBusy = false,
  onAddonRetry = () => {},
  onAddonTrial = () => {},
  onAddonPreview = () => Promise.resolve(null),
  onAddonPurchase = () => Promise.resolve(),
  onAddonCancel = () => Promise.resolve(),
  // 해지 창을 열 때 환불 견적 — { eligible, amount } 또는 null (pivit-work PW-2782)
  onAddonRefundQuote = () => Promise.resolve(null),
  onAddonRefund = () => Promise.resolve(),
  onAddonUndoCancel = () => {},
  onNavigateMethods = () => {},
}) {
  const seatConfirmId = useId();
  const labels = mergeLabels(providedLabels);

  const [intervalState, setIntervalState] = useState('monthly'); // monthly | annual
  const [seatsState, setSeatsState] = useState(activeSeats);
  const [confirmTarget, setConfirmTargetState] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmFailed, setConfirmFailed] = useState(false);
  const setConfirmTarget = (plan) => {
    setConfirmFailed(false);
    setConfirmTargetState(plan);
  };
  const [downgradeChecked, setDowngradeChecked] = useState(false);
  const [previewPlanCode, setPreviewPlanCode] = useState(null);
  const [addonModal, setAddonModal] = useState(null); // null | 'buy' | 'cancel'
  const [addonPreview, setAddonPreview] = useState(null);
  const [addonPreviewFailed, setAddonPreviewFailed] = useState(false);
  const plansTopRef = useRef(null);
  const loadAddonPreview = () => {
    setAddonPreview(null);
    setAddonPreviewFailed(false);
    Promise.resolve(onAddonPreview())
      .then((p) => (p ? setAddonPreview(p) : setAddonPreviewFailed(true)))
      .catch(() => setAddonPreviewFailed(true));
  };
  const openAddonBuy = () => {
    setAddonModal('buy');
    loadAddonPreview();
  };

  // 청구 주기·좌석 수는 onIntervalChange/onSeatsChange 주입 시 controlled(위임),
  // 아니면 내부 state.
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
  // 이용 정지면 지금 결제된 요금제가 없다 — 모든 유료 카드가 «결제»다 (PW-2549).
  const currentRank = suspension ? 0 : (currentPlan?.tierRank ?? 0);
  const isCurrentFree = suspension ? true : (currentPlan?.tierRank ?? 0) === 0;

  const lowestPaidPlan = plans
    .filter((p) => (p.tierRank ?? 0) > 0 && !p.isCustom)
    .sort((a, b) => (a.tierRank ?? 0) - (b.tierRank ?? 0))[0];

  // 결제할 수 있는 협의 견적이 있으면 그 플랜이 기본 미리보기다 (PW-1620 · screen-billing-plans §7).
  // 견적 플랜 카드의 버튼은 곧장 결제로 넘어가 미리보기를 고를 틈이 없다 — 기본을 지금 요금제로 두면
  // 「예상 청구액」이 실제로 낼 협의 금액이 아니라 지금 요금제 정가로 보인다. 갱신 견적은 다음 기간
  // 조건이라 지금 청구 미리보기에 쓰지 않는다.
  const payableQuotePlanCode =
    quote && !quote.expired && !quote.isRenewal ? quote.planCode : null;
  const effectivePreview = previewPlanCode
    ?? payableQuotePlanCode
    ?? (isCurrentFree ? (lowestPaidPlan?.code ?? subscription.planCode) : subscription.planCode);
  const billingPlan = plans.find((p) => p.code === effectivePreview) ?? currentPlan;
  const previewPlan = plans.find((p) => p.code === previewPlanCode);

  const unitPrice = (interval === 'annual' || launchBenefitApplies(billingPlan, interval, launchBenefitUntil))
    && billingPlan?.seatPriceAnnual != null
    ? billingPlan.seatPriceAnnual
    : (billingPlan?.seatPrice ?? 0);
  // 한 주기분 — 월간 1개월, 연간 12개월 (spec-billing.md §2.3 선결제 원칙, PW-757).
  const periodMonths = interval === 'annual' ? 12 : 1;
  const subtotal = seats * unitPrice * periodMonths;
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

    // billing_profile 미입력 업그레이드 (PW-2110 · screen-billing-plans.policy.md §4) — 경고 상자 없이
    // 곧바로 청구 정보로 보낸다. 고른 요금제·주기를 넘겨, 앱이 결제 대상으로 남기고 결제 진행 모드로 연다.
    // 종전에는 빨간 「청구 정보가 필요합니다」 상자 → [청구 정보 입력] 으로 한 번 더 눌러야 했고,
    // 고른 요금제가 넘어가지 않아 저장 뒤 다시 골라야 했다.
    if (targetRank > currentRank && !subscription.hasProfile) {
      onNavigateBillingSettings(plan.code, interval);
      return;
    }

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

  // 변경 요청이 끝날 때까지 창을 연 채 기다린다. 앱이 거부(throw)하면 창을 닫지 않고 확인 버튼이
  // 「다시 시도」가 된다 — 실패 안내는 앱이 토스트로 띄운다(screen-billing-plans §3).
  const handleConfirm = async () => {
    if (!confirmTarget || confirmBusy) return;
    const target = confirmTarget;
    setConfirmBusy(true);
    try {
      await onConfirmChange(target.code, interval, seats);
      setConfirmTarget(null);
    } catch {
      setConfirmFailed(true);
    } finally {
      setConfirmBusy(false);
    }
  };

  const isDowngrade = confirmTarget ? (confirmTarget.tierRank ?? 0) < currentRank : false;
  const freeLimit = confirmTarget?.seatLimit;
  const isFreeTarget = isDowngrade && (confirmTarget?.tierRank ?? 0) === 0;
  // 한도 초과는 «지금 활성 구성원»으로 본다 — 좌석 스테퍼 값은 결제할 좌석이라 Free 전환과 무관하다.
  const seatOverLimit = isFreeTarget
    && freeLimit != null
    && activeSeats > freeLimit;
  // 유료→유료 본문은 함수로도 받는다 (pivit-work PW-2475 · screen-billing-plans §4) — 낮출 요금제 이름과,
  // 지금 구독(`subscription.interval`)과 다른 청구 주기를 골랐을 때 그 주기(아니면 null)를 넘긴다.
  const switchedInterval = subscription.interval && interval !== subscription.interval ? interval : null;
  const downgradeBody = isFreeTarget && labels.confirmDowngradeFreeBody
    ? labels.confirmDowngradeFreeBody
    : typeof labels.confirmDowngradeBody === 'function'
      ? labels.confirmDowngradeBody(confirmTarget?.label ?? '', switchedInterval)
      : labels.confirmDowngradeBody;


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
  // 유효 견적의 플랜을 미리보기 중이면 예상 청구액은 협의 단가(서버 계산)로 그린다 (PW-1620).
  // 정가 칸과 동시에 뜨지 않는다 — 정가로 셈한 금액이 협의 금액 옆에 남으면 어느 쪽이 청구되는지 모른다.
  const useQuoteEstimate =
    Boolean(validQuote) && !validQuote.isRenewal &&
    Boolean(billingPlan) && billingPlan.code === validQuote.planCode;
  const readyQuoteEstimate =
    quoteEstimate && quoteEstimate.seats === seats ? quoteEstimate : null;
  // Pro 커스텀 안내 카드는 유효 견적이 없을 때만 — 있으면 협의 단가 카드가 그 자리를 대신한다
  // (screen-billing-plans §2 · TC-BILL-140 「동시에 뜨지 않음」).
  const showProCard = Boolean(currentPlan?.isCustom || previewPlan?.isCustom) && !validQuote;
  const contractOverMax =
    Boolean(contract) && contract.maxSeats != null && (contract.overageSeats ?? 0) > 0;

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
        {subscriptionUnavailable && (
          <div data-testid="billing-plans-current-unknown"
            style={{ fontSize: 13, color: T.sub, marginTop: -16, marginBottom: 20 }}>
            {labels.currentPlanUnknown}
          </div>
        )}

        {contractOverMax && (
          <Card style={{ marginBottom: 16, background: T.amberBg, border: '1px solid #FDE68A' }}>
            <div data-testid="billing-plans-contract-over-max" style={{ fontSize: 13, color: T.text }}>
              {labels.contractOverMaxNotice(
                contract.maxSeats,
                contract.overageSeatPrice ?? contract.seatPrice,
              )}
            </div>
          </Card>
        )}

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

        {/* 이용 정지 안내 띠 (pivit-work PW-2549·PW-2550) — 구독 현황 정지 배너와 같은 빨간 Card */}
        {suspension && (
          <Card style={{ marginBottom: 'var(--spacing-xl)', background: T.redBg, border: '1px solid var(--utility-error-300)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--spacing-xl)' }}>
            <div data-testid="billing-plans-suspended" role="status">
              <div style={{ fontWeight: 800, color: T.red, marginBottom: 'var(--spacing-xs)' }}>{labels.suspendedTitle}</div>
              <div style={{ fontSize: 13, color: T.text }}>{labels.suspendedBody}</div>
            </div>
            <div style={{ flex: 'none', whiteSpace: 'nowrap' }}>
              <Btn kind="secondary" onClick={onNavigateBillingOverview}>{labels.suspendedBackToOverview}</Btn>
            </div>
          </Card>
        )}

        {/* 결제 문제 안내 띠 (pivit-work PW-2526) — 이용 정지 띠와 같은 빨간 Card */}
        {payBlock && (
          <Card style={{ marginBottom: 'var(--spacing-xl)', background: T.redBg, border: '1px solid var(--utility-error-300)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--spacing-xl)' }}>
            <div data-testid="billing-plans-pay-block" role="status">
              <div style={{ fontWeight: 800, color: T.red, marginBottom: 'var(--spacing-xs)' }}>{payBlock.title}</div>
              <div style={{ fontSize: 13, color: T.text }}>{payBlock.body}</div>
            </div>
            <div style={{ flex: 'none', whiteSpace: 'nowrap' }}>
              <Btn kind="secondary" onClick={onPayBlockAction} disabled={!canEdit}>
                {payBlock.action}
                {payBlock.arrow && ' '}
                {payBlock.arrow && <ArrowRightGlyph size={13} />}
              </Btn>
            </div>
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

        {/* 청구 주기 토글 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <span style={{ fontSize: 14, color: T.sub }}>{labels.billingCycleLabel}</span>
          {/* 하나만 고르는 칸 = 공용 세그먼트 버튼 (PW-1894) */}
          <SegmentedControl
            ariaLabel={labels.billingCycleLabel}
            items={[
              { value: 'monthly', label: labels.monthly },
              { value: 'annual', label: labels.annual },
            ]}
            value={interval}
            onChange={setInterval}
          />
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
            renewalLocked={renewalLocked}
            onPay={() =>
              validQuote.isRenewal
                ? onAcceptQuoteRenewal(validQuote.quoteId)
                : onQuoteCheckout(validQuote.quoteId)
            }
          />
        )}

        {/* 4티어 플랜 카드 — [플랜 보기](패키지 카드 · Free)가 여기로 스크롤한다 */}
        <div ref={plansTopRef} />
        <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
          {plans.map((plan) => (
            <PlanCard
              key={plan.code}
              plan={plan}
              isCurrent={!suspension && !trialPlan && plan.code === subscription.planCode}
              interval={interval}
              canEdit={
                canEdit &&
                !subscriptionUnavailable &&
                !payBlock &&
                // 이용 정지면 Free 로 가는 결제는 없다 — 해지는 구독 현황의 [해지 신청] (띠 둘째 문장이 이유를 말한다)
                !(suspension && (plan.tierRank ?? 0) === 0) &&
                // 체험 중 Free 카드 — 지금 Free 를 쓰는 것이 아니지만 Free 로 바꾸는 길도 없다 (PW-2657)
                !(trialPlan && !suspension && (plan.tierRank ?? 0) === 0) &&
                !subscription.cancelAtPeriodEnd &&
                !(commitment?.lockedPlanCodes ?? []).includes(plan.code)
              }
              isCustomCta={plan.isCustom}
              featureKeys={featureKeys}
              featureLabelMap={featureLabelMap}
              labels={labels}
              negotiatedPrice={
                plan.isCustom && validQuote && validQuote.planCode === plan.code
                  ? validQuote.seatPrice
                  : null
              }
              launchBenefitUntil={launchBenefitUntil}
              trialNote={!suspension && trialPlan && trialPlan.planCode === plan.code ? trialPlan : null}
              onAction={() => onPlanAction(plan)}
            />
          ))}
        </div>

        {/* 약정 기간 중 하향 차단 안내 (PW-344) */}
        {commitment && canEdit && (commitment.lockedPlanCodes ?? []).length > 0 && (
          <div data-testid="billing-commitment-notice" style={{ fontSize: 13, color: T.sub, marginBottom: 16 }}>
            {labels.commitmentNotice(commitment.contractEnd)}{' '}
            <button type="button" onClick={onNavigateContactSales}
              style={{ background: 'none', border: 'none', color: T.accentText, fontWeight: 700,
                fontSize: 13, cursor: 'pointer', padding: 0 }}>{labels.commitmentContactCta}</button>
          </div>
        )}

        {/* «전자결재 · 휴가 패키지» — 기능 비교표 위 (pivit-work PW-2782 · plans «애드온 카드» 행). 판매 전이면 없다. */}
        {addonLoadFailed ? (
          <AddonLoadFailed labels={labels} onRetry={onAddonRetry} />
        ) : addon?.onSale ? (
          <AddonCard
            addon={addon}
            interval={interval}
            canEdit={canEdit}
            highlight={addonHighlight}
            busy={addonBusy}
            labels={labels}
            onTrial={onAddonTrial}
            onBuy={openAddonBuy}
            onCancel={() => setAddonModal('cancel')}
            onUndoCancel={onAddonUndoCancel}
            onViewPlans={() => plansTopRef.current?.scrollIntoView?.({ block: 'start' })}
            onManageMethods={onNavigateMethods}
          />
        ) : null}

        {/* 기능 비교 테이블 */}
        <FeatureCompareTable
          plans={plans}
          featureKeys={featureKeys}
          featureLabelMap={featureLabelMap}
          currentPlanCode={suspension ? null : (trialPlan?.planCode ?? subscription.planCode)}
          labels={labels}
        />

        {/* 결제 좌석 수 선택 카드 */}
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>
              {labels.seatCardTitle}
              <Tooltip content={labels.seatTooltip}>
                <span style={{ cursor: 'help', color: T.muted, fontSize: 13, marginLeft: 4 }}>ⓘ</span>
              </Tooltip>
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
                  fontVariantNumeric: 'tabular-nums', color: T.text,
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
                <b style={{ color: seats > activeSeats ? T.accentText : T.amber, marginLeft: 6 }}>
                  {labels.seatDelta(seats, seats - activeSeats)}
                </b>
              )}
            </span>
            {seats !== activeSeats && canEdit && (
              <button type="button" onClick={() => setSeatsClamped(activeSeats)}
                style={{ background: 'none', border: 'none', color: T.accentText, fontWeight: 700,
                  fontSize: 13, cursor: 'pointer', padding: 0, whiteSpace: 'nowrap' }}>
                {labels.matchActiveSeats(activeSeats)}
              </button>
            )}
          </div>

          {/* Proration A 안내 배너 + 좌석 조정 동선 */}
          <div style={{ marginTop: 12, padding: '10px 14px', background: T.bl,
            borderRadius: 10, fontSize: 13, color: T.sub,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span>
              {labels.prorationPre}
              <b>{labels.prorationStrong1}</b>
              {labels.prorationMid}
              <b>{labels.prorationStrong2}</b>
              {labels.prorationPost}
            </span>
            <button type="button" onClick={onNavigateMembers}
              style={{ background: 'none', border: 'none', color: T.accentText, fontWeight: 700,
                fontSize: 13, cursor: 'pointer', padding: 0, whiteSpace: 'nowrap' }}>
              {labels.manageMembers}
            </button>
          </div>
        </Card>

        {/* 예상 청구액 */}
        {seats > 0 && billingPlan && !billingPlan.isCustom && !useQuoteEstimate && (
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
              <span>{labels.estimateLineItem(seats, unitPrice, periodMonths)}</span>
              <span style={{ color: T.text, fontWeight: 600 }}>{won(subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: T.sub, marginBottom: 8 }}>
              <span>{labels.vatLabel}</span>
              <span style={{ color: T.text, fontWeight: 600 }}>{won(vat)}</span>
            </div>
            <Divider />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 17, fontWeight: 800 }}>
              <span>{periodMonths > 1 ? labels.annualTotalLabel : labels.monthlyTotalLabel}</span>
              <span>{won(total)}</span>
            </div>
            {interval === 'annual' && (
              <div style={{ fontSize: 12, color: T.amber, marginTop: 8 }}>{labels.annualEstimateNote}</div>
            )}
            <div style={{ fontSize: 12, color: T.muted, marginTop: 8 }}>{labels.estimateFootnote}</div>
          </Card>
        )}

        {/* 예상 청구액 — 유효 견적의 플랜(Pro). 금액은 서버 계산값 (PW-1620) */}
        {seats > 0 && useQuoteEstimate && (
          <Card style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
              {isCurrentFree ? labels.estimateTitleUpgrade(billingPlan.label) : labels.estimateTitle}
              <span style={{ fontSize: 12, color: T.muted, fontWeight: 400, marginLeft: 8 }}>
                {labels.estimateSubnote(seats)}
              </span>
            </div>
            {quoteEstimateFailed ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: T.sub }}>
                <span>{labels.estimateQuoteFailed}</span>
                <Btn kind="secondary" onClick={onRetryQuoteEstimate}>{labels.estimateQuoteRetry}</Btn>
              </div>
            ) : !readyQuoteEstimate ? (
              <div style={{ fontSize: 14, color: T.muted }}>{labels.estimateQuoteLoading}</div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: T.sub, marginBottom: 6 }}>
                  <span>
                    {labels.estimateQuoteLineItem(readyQuoteEstimate.baseSeats, readyQuoteEstimate.unitPrice, readyQuoteEstimate.months)}
                  </span>
                  <span style={{ color: T.text, fontWeight: 600 }}>{won(readyQuoteEstimate.baseAmount)}</span>
                </div>
                {readyQuoteEstimate.overageSeats > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: T.sub, marginBottom: 6 }}>
                    <span>
                      {labels.estimateOverageLineItem(readyQuoteEstimate.overageSeats, readyQuoteEstimate.overageUnitPrice, readyQuoteEstimate.months)}
                    </span>
                    <span style={{ color: T.text, fontWeight: 600 }}>{won(readyQuoteEstimate.overageAmount)}</span>
                  </div>
                )}
                {readyQuoteEstimate.billedSeats > seats && (
                  <div style={{ fontSize: 12, color: T.amber, marginBottom: 6 }}>
                    {labels.estimateMinSeatsNote(readyQuoteEstimate.minSeats)}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: T.sub, marginBottom: 8 }}>
                  <span>{labels.vatLabel}</span>
                  <span style={{ color: T.text, fontWeight: 600 }}>{won(readyQuoteEstimate.vat)}</span>
                </div>
                <Divider />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 17, fontWeight: 800 }}>
                  <span>{readyQuoteEstimate.months > 1 ? labels.annualTotalLabel : labels.monthlyTotalLabel}</span>
                  <span>{won(readyQuoteEstimate.total)}</span>
                </div>
              </>
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
              <Btn kind="secondary" onClick={onNavigateContactSales} disabled={!canEdit || !!payBlock}>
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

        {/* 다운그레이드·플랜 변경 확인 창 — 공용 창 틀(ModalShell · PW-836). body 직속 포털이라
            사이드바(App.css `.sidebar` = 100)까지 덮는다. 겹침 순서는 종전 값 1000. */}
        {confirmTarget && (
          <ModalShell
            title={isDowngrade
              ? labels.confirmDowngradeTitle(confirmTarget.label)
              : labels.confirmChangeTitle(confirmTarget.label)}
            titleId="billing-plan-confirm-title"
            closeLabel={labels.close}
            onClose={() => setConfirmTarget(null)}
            zIndex={1000}
            className="adm-shell"
            testId="billing-plan-confirm"
            footer={
              <>
                <button type="button" className="tl-group-modal-btn tl-group-modal-btn-secondary"
                  onClick={() => setConfirmTarget(null)}>
                  {labels.cancelButton}
                </button>
                <button type="button"
                  className={`tl-group-modal-btn ${isDowngrade ? 'adm-btn-danger-ghost' : 'tl-group-modal-btn-primary'}`}
                  onClick={() => void handleConfirm()}
                  data-testid="billing-plan-confirm-submit"
                  disabled={confirmBusy || (seatOverLimit && !downgradeChecked)}>
                  {confirmBusy
                    ? labels.confirmBusyCta
                    : confirmFailed
                      ? labels.confirmRetryCta
                      : isDowngrade ? labels.confirmDowngradeCta : labels.confirmChangeCta}
                </button>
              </>
            }
          >
            <div style={{ fontFamily: T.font }}>
              <div style={{ fontSize: 14, color: T.sub, marginBottom: 16 }}>
                {isDowngrade ? downgradeBody : labels.confirmChangeBody}
              </div>

              {/* Free 다운그레이드 — 좌석 상한 초과 경고 */}
              {seatOverLimit && (
                <div style={{ padding: '12px 16px', background: T.amberBg,
                  border: '1px solid #FDE68A', borderRadius: 10, marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.amber, marginBottom: 4 }}>
                    {labels.seatOverLimitTitle}
                  </div>
                  <div style={{ fontSize: 13, color: T.text }}>
                    {labels.seatOverLimitPre(activeSeats, freeLimit)}
                    <strong>{labels.seatOverLimitStrong}</strong>
                    {labels.seatOverLimitPost}
                  </div>
                  {/* 네모는 공용 `Checkbox`(제품색 16px · PW-1936), 글씨는 `htmlFor` 로 이어 눌러도 켜진다 */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8,
                    marginTop: 10, fontSize: 13 }}>
                    <Checkbox id={seatConfirmId} checked={downgradeChecked}
                      onChange={(e) => setDowngradeChecked(e.target.checked)} />
                    <label htmlFor={seatConfirmId} style={{ cursor: 'pointer' }}>{labels.seatOverLimitConfirm}</label>
                  </div>
                </div>
              )}

              {/* 상위 기능 데이터 보존 안내 (일반 다운그레이드) */}
              {isDowngrade && !seatOverLimit && (
                <div style={{ padding: '10px 14px', background: T.bl,
                  borderRadius: 10, fontSize: 13, color: T.sub, marginBottom: 16 }}>
                  {labels.downgradeDataNotice}
                </div>
              )}
            </div>
          </ModalShell>
        )}

        {addonModal === 'buy' && addon && (
          <AddonBuyModal
            preview={addonPreview}
            previewFailed={addonPreviewFailed}
            labels={labels}
            onClose={() => setAddonModal(null)}
            onRetryPreview={loadAddonPreview}
            onManageMethods={onNavigateMethods}
            onSubmit={async (expectedTotal) => {
              await onAddonPurchase(expectedTotal);
              setAddonModal(null);
            }}
          />
        )}
        {addonModal === 'cancel' && addon && (
          <AddonCancelModal
            addon={addon}
            labels={labels}
            onClose={() => setAddonModal(null)}
            onSubmit={async () => {
              await onAddonCancel();
              setAddonModal(null);
            }}
            onRefundQuote={onAddonRefundQuote}
            onRefund={async (amount) => {
              await onAddonRefund(amount);
              setAddonModal(null);
            }}
          />
        )}

      </div>
    </div>
  );
}
