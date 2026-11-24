import { useState } from 'react';
import ConfirmModal from '../shared/ConfirmModal.jsx';
import Tooltip from '../shared/Tooltip.jsx';
import Button from '../shared/Button.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import Skeleton from '../shared/Skeleton.jsx';
import Spinner from '../shared/Spinner.jsx';
import { AlertTriangleGlyph, CreditCardGlyph } from '../shared/lineIcons.jsx';
import { Panel } from '../frames/index.js';
import { BillingNotice, BillingPage, BillingPageHead } from './kit/BillingSurface.jsx';
import { BILLING_PAGE_WIDTH } from './kit/billingPageWidth.js';

// ─────────────────────────────────────────────────────────────
// 결제·구독 — 결제수단 관리 (BillingMethodsCanvas)  /admin/billing/methods
// pivit-specs 의 billing-methods.jsx 시안을 design-page 정본으로 포팅.
//
// 카드 목록·구독 상태·addState 는 모두 props 로 받는다 (page wrapper 가 fetch·
// PG 결제창·서버 확정·목록 갱신·i18n 을 소유). 캔버스는 인라인 스타일로 자기
// 완결적으로 렌더하며, 사용자 액션은 콜백(onAddCard/onSetDefault/onDelete/
// onViewHistory)으로만 위임한다. 낙관적 업데이트·로컬 mutate·데모 시나리오 없음.
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

const DEFAULT_LABELS = {
  noPermTitle: '접근 권한이 없습니다',
  noPermDesc: '결제수단 관리는 Owner · billing_admin 전용입니다.',

  pageTitle: '결제수단 관리',
  addCard: '+ 카드 추가',
  pageSubtitle:
    '등록된 결제수단을 관리합니다. 카드 정보는 포트원 보안 결제를 통해 처리되며 PIVIT에 저장되지 않습니다.',

  pastDueTitle: '결제 실패',
  pastDueDesc: '새 카드를 등록하면 결제되지 않은 청구서 1건이 바로 결제되고, 결제한 날이 새 청구일이 됩니다. 결제 미완료 시 유료 기능이 잠금됩니다.',
  arrearsTitle: '결제되지 않은 청구서가 있습니다',
  arrearsDesc: (billedOn, amount) =>
    `새 카드를 등록하면 ${billedOn} 청구 ₩${Number(amount).toLocaleString('ko-KR')}(부가세 포함)이 바로 결제됩니다. 결제해도 구독은 Free 그대로이고, 그 뒤 플랜 화면에서 요금제를 고르실 수 있습니다.`,
  viewHistory: '청구 내역 보기',

  emptyTitle: '등록된 결제수단이 없습니다',
  emptyDesc: '카드를 등록하면 유료 플랜 구독 및 자동 결제에 사용됩니다.',
  emptyAddCard: '카드 추가',

  cardDisplay: (brand, last4) => `${brand} ···· ${last4}`,
  defaultBadge: '기본',
  expiredBadge: '만료',
  expLabel: (exp) => `유효기간 ${exp}`,
  expiredHint: '새 카드를 등록하고 이 카드를 삭제하세요',
  setDefault: '기본으로 설정',
  deleteCard: '삭제',
  deleteBlockedTitle: '결제수단이 최소 1개 필요합니다 — 새 카드를 먼저 등록하세요',

  securityNote:
    '🔒 포트원 보안 결제 · 카드 원본번호는 PIVIT에 저장되지 않습니다 (PG 토큰만 보관)',

  deleteModalTitle: '결제수단을 삭제할까요?',
  deleteModalDesc:
    '삭제한 카드는 복구할 수 없으며, 등록된 빌링키도 함께 삭제됩니다.',
  deleteModalDefaultWarning: '기본 결제수단을 삭제하면 다른 카드가 기본으로 자동 지정됩니다.',
  cancel: '취소',
  confirmDelete: '삭제',

  addProcessing: '결제창을 여는 중...',
  addConfirming: '결제 확인 중... (잠시 기다려 주세요)',
};

function mergeLabels(provided) {
  if (!provided) return DEFAULT_LABELS;
  return { ...DEFAULT_LABELS, ...provided };
}

