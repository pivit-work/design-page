/**
 * 액션 아이템 화면 조각 — 빈 상태와 마감일 편집기.
 *
 * 둘 다 캔버스가 자리만 내주고(`labels.empty` · `renderDeadlineEditor`) 소비자가 그리던
 * 것이다. 모양은 소비자(pivit-work)가 칠하던 값을 그대로 옮겼다 — 빈 상태는
 * `.ai-empty-state`(이 저장소 action_items.css 로 옮김), 편집기는 기존
 * `.ai-row-meta` · `.ai-select` · `.ai-kr-btn` (pivit-work PW-766). 문구는 전부 소비자가 넘긴다.
 */

/**
 * 빈 목록 — 왜 비었는지 한 줄 + 도움말 한 줄 + 다음 행동 버튼 하나
 * (`screen-action-items.policy.md §5-2`: 검색으로 비면 검색 지우기, 필터로 비면 필터 초기화).
 * 캔버스의 `labels.empty` 자리(`.ai-empty` 상자) 안에 넣는다.
 */
export function ActionItemsEmptyState({ title, hint, actionLabel, onAction, testId }) {
  return (
    <div className="ai-empty-state" data-testid={testId}>
      <p className="ai-empty-title">{title}</p>
      {hint && <p className="ai-empty-hint">{hint}</p>}
      {actionLabel && onAction && (
        <button type="button" className="ai-kr-btn" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/**
 * 행의 마감 칩을 눌렀을 때 그 자리에 서는 날짜 입력 + [저장]·[마감 지우기]·[취소].
 * `onRemove` 를 안 넘기면(마감이 없는 항목) [마감 지우기] 를 그리지 않는다.
 */
export function ActionItemDeadlineEditor({
  value,
  onChange,
  onSave,
  onRemove,
  onCancel,
  labels = {},
}) {
  return (
    <span className="ai-row-meta">
      <input
        type="date"
        className="ai-select"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        aria-label={labels.input}
      />
      <button type="button" className="ai-kr-btn is-linked" onClick={onSave}>
        {labels.save}
      </button>
      {onRemove && (
        <button type="button" className="ai-kr-btn" onClick={onRemove}>
          {labels.remove}
        </button>
      )}
      <button type="button" className="ai-kr-btn" onClick={onCancel}>
        {labels.cancel}
      </button>
    </span>
  );
}
