// TC-051/052 항목 설명(툴팁) · TC-053 항목별 공개 대상 — 셀프/동료/하향 캔버스 공용.
// 캔버스마다 필드 렌더가 달라도 라벨 옆 ⓘ 툴팁과 항목 하단 공개범위 안내는 동일 규칙으로 노출한다.

const DEFAULT_VIS = {
  visibleToEvaluatee: '이 항목은 피평가자 본인에게도 공개됩니다.',
  visibleToOthers:
    '이 항목은 피평가자 본인에게 공개되지 않으며, 매니저·HR·캘리브레이션 위원회에 공유됩니다.',
};

/** visibleToRoles(null=전체 공개) → 피평가자 공개 여부. self/evaluatee 포함이면 공개. */
function isVisibleToEvaluatee(visibleToRoles) {
  if (!visibleToRoles || visibleToRoles.length === 0) return true;
  return (
    visibleToRoles.includes('evaluatee') || visibleToRoles.includes('self')
  );
}

/** 라벨 옆 설명 툴팁(ⓘ). description 없으면 아무것도 렌더하지 않음. */
export function FieldInfo({ description }) {
  if (!description) return null;
  return (
    <span
      className="evx-field-info"
      title={description}
      data-testid="evx-field-info"
      aria-label={description}
    >
      ⓘ
    </span>
  );
}

/** 항목 하단 공개 범위 안내. labels 로 문구 오버라이드 가능. */
export function FieldVisibility({ visibleToRoles, labels }) {
  const L = { ...DEFAULT_VIS, ...(labels || {}) };
  const toEvaluatee = isVisibleToEvaluatee(visibleToRoles);
  return (
    <p
      className={`evx-field-visibility${toEvaluatee ? '' : ' is-restricted'}`}
      data-testid="evx-field-visibility"
    >
      <span aria-hidden="true">{toEvaluatee ? '👁' : '🔒'}</span>{' '}
      {toEvaluatee ? L.visibleToEvaluatee : L.visibleToOthers}
    </p>
  );
}
