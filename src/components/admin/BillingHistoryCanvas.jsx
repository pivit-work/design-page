import { useRef, useState } from 'react';
import Button from '../shared/Button.jsx';
import ModalShell from '../shared/ModalShell.jsx';
import SegmentedControl from '../shared/SegmentedControl.jsx';
import Stack from '../shared/Stack.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import Tooltip from '../shared/Tooltip.jsx';
import { FileTextGlyph } from '../shared/lineIcons.jsx';
import { FrameTable, NoticeLines, Panel, StatStrip } from '../frames/index.js';
import { BillingPage, BillingPageHead } from './kit/BillingSurface.jsx';
import { BILLING_PAGE_WIDTH } from './kit/billingPageWidth.js';

// ─────────────────────────────────────────────────────────────
// 결제·구독 — 청구 내역·영수증(카드매출전표) (BillingHistoryCanvas)  /admin/billing/history
// pivit-specs 의 billing-history.jsx 시안을 design-page 정본으로 포팅.
//
// 세금계산서 미발행(spec §5.1) — 증빙은 영수증(카드매출전표)뿐.
// 데이터·라벨은 모두 props 로 받는다 (page wrapper 가 fetch·매핑·i18n·다운로드를
// 소유). 캔버스는 인라인 스타일로 자기 완결적으로 렌더한다.
// ─────────────────────────────────────────────────────────────

const won = (n) => '₩' + Number(n || 0).toLocaleString('ko-KR');

