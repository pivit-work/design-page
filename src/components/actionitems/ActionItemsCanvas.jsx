import Icon from '../shared/Icon.jsx';
import SegmentedControl from '../shared/SegmentedControl.jsx';

/**
 * ActionItemsCanvas — "액션 아이템" 페이지 Pure 컴포넌트.
 *
 * 스니핏 히스토리(SnippetCanvas)와 같은 목록 화면 문법을 따른다:
 * 헤더 카드(타이틀·부제 + 우측 진행률) → 통계 카드 4개 → 필터 행 → 리스트.
 * 자체 상단바·브레드크럼은 두지 않는다(사이드바가 화면 맥락을 준다).
 *
 * 모든 데이터·문구는 props 로 받는다. 마감일 편집기·KR 연결 드롭다운처럼
 * 팝오버가 필요한 조각은 호스트가 renderDeadlineEditor / renderKrPicker 로
 * 끼워 넣는다(디자인은 이 캔버스가, 상태는 호스트가 소유).
 */

const DEFAULT_LABELS = {
  title: '액션 아이템',
  subtitle: '회의·1on1에서 나온 할 일을 한곳에서 관리합니다.',
  progress: '완료',
  searchPlaceholder: '항목 검색',
  groupByLabel: '묶기',
  countSuffix: '건',
  empty: '조건에 맞는 액션 아이템이 없습니다.',
};

/** 통계 값 색 — 토큰 클래스로만 표현한다(하드코딩 색 금지). */
const TONE_CLASS = {
  default: '',
  success: 'is-success',
  warning: 'is-warning',
  error: 'is-error',
};

function initial(name) {
  return (name || '').trim().slice(0, 1) || '·';
}

