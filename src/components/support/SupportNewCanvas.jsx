import Button from '../shared/Button.jsx';
import Chip from '../shared/Chip.jsx';
import FormField from '../shared/FormField.jsx';
import TextArea from '../shared/TextArea.jsx';
import TextInput from '../shared/TextInput.jsx';
import Spinner from '../shared/Spinner.jsx';
import {
  AlertTriangleGlyph,
  ArrowRightGlyph,
  CheckGlyph,
  SparkleGlyph,
} from '../shared/lineIcons.jsx';

/**
 * SupportNewCanvas — 고객지원 「문의하기」 (`/support/new`, PW-1129).
 *
 * 무엇을 보여 주나는 pivit-specs `M. 고객지원/support-app.jsx` 의 `SupportNew`
 * (보내는 회사·요금제 · 문의 유형 칩 + 유형별 안내 · 제목 · 내용 · [문의 접수] · 접수 완료 화면).
 * AI 즉답 칸(PW-1132)은 같은 시안의 `AiAnswerPanel`·`AiNoKbPanel`·`AiErrorPanel` 과 대기·검색 중 줄.
 * 파일 첨부(PW-548)는 다른 카드 몫이라 그리지 않는다.
 * 생김새는 알림 센터(`NotificationCenterCanvas`)와 같은 화면 문법 — 머리 카드(.tl-page) · 공용
 * `Chip`·`FormField`·`TextInput`·`TextArea`·`Button`. prefix: sup-
 *
 * 문구·데이터는 전부 호출부가 준다(i18n 은 소비처 몫).
 *
 * Props:
 *   workspaceName   「보내는 곳」 회사 이름
 *   planLabel       요금제 딱지 글자(없으면 딱지를 그리지 않는다)
 *   categories      [{ value, label, hint }] — hint 는 고른 뒤 보이는 안내 한 줄
 *   category        고른 유형 value | null
 *   title, body     입력값
 *   titleMaxLength, bodyMaxLength  입력칸 maxLength
 *   submitting      접수 중 — 모든 입력·버튼이 잠기고 버튼 글자가 labels.submitting
 *   canSubmit       호출부가 계산. false 면 [문의 접수] 잠금
 *   errorText       접수 실패 안내(입력은 그대로 남는다)
 *   done            null | { ticketNumber, firstResponseText } — 있으면 폼 대신 완료 화면
 *   ai              null(칸을 그리지 않는다) | {
 *                     phase: 'idle' | 'loading' | 'answered' | 'no_kb' | 'error',
 *                     canAsk,      idle 에서 [AI 즉답 받기]를 누를 수 있나(호출부가 계산)
 *                     hint,        idle 에서 버튼 옆 안내 한 줄(무엇이 모자라나 — 호출부가 고른다)
 *                     answer, sources: [{ id, title, href }], confident   answered 일 때
 *                   }
 *   submitHint      [문의 접수] 왼쪽 안내 한 줄(없으면 그리지 않는다)
 *   onCategoryChange(value) · onTitleChange(v) · onBodyChange(v) · onSubmit() · onViewMine() · onNewTicket()
 *   onAiAsk() · onAiResolved() · onAiRetry()   — 즉답 칸의 「그래도 접수」·「바로 접수」는 onSubmit
 *   labels          { heading, sub, workspaceLabel, categoryLabel, titleLabel, titlePlaceholder, bodyLabel,
 *                     bodyPlaceholder, submit, submitting, doneTitle, doneNumberLabel, doneViewMine, doneNewTicket,
 *                     aiSection, aiAsk, aiBadge, aiNotice, aiUnconfident, aiSources, aiResolved, aiProceed,
 *                     aiLoading, aiNoKb, aiNoKbProceed, aiErrorTitle, aiErrorMessage, aiRetry, aiErrorProceed }
 */