const DEFAULT_LABELS = {
  viewOnly: '조회 전용',
  pageTitle: '청구 내역',
  pageSubtitle:
    '회사의 청구서와 영수증(카드매출전표)을 확인하고 다운로드합니다. 세금계산서는 발행하지 않습니다.',

  summaryTotalPaid: '총 결제 금액',
  summaryPaidCount: '결제 완료',
  summaryTotalCount: '전체 청구',
  countUnit: (n) => `${n}건`,

  statusLabels: {
    paid: '결제완료',
    open: '미결제',
    void: '취소됨',
    uncollectible: '수금불가',
  },

  // 청구 사유 배지 — 무엇에 대한 청구인가(screen-billing-history.policy §2 · PW-324)
  billingReasons: {
    initial: '첫 결제',
    rebill: '정기결제',
    seat_increment: '좌석 추가(일할)',
    plan_change: '요금제 변경(차액)',
    // «전자결재 · 휴가 패키지»를 산 날의 일할 결제 (pivit-work PW-2782 · history «청구 사유 «애드온 구매»» 행)
    addon_purchase: '애드온 구매(일할)',
  },
  seatIncrementTooltip: '첫 청구 주기 안에 추가된 좌석의 남은 기간분입니다',
  // 요금제 변경 차액 줄 hover (pivit-work PW-2475 · screen-billing-history §4)
  planDiffTooltip: '요금제를 올린 날부터 다음 청구일 전날까지의 차액입니다. 청구 기준일은 바뀌지 않습니다',

  refundLabels: {
    completed_full: '환불완료',
    completed_partial: '부분환불',
    processing: '환불 처리 중',
    failed: '환불 실패',
  },
  refundReasons: {
    cooling_off: '청약철회',
    annual_midterm: '연간 중도해지',
    credit_pack: '크레딧팩',
    goodwill: '예외 환불',
    error: '오결제 정정',
  },
  refundAmount: (amount) => `환불 −${won(amount)}`,
  // 돈이 아직 안 돌아간 환불은 금액 줄을 «취소됨»처럼 흐리게 — 끝난 환불로 읽히지 않게(PW-1956)
  refundPendingAmount: (amount) => `환불 예정 −${won(amount)}`,
  refundNotDoneAmount: (amount) => `환불 안 됨 −${won(amount)}`,
  partialRefundNote: '부분취소 전표(차액) 발급',
  // 결제사 환불이 자동 재시도까지 다 실패해 운영팀이 처리한다(PW-1816 답 (나) · PW-1944)
  refundFailedNote: '운영팀이 연락드립니다',
  // 운영팀이 결제사 밖에서 돌려주고 «환불 완료»를 기록한 환불(pivit-work PW-2476 · cancellation-refund-policy §7-B · history policy §7)
  refundOffPgNote: (paidAt) => `운영팀이 ${paidAt} 결제사 밖에서 돌려드렸습니다 — 카드 취소 전표는 없습니다`,
  voidNote: '취소됨',

  // 운영자가 승인한 예외 환불·오결제 정정 — 받기 전 «환불 승인» 줄 (pivit-work PW-2525 · history policy §2·§4·§5 · cancellation-refund-policy §7-A)
  refundApprovalLabel: '환불 승인',
  refundApprovalNote: 'PIVIT 운영팀이 승인한 환불입니다. 받으면 원 결제수단으로 돌려드립니다.',
  refundApprovalInquiry: (no) => `· 문의 #${no}`,
  refundApprovalAmount: (amount) => `돌려받을 금액 −${won(amount)}`,
  receiveRefundButton: '환불 받기',
  receiveRefundBlocked: '이 결제의 다른 환불이 끝난 뒤 받을 수 있습니다',
  receiveModal: {
    title: '환불을 받을까요?',
    invoiceNo: '청구번호',
    paidAt: '결제일',
    total: '결제 금액',
    reason: '환불 사유',
    amount: '돌려받을 금액',
    vatNote: (vat) => `VAT 포함 · 부가세 ${won(vat)}`,
    pgNote: '원 결제수단(카드)으로 취소됩니다. 카드사 일정에 따라 반영까지 며칠이 걸릴 수 있습니다.',
    subscriptionNote: '구독 · 요금제 · 다음 청구일은 바뀌지 않습니다.',
    // 창 오른쪽 위 닫기 X 의 화면 읽기 이름 — 기획서에 없어 개발이 정했다
    close: '닫기',
    cancel: '취소',
    confirm: '환불 받기',
    busy: '요청 중…',
    failed: '환불을 요청하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    retry: '다시 시도',
  },

  filterTabs: {
    all: '전체',
    paid: '결제완료',
    open: '미결제',
    failed: '실패·취소',
  },

  tableHeaders: {
    invoiceNo: '청구번호',
    period: '청구 기간',
    seats: '좌석 수',
    amount: '금액',
    status: '상태',
    receipt: '영수증',
  },
  seatsUnit: (n) => `${n}명`,
  receiptButton: '영수증',
  receiptDownloading: '다운로드 중…',
  pgReceiptLink: '카드사 전표',

  emptyTitle: '아직 청구 내역이 없습니다',
  emptyDesc: '유료 플랜(Starter 이상)으로 전환하면 첫 청구서가 발행됩니다.',
  emptyCta: '플랜 보기',
  noFilterResult: '선택한 조건에 해당하는 청구 내역이 없습니다.',
  // 청구서 목록을 못 받았을 때 표 자리 카드 (history policy §3 «청구 내역을 불러오지 못함» · §5 · pivit-work PW-3131)
  loadFailedTitle: '청구 내역을 불러오지 못했습니다',
  loadFailedDesc: '잠시 후 다시 시도해 주세요.',
  loadFailedRetry: '다시 시도',
};

function mergeLabels(provided) {
  if (!provided) return DEFAULT_LABELS;
  return {
    ...DEFAULT_LABELS,
    ...provided,
    statusLabels: { ...DEFAULT_LABELS.statusLabels, ...(provided.statusLabels || {}) },
    billingReasons: { ...DEFAULT_LABELS.billingReasons, ...(provided.billingReasons || {}) },
    refundLabels: { ...DEFAULT_LABELS.refundLabels, ...(provided.refundLabels || {}) },
    refundReasons: { ...DEFAULT_LABELS.refundReasons, ...(provided.refundReasons || {}) },
    filterTabs: { ...DEFAULT_LABELS.filterTabs, ...(provided.filterTabs || {}) },
    tableHeaders: { ...DEFAULT_LABELS.tableHeaders, ...(provided.tableHeaders || {}) },
    receiveModal: { ...DEFAULT_LABELS.receiveModal, ...(provided.receiveModal || {}) },
  };
}

// 딱지 뜻 — 색은 공용 상태 딱지 표(statusBadgeTones.js)가 정한다. 모양은 1on1 완료 화면 딱지(`.ono-done-badge` · 6/2 · 모서리 8 · 12px)
// (pivit-work PW-3132 — 화면이 칠하던 초록·주황·빨강 hex 를 뜻으로 바꿨다).
const STATUS_TONE = {
  paid: 'success',
  open: 'warning',
  void: 'neutral',
  uncollectible: 'danger',
};

