import {
  CHECK_MAX_OPTIONS,
  CHECK_MIN_OPTIONS,
  DEFAULT_MIN_RESPONSES,
  DISCLOSURE_AUDIENCES,
  GUIDE_DISPLAYS,
  IDENTITY_OPTIONS,
  SCALE_MAX_MAX,
  SCALE_MAX_MIN,
  SCALE_PRESETS,
  clampScaleMax,
  fill,
  scaleMaxOf,
} from './evalTemplateItemModel.js';

/**
 * 평가 «항목 하나»의 설정판 — 척도 길이·양끝 의미(§5.11-A) · 체크 선택지·복수 선택(§5.11-B) ·
 * 작성 가이드 문구와 표시 방식(§5.11-D) · 결과 공개 범위 4축(§5.12).
 *
 * ## 두 화면이 나눠 쓴다 (PW-527 ①)
 *
 * 원래 `EvalCycleWizard.jsx` 안에만 있던 `ItemSettingsPanel` 이다. 마법사 2단계와
 * 「평가 템플릿」 화면의 [편집] 창이 **같은 이 부품**을 쓴다 —
 * `screen-eval-template-library.policy.md` §6.3 「이 화면의 빌더는 위자드 2단계와 같은
 * 컴포넌트다 … 한쪽에만 반영되면 버그로 본다」.
 *
 * 🔴 **라이브러리 전용 설정판을 따로 만들지 않는다.** 같은 판이 둘이 되면 다음에 한쪽만
 * 고쳐져 갈라진다. PW-482 가 「그래서 아예 두지 말자」로 잠시 닫아 둔 자리이고, 기획서가
 * 「나눠 쓰라」로 확정했다.
 *
 * 이 부품은 **상태를 갖지 않는다.** 값을 바꾸는 일은 전부 `onPatch*` 로 호출부에 넘긴다 —
 * 마법사는 위자드 초안에, 라이브러리는 편집 초안에 반영한다. 저장 시점도 호출부가 정한다
 * (패널 조작만으로는 서버를 부르지 않는다 — §5.11-C 「API 호출」).
 */
