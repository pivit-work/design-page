import { useRef } from 'react';
import Button from '../shared/Button.jsx';
import Checkbox from '../shared/Checkbox.jsx';
import Chip from '../shared/Chip.jsx';
import SegmentedControl from '../shared/SegmentedControl.jsx';
import FormField from '../shared/FormField.jsx';
import TextArea from '../shared/TextArea.jsx';
import TextInput from '../shared/TextInput.jsx';
import Spinner from '../shared/Spinner.jsx';
import {
  AlertTriangleGlyph,
  ArrowRightGlyph,
  CheckGlyph,
  CloseGlyph,
  PlusGlyph,
  SparkleGlyph,
} from '../shared/lineIcons.jsx';

/**
 * SupportNewCanvas — 고객지원 「문의하기」 (`/support/new`, PW-1129).
 *
 * 무엇을 보여 주나는 pivit-specs `M. 고객지원/support-app.jsx` 의 `SupportNew`
 * (보내는 회사·요금제 · 문의 유형 칩 + 유형별 안내 · 제목 · 내용 · [문의 접수] · 접수 완료 화면).
 * AI 즉답 칸(PW-1132)은 같은 시안의 `AiAnswerPanel`·`AiNoKbPanel`·`AiErrorPanel` 과 대기·검색 중 줄.
 * 파일 첨부(pivit-work PW-2480 · 기획 PW-548)는 시안의 첨부 블록 — [+ 파일 첨부] · 고른 파일 줄 · 고지 한 줄.
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
 *   autoAttach      null(칸을 그리지 않는다) | {           — PW-1177 · 시안 `SupportNew` 의 자동 첨부 안내 + 스크린샷 체크
 *                     notice,              「보던 화면 주소 · 브라우저 … 자동으로 첨부됩니다」
 *                     screenshotLabel,     「현재 화면 스크린샷 첨부」
 *                     screenshotHint,      체크 아래 보조 한 줄(직전 화면이 첨부된다 / 직전 화면이 없다)
 *                     screenshotChecked, screenshotDisabled,
 *                     onScreenshotChange(checked)
 *                   }
 *   fileAttach      null(칸을 그리지 않는다) | {           — PW-2480 · 시안 `SupportNew` 의 첨부 블록(내용 아래 · 자동 첨부 위)
 *                     buttonLabel,         「파일 첨부」
 *                     accept,              파일 선택 창이 고르게 할 형식(`.png,.jpg,…`)
 *                     full, fullHint,      다 찼으면 버튼을 잠그고 그 아래 안내 한 줄
 *                     files: [{ id, name, size, removeLabel }],  고른 파일 — 파일마다 한 행(왼쪽 이름 · 오른쪽 크기·×). size 는 호출부가 만든 글자(「2.0 MB」)
 *                     notice,              늘 보이는 고지 한 줄
 *                     onPick(File[]),      선택 창에서 고른 것 — 검사·토스트는 호출부 몫
 *                     onRemove(id)
 *                   }
 *                   끌어다 놓기는 두지 않는다(기획 문의하기 정책 §0-4 Q4).
 *   onCategoryChange(value) · onTitleChange(v) · onBodyChange(v) · onSubmit() · onViewMine() · onNewTicket()
 *   onAiAsk() · onAiResolved() · onAiRetry()   — 즉답 칸의 「그래도 접수」·「바로 접수」는 onSubmit
 *   nav             머리 안 제목·안내 아래에 놓을 탭 줄(보통 SupportTopNav) — PW-2687
 *   labels          { heading, sub, workspaceLabel, categoryLabel, titleLabel, titlePlaceholder, bodyLabel,
 *                     bodyPlaceholder, submit, submitting, doneTitle, doneNumberLabel, doneViewMine, doneNewTicket,
 *                     aiSection, aiAsk, aiBadge, aiNotice, aiUnconfident, aiSources, aiResolved, aiProceed,
 *                     aiLoading, aiNoKb, aiNoKbProceed, aiErrorTitle, aiErrorMessage, aiRetry, aiErrorProceed }
 */