// 청구 사유 딱지 — 사유가 없는 옛 청구서는 「정기결제」로 표기한다(policy §7, 필터에서 빼지 않는다).
// «첫 결제»는 «정기결제»와 같은 회색 — 뜻 없는 분류에 색을 쓰지 않는다(시안 ㊲). 주기 중간 일할 청구(좌석 추가 ·
// 요금제 변경 차액 · 애드온 구매 · PW-2475 · PW-2782)는 전처럼 셋이 같은 주의 색.
const REASON_TONE = {
  initial: 'neutral',
  rebill: 'neutral',
  seat_increment: 'warning',
  plan_change: 'warning',
  addon_purchase: 'warning',
};
const reasonKey = (inv) => (REASON_TONE[inv.billing_reason] ? inv.billing_reason : 'rebill');

// 환불(Refund) 딱지 뜻 — cancellation-refund-policy.md §9
const REFUND_TONE = {
  completed_full: 'neutral',
  completed_partial: 'accent',
  processing: 'warning',
  failed: 'danger',
};
const refundMetaKey = (r) =>
  r.status === 'completed' ? `completed_${r.type}` : r.status;

// 한 청구서의 환불 줄들 — 오결제 정정 뒤 해지 환불처럼 여럿이면 `refunds` 로 받아 줄마다 그린다(pivit-work PW-2525).
// 하나만 주는 옛 모양(`refund`)도 그대로 받는다.
const refundsOf = (inv) => (Array.isArray(inv.refunds) ? inv.refunds : inv.refund ? [inv.refund] : []);

function Badge({ tone, children }) {
  return <StatusBadge tone={tone} className="ono-done-badge">{children}</StatusBadge>;
}

/** 칸 안 작은 글(12/18) — 금액 밑 환불 줄 · 상태 밑 안내. 긴 안내는 낱말 단위로 꺾는다(표 칸은 한 줄이 기본이라 풀어 준다). */
const SMALL_STYLE = {
  fontSize: 'var(--font-size-text-xs)',
  lineHeight: 'var(--line-height-text-xs)',
  fontWeight: 500,
  color: 'var(--text-tertiary)',
};
const NOTE_STYLE = { ...SMALL_STYLE, whiteSpace: 'normal', overflowWrap: 'break-word', wordBreak: 'keep-all', maxWidth: 220 };
const CELL_STACK_STYLE = { display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)', alignItems: 'flex-start', minWidth: 0 };
const CELL_STACK_RIGHT_STYLE = { ...CELL_STACK_STYLE, alignItems: 'flex-end', gap: 'var(--spacing-xxs)' };

/** 금액 칸의 환불 금액 한 줄 — 끝난 환불만 강조색, 처리 중·실패는 «취소됨»과 같은 흐린 글씨(PW-1956). */
function RefundAmountLine({ refund, labels }) {
  if (refund.status === 'completed') {
    return (
      <div style={{ ...SMALL_STYLE, fontWeight: 600, color: 'var(--text-brand-secondary)' }}>
        {labels.refundAmount(refund.amount)}
      </div>
    );
  }
  return (
    <div style={SMALL_STYLE}>
      {refund.status === 'failed'
        ? labels.refundNotDoneAmount(refund.amount)
        : labels.refundPendingAmount(refund.amount)}
    </div>
  );
}

/** 환불 사유 문구 — 표에 없는 값(DB 에 손으로 넣은 줄 · `constructor` 같은 이름)은 '' (pivit-work PW-3131). */
function refundReasonText(labels, reason) {
  const map = labels.refundReasons || {};
  const text = Object.prototype.hasOwnProperty.call(map, reason) ? map[reason] : '';
  return typeof text === 'string' ? text : '';
}

