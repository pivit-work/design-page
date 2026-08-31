import { filledOptions, groupBySection, scaleMaxOf, sectionColor } from './evalTemplateItemModel.js';

/**
 * 평가지 본문 — **구성원이 실제로 받는 화면 그대로** 그린다. 입력 위젯은 그리되 비활성이다.
 *
 * ## 왜 「그리지 않는다」가 아니라 「그린 뒤 비활성」인가 (PW-527 ③)
 *
 * 안 그리면 다시 **요약**이 된다. 어니스트 지적이 정확히 그것이었다 — 미리보기를 열었더니
 * 항목 이름만 나열돼 있어서, 이 평가지로 평가하면 구성원 화면에 무엇이 나가는지 알 수 없었다.
 * 반대로 활성으로 두면 어드민이 남의 평가지에 값을 넣어 본 것처럼 읽힌다. 그래서 «그린 뒤
 * 비활성»이고, 응답을 저장하는 경로는 없다.
 *
 * 비활성 위젯만 덩그러니 두면 「고장」으로 읽히므로, 호출부가 `보기 전용` 배지와 안내문을
 * 함께 그린다 (`screen-eval-template-library.policy.md` §6.2 v1.3).
 *
 * ## 두 화면이 나눠 쓴다
 *
 * 마법사 2단계의 전체 미리보기 모달과 「평가 템플릿」 화면의 미리보기가 **같은 이 부품**을
 * 쓴다. 형태가 갈리면 어드민이 미리보기에서 본 것과 구성원이 받는 평가지가 달라진다.
 * 두 자리에서 다른 것은 **입력 활성 여부뿐**이고(마법사는 눌러 볼 수 있다), 그것은
 * `interactive` 로 가른다.
 *
 * ## 항목 본문은 `text` 에서 읽는다
 *
 * `label`·`desc` 는 어느 층에도 없는 필드다. 그것을 읽던 구현이 번호만 찍고 본문이 빈칸으로
 * 나왔다 (PW-434, 라이브러리 정책 엣지 21). 서버의 `label` 을 이 부품에 넘길 때는 호출부가
 * `text` 로 옮겨 담는다.
 */
