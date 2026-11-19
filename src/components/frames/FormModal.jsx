import ModalShell from '../shared/ModalShell.jsx';
import FormField from '../shared/FormField.jsx';
import { FRAME_ONE_LINE } from './frameValues.js';

/**
 * 입력 창 안쪽 틀 (PW-2994 ① · PW-3139 에서 design-page 로 옮김) — 가운데 뜨는 입력 창의 구역 제목 · 칸 이름 · 칸 사이 간격 ·
 * 아래 버튼 두 개 자리. 스타일시트: modal-shell.css · timeline.css · meetings.css(쓰는 쪽이 불러온다).
 *
 * 겉 틀은 지금 쓰는 앱 큰 창 틀 그대로다 — `ModalShell` + 앱 창 정본 `.mtg-shell`(폭 560 · 높이는 내용대로 ·
 * 제목 30/38 · 둘레 48 · 아래 버튼 줄 24/48 위 선). 안쪽 값은 디자이너(stesslee) 타임라인 창들에서 꺼냈다:
 *   - 칸 이름 `.tl-group-modal-label` 18/28 굵게 · 이름 ↔ 칸 12(`.tl-group-modal-field`) — «그룹 추가» 창
 *   - 칸 사이 24 — «내부 직원 추가» 창 본문(`.tl-emp-modal-body`)
 *   - 구역 제목 `.tl-meeting-modal-section-header` 18/28 굵게 · 구역 안 12(`.tl-meeting-modal-section`) — 회의 일정 창
 *   - 아래 버튼 두 개 — 같은 너비 · 높이 44 · 사이 12(`.tl-group-modal-actions` · `-btn`) — `ModalShell` 기본 버튼 줄
 *
 * 한두 문장만 묻는 창은 이 틀을 쓰지 않는다 — 공용 확인 창(폭 400 · 제목 16)을 그대로 쓴다.
 * 모양을 덮어쓰는 길(className · style)은 두지 않는다. 칸 안에 넣는 것(입력 칸 · 고르기 칸 · 글)은 자유다.
 *
 * props: title · description · titleId · submitLabel · cancelLabel · closeLabel · canSubmit ·
 *   busy(요청이 도는 중 — Esc · 막 · 닫기 X 와 두 버튼을 잠근다, ModalShell 그대로) · onSubmit · onClose · testId ·
 *   children(`FormModal.Section` · `FormModal.Field` · `NoticeLines` 를 늘어놓는다)
 */
export function FormModal({
  title,
  description,
  titleId,
  submitLabel,
  cancelLabel,
  closeLabel,
  canSubmit,
  busy,
  onSubmit,
  onClose,
  testId,
  children,
}) {
  return (
    <ModalShell
      title={title}
      description={description}
      titleId={titleId}
      submitLabel={submitLabel}
      cancelLabel={cancelLabel}
      closeLabel={closeLabel}
      canSubmit={canSubmit}
      busy={busy}
      onSubmit={onSubmit}
      onClose={onClose}
      testId={testId}
      className="mtg-shell"
      bodyClassName="tl-emp-modal-body"
    >
      {children}
    </ModalShell>
  );
}

/**
 * 칸 하나 — 칸 이름(18/28 굵게 · 한 줄) + 칸 + 칸 아래 안내 · 오류. 이름 ↔ 칸 12.
 * 칸 아래 안내는 안내 줄 틀의 «흐림»과 같은 디자이너 일정 창 부제(`.tl-event-modal-subtitle` 14/20 · `--text-tertiary`).
 * 칸 이름은 짧은 글이라 한 줄이고, 놓인 자리보다 길면 «…»로 자르고 마우스를 올리면 전부 보인다.
 * props: label · hint(칸 바로 아래 안내 한 줄) · error · required · group(라디오 · 체크 무리) · testId · children
 */
function FormModalField({ label, hint, error, required, group, testId, children }) {
  return (
    <FormField
      label={
        <span style={required ? LABEL_REQUIRED_STYLE : FRAME_ONE_LINE} title={label}>
          {label}
        </span>
      }
      hint={hint}
      error={error}
      required={required}
      group={group}
      className="tl-group-modal-field"
      labelClassName="tl-group-modal-label"
      hintClassName="tl-event-modal-subtitle"
      data-testid={testId}
    >
      {children}
    </FormField>
  );
}

/** 구역 — 칸 묶음 하나와 그 제목. 제목 ↔ 첫 칸 12, 구역 안 칸 사이는 창 본문과 같은 24. */
function FormModalSection({ title, testId, children }) {
  return (
    <section className="tl-meeting-modal-section" data-testid={testId}>
      <h3 className="tl-meeting-modal-section-header">
        <span style={FRAME_ONE_LINE} title={title}>
          {title}
        </span>
      </h3>
      <div className="tl-emp-modal-body">{children}</div>
    </section>
  );
}

/** 필수 칸 — 뒤에 붙는 «*» 자리(한 글자)를 남겨 이름이 길어도 «*»가 같은 줄에 남는다. */
const LABEL_REQUIRED_STYLE = { ...FRAME_ONE_LINE, maxWidth: 'calc(100% - 1em)' };

FormModal.Field = FormModalField;
FormModal.Section = FormModalSection;