// onClick 이 돌려주는 약속(Promise)은 Button 에 넘기지 않는다 — 넘기면 Button 이 글자를 감추고 도는 표시만 띄워,
// 화면이 직접 바꾸는 «다운로드 중…»·«카드 인증 창을 여는 중...» 같은 진행 글자가 안 보인다(기획서가 글자로 정함).
const fireOnly = (onClick) => (onClick ? (e) => { onClick(e); } : undefined);
// 버튼은 공용 Button(디자이너 어드민 버튼과 같은 값)으로 그린다 (pivit-work PW-2938). 손으로 칠한 값을 두지 않는다.
// 설명(꺼진 이유)은 공용 말풍선으로 — 꺼진 버튼이면 부품이 바깥을 둘러 거기서 받는다 (PW-1123)
// [삭제](danger)는 확인 창을 먼저 여는 자리라 흰 바탕 빨간 테두리(danger-ghost) — 전과 같은 생김새.
// 줄 안 버튼은 작게(sm) — 디자이너 조직도 명단 줄 버튼(button.css sm) (pivit-work PW-3132).
function Btn({ children, onClick, kind = 'primary', disabled, title, size }) {
  return (
    <Tooltip content={title}>
      <Button variant={kind === 'danger' ? 'danger-ghost' : kind} size={size} onClick={fireOnly(onClick)} disabled={disabled}>
        {children}
      </Button>
    </Tooltip>
  );
}

/*
 * 다시 칠하기 (pivit-work PW-3132) — 카드마다 흰 판 한 장(8장이면 1,000px)이던 목록을 흰 판(`Panel`) 하나 안 줄 목록으로.
 * 줄 = 카드 아이콘 · 카드 이름(14/20 굵게) + 딱지 · 유효기간(12/18 흐림) · 오른쪽 작은 버튼. 줄 사이 가는 선(`--border-secondary`)은
 * 판 안 구역 선(`Panel.Section`)과 같은 선 — 디자이너 조직도 명단 줄 모양을 따른다. 시안 worklog/admin-billing-designer-2026-11-19 ㉙.
 */
