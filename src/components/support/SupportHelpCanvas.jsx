import Button from '../shared/Button.jsx';
import Chip from '../shared/Chip.jsx';
import SegmentedControl from '../shared/SegmentedControl.jsx';
import EmptyState from '../shared/EmptyState.jsx';
import SearchInput from '../shared/SearchInput.jsx';
import { SkeletonList } from '../shared/Skeleton.jsx';
import {
  AlertTriangleGlyph,
  ArrowLeftGlyph,
  ArrowRightGlyph,
  BookOpenGlyph,
  CheckGlyph,
  CloseGlyph,
  PlayGlyph,
  SearchGlyph,
  ThumbsUpGlyph,
} from '../shared/lineIcons.jsx';
import MarkdownBody from './MarkdownBody.jsx';

/** 라벨은 글자이거나 (n) => 글자 함수다. */
const countLabel = (fn, n) => (typeof fn === 'function' ? fn(n) : n);

function Tags({ tags = [], limit }) {
  const shown = limit ? tags.slice(0, limit) : tags;
  if (shown.length === 0) return null;
  return shown.map((tag) => (
    <Chip key={tag} tone="neutral">
      #{tag}
    </Chip>
  ));
}

/**
 * SupportHelpCanvas — 고객지원 「도움말 센터」 (`/support/help`, PW-1131).
 *
 * 무엇을 보여 주나는 pivit-specs `M. 고객지원/support-app.jsx` 의 `SupportHelp`·`ArticleListItem`·
 * `ArticleDetail`·`MarkdownBody` (머리 카드 · 검색칸 + 지우기 · 분류 칩 · 왼쪽 글 목록 · 오른쪽 글 상세
 * 또는 첫 안내 · 「도움이 됐나요?」 · 「원하는 답을 찾지 못하셨나요?」 · 검색 0건 → [문의하기]).
 * 생김새는 문의하기·내 문의와 같은 화면 문법 — 머리 카드(.tl-page) · 공용 `SearchInput`·`Chip`·
 * `EmptyState`·`SkeletonList`·`Button`. prefix: sup- (도움말 전용은 sup-help-)
 *
 * 문구·숫자 글자는 전부 호출부가 준다. 목록 줄의 조회·도움됨 글자는 `labels.viewsOf(n)`·
 * `labels.helpfulOf(n)` 함수로 받는다. 본문은 마크다운 원문을 안전하게 풀어 그린다(`MarkdownBody`).
 * 폭이 900px 보다 좁으면 두 칸을 위아래로 쌓고, 글을 연 동안은 목록을 숨긴다([목록으로]로 돌아간다).
 *
 * Props:
 *   query · onQueryChange(v) · onClearQuery()
 *   categories      [{ value, label }] · category (null = 전체) · onCategoryChange(value|null)
 *   summaryText     목록 위 요약 한 줄(「전체 5건」) — 호출부가 만든다
 *   articles        [{ id, title, categoryLabel, tags: string[], viewCount, helpfulCount }]
 *   listLoading · listErrorText (null|string) · onListRetry()
 *   selectedId · onSelect(id)
 *   detail          null | { id, title, categoryLabel, tags, viewCount, body(markdown), helpfulCount, voted }
 *   detailLoading · detailErrorText · onDetailRetry()
 *   helpfulPending · onHelpful() · onAsk() · onBack()
 *   onInternalLink(href, event)?  본문 안쪽 링크(`/…`)를 앱 안에서 옮길 때(없으면 보통 링크)
 *   (튜토리얼 영상 탭 · pivit-work PW-2430 · screen-support-help.policy.md v1.2)
 *   mediaTabs       [{ value, label }] — 비면 탭 줄을 그리지 않는다(종전 화면 그대로) · media · onMediaChange(value)
 *   videoGroups     media === 'video' 일 때 목록 — [{ key, label, items: [{ code, title, summary?, durationText?, active }] }]
 *   onVideoSelect(code)  영상 줄을 누름 — 상세 없이 바로 영상 창(호출부)
 *                   영상 탭에서는 분류 칩을 숨기고, 오른쪽에는 상세 대신 안내(labels.videoGuide)와 [labels.ask]
 *   labels          { heading, sub, searchPlaceholder, clearSearch, all, emptyTitle, emptyBody, ask,
 *                     pickTitle, pickBody, notFoundTitle, notFoundBody, helpfulQuestion, helpfulCount,
 *                     helpful, helpfulDone, back, views, retry, loading,
 *                     viewsOf(n), helpfulOf(n) }
 *                   notFoundTitle·notFoundBody 는 「원하는 답을 찾지 못하셨나요?」 안내 두 줄
 */
