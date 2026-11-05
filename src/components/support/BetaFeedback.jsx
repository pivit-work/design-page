import { createPortal } from 'react-dom';
import Button from '../shared/Button.jsx';
import Checkbox from '../shared/Checkbox.jsx';
import TextArea from '../shared/TextArea.jsx';
import TextInput from '../shared/TextInput.jsx';
import { ChatGlyph, CloseGlyph, FaceBadGlyph, FaceGoodGlyph, FaceMehGlyph } from '../shared/lineIcons.jsx';

/**
 * 베타 의견 두 표면 (pivit-work PW-2566) — 상단 바 버튼과 그 아래 창, 작업 직후 오른쪽 아래 카드.
 *
 * 모양만 그린다. 글자·값·보내기는 호출부가 쥔다. 디자이너 원본이 없는 표면이라 같은 자리의 디자이너 값을 쓴다 —
 * 버튼은 공용 `Button`, 칸은 공용 `TextArea`·`TextInput`·`Checkbox`, 떠 있는 카드는 회의 녹음 위젯(`.mtg-rec-widget`) 모양.
 * 규격: pivit-specs `M. 고객지원/screen-support-beta-feedback.policy.md` §2.
 * `data-feedback-capture-ignore`: 화면 사진을 찍을 때 창 자신은 찍지 않는다(§2-A).
 */

/** 상단 바 버튼. */
export function BetaFeedbackTrigger({ label, expanded, onClick, ...rest }) {
  return (
    <Button
      variant="ghost"
      className="dp-bf-trigger"
      aria-expanded={expanded}
      onClick={onClick}
      {...rest}
    >
      <ChatGlyph size={16} />
      {label}
    </Button>
  );
}

function ErrorLine({ text, action }) {
  if (!text) return null;
  return (
    <div className="dp-bf-error" role="alert" data-testid="beta-feedback-error">
      <span>{text}</span>
      {action}
    </div>
  );
}

/**
 * 버튼 아래 작은 창 (§2-A).
 *
 * @param {object} props.labels { title, placeholder, screenshot, autoAttach, supportLink, cancel, send, sending, retry, discardAsk, discard, keepWriting }
 * @param {boolean} props.confirmDiscard  «쓰던 의견을 버릴까요?» 줄을 보인다
 */
export function BetaFeedbackPopover({
  labels,
  text,
  maxLength,
  screenshot,
  error,
  failed,
  sending,
  confirmDiscard,
  canSend,
  onTextChange,
  onScreenshotChange,
  onSupportLink,
  supportHref,
  onCancel,
  onSend,
  onKeepWriting,
  onDiscard,
  panelRef,
}) {
  return (
    <div
      ref={panelRef}
      className="dp-bf-card dp-bf-popover"
      role="dialog"
      aria-label={labels.title}
      data-testid="beta-feedback-popover"
      data-feedback-capture-ignore="true"
    >
      <div className="dp-bf-title">{labels.title}</div>
      <TextArea
        rows={3}
        value={text}
        placeholder={labels.placeholder}
        maxLength={maxLength}
        aria-label={labels.title}
        data-testid="beta-feedback-text"
        onChange={(e) => onTextChange(e.target.value)}
      />
      <div className="dp-bf-count">{text.length}/{maxLength}</div>
      <Checkbox
        checked={screenshot}
        data-testid="beta-feedback-screenshot"
        onChange={(e) => onScreenshotChange(e.target.checked)}
      >
        {labels.screenshot}
      </Checkbox>
      <div className="dp-bf-note">{labels.autoAttach}</div>
      <a
        className="dp-bf-link"
        href={supportHref}
        data-testid="beta-feedback-support-link"
        onClick={(e) => {
          e.preventDefault();
          onSupportLink();
        }}
      >
        {labels.supportLink}
      </a>
      <ErrorLine text={error} />
      {confirmDiscard ? (
        <div className="dp-bf-foot">
          <span className="dp-bf-ask">{labels.discardAsk}</span>
          <Button variant="ghost" onClick={onKeepWriting} data-testid="beta-feedback-keep">
            {labels.keepWriting}
          </Button>
          <Button variant="primary" onClick={onDiscard} data-testid="beta-feedback-discard">
            {labels.discard}
          </Button>
        </div>
      ) : (
        <div className="dp-bf-foot">
          <Button variant="ghost" onClick={onCancel} data-testid="beta-feedback-cancel">
            {labels.cancel}
          </Button>
          <Button
            variant="primary"
            disabled={!canSend}
            aria-busy={sending || undefined}
            onClick={onSend}
            data-testid="beta-feedback-send"
          >
            {sending ? labels.sending : failed ? labels.retry : labels.send}
          </Button>
        </div>
      )}
    </div>
  );
}