const LIST_STYLE = { display: 'flex', flexDirection: 'column', minWidth: 0 };
const ROW_STYLE = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--spacing-lg)',
  padding: 'var(--spacing-lg) 0',
  minWidth: 0,
};
const ROW_LINE_STYLE = { borderTop: '1px solid var(--border-secondary)' };
const ROW_FIRST_STYLE = { paddingTop: 0 };
const ROW_LAST_STYLE = { paddingBottom: 0 };
const rowStyle = (i, n) => ({
  ...ROW_STYLE,
  ...(i > 0 ? ROW_LINE_STYLE : ROW_FIRST_STYLE),
  ...(i === n - 1 ? ROW_LAST_STYLE : null),
});
const ROW_ICON_STYLE = { display: 'flex', flex: 'none', color: 'var(--text-tertiary)' };
const ROW_TEXT_STYLE = { flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xxs)' };
const ROW_NAME_STYLE = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--spacing-md)',
  minWidth: 0,
  fontSize: 'var(--font-size-text-sm)',
  lineHeight: 'var(--line-height-text-sm)',
  fontWeight: 600,
  color: 'var(--text-primary)',
  whiteSpace: 'nowrap',
};
const ROW_SUB_STYLE = {
  fontSize: 'var(--font-size-text-xs)',
  lineHeight: 'var(--line-height-text-xs)',
  color: 'var(--text-tertiary)',
};
const ROW_EXPIRED_HINT_STYLE = { color: 'var(--text-warning-primary)', marginLeft: 'var(--spacing-md)' };
const ROW_ACTIONS_STYLE = { flex: 'none', display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' };

/** 빈 화면 — 판 가운데 아이콘 + 안내 + [카드 추가]. 모양은 전과 같다(시안 ㉜ «그대로»). */
const EMPTY_STYLE = { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 'var(--spacing-md)' };
const EMPTY_ICON_STYLE = { display: 'flex', color: 'var(--text-tertiary)', marginBottom: 'var(--spacing-md)' };
const EMPTY_TITLE_STYLE = { fontSize: 'var(--font-size-text-md)', lineHeight: 'var(--line-height-text-md)', fontWeight: 700, color: 'var(--text-primary)' };
const EMPTY_DESC_STYLE = { fontSize: 'var(--font-size-text-sm)', lineHeight: 'var(--line-height-text-sm)', color: 'var(--text-tertiary)', marginBottom: 'var(--spacing-lg)' };

/** 보안 안내 한 줄 — 가운데 12px 흐린 글(시안 ㉝ «그대로»). */
const SECURITY_NOTE_STYLE = {
  textAlign: 'center',
  fontSize: 'var(--font-size-text-xs)',
  lineHeight: 'var(--line-height-text-xs)',
  color: 'var(--text-tertiary)',
};

/** 불러오는 중 — 한 판 안 줄 둘(카드 이름 · 유효기간 막대 + 버튼 자리 막대). */
function SkeletonRows() {
  return (
    <div style={LIST_STYLE}>
      {[0, 1].map((i) => (
        <div key={i} style={rowStyle(i, 2)}>
          <div style={ROW_TEXT_STYLE}>
            <Skeleton width={160} height={16} radius={6} />
            <Skeleton width={100} height={13} radius={6} />
          </div>
          <div style={ROW_ACTIONS_STYLE}>
            <Skeleton width={80} height={32} radius={8} />
            <Skeleton width={56} height={32} radius={8} />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 결제 실패 띠의 글을 «설명 / 덧붙임(흐림)»으로 나눈다 — 글은 그대로, 마지막 문장만 다음 줄(시안 ㉚
 * «결제 미완료 시 …» 흐림). 한 문장뿐이면 나누지 않는다.
 */
function splitLastSentence(text) {
  if (typeof text !== 'string') return { lines: [text], fix: [] };
  const parts = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (parts.length < 2) return { lines: [text], fix: [] };
  return { lines: [parts.slice(0, -1).join(' ')], fix: [parts[parts.length - 1]] };
}

// 결제사가 유효기간을 안 알려 주는 카드(토스 자동결제 등록)는 expMonth 가 비거나 0 이다 —
// 그때는 유효기간 줄을 그리지 않고, 만료로도 보지 않는다.
const hasExp = (card) =>
  card.expYear != null && Number.isInteger(card.expMonth) && card.expMonth >= 1 && card.expMonth <= 12;

const isExpired = (card) => {
  if (card.status === 'expired') return true;
  if (!hasExp(card)) return false;
  const now = new Date();
  const expDate = new Date(card.expYear + 2000, card.expMonth - 1, 1);
  return expDate < new Date(now.getFullYear(), now.getMonth(), 1);
};

const expYear2 = (y) => String(y).slice(-2);

export default function BillingMethodsCanvas({
  cards = [],
  subscriptionStatus = 'free',
  /** 미납이 남은 해지 회사 (pivit-work PW-2526) — `{ billedOn, amount }`. 있으면 미납 띠를 그린다. */
  arrears = null,
  loading = false,
  addState = 'idle',
  canEdit = true,
  labels: providedLabels,
  onAddCard,
  onSetDefault,
  onDelete,
  onViewHistory,
}) {
  const labels = mergeLabels(providedLabels);
  const [deleteTarget, setDeleteTarget] = useState(null); // 삭제 확인 모달 대상 card id (null=닫힘)

  const hasActiveSub = subscriptionStatus === 'active' || subscriptionStatus === 'past_due';
  const addBusy = addState === 'processing' || addState === 'confirming';

  // 마지막 1개 카드 + active/past_due 구독 시 삭제 차단
  const canDelete = (card) => {
    void card;
    if (cards.length === 1 && hasActiveSub) return false;
    return true;
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    onDelete?.(deleteTarget);
    setDeleteTarget(null);
  };

  // 권한 없음 — 빨간 상태 띠 하나(시안 공통 «빨강 상태 상자 → 상태 띠»)
  if (!canEdit) {
    return (
      <BillingPage width={BILLING_PAGE_WIDTH.methods}>
        <BillingNotice tone="bad" icon={<AlertTriangleGlyph size={16} />} title={labels.noPermTitle} lines={[labels.noPermDesc]} />
      </BillingPage>
    );
  }

  const deleteTargetCard = deleteTarget ? cards.find((c) => c.id === deleteTarget) : null;
  const pastDue = splitLastSentence(labels.pastDueDesc);

  return (
    <>
      <BillingPage width={BILLING_PAGE_WIDTH.methods}>
        <BillingPageHead
          title={labels.pageTitle}
          description={[labels.pageSubtitle]}
          actions={<Btn onClick={onAddCard} disabled={addBusy}>{labels.addCard}</Btn>}
        />

        {/* past_due 결제 실패 띠 — 머리 / 설명 / «결제 미완료 시 …» 흐림 (시안 ㉚) */}
        {subscriptionStatus === 'past_due' && (
          <BillingNotice
            tone="bad"
            testId="billing-methods-past-due"
            icon={<AlertTriangleGlyph size={16} />}
            title={labels.pastDueTitle}
            lines={pastDue.lines}
            fix={pastDue.fix}
            actions={<Btn kind="danger" size="sm" onClick={onViewHistory}>{labels.viewHistory}</Btn>}
          />
        )}

        {/* 미납 띠 (pivit-work PW-2526) — 해지됐지만 결제되지 않은 청구서가 남음. 결제 실패 띠와 같은 모양 */}
        {arrears && (
          <BillingNotice
            tone="bad"
            testId="billing-methods-arrears"
            icon={<AlertTriangleGlyph size={16} />}
            title={labels.arrearsTitle}
            lines={[labels.arrearsDesc(arrears.billedOn, arrears.amount)]}
            actions={<Btn kind="secondary" size="sm" onClick={onViewHistory}>{labels.viewHistory}</Btn>}
          />
        )}

        {loading ? (
          <Panel testId="billing-methods-list">
            <SkeletonRows />
          </Panel>
        ) : cards.length === 0 ? (
          /* 빈 상태 */
          <Panel testId="billing-methods-empty">
            <div style={EMPTY_STYLE}>
              <div style={EMPTY_ICON_STYLE}><CreditCardGlyph size={40} /></div>
              <div style={EMPTY_TITLE_STYLE}>{labels.emptyTitle}</div>
              <div style={EMPTY_DESC_STYLE}>{labels.emptyDesc}</div>
              <Btn onClick={onAddCard} disabled={addBusy}>{labels.emptyAddCard}</Btn>
            </div>
          </Panel>
        ) : (
          /* 카드 목록 — 흰 판 하나 안 줄 목록 */
          <Panel testId="billing-methods-list">
            <ul style={{ ...LIST_STYLE, listStyle: 'none', margin: 0, padding: 0 }}>
              {cards.map((card, i) => {
                const expired = isExpired(card);
                const blockDelete = !canDelete(card);
                return (
                  <li key={card.id} data-testid="billing-method-row" style={rowStyle(i, cards.length)}>
                    <span aria-hidden="true" style={ROW_ICON_STYLE}><CreditCardGlyph size={20} /></span>
                    <div style={ROW_TEXT_STYLE}>
                      {/* 카드 브랜드·번호·딱지 */}
                      <div style={ROW_NAME_STYLE}>
                        <span>{labels.cardDisplay(card.brand, card.last4)}</span>
                        {card.isDefault && <StatusBadge tone="accent" className="ono-done-badge">{labels.defaultBadge}</StatusBadge>}
                        {expired && <StatusBadge tone="warning" className="ono-done-badge">{labels.expiredBadge}</StatusBadge>}
                      </div>
                      {/* 유효기간 — 모르면 줄째 생략 (만료 안내만 있으면 그것만) */}
                      {(hasExp(card) || expired) && (
                        <div style={ROW_SUB_STYLE}>
                          {hasExp(card) && labels.expLabel(`${String(card.expMonth).padStart(2, '0')}/${expYear2(card.expYear)}`)}
                          {expired && <span style={hasExp(card) ? ROW_EXPIRED_HINT_STYLE : { color: 'var(--text-warning-primary)' }}>{labels.expiredHint}</span>}
                        </div>
                      )}
                      {/* [삭제]가 꺼진 까닭 — 마우스를 올리지 않아도 줄 안에서 읽힌다(툴팁은 그대로). 유효기간 줄과 같은 12/18 흐린 글
                          (pivit-work PW-3159 · screen-billing-methods §4 «[삭제] 버튼(차단 상태) … + 카드 내 인라인 안내 텍스트») */}
                      {blockDelete && (
                        <div data-testid="billing-method-delete-blocked-hint" style={ROW_SUB_STYLE}>{labels.deleteBlockedTitle}</div>
                      )}
                    </div>

                    {/* 줄 버튼 — 작게 */}
                    <div style={ROW_ACTIONS_STYLE}>
                      {!card.isDefault && !expired && (
                        <Btn kind="secondary" size="sm" onClick={() => onSetDefault?.(card.id)}>{labels.setDefault}</Btn>
                      )}
                      <Btn kind="danger" size="sm"
                        onClick={() => setDeleteTarget(card.id)}
                        disabled={blockDelete}
                        title={blockDelete ? labels.deleteBlockedTitle : undefined}>
                        {labels.deleteCard}
                      </Btn>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>
        )}

        {/* 보안 안내 */}
        <div style={SECURITY_NOTE_STYLE}>
          {labels.securityNote}
        </div>
      </BillingPage>

      {/* 삭제 확인 창 — 공용 확인 창(ConfirmModal · PW-836) */}
      {deleteTarget && (
        <ConfirmModal
          testId="billing-method-delete-confirm"
          title={labels.deleteModalTitle}
          body={
            <>
              {labels.deleteModalDesc}
              {deleteTargetCard?.isDefault && (
                <span style={{ display: 'block', marginTop: 'var(--spacing-md)', color: 'var(--text-warning-primary)' }}>
                  {labels.deleteModalDefaultWarning}
                </span>
              )}
            </>
          }
          cancelLabel={labels.cancel}
          confirmLabel={labels.confirmDelete}
          danger
          zIndex={1000}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      )}

      {/* 결제창 처리 오버레이 (addState controlled prop) */}
      {addBusy && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: '28px 36px',
            fontSize: 15, fontWeight: 700, color: T.text }}>
            <span className="dp-busy-inline"><Spinner size={16} />{addState === 'processing' ? labels.addProcessing : labels.addConfirming}</span>
          </div>
        </div>
      )}
    </>
  );
}
