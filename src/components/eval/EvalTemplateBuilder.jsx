import EvalTemplateItemSettings from './EvalTemplateItemSettings.jsx';
import { QUESTION_TYPES, fill, filledOptions, scaleMaxOf, sectionColor } from './evalTemplateItemModel.js';

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
      {showText && !textInput && <span className="evc-tpl-item-text">{q.text}</span>}
      <span className="evc-tpl-item-type">
        {L[QUESTION_TYPES.find((t) => t.id === q.type)?.labelKey] || q.type}
      </span>
      {q.type === 'rating' && (
        <span className="evc-tpl-item-badge" data-testid={`evc-tpl-badge-scale-${q.id}`}>
          {fill(L.scaleRangeBadge, { max: scaleMaxOf(q) })}
        </span>
      )}
      {q.type === 'checkbox' && (
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
      {q.description && (q.descriptionDisplay || 'tooltip') !== 'hidden' && (
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
        />
      )}
    </div>
  );
}
