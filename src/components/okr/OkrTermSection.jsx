import { useState } from 'react';
import { isEnterKey } from '../shared/enterKey.js';
import StatusBadge from '../shared/StatusBadge.jsx';

/**
 * «목표 체계 이름» 칸 (pivit-specs `screen-okr-context-setup.policy.md` §3-1B · `okr-policy.md` §2H · PW-2587).
 * 정본 시안 `okr-app.jsx` 의 `OkrTermSection`. 회사가 화면의 «OKR» 을 KPI·목표 등으로 바꾸는 자리다.
 *
 * 디자이너 원본이 없는 칸이라 같은 카드의 디자이너 부품을 그대로 쓴다(design-review):
 * 제목·안내 = 운영 단위 칸의 `.okr-wz-question`·`.okr-wz-desc`, 입력 = 지식 소스 링크 입력 `.okr-textarea.is-compact`,
 * [적용] = 지식 소스 [등록] `.okr-btn.is-brand.is-sm`, «기본값으로» = [타입 변경] `.okr-ghost-btn`,
 * 글자 수 = 텍스트 소스 글자 수(`.okr-wz-tip` / 넘으면 `.okr-status-badge.is-error`), 불러오기 실패 = `.okr-ctx-alert.is-row`.
 *
 * - 운영 단위 칩과 달리 [적용]을 따로 둔다 — 글자를 칠 때마다 회사 전체 화면 이름이 바뀌면 안 된다(§3-1B).
 * - 불러오지 못하면 입력칸을 그리지 않는다(§2H.5 N7) — 모르는 값 위에 저장해 다른 어드민이 정한 이름을 덮지 않게.
 * - 저장·토스트는 호스트 몫이다. `onApply(name)` 이 true 를 돌려주면 저장된 것으로, false 면 입력값을 그대로 둔다(N5).
 *
 * props
 *   term — 지금 저장된 이름(기본값이면 'OKR'). 없으면(불러오는 중) 칸 자리에 `labels.loading`.
 *   error — 불러오기 실패 문구. 있으면 [다시 시도](`onRetry`)와 함께 그 줄만 그린다.
 *   readOnly — 어드민이 아니면 값만 보인다([적용]·«기본값으로» 없음).
 *   otherMenuNames — 겹침 안내(N3)에 견줄 다른 메뉴 이름들.
 *   labels — title · hint · placeholder · inputLabel · counter(`{{count}} / {{max}}`) · apply · applying · reset ·
 *     previewLabel · previewCompany/Team/Personal/Write(`{{name}}`) · clash · tooLong · retry · loading
 */
const DEFAULT_TERM = 'OKR';
const MAX = 10;

const fill = (tpl, vars) =>
  Object.entries(vars).reduce((s, [k, v]) => s.split(`{{${k}}}`).join(String(v)), tpl || '');

export default function OkrTermSection({
  term,
  error = null,
  readOnly = false,
  onApply,
  onRetry,
  otherMenuNames = [],
  labels: L = {},
}) {
  const [draft, setDraft] = useState(term ?? '');
  const [saving, setSaving] = useState(false);
  // 저장된 이름이 바뀌면(처음 불러옴 · 저장 성공 · 다시 시도) 입력칸을 그 값으로 맞춘다 — 그리는 중에 맞춘다
  // (effect 에서 맞추면 한 번 옛 값으로 그린 뒤 다시 그린다).
  const [seenTerm, setSeenTerm] = useState(term);
  if (term !== seenTerm) {
    setSeenTerm(term);
    if (term !== undefined) setDraft(term);
  }

  const trimmed = draft.trim();
  const length = [...trimmed].length;
  const shown = trimmed || DEFAULT_TERM; // 비우면 기본값(§2H.1)
  const tooLong = length > MAX;
  const clash = !tooLong && otherMenuNames.includes(trimmed);
  const canApply = !readOnly && !!onApply && !saving && term !== undefined && shown !== term && !tooLong;

  const apply = async () => {
    if (!canApply) return;
    setSaving(true);
    try {
      await onApply(trimmed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="okr-wz-stepblock" data-testid="okr-term-section">
      <div className="okr-wz-section">
        <div className="okr-ctx-head-left">
          <p className="okr-wz-question">{L.title}</p>
        </div>
        <p className="okr-wz-desc">{L.hint}</p>
      </div>

      {error ? (
        <div role="alert" className="okr-ctx-alert is-row" data-testid="okr-term-error">
          {error}
          {onRetry && (
            <button type="button" className="okr-btn is-brand is-sm" data-testid="okr-term-retry" onClick={onRetry}>
              {L.retry}
            </button>
          )}
        </div>
      ) : term === undefined ? (
        <p className="okr-wz-desc">{L.loading}</p>
      ) : (
        <>
          <div className="okr-ctx-add-row okr-term-row">
            <input
              className="okr-textarea is-compact"
              data-testid="okr-term-input"
              aria-label={L.inputLabel}
              aria-invalid={tooLong || undefined}
              placeholder={L.placeholder}
              value={draft}
              readOnly={readOnly}
              onChange={(e) => setDraft(e.target.value.replace(/[\r\n]/g, ''))}
              onKeyDown={(e) => {
                if (isEnterKey(e)) {
                  e.preventDefault();
                  apply();
                }
              }}
            />
            {!readOnly && onApply && (
              <button
                type="button"
                className="okr-btn is-brand is-sm"
                data-testid="okr-term-apply"
                disabled={!canApply}
                aria-busy={saving || undefined}
                onClick={apply}
              >
                {saving ? L.applying : L.apply}
              </button>
            )}
            {!readOnly && onApply && term !== DEFAULT_TERM && (
              <button
                type="button"
                className="okr-ghost-btn"
                data-testid="okr-term-reset"
                onClick={() => setDraft(DEFAULT_TERM)}
              >
                {L.reset}
              </button>
            )}
            {/* 글자 수는 줄 끝(시안 «… {n} / 10») */}
            <p
              className={tooLong ? 'okr-status-badge is-error' : 'okr-wz-tip'}
              data-testid="okr-term-counter"
              data-over={tooLong ? 'true' : 'false'}
            >
              {fill(L.counter || '{{count}} / {{max}}', { count: length, max: MAX })}
            </p>
          </div>
          {tooLong && (
            <p className="okr-status-badge is-error" role="alert" data-testid="okr-term-too-long">
              {L.tooLong}
            </p>
          )}
          {clash && (
            <p className="okr-wz-tip" data-testid="okr-term-clash">
              {L.clash}
            </p>
          )}
          {/* 미리보기 — 입력 중인 값으로 그린다(저장 전 모습 · 빈 칸이면 OKR). 딱지는 머리 «관리자 전용»과 같은 기본 딱지 */}
          <div className="okr-ctx-head-left" data-testid="okr-term-preview">
            <span className="okr-wz-tip">{L.previewLabel}</span>
            {['previewCompany', 'previewTeam', 'previewPersonal', 'previewWrite'].map((k) => (
              <StatusBadge key={k}>{fill(L[k], { name: shown })}</StatusBadge>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