const FACE_GLYPH = { bad: FaceBadGlyph, meh: FaceMehGlyph, good: FaceGoodGlyph };

/**
 * 작업 직후 오른쪽 아래 카드 (§2-B). 뒤 화면을 막지 않는다 — 막이 없다.
 *
 * @param {object} props.labels { question, placeholder, tail, close, send, sending, retry }
 * @param {{id:'bad'|'meh'|'good', label:string}[]} props.faces
 */
export function BetaFeedbackPrompt({
  labels,
  faces,
  face,
  text,
  error,
  notice,
  failed,
  sending,
  onFaceChange,
  onTextChange,
  onClose,
  onSend,
}) {
  // body 로 바로 붙인다 — 앱 틀(`.app`)에 transform 이 걸려 그 안에서는 z-index 가 틀 안에서만 정해져,
  // body 에 붙은 회의 녹음 위젯에 [보내기]·[✕]가 가린다.
  return createPortal(
    <div
      className="dp-bf-card dp-bf-prompt"
      role="dialog"
      aria-label={labels.question}
      data-testid="beta-feedback-prompt"
      data-feedback-capture-ignore="true"
    >
      <div className="dp-bf-head">
        <div className="dp-bf-title">{labels.question}</div>
        <Button
          variant="ghost"
          size="sm"
          className="dp-bf-close"
          aria-label={labels.close}
          data-testid="beta-feedback-close"
          onClick={onClose}
        >
          <CloseGlyph size={16} />
        </Button>
      </div>
      <div className="dp-bf-faces" role="radiogroup" aria-label={labels.question}>
        {faces.map((f) => {
          const Glyph = FACE_GLYPH[f.id];
          const on = face === f.id;
          return (
            <Button
              key={f.id}
              className={`dp-bf-face${on ? ' is-selected' : ''}`}
              role="radio"
              aria-checked={on}
              data-testid={`beta-feedback-face-${f.id}`}
              onClick={() => onFaceChange(f.id)}
            >
              <Glyph size={24} />
              <span>{f.label}</span>
            </Button>
          );
        })}
      </div>
      <TextInput
        value={text}
        placeholder={labels.placeholder}
        aria-label={labels.placeholder}
        data-testid="beta-feedback-text"
        onChange={(e) => onTextChange(e.target.value)}
      />
      {notice && <div className="dp-bf-note" data-testid="beta-feedback-limit">{notice}</div>}
      <ErrorLine text={error} />
      <div className="dp-bf-foot">
        <span className="dp-bf-note dp-bf-tail">{labels.tail}</span>
        <Button
          variant="primary"
          disabled={!face || sending}
          aria-busy={sending || undefined}
          data-testid="beta-feedback-send"
          onClick={onSend}
        >
          {sending ? labels.sending : failed ? labels.retry : labels.send}
        </Button>
      </div>
    </div>,
    document.body,
  );
}

/** 버튼과 그 아래 창을 묶는 자리 — 창이 버튼 아래에 붙고, 바깥 누르기 판정이 둘을 한 덩이로 본다. */
export function BetaFeedbackAnchor({ ref, children }) {
  return (
    <div ref={ref} className="dp-bf-anchor">
      {children}
    </div>
  );
}
