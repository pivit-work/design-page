import React from 'react';
import Button from '../shared/Button.jsx';
import Checkbox from '../shared/Checkbox.jsx';
import TextArea from '../shared/TextArea.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import { SkeletonList } from '../shared/Skeleton.jsx';
import EmptyState from '../shared/EmptyState.jsx';

/**
 * 조직 변경 승인 — 승인자 화면 (PW-2597 · screen-org-change-approval.policy.md).
 *
 * 그리기만 한다. 글은 전부 앱이 지어(t()) 넘긴다 — 상태 · 버튼 이름 · 처리 결과 줄. 생김새의 원본은
 * `org-change-approval.css` 머리 주석의 대응표(고객지원 머리 · 리마인더 발송 기록 카드 · 발령 이력 사유 상자).
 *
 * props
 * - labels: { title, subtitle, pendingTitle, doneTitle, emptyTitle, emptyDesc, nonePending, loadError, retry, reasonLabel, reasonPlaceholder, notMine }
 * - state: 'loading' | 'error' | 'ready'
 * - notMine: 링크로 연 요청이 내 것이 아님 — 그 자리에 문구만(내용 없음)
 * - pending · done: 카드 목록 (아래 Card)
 * Card: { id, open, title, meta, badge: { text, tone }, count?, badges?, lines: Line[], reason?, result?, error?,
 *         rejecting, reasonValue, reasonInvalid, actions: [{ key, label, variant, disabled, pending, testId }] }
 * Line: { id, title, notes: string[], people?: string[], moreLabel?, rejectLabel?, rejectChecked?, rejected?, closedText? }
 * badges: [{ text, tone }] — 있으면 badge · count 대신 이 배지들을 나란히(처리함의 일부 승인 · 일부 거절 묶음 «승인 {A}명» · «거절 {R}명»)
 * 핸들러: onToggle(cardId) · onAction(cardId, key) · onReasonChange(cardId, text) · onToggleReject(cardId, lineId) ·
 *        onMore(cardId, lineId) · onRetry()
 */
