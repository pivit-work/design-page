import { useRef, useState } from 'react';
import Button from '../shared/Button.jsx';
import ModalShell from '../shared/ModalShell.jsx';
import RosterTable from '../shared/RosterTable.jsx';
import Stack from '../shared/Stack.jsx';
import Tooltip from '../shared/Tooltip.jsx';
import { FileTextGlyph } from '../shared/lineIcons.jsx';
import { BillingCard as Card, BillingBadge as Badge } from './kit/BillingSurface.jsx';

// ─────────────────────────────────────────────────────────────
// 결제·구독 — 청구 내역·영수증(카드매출전표) (BillingHistoryCanvas)  /admin/billing/history
// pivit-specs 의 billing-history.jsx 시안을 design-page 정본으로 포팅.
//
// 세금계산서 미발행(spec §5.1) — 증빙은 영수증(카드매출전표)뿐.
// 데이터·라벨은 모두 props 로 받는다 (page wrapper 가 fetch·매핑·i18n·다운로드를
// 소유). 캔버스는 인라인 스타일로 자기 완결적으로 렌더한다.
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

const STATUS_META = {
  paid: { color: T.green, bg: T.greenBg },
  open: { color: T.amber, bg: T.amberBg },
  void: { color: T.sub, bg: T.bl },
  uncollectible: { color: T.red, bg: T.redBg },
};

// 청구 사유 배지 메타 — 사유가 없는 옛 청구서는 「정기결제」로 표기한다(policy §7, 필터에서 빼지 않는다)
const REASON_META = {
  initial: { color: T.accentText, bg: 'var(--bg-brand-secondary)' },
  rebill: { color: T.sub, bg: T.bl },
  seat_increment: { color: T.amber, bg: T.amberBg },
  // 이용 중 상위 요금제로 올린 남은 기간 차액 (pivit-work PW-2475) — 좌석 추가 일할과 같은 «주기 중간 일할 청구»라 같은 배지 색
  plan_change: { color: T.amber, bg: T.amberBg },
};
const reasonKey = (inv) => (REASON_META[inv.billing_reason] ? inv.billing_reason : 'rebill');

// 환불(Refund) 배지 메타 — cancellation-refund-policy.md §9
const REFUND_META = {
  completed_full: { color: T.sub, bg: T.bl },
  completed_partial: { color: T.accentText, bg: 'var(--bg-brand-secondary)' },
  processing: { color: T.amber, bg: T.amberBg },
  failed: { color: T.red, bg: T.redBg },
};
const refundMetaKey = (r) =>
  r.status === 'completed' ? `completed_${r.type}` : r.status;

// 한 청구서의 환불 줄들 — 오결제 정정 뒤 해지 환불처럼 여럿이면 `refunds` 로 받아 줄마다 그린다(pivit-work PW-2525).
// 하나만 주는 옛 모양(`refund`)도 그대로 받는다.
const refundsOf = (inv) => (Array.isArray(inv.refunds) ? inv.refunds : inv.refund ? [inv.refund] : []);

// «환불 승인» 배지 — 정보 톤(공용 딱지의 info). 처리 중의 주황·실패의 빨강과 다른 색이다(history policy §2)
const APPROVAL_META = { color: 'var(--dp-badge-info-fg)', bg: 'var(--dp-badge-info-bg)' };

/** 금액 칸의 환불 금액 한 줄 — 끝난 환불만 강조색, 처리 중·실패는 «취소됨»과 같은 흐린 글씨(PW-1956). */
function RefundAmountLine({ refund, labels }) {
  if (refund.status === 'completed') {
    return (
      <div style={{ fontSize: 12, fontWeight: 600, color: T.accentText, marginTop: 'var(--spacing-xxs)' }}>
        {labels.refundAmount(refund.amount)}
      </div>
    );
  }
  return (
    <div style={{ fontSize: 12, color: T.sub, marginTop: 'var(--spacing-xxs)' }}>
      {refund.status === 'failed'
        ? labels.refundNotDoneAmount(refund.amount)
        : labels.refundPendingAmount(refund.amount)}
    </div>
  );
}