export default function SupportHelpCanvas({
  query = '',
  onQueryChange,
  onClearQuery,
  categories = [],
  category = null,
  onCategoryChange,
  summaryText,
  articles = [],
  listLoading = false,
  listErrorText = null,
  onListRetry,
  selectedId = null,
  onSelect,
  detail = null,
  detailLoading = false,
  detailErrorText = null,
  onDetailRetry,
  helpfulPending = false,
  onHelpful,
  onAsk,
  onBack,
  onInternalLink,
  mediaTabs = [],
  media = 'help',
  onMediaChange,
  videoGroups = [],
  onVideoSelect,
  labels = {},
}) {
  const videoTab = media === 'video';
  const askButton = (testId, variant = 'primary') => (
    <Button variant={variant} onClick={() => onAsk?.()} data-testid={testId}>
      {labels.ask}
    </Button>
  );

  const renderList = () => {
    if (listLoading) {
      return (
        <SkeletonList
          count={4}
          height={64}
          aria-busy="true"
          aria-label={labels.loading}
          data-testid="support-help-list-loading"
        />
      );
    }
    if (listErrorText) {
      return (
        <EmptyState
          icon={<AlertTriangleGlyph size={28} />}
          description={listErrorText}
          actions={
            <Button variant="secondary" onClick={() => onListRetry?.()} data-testid="support-help-list-retry">
              {labels.retry}
            </Button>
          }
          role="alert"
          data-testid="support-help-list-error"
        />
      );
    }
    if (videoTab) {
      const empty = videoGroups.every((g) => g.items.length === 0);
      return (
        <>
          {summaryText && (
            <p className="sup-help-summary" data-testid="support-help-summary">
              {summaryText}
            </p>
          )}
          {empty ? (
            <EmptyState
              icon={<SearchGlyph size={28} />}
              title={labels.emptyTitle}
              description={labels.emptyBody}
              actions={askButton('support-help-empty-ask')}
              data-testid="support-help-video-empty"
            />
          ) : (
            videoGroups
              .filter((g) => g.items.length > 0)
              .map((g) => (
                <section key={g.key} className="sup-help-video-group" data-testid={`support-help-video-group-${g.key}`}>
                  <p className="sup-help-summary">{g.label}</p>
                  <ul className="sup-help-rows">
                    {g.items.map((v) => (
                      <li key={v.code}>
                        <Button
                          className={`sup-help-row is-video${v.active ? ' is-active' : ''}`}
                          aria-current={v.active ? 'true' : undefined}
                          onClick={() => onVideoSelect?.(v.code)}
                          data-testid={`support-help-video-${v.code}`}
                        >
                          <span className="sup-help-row-main">
                            <span className="sup-help-row-title sup-help-video-title">
                              <PlayGlyph size={12} />
                              {v.title}
                            </span>
                            {v.summary && <span className="sup-help-video-summary">{v.summary}</span>}
                          </span>
                          {v.durationText && <span className="sup-help-row-stats">{v.durationText}</span>}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))
          )}
        </>
      );
    }
    return (
      <>
        {summaryText && (
          <p className="sup-help-summary" data-testid="support-help-summary">
            {summaryText}
          </p>
        )}
        {articles.length === 0 ? (
          <EmptyState
            icon={<SearchGlyph size={28} />}
            title={labels.emptyTitle}
            description={labels.emptyBody}
            actions={askButton('support-help-empty-ask')}
            data-testid="support-help-empty"
          />
        ) : (
          <ul className="sup-help-rows">
            {articles.map((a) => {
              const active = a.id === selectedId;
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    className={`sup-help-row${active ? ' is-active' : ''}`}
                    aria-current={active ? 'true' : undefined}
                    onClick={() => onSelect?.(a.id)}
                    data-testid={`support-help-row-${a.id}`}
                  >
                    <span className="sup-help-row-main">
                      <span className="sup-help-row-title">{a.title}</span>
                      <span className="sup-help-row-tags">
                        {a.categoryLabel && <Chip tone="accent">{a.categoryLabel}</Chip>}
                        <Tags tags={a.tags} limit={2} />
                      </span>
                    </span>
                    <span className="sup-help-row-stats">
                      <span>{countLabel(labels.viewsOf, a.viewCount)}</span>
                      <span className="sup-help-row-helpful">
                        <ThumbsUpGlyph size={12} />
                        {countLabel(labels.helpfulOf, a.helpfulCount)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </>
    );
  };

  const renderDetail = () => {
    if (videoTab) {
      return (
        <section className="sup-card sup-help-pick">
          <EmptyState size="lg" icon={<BookOpenGlyph size={32} />} description={labels.videoGuide} data-testid="support-help-video-guide">
            <div className="sup-help-pick-ask">{askButton('support-help-video-ask', 'secondary')}</div>
          </EmptyState>
        </section>
      );
    }
    if (detailLoading) {
      return (
        <section className="sup-card sup-help-detail" data-testid="support-help-detail-loading">
          <SkeletonList count={5} height={24} aria-busy="true" aria-label={labels.loading} />
        </section>
      );
    }
    if (detailErrorText) {
      return (
        <section className="sup-card sup-help-pick">
          <EmptyState
            size="lg"
            icon={<AlertTriangleGlyph size={32} />}
            description={detailErrorText}
            actions={
              <>
                <Button variant="secondary" onClick={() => onDetailRetry?.()} data-testid="support-help-detail-retry">
                  {labels.retry}
                </Button>
                {askButton('support-help-detail-ask')}
              </>
            }
            role="alert"
            data-testid="support-help-detail-error"
          />
        </section>
      );
    }
    if (detail) {
      return (
        <article className="sup-card sup-help-detail" data-testid="support-help-detail">
          {onBack && (
            <div>
              <Button variant="ghost" size="sm" onClick={() => onBack()} data-testid="support-help-back">
                <ArrowLeftGlyph size={14} />
                {labels.back}
              </Button>
            </div>
          )}
          <h2 className="sup-help-detail-title" data-testid="support-help-detail-title">
            {detail.title}
          </h2>
          <div className="sup-help-detail-meta">
            {detail.categoryLabel && <Chip tone="accent">{detail.categoryLabel}</Chip>}
            <Tags tags={detail.tags} />
            <span className="sup-help-detail-views">{countLabel(labels.viewsOf, detail.viewCount)}</span>
          </div>
          <hr className="sup-help-divider" />
          <MarkdownBody text={detail.body} onInternalLink={onInternalLink} data-testid="support-help-body" />
          <hr className="sup-help-divider" />

          <div className="sup-help-box" data-testid="support-help-helpful-box">
            <div className="sup-help-box-text">
              <p className="sup-help-box-title">{labels.helpfulQuestion}</p>
              {labels.helpfulCount && <p className="sup-help-box-sub">{labels.helpfulCount}</p>}
            </div>
            <Button
              variant="secondary"
              className={detail.voted ? 'sup-help-voted' : undefined}
              onClick={() => onHelpful?.()}
              disabled={detail.voted || helpfulPending}
              pending={helpfulPending}
              aria-pressed={detail.voted ? 'true' : 'false'}
              data-voted={detail.voted ? 'true' : 'false'}
              data-testid="support-help-helpful"
            >
              {detail.voted ? <CheckGlyph size={16} /> : <ThumbsUpGlyph size={16} />}
              {detail.voted ? labels.helpfulDone : labels.helpful}
            </Button>
          </div>

          <div className="sup-help-box is-brand">
            <div className="sup-help-box-text">
              <p className="sup-help-box-title">{labels.notFoundTitle}</p>
              {labels.notFoundBody && <p className="sup-help-box-sub">{labels.notFoundBody}</p>}
            </div>
            <Button variant="primary" onClick={() => onAsk?.()} data-testid="support-help-ask">
              {labels.ask}
              <ArrowRightGlyph size={16} />
            </Button>
          </div>
        </article>
      );
    }
    return (
      <section className="sup-card sup-help-pick">
        <EmptyState
          size="lg"
          icon={<BookOpenGlyph size={32} />}
          title={labels.pickTitle}
          description={labels.pickBody}
          data-testid="support-help-pick"
        >
          <div className="sup-help-pick-ask">
            {labels.notFoundTitle && <span className="sup-help-pick-ask-text">{labels.notFoundTitle}</span>}
            {askButton('support-help-pick-ask', 'secondary')}
          </div>
        </EmptyState>
      </section>
    );
  };

  const opened = !videoTab && Boolean(detail || detailLoading || detailErrorText);

  return (
    <main className="tl-page sup-page" data-testid="support-help">
      <div className="sup-header">
        <div className="sup-header-text">
          <h1 className="sup-title">{labels.heading}</h1>
          {labels.sub && <p className="sup-sub">{labels.sub}</p>}
        </div>
      </div>

      <div className="sup-body">
        <div className="sup-help">
          {mediaTabs.length > 0 && (
            <div className="sup-cats">
              <SegmentedControl
                ariaLabel={labels.mediaTabs}
                value={media}
                onChange={(next) => onMediaChange?.(next)}
                items={mediaTabs.map((m) => ({
                  value: m.value,
                  // 영상 탭은 글자 앞에 ▶ 그림(번역 문구에 기호를 넣지 않는다)
                  label:
                    m.value === 'video' ? (
                      <span className="sup-help-media-label">
                        <PlayGlyph size={12} />
                        {m.label}
                      </span>
                    ) : (
                      m.label
                    ),
                  testId: `support-help-media-${m.value}`,
                }))}
              />
            </div>
          )}
          <div className="sup-help-search">
            <SearchInput
              value={query}
              onChange={(e) => onQueryChange?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && query) {
                  e.preventDefault();
                  onClearQuery?.();
                }
              }}
              placeholder={labels.searchPlaceholder}
              data-testid="support-help-search"
            />
            {query.length > 0 && (
              <button
                type="button"
                className="sup-help-search-clear"
                aria-label={labels.clearSearch}
                onClick={() => onClearQuery?.()}
                data-testid="support-help-clear"
              >
                <CloseGlyph size={16} />
              </button>
            )}
          </div>

          {/* 하나만 고르는 칸이라 공용 세그먼트 버튼 (PW-1902). 「전체」는 null 값 대신 '' 로 싣는다 */}
          {!videoTab && (
          <div className="sup-cats">
            <SegmentedControl
              ariaLabel={labels.all}
              value={category ?? ''}
              onChange={(next) => onCategoryChange?.(next === '' ? null : next)}
              items={[
                { value: '', label: labels.all, testId: 'support-help-cat-all' },
                ...categories.map((c) => ({
                  value: c.value,
                  label: c.label,
                  testId: `support-help-cat-${c.value}`,
                })),
              ]}
            />
          </div>
          )}

          <div className={`sup-help-split${opened ? ' is-open' : ''}`}>
            <section className="sup-card sup-help-list">{renderList()}</section>
            <div className="sup-help-side">{renderDetail()}</div>
          </div>
        </div>
      </div>
    </main>
  );
}