export default function EvalSheetBody({
  items,
  grades = [],
  labels: L,
  interactive = false,
  readOnlyNotice = false,
  itemsTitle = null,
  showGrades = false,
  gradesTitle = null,
}) {
  const sections = groupBySection(items);
  const dis = !interactive;
  return (
    <>
      {/* [PW-527 ③] 비활성 위젯만 덩그러니 두면 「고장」으로 읽힌다. 무엇을 보고 있는지와
          왜 눌리지 않는지를 함께 적는다 (정책 §6.2 v1.3). */}
      {readOnlyNotice && (
        <div className="evc-preview-readonly" data-testid="evc-sheet-readonly">
          <span className="evc-mode-badge">{L.sheetReadOnlyBadge}</span>
          <span className="evc-tpl-set-note">{L.sheetReadOnlyNote}</span>
        </div>
      )}
      {itemsTitle && <p className="evc-preview-sec-title">{itemsTitle}</p>}
      {/* 항목이 0개인 것과 템플릿이 빈 것은 다르다 — 등급·사용 이력은 그대로 그린다
          (정책 §9 · 엣지 26). */}
      {sections.length === 0 && (
        <p className="evc-preview-empty" data-testid="evc-sheet-empty">
          {L.sheetEmpty}
        </p>
      )}
      {sections.map((s, si) => (
        <div key={s.sec ?? `sec${si}`} className="evc-preview-section">
          {/* 구분이 없는 항목(분류 미해석·레거시)은 머리글 없이 항목만 그린다 —
              빈 제목 줄이 서면 「제목이 사라진 것」처럼 읽힌다. */}
          {s.sec && (
            <div className="evc-preview-sec-title" style={{ color: sectionColor(s.sec) }}>
              {s.sec}
            </div>
          )}
          {s.items.map((q) => (
            <div key={q.id} className="evc-preview-q" data-testid={`evc-sheet-q-${q.id}`}>
              <div className="evc-preview-q-text">
                {q.text}
                {/* PW-433 ⑥ 가이드 문구를 어떻게 보여줄지는 설계자가 정한다. */}
                {q.description && (q.descriptionDisplay || 'tooltip') === 'tooltip' && (
                  <span className="evc-preview-guide-mark" title={q.description}>?</span>
                )}
                {q.requiresRationale && (
                  <span className="evc-mode-badge is-warn">{L.rationaleRequired}</span>
                )}
              </div>
              {q.description && (q.descriptionDisplay || 'tooltip') === 'inline' && (
                <div className="evc-preview-guide-inline">{q.description}</div>
              )}
              {q.type === 'textarea' && (
                <textarea
                  className="evm-textarea"
                  rows={3}
                  disabled={dis}
                  placeholder={L.previewTextareaPlaceholder}
                />
              )}
              {/* PW-118 척도 항목은 '점수 + 바로 아래 사유 서술칸' 복합 구조다(spec-eval-cycle §4.2.2 B6/D4).
                  requiresRationale 는 서술칸의 유무가 아니라 제출 게이팅만 정한다 —
                  미리보기가 점수만 그리면 구성원이 보게 될 화면과 어긋난다. */}
              {q.type === 'rating' && (
                <>
                  {/* PW-433 ① 미리보기는 설정한 척도를 **그대로** 그린다.
                      여기가 5점 고정이면 버그다 (policy §5.11-A 「미리보기 정합」). */}
                  <div className="evc-preview-scale">
                    {q.scaleAnchorMin && (
                      <span className="evc-preview-scale-anchor">{q.scaleAnchorMin}</span>
                    )}
                    {Array.from({ length: scaleMaxOf(q) }, (_, i) => i + 1).map((n) => (
                      <span key={n} className="evc-preview-scale-dot">{n}</span>
                    ))}
                    {q.scaleAnchorMax && (
                      <span className="evc-preview-scale-anchor">{q.scaleAnchorMax}</span>
                    )}
                    <span className="evc-preview-scale-of">/ {scaleMaxOf(q)}</span>
                  </div>
                  <textarea
                    className="evm-textarea"
                    rows={2}
                    disabled={dis}
                    placeholder={L.previewRationalePlaceholder}
                    data-testid={`evc-preview-rationale-${q.id}`}
                  />
                </>
              )}
              {q.type === 'grade' && (
                <div className="evc-preview-gradechips">
                  {grades.map((g, i) => (
                    <span key={i} className="evc-type-chip">{g.label}</span>
                  ))}
                </div>
              )}
              {/* PW-433 ③ 제목 하나가 체크박스가 되던 구조 → 제목 + 선택지 N개.
                  선택지를 정한 적 없는 구 항목은 구 동작으로 폴백하고 그 사실을 표기한다. */}
              {q.type === 'checkbox' &&
                (filledOptions(q).length > 0 ? (
                  <div className="evc-preview-options">
                    {filledOptions(q).map((o) => (
                      <label key={o.id} className="evl-promo-row">
                        <input type={q.allowMultiple ? 'checkbox' : 'radio'} disabled={dis} />
                        <span>{o.label}</span>
                      </label>
                    ))}
                    <span className="evc-preview-scale-of">
                      {q.allowMultiple ? L.optionsMultiHint : L.optionsSingleHint}
                    </span>
                  </div>
                ) : (
                  <label className="evl-promo-row">
                    <input type="checkbox" disabled={dis} />
                    <span>{q.text}</span>
                    <span className="evc-preview-scale-of" data-testid={`evc-preview-nooptions-${q.id}`}>
                      {L.optionsUnset}
                    </span>
                  </label>
                ))}
            </div>
          ))}
        </div>
      ))}
      {showGrades && (
        <>
          {gradesTitle && <p className="evc-preview-sec-title">{gradesTitle}</p>}
          <div className="evc-preview-gradechips" data-testid="evc-sheet-grades">
            {grades.map((g, i) => (
              <span key={g.gradeKey ?? i} className="evc-mode-badge">
                {g.label}
                {/* numeric(5,2) 이 "15.00" 으로 와서 그대로 그리면 배지가 지저분하다. */}
                {g.ratio != null ? ` ${Number(g.ratio)}%` : ''}
              </span>
            ))}
          </div>
        </>
      )}
    </>
  );
}
