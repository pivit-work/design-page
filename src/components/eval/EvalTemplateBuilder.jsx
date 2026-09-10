import EvalTemplateItemSettings from './EvalTemplateItemSettings.jsx';
import {
  QUESTION_TYPES,
  fill,
  filledOptions,
  isNoteItem,
  scaleMaxOf,
  sectionColor,
} from './evalTemplateItemModel.js';

/**
 * [PW-602 ④] 설명 항목의 행 제목. 제목은 «선택»이라 비어 있을 수 있는데, 그때 행이
 * 통째로 빈칸이면 무엇이 놓였는지 알 수 없다 — 본문 첫 줄을 대신 보여 주고, 본문도
 * 없으면 `(본문 없음)` 이라고 적는다(저장은 막지 않는다 — 작성 중일 수 있다).
 */
const noteRowText = (q, L) =>
  q.text ||
  String(q.description ?? '')
    .split('\n')
    .find((l) => l.trim()) ||
  L.noteEmptyBody;

/**
 * 평가지 빌더의 두 몸통 — **등급 체계 줄**과 **평가 항목 줄**.
 *
 * ## 왜 부품으로 갈랐나 (PW-527 ①②)
 *
 * `screen-eval-template-library.policy.md` §6.3 — 「이 화면의 빌더는 위자드 2단계와 **같은
 * 컴포넌트**다. 따라서 ① 등급 체계(기준 정보) → ② 평가 항목 순서, 항목별 설정 패널
 * (척도 길이·선택지·가이드 문구 표시 방식·결과 공개 범위), 등급 ▲▼ 순서 이동이 여기에도
 * 그대로 적용된다. **한쪽에만 반영되면 버그로 본다**」.
 *
 * 그 「한쪽에만 반영」이 실제로 일어난 상태였다 — 마법사 2단계에는 설정 패널과 ▲▼ 가 있고,
 * 「평가 템플릿」 화면의 [편집] 창에는 이름 칸만 있었다. 그 창에는 「척도·선택지·공개 범위는
 * 여기서 바꿀 수 없습니다」 안내문까지 붙어 있었고, 그 안내문이 곧 §6.3 위반이었다.
 *
 * 두 화면이 필요로 하는 것이 완전히 같지는 않다(마법사에는 드래그 재배열·항목별 미리보기·
 * 피평가자 숨김이 더 있다). 그래서 **다른 부분은 슬롯으로 열어 두고 같은 부분만 부품이 갖는다** —
 * 갈라져도 되는 것과 갈라지면 안 되는 것을 코드가 구분하게 한다.
 */

/* ── 등급 체계 ───────────────────────────────────────────────────────── */

/**
 * 등급 한 줄 — ▲▼ · 순번 · 이름 · 설명 · (상대평가면) 비율 · 삭제.
 *
 * ▲▼ 인 이유(드래그가 아니라): 행 안에 입력 필드가 3개라 드래그 핸들이 텍스트 선택과
 * 충돌한다 (policy §5.4.4). 순번을 함께 찍는 이유는 이동 결과를 눈으로 확인하기 위해서다.
 */