/** 상태 칸의 환불 한 건 — 딱지와 그 밑 안내(부분취소 전표 · 운영팀 연락 · 결제사 밖 환불). */
function RefundStatusLines({ refund, labels }) {
  const tone = REFUND_TONE[refundMetaKey(refund)] || REFUND_TONE.processing;
  const rl = labels.refundLabels[refundMetaKey(refund)] || '';
  return (
    <>
      <Badge tone={tone}>
        {/* 사유 문구 표에 없는 값(DB 에 손으로 넣은 줄 등)은 코드값을 보이지 않고 상태만 — «환불 승인» 딱지와 같다 (pivit-work PW-3131) */}
        {[rl, refundReasonText(labels, refund.reason)].filter(Boolean).join(' · ')}
      </Badge>
      {/* 부분취소 전표는 환불이 끝난 뒤에 나온다(policy §7 「완료 후 노출」) */}
      {refund.type === 'partial' && refund.status === 'completed' && !refund.offPg && (
        <span style={NOTE_STYLE}>{labels.partialRefundNote}</span>
      )}
      {/* 환불 실패는 사용자가 할 일이 없다 — 운영팀이 연락한다는 안내를 같은 모양으로 붙인다 */}
      {refund.status === 'failed' && (
        <span style={NOTE_STYLE}>{labels.refundFailedNote}</span>
      )}
      {/* 결제사 밖에서 끝낸 환불 — 같은 자리·같은 모양(작은 회색). 결제사 취소가 아니라 취소 전표가 없다(PW-2476) */}
      {refund.offPg && refund.status === 'completed' && (
        <span data-testid="billing-history-refund-offpg" style={NOTE_STYLE}>
          {labels.refundOffPgNote(refund.offPg.paidAt)}
        </span>
      )}
    </>
  );
}

const FILTER_TABS = [
  { key: 'all', statuses: null, labelKey: 'all' },
  { key: 'paid', statuses: ['paid'], labelKey: 'paid' },
  { key: 'open', statuses: ['open'], labelKey: 'open' },
  { key: 'failed', statuses: ['void', 'uncollectible'], labelKey: 'failed' },
];

// onClick 이 돌려주는 약속(Promise)은 Button 에 넘기지 않는다 — 넘기면 Button 이 글자를 감추고 도는 표시만 띄워,
// 화면이 직접 바꾸는 «다운로드 중…»·«카드 인증 창을 여는 중...» 같은 진행 글자가 안 보인다(기획서가 글자로 정함).
const fireOnly = (onClick) => (onClick ? (e) => { onClick(e); } : undefined);
// 버튼은 공용 Button(디자이너 어드민 버튼과 같은 값)으로 그린다 (pivit-work PW-2938). 손으로 칠한 값을 두지 않는다.
// 결제사가 준 바깥 문서(href)는 같은 모양의 링크로 새 탭에서 연다 (pivit-work PW-2182) — 부품 클래스만 붙인다.
function Btn({ children, onClick, kind = 'primary', disabled, size = 'md', href }) {
  const variant = kind === 'danger' ? 'danger-ghost' : kind;
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer"
        className={`dp-btn dp-btn--${variant} dp-btn--${size}`} style={{ textDecoration: 'none' }}>
        <span className="dp-btn__label">{children}</span>
      </a>
    );
  }
  return (
    <Button variant={variant} size={size} onClick={fireOnly(onClick)} disabled={disabled}>
      {children}
    </Button>
  );
}

