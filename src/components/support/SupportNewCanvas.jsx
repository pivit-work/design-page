import Button from '../shared/Button.jsx';
import Chip from '../shared/Chip.jsx';
import FormField from '../shared/FormField.jsx';
import TextArea from '../shared/TextArea.jsx';
import TextInput from '../shared/TextInput.jsx';
import { AlertTriangleGlyph, CheckGlyph } from '../shared/lineIcons.jsx';

/**
 * SupportNewCanvas — 고객지원 「문의하기」 (`/support/new`, PW-1129).
 *
 * 무엇을 보여 주나는 pivit-specs `M. 고객지원/support-app.jsx` 의 `SupportNew`
 * (보내는 회사·요금제 · 문의 유형 칩 + 유형별 안내 · 제목 · 내용 · [문의 접수] · 접수 완료 화면).
 * AI 즉답 패널(PW-1132)·파일 첨부(PW-548)는 다른 카드 몫이라 그리지 않는다.
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
 *   onCategoryChange(value) · onTitleChange(v) · onBodyChange(v) · onSubmit() · onViewMine() · onNewTicket()
 *   labels          { heading, sub, workspaceLabel, categoryLabel, titleLabel, titlePlaceholder, bodyLabel,
 *                     bodyPlaceholder, submit, submitting, doneTitle, doneNumberLabel, doneViewMine, doneNewTicket }
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
  onCategoryChange,
  onTitleChange,
  onBodyChange,
  onSubmit,
  onViewMine,
  onNewTicket,
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

            <div className="sup-actions">
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
