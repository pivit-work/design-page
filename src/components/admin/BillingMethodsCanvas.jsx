import { useState } from 'react';

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

const DEFAULT_LABELS = {
  noPermTitle: '접근 권한이 없습니다',
  noPermDesc: '결제수단 관리는 Owner · billing_admin 전용입니다.',

  pageTitle: '결제수단 관리',
  addCard: '+ 카드 추가',
  pageSubtitle:
    '등록된 결제수단을 관리합니다. 카드 정보는 포트원 보안 결제를 통해 처리되며 PIVIT에 저장되지 않습니다.',

  pastDueTitle: '결제 실패',
  pastDueDesc: '새 카드를 등록하면 즉시 재결제됩니다. 결제 미완료 시 유료 기능이 잠금됩니다.',
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

function Btn({ children, onClick, kind = 'primary', disabled, title }) {
  const styles = {
    primary: { bg: T.accent, color: '#fff', border: 'transparent' },
    secondary: { bg: '#fff', color: T.text, border: T.border },
    danger: { bg: '#fff', color: T.red, border: '#FCA5A5' },
  }[kind];
  return (
    <button type="button" onClick={disabled ? undefined : onClick} disabled={disabled} title={title}
      style={{ fontFamily: T.font, fontSize: 14, fontWeight: 700,
        padding: '10px 18px', borderRadius: 10, cursor: disabled ? 'not-allowed' : 'pointer',
        background: styles.bg, color: styles.color, border: `1px solid ${styles.border}`,
        opacity: disabled ? 0.5 : 1 }}>
      {children}
    </button>
  );
}

function SkeletonCard() {
  return (
    <Card style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ width: 160, height: 16, background: T.bl, borderRadius: 6, marginBottom: 8 }} />
          <div style={{ width: 100, height: 13, background: T.bl, borderRadius: 6 }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ width: 80, height: 36, background: T.bl, borderRadius: 10 }} />
          <div style={{ width: 56, height: 36, background: T.bl, borderRadius: 10 }} />
        </div>
      </div>
    </Card>
  );
}

const isExpired = (card) => {
  if (card.status === 'expired') return true;
  if (card.expYear == null || card.expMonth == null) return false;
  const now = new Date();
  const expDate = new Date(card.expYear + 2000, card.expMonth - 1, 1);
  return expDate < new Date(now.getFullYear(), now.getMonth(), 1);
};

const expYear2 = (y) => String(y).slice(-2);

export default function BillingMethodsCanvas({
  cards = [],
  subscriptionStatus = 'free',
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

  // 권한 없음
  if (!canEdit) {
    return (
      <div style={{ fontFamily: T.font, background: T.bg, minHeight: '100vh', padding: 32 }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <Card style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.red, marginBottom: 8 }}>
              {labels.noPermTitle}
            </div>
            <div style={{ fontSize: 13, color: T.sub }}>{labels.noPermDesc}</div>
          </Card>
        </div>
      </div>
    );
  }

  const deleteTargetCard = deleteTarget ? cards.find((c) => c.id === deleteTarget) : null;

  return (
    <div style={{ fontFamily: T.font, background: T.bg, minHeight: '100vh', padding: 32, color: T.text }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{labels.pageTitle}</h1>
          <Btn onClick={onAddCard} disabled={addBusy}>{labels.addCard}</Btn>
        </div>
        <p style={{ color: T.sub, fontSize: 14, marginTop: 0, marginBottom: 24 }}>
          {labels.pageSubtitle}
        </p>

        {/* past_due 경고 배너 */}
        {subscriptionStatus === 'past_due' && (
          <Card style={{ marginBottom: 16, background: T.redBg, border: '1px solid #FCA5A5',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
            <div>
              <div style={{ fontWeight: 800, color: T.red, marginBottom: 4 }}>{labels.pastDueTitle}</div>
              <div style={{ fontSize: 13, color: T.text }}>{labels.pastDueDesc}</div>
            </div>
            <button type="button" onClick={onViewHistory}
              style={{ fontFamily: T.font, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
                padding: '8px 14px', borderRadius: 10, border: '1px solid #FCA5A5',
                background: '#fff', color: T.red, cursor: 'pointer' }}>
              {labels.viewHistory}
            </button>
          </Card>
        )}

        {/* 로딩 스켈레톤 */}
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : cards.length === 0 ? (
          /* 빈 상태 */
          <Card style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>💳</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{labels.emptyTitle}</div>
            <div style={{ fontSize: 13, color: T.sub, marginBottom: 20 }}>{labels.emptyDesc}</div>
            <Btn onClick={onAddCard} disabled={addBusy}>{labels.emptyAddCard}</Btn>
          </Card>
        ) : (
          /* 카드 목록 */
          <>
            {cards.map((card) => {
              const expired = isExpired(card);
              const blockDelete = !canDelete(card);
              return (
                <Card key={card.id} style={{ marginBottom: 12,
                  border: expired ? '1px solid #FDE68A' : `1px solid ${T.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      {/* 카드 브랜드·번호·배지 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 16, fontWeight: 800 }}>
                          {labels.cardDisplay(card.brand, card.last4)}
                        </span>
                        {card.isDefault && <Badge color={T.accent} bg="#EEF2FF">{labels.defaultBadge}</Badge>}
                        {expired && <Badge color={T.amber} bg={T.amberBg}>{labels.expiredBadge}</Badge>}
                      </div>
                      {/* 유효기간 */}
                      <div style={{ fontSize: 13, color: T.sub }}>
                        {labels.expLabel(`${String(card.expMonth).padStart(2, '0')}/${expYear2(card.expYear)}`)}
                        {expired && (
                          <span style={{ fontSize: 12, color: T.amber, marginLeft: 10 }}>
                            {labels.expiredHint}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 액션 버튼 */}
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      {!card.isDefault && !expired && (
                        <Btn kind="secondary" onClick={() => onSetDefault?.(card.id)}>{labels.setDefault}</Btn>
                      )}
                      <Btn kind="danger"
                        onClick={() => setDeleteTarget(card.id)}
                        disabled={blockDelete}
                        title={blockDelete ? labels.deleteBlockedTitle : undefined}>
                        {labels.deleteCard}
                      </Btn>
                    </div>
                  </div>
                </Card>
              );
            })}
          </>
        )}

        {/* 보안 안내 */}
        <div style={{ textAlign: 'center', fontSize: 12, color: T.muted, marginTop: 24 }}>
          {labels.securityNote}
        </div>

      </div>

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 16 }}>
          <Card style={{ maxWidth: 400, width: '100%' }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>{labels.deleteModalTitle}</div>
            <div style={{ fontSize: 14, color: T.sub, marginBottom: 20 }}>
              {labels.deleteModalDesc}
              {deleteTargetCard?.isDefault && (
                <span style={{ display: 'block', marginTop: 8, color: T.amber }}>
                  {labels.deleteModalDefaultWarning}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Btn kind="secondary" onClick={() => setDeleteTarget(null)}>{labels.cancel}</Btn>
              <Btn kind="danger" onClick={handleConfirmDelete}>{labels.confirmDelete}</Btn>
            </div>
          </Card>
        </div>
      )}

      {/* 결제창 처리 오버레이 (addState controlled prop) */}
      {addBusy && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: '28px 36px',
            fontSize: 15, fontWeight: 700, color: T.text }}>
            {addState === 'processing' ? labels.addProcessing : labels.addConfirming}
          </div>
        </div>
      )}
    </div>
  );
}