/** 상태 칸의 환불 한 건 — 배지와 그 밑 안내(부분취소 전표 · 운영팀 연락 · 결제사 밖 환불). */
function RefundStatusLines({ refund, labels }) {
  const rm = REFUND_META[refundMetaKey(refund)] || REFUND_META.processing;
  const rl = labels.refundLabels[refundMetaKey(refund)] || '';
  return (
    <>
      <Badge color={rm.color} bg={rm.bg}>
        {rl} · {labels.refundReasons[refund.reason] || refund.reason}
      </Badge>
      {/* 부분취소 전표는 환불이 끝난 뒤에 나온다(policy §7 「완료 후 노출」) */}
      {refund.type === 'partial' && refund.status === 'completed' && !refund.offPg && (
        <span style={{ fontSize: 11, color: T.muted }}>{labels.partialRefundNote}</span>
      )}
      {/* 환불 실패는 사용자가 할 일이 없다 — 운영팀이 연락한다는 안내를 같은 모양으로 붙인다 */}
      {refund.status === 'failed' && (
        <span style={{ fontSize: 11, color: T.muted }}>{labels.refundFailedNote}</span>
      )}
      {/* 결제사 밖에서 끝낸 환불 — 같은 자리·같은 모양(작은 회색). 결제사 취소가 아니라 취소 전표가 없다(PW-2476) */}
      {refund.offPg && refund.status === 'completed' && (
        <span data-testid="billing-history-refund-offpg" style={{ fontSize: 11, color: T.muted, maxWidth: 220, lineHeight: 1.5 }}>
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

function Btn({ children, onClick, kind = 'primary', disabled, size = 'md', href }) {
  const styles = {
    primary: { bg: T.accent, color: '#fff', border: 'transparent' },
    secondary: { bg: '#fff', color: T.text, border: T.border },
    ghost: { bg: 'transparent', color: T.accentText, border: 'transparent' },
    danger: { bg: '#fff', color: T.red, border: '#FCA5A5' },
  }[kind];
  const pad = size === 'sm' ? '6px 12px' : '10px 18px';
  const fz = size === 'sm' ? 13 : 14;
  // 결제사가 준 바깥 문서는 같은 모양의 링크로 새 탭에서 연다 (pivit-work PW-2182)
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer"
        style={{ fontFamily: T.font, fontSize: fz, fontWeight: 700, display: 'inline-block',
          // 옆 <button> 과 같은 높이가 되게 줄 높이를 버튼 기본값(normal)으로, 영어 문구가 꺾이지 않게 한 줄로
          lineHeight: 'normal', whiteSpace: 'nowrap',
          padding: pad, borderRadius: 10, textDecoration: 'none',
          background: styles.bg, color: styles.color, border: `1px solid ${styles.border}` }}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={disabled ? undefined : onClick} disabled={disabled}
      style={{ fontFamily: T.font, fontSize: fz, fontWeight: 700,
        padding: pad, borderRadius: 10, cursor: disabled ? 'not-allowed' : 'pointer',
        background: styles.bg, color: styles.color, border: `1px solid ${styles.border}`,
        opacity: disabled ? 0.45 : 1 }}>
      {children}
    </button>
  );
}

export default function BillingHistoryCanvas({
  invoices = [],
  role = 'owner',
  labels: providedLabels,
  onDownloadReceipt,
  onViewPlans,
  onReceiveRefund,
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

  return (
    <div style={{ fontFamily: T.font, background: T.bg, minHeight: '100vh', padding: 32, color: T.text }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{labels.pageTitle}</h1>
          {role === 'hr_admin' && <Badge color={T.sub} bg={T.bl}>{labels.viewOnly}</Badge>}
        </div>
        <p style={{ color: T.sub, fontSize: 14, marginTop: 0, marginBottom: 24 }}>
          {labels.pageSubtitle}
        </p>

        {/* 상단 요약 카드 — 내역 있을 때만 표시 */}
        {invoices.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
            <Card style={{ padding: 20 }}>
              <div style={{ fontSize: 13, color: T.sub, marginBottom: 6 }}>{labels.summaryTotalPaid}</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{won(totalPaid)}</div>
            </Card>
            <Card style={{ padding: 20 }}>
              <div style={{ fontSize: 13, color: T.sub, marginBottom: 6 }}>{labels.summaryPaidCount}</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{labels.countUnit(paidCount)}</div>
            </Card>
            <Card style={{ padding: 20 }}>
              <div style={{ fontSize: 13, color: T.sub, marginBottom: 6 }}>{labels.summaryTotalCount}</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{labels.countUnit(totalCount)}</div>
            </Card>
          </div>
        )}

        {/* 상태 필터 탭 */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
          {FILTER_TABS.map((tab) => {
            const active = filterKey === tab.key;
            return (
              <button type="button" key={tab.key} onClick={() => setFilterKey(tab.key)}
                style={{ fontFamily: T.font, fontSize: 14, fontWeight: active ? 700 : 500,
                  padding: '8px 16px', borderRadius: 10, cursor: 'pointer',
                  border: `1px solid ${active ? T.accent : T.border}`,
                  background: active ? T.accent : '#fff',
                  color: active ? '#fff' : T.sub }}>
                {labels.filterTabs[tab.labelKey]}
              </button>
            );
          })}
        </div>

        {/* 청구 내역 테이블 / 빈 상태 */}
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {invoices.length === 0 ? (
            <div style={{ padding: 64, textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--spacing-lg)', color: 'var(--text-tertiary)' }}><FileTextGlyph size={36} /></div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                {labels.emptyTitle}
              </div>
              <div style={{ fontSize: 14, color: T.sub, marginBottom: 20 }}>
                {labels.emptyDesc}
              </div>
              <Btn size="sm" onClick={onViewPlans}>{labels.emptyCta}</Btn>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: T.sub }}>{labels.noFilterResult}</div>
            </div>
          ) : (
            <RosterTable
              rows={filteredInvoices}
              rowKey={(inv) => inv.id}
              columns={[
                {
                  key: 'invoiceNo',
                  header: labels.tableHeaders.invoiceNo,
                  // 청구번호 + 청구 사유 배지 (무엇에 대한 청구인지 식별 — PW-324)
                  render: (inv) => {
                    const rk = reasonKey(inv);
                    const badge = (
                      <Badge color={REASON_META[rk].color} bg={REASON_META[rk].bg}>
                        {labels.billingReasons[rk]}
                      </Badge>
                    );
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                        <span style={{ fontVariantNumeric: 'tabular-nums', color: T.sub }}>{inv.invoice_no}</span>
                        {rk === 'seat_increment' ? (
                          <Tooltip content={labels.seatIncrementTooltip}><span>{badge}</span></Tooltip>
                        ) : badge}
                        {/* 요금제 변경 차액 줄 · 청구 주기 변경 줄 (pivit-work PW-2475 · history §2) — 좌석 라인과 합치지 않는 별도 줄.
                            문구는 서버 청구서 줄 그대로다. 모양은 위 좌석 일할 툴팁과 같은 11px 회색 보조 글씨 */}
                        {inv.plan_diff_line && (
                          <Tooltip content={labels.planDiffTooltip}>
                            <span data-testid="billing-history-plan-diff-line"
                              style={{ fontSize: 11, color: T.muted, cursor: 'help' }}>{inv.plan_diff_line}</span>
                          </Tooltip>
                        )}
                        {inv.cycle_change_line && (
                          <span data-testid="billing-history-cycle-change-line"
                            style={{ fontSize: 11, color: T.muted }}>{inv.cycle_change_line}</span>
                        )}
                      </div>
                    );
                  },
                },
                {
                  key: 'period',
                  header: labels.tableHeaders.period,
                  cellProps: { style: { whiteSpace: 'nowrap' } },
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
                  cellProps: { style: { fontWeight: 700, whiteSpace: 'nowrap' } },
                  render: (inv) => (
                    <>
                      {won(inv.total)}
                      {inv.status === 'void' && (
                        <span style={{ fontSize: 12, color: T.sub, marginLeft: 6 }}>{labels.voidNote}</span>
                      )}
                      {refundsOf(inv).map((r, i) => (
                        <RefundAmountLine key={i} refund={r} labels={labels} />
                      ))}
                      {/* 받기 전 «환불 승인» — 위 «환불 예정» 줄과 같은 크기·색(history policy §2 · PW-2525) */}
                      {inv.refund_approval && (
                        <div data-testid="billing-history-approval-amount"
                          style={{ fontSize: 12, fontWeight: 500, color: T.sub, marginTop: 'var(--spacing-xxs)' }}>
                          {labels.refundApprovalAmount(inv.refund_approval.amount)}
                        </div>
                      )}
                    </>
                  ),
                },
                {
                  // 상태 배지 (+ 환불 배지)
                  key: 'status',
                  header: labels.tableHeaders.status,
                  render: (inv) => {
                    const sm = STATUS_META[inv.status] || STATUS_META.void;
                    const statusLabel = labels.statusLabels[inv.status] || inv.status;
                    // 전액 환불이 끝난 청구서는 «결제완료»를 그리지 않는다(PW-2213) — 돌려받은 돈이 결제된 것으로
                    // 읽혔다. 부분환불·처리 중·실패는 결제완료 밑에 환불 배지(policy §2: 부분환불 상태는 결제완료 그대로).
                    const refunds = refundsOf(inv);
                    const fullyRefunded = refunds.some((r) => refundMetaKey(r) === 'completed_full');
                    const approval = inv.refund_approval;
                    const approvalBlocked = approval?.receivable === false;
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                        {!fullyRefunded && <Badge color={sm.color} bg={sm.bg}>{statusLabel}</Badge>}
                        {refunds.map((r, i) => (
                          <RefundStatusLines key={i} refund={r} labels={labels} />
                        ))}
                        {/* 받기 전 «환불 승인» 배지 + 안내 + [환불 받기] (PW-2525 · history policy §2·§4·§6).
                            버튼은 결제 권한자에게만, 같은 결제에 처리 중인 다른 환불이 있으면 꺼짐 + 말풍선 */}
                        {approval && (
                          <>
                            <Badge color={APPROVAL_META.color} bg={APPROVAL_META.bg}>
                              {[labels.refundApprovalLabel, labels.refundReasons[approval.reason]].filter(Boolean).join(' · ')}
                            </Badge>
                            <span data-testid="billing-history-approval-note"
                              style={{ fontSize: 11, color: T.muted, maxWidth: 220, lineHeight: 1.5 }}>
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
                  // 영수증(카드매출전표) — 세금계산서 미발행(spec §5.1)
                  key: 'receipt',
                  header: labels.tableHeaders.receipt,
                  render: (inv) => {
                    const isReceiptDownloading = !!downloading[`${inv.id}_receipt`];
                    // 결제 뒤 전체환불로 취소된 청구서도 결제 때 받은 전표는 남긴다 — 환불 증빙도 그 전표다.
                    // [청구서] 자리는 «—» (screen-billing-history.policy §2 · pivit-work PW-2206)
                    const refundedVoid = inv.status === 'void' && !!inv.paid_at;
                    return inv.status === 'paid' || refundedVoid ? (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        {inv.status === 'paid' ? (
                          <Btn size="sm" kind="secondary"
                            disabled={isReceiptDownloading}
                            onClick={() => handleReceipt(inv)}>
                            {isReceiptDownloading ? labels.receiptDownloading : labels.receiptButton}
                          </Btn>
                        ) : (
                          <span style={{ color: T.muted }}>—</span>
                        )}
                        {/* 결제사(토스)가 발급한 공식 카드매출전표 — 주소가 없는 결제(개발용 가짜 결제)는 그리지 않는다 */}
                        {inv.pg_receipt_url && (
                          <Btn size="sm" kind="secondary" href={inv.pg_receipt_url}>
                            {labels.pgReceiptLink}
                          </Btn>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: T.muted }}>—</span>
                    );
                  },
                },
              ]}
            />
          )}
        </Card>

        {/* [환불 받기] 확인 창 — 공용 창 틀(ModalShell). body 직속 포털이라 왼쪽 메뉴까지 덮는다.
            겹침 순서는 같은 «결제·구독» 화면의 요금제 변경 확인 창과 같은 1000. 금액은 서버 값 그대로다(policy §5) */}
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
                <Button variant="secondary" disabled={receiveBusy} onClick={closeReceive}
                  data-testid="billing-receive-refund-cancel">
                  {labels.receiveModal.cancel}
                </Button>
                <Button variant="primary" disabled={receiveBusy}
                  onClick={() => { void confirmReceive(); }}
                  data-testid="billing-receive-refund-submit">
                  {receiveBusy
                    ? labels.receiveModal.busy
                    : receiveFailed ? labels.receiveModal.retry : labels.receiveModal.confirm}
                </Button>
              </>
            }
          >
            <div style={{ fontFamily: T.font }}>
              <Stack gap="xl">
                <div style={{ borderTop: '1px solid var(--border-secondary)', borderBottom: '1px solid var(--border-secondary)',
                  padding: 'var(--spacing-sm) 0' }}>
                  {[
                    [labels.receiveModal.invoiceNo, receiveTarget.inv.invoice_no],
                    [labels.receiveModal.paidAt, receiveTarget.inv.paid_at || '—'],
                    [labels.receiveModal.total, won(receiveTarget.inv.total)],
                    [labels.receiveModal.reason, labels.refundReasons[receiveTarget.approval.reason] || ''],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--spacing-xl)',
                      fontSize: 14, padding: 'var(--spacing-sm) 0' }}>
                      <span style={{ color: 'var(--text-tertiary)' }}>{label}</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right' }}>{value}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--spacing-xl)',
                    fontSize: 14, padding: 'var(--spacing-sm) 0' }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>{labels.receiveModal.amount}</span>
                    <span data-testid="billing-receive-refund-amount"
                      style={{ fontWeight: 800, color: 'var(--text-primary)', textAlign: 'right' }}>
                      {won(receiveTarget.approval.amount)}
                      <span style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)' }}>
                        {labels.receiveModal.vatNote(receiveTarget.approval.vat_amount)}
                      </span>
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
                  <div>{labels.receiveModal.pgNote}</div>
                  <div>{labels.receiveModal.subscriptionNote}</div>
                </div>
                {receiveFailed && (
                  <div role="alert" data-testid="billing-receive-refund-error"
                    style={{ fontSize: 13, color: 'var(--text-error-primary)' }}>
                    {labels.receiveModal.failed}
                  </div>
                )}
              </Stack>
            </div>
          </ModalShell>
        )}

      </div>
    </div>
  );
}
