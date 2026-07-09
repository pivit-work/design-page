import { useState } from 'react';

// ─────────────────────────────────────────────────────────────
// 결제·구독 — 청구 내역·영수증(카드매출전표) (BillingHistoryCanvas)  /admin/billing/history
// pivit-specs 의 billing-history.jsx 시안을 design-page 정본으로 포팅.
//
// 세금계산서 미발행(spec §5.1) — 증빙은 영수증(카드매출전표)뿐.
// 데이터·라벨은 모두 props 로 받는다 (page wrapper 가 fetch·매핑·i18n·다운로드를
// 소유). 캔버스는 인라인 스타일로 자기 완결적으로 렌더한다.
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

const DEFAULT_LABELS = {
  viewOnly: '조회 전용',
  pageTitle: '청구 내역',
  pageSubtitle:
    '워크스페이스의 청구서와 영수증(카드매출전표)을 확인하고 다운로드합니다. 세금계산서는 발행하지 않습니다.',

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
  partialRefundNote: '부분취소 전표(차액) 발급',
  voidNote: '취소됨',

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
    refundLabels: { ...DEFAULT_LABELS.refundLabels, ...(provided.refundLabels || {}) },
    refundReasons: { ...DEFAULT_LABELS.refundReasons, ...(provided.refundReasons || {}) },
    filterTabs: { ...DEFAULT_LABELS.filterTabs, ...(provided.filterTabs || {}) },
    tableHeaders: { ...DEFAULT_LABELS.tableHeaders, ...(provided.tableHeaders || {}) },
  };
}

const STATUS_META = {
  paid: { color: T.green, bg: T.greenBg },
  open: { color: T.amber, bg: T.amberBg },
  void: { color: T.sub, bg: T.bl },
  uncollectible: { color: T.red, bg: T.redBg },
};

// 환불(Refund) 배지 메타 — cancellation-refund-policy.md §9
const REFUND_META = {
  completed_full: { color: T.sub, bg: T.bl },
  completed_partial: { color: T.accent, bg: '#EEF2FF' },
  processing: { color: T.amber, bg: T.amberBg },
  failed: { color: T.red, bg: T.redBg },
};
const refundMetaKey = (r) =>
  r.status === 'completed' ? `completed_${r.type}` : r.status;

const FILTER_TABS = [
  { key: 'all', statuses: null, labelKey: 'all' },
  { key: 'paid', statuses: ['paid'], labelKey: 'paid' },
  { key: 'open', statuses: ['open'], labelKey: 'open' },
  { key: 'failed', statuses: ['void', 'uncollectible'], labelKey: 'failed' },
];

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

function Btn({ children, onClick, kind = 'primary', disabled, size = 'md' }) {
  const styles = {
    primary: { bg: T.accent, color: '#fff', border: 'transparent' },
    secondary: { bg: '#fff', color: T.text, border: T.border },
    ghost: { bg: 'transparent', color: T.accent, border: 'transparent' },
    danger: { bg: '#fff', color: T.red, border: '#FCA5A5' },
  }[kind];
  const pad = size === 'sm' ? '6px 12px' : '10px 18px';
  const fz = size === 'sm' ? 13 : 14;
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
}) {
  const labels = mergeLabels(providedLabels);
  const [filterKey, setFilterKey] = useState('all');
  const [downloading, setDownloading] = useState({}); // { [invoiceId_receipt]: true }

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
              <div style={{ fontSize: 36, marginBottom: 12 }}>🧾</div>
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
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.bl }}>
                  {[
                    labels.tableHeaders.invoiceNo,
                    labels.tableHeaders.period,
                    labels.tableHeaders.seats,
                    labels.tableHeaders.amount,
                    labels.tableHeaders.status,
                    labels.tableHeaders.receipt,
                  ].map((h) => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left',
                      fontWeight: 700, fontSize: 13, color: T.sub, whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv, idx) => {
                  const sm = STATUS_META[inv.status] || STATUS_META.void;
                  const statusLabel = labels.statusLabels[inv.status] || inv.status;
                  const receiptKey = `${inv.id}_receipt`;
                  const isReceiptDownloading = !!downloading[receiptKey];

                  return (
                    <tr key={inv.id}
                      style={{ borderBottom: idx < filteredInvoices.length - 1 ? `1px solid ${T.border}` : 'none',
                        background: '#fff' }}>

                      {/* 청구번호 */}
                      <td style={{ padding: '14px 16px', fontFamily: T.mono, fontSize: 13, color: T.sub }}>
                        {inv.invoice_no}
                      </td>

                      {/* 청구 기간 */}
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        {inv.period_start} ~ {inv.period_end}
                      </td>

                      {/* 좌석 수 */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        {labels.seatsUnit(inv.seat_count_snapshot)}
                      </td>

                      {/* 금액 (+ 환불액 라인) */}
                      <td style={{ padding: '14px 16px', fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {won(inv.total)}
                        {inv.status === 'void' && (
                          <span style={{ fontSize: 12, color: T.sub, marginLeft: 6 }}>{labels.voidNote}</span>
                        )}
                        {inv.refund && (
                          <div style={{ fontSize: 12, fontWeight: 600, color: T.accent, marginTop: 2 }}>
                            {labels.refundAmount(inv.refund.amount)}
                          </div>
                        )}
                      </td>

                      {/* 상태 배지 (+ 환불 배지) */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                          <Badge color={sm.color} bg={sm.bg}>{statusLabel}</Badge>
                          {inv.refund && (() => {
                            const rm = REFUND_META[refundMetaKey(inv.refund)] || REFUND_META.processing;
                            const rl = labels.refundLabels[refundMetaKey(inv.refund)] || '';
                            return (
                              <Badge color={rm.color} bg={rm.bg}>
                                {rl} · {labels.refundReasons[inv.refund.reason] || inv.refund.reason}
                              </Badge>
                            );
                          })()}
                          {inv.refund?.type === 'partial' && (
                            <span style={{ fontSize: 11, color: T.muted }}>{labels.partialRefundNote}</span>
                          )}
                        </div>
                      </td>

                      {/* 영수증(카드매출전표) — 세금계산서 미발행(spec §5.1) */}
                      <td style={{ padding: '14px 16px' }}>
                        {inv.status === 'paid' ? (
                          <Btn size="sm" kind="secondary"
                            disabled={isReceiptDownloading}
                            onClick={() => handleReceipt(inv)}>
                            {isReceiptDownloading ? labels.receiptDownloading : labels.receiptButton}
                          </Btn>
                        ) : (
                          <span style={{ fontSize: 13, color: T.muted }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>

      </div>
    </div>
  );
}