function ActionRow({ item, labels, onToggle, renderDeadlineEditor, renderKrPicker, onKrClick }) {
  return (
    <div
      className={`ai-row ${item.done ? 'is-done' : ''} ${item.recent ? 'is-recent' : ''}`.trim()}
      data-testid="ai-row"
    >
      <button
        type="button"
        className={`ai-check ${item.done ? 'is-checked' : ''}`.trim()}
        role="checkbox"
        aria-checked={!!item.done}
        aria-label={item.title}
        onClick={() => onToggle?.(item.id)}
      >
        {item.done && (
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
            <path
              d="M2.5 6.2l2.4 2.4L9.5 4"
              fill="none"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      <span className="ai-row-title" title={item.title}>
        {item.title}
      </span>

      <span className="ai-row-meta">
        {item.priorityLabel && (
          <span className={`ai-badge is-${item.priorityTone || 'low'}`}>{item.priorityLabel}</span>
        )}

        {renderDeadlineEditor?.(item) ??
          (item.deadlineLabel ? (
            <button
              type="button"
              className={`ai-deadline ${item.deadlineTone ? `is-${item.deadlineTone}` : ''}`.trim()}
              onClick={() => item.onDeadlineClick?.(item.id)}
            >
              {item.deadlineLabel}
            </button>
          ) : null)}

        {item.ownerName && (
          <span className="ai-owner">
            <span className="ai-owner-avatar">{initial(item.ownerName)}</span>
            {item.ownerName}
          </span>
        )}

        {renderKrPicker?.(item) ?? (
          <button
            type="button"
            className={`ai-kr-btn ${item.krLabel ? 'is-linked' : ''}`.trim()}
            onClick={() => onKrClick?.(item.id)}
          >
            {item.krLabel || labels.krLink || '+ KR 연결'}
          </button>
        )}
      </span>
    </div>
  );
}

export default function ActionItemsCanvas({
  baseUrl = '',
  labels: labelsProp,
  // 헤더 진행률
  doneCount = 0,
  totalCount = 0,
  // 뷰 전환 (목록 / OKR 연관)
  viewItems = [],
  view,
  onViewChange,
  // 통계 카드 [{ key, label, value, tone }]
  stats = [],
  // 필터
  search = '',
  onSearchChange,
  statusItems = [],
  status,
  onStatusChange,
  selects = [],
  groupByItems = [],
  groupBy,
  onGroupByChange,
  resultCount = null,
  // 목록 [{ key, label, done, total, items: [...] }]
  groups = [],
  onToggle,
  onKrClick,
  renderDeadlineEditor,
  renderKrPicker,
  // OKR 연관 뷰 [{ id, title, sub, expanded, items }]
  krGroups = null,
  onToggleKr,
}) {
  const labels = { ...DEFAULT_LABELS, ...(labelsProp || {}) };
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const isOkrView = krGroups != null;
  const hasRows = groups.some((g) => g.items?.length);

  return (
    <main className="tl-page ai-page">
      <div className="ai-header">
        <div className="ai-header-info">
          <h1 className="ai-title">{labels.title}</h1>
          <p className="ai-subtitle">{labels.subtitle}</p>
        </div>
        <div className="ai-progress">
          <span className="ai-progress-label">
            {labels.progress} {doneCount}/{totalCount}
          </span>
          <span className="ai-progress-track">
            <span className="ai-progress-fill" style={{ width: `${pct}%` }} />
          </span>
        </div>
      </div>

      <div className="ai-body">
        {viewItems.length > 1 && (
          <SegmentedControl
            items={viewItems}
            value={view}
            onChange={onViewChange}
            ariaLabel={labels.title}
          />
        )}

        {stats.length > 0 && (
          <div className="ai-stats">
            {stats.map((s) => (
              <div className="ai-stat-card" key={s.key || s.label}>
                <span className="ai-stat-label">{s.label}</span>
                <span className={`ai-stat-value ${TONE_CLASS[s.tone] || ''}`.trim()}>{s.value}</span>
              </div>
            ))}
          </div>
        )}

        <div className="ai-filter-row">
          <label className="ai-search">
            <Icon src="/icons/search-sm.svg" size={20} color="var(--text-tertiary)" baseUrl={baseUrl} />
            <input
              type="search"
              value={search}
              placeholder={labels.searchPlaceholder}
              onChange={(e) => onSearchChange?.(e.target.value)}
              aria-label={labels.searchPlaceholder}
            />
          </label>

          {statusItems.length > 0 && (
            <SegmentedControl
              items={statusItems}
              value={status}
              onChange={onStatusChange}
              ariaLabel={labels.statusAria || labels.title}
            />
          )}

          {selects.map((sel) => (
            <select
              key={sel.key}
              className="ai-select"
              value={sel.value}
              aria-label={sel.label}
              onChange={(e) => sel.onChange?.(e.target.value)}
            >
              {sel.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ))}

          {groupByItems.length > 0 && (
            <span className="ai-groupby">
              <span className="ai-groupby-label">{labels.groupByLabel}</span>
              <SegmentedControl
                items={groupByItems}
                value={groupBy}
                onChange={onGroupByChange}
                ariaLabel={labels.groupByLabel}
              />
            </span>
          )}

          {resultCount != null && (
            <span className="ai-count">
              {resultCount}
              {labels.countSuffix}
            </span>
          )}
        </div>

        {isOkrView ? (
          krGroups.length === 0 ? (
            <div className="ai-empty">{labels.empty}</div>
          ) : (
            krGroups.map((kr) => (
              <div className="ai-kr-card" key={kr.id}>
                <button type="button" className="ai-kr-head" onClick={() => onToggleKr?.(kr.id)}>
                  <span className="ai-kr-title">{kr.title}</span>
                  <span className="ai-kr-sub">{kr.sub}</span>
                  <Icon
                    src={kr.expanded ? '/icons/chevron-down.svg' : '/icons-solid/chevron-selector-vertical.svg'}
                    size={16}
                    color="var(--text-tertiary)"
                    baseUrl={baseUrl}
                  />
                </button>
                {kr.expanded && (
                  <div className="ai-kr-body">
                    <div className="ai-list">
                      {kr.items.map((item) => (
                        <ActionRow
                          key={item.id}
                          item={item}
                          labels={labels}
                          onToggle={onToggle}
                          onKrClick={onKrClick}
                          renderDeadlineEditor={renderDeadlineEditor}
                          renderKrPicker={renderKrPicker}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )
        ) : !hasRows ? (
          <div className="ai-empty">{labels.empty}</div>
        ) : (
          groups
            .filter((g) => g.items?.length)
            .map((g) => (
              <section className="ai-group" key={g.key}>
                <header className="ai-group-head">
                  <span className="ai-group-dot" />
                  <span className="ai-group-title">{g.label}</span>
                  <span className="ai-group-progress">
                    {g.done}/{g.total}
                  </span>
                </header>
                <div className="ai-list">
                  {g.items.map((item) => (
                    <ActionRow
                      key={item.id}
                      item={item}
                      labels={labels}
                      onToggle={onToggle}
                      onKrClick={onKrClick}
                      renderDeadlineEditor={renderDeadlineEditor}
                      renderKrPicker={renderKrPicker}
                    />
                  ))}
                </div>
              </section>
            ))
        )}
      </div>
    </main>
  );
}
