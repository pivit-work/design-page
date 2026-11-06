import { useRef, useState } from 'react';
import ModalShell from '../shared/ModalShell.jsx';
import Button from '../shared/Button.jsx';
import Tooltip from '../shared/Tooltip.jsx';
import Stack from '../shared/Stack.jsx';
import FormField from '../shared/FormField.jsx';
import TextArea from '../shared/TextArea.jsx';
import { ArrowRightGlyph } from '../shared/lineIcons.jsx';
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
  // 주 버튼·고른 것은 브랜드 초록, 누르는 글자·딱지 글자는 진한 초록 — 「플랜 선택」 탭과 같다 (PW-1936)
  accent: 'var(--bg-brand-solid)', accentText: 'var(--text-brand-secondary)',
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
  trial: { color: T.accentText, bg: 'var(--bg-brand-secondary)' },
  // 이용 정지(pivit-work PW-2549) — 결제 실패와 같은 «결제 문제로 막힘» 빨강 (기획 시안 billing-app.jsx 상태 배지)
  usage_suspended: { color: T.red, bg: T.redBg },
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
    usage_suspended: '이용 정지',
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
  // 미납 유예가 지나 유료 기능이 잠겼을 때(screen-billing-overview.policy.md §3 「유예 만료(잠금)」).
  lockedTitle: '유료 기능이 잠금되었습니다 — 결제수단 갱신 필요',
  lockedDesc: '결제수단을 갱신해 결제가 되면 다시 쓸 수 있습니다. (데이터는 보존됩니다)',
  // 잠겨도 데이터는 내보낼 수 있다(같은 정책서 행 「데이터 export 링크는 유지」 · PW-1618).
  // 화살표는 문구가 아니라 아이콘으로 붙인다 — 번역 문구 끝의 기호는 앱 검사가 막는다.
  lockedExportLink: '구성원 명부 내보내기',

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
  // 수습도 좌석으로 센다(PW-1348) — 「재직」만 쓰면 수습이 빠지는 것처럼 읽힌다 (PW-1949).
  seatAutoNote: '좌석은 재직·수습 구성원 수로 자동 산정됩니다. 구성원 초대·비활성으로 조정 → 다음 청구일 반영.',
  manageMembers: '구성원 관리 →',

  nextBillingLabel: '다음 청구',
  // ── 요금제 변경 뒤의 다음 청구 · 업그레이드 철회 (pivit-work PW-2475 · screen-billing-overview §2·§4 ⓒ) ──
  nextBillingSubScheduledAnnual: (date, seats, price) => `${date} · ${seats}좌석 × ${won(price)} × 12개월(연간)`,
  nextBillingSubScheduledMonthly: (date, seats, price) => `${date} · ${seats}좌석 × ${won(price)}(월간)`,
  carriedDiffLine: (from, to, changedOn, days, amount) =>
    `+ 요금제 변경 차액 ${from} → ${to} · ${changedOn} ${days}일분 ${won(amount)}`,
  scheduledNote: (toAnnual) => (toAnnual
    ? '청구 주기 변경 예약 — 이 청구부터 연간 결제로 바뀝니다(1년분 선결제)'
    : '청구 주기 변경 예약 — 이 청구부터 월간 결제로 바뀝니다'),
  scheduledAutoPayAnnual: (date, month, day) => `${date}부터 매년 ${month}월 ${day}일 자동 결제`,
  scheduledAutoPayMonthly: (date, day) => `${date}부터 매월 ${day}일 자동 결제`,
  withdrawHoldNote: '환불 처리 중 — 끝날 때까지 정기결제를 하지 않습니다',
  withdrawingTitle: '업그레이드 철회를 처리하고 있습니다',
  withdrawingDesc: (amount, from, current) =>
    `차액 환불(${won(amount)})이 끝나면 ${from}로 돌아갑니다. 그때까지 ${current}를 그대로 쓰실 수 있습니다.`,
  withdrawFailedTitle: '환불이 처리되지 않았습니다',
  withdrawFailedDesc: (current) => `운영팀이 연락드립니다. 환불이 끝날 때까지 ${current}가 유지됩니다.`,
  withdrawTitle: '업그레이드 철회 · 차액 환불',
  withdrawDescPaid: (from, to, amount) => `${from} → ${to}로 올린 차액 ${won(amount)} 전액을 돌려드리고 ${from}로 돌아갑니다.`,
  withdrawDescCarried: (amount, from) => `다음 청구서의 차액 ${won(amount)} 줄을 지웁니다. ${from}로 돌아갑니다.`,
  withdrawDescTail: (date) =>
    ` 구독은 해지되지 않으며 다음 청구일(${date})과 청구 기준일은 그대로입니다. 구독을 끝내시려면 돌아간 뒤 기간말 해지를 고르세요.`,
  withdrawActionPaid: (amount) => `업그레이드 철회하고 ${won(amount)} 환불`,
  withdrawAction: '업그레이드 철회',
  withdrawBusy: '처리하는 중...',
  withdrawLoading: '업그레이드를 철회할 수 있는지 확인하는 중...',
  // 즉시 해지·환불이 끝나지 않은 동안의 띠 (pivit-work PW-2476 · overview §2 «환불 처리 중 띠») — 구독은 환불이 «완료»될 때 해지된다.
  // 고객지원으로 받은 청약철회 요청 — 확정 대기 (pivit-work PW-2532 · overview §4 · cancellation-refund-policy §4.2).
  coolingOffTitle: '청약철회를 확정해 주세요',
  coolingOffDesc: (received, confirmBy, amount, paidTotal) =>
    amount < paidTotal
      ? `${received}에 받은 요청입니다. ${confirmBy}까지 [확정]을 누르시면 결제 금액 ${won(paidTotal)} 중 아직 돌려드리지 않은 ${won(amount)}을 환불하고 Free 로 바뀝니다. 확정하지 않으면 기간말 해지만 남습니다.`
      : `${received}에 받은 요청입니다. ${confirmBy}까지 [확정]을 누르시면 결제 금액 ${won(amount)}을 전액 환불하고 Free 로 바뀝니다. 확정하지 않으면 기간말 해지만 남습니다.`,
  coolingOffAction: '확정',
  coolingOffModalTitle: '청약철회 확정',
  coolingOffReceivedLabel: '접수 시각',
  coolingOffRequesterLabel: '요청자',
  coolingOffAmountLabel: '환불 금액',
  coolingOffAmountValue: (amount, paidTotal) =>
    amount < paidTotal
      ? `${won(amount)} (결제 금액 ${won(paidTotal)} 중 남은 금액 · VAT 포함)`
      : `${won(amount)} (결제 금액 전액 · VAT 포함)`,
  coolingOffConfirmByLabel: '확정 기한',
  coolingOffConfirmByValue: (confirmBy) => `${confirmBy}까지`,
  coolingOffNote: '확정하면 접수 시각을 기준으로 다시 판정해 결제 금액을 환불합니다. 환불이 끝나면 구독이 해지되고 Free 로 바뀝니다. 확정하지 않으면 기간말 해지만 남습니다.',
  coolingOffSubmit: (amount) => `확정하고 ${won(amount)} 환불`,
  // 즉시 해지·환불이 끝나지 않은 동안의 띠 (pivit-work PW-2476 · overview §2 «환불 처리 중 띠») — 구독은 환불이 «완료»될 때 해지된다.
  cancelRefundProcessingTitle: '즉시 해지·환불을 처리하고 있습니다',
  cancelRefundProcessingDesc: (amount) =>
    `환불(${won(amount)})이 끝나면 구독이 해지되고 Free 로 바뀝니다. 그때까지 지금 요금제를 그대로 쓰실 수 있고, 정기결제는 하지 않습니다.`,
  cancelRefundFailedTitle: '환불이 처리되지 않았습니다',
  cancelRefundFailedDesc: '운영팀이 연락드립니다. 환불이 끝날 때까지 구독은 그대로 유지됩니다.',
  cancelRefundHoldNote: '환불 처리 중 — 끝날 때까지 정기결제를 하지 않습니다',
  refundBusy: '처리하는 중...',
  refundLineSubscription: '구독 결제',
  refundLinePlanChange: '요금제 변경 차액 결제',
  // 연간은 다음 갱신 때 1년분이 나간다 — 금액이 1년분이니 줄도 개월 수를 말한다 (PW-757).
  // 날짜를 모르면(첫 결제 전 등) 날짜 없이 — «null ·»이 찍히지 않게 (pivit-work PW-2476).
  nextBillingSub: (date, seats, price, months = 1) =>
    `${date ? `${date} · ` : ''}${seats}좌석 × ${won(price)}${months > 1 ? ` × ${months}개월` : ''}`,
  methodLabel: '기본 결제수단',
  methodDisplay: (brand, last4) => `${brand} ···· ${last4}`,
  methodExp: (exp) => `유효기간 ${exp}`,
  noMethod: '등록된 결제수단 없음',
  // 결제수단이 없을 때 등록으로 가는 버튼과, 구독 중이면 다음 청구가 실패한다는 안내(§3·§7).
  registerMethod: '결제수단 등록',
  noMethodNextFail: '다음 청구일에 결제가 실패합니다. 그 전에 결제수단을 등록해 주세요.',
  // 첫 청구 주기 배지(§2) — 첫 정기결제까지 남은 날과 정기결제일.
  firstCycleBadge: (daysLeft, anchorDay) =>
    `첫 청구 주기 · ${daysLeft}일 후 ${anchorDay}일 첫 정기결제`,
  // 정기결제일 안내(§7 「앵커일 계산 표시」) — 29~31일이면 그날이 없는 달은 말일.
  anchorNote: (anchorDay) =>
    anchorDay >= 29
      ? `매월 ${anchorDay}일(해당 일자가 없는 달은 말일)`
      : `매월 ${anchorDay}일`,

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

  arrearsTitle: '결제되지 않은 청구서가 있습니다',
  arrearsDesc: (billedOn, amount) =>
    `${billedOn} 청구 ${won(amount)}(부가세 포함)이 아직 결제되지 않았습니다. 유료 요금제를 다시 쓰시려면 먼저 이 금액을 결제해 주세요.`,
  arrearsNoPerm: '결제 권한이 없습니다 — 결제 담당자에게 문의하세요.',
  arrearsAction: '미납 결제',
  pastDueNewAnchorNote: '결제하신 날이 새 청구일이 되고, 그 전에는 새 청구가 없습니다',
  // 미납(past_due) 해지 — 환불 대상 결제가 없어 무환불 즉시 해지 하나만 있다
  // (screen-billing-overview.policy.md §7 · cancellation-refund-policy.md §10 · PW-1619).
  pastDueCancelTitle: '해지',
  pastDueCancelBadge: '(환불 없음)',
  pastDueCancelDesc: (planLabel) =>
    `결제가 밀려 있어 환불은 없습니다. 누르면 바로 ${planLabel} 구독이 끝나고 Free로 전환됩니다. 데이터는 보존됩니다.`,
  pastDueCancelAction: '해지하기',

  refundTitle: '즉시 해지 + 환불',
  refundCoolingDesc: '결제 후 7일 이내·유료기능 미사용 — 청약철회로 전액 환불됩니다.',
  // 청약철회 기한(cancellation-refund-policy.md §10 「철회 가능 기한 D-n」). 마지막 날이면 D-0 대신 「오늘까지」.
  refundCoolingDeadline: (daysLeft, lastDate) =>
    daysLeft > 0
      ? `철회 가능 기한 D-${daysLeft} (${lastDate}까지)`
      : `철회 가능 기한 오늘까지 (${lastDate})`,
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

  // ── 베타 출시 혜택 · 요금 인상 동의 (pivit-work PW-2360 · spec-billing §2.7.3-A · §3.2-D) ──
  launchBenefitTag: (until) => ` · 베타 출시 혜택 · ${until}까지`,
  // 끝 구절 — 동의하지 않으면 이용 정지 (pivit-work PW-2549 · overview «베타 출시 혜택 표시» 행)
  launchBenefitAfter: (price) => `그 뒤 좌석당 ${won(price)} / 월 — 바뀌기 30일 전에 동의를 여쭙니다 · 동의하지 않으시면 혜택이 끝난 뒤 첫 결제일부터 이용이 정지됩니다(기록 보기 · 결제는 됩니다).`,
  priceChangeTitle: '요금 변경 안내 — 동의가 필요합니다',
  priceChangeReason: (date) => `베타 출시 혜택 단가 기간이 ${date}에 끝납니다.`,
  priceChangeBody: (planLabel, chargeDate, oldPrice, newPrice) =>
    `${planLabel} 좌석 단가가 ${chargeDate} 결제부터 ${won(oldPrice)}→${won(newPrice)}/월로 바뀝니다. 동의하지도 해지하지도 않으시면 ${chargeDate}부터 서비스 이용이 정지됩니다.`,
  priceChangeAction: '변경 내용 확인',
  priceChangeNoPerm: '동의는 결제 권한자만 할 수 있습니다 — 결제 담당자에게 문의하세요.',
  priceChangeConsentedTitle: (chargeDate, newPrice) =>
    `요금 변경에 동의했습니다 — ${chargeDate} 결제부터 좌석당 ${won(newPrice)}`,
  priceChangeModalTitle: '요금 변경 내용 확인',
  priceChangeWhenLabel: '적용 시점',
  priceChangeWhenValue: (chargeDate) => `${chargeDate} 정기결제부터`,
  priceChangePriceLabel: '좌석 단가',
  priceChangePriceValue: (oldPrice, newPrice) => `${won(oldPrice)} → ${won(newPrice)} / 월`,
  priceChangeEstimateLabel: '예상 결제 금액',
  priceChangeEstimateValue: (amount, seats) => `${won(amount)} / 월 (VAT 별도 · 지금 ${seats}좌석 기준)`,
  priceChangeEstimateNote: '실제 금액은 그날 활성 좌석으로 정합니다.',
  priceChangeMethodLabel: '결제 방법',
  priceChangeMethodValue: (last4) =>
    last4 ? `등록된 결제수단(끝자리 ${last4})으로 자동 결제 · 변경 없음` : '등록된 결제수단으로 자동 결제 · 변경 없음',
  priceChangeCancelLabel: '해지',
  priceChangeCancelValue: (chargeDate) =>
    `${chargeDate} 전까지 해지할 수 있습니다. 해지하면 이번 주기가 끝난 뒤 Free 로 바뀌며, 남은 기간 환불은 해지·환불 정책을 따릅니다.`,
  // 무응답이면 인상 청구일부터 이용 정지 (pivit-work PW-2549 · overview «혜택 종료 사유 줄» 행) — 날짜를 받는다
  priceChangeNoResponse: (chargeDate) =>
    `동의하지도 해지하지도 않으시면 ${chargeDate}부터 서비스 이용이 정지됩니다. 기존 기록은 그대로 보실 수 있고, 정가로 결제하시면 바로 다시 이용하실 수 있습니다.`,
  priceChangeAgree: '변경된 요금에 동의',
  priceChangeCancelSubscription: '구독 해지',

  // ── 이용 정지 · 해지 신청 (pivit-work PW-2549·PW-2550 · screen-billing-overview «이용 정지 배너»·«해지 신청» 행) ──
  suspendedSeatPrice: '결제된 기간 없음',
  suspendedTitle: '서비스 이용이 정지되었습니다 — 기존 기록은 보실 수 있습니다',
  suspendedDesc: (since) =>
    `베타 출시 혜택이 끝나 요금 변경에 동의하지 않으셔서 ${since}부터 정지되었습니다. 유료 요금제를 정가로 결제하시면 그 순간 다시 이용하시고, 결제한 날이 새 청구일이 됩니다. 해지를 원하시면 [해지 신청]을 눌러 주세요 — 운영팀이 확인한 뒤 해지됩니다.`,
  suspendedNoPerm: '결제 권한이 없습니다 — 결제 담당자(Owner·billing_admin)에게 문의하세요.',
  suspendedContactSupport: '고객지원 문의',
  suspendedRequestCancel: '해지 신청',
  suspendedPay: '결제하고 다시 이용하기',
  cancelRequestPendingTitle: (date) => `해지 신청을 받았습니다 · ${date}`,
  cancelRequestPendingDesc:
    '운영팀이 확인하고 있습니다. 인정되면 Free 플랜으로 바뀌고 메일로 알려 드립니다. 그 전까지는 지금처럼 기록 보기와 결제만 됩니다.',
  cancelRequestWithdraw: '해지 신청 취소',
  cancelRequestRejectedTitle: (reason) => `해지 신청이 반려되었습니다 — ${reason}`,
  cancelRequestRejectedDesc: '궁금한 점은 고객지원으로 문의해 주세요. 다시 신청하실 수 있습니다.',
  cancelRequestModalTitle: '해지를 신청하시겠습니까?',
  cancelRequestModalBody:
    '해지가 인정되면 유료 구독이 끝나고 Free 플랜으로 바뀝니다. 기록은 그대로 남고, 구성원이 5명을 넘으면 새 구성원을 추가할 수 없습니다. 전자결재 · 휴가 패키지는 이미 꺼져 있습니다.',
  cancelRequestModalNote: '운영팀이 확인한 뒤 인정되면 메일로 알려 드립니다. 정산은 신청하신 날의 달을 기준으로 정합니다.',
  cancelRequestReasonLabel: '해지 사유 (선택)',
  cancelRequestSubmit: '해지 신청',
  cancelRequestWithdrawTitle: '해지 신청을 취소하시겠습니까?',
  cancelRequestWithdrawBody: '서비스는 계속 정지된 상태입니다.',
  cancelRequestWithdrawSubmit: '신청 취소',
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

