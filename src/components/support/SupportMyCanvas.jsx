import Button from '../shared/Button.jsx';
import Chip from '../shared/Chip.jsx';
import EmptyState from '../shared/EmptyState.jsx';
import Icon from '../shared/Icon.jsx';
import { SkeletonList } from '../shared/Skeleton.jsx';
import TextArea from '../shared/TextArea.jsx';
import { AlertTriangleGlyph, InfoGlyph } from '../shared/lineIcons.jsx';
import { toneForStatus } from '../shared/statusBadgeTones.js';

const STAR_ICON = '/icons-solid/star-01.svg';

/** 별 하나 — 채운 별은 노란색, 빈 별은 옅은 회색. 색은 감싸는 요소의 color 로 준다. */
function Star({ filled, baseUrl, size = 28 }) {
  return (
    <span className={`sup-star-glyph${filled ? ' is-filled' : ''}`}>
      <Icon src={STAR_ICON} size={size} baseUrl={baseUrl} />
    </span>
  );
}

/**
 * SupportMyCanvas — 고객지원 「내 문의」 (`/support/my`, PW-1129).
 *
 * 무엇을 보여 주나는 pivit-specs `M. 고객지원/support-app.jsx` 의 `SupportMy`
 * (왼쪽 문의 목록 · 오른쪽 상세 — 메타 · 상태 흐름 · 대화 · 추가 답변 · 해결 확인 · 별점).
 * AI 흔적 표시(PW-1132)·파일 첨부(PW-548)는 다른 카드 몫이라 그리지 않는다.
 * 생김새는 알림 센터와 같은 화면 문법 — 머리 카드(.tl-page) · 공용 `Chip`(상태 딱지) ·
 * `EmptyState` · `SkeletonList` · `TextArea` · `Button`. prefix: sup-
 *
 * 문구·데이터는 전부 호출부가 준다. 상태 코드값(status)은 색을 고르는 데만 쓰고 글자는
 * 호출부가 준 라벨(statusLabel · steps[].label)만 찍는다.
 *
 * Props:
 *   baseUrl        정적 에셋 base path
 *   tickets        [{ id, number, title, categoryLabel, status, statusLabel, createdLabel, needsReply }]
 *   listState      'loading' | 'error' | 'ready'
 *   selectedId · onSelect(id)
 *   detail         null | { number, title, categoryLabel, assigneeLabel, createdLabel, reopenedLabel,
 *                           status, steps: [{ value, label }], notice, noticeTone: 'info'|'warning' }
 *   messages       [{ id, authorType: 'customer'|'operator'|'system', authorLabel, body, timeLabel }]
 *   threadState    'loading' | 'error' | 'ready' · onRetryThread()
 *   canReply       입력 칸을 그리나
 *   reply · onReplyChange(v) · onReplySend() · replySending · messageMaxLength
 *   showResolveActions · onResolve() · onReopen() · statusBusy
 *   rating         null | { value, submitted, busy } · onRatingChange(n) · onRatingSubmit()
 *   onRetry()      목록 다시 불러오기 · onNewTicket() 빈 목록의 [새 문의 작성]
 *   labels         { heading, listTitle, needsReply, empty, emptyAction, loadError, retry, selectPrompt,
 *                    metaCategory, metaAssignee, metaCreated, metaReopened, threadError,
 *                    replyPlaceholder, replySend, replyHint, resolveYes, resolveNo, resolvePrompt,
 *                    ratingTitle, ratingStars: string[5], ratingSubmit, ratingThanks }
 */