export function EvalTemplateGradeRows({
  grades,
  labels: L,
  absolute = true,
  invalidAt = () => false,
  minGrades = 2,
  onMove,
  onUpdate,
  onRemove,
  testPrefix = 'evc-tpl-grade',
}) {
  return (
    <div className="evc-tpl-grades">
      {grades.map((g, i) => (
        <div key={i} className="evc-tpl-grade">
          <div className="evc-tpl-grade-move">
            <button
              type="button"
              className="evc-tpl-grade-arrow"
              onClick={() => onMove(i, -1)}
              disabled={i === 0}
              aria-label={L.gradeMoveUp}
              title={L.gradeMoveUp}
              data-testid={`${testPrefix}-up-${i}`}
            >
              ▲
            </button>
            <button
              type="button"
              className="evc-tpl-grade-arrow"
              onClick={() => onMove(i, 1)}
              disabled={i === grades.length - 1}
              aria-label={L.gradeMoveDown}
              title={L.gradeMoveDown}
              data-testid={`${testPrefix}-down-${i}`}
            >
              ▼
            </button>
          </div>
          <span className="evc-tpl-grade-no" data-testid={`${testPrefix}-no-${i}`}>
            {i + 1}
          </span>
          <input
            className={`evc-input${invalidAt(g, i) ? ' is-invalid' : ''}`}
            value={g.label}
            aria-label={L.gradeRowLabel ? fill(L.gradeRowLabel, { n: i + 1 }) : undefined}
            placeholder={L.gradeLabelPlaceholder}
            onChange={(e) => onUpdate(i, 'label', e.target.value)}
            data-testid={`${testPrefix}-label-${i}`}
          />
          <input
            className="evc-input"
            value={g.desc ?? ''}
            placeholder={L.gradeDescPlaceholder}
            onChange={(e) => onUpdate(i, 'desc', e.target.value)}
            data-testid={`${testPrefix}-desc-${i}`}
          />
          {!absolute && (
            <input
              type="number"
              className="evc-input evc-tpl-grade-ratio"
              value={g.ratio ?? 0}
              onChange={(e) => onUpdate(i, 'ratio', Number(e.target.value))}
              data-testid={`${testPrefix}-ratio-${i}`}
            />
          )}
          <button
            type="button"
            className="evc-tpl-x"
            onClick={() => onRemove(i)}
            disabled={grades.length <= minGrades}
            aria-label={L.delete}
            data-testid={`${testPrefix}-del-${i}`}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

/**
 * 항목 목록 아래의 «추가» 줄 — 질문 추가 · 설명 추가.
 *
 * ## 왜 부품으로 옮겼나 (PW-602 ④)
 *
 * 「평가 템플릿」 화면의 [편집] 창에는 유형 셀렉트가 없어 항목이 늘 서술형으로 태어난다.
 * 설명 항목은 응답 유형이 아니라 **다른 축**(`itemKind`)이라 셀렉트에 값을 하나 더하는
 * 것으로 표현되지 않고, 별도의 «만드는 자리»가 필요하다.
 *
 * 그 자리를 호출부에서 각자 그리면 두 화면의 추가 줄이 갈라진다 — 마법사와 [편집] 창이
 * 같은 빌더여야 한다는 것이 §6.3 이고, 그것이 이 파일이 존재하는 이유다.
 *
 * ## 🔴 버튼은 `.evc-btn` 이다 — `.evc-tpl-additem` 이 아니다 (PW-602 되돌림)
 *
 * 처음 만들 때 두 버튼에 `.evc-tpl-additem` 을 붙이고 「기존 모양 그대로라 새로 만든
 * 모양이 없다」고 적었는데, **그 클래스는 버튼의 모양이 아니라 «줄» 의 모양**이다
 * (`display: grid` + `grid-template-columns: 100px 1fr 96px auto` — 마법사의 항목 추가
 * 폼에서 입력칸 셋과 버튼을 한 줄에 세우는 틀). 버튼에 붙이면 버튼이 폭을 꽉 채운
 * 격자가 되고, 아이콘이 첫 칸에 글자가 둘째 칸에 떨어지며, 테두리·배경·여백은
 * 하나도 안 들어와 브라우저 기본 버튼으로 보인다.
 *
 * 이 파일 안에서 «버튼» 의 모양은 언제나 `.evc-btn` 이다. 줄을 세우는 것은 감싸는
 * `.evc-tpl-addrow` 가 한다 — 모양(버튼)과 배치(줄)를 다른 요소가 맡는다.
 */
export function EvalTemplateAddRow({
  labels: L,
  onAddItem,
  onAddNote,
  icon = null,
  testPrefix = 'evc-tpl',
}) {
  return (
    <div className="evc-tpl-addrow">
      <button
        type="button"
        className="evc-btn is-ghost"
        onClick={onAddItem}
        data-testid={`${testPrefix}-add-item`}
      >
        {icon}
        {L.addItem}
      </button>
      {onAddNote && (
        <button
          type="button"
          className="evc-btn is-ghost"
          onClick={onAddNote}
          data-testid={`${testPrefix}-add-note`}
        >
          {icon}
          {L.addNote}
        </button>
      )}
    </div>
  );
}

/* ── 평가 항목 ───────────────────────────────────────────────────────── */

/**
 * 항목 한 줄 + 그 아래 설정 패널.
 *
 * 행에 요약 배지를 두는 이유: 패널을 열지 않아도 무엇이 설정됐는지 읽혀야 한다
 * (policy §5.11-C 「행 요약 배지」). 안 보이는 값을 지우던 것이 PW-482 의 뿌리였다.
 *
 * `leading`·`trailing` 은 화면마다 다른 것을 넣는 자리다 — 마법사는 드래그 손잡이와
 * 항목별 미리보기·피평가자 숨김을, 라이브러리는 이름 입력을 넣는다.
 */
export function EvalTemplateItemRow({
  q,
  labels: L,
  reviewType,
  open = false,
  onToggleSettings,
  onRemove,
  disclosureSupported,
  disclosure,
  options,
  onPatch,
  onPatchOption,
  onAddOption,
  onRemoveOption,
  onPatchDisclosure,
  onToggleAudience,
  containerProps = {},
  className = '',
  leading = null,
  trailing = null,
  /**
   * 설정 버튼 «뒤», 삭제 버튼 «앞»에 들어가는 버튼들. 마법사의 항목별 미리보기(👁)가
   * 원래 그 자리라, 슬롯을 나누지 않으면 버튼 차례가 바뀐다.
   */
  actions = null,
  showSection = true,
  showText = true,
  /** [PW-602 ①] 잠긴 단계에서는 설정 패널의 유형 안내를 띄우지 않는다 (policy §5.11-E). */
  phaseLocked = false,
  /**
   * 작성자 표기가 실명이 아닐 때 `공개 익명`·`공개 관계만` 배지를 함께 그린다 (PW-482).
   * 마법사 행에는 그 자리에 별도 토글(피평가자 숨김)이 이미 있어 기본값은 끔이다.
   */
  showDisclosureBadge = false,
  /**
   * 항목 이름을 «이 줄에서» 고치는 화면을 위한 입력칸. 마법사는 이름을 여기서 고치지
   * 않으므로(항목 추가 줄에서 짓는다) 넘기지 않는다 — 넘긴 화면만 입력칸을 갖는다.
   */
  textInput = null,
  settingsIcon,
  testId,
}) {
  return (
    <div
      {...containerProps}
      className={`evc-tpl-item${className ? ` ${className}` : ''}`}
      data-testid={testId ?? `evc-tpl-item-${q.id}`}
    >
      {leading}
      {showSection && q.section && (
        <span
          className="evc-tpl-item-section"
          style={{
            color: sectionColor(q.section),
            background: 'color-mix(in srgb, currentColor 12%, transparent)',
          }}
        >
          {q.section}
        </span>
      )}
      {textInput && (
        <input
          className={`evc-input evc-tpl-item-input${textInput.invalid ? ' is-invalid' : ''}`}
          value={textInput.value}
          aria-label={textInput.ariaLabel}
          placeholder={textInput.placeholder}
          onChange={textInput.onChange}
          data-testid={textInput.testId}
        />
      )}
      {showText && !textInput && (
        <span className={`evc-tpl-item-text${isNoteItem(q) && !q.text ? ' is-muted' : ''}`}>
          {isNoteItem(q) ? noteRowText(q, L) : q.text}
        </span>
      )}
      {/* [PW-602 ④] 설명은 응답 «유형»이 없다 — 다른 축(itemKind)이라 배지도 따로 찍는다. */}
      <span className="evc-tpl-item-type">
        {isNoteItem(q)
          ? L.qKindNote
          : L[QUESTION_TYPES.find((t) => t.id === q.type)?.labelKey] || q.type}
      </span>
      {q.type === 'rating' && !isNoteItem(q) && (
        <span className="evc-tpl-item-badge" data-testid={`evc-tpl-badge-scale-${q.id}`}>
          {fill(L.scaleRangeBadge, { max: scaleMaxOf(q) })}
        </span>
      )}
      {q.type === 'checkbox' && !isNoteItem(q) && (
        <span className="evc-tpl-item-badge" data-testid={`evc-tpl-badge-options-${q.id}`}>
          {fill(L.optionsCountBadge, { count: filledOptions(q).length })}
          {q.allowMultiple ? ` · ${L.optionsMultiBadge}` : ''}
        </span>
      )}
      {/* PW-482 — 작성자 표기가 실명이 아닐 때만 알린다. 실명은 기본값이라 배지가
          정보를 더하지 않는다. */}
      {showDisclosureBadge &&
        q.disclosure?.identity &&
        q.disclosure.identity !== 'named' && (
          <span
            className="evc-tpl-item-badge"
            data-testid={`evc-tpl-badge-disclosure-${q.id}`}
          >
            {fill(L.disclosureBadge, {
              identity: L[`identity_${q.disclosure.identity}`] ?? q.disclosure.identity,
            })}
          </span>
        )}
      {q.description && !isNoteItem(q) && (q.descriptionDisplay || 'tooltip') !== 'hidden' && (
        <span className="evc-tpl-item-badge" data-testid={`evc-tpl-badge-guide-${q.id}`}>
          {L.guideBadge}
        </span>
      )}
      {trailing}
      {/* PW-433 — 개정 전에는 동작 없는 버튼이었다(policy §5.11-C).
          PW-527 ① — 「평가 템플릿」 화면의 [편집] 창에는 이 버튼 자체가 없었다. */}
      <button
        type="button"
        className={`evc-tpl-x${open ? ' is-on' : ''}`}
        onClick={onToggleSettings}
        aria-label={L.itemSettings}
        title={L.itemSettings}
        aria-expanded={open}
        data-testid={`evc-tpl-item-settings-${q.id}`}
      >
        {settingsIcon ?? '✎'}
      </button>
      {actions}
      {onRemove && (
        <button
          type="button"
          className="evc-tpl-x"
          onClick={onRemove}
          aria-label={L.delete}
          data-testid={`evc-tpl-item-del-${q.id}`}
        >
          ✕
        </button>
      )}
      {open && (
        <EvalTemplateItemSettings
          q={q}
          labels={L}
          reviewType={reviewType}
          disclosureSupported={disclosureSupported}
          disclosure={disclosure}
          options={options}
          onPatch={onPatch}
          onPatchOption={onPatchOption}
          onAddOption={onAddOption}
          onRemoveOption={onRemoveOption}
          onPatchDisclosure={onPatchDisclosure}
          onToggleAudience={onToggleAudience}
          onClose={onToggleSettings}
          phaseLocked={phaseLocked}
        />
      )}
    </div>
  );
}