export default function SupportNewCanvas({
  workspaceName,
  planLabel,
  categories = [],
  category = null,
  title = '',
  body = '',
  titleMaxLength,
  bodyMaxLength,
  submitting = false,
  canSubmit = false,
  errorText = null,
  done = null,
  ai = null,
  submitHint = null,
  onCategoryChange,
  onTitleChange,
  onBodyChange,
  onSubmit,
  onViewMine,
  onNewTicket,
  onAiAsk,
  onAiResolved,
  onAiRetry,
  labels = {},
}) {
  const selected = categories.find((c) => c.value === category);

  return (
    <main className="tl-page sup-page" data-testid="support-new">
      <div className="sup-header">
        <div className="sup-header-text">
          <h1 className="sup-title">{labels.heading}</h1>
          {labels.sub && <p className="sup-sub">{labels.sub}</p>}
        </div>
      </div>

      <div className="sup-body">
        {done ? (
          <section className="sup-card sup-done" data-testid="support-done">
            <span className="sup-done-mark">
              <CheckGlyph size={28} />
            </span>
            <p className="sup-done-title">{labels.doneTitle}</p>
            <p className="sup-done-number">
              <span>{labels.doneNumberLabel}</span>
              <strong data-testid="support-done-number">{done.ticketNumber}</strong>
            </p>
            {done.firstResponseText && (
              <p className="sup-done-desc">{done.firstResponseText}</p>
            )}
            <div className="sup-actions sup-actions-center">
              <Button variant="secondary" onClick={() => onViewMine?.()} data-testid="support-view-mine">
                {labels.doneViewMine}
              </Button>
              <Button variant="primary" onClick={() => onNewTicket?.()} data-testid="support-new-ticket">
                {labels.doneNewTicket}
              </Button>
            </div>
          </section>
        ) : (
          <section className="sup-card sup-form">
            <div className="sup-from">
              <span className="sup-from-label">{labels.workspaceLabel}</span>
              <span className="sup-from-name">{workspaceName}</span>
              {planLabel && (
                <Chip tone="accent" data-testid="support-plan">
                  {planLabel}
                </Chip>
              )}
            </div>

            <FormField label={labels.categoryLabel} group>
              <div className="sup-cats">
                {categories.map((c) => (
                  <Chip
                    key={c.value}
                    selected={c.value === category}
                    onClick={() => onCategoryChange?.(c.value)}
                    disabled={submitting}
                    data-testid={`support-cat-${c.value}`}
                  >
                    {c.label}
                  </Chip>
                ))}
              </div>
              {selected?.hint && (
                <p className="sup-hint" data-testid="support-cat-hint">
                  {selected.hint}
                </p>
              )}
            </FormField>

            <FormField label={labels.titleLabel}>
              <TextInput
                value={title}
                onChange={(e) => onTitleChange?.(e.target.value)}
                placeholder={labels.titlePlaceholder}
                maxLength={titleMaxLength}
                disabled={submitting}
                data-testid="support-title"
              />
            </FormField>

            <FormField label={labels.bodyLabel}>
              <TextArea
                value={body}
                onChange={(e) => onBodyChange?.(e.target.value)}
                placeholder={labels.bodyPlaceholder}
                maxLength={bodyMaxLength}
                rows={6}
                disabled={submitting}
                data-testid="support-body"
              />
            </FormField>

            {errorText && (
              <div className="sup-notice is-warning" role="alert" data-testid="support-error">
                <AlertTriangleGlyph size={16} />
                <span>{errorText}</span>
              </div>
            )}

            {ai && (
              <AiSection
                ai={ai}
                labels={labels}
                busy={submitting}
                onAsk={onAiAsk}
                onResolved={onAiResolved}
                onRetry={onAiRetry}
                onProceed={onSubmit}
              />
            )}

            <div className={submitHint ? 'sup-actions sup-actions-split' : 'sup-actions'}>
              {submitHint && (
                <span className="sup-actions-hint" data-testid="support-submit-hint">
                  {submitHint}
                </span>
              )}
              <Button
                variant="primary"
                onClick={() => onSubmit?.()}
                disabled={!canSubmit || submitting}
                data-testid="support-submit"
              >
                {submitting ? labels.submitting : labels.submit}
              </Button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

/** AI 즉답 칸 — 시안 `SupportNew` ③. 칸마다 할 일은 호출부 콜백이 한다. */
function AiSection({ ai, labels, busy, onAsk, onResolved, onRetry, onProceed }) {
  return (
    <section className="sup-ai-section" aria-label={labels.aiSection} data-testid="support-ai">
      <p className="sup-ai-divider">{labels.aiSection}</p>

      {ai.phase === 'idle' && (
        <div className="sup-ai-idle">
          <Button
            variant="secondary"
            onClick={() => onAsk?.()}
            disabled={!ai.canAsk || busy}
            data-testid="support-ai-ask"
          >
            <SparkleGlyph size={16} />
            {labels.aiAsk}
          </Button>
          {ai.hint && (
            <span className="sup-ai-idle-hint" data-testid="support-ai-hint">
              {ai.hint}
            </span>
          )}
        </div>
      )}

      {ai.phase === 'loading' && (
        <div className="sup-ai is-answer" aria-busy="true" data-testid="support-ai-loading">
          <p className="sup-ai-loading">
            <Spinner size={16} />
            {labels.aiLoading}
          </p>
        </div>
      )}

      {ai.phase === 'answered' && (
        <div className="sup-ai is-answer" data-testid="support-ai-answer">
          <div className="sup-ai-head">
            <Chip tone="warning">
              <SparkleGlyph size={12} />
              {labels.aiBadge}
            </Chip>
            <span className="sup-ai-notice">{labels.aiNotice}</span>
          </div>
          {!ai.confident && (
            <p className="sup-ai-unconfident" role="note" data-testid="support-ai-unconfident">
              <AlertTriangleGlyph size={14} />
              {labels.aiUnconfident}
            </p>
          )}
          <p className="sup-ai-answer">{ai.answer}</p>
          {ai.sources?.length > 0 && (
            <div>
              <p className="sup-ai-sources-label">{labels.aiSources}</p>
              <div className="sup-ai-source-list">
                {ai.sources.map((src) => (
                  <a
                    key={src.id}
                    className="sup-ai-source"
                    href={src.href}
                    target="_blank"
                    rel="noreferrer"
                    data-testid={`support-ai-source-${src.id}`}
                  >
                    {src.title}
                    <ArrowRightGlyph size={12} />
                  </a>
                ))}
              </div>
            </div>
          )}
          <div className="sup-ai-actions">
            <Button
              variant="secondary"
              onClick={() => onResolved?.()}
              disabled={busy}
              data-testid="support-ai-resolved"
            >
              {labels.aiResolved}
            </Button>
            <Button
              variant="secondary"
              onClick={() => onProceed?.()}
              disabled={busy}
              data-testid="support-ai-proceed"
            >
              {labels.aiProceed}
            </Button>
          </div>
        </div>
      )}

      {ai.phase === 'no_kb' && (
        <div className="sup-ai is-empty" data-testid="support-ai-nokb">
          <div className="sup-ai-head">
            <Chip tone="neutral">{labels.aiBadge}</Chip>
          </div>
          <p className="sup-ai-text">{labels.aiNoKb}</p>
          <div className="sup-ai-actions">
            <Button
              variant="primary"
              onClick={() => onProceed?.()}
              disabled={busy}
              data-testid="support-ai-nokb-proceed"
            >
              {labels.aiNoKbProceed}
            </Button>
          </div>
        </div>
      )}

      {ai.phase === 'error' && (
        <div className="sup-ai is-error" role="alert" data-testid="support-ai-error">
          <p className="sup-ai-error-title">
            <AlertTriangleGlyph size={16} />
            {labels.aiErrorTitle}
          </p>
          <p className="sup-ai-text">{labels.aiErrorMessage}</p>
          <div className="sup-ai-actions">
            <Button
              variant="secondary"
              onClick={() => onRetry?.()}
              disabled={busy}
              data-testid="support-ai-retry"
            >
              {labels.aiRetry}
            </Button>
            <Button
              variant="primary"
              onClick={() => onProceed?.()}
              disabled={busy}
              data-testid="support-ai-error-proceed"
            >
              {labels.aiErrorProceed}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