export default function SupportMyCanvas({
  baseUrl,
  tickets = [],
  listState = 'ready',
  selectedId = null,
  onSelect,
  onRetry,
  onNewTicket,
  detail = null,
  messages = [],
  threadState = 'ready',
  onRetryThread,
  canReply = false,
  reply = '',
  onReplyChange,
  onReplySend,
  replySending = false,
  messageMaxLength,
  showResolveActions = false,
  onResolve,
  onReopen,
  statusBusy = false,
  rating = null,
  onRatingChange,
  onRatingSubmit,
  labels = {},
}) {
  const canSend = reply.trim().length > 0 && !replySending;
  const sendReply = () => {
    if (canSend) onReplySend?.();
  };

  const renderList = () => {
    if (listState === 'loading') {
      return <SkeletonList count={3} height={84} data-testid="support-list-loading" />;
    }
    if (listState === 'error') {
      return (
        <EmptyState
          size="lg"
          icon={<Icon src="/icons-solid/alert-circle.svg" size={32} baseUrl={baseUrl} />}
          description={labels.loadError}
          actions={
            <Button variant="secondary" onClick={() => onRetry?.()} data-testid="support-retry">
              {labels.retry}
            </Button>
          }
          data-testid="support-list-error"
        />
      );
    }
    if (tickets.length === 0) {
      return (
        <EmptyState
          size="lg"
          icon={<Icon src="/icons-solid/inbox-01.svg" size={32} baseUrl={baseUrl} />}
          description={labels.empty}
          actions={
            <Button variant="primary" onClick={() => onNewTicket?.()} data-testid="support-empty-new">
              {labels.emptyAction}
            </Button>
          }
          data-testid="support-list-empty"
        />
      );
    }
    return null;
  };

  const listFallback = renderList();
  const currentStep = detail ? detail.steps?.findIndex((s) => s.value === detail.status) ?? -1 : -1;
  const detailStatusLabel = detail?.steps?.[currentStep]?.label;

  return (
    <main className="tl-page sup-page" data-testid="support-my">
      <div className="sup-header">
        <div className="sup-header-text">
          <h1 className="sup-title">{labels.heading}</h1>
        </div>
      </div>

      <div className="sup-body">
        {listFallback ?? (
          <div className="sup-split">
            {/* ── 왼쪽: 문의 목록 ── */}
            <section className="sup-card sup-list">
              <div className="sup-list-head">
                <span className="sup-list-title">{labels.listTitle}</span>
                <span className="sup-list-count">{tickets.length}</span>
              </div>
              <ul className="sup-list-rows">
                {tickets.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      className={`sup-row${t.id === selectedId ? ' is-active' : ''}`}
                      aria-current={t.id === selectedId ? 'true' : undefined}
                      onClick={() => onSelect?.(t.id)}
                      data-testid={`support-row-${t.id}`}
                    >
                      <span className="sup-row-top">
                        <span className="sup-row-cat">{t.categoryLabel}</span>
                        <span className="sup-row-badges">
                          {t.needsReply ? (
                            <Chip tone="warning" data-testid={`support-needs-reply-${t.id}`}>
                              {labels.needsReply}
                            </Chip>
                          ) : (
                            <Chip tone={toneForStatus(t.status)} data-status={t.status}>
                              {t.statusLabel}
                            </Chip>
                          )}
                        </span>
                      </span>
                      <span className={`sup-row-title${t.needsReply ? ' is-strong' : ''}`}>{t.title}</span>
                      <span className="sup-row-meta">
                        {t.number && <span className="sup-row-number">{t.number}</span>}
                        <span>{t.createdLabel}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            {/* ── 오른쪽: 상세 ── */}
            {!detail ? (
              <section className="sup-card sup-detail-empty">
                <EmptyState description={labels.selectPrompt} data-testid="support-select-prompt" />
              </section>
            ) : (
              <section className="sup-card sup-detail" data-testid="support-detail">
                <div className="sup-detail-head">
                  <div className="sup-detail-title-row">
                    <div className="sup-detail-title-text">
                      {detail.number && <span className="sup-detail-number">{detail.number}</span>}
                      <h2 className="sup-detail-title">{detail.title}</h2>
                    </div>
                    {detailStatusLabel && (
                      <Chip tone={toneForStatus(detail.status)} data-testid="support-detail-status">
                        {detailStatusLabel}
                      </Chip>
                    )}
                  </div>

                  <dl className="sup-meta">
                    <div className="sup-meta-item">
                      <dt>{labels.metaCategory}</dt>
                      <dd>{detail.categoryLabel}</dd>
                    </div>
                    <div className="sup-meta-item">
                      <dt>{labels.metaAssignee}</dt>
                      <dd>{detail.assigneeLabel}</dd>
                    </div>
                    <div className="sup-meta-item">
                      <dt>{labels.metaCreated}</dt>
                      <dd>{detail.createdLabel}</dd>
                    </div>
                    {detail.reopenedLabel && (
                      <div className="sup-meta-item" data-testid="support-reopened">
                        <dt>{labels.metaReopened}</dt>
                        <dd className="is-warning">{detail.reopenedLabel}</dd>
                      </div>
                    )}
                  </dl>

                  {detail.steps?.length > 0 && (
                    <ol className="sup-steps" data-testid="support-steps">
                      {detail.steps.map((s, i) => {
                        const state = i < currentStep ? 'done' : i === currentStep ? 'current' : 'todo';
                        return (
                          <li
                            key={s.value}
                            className={`sup-step is-${state}`}
                            data-state={state}
                            aria-current={state === 'current' ? 'step' : undefined}
                          >
                            <span className="sup-step-dot" aria-hidden="true" />
                            <span>{s.label}</span>
                          </li>
                        );
                      })}
                    </ol>
                  )}

                  {detail.notice && (
                    <div
                      className={`sup-notice ${detail.noticeTone === 'warning' ? 'is-warning' : 'is-info'}`}
                      data-testid="support-notice"
                      data-tone={detail.noticeTone === 'warning' ? 'warning' : 'info'}
                    >
                      {detail.noticeTone === 'warning' ? <AlertTriangleGlyph size={16} /> : <InfoGlyph size={16} />}
                      <span>{detail.notice}</span>
                    </div>
                  )}
                </div>

                {/* 대화 */}
                <div className="sup-thread" data-testid="support-thread">
                  {threadState === 'loading' && <SkeletonList count={3} height={56} />}
                  {threadState === 'error' && (
                    <div className="sup-thread-error" data-testid="support-thread-error">
                      <span>{labels.threadError}</span>
                      <Button variant="secondary" size="sm" onClick={() => onRetryThread?.()}>
                        {labels.retry}
                      </Button>
                    </div>
                  )}
                  {threadState === 'ready' &&
                    messages.map((m) => {
                      if (m.authorType === 'system') {
                        return (
                          <div key={m.id} className="sup-msg-system" data-testid={`support-msg-${m.id}`} data-author="system">
                            <span>{m.body}</span>
                          </div>
                        );
                      }
                      const mine = m.authorType === 'customer';
                      return (
                        <div
                          key={m.id}
                          className={`sup-msg ${mine ? 'is-mine' : 'is-operator'}`}
                          data-testid={`support-msg-${m.id}`}
                          data-author={m.authorType}
                        >
                          <span className="sup-msg-meta">
                            {m.authorLabel && <span className="sup-msg-author">{m.authorLabel}</span>}
                            {m.timeLabel && <time>{m.timeLabel}</time>}
                          </span>
                          <p className="sup-msg-bubble">{m.body}</p>
                        </div>
                      );
                    })}
                </div>

                {/* 아래쪽 동작 */}
                {(canReply || showResolveActions || rating) && (
                  <div className="sup-detail-foot">
                    {canReply && (
                      <div className="sup-reply">
                        <TextArea
                          value={reply}
                          onChange={(e) => onReplyChange?.(e.target.value)}
                          onKeyDown={(e) => {
                            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                              e.preventDefault();
                              sendReply();
                            }
                          }}
                          placeholder={labels.replyPlaceholder}
                          aria-label={labels.replyPlaceholder}
                          maxLength={messageMaxLength}
                          rows={4}
                          disabled={replySending}
                          data-testid="support-reply"
                        />
                        <div className="sup-reply-foot">
                          <span className="sup-reply-hint">{labels.replyHint}</span>
                          <Button
                            variant="primary"
                            onClick={sendReply}
                            disabled={!canSend}
                            pending={replySending}
                            data-testid="support-reply-send"
                          >
                            {labels.replySend}
                          </Button>
                        </div>
                      </div>
                    )}

                    {showResolveActions && (
                      <div className="sup-resolve">
                        {labels.resolvePrompt && <p className="sup-resolve-prompt">{labels.resolvePrompt}</p>}
                        <div className="sup-actions">
                          <Button
                            variant="primary"
                            onClick={() => onResolve?.()}
                            disabled={statusBusy}
                            data-testid="support-resolve-yes"
                          >
                            {labels.resolveYes}
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => onReopen?.()}
                            disabled={statusBusy}
                            data-testid="support-resolve-no"
                          >
                            {labels.resolveNo}
                          </Button>
                        </div>
                      </div>
                    )}

                    {rating && (
                      <div className="sup-rating" data-testid="support-rating">
                        {rating.submitted != null ? (
                          <div className="sup-rating-done" data-testid="support-rating-thanks">
                            <span className="sup-stars" aria-label={labels.ratingStars?.[rating.submitted - 1]}>
                              {Array.from({ length: rating.submitted }, (_, i) => (
                                <Star key={i} filled size={18} baseUrl={baseUrl} />
                              ))}
                            </span>
                            <span>{labels.ratingThanks}</span>
                          </div>
                        ) : (
                          <>
                            <p className="sup-rating-title">{labels.ratingTitle}</p>
                            <div className="sup-stars" role="group" aria-label={labels.ratingTitle}>
                              {[1, 2, 3, 4, 5].map((n) => (
                                <button
                                  key={n}
                                  type="button"
                                  className="sup-star"
                                  aria-label={labels.ratingStars?.[n - 1]}
                                  aria-pressed={rating.value === n}
                                  disabled={rating.busy}
                                  onClick={() => onRatingChange?.(n)}
                                  data-testid={`support-star-${n}`}
                                >
                                  <Star filled={rating.value != null && n <= rating.value} baseUrl={baseUrl} />
                                </button>
                              ))}
                            </div>
                            {rating.value != null && labels.ratingStars?.[rating.value - 1] && (
                              <p className="sup-rating-pick">{labels.ratingStars[rating.value - 1]}</p>
                            )}
                            <div className="sup-actions">
                              <Button
                                variant="primary"
                                onClick={() => onRatingSubmit?.()}
                                disabled={rating.value == null || rating.busy}
                                pending={rating.busy}
                                data-testid="support-rating-submit"
                              >
                                {labels.ratingSubmit}
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