export default function EvalTemplateItemSettings({
  q,
  labels: L,
  reviewType,
  disclosureSupported,
  disclosure,
  options,
  onPatch,
  onPatchOption,
  onAddOption,
  onRemoveOption,
  onPatchDisclosure,
  onToggleAudience,
  onClose,
}) {
  const scaleMax = scaleMaxOf(q);
  const guideDisplay = q.descriptionDisplay || 'tooltip';
  return (
    <div className="evc-tpl-settings" data-testid={`evc-tpl-settings-${q.id}`}>
      {q.type === 'rating' && (
        <div className="evc-tpl-set-block">
          <div className="evc-tpl-set-title">{L.scaleSettingsTitle}</div>
          <div className="evc-tpl-set-row">
            <span className="evc-tpl-set-note">{L.scaleFrom}</span>
            <input
              type="number"
              className="evc-input evc-tpl-set-num"
              value={scaleMax}
              min={SCALE_MAX_MIN}
              max={SCALE_MAX_MAX}
              onChange={(e) => onPatch(q.id, { scaleMax: clampScaleMax(e.target.value) })}
              data-testid={`evc-tpl-scalemax-${q.id}`}
            />
            <span className="evc-tpl-set-note">{L.scaleStepFixed}</span>
            {SCALE_PRESETS.map((n) => (
              <button
                type="button"
                key={n}
                className={`evc-type-chip${scaleMax === n ? ' is-on' : ''}`}
                onClick={() => onPatch(q.id, { scaleMax: n })}
                data-testid={`evc-tpl-scale-preset-${q.id}-${n}`}
              >
                {fill(L.scalePresetChip, { n })}
              </button>
            ))}
          </div>
          {/* 숫자만으로는 '5점이 좋은 쪽인지'조차 알 수 없다 — 역방향 척도를 쓰는 조직이 있다. */}
          <div className="evc-tpl-set-row">
            <span className="evc-tpl-set-note">{L.scaleAnchorMinLabel}</span>
            <input
              className="evc-input"
              value={q.scaleAnchorMin || ''}
              placeholder={L.scaleAnchorMinPlaceholder}
              onChange={(e) => onPatch(q.id, { scaleAnchorMin: e.target.value })}
              data-testid={`evc-tpl-anchor-min-${q.id}`}
            />
            <span className="evc-tpl-set-note">
              {fill(L.scaleAnchorMaxLabel, { max: scaleMax })}
            </span>
            <input
              className="evc-input"
              value={q.scaleAnchorMax || ''}
              placeholder={L.scaleAnchorMaxPlaceholder}
              onChange={(e) => onPatch(q.id, { scaleAnchorMax: e.target.value })}
              data-testid={`evc-tpl-anchor-max-${q.id}`}
            />
          </div>
          <p className="evc-tpl-set-help">{L.scaleFrozenAfterOpen}</p>
        </div>
      )}

      {q.type === 'checkbox' && (
        <div className="evc-tpl-set-block">
          <div className="evc-tpl-set-title">{L.optionsTitle}</div>
          <p className="evc-tpl-set-help">{L.optionsTitleHelp}</p>
          <div className="evc-tpl-options">
            {options.map((o, oi) => (
              <div key={o.id} className="evc-tpl-option">
                <span className="evc-tpl-option-mark">{q.allowMultiple ? '☐' : '○'}</span>
                <input
                  className="evc-input"
                  value={o.label}
                  placeholder={fill(L.optionPlaceholder, { n: oi + 1 })}
                  onChange={(e) => onPatchOption(q, o.id, e.target.value)}
                  data-testid={`evc-tpl-option-${q.id}-${oi}`}
                />
                <button
                  type="button"
                  className="evc-tpl-x"
                  onClick={() => onRemoveOption(q, o.id)}
                  disabled={options.length <= CHECK_MIN_OPTIONS}
                  aria-label={L.delete}
                  data-testid={`evc-tpl-option-del-${q.id}-${oi}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="evc-tpl-set-row">
            <button
              type="button"
              className="evc-btn is-ghost"
              onClick={() => onAddOption(q)}
              disabled={options.length >= CHECK_MAX_OPTIONS}
              data-testid={`evc-tpl-option-add-${q.id}`}
            >
              {L.optionAdd}
            </button>
            <label className="evl-promo-row">
              <input
                type="checkbox"
                checked={!!q.allowMultiple}
                onChange={(e) => onPatch(q.id, { allowMultiple: e.target.checked })}
                data-testid={`evc-tpl-allowmultiple-${q.id}`}
              />
              <span>{L.optionsAllowMultiple}</span>
            </label>
          </div>
        </div>
      )}

      {/* ② 가이드 문구 — 「노출 여부」는 이 축이고 「누가 보는가」는 아래 축이다. */}
      <div className="evc-tpl-set-block">
        <div className="evc-tpl-set-title">{L.guideTitle}</div>
        <input
          className="evc-input"
          value={q.description ?? ''}
          placeholder={L.itemDescPlaceholder}
          onChange={(e) => onPatch(q.id, { description: e.target.value })}
          data-testid={`evc-tpl-desc-${q.id}`}
        />
        <div className="evc-tpl-set-row">
          <span className="evc-tpl-set-note">{L.guideDisplayLabel}</span>
          {GUIDE_DISPLAYS.map((o) => (
            <button
              type="button"
              key={o.id}
              className={`evc-type-chip${guideDisplay === o.id ? ' is-on' : ''}`}
              onClick={() => onPatch(q.id, { descriptionDisplay: o.id })}
              data-testid={`evc-tpl-guide-${q.id}-${o.id}`}
            >
              {L[o.labelKey]}
            </button>
          ))}
        </div>
        {/* 이 오독이 티켓에 실제로 적혀 있었다 — 고정 노출한다 (policy §5.11-D). */}
        <p className="evc-tpl-set-help" data-testid={`evc-tpl-guide-axis-note-${q.id}`}>
          {L.guideAxisNote}
        </p>
      </div>

      {/* ③ 결과 공개 범위 — D7 배지가 「보여 주기만」 하던 그 목록을 여기서 정한다. */}
      <div className="evc-tpl-set-block is-last">
        <div className="evc-tpl-set-title">
          {L.disclosureTitle} <span className="evc-tpl-set-note">{L.disclosureTitleHint}</span>
        </div>
        {!disclosureSupported ? (
          <p className="evc-tpl-set-help" data-testid={`evc-tpl-disclosure-self-${q.id}`}>
            {L.disclosureSelfNote}
          </p>
        ) : (
          <>
            <div className="evc-tpl-set-row">
              {DISCLOSURE_AUDIENCES.map((a) => {
                const on = (disclosure.audience || []).includes(a.id);
                // 상향 리뷰의 '직속 조직장' = 평가 대상 본인. 켤 수는 있으나 무엇을 켜는지 알린다.
                const isTargetSelf = reviewType === 'upward' && a.id === 'manager';
                return (
                  <button
                    type="button"
                    key={a.id}
                    className={`evc-type-chip${on ? ' is-on' : ''}${isTargetSelf && on ? ' is-warn' : ''}`}
                    onClick={() => onToggleAudience(q, a.id)}
                    title={isTargetSelf ? L.audienceManagerIsTargetHint : undefined}
                    data-testid={`evc-tpl-audience-${q.id}-${a.id}`}
                  >
                    {L[a.labelKey]}
                    {isTargetSelf && on ? ' ⚠' : ''}
                  </button>
                );
              })}
            </div>
            {reviewType === 'upward' && (disclosure.audience || []).includes('manager') && (
              <p
                className="evc-tpl-set-help is-warn"
                data-testid={`evc-tpl-upward-warn-${q.id}`}
              >
                {L.audienceManagerIsTargetHint}
              </p>
            )}
            {/* 「보이는가」와 「누가 썼는지 보이는가」는 다른 축이다. */}
            <div className="evc-tpl-set-row">
              <span className="evc-tpl-set-note">{L.identityLabel}</span>
              {IDENTITY_OPTIONS.map((o) => (
                <button
                  type="button"
                  key={o.id}
                  className={`evc-type-chip${(disclosure.identity || 'anonymous') === o.id ? ' is-on' : ''}`}
                  onClick={() => onPatchDisclosure(q, { identity: o.id })}
                  title={L[o.descKey]}
                  data-testid={`evc-tpl-identity-${q.id}-${o.id}`}
                >
                  {L[o.labelKey]}
                </button>
              ))}
            </div>
            {/* 인원이 적으면 익명이 익명이 아니게 된다. */}
            <div className="evc-tpl-set-row">
              <label className="evl-promo-row">
                <input
                  type="checkbox"
                  checked={disclosure.minResponses != null}
                  onChange={(e) =>
                    onPatchDisclosure(q, {
                      minResponses: e.target.checked ? DEFAULT_MIN_RESPONSES : null,
                    })
                  }
                  data-testid={`evc-tpl-minresponses-on-${q.id}`}
                />
                <span>{L.minResponsesLabel}</span>
              </label>
              {disclosure.minResponses != null && (
                <input
                  type="number"
                  className="evc-input evc-tpl-set-num"
                  value={disclosure.minResponses}
                  min={2}
                  max={20}
                  onChange={(e) =>
                    onPatchDisclosure(q, {
                      minResponses: Math.min(20, Math.max(2, Math.round(+e.target.value) || 2)),
                    })
                  }
                  data-testid={`evc-tpl-minresponses-${q.id}`}
                />
              )}
            </div>
            <label className="evl-promo-row">
              <input
                type="checkbox"
                checked={!!disclosure.aiSummaryOnly}
                onChange={(e) => onPatchDisclosure(q, { aiSummaryOnly: e.target.checked })}
                data-testid={`evc-tpl-aisummary-${q.id}`}
              />
              <span>{L.aiSummaryOnlyLabel}</span>
            </label>
          </>
        )}
      </div>

      <div className="evc-tpl-set-foot">
        <button
          type="button"
          className="evc-btn is-ghost"
          onClick={onClose}
          data-testid={`evc-tpl-settings-close-${q.id}`}
        >
          {L.itemSettingsClose}
        </button>
      </div>
    </div>
  );
}