export default function SupportNewCanvas({
  /** 제목 바로 오른쪽 «?» 튜토리얼 도움말 버튼 (pivit-work PW-2567). 안 주면 지금과 같다. */
  titleHelp,
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
  autoAttach = null,
  fileAttach = null,
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
  nav,
}) {
  const selected = categories.find((c) => c.value === category);

  return (
    <main className="tl-page sup-page" data-testid="support-new">
      <div className="sup-header">
        <div className="sup-header-text">
          <h1 className={`sup-title${titleHelp ? ' tvh-title-row' : ''}`}>{labels.heading}{titleHelp}</h1>
          {labels.sub && <p className="sup-sub">{labels.sub}</p>}
        </div>
        {nav}
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
                <SegmentedControl
                  ariaLabel={labels.categoryLabel}
                  value={category}
                  onChange={(next) => onCategoryChange?.(next)}
                  items={categories.map((c) => ({
                    value: c.value,
                    label: c.label,
                    disabled: submitting,
                    testId: `support-cat-${c.value}`,
                  }))}
                />
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

            {fileAttach && <FileAttach fileAttach={fileAttach} busy={submitting} />}

            {autoAttach && (
              <div className="sup-attach" data-testid="support-auto-attach">
                <p className="sup-hint">{autoAttach.notice}</p>
                <Checkbox
                  checked={!!autoAttach.screenshotChecked}
                  disabled={submitting || !!autoAttach.screenshotDisabled}
                  onChange={(e) => autoAttach.onScreenshotChange?.(e.target.checked)}
                  data-testid="support-screenshot"
                  label={
                    <span className="sup-attach-label">
                      {autoAttach.screenshotLabel}
                      {autoAttach.screenshotHint && (
                        <span className="sup-attach-sub" data-testid="support-screenshot-hint">
                          {autoAttach.screenshotHint}
                        </span>
                      )}
                    </span>
                  }
                />
              </div>
            )}

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

/**
 * 파일 첨부 칸 (PW-2480) — 디자이너 원본이 없어 같은 화면의 부품으로 만든다(design-review).
 * 묶음은 바로 아래 자동 첨부 칸과 같은 `.sup-attach`, 안내는 스크린샷 보조 문구와 같은 `.sup-attach-sub`.
 * 고른 파일은 기획 시안(support-app.jsx SupportNew 첨부 블록)대로 파일마다 한 행인 세로 목록이다 — 가로 칩 줄이
 * 아니다(QA 2026-11-03). 행은 시안 주석대로 같은 화면 자동 첨부 안내 상자(`.sup-hint`)와 같은 바탕·모서리·글씨,
 * [×] 는 디자이너의 «행 빼기» 버튼(회의록 할 일 줄 `.mtg-record-action-remove`)을 그대로 쓴다.
 */
function FileAttach({ fileAttach, busy }) {
  const inputRef = useRef(null);
  const { files = [] } = fileAttach;
  return (
    <div className="sup-attach" data-testid="support-files">
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        accept={fileAttach.accept}
        data-testid="support-files-input"
        onChange={(e) => {
          const picked = Array.from(e.target.files || []);
          // 같은 파일을 빼고 다시 고를 수 있게 비운다.
          e.target.value = '';
          if (picked.length > 0) fileAttach.onPick?.(picked);
        }}
      />
      <div>
        <Button
          variant="secondary"
          size="sm"
          disabled={busy || !!fileAttach.full}
          onClick={() => inputRef.current?.click()}
          data-testid="support-files-add"
        >
          <PlusGlyph size={14} />
          {fileAttach.buttonLabel}
        </Button>
      </div>
      {fileAttach.full && fileAttach.fullHint && (
        <span className="sup-attach-sub" data-testid="support-files-full">
          {fileAttach.fullHint}
        </span>
      )}
      {files.length > 0 && (
        <ul className="sup-files" role="list" data-testid="support-files-list">
          {files.map((f) => (
            <li key={f.id} className="sup-hint sup-file" data-testid="support-file">
              <span className="sup-file-name" title={f.name} data-testid="support-file-name">
                {f.name}
              </span>
              <span className="sup-attach-sub sup-file-size" data-testid="support-file-size">
                {f.size}
              </span>
              {!busy && (
                <button
                  type="button"
                  className="mtg-record-action-remove"
                  aria-label={f.removeLabel}
                  onClick={() => fileAttach.onRemove?.(f.id)}
                  data-testid="support-file-remove"
                >
                  <CloseGlyph size={14} strokeWidth={2.571} color="var(--text-tertiary)" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <span className="sup-attach-sub" data-testid="support-files-notice">
        {fileAttach.notice}
      </span>
    </div>
  );
}
