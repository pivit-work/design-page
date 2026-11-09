import { useEffect, useRef } from 'react';
import Icon from '../shared/Icon.jsx';
import scrollToFocus from '../shared/scrollToFocus.js';
import StatusBadge from '../shared/StatusBadge.jsx';
import DueBadge from '../shared/DueBadge.jsx';
import SegmentedControl from '../shared/SegmentedControl.jsx';
import Skeleton, { SkeletonList } from '../shared/Skeleton.jsx';
import LoadMoreButton from '../shared/LoadMoreButton.jsx';
import Select from '../shared/Select.jsx';
import AnchoredLayer from '../shared/AnchoredLayer.jsx';

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
  linkedActions: '연결 액션',
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

function ActionRow({ item, labels, onToggle, renderDeadlineEditor, renderKrPicker, onKrClick, focused = false }) {
  // 소비처가 이 줄을 가리키면(알림으로 들어온 경우) 그 줄까지 화면을 내린다 (pivit-work PW-2016).
  const rowRef = useRef(null);
  useEffect(() => {
    if (focused) return scrollToFocus(rowRef.current);
  }, [focused]);
  // 마감 편집기는 줄 안이 아니라 칩 아래 뜨는 창에 둔다 — 줄 안에 끼우면 다른 칸이 밀린다
  // (screen-action-items.policy §3-1 ⑧ · pivit-work PW-2643). 칩은 눌린 표시로 제자리에 남는다.
  const dueRef = useRef(null);
  // 창이 열린 채 칩을 누르면 그 누르기는 바깥 누르기(저장하고 닫기)다. 바깥 누르기 감지가
  // mousedown 에서 먼저 창을 닫아 버려 이어지는 click 은 «닫힌 칩»을 누른 것으로 보이므로,
  // 그보다 앞서 오는 pointerdown 에서 «열려 있었다»를 적어 두고 그 click 은 열기로 쓰지 않는다.
  const pressedWhileOpen = useRef(false);
  const deadlineEditor = renderDeadlineEditor?.(item) ?? null;
  return (
    <div
      ref={rowRef}
      className={`ai-row ${item.done ? 'is-done' : ''} ${item.recent ? 'is-recent' : ''}`.trim()}
      data-testid="ai-row"
      data-item-id={item.id}
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

      {/* 제목을 누르면 그 할 일이 나온 회의·1on1 로 간다 — 호스트가 onTitleClick 을
          넘긴 행만 버튼이 된다(출처가 없는 행은 예전처럼 글자). 모양은 같다. */}
      {item.onTitleClick ? (
        <button
          type="button"
          className="ai-row-title is-link"
          title={item.title}
          onClick={() => item.onTitleClick(item.id)}
        >
          {item.title}
        </button>
      ) : (
        <span className="ai-row-title" title={item.title}>
          {item.title}
        </span>
      )}

      {/* 오른쪽 다섯 칸은 값이 없어도 자리를 둔다 — 모든 줄이 같은 세로선에 서게 (기획 §3-1 · PW-2643).
          너비는 action_items.css 의 `.ai-cell[data-cell=…]` 가 정한다. */}
      <span className="ai-row-meta">
        {/* 어느 자리에서 나온 할 일인지 — 회의 / 1on1 / OKR (기획 §4 «출처 배지 항상»). */}
        <span className="ai-cell" data-cell="source">
          {item.sourceLabel && (
            <StatusBadge className="ai-badge is-low" data-source-badge="">{item.sourceLabel}</StatusBadge>
          )}
        </span>
        <span className="ai-cell" data-cell="priority">
          {item.priorityLabel && (
            <StatusBadge className={`ai-badge is-${item.priorityTone || 'low'}`}>{item.priorityLabel}</StatusBadge>
          )}
        </span>

        <span className="ai-cell" data-cell="due" ref={dueRef}>
          {item.deadlineLabel ? (
            <DueBadge
              label={item.deadlineLabel}
              tone={item.deadlineTone}
              title={item.deadlineLabel}
              className={deadlineEditor ? 'is-pressed' : ''}
              aria-pressed={!!deadlineEditor}
              onPointerDown={() => {
                pressedWhileOpen.current = !!deadlineEditor;
              }}
              onClick={() => {
                const wasOpen = pressedWhileOpen.current;
                pressedWhileOpen.current = false;
                if (wasOpen || deadlineEditor) return;
                item.onDeadlineClick?.(item.id);
              }}
            />
          ) : null}
        </span>
        {deadlineEditor && (
          <AnchoredLayer anchorRef={dueRef} gap={4} className="ai-due-pop">
            {deadlineEditor}
          </AnchoredLayer>
        )}

        <span className="ai-cell" data-cell="owner" title={item.ownerName || undefined}>
          {item.ownerName && (
            <span className="ai-owner">
              <span className="ai-owner-avatar">{initial(item.ownerName)}</span>
              <span className="ai-owner-name">{item.ownerName}</span>
            </span>
          )}
        </span>

        <span className="ai-cell" data-cell="kr">
          {renderKrPicker?.(item) ?? (
            <button
              type="button"
              className={`ai-kr-btn ${item.krLabel ? 'is-linked' : ''}`.trim()}
              title={item.krLabel || undefined}
              onClick={() => onKrClick?.(item.id)}
            >
              {item.krLabel || labels.krLink || '+ KR 연결'}
            </button>
          )}
        </span>
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
  // 목록 [{ key, label, done, total, collapsed?, items: [...] }]
  //   item.sourceLabel — 행의 출처 배지(회의/1on1/OKR). 없으면 그리지 않는다.
  groups = [],
  // 묶음 머리를 눌러 접기·펼치기 — 넘기면 머리가 버튼이 되고, collapsed 인 묶음은 줄을 숨긴다.
  onToggleGroup,
  // 불러오는 중 — 통계·목록 자리에만 막대를 깐다. 머리·필터 행은 그대로 (기획 §5-1).
  statsLoading = false,
  listLoading = false,
  // 목록을 못 불러왔을 때 통계는 마지막 성공값을 흐리게 둔다 (기획 §5-3).
  statsStale = false,
  onToggle,
  onKrClick,
  renderDeadlineEditor,
  renderKrPicker,
  // OKR 연관 뷰 — 기획서(TC-MTG-033) 계층: Objective > KR > 액션 아코디언
  // [{ id, title, levelLabel, progress, actionCount, krs: [{ id, title, progress,
  //    done, total, ownerName, expanded, items }] }]
  objectives = null,
  onToggleKr,
  // 목록 뷰 맨 아래 [더 보기] `{ label, loadingLabel?, loading? }` (pivit-work PW-1941) — 끝낸 일을 나눠 받는다.
  // 소비처가 문구까지 만들어 넘기고, 더 남은 것이 없으면 빼서 버튼이 사라진다. 누르면 `onMore`.
  more,
  onMore,
  // 이 id 의 줄까지 화면을 내린다 — 알림으로 들어온 소비처가 «그 할 일» 을 가리킬 때 (pivit-work PW-2016).
  // 줄이 접힌 묶음·필터에 가려 있으면 보이게 하는 것은 소비처 몫이다.
  focusItemId = null,
}) {
  const labels = { ...DEFAULT_LABELS, ...(labelsProp || {}) };
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const isOkrView = objectives != null;
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
          <div className={`ai-stats ${statsStale ? 'is-stale' : ''}`.trim()} aria-busy={statsLoading || undefined}>
            {stats.map((s) => (
              <div className="ai-stat-card" key={s.key || s.label}>
                <span className="ai-stat-label">{s.label}</span>
                {statsLoading ? (
                  <Skeleton width={48} height={28} />
                ) : (
                  <span className={`ai-stat-value ${TONE_CLASS[s.tone] || ''}`.trim()}>{s.value}</span>
                )}
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
            <Select
              key={sel.key}
              className="ai-select"
            chevron={false}
              value={sel.value}
              aria-label={sel.label}
              onChange={(e) => sel.onChange?.(e.target.value)}
            >
              {sel.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
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

        {listLoading ? (
          <SkeletonList count={4} height={52} gap={2} data-testid="ai-list-skeleton" />
        ) : isOkrView ? (
          objectives.length === 0 ? (
            <div className="ai-empty">{labels.empty}</div>
          ) : (
            objectives.map((obj) => (
              <section className="ai-obj" key={obj.id}>
                <header className="ai-obj-head">
                  {/* 계층 표시(«전사»·«팀»)는 고정 폭 자리 — 표시가 없는 목표도 빈 자리를 둬서
                      목표 이름이 같은 세로선에서 시작한다 (기획 §3-2 ① · PW-2643). */}
                  <span className="ai-obj-level">
                    {obj.levelLabel && (
                      <StatusBadge className="ai-badge is-low" title={obj.levelLabel}>{obj.levelLabel}</StatusBadge>
                    )}
                  </span>
                  <span className="ai-obj-title">{obj.title}</span>
                  <span className="ai-obj-meta">
                    {labels.linkedActions} {obj.actionCount}
                  </span>
                </header>
                {typeof obj.progress === 'number' && (
                  <div className="ai-obj-bar">
                    <span className="ai-obj-bar-fill" style={{ width: `${Math.min(100, obj.progress)}%` }} />
                  </div>
                )}

                {obj.krs.map((kr) => (
                  <div className="ai-kr-card" key={kr.id}>
                    <button type="button" className="ai-kr-head" onClick={() => onToggleKr?.(kr.id)} aria-expanded={!!kr.expanded}>
                      <span className="ai-kr-gauge" aria-hidden="true">
                        <span className="ai-kr-gauge-fill" style={{ width: `${Math.min(100, kr.progress ?? 0)}%` }} />
                      </span>
                      <span className="ai-kr-title">{kr.title}</span>
                      <span className="ai-kr-sub">
                        {kr.done}/{kr.total}
                        {kr.ownerName ? ` · ${kr.ownerName}` : ''}
                      </span>
                      <Icon
                        // 목록 보기 묶음 머리와 같다 — 접힘 오른쪽 · 펼침 아래 (기획 §3-2 ③ · PW-2643).
                        src={kr.expanded ? '/icons/chevron-down.svg' : '/icons/chevron-right.svg'}
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
                              focused={focusItemId != null && item.id === focusItemId}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </section>
            ))
          )
        ) : !hasRows ? (
          <div className="ai-empty">{labels.empty}</div>
        ) : (
          groups
            .filter((g) => g.items?.length)
            .map((g) => (
              <section className="ai-group" key={g.key}>
                {onToggleGroup ? (
                  <button
                    type="button"
                    className="ai-group-head is-toggle"
                    aria-expanded={!g.collapsed}
                    onClick={() => onToggleGroup(g.key)}
                  >
                    <span className="ai-group-dot" />
                    <span className="ai-group-title">{g.label}</span>
                    <span className="ai-group-progress">
                      {g.done}/{g.total}
                      <Icon
                        src={g.collapsed ? '/icons/chevron-right.svg' : '/icons/chevron-down.svg'}
                        size={16}
                        color="var(--text-tertiary)"
                        baseUrl={baseUrl}
                      />
                    </span>
                  </button>
                ) : (
                  <header className="ai-group-head">
                    <span className="ai-group-dot" />
                    <span className="ai-group-title">{g.label}</span>
                    <span className="ai-group-progress">
                      {g.done}/{g.total}
                    </span>
                  </header>
                )}
                {!g.collapsed && (
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
                      focused={focusItemId != null && item.id === focusItemId}
                    />
                  ))}
                </div>
                )}
              </section>
            ))
        )}
        {!isOkrView && !listLoading && hasRows && more && (
          <LoadMoreButton
            label={more.label}
            loadingLabel={more.loadingLabel}
            loading={!!more.loading}
            onClick={onMore}
          />
        )}
      </div>
    </main>
  );
}