/** 필터 줄 — 디자이너 세그먼트 왼쪽 · 오른쪽 «N건»(13/20 흐림). 시안 ㉟. */
const FILTER_ROW_STYLE = { display: 'flex', alignItems: 'center', gap: 'var(--spacing-lg)', minWidth: 0 };
const FILTER_COUNT_STYLE = {
  marginLeft: 'auto',
  fontSize: 'var(--font-size-text-sm)',
  lineHeight: 'var(--line-height-text-sm)',
  color: 'var(--text-tertiary)',
  whiteSpace: 'nowrap',
};
/** 판 가운데 안내(불러오기 실패 · 빈 내역 · 필터 결과 없음) — 모양은 전과 같다(시안 ㊵ «그대로»). */
const CENTER_STYLE = { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 'var(--spacing-md)' };
const CENTER_TITLE_STYLE = { fontSize: 'var(--font-size-text-md)', lineHeight: 'var(--line-height-text-md)', fontWeight: 700, color: 'var(--text-primary)' };
const CENTER_DESC_STYLE = { fontSize: 'var(--font-size-text-sm)', lineHeight: 'var(--line-height-text-sm)', color: 'var(--text-tertiary)', marginBottom: 'var(--spacing-lg)' };
const NO_NUM_STYLE = { fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' };

/** [환불 받기] 창의 금액 줄 — 이름 왼쪽(14 보조) / 값 오른쪽(굵게). 돌려받을 금액 줄만 위에 선 · 16 굵게. 시안 ㊴. */
const KV_LIST_STYLE = { display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' };
const KV_ROW_STYLE = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: 'var(--spacing-lg)',
  fontSize: 'var(--font-size-text-sm)',
  lineHeight: 'var(--line-height-text-sm)',
  color: 'var(--text-secondary)',
};
const KV_VALUE_STYLE = { fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right' };
const KV_TOTAL_STYLE = {
  ...KV_ROW_STYLE,
  paddingTop: 'var(--spacing-lg)',
  borderTop: '1px solid var(--border-secondary)',
  fontSize: 'var(--font-size-text-md)',
  lineHeight: 'var(--line-height-text-md)',
  fontWeight: 700,
  color: 'var(--text-primary)',
};

export default function BillingHistoryCanvas({
  invoices = [],
  role = 'owner',
  labels: providedLabels,
  onDownloadReceipt,
  onViewPlans,
  onReceiveRefund,
  // 청구서 목록을 못 받음 — 갖고 있던 목록이 없을 때만 빈 안내 대신 실패 카드 + [다시 시도]
  loadFailed = false,
  onRetry,
}) {
  const labels = mergeLabels(providedLabels);
  const [filterKey, setFilterKey] = useState('all');
  const [downloading, setDownloading] = useState({}); // { [invoiceId_receipt]: true }
  // [환불 받기]는 결제 권한자만 — 조회 전용(hr_admin)이거나 화면이 받는 길을 안 주면 줄만 보인다(history policy §6)
  const canReceiveRefund = role !== 'hr_admin' && typeof onReceiveRefund === 'function';
  // 확인 창 — 연 청구서와 그때의 승인을 함께 둔다(받은 뒤 다시 읽어 승인이 사라져도 창이 비지 않게)
  const [receiveTarget, setReceiveTarget] = useState(null); // { inv, approval }
  const [receiveBusy, setReceiveBusy] = useState(false);
  const [receiveFailed, setReceiveFailed] = useState(false);
  // 같은 틀 안 연타는 다시 그리기 전이라 disabled 가 아직 안 걸려 있다 — ref 로 곧장 막는다
  const receiveLock = useRef(false);

  const openReceive = (inv) => {
    setReceiveFailed(false);
    setReceiveTarget({ inv, approval: inv.refund_approval });
  };
  const closeReceive = () => {
    if (receiveLock.current) return;
    setReceiveTarget(null);
    setReceiveFailed(false);
  };
  // 화면이 돌려준 값이 'failed' 면 창을 연 채 실패를 알리고 [다시 시도], 그 밖은 닫는다 — 토스트·다시 읽기는 화면 몫
  const confirmReceive = async () => {
    if (receiveLock.current || !receiveTarget) return;
    receiveLock.current = true;
    setReceiveBusy(true);
    setReceiveFailed(false);
    let result;
    try {
      result = await onReceiveRefund?.(receiveTarget.inv, receiveTarget.approval);
    } catch {
      result = 'failed';
    }
    receiveLock.current = false;
    setReceiveBusy(false);
    if (result === 'failed') setReceiveFailed(true);
    else setReceiveTarget(null);
  };

  // 필터 적용
  const activeTab = FILTER_TABS.find((t) => t.key === filterKey) || FILTER_TABS[0];
  const filteredInvoices = invoices.filter((inv) =>
    !activeTab.statuses ? true : activeTab.statuses.includes(inv.status),
  );

  // 요약 집계 (전체 기준)
  const totalPaid = invoices
    .filter((i) => i.status === 'paid')
    .reduce((s, i) => s + Number(i.total || 0), 0);
  const paidCount = invoices.filter((i) => i.status === 'paid').length;
  const totalCount = invoices.length;

  // 영수증 다운로드 — 콜백 발화 후 로딩 해제 (GET /api/billing/invoices/{id}/receipt)
  const handleReceipt = async (inv) => {
    const key = `${inv.id}_receipt`;
    setDownloading((p) => ({ ...p, [key]: true }));
    try {
      await onDownloadReceipt?.(inv);
    } finally {
      setDownloading((p) => ({ ...p, [key]: false }));
    }
  };

  const columns = [
    {
      key: 'invoiceNo',
      header: labels.tableHeaders.invoiceNo,
      // 청구번호(굵게) + 그 밑 한 줄 청구 사유 딱지 (무엇에 대한 청구인지 식별 — PW-324)
      render: (inv) => {
        const rk = reasonKey(inv);
        const badge = <Badge tone={REASON_TONE[rk]}>{labels.billingReasons[rk]}</Badge>;
        return (
          <div style={CELL_STACK_STYLE}>
            <span style={NO_NUM_STYLE}>{inv.invoice_no}</span>
            {rk === 'seat_increment' ? (
              <Tooltip content={labels.seatIncrementTooltip}><span>{badge}</span></Tooltip>
            ) : badge}
            {/* 요금제 변경 차액 줄 · 청구 주기 변경 줄 (pivit-work PW-2475 · history §2) — 좌석 라인과 합치지 않는 별도 줄.
                문구는 서버 청구서 줄 그대로다. 모양은 칸 안 작은 회색 글 */}
            {inv.plan_diff_line && (
              <Tooltip content={labels.planDiffTooltip}>
                <span data-testid="billing-history-plan-diff-line"
                  style={{ ...NOTE_STYLE, cursor: 'help' }}>{inv.plan_diff_line}</span>
              </Tooltip>
            )}
            {/* «전자결재 · 휴가 패키지» 라인 (pivit-work PW-2782 · history «애드온 라인 상세») — 좌석 라인과 합치지 않는 별도 줄 */}
            {(inv.addon_lines ?? []).map((line, idx) => (
              <span key={idx} data-testid="billing-history-addon-line" style={NOTE_STYLE}>{line}</span>
            ))}
            {inv.cycle_change_line && (
              <span data-testid="billing-history-cycle-change-line" style={NOTE_STYLE}>{inv.cycle_change_line}</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'period',
      header: labels.tableHeaders.period,
      render: (inv) => <>{inv.period_start} ~ {inv.period_end}</>,
    },
    {
      key: 'seats',
      header: labels.tableHeaders.seats,
      align: 'right',
      render: (inv) => labels.seatsUnit(inv.seat_count_snapshot),
    },
    {
      // 금액 (+ 환불액 라인)
      key: 'amount',
      header: labels.tableHeaders.amount,
      align: 'right',
      render: (inv) => (
        <div style={CELL_STACK_RIGHT_STYLE}>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {won(inv.total)}
            {inv.status === 'void' && (
              <span style={{ ...SMALL_STYLE, marginLeft: 'var(--spacing-sm)' }}>{labels.voidNote}</span>
            )}
          </span>
          {refundsOf(inv).map((r, i) => (
            <RefundAmountLine key={i} refund={r} labels={labels} />
          ))}
          {/* 받기 전 «환불 승인» — 위 «환불 예정» 줄과 같은 크기·색(history policy §2 · PW-2525) */}
          {inv.refund_approval && (
            <div data-testid="billing-history-approval-amount" style={SMALL_STYLE}>
              {labels.refundApprovalAmount(inv.refund_approval.amount)}
            </div>
          )}
        </div>
      ),
    },
    {
      // 상태 딱지 (+ 환불 딱지)
      key: 'status',
      header: labels.tableHeaders.status,
      render: (inv) => {
        const tone = STATUS_TONE[inv.status] || STATUS_TONE.void;
        const statusLabel = labels.statusLabels[inv.status] || inv.status;
        // 전액 환불이 끝난 청구서는 «결제완료»를 그리지 않는다(PW-2213) — 돌려받은 돈이 결제된 것으로
        // 읽혔다. 부분환불·처리 중·실패는 결제완료 밑에 환불 딱지(policy §2: 부분환불 상태는 결제완료 그대로).
        const refunds = refundsOf(inv);
        const fullyRefunded = refunds.some((r) => refundMetaKey(r) === 'completed_full');
        const approval = inv.refund_approval;
        const approvalBlocked = approval?.receivable === false;
        return (
          <div style={CELL_STACK_STYLE}>
            {!fullyRefunded && <Badge tone={tone}>{statusLabel}</Badge>}
            {refunds.map((r, i) => (
              <RefundStatusLines key={i} refund={r} labels={labels} />
            ))}
            {/* 받기 전 «환불 승인» 딱지 + 안내 + [환불 받기] (PW-2525 · history policy §2·§4·§6).
                버튼은 결제 권한자에게만, 같은 결제에 처리 중인 다른 환불이 있으면 꺼짐 + 말풍선 */}
            {approval && (
              <>
                <Badge tone="info">
                  {[labels.refundApprovalLabel, refundReasonText(labels, approval.reason)].filter(Boolean).join(' · ')}
                </Badge>
                <span data-testid="billing-history-approval-note" style={NOTE_STYLE}>
                  {approval.inquiry_no
                    ? `${labels.refundApprovalNote} ${labels.refundApprovalInquiry(approval.inquiry_no)}`
                    : labels.refundApprovalNote}
                </span>
                {canReceiveRefund && (
                  <Tooltip content={approvalBlocked ? labels.receiveRefundBlocked : null}>
                    <Button variant="secondary" size="sm" disabled={approvalBlocked}
                      data-testid="billing-history-receive-refund"
                      onClick={() => openReceive(inv)}>
                      {labels.receiveRefundButton}
                    </Button>
                  </Tooltip>
                )}
              </>
            )}
          </div>
        );
      },
    },
    {
      // 영수증(카드매출전표) — 세금계산서 미발행(spec §5.1). 버튼은 작게 오른쪽 맞춤(시안 ㊱)
      key: 'receipt',
      header: labels.tableHeaders.receipt,
      align: 'right',
      render: (inv) => {
        const isReceiptDownloading = !!downloading[`${inv.id}_receipt`];
        // 결제 뒤 전체환불로 취소된 청구서도 결제 때 받은 전표는 남긴다 — 환불 증빙도 그 전표다.
        // [청구서] 자리는 «—» (screen-billing-history.policy §2 · pivit-work PW-2206)
        const refundedVoid = inv.status === 'void' && !!inv.paid_at;
        return inv.status === 'paid' || refundedVoid ? (
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center', justifyContent: 'flex-end' }}>
            {inv.status === 'paid' ? (
              <Btn size="sm" kind="secondary"
                disabled={isReceiptDownloading}
                onClick={() => handleReceipt(inv)}>
                {isReceiptDownloading ? labels.receiptDownloading : labels.receiptButton}
              </Btn>
            ) : (
              <span style={{ color: 'var(--text-tertiary)' }}>—</span>
            )}
            {/* 결제사(토스)가 발급한 공식 카드매출전표 — 주소가 없는 결제(개발용 가짜 결제)는 그리지 않는다 */}
            {inv.pg_receipt_url && (
              <Btn size="sm" kind="secondary" href={inv.pg_receipt_url}>
                {labels.pgReceiptLink}
              </Btn>
            )}
          </div>
        ) : (
          <span style={{ color: 'var(--text-tertiary)' }}>—</span>
        );
      },
    },
  ];

  return (
    <BillingPage width={BILLING_PAGE_WIDTH.history}>
      <BillingPageHead
        title={labels.pageTitle}
        titleAside={role === 'hr_admin' ? <Badge tone="neutral">{labels.viewOnly}</Badge> : undefined}
        description={[labels.pageSubtitle]}
      />

      {/* 상단 숫자 칸 — 흰 판 하나 안 세 칸(시안 ㉞). 내역 있을 때만 */}
      {invoices.length > 0 && (
        <StatStrip
          testId="billing-history-stats"
          items={[
            { key: 'totalPaid', label: labels.summaryTotalPaid, value: won(totalPaid) },
            { key: 'paidCount', label: labels.summaryPaidCount, value: labels.countUnit(paidCount) },
            { key: 'totalCount', label: labels.summaryTotalCount, value: labels.countUnit(totalCount) },
          ]}
        />
      )}

      {/* 상태 필터 — 디자이너 세그먼트 + 오른쪽 «N건»(지금 보이는 줄 수) */}
      <div style={FILTER_ROW_STYLE}>
        <SegmentedControl
          items={FILTER_TABS.map((tab) => ({
            value: tab.key,
            label: labels.filterTabs[tab.labelKey],
            testId: `billing-history-filter-${tab.key}`,
          }))}
          value={filterKey}
          onChange={setFilterKey}
        />
        {invoices.length > 0 && (
          <span data-testid="billing-history-filter-count" style={FILTER_COUNT_STYLE}>
            {labels.countUnit(filteredInvoices.length)}
          </span>
        )}
      </div>

      {/* 청구 내역 표 / 빈 상태 */}
      {invoices.length === 0 && loadFailed ? (
        <Panel>
          <div data-testid="billing-history-load-failed" role="alert" style={CENTER_STYLE}>
            <div style={CENTER_TITLE_STYLE}>{labels.loadFailedTitle}</div>
            <div style={CENTER_DESC_STYLE}>{labels.loadFailedDesc}</div>
            <Btn size="sm" kind="secondary" onClick={onRetry}>{labels.loadFailedRetry}</Btn>
          </div>
        </Panel>
      ) : invoices.length === 0 ? (
        <Panel>
          <div style={CENTER_STYLE}>
            <div style={{ display: 'flex', color: 'var(--text-tertiary)' }}><FileTextGlyph size={36} /></div>
            <div style={CENTER_TITLE_STYLE}>{labels.emptyTitle}</div>
            <div style={CENTER_DESC_STYLE}>{labels.emptyDesc}</div>
            <Btn size="sm" onClick={onViewPlans}>{labels.emptyCta}</Btn>
          </div>
        </Panel>
      ) : (
        <FrameTable
          testId="billing-history-table"
          ariaLabel={labels.pageTitle}
          columns={columns}
          rows={filteredInvoices}
          rowKey={(inv) => inv.id}
          empty={labels.noFilterResult}
        />
      )}

      {/* [환불 받기] 확인 창 — 공용 창 틀(ModalShell). body 직속 포털이라 왼쪽 메뉴까지 덮는다.
          겹침 순서는 같은 «결제·구독» 화면의 요금제 변경 확인 창과 같은 1000. 금액은 서버 값 그대로다(policy §5).
          버튼 줄은 틀 기본 버튼 모양(1:1 · 높이 44 · `.tl-group-modal-btn`) — 시험이 쓰는 이름표를 남기려 공용 Button 으로 그린다 */}
      {receiveTarget && (
        <ModalShell
          title={labels.receiveModal.title}
          titleId="billing-receive-refund-title"
          closeLabel={labels.receiveModal.close}
          onClose={closeReceive}
          busy={receiveBusy}
          zIndex={1000}
          className="adm-shell"
          testId="billing-receive-refund-modal"
          footer={
            <>
              <Button className="tl-group-modal-btn tl-group-modal-btn-secondary" disabled={receiveBusy} onClick={closeReceive}
                data-testid="billing-receive-refund-cancel">
                {labels.receiveModal.cancel}
              </Button>
              <Button className="tl-group-modal-btn tl-group-modal-btn-primary" disabled={receiveBusy}
                onClick={() => { void confirmReceive(); }}
                data-testid="billing-receive-refund-submit">
                {receiveBusy
                  ? labels.receiveModal.busy
                  : receiveFailed ? labels.receiveModal.retry : labels.receiveModal.confirm}
              </Button>
            </>
          }
        >
          <Stack gap="xl">
            <div style={KV_LIST_STYLE}>
              {[
                [labels.receiveModal.invoiceNo, receiveTarget.inv.invoice_no],
                [labels.receiveModal.paidAt, receiveTarget.inv.paid_at || '—'],
                [labels.receiveModal.total, won(receiveTarget.inv.total)],
                [labels.receiveModal.reason, refundReasonText(labels, receiveTarget.approval.reason)],
              ].map(([label, value]) => (
                <div key={label} style={KV_ROW_STYLE}>
                  <span>{label}</span>
                  <span style={KV_VALUE_STYLE}>{value}</span>
                </div>
              ))}
              <div style={KV_TOTAL_STYLE}>
                <span>{labels.receiveModal.amount}</span>
                <span data-testid="billing-receive-refund-amount" style={{ textAlign: 'right', fontWeight: 700 }}>
                  {won(receiveTarget.approval.amount)}
                  <span style={{ ...SMALL_STYLE, display: 'block' }}>
                    {labels.receiveModal.vatNote(receiveTarget.approval.vat_amount)}
                  </span>
                </span>
              </div>
            </div>
            <NoticeLines tone="muted" lines={[labels.receiveModal.pgNote, labels.receiveModal.subscriptionNote]} />
            {receiveFailed && (
              <div role="alert" data-testid="billing-receive-refund-error"
                style={{ fontSize: 'var(--font-size-text-sm)', color: 'var(--text-error-primary)' }}>
                {labels.receiveModal.failed}
              </div>
            )}
          </Stack>
        </ModalShell>
      )}
    </BillingPage>
  );
}