export default function OrgChangeApprovalCanvas({
  labels = {},
  state = 'ready',
  notMine = false,
  pending = [],
  done = [],
  onToggle,
  onAction,
  onReasonChange,
  onToggleReject,
  onMore,
  onRetry,
}) {
  const header = (
    <div className="oca-header">
      <div className="oca-header-text">
        <h1 className="oca-title">{labels.title}</h1>
        <p className="oca-sub">{labels.subtitle}</p>
      </div>
    </div>
  );

  if (state === 'loading') {
    return (
      <main className="tl-page" data-testid="oca-page">
        {header}
        <div className="oca-body" data-testid="oca-loading">
          <SkeletonList count={2} height={88} gap={8} />
        </div>
      </main>
    );
  }
  if (state === 'error') {
    return (
      <main className="tl-page" data-testid="oca-page">
        {header}
        <div className="oca-body">
          <EmptyState
            title={labels.loadError}
            actions={
              <Button variant="secondary" onClick={() => onRetry?.()} data-testid="oca-retry">
                {labels.retry}
              </Button>
            }
          />
        </div>
      </main>
    );
  }
  const nothing = pending.length === 0 && done.length === 0;
  return (
    <main className="tl-page" data-testid="oca-page">
      {header}
      <div className="oca-body">
        {notMine && (
          <section className="oca-section" data-testid="oca-not-mine">
            <p className="oca-section-empty">{labels.notMine}</p>
          </section>
        )}
        {nothing && !notMine ? (
          <EmptyState title={labels.emptyTitle} description={labels.emptyDesc} data-testid="oca-empty" />
        ) : (
          <>
            <section className="oca-section" data-testid="oca-pending">
              <h2 className="oca-section-title">{labels.pendingTitle}</h2>
              {pending.length === 0 ? (
                <p className="oca-section-empty" data-testid="oca-none-pending">{labels.nonePending}</p>
              ) : (
                pending.map((card) => (
                  <RequestCard key={card.id} card={card} labels={labels}
                    onToggle={onToggle} onAction={onAction} onReasonChange={onReasonChange}
                    onToggleReject={onToggleReject} onMore={onMore} />
                ))
              )}
            </section>
            {done.length > 0 && (
              <section className="oca-section" data-testid="oca-done">
                <h2 className="oca-section-title">{labels.doneTitle}</h2>
                {done.map((card) => (
                  <RequestCard key={card.id} card={card} labels={labels}
                    onToggle={onToggle} onAction={onAction} onReasonChange={onReasonChange}
                    onToggleReject={onToggleReject} onMore={onMore} />
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function RequestCard({ card, labels, onToggle, onAction, onReasonChange, onToggleReject, onMore }) {
  const actions = card.actions ?? [];
  return (
    <div className="oca-card" data-testid={`oca-card-${card.id}`}>
      <Button className="oca-card-head" aria-expanded={!!card.open}
        onClick={() => onToggle?.(card.id)} data-testid={`oca-card-toggle-${card.id}`}>
        <span className="oca-card-title">{card.title}</span>
        {card.meta && <span className="oca-card-meta">{card.meta}</span>}
        {card.badges?.length ? (
          card.badges.map((b) => (
            <StatusBadge key={b.text} tone={b.tone}>{b.text}</StatusBadge>
          ))
        ) : (
          <>
            {card.badge && (
              <StatusBadge tone={card.badge.tone}>{card.badge.text}</StatusBadge>
            )}
            {card.count && <span className="oca-card-meta">{card.count}</span>}
          </>
        )}
        <span className={`oca-card-chevron${card.open ? ' is-open' : ''}`} aria-hidden="true">›</span>
      </Button>
      {card.open && (
        <div className="oca-card-body">
          {card.lines.map((line) => (
            <div key={line.id}
              className={`oca-line${line.rejected ? ' is-rejected' : ''}${line.closedText ? ' is-closed' : ''}`}
              data-testid={`oca-line-${line.id}`}>
              <div className="oca-line-head">
                <div className="oca-line-main">
                  <div className="oca-line-title">{line.title}</div>
                  {(line.notes ?? []).map((n) => (
                    <div key={n} className="oca-line-note">{n}</div>
                  ))}
                  {line.people?.length > 0 && (
                    <ul className="oca-people">
                      {line.people.map((p) => <li key={p}>{p}</li>)}
                    </ul>
                  )}
                  {line.moreLabel && (
                    <Button variant="ghost" size="sm" onClick={() => onMore?.(card.id, line.id)}
                      data-testid={`oca-more-${line.id}`}>{line.moreLabel}</Button>
                  )}
                  {line.closedText && <div className="oca-line-note">{line.closedText}</div>}
                </div>
                {line.rejectLabel && (
                  <Checkbox label={line.rejectLabel} checked={!!line.rejectChecked}
                    onChange={() => onToggleReject?.(card.id, line.id)}
                    data-testid={`oca-reject-${line.id}`} />
                )}
              </div>
            </div>
          ))}
          {card.reason && (
            <>
              <div className="oca-reason-label">{labels.reasonLabel}</div>
              <div className="oca-reason">{card.reason}</div>
            </>
          )}
          {card.rejecting && (
            <TextArea value={card.reasonValue ?? ''} placeholder={labels.reasonPlaceholder}
              invalid={!!card.reasonInvalid} rows={3}
              onChange={(e) => onReasonChange?.(card.id, e.target.value)}
              data-testid={`oca-reject-reason-${card.id}`} />
          )}
          {card.result ? (
            <p className="oca-result" data-testid={`oca-result-${card.id}`}>{card.result}</p>
          ) : actions.length > 0 ? (
            <div className="oca-actions">
              {actions.map((a) => (
                <Button key={a.key} variant={a.variant} disabled={a.disabled} pending={a.pending}
                  pendingLabel={a.pendingLabel} onClick={() => onAction?.(card.id, a.key)} data-testid={a.testId}>
                  {a.label}
                </Button>
              ))}
            </div>
          ) : null}
          {card.error && <p className="oca-error" data-testid={`oca-error-${card.id}`}>{card.error}</p>}
        </div>
      )}
    </div>
  );
}