/**
 * 이번 달 사용량 배너 한 장 — 녹음 풀(PW-1023)과 유료 AI 실행(PW-2191)이 같은 모양을 쓴다.
 * `banner` 가 없으면 그리지 않는다.
 */
function UsageBanner({ banner, canEdit, testId }) {
  if (!banner) return null;
  return (
    <Card style={{ marginBottom: 16, background: T.amberBg, border: '1px solid #FDE68A',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
      <div data-testid={testId} role="status">
        <div style={{ fontWeight: 800, color: '#B45309', marginBottom: 4 }}>{banner.title}</div>
        <div style={{ fontSize: 13, color: T.text }}>{banner.body}</div>
        {!canEdit && banner.noPermText && (
          <div style={{ fontSize: 12, color: T.sub, marginTop: 6 }}>
            {banner.noPermText}
          </div>
        )}
      </div>
      {banner.actionLabel && (
        // 버튼 글자가 두 줄로 꺾이지 않게 — 띠 본문이 길어도 버튼 폭을 지킨다 (PW-2360).
        <div style={{ flex: 'none', whiteSpace: 'nowrap' }}>
          <Btn kind={banner.actionKind === 'secondary' ? 'secondary' : 'primary'}
            onClick={banner.onAction} disabled={!canEdit}>
            {banner.actionLabel}
          </Btn>
        </div>
      )}
    </Card>
  );
}

export default function BillingOverviewCanvas({
  /** 제목 바로 오른쪽 «?» 튜토리얼 도움말 버튼 (pivit-work PW-2567). 안 주면 지금과 같다. */
  titleHelp,
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
  /** 미납이 남은 해지 회사 (pivit-work PW-2526) — `{ billedOn, amount }`. 있으면 미납 띠 + [업그레이드] 자리에 [미납 결제]. */
  arrears = null,
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
   * 유료 AI 실행 배너 (PW-2191 · screen-billing-overview.policy.md 「유료 AI 실행 배너」 행).
   * Starter·Growth 회사가 이번 달 AI 실행 횟수를 80% 이상 썼거나 다 썼을 때만 채운다.
   * 모양·필드는 `recordingBanner` 와 같고, 둘 다 있으면 녹음 → AI 순으로 쌓는다.
   */
  aiRunsBanner = null,
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
  /**
   * 잠금 배너의 「구성원 명부 내보내기 →」 (PW-1618). 잠겨도 열리는 구성원 설정의
   * 명부 내보내기로 보낸다. 넘기지 않으면 링크를 그리지 않는다. 갱신 권한과 무관하게
   * 보인다 — 내보내기는 결제 담당이 아니어도 할 수 있다.
   */
  onNavigateExport,
  onNavigateHistory,
  onUndoCancel,
  onCancelPeriodEnd,
  onCancelRefund,
  /**
   * 고객지원으로 받은 청약철회 요청이 고객의 답을 기다린다 (pivit-work PW-2532).
   * `{ receivedAt, requesterName, confirmBy, amount, paidTotal }` — 표시용 글자는 앱이 만들어 넘긴다.
   */
  coolingOffRequest = null,
  /** [확정] — 약속을 돌려준다. 거부하면 창을 연 채 둔다. */
  onConfirmCoolingOff,
  /** 미납(past_due) 구독의 무환불 즉시 해지 (PW-1619). 해지 창이 미납일 때 이것 하나만 보인다. */
  onCancelPastDue,
  /**
   * 베타 출시 혜택 단가 줄 (pivit-work PW-2360 · screen-billing-overview «(출시 혜택)» 행). 유료 정가 월간 구독이
   * 혜택 기간 안이고 보유 단가가 월간 정가보다 낮을 때만 앱이 채운다. `{ until: 'YYYY-MM-DD', monthlyListPrice }`
   */
  launchBenefit = null,
  /**
   * 요금 인상 통지 (PW-2360 · «(PW-1426)» 띠·동의 창 행). 띠를 보일 때만 앱이 채운다.
   * `{ planLabel, chargeDate, benefitEndDate | null, oldUnitPrice, newUnitPrice, consented, estimatedAmount }`
   * 동의 창은 앱이 연다(`priceChangeOpen`) — 메일 링크(`?priceChange=`)로 와도 같은 창이 열린다.
   */
  priceChange = null,
  /**
   * 즉시 해지·환불이 끝나지 않았다 `{ status: 'processing' | 'failed', amount }` (pivit-work PW-2476) — 처리 중 앰버·실패 빨강 띠,
   * 버튼·정가 인상 띠 숨김, 다음 청구 카드 보류 줄. 없으면 null.
   */
  cancelRefund = null,
  priceChangeOpen = false,
  priceChangeSaving = false,
  onOpenPriceChange,
  onClosePriceChange,
  /** [변경된 요금에 동의] — 창 본문에 보인 글을 그대로 넘긴다(서버가 «그때 보인 문안»으로 남긴다). */
  onConsentPriceChange,
  /**
   * 요금제 변경 뒤의 상태 (pivit-work PW-2475 · 서버 구독 응답 값 그대로) —
   * `{ scheduled: { interval: 'annual'|'monthly', seatPrice } | null,
   *    carriedDiff: { from, to, changedOn, days, amount } | null,
   *    withdrawal: { status: 'processing'|'failed', amount, fromPlanLabel } | null }`.
   * `scheduled` 면 「다음 청구」를 새 주기 1기간분으로 말하고(금액 `periodAmount` 는 서버가 이미 새 주기·넘어간 차액 합계),
   * `withdrawal` 이면 업그레이드 철회 처리 중·실패 띠를 그리고 [업그레이드]·[좌석·플랜 변경]·[구독 해지]·요금 변경 띠를 숨긴다.
   */
  planChange = null,
  /** 해지 창 견적(환불·업그레이드 철회)을 아직 받는 중 — ⓒ 자리에 불러오는 중 표시 (overview §5). */
  refundQuoteLoading = false,
  /**
   * [업그레이드 철회] — 약속을 돌려준다. 성공하면 창을 닫고, 거부하면 창을 연 채 둔다(앱이 토스트·사유를 띄운다).
   * 사유(조건이 깨짐)는 `withdrawBlockedMessage` 로 받는다.
   */
  onWithdrawUpgrade,
  withdrawBlockedMessage = null,
  /**
   * 이용 정지 (pivit-work PW-2549 · overview «이용 정지 배너»·«정지 중 플랜 카드» 행) — 구독이 «이용 정지»일 때만 앱이
   * `{ since: 'YYYY-MM-DD' }`(정지된 날)를 넘긴다. 있으면 빨간 정지 배너, 상태 배지 «이용 정지», 단가 줄 «결제된 기간 없음»,
   * 「다음 청구」 카드와 [업그레이드]·[좌석·플랜 변경]·[결제수단 갱신]·[구독 해지]를 그리지 않는다. 결제는 배너의
   * [결제하고 다시 이용하기](`onNavigatePlans`) 하나다.
   */
  suspension = null,
  /**
   * 이용 정지 회사의 해지 신청 (pivit-work PW-2550) — 서버 구독 응답 그대로 `{ status: 'pending' | 'rejected', requestedAt, rejectReason }`
   * 또는 `null`. 접수됨이면 앰버 카드 + [해지 신청 취소]·배너의 [해지 신청] 감춤, 반려됨이면 빨간 테두리 카드.
   */
  cancellationRequest = null,
  /** 해지 신청 상태를 못 불러왔다 — 카드를 그리지 않고 배너의 [해지 신청]을 잠근다(상태를 모른 채 두 번 받지 않는다). */
  cancellationRequestUnavailable = false,
  /** 해지 사유 글자 수 상한 — 앱이 서버와 같은 한도를 넘긴다. */
  cancellationReasonMaxLength,
  /** [고객지원 문의] — 앱이 문의하기 화면으로 보낸다. */
  onContactSupport,
  /** 해지 신청 창의 [해지 신청] `(reason) => Promise` — 끝나면 창을 닫고, 거부(throw)하면 창을 연 채 버튼만 돌아온다. */
  onRequestCancellation,
  /** 신청 취소 창의 [신청 취소] `() => Promise` — 위와 같다. */
  onWithdrawCancellationRequest,
}) {
  const labels = mergeLabels(providedLabels);
  const [cancelOpen, setCancelOpen] = useState(false); // 해지 방식 선택 모달
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const [refundBusy, setRefundBusy] = useState(false);
  const [coolingOffOpen, setCoolingOffOpen] = useState(false);
  const [coolingOffBusy, setCoolingOffBusy] = useState(false);
  const priceChangeBodyRef = useRef(null);
  // 해지 신청 창 (PW-2550) — 'request' | 'withdraw' | null
  const [cancelReqModal, setCancelReqModal] = useState(null);
  const [cancelReqReason, setCancelReqReason] = useState('');
  const [cancelReqBusy, setCancelReqBusy] = useState(false);

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
  // 즉시 해지·환불 (overview §5 · PW-2476) — 진행 중엔 다시 못 누르고(환불은 1건), 요청이 실패하면 창을 연 채 버튼만 돌아온다.
  // 앱이 약속을 돌려주지 않으면(옛 연결) 종전처럼 바로 닫는다.
  const handleRefund = async () => {
    if (refundBusy) return;
    setRefundBusy(true);
    try {
      await onCancelRefund?.();
      setCancelOpen(false);
    } catch {
      /* 앱이 오류 토스트를 띄운다 — 창은 그대로 */
    } finally {
      setRefundBusy(false);
    }
  };
  const handlePastDue = () => { setCancelOpen(false); onCancelPastDue?.(); };
  // 업그레이드 철회 (PW-2475 · overview §4 ⓒ · §5) — 진행 중엔 다시 못 누르고(환불은 1건), 실패하면 창을 연 채 둔다.
  const handleWithdraw = async () => {
    if (withdrawBusy || !onWithdrawUpgrade) return;
    setWithdrawBusy(true);
    try {
      await onWithdrawUpgrade();
      setCancelOpen(false);
    } catch {
      /* 앱이 토스트·사유를 띄운다 — 창은 그대로 */
    } finally {
      setWithdrawBusy(false);
    }
  };
  // 청약철회 확정 (PW-2532) — 진행 중엔 다시 못 누르고(환불은 1건), 실패하면 창을 연 채 둔다.
  const handleConfirmCoolingOff = async () => {
    if (coolingOffBusy) return;
    setCoolingOffBusy(true);
    try {
      await onConfirmCoolingOff?.();
      setCoolingOffOpen(false);
    } catch {
      /* 앱이 토스트를 띄운다 — 창은 그대로 */
    } finally {
      setCoolingOffBusy(false);
    }
  };
  const withdrawal = planChange?.withdrawal ?? null;
  // 즉시 해지·환불이 끝나지 않았다 (PW-2476 · overview §2) — 구독은 «구독 중» 그대로, 해지가 이미 요청된 구독이라 해지 예약과
  // 같이 다룬다: [업그레이드]·[좌석·플랜 변경]·[구독 해지]·정가 인상 안내 띠를 그리지 않는다. 업그레이드 철회와 같은 자리다.
  const refundOpen = cancelRefund && (sub.status === 'active' || sub.status === 'past_due') ? cancelRefund : null;
  const holding = Boolean(withdrawal || refundOpen);
  const coolingOff = coolingOffRequest && sub.status === 'active' && sub.cancelAtPeriodEnd && !refundOpen ? coolingOffRequest : null;
  // Free 요금제는 상태가 «이용 중»으로 와도 청구가 없다 — 다음 청구·결제수단 칸, 해지·좌석 변경을 그리지 않는다
  // (기획 시안의 Free 는 그 칸들이 없다 · overview §2 «다음 청구일» 행 Free 제외 · pivit-work PW-2476).
  const isFree = sub.planCode === 'free';
  const scheduled = sub.status === 'active' ? (planChange?.scheduled ?? null) : null;
  const carriedDiff = sub.status === 'active' && !sub.cancelAtPeriodEnd ? (planChange?.carriedDiff ?? null) : null;
  const withdrawQuote = quote.upgradeWithdrawal ?? null;
  const [, nextMonth, nextDate] = sub.nextBillingAt
    ? String(sub.nextBillingAt).split('-').map(Number)
    : [0, 0, 0];
  // 미납이어도 해지는 된다 — 환불 없이 바로 끝난다(PW-1619). 기간말 예약은 미납 구독에선
  // 기간이 끝나도 닫히지 않아 고르지 못하게 한다.
  const pastDue = sub.status === 'past_due';
  // 업그레이드 철회가 끝나지 않은 동안은 요금제가 곧 바뀌는 구독이라 해지·변경 버튼을 숨긴다(overview §2 · PW-2475).
  // 조회 전용(hr_admin)에게도 숨기지 않고 비활성으로 보인다 — 다른 편집 버튼과 같다(overview §2 «hr_admin 처리» · §6 · PW-2476).
  const showCancel = !holding && !isFree && ((sub.status === 'active' && !sub.cancelAtPeriodEnd) || pastDue);
  // 이용 정지 (PW-2549·PW-2550) — 상태를 못 불러왔으면 신청 카드를 그리지 않는다.
  const suspended = Boolean(suspension);
  const cancelReqKnown = suspended && !cancellationRequestUnavailable;
  const cancelReqPending = cancelReqKnown && cancellationRequest?.status === 'pending';
  const cancelReqRejected = cancelReqKnown && cancellationRequest?.status === 'rejected';
  // 창의 [해지 신청]·[신청 취소] — 도는 동안 다시 못 누르고, 앱이 거부하면 창을 연 채 버튼만 돌아온다.
  const runCancelRequest = async (action) => {
    if (cancelReqBusy || !action) return;
    setCancelReqBusy(true);
    try {
      await action();
      setCancelReqModal(null);
    } catch {
      /* 앱이 토스트를 띄운다 — 창은 그대로 */
    } finally {
      setCancelReqBusy(false);
    }
  };

  return (
    <div style={{ fontFamily: T.font, background: T.bg, minHeight: '100vh', padding: 32, color: T.text }}>
      <div style={{ maxWidth: 880, margin: '0 auto' }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h1 className={titleHelp ? 'tvh-title-row' : undefined} style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{labels.pageTitle}{titleHelp}</h1>
          {!canEdit && <Badge color={T.sub} bg={T.bl}>{labels.viewOnly}</Badge>}
        </div>
        <p style={{ color: T.sub, fontSize: 14, marginTop: 0, marginBottom: 24 }}>
          {labels.pageSubtitle}
        </p>

        {/* 이용 정지 배너 (pivit-work PW-2549·PW-2550 · overview «이용 정지 배너» 행) — Dunning 배너와 같은 빨간 Card.
            버튼 순서는 기획 시안대로 [고객지원 문의] · [해지 신청](접수 중이면 감춤 · 결제 권한 없음·상태 모름이면 잠금) · [결제하고 다시 이용하기] */}
        {suspended && (
          <Card style={{ marginBottom: 'var(--spacing-xl)', background: T.redBg, border: '1px solid var(--utility-error-300)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--spacing-xl)' }}>
            <div data-testid="billing-suspended-banner" role="status">
              <div style={{ fontWeight: 800, color: T.red, marginBottom: 'var(--spacing-xs)' }}>{labels.suspendedTitle}</div>
              <div style={{ fontSize: 13, color: T.text }}>{labels.suspendedDesc(suspension.since)}</div>
              {!canEdit && (
                <div style={{ fontSize: 12, color: T.sub, marginTop: 'var(--spacing-sm)' }}>{labels.suspendedNoPerm}</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 'var(--spacing-md)', flex: 'none', whiteSpace: 'nowrap' }}>
              <Btn kind="secondary" onClick={onContactSupport}>{labels.suspendedContactSupport}</Btn>
              {!cancelReqPending && (
                <Btn kind="secondary" disabled={!canEdit || !cancelReqKnown}
                  onClick={() => { setCancelReqReason(''); setCancelReqModal('request'); }}>
                  {labels.suspendedRequestCancel}
                </Btn>
              )}
              <Btn kind="danger" onClick={onNavigatePlans} disabled={!canEdit}>{labels.suspendedPay}</Btn>
            </div>
          </Card>
        )}

        {/* 해지 신청 접수 카드 (PW-2550 · overview «해지 신청 접수 Card») — 환불 처리 중 띠와 같은 Card + 앰버 */}
        {cancelReqPending && (
          <Card style={{ marginBottom: 'var(--spacing-xl)', background: T.amberBg, border: '1px solid var(--utility-warning-200)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--spacing-xl)' }}>
            <div data-testid="billing-cancel-request-pending" role="status">
              <div style={{ fontWeight: 800, color: T.amber, marginBottom: 'var(--spacing-xs)' }}>
                {labels.cancelRequestPendingTitle(cancellationRequest.requestedAt)}
              </div>
              <div style={{ fontSize: 13, color: T.text }}>{labels.cancelRequestPendingDesc}</div>
            </div>
            <div style={{ flex: 'none', whiteSpace: 'nowrap' }}>
              <Btn kind="secondary" onClick={() => setCancelReqModal('withdraw')} disabled={!canEdit}>
                {labels.cancelRequestWithdraw}
              </Btn>
            </div>
          </Card>
        )}

        {/* 해지 신청 반려 카드 (PW-2550 · overview «해지 신청 반려 Card») — 환불 실패 띠와 같은 Card + 빨간 테두리 */}
        {cancelReqRejected && (
          <Card style={{ marginBottom: 'var(--spacing-xl)', border: '1px solid var(--utility-error-300)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--spacing-xl)' }}>
            <div data-testid="billing-cancel-request-rejected" role="status">
              <div style={{ fontWeight: 800, color: T.red, marginBottom: 'var(--spacing-xs)' }}>
                {labels.cancelRequestRejectedTitle(cancellationRequest.rejectReason ?? '')}
              </div>
              <div style={{ fontSize: 13, color: T.text }}>{labels.cancelRequestRejectedDesc}</div>
            </div>
            <div style={{ flex: 'none', whiteSpace: 'nowrap' }}>
              <Btn kind="secondary" onClick={onContactSupport}>{labels.suspendedContactSupport}</Btn>
            </div>
          </Card>
        )}

        {/* Dunning 경고 배너 */}
        {sub.status === 'past_due' && (
          <Card style={{ marginBottom: 16, background: T.redBg, border: '1px solid #FCA5A5',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
            <div>
              <div data-testid="billing-dunning-title" style={{ fontWeight: 800, color: T.red, marginBottom: 4 }}>
                {sub.locked ? labels.lockedTitle : labels.dunningTitle}
              </div>
              <div style={{ fontSize: 13, color: T.text }}>
                {sub.locked ? labels.lockedDesc : labels.dunningDesc(sub.graceUntil)}
              </div>
              {sub.locked && onNavigateExport && (
                <button type="button" data-testid="billing-locked-export" onClick={onNavigateExport}
                  style={{ background: 'none', border: 'none', color: T.accentText, fontWeight: 700,
                    fontSize: 13, cursor: 'pointer', padding: 0, marginTop: 6,
                    display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {labels.lockedExportLink}
                  <ArrowRightGlyph size={13} />
                </button>
              )}
              {!canEdit && (
                <div style={{ fontSize: 12, color: T.sub, marginTop: 6 }}>
                  {labels.dunningNoPerm}
                </div>
              )}
            </div>
            <div style={{ flex: 'none', whiteSpace: 'nowrap' }}>
              <Btn kind="danger" onClick={onNavigateMethods} disabled={!canEdit}>{labels.dunningAction}</Btn>
            </div>
          </Card>
        )}

        {/* 미납 띠 (pivit-work PW-2526) — 해지됐지만 결제되지 않은 청구서가 남음. Dunning 배너와 같은 빨간 Card */}
        {arrears && (
          <Card style={{ marginBottom: 'var(--spacing-xl)', background: T.redBg, border: '1px solid var(--utility-error-300)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--spacing-xl)' }}>
            <div data-testid="billing-arrears-band">
              <div style={{ fontWeight: 800, color: T.red, marginBottom: 'var(--spacing-xs)' }}>{labels.arrearsTitle}</div>
              <div style={{ fontSize: 13, color: T.text }}>{labels.arrearsDesc(arrears.billedOn, arrears.amount)}</div>
              {!canEdit && (
                <div style={{ fontSize: 12, color: T.sub, marginTop: 'var(--spacing-xs)' }}>{labels.arrearsNoPerm}</div>
              )}
            </div>
            <div style={{ flex: 'none', whiteSpace: 'nowrap' }}>
              <Btn kind="danger" onClick={onNavigateMethods} disabled={!canEdit}>{labels.arrearsAction}</Btn>
            </div>
          </Card>
        )}

        {/* «청약철회를 확정해 주세요» 띠 (pivit-work PW-2532 · overview §4) — 해지 예약 배너 자리 위 · 같은 Card+앰버.
            [확정]은 결제 권한자만 — 조회 전용은 띠만(다른 편집 버튼의 «비활성» 규칙과 다르다 · 정책 행 그대로) */}
        {coolingOff && (
          <Card style={{ marginBottom: 'var(--spacing-xl)', background: T.amberBg, border: '1px solid var(--colors-warning-200)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--spacing-xl)' }}>
            <div data-testid="billing-cooling-off-banner">
              <div style={{ fontWeight: 800, color: T.amber, marginBottom: 'var(--spacing-xs)' }}>{labels.coolingOffTitle}</div>
              <div style={{ fontSize: 13, color: T.text }}>
                {labels.coolingOffDesc(coolingOff.receivedAt, coolingOff.confirmBy, coolingOff.amount, coolingOff.paidTotal)}
              </div>
            </div>
            {/* 글이 길어도 버튼 글자가 세로로 접히지 않게 줄어들지 않는다. */}
            {canEdit && (
              <div style={{ flexShrink: 0 }}>
                <Btn kind="secondary" onClick={() => setCoolingOffOpen(true)}>{labels.coolingOffAction}</Btn>
              </div>
            )}
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

        {/* 업그레이드 철회 처리 중·실패 띠 (pivit-work PW-2475 · overview §2) — 해지 예약 띠와 같은 Card+앰버/빨강 · 버튼 없음 */}
        {withdrawal && (
          <Card
            style={{ marginBottom: 'var(--spacing-xl)',
              background: withdrawal.status === 'failed' ? T.redBg : T.amberBg,
              border: withdrawal.status === 'failed' ? '1px solid #FCA5A5' : '1px solid #FDE68A' }}>
            {withdrawal.status === 'failed' ? (
              <>
                <div data-testid="billing-withdrawal-failed" style={{ fontWeight: 800, color: T.red, marginBottom: 'var(--spacing-xs)' }}>{labels.withdrawFailedTitle}</div>
                <div style={{ fontSize: 13, color: T.text }}>{labels.withdrawFailedDesc(plan.label)}</div>
              </>
            ) : (
              <>
                <div data-testid="billing-withdrawal-processing" style={{ fontWeight: 800, color: T.amber, marginBottom: 'var(--spacing-xs)' }}>{labels.withdrawingTitle}</div>
                <div style={{ fontSize: 13, color: T.text }}>
                  {labels.withdrawingDesc(withdrawal.amount, withdrawal.fromPlanLabel, plan.label)}
                </div>
              </>
            )}
          </Card>
        )}

        {/* 즉시 해지·환불 처리 중·실패 띠 (pivit-work PW-2476 · overview §2) — 업그레이드 철회 띠와 같은 Card+앰버/빨강 · 버튼 없음.
            처리 중/실패는 앱이 청구 내역 환불 배지와 같은 기준으로 넘긴다 */}
        {refundOpen && (
          <Card
            style={{ marginBottom: 'var(--spacing-xl)',
              background: refundOpen.status === 'failed' ? T.redBg : T.amberBg,
              border: refundOpen.status === 'failed' ? '1px solid #FCA5A5' : '1px solid #FDE68A' }}>
            {refundOpen.status === 'failed' ? (
              <>
                <div data-testid="billing-cancel-refund-failed" style={{ fontWeight: 800, color: T.red, marginBottom: 'var(--spacing-xs)' }}>{labels.cancelRefundFailedTitle}</div>
                <div style={{ fontSize: 13, color: T.text }}>{labels.cancelRefundFailedDesc}</div>
              </>
            ) : (
              <>
                <div data-testid="billing-cancel-refund-processing" style={{ fontWeight: 800, color: T.amber, marginBottom: 'var(--spacing-xs)' }}>{labels.cancelRefundProcessingTitle}</div>
                <div style={{ fontSize: 13, color: T.text }}>{labels.cancelRefundProcessingDesc(refundOpen.amount)}</div>
              </>
            )}
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

        {/* 요금 변경 안내 띠 (PW-2360 · §3.2-D) — 동의 전 앰버(녹음 풀 띠와 같은 모양), 동의 뒤 초록 */}
        {priceChange && !priceChange.consented && !holding && (
          <UsageBanner
            banner={{
              title: labels.priceChangeTitle,
              body: `${priceChange.benefitEndDate ? `${labels.priceChangeReason(priceChange.benefitEndDate)} ` : ''}${labels.priceChangeBody(
                priceChange.planLabel, priceChange.chargeDate, priceChange.oldUnitPrice, priceChange.newUnitPrice)}`,
              actionLabel: labels.priceChangeAction,
              actionKind: 'primary',
              onAction: onOpenPriceChange,
              noPermText: labels.priceChangeNoPerm,
            }}
            canEdit={canEdit}
            testId="billing-price-change-banner"
          />
        )}
        {priceChange && priceChange.consented && !holding && (
          <Card style={{ marginBottom: 'var(--spacing-xl)', background: 'var(--bg-success-primary)', border: `1px solid ${T.green}` }}>
            <div data-testid="billing-price-change-consented" role="status"
              style={{ fontWeight: 800, color: 'var(--text-success-primary)' }}>
              {labels.priceChangeConsentedTitle(priceChange.chargeDate, priceChange.newUnitPrice)}
            </div>
          </Card>
        )}

        {/* 녹음 풀 배너 (PW-1023) — 80%·소진. 다음 달 풀이 다시 차면 사라진다 */}
        <UsageBanner banner={recordingBanner} canEdit={canEdit} testId="billing-recording-banner" />
        {/* 유료 AI 실행 배너 (PW-2191) — 녹음 배너 바로 아래, 같은 모양 */}
        <UsageBanner banner={aiRunsBanner} canEdit={canEdit} testId="billing-ai-runs-banner" />

        {/* 현재 플랜 카드 */}
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 22, fontWeight: 800 }}>{plan.label}</span>
                <Badge color={statusMeta.color} bg={statusMeta.bg}>{statusLabel}</Badge>
                {/* 청구 단가가 플랜 정가와 다른 이유를 한눈에 말한다 (PW-344 ⑤). */}
                {contract && <Badge color={T.accentText} bg="var(--bg-brand-secondary)">{labels.contractBadge}</Badge>}
                {sub.status === 'active' && sub.firstCycle && sub.anchorDay != null
                  && sub.firstCycleDaysLeft != null && (
                  <span data-testid="billing-first-cycle-badge">
                    <Badge color={T.accentText} bg="var(--bg-brand-secondary)">
                      {labels.firstCycleBadge(sub.firstCycleDaysLeft, sub.anchorDay)}
                    </Badge>
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, color: T.sub }}>
                {/* 플랜 카탈로그의 `seatPrice` 는 **시작가**이지 청구 단가가 아니다 —
                    협의 계약이면 계약 단가를 보여 준다. */}
                {sub.planCode === 'free'
                  ? labels.freeSeatPrice(plan.seatLimit)
                  : sub.status === 'trial'
                    ? labels.trialSeatPrice /* PW-1025 — 체험은 청구서를 만들지 않는다 */
                    : suspended
                      ? labels.suspendedSeatPrice /* PW-2549 — 정지는 청구서를 만들지 않는다 */
                      : labels.paidSeatPrice(contract ? contract.seatPrice : planUnitPrice)}
                {/* 베타 출시 혜택(PW-2360 · §2.7.3-A 4) — 청구 단가가 정가보다 낮은 이유와 끝난 뒤 단가 */}
                {launchBenefit && (
                  <span data-testid="billing-launch-benefit"
                    style={{ color: T.accentText, fontWeight: 700 }}>{labels.launchBenefitTag(launchBenefit.until)}</span>
                )}
              </div>
              {launchBenefit && (
                <div style={{ fontSize: 12, color: T.muted, marginTop: 'var(--spacing-xs)' }}>
                  {labels.launchBenefitAfter(launchBenefit.monthlyListPrice)}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {/* 업그레이드 CTA: 다음 티어로 (동적 플랜명) */}
              {/* 체험 중에는 체험 배너의 [결제하고 계속 쓰기]가 대신한다 (PW-1025) */}
              {upgradeTargetLabel && !holding && !suspended && !arrears && !sub.cancelAtPeriodEnd && sub.status !== 'past_due' && sub.status !== 'trial' && (
                <Btn onClick={onNavigatePlans} disabled={!canEdit}>
                  {labels.upgradeCta(upgradeTargetLabel)}
                </Btn>
              )}
              {sub.status === 'active' && !isFree && !sub.cancelAtPeriodEnd && !holding && (
                <Btn kind="secondary" onClick={onNavigatePlans} disabled={!canEdit}>{labels.changePlan}</Btn>
              )}
              {sub.status === 'past_due' && (
                <Btn onClick={onNavigateMethods} disabled={!canEdit}>{labels.updateMethod}</Btn>
              )}
              {arrears && (
                <Btn onClick={onNavigateMethods} disabled={!canEdit}>{labels.arrearsAction}</Btn>
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
            <div style={{ marginTop: 10, padding: '10px 14px', background: 'var(--bg-secondary)',
              border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 12, color: T.text,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span>
                {labels.contractRenewSoonNotice(Math.max(0, contract.daysUntilContractEnd))}
              </span>
              <button type="button" onClick={onNavigateContactSales} disabled={!canEdit}
                style={{ background: 'none', border: 'none', color: T.accentText, fontWeight: 700,
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
              style={{ background: 'none', border: 'none', color: T.accentText, fontWeight: 700,
                fontSize: 12, cursor: 'pointer', padding: 0, whiteSpace: 'nowrap' }}>
              {labels.manageMembers}
            </button>
          </div>
        </Card>

        {/* 청구 정보 (active/past_due) — 이용 정지면 결제수단 요약만 남고 「다음 청구」는 없다(청구가 없다 · PW-2549) */}
        {((sub.status === 'active' || sub.status === 'past_due') && !isFree || suspended) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {!suspended && (
            <Card>
              <div style={{ fontSize: 13, color: T.sub, marginBottom: 8 }}>{labels.nextBillingLabel}</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{won(sub.periodAmount)}</div>
              <div style={{ fontSize: 13, color: T.sub, marginTop: 4 }}>
                {/* 청구 주기 변경 예약이면 새 주기의 1기간분 — 그날 실제로 결제할 금액 (overview §2 · PW-2475) */}
                {scheduled
                  ? (scheduled.interval === 'annual'
                    ? labels.nextBillingSubScheduledAnnual(sub.nextBillingAt, scheduled.seats ?? sub.seats, scheduled.seatPrice)
                    : labels.nextBillingSubScheduledMonthly(sub.nextBillingAt, scheduled.seats ?? sub.seats, scheduled.seatPrice))
                  : labels.nextBillingSub(
                    sub.nextBillingAt,
                    contract ? contract.billedSeats : sub.seats,
                    contract ? contract.seatPrice : planUnitPrice,
                    sub.interval === 'annual' ? 12 : 1,
                  )}
              </div>
              {/* 넘어간 요금제 변경 차액 — 같은 청구서에 붙어 함께 결제된다 (위 금액에 이미 더해져 있다) */}
              {carriedDiff && (
                <div data-testid="billing-carried-diff" style={{ fontSize: 13, color: T.sub, marginTop: 'var(--spacing-xxs)' }}>
                  {labels.carriedDiffLine(carriedDiff.from, carriedDiff.to, carriedDiff.changedOn, carriedDiff.days, carriedDiff.amount)}
                </div>
              )}
              {scheduled && (
                <div data-testid="billing-scheduled-interval" style={{ fontSize: 12, color: T.amber, marginTop: 'var(--spacing-xs)' }}>
                  {labels.scheduledNote(scheduled.interval === 'annual')}
                </div>
              )}
              {/* 다음 청구일이 와 정기결제를 보류하는 동안만 (overview §2 «다음 청구일이 오면») */}
              {withdrawal?.holdingRenewal && (
                <div style={{ fontSize: 12, color: T.amber, marginTop: 'var(--spacing-xs)' }}>{labels.withdrawHoldNote}</div>
              )}
              {/* 즉시 해지·환불이 끝날 때까지 정기결제 보류 (overview §2 · §7 · PW-2476) — 기획 시안처럼 띠가 있는 동안 늘 */}
              {sub.status === 'past_due' && (
                <div data-testid="billing-past-due-anchor-note" style={{ fontSize: 12, color: T.red, marginTop: 'var(--spacing-xs)' }}>
                  {labels.pastDueNewAnchorNote}
                </div>
              )}
              {refundOpen && (
                <div data-testid="billing-cancel-refund-hold" style={{ fontSize: 12, color: T.amber, marginTop: 'var(--spacing-xs)' }}>
                  {labels.cancelRefundHoldNote}
                </div>
              )}
              {scheduled ? (
                <div data-testid="billing-anchor-note" style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
                  {scheduled.interval === 'annual'
                    ? labels.scheduledAutoPayAnnual(sub.nextBillingAt, nextMonth, nextDate)
                    : labels.scheduledAutoPayMonthly(sub.nextBillingAt, sub.anchorDay ?? nextDate)}
                </div>
              ) : sub.interval !== 'annual' && sub.anchorDay != null && (
                <div data-testid="billing-anchor-note" style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
                  {labels.anchorNote(sub.anchorDay)}
                </div>
              )}
            </Card>
            )}
            <Card>
              <div style={{ fontSize: 13, color: T.sub, marginBottom: 8 }}>{labels.methodLabel}</div>
              {sub.method ? (
                <>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>
                    {labels.methodDisplay(sub.method.brand, sub.method.last4)}
                  </div>
                  {/* 결제사가 유효기간을 안 알려 주는 카드(토스 자동결제 등록)는 exp 가 비어 온다 — 줄째 생략 */}
                  {sub.method.exp && (
                    <div style={{ fontSize: 13, color: T.sub, marginTop: 4 }}>
                      {labels.methodExp(sub.method.exp)}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ fontSize: 14, color: T.red }}>{labels.noMethod}</div>
                  {sub.status === 'active' && (
                    <div data-testid="billing-no-method-next-fail" style={{ fontSize: 12, color: T.text, marginTop: 6 }}>
                      {labels.noMethodNextFail}
                    </div>
                  )}
                  <div style={{ marginTop: 10 }}>
                    <Btn kind="secondary" onClick={onNavigateMethods} disabled={!canEdit}>
                      {labels.registerMethod}
                    </Btn>
                  </div>
                </>
              )}
            </Card>
          </div>
        )}

        {/* 하단 액션 */}
        <Card style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button type="button" onClick={onNavigateHistory}
            style={{ background: 'none', border: 'none', color: T.accentText, fontWeight: 700,
              fontSize: 14, cursor: 'pointer', padding: 0 }}>
            {labels.viewHistory}
          </button>
          {showCancel && (
            <Btn kind="danger" onClick={() => setCancelOpen(true)} disabled={!canEdit}>{labels.cancelSubscription}</Btn>
          )}
        </Card>

        {/* 해지 방식 선택 창 — 공용 창 틀(ModalShell · PW-836). 해지 두 방식의 버튼은 본문 카드 안에 산다. */}
        {cancelOpen && canEdit && (
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
              {pastDue ? (
                /* 미납 — 무환불 즉시 해지 하나만 (PW-1619) */
                <div data-testid="billing-cancel-past-due"
                  style={{ border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>
                    {labels.pastDueCancelTitle}{' '}
                    <span style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>{labels.pastDueCancelBadge}</span>
                  </div>
                  <div style={{ fontSize: 13, color: T.sub, marginBottom: 12 }}>
                    {labels.pastDueCancelDesc(plan.label)}
                  </div>
                  <Btn kind="danger" onClick={handlePastDue}>{labels.pastDueCancelAction}</Btn>
                </div>
              ) : (<>
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
                  {quote.reason === 'cooling_off' && quote.coolingOffDaysLeft != null && (
                    <div data-testid="billing-cooling-off-deadline"
                      style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 8 }}>
                      {labels.refundCoolingDeadline(quote.coolingOffDaysLeft, quote.coolingOffLastDate)}
                    </div>
                  )}
                  {/* 구독 결제 줄과 요금제 변경 차액 결제 줄 — 환불 1건, 결제마다 돌려준다 (overview §4 ⓒ 행 · PW-2475) */}
                  {Array.isArray(quote.lines) && quote.lines.length > 1 && (
                    <div data-testid="billing-refund-lines" style={{ fontSize: 13, color: T.sub, marginBottom: 'var(--spacing-md)' }}>
                      {quote.lines.map((line) => (
                        <div key={line.invoiceId} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{line.kind === 'plan_change' ? labels.refundLinePlanChange : labels.refundLineSubscription}</span>
                          <span>{won(line.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontSize: 13, color: T.text, marginBottom: 12 }}>
                    <span>{labels.expectedRefund}</span>
                    <span style={{ fontSize: 20, fontWeight: 800, color: T.green }}>{won(quote.amount)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: T.muted, marginBottom: 12 }}>
                    {labels.refundNote}
                  </div>
                  <Btn kind="danger" onClick={() => void handleRefund()} disabled={refundBusy}>
                    {refundBusy ? labels.refundBusy : labels.refundAction(quote.amount)}
                  </Btn>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: T.muted, background: T.bl,
                  borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
                  {quote.reason === 'annual_zero'
                    ? labels.annualZeroNote(quote.monthsUsed)
                    : labels.monthlyNoRefundNote}
                </div>
              )}

              {/* ⓒ 업그레이드 철회 (pivit-work PW-2475 · overview §4 ⓒ) — ⓐ 와 같은 테두리 선택지 카드 + 기존 Btn(secondary).
                  해지가 아니라 직전 요금제로 돌아가는 선택지다. 견적을 받는 동안은 불러오는 중 표시 */}
              {refundQuoteLoading ? (
                <div data-testid="billing-withdraw-loading" style={{ fontSize: 12, color: T.muted, padding: 'calc(var(--spacing-md) + var(--spacing-xxs)) 0' }}>
                  {labels.withdrawLoading}
                </div>
              ) : withdrawQuote?.eligible ? (
                <div data-testid="billing-withdraw-option"
                  style={{ border: `1px solid ${T.border}`, borderRadius: 12, padding: 'var(--spacing-xl)', marginTop: 'var(--spacing-xs)', marginBottom: 'var(--spacing-md)' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 'var(--spacing-xs)' }}>{labels.withdrawTitle}</div>
                  <div style={{ fontSize: 13, color: T.sub, marginBottom: 12 }}>
                    {withdrawQuote.paid
                      ? labels.withdrawDescPaid(withdrawQuote.fromPlanName, plan.label, withdrawQuote.amount)
                      : labels.withdrawDescCarried(withdrawQuote.carriedAmount, withdrawQuote.fromPlanName)}
                    {labels.withdrawDescTail(withdrawQuote.nextBillingDate ?? sub.nextBillingAt)}
                  </div>
                  <Btn kind="secondary" onClick={() => void handleWithdraw()} disabled={withdrawBusy}>
                    {withdrawBusy
                      ? labels.withdrawBusy
                      : withdrawQuote.paid ? labels.withdrawActionPaid(withdrawQuote.amount) : labels.withdrawAction}
                  </Btn>
                </div>
              ) : null}
              {withdrawBlockedMessage && (
                <div data-testid="billing-withdraw-blocked" style={{ fontSize: 12, color: T.red, background: T.redBg,
                  borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
                  {withdrawBlockedMessage}
                </div>
              )}
              </>)}
            </div>
          </ModalShell>
        )}

        {/* 청약철회 확정 창 (pivit-work PW-2532 · cancellation-refund-policy §4.2 ⑤) — 해지 창과 같은 공용 틀 */}
        {coolingOff && coolingOffOpen && canEdit && (
          <ModalShell
            title={labels.coolingOffModalTitle}
            description={labels.cancelModalSub(plan.label, sub.seats, sub.interval)}
            titleId="billing-cooling-off-title"
            closeLabel={labels.close}
            onClose={() => setCoolingOffOpen(false)}
            zIndex={1000}
            className="adm-shell"
            testId="billing-cooling-off-modal"
            footer={<>
              <button type="button" className="tl-group-modal-btn tl-group-modal-btn-secondary"
                onClick={() => setCoolingOffOpen(false)}>
                {labels.close}
              </button>
              <Btn kind="danger" onClick={() => void handleConfirmCoolingOff()} disabled={coolingOffBusy}>
                {coolingOffBusy ? labels.refundBusy : labels.coolingOffSubmit(coolingOff.amount)}
              </Btn>
            </>}
          >
            <div style={{ fontFamily: T.font }}>
              {[
                [labels.coolingOffReceivedLabel, coolingOff.receivedAt],
                [labels.coolingOffRequesterLabel, coolingOff.requesterName],
                [labels.coolingOffAmountLabel, labels.coolingOffAmountValue(coolingOff.amount, coolingOff.paidTotal)],
                [labels.coolingOffConfirmByLabel, labels.coolingOffConfirmByValue(coolingOff.confirmBy)],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', gap: 'var(--spacing-lg)', fontSize: 13,
                  padding: 'var(--spacing-md) 0', borderBottom: `1px solid ${T.border}` }}>
                  <span style={{ width: 96, flexShrink: 0, color: T.sub }}>{k}</span>
                  <span style={{ color: T.text }}>{v}</span>
                </div>
              ))}
              <div style={{ fontSize: 12, color: T.sub, background: T.bl, borderRadius: 10,
                padding: 'var(--spacing-md) var(--spacing-lg)', marginTop: 'var(--spacing-lg)' }}>
                {labels.coolingOffNote}
              </div>
            </div>
          </ModalShell>
        )}

        {/* 요금 변경 동의 창 (PW-2360 · «(PW-1426)» 동의 창 행) — 해지 창과 같은 공용 틀. 법이 고지하라는 넷
            (적용 시점 · 전후 단가 · 결제 방법 · 해지 조건)과 예상 금액, 무응답이면 인상 청구일부터 이용 정지라는 문장(PW-2549) */}
        {priceChange && priceChangeOpen && canEdit && (
          <ModalShell
            title={labels.priceChangeModalTitle}
            titleId="billing-price-change-title"
            closeLabel={labels.close}
            onClose={onClosePriceChange}
            zIndex={1000}
            className="adm-shell is-wide"
            testId="billing-price-change-modal"
            footer={<>
              <button type="button" className="tl-group-modal-btn tl-group-modal-btn-secondary"
                style={{ whiteSpace: 'nowrap' }}
                onClick={onClosePriceChange}>
                {labels.close}
              </button>
              {showCancel && canEdit && (
                <button type="button" className="tl-group-modal-btn tl-group-modal-btn-secondary"
                  style={{ whiteSpace: 'nowrap' }}
                  data-testid="billing-price-change-cancel"
                  onClick={() => { onClosePriceChange?.(); setCancelOpen(true); }}>
                  {labels.priceChangeCancelSubscription}
                </button>
              )}
              <Button className="tl-group-modal-btn tl-group-modal-btn-primary"
                style={{ whiteSpace: 'nowrap' }}
                data-testid="billing-price-change-agree" pending={priceChangeSaving}
                onClick={() => onConsentPriceChange?.(priceChangeBodyRef.current?.innerText ?? '')}>
                {labels.priceChangeAgree}
              </Button>
            </>}
          >
            <div ref={priceChangeBodyRef} style={{ fontFamily: T.font, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              {priceChange.benefitEndDate && (
                <div style={{ fontSize: 13, color: T.text, fontWeight: 700 }}>
                  {labels.priceChangeReason(priceChange.benefitEndDate)}
                </div>
              )}
              {[
                [labels.priceChangeWhenLabel, labels.priceChangeWhenValue(priceChange.chargeDate)],
                [labels.priceChangePriceLabel, labels.priceChangePriceValue(priceChange.oldUnitPrice, priceChange.newUnitPrice)],
                [labels.priceChangeEstimateLabel, labels.priceChangeEstimateValue(priceChange.estimatedAmount, sub.seats),
                  labels.priceChangeEstimateNote],
                [labels.priceChangeMethodLabel, labels.priceChangeMethodValue(sub.method?.last4)],
                [labels.priceChangeCancelLabel, labels.priceChangeCancelValue(priceChange.chargeDate)],
              ].map(([label, value, note]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--spacing-xl)', fontSize: 13 }}>
                  <span style={{ color: T.sub, flex: 'none' }}>{label}</span>
                  <span style={{ color: T.text, fontWeight: 600, textAlign: 'right' }}>
                    {value}
                    {/* 예상 금액의 단서는 그 줄 바로 아래에 (PW-2360) */}
                    {note && <span style={{ display: 'block', fontSize: 12, fontWeight: 400, color: T.muted }}>{note}</span>}
                  </span>
                </div>
              ))}
              <div style={{ fontSize: 13, color: T.text, background: T.bl, borderRadius: 10,
                padding: 'var(--spacing-md) var(--spacing-lg)' }}>
                {typeof labels.priceChangeNoResponse === 'function'
                  ? labels.priceChangeNoResponse(priceChange.chargeDate)
                  : labels.priceChangeNoResponse}
              </div>
            </div>
          </ModalShell>
        )}

        {/* 해지 신청 확인 창 · 신청 취소 확인 창 (pivit-work PW-2550 · overview «해지 신청 확인 창» 행 · §4) — 해지 방식 선택 창과 같은 공용 틀.
            [해지 신청]·[신청 취소]는 도는 동안 진행 표시(두 번 누름 막음) */}
        {suspended && cancelReqModal && canEdit && (
          <ModalShell
            title={cancelReqModal === 'request' ? labels.cancelRequestModalTitle : labels.cancelRequestWithdrawTitle}
            titleId="billing-cancel-request-title"
            closeLabel={labels.close}
            onClose={() => setCancelReqModal(null)}
            busy={cancelReqBusy}
            zIndex={1000}
            className="adm-shell"
            testId={cancelReqModal === 'request' ? 'billing-cancel-request-modal' : 'billing-cancel-request-withdraw-modal'}
            footer={<>
              <Button variant="secondary" disabled={cancelReqBusy} onClick={() => setCancelReqModal(null)}>
                {labels.close}
              </Button>
              {cancelReqModal === 'request' ? (
                <Button variant="danger" pending={cancelReqBusy} data-testid="billing-cancel-request-submit"
                  onClick={() => runCancelRequest(() => onRequestCancellation?.(cancelReqReason))}>
                  {labels.cancelRequestSubmit}
                </Button>
              ) : (
                <Button variant="danger" pending={cancelReqBusy} data-testid="billing-cancel-request-withdraw-submit"
                  onClick={() => runCancelRequest(() => onWithdrawCancellationRequest?.())}>
                  {labels.cancelRequestWithdrawSubmit}
                </Button>
              )}
            </>}
          >
            {cancelReqModal === 'request' ? (
              <Stack gap="lg">
                <div style={{ fontSize: 13, color: T.sub }}>{labels.cancelRequestModalBody}</div>
                <div style={{ fontSize: 13, color: T.sub }}>{labels.cancelRequestModalNote}</div>
                <FormField label={labels.cancelRequestReasonLabel}>
                  <TextArea rows={3} value={cancelReqReason} maxLength={cancellationReasonMaxLength}
                    onChange={(e) => setCancelReqReason(e.target.value)} />
                </FormField>
              </Stack>
            ) : (
              <div style={{ fontSize: 13, color: T.sub }}>{labels.cancelRequestWithdrawBody}</div>
            )}
          </ModalShell>
        )}

      </div>
    </div>
  );
}
