import { useState } from 'react';
import Icon from '../shared/Icon.jsx';
import LoadMoreButton from '../shared/LoadMoreButton.jsx';
import SegmentedControl from '../shared/SegmentedControl.jsx';
import SnippetMemberAvatars from './SnippetMemberAvatars.jsx';
import SnippetListRow from './SnippetListRow.jsx';
import DatePicker from '../shared/DatePicker.jsx';
import assetUrl from '../shared/assetUrl.js';
import Switch from '../shared/Switch.jsx';
import { matchesQuery } from './snippetSearch.js';

/**
 * SnippetCanvas — "스니핏" (스니핏 히스토리) 페이지 Pure 컴포넌트.
 * Figma: 멤버 뷰 16960:13435 / 매니저 뷰 16960:20541 / 리스트 16960:20172.
 *
 * 매니저 뷰는 멤버 뷰 위에 멤버 아바타 행이 추가된 형태. isManagerView 로 분기.
 * 그 토글은 개발 확인용 — 타이틀 옆 작은 토글 버튼으로 노출.
 *
 * 날짜 범위 시작/종료 버튼은 클릭 시 DatePicker 캘린더 팝오버를 띄운다.
 * dateFrom/dateTo + onDateFromChange/onDateToChange 를 넘기면 호스트가 값을
 * 소유하고(controlled), 안 넘기면 initialDateFrom/To 로 내부 state 를 쓴다(데모).
 *
 * 모든 데이터는 props 로 받는다.
 *
 * `placeholder` 를 주면 헤더·본문 대신 같은 페이지 칸(`.tl-page.snippet-page`)에 그것만
 * 그린다 — 목록을 불러오지 못했을 때처럼 캔버스를 그릴 데이터가 없을 때. 페이지 칸 밖에서
 * 따로 그리면 위·오른쪽 여백이 헤더 카드 자리와 어긋난다.
 */
// 기간 빠른 선택 5종 — 기획 daily-snippet-spec §11.2/§11.3 정본
// (이번 주 / 지난 주 / 이번 달 / 지난 달 / 전체). "지난 주" 가 빠져 있어
// "지난 월~일" 한 주를 한 번에 잡을 방법이 없었다(PW-145).
const PERIOD_ITEMS = [
  { value: 'thisWeek', label: '이번 주' },
  { value: 'lastWeek', label: '지난 주' },
  { value: 'thisMonth', label: '이번 달' },
  { value: 'lastMonth', label: '지난 달' },
  { value: 'all', label: '전체' },
];

function fmtDate(d) {
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

// 막대 높이 — 칸(26) 안에서 점수/10 비율, 아주 낮은 점수도 보이게 3 이상 (기획 스니핏 작성 §10-A.1).
const TREND_TRACK_HEIGHT = 26;
const trendBarHeight = (score) =>
  Math.max(3, Math.round((Math.min(10, Math.max(0, score)) / 10) * TREND_TRACK_HEIGHT));
// 색 구간은 매니저 「이번 주 헬스」 점(.mgr-ts-dot)과 같다 — 8↑ 좋음 · 6~7 주의 · 5↓ 나쁨.
const trendTier = (score) => {
  const n = Math.round(score);
  return n >= 8 ? 'good' : n >= 6 ? 'warn' : 'bad';
};

function HealthTrendBars({ days = [] }) {
  return (
    <div className="snippet-trend" data-testid="snippet-health-trend">
      {days.map((d) => (
        <div className="snippet-trend-day" key={d.key} title={d.title}>
          <span className="snippet-trend-track">
            {d.score != null && (
              <span
                className={`snippet-trend-bar is-${trendTier(d.score)}`}
                style={{ height: trendBarHeight(d.score) }}
              />
            )}
          </span>
          <span className={`snippet-trend-weekday${d.isToday ? ' is-today' : ''}`}>{d.weekday}</span>
        </div>
      ))}
    </div>
  );
}

export default function SnippetCanvas({
  baseUrl,
  // 필터 — 기간 segmented
  periodTab,
  onPeriodTabChange,
  // 날짜 범위 초기값 (Date). 생략 시 데모 기본값. controlled 일 때는 무시된다.
  initialDateFrom,
  initialDateTo,
  // 날짜 범위 — controlled. 값을 넘기면 호스트가 소유하고, 캘린더에서 고른 날짜는
  // onDateFromChange/onDateToChange 로만 나간다(내부 state 를 쓰지 않음).
  dateFrom: dateFromProp,
  dateTo: dateToProp,
  onDateFromChange,
  onDateToChange,
  // 검색어 (표시만)
  searchPlaceholder = '키워드 또는 태그로 검색',
  // 통계 카드
  recordCount = 0,
  avgHealth = '-',
  avgWrite = '-',
  // 「평균 헬스」 칸 안 최근 5영업일 막대 (기획 스니핏 작성 §10-A · PW-1513). 생략하면 칸은 예전 그대로다.
  //   { status: 'loading' | 'ready' | 'empty' | 'error', caption, days: [{ key, weekday, title, score, isToday }] }
  //   loading 은 빈 칸 5개, ready 는 막대, empty·error 는 막대 없이 caption 만. 문구는 호스트가 정한다.
  healthTrend,
  // 매니저 뷰 토글 + 멤버 목록
  // showManagerToggle: 호스트가 역할 게이트를 걸 때 false (기본은 노출 — 데모 유지).
  showManagerToggle = true,
  isManagerView = false,
  onToggleManagerView,
  members = [],
  selectedMemberId,
  onSelectMember,
  // 작성 액션
  onWriteSnippet,
  onWriteNow,
  // 스니핏 리스트 — 비어 있으면 빈 상태, 있으면 리스트 렌더.
  //   shape: { id, dateLabel, summary, timestamp, recent? }
  snippets = [],
  onSnippetClick,
  // 헤더·본문 대신 페이지 칸에 그릴 것(불러오기 실패 등). 없으면 평소 화면.
  placeholder,
  // 리스트 맨 아래 [더 보기] `{ label, loadingLabel?, loading? }` (pivit-work PW-1941) — 호스트가 앞 몇 건만
  // 받았을 때. 검색 중에는 그리지 않는다(검색은 호스트가 기간 안을 다 받아 둔 뒤 거른다). 누르면 `onMore`.
  more,
  onMore,
  // 검색어가 바뀔 때 호스트에 알린다 (PW-1941) — 앞 몇 건만 받은 호스트가 검색 전에 나머지를 받게.
  onSearchChange,
}) {
  const [innerDateFrom, setInnerDateFrom] = useState(initialDateFrom ?? new Date(2026, 3, 10));
  const [innerDateTo, setInnerDateTo] = useState(initialDateTo ?? new Date(2026, 3, 15));
  const dateFrom = dateFromProp ?? innerDateFrom;
  const dateTo = dateToProp ?? innerDateTo;
  // 열린 picker: null | 'from' | 'to' + anchor 정보.
  const [picker, setPicker] = useState(null);
  // 검색어 — summary/dateLabel/tags 로 필터 + 결과 하이라이트.
  const [searchQuery, setSearchQuery] = useState('');
  const hasSearch = searchQuery.trim().length > 0;
  const filteredSnippets = hasSearch
    ? snippets.filter((s) => matchesQuery(s, searchQuery))
    : snippets;
  const isEmpty = filteredSnippets.length === 0;

  const openPicker = (which, e) => {
    const el = e.currentTarget;
    setPicker({ which, rect: el.getBoundingClientRect(), el });
  };
  const closePicker = () => setPicker(null);
  const handlePick = (d) => {
    if (picker?.which === 'from') {
      if (dateFromProp === undefined) setInnerDateFrom(d);
      onDateFromChange?.(d);
    } else if (picker?.which === 'to') {
      if (dateToProp === undefined) setInnerDateTo(d);
      onDateToChange?.(d);
    }
    closePicker();
  };

  if (placeholder != null) {
    return <main className="tl-page snippet-page">{placeholder}</main>;
  }

  return (
    <main className="tl-page snippet-page">
      {/* 헤더 카드 — 타이틀 + 부제 + 우측 "스니핏 작성" 버튼 */}
      <div className="snippet-header">
        <div className="snippet-header-info">
          <div className="snippet-title-row">
            <h1 className="snippet-title">스니핏</h1>
            {/* 개발 확인용 매니저 뷰 토글 */}
            {showManagerToggle && (
              <label className="snippet-view-switch" title="개발 확인용 — 매니저/멤버 뷰 전환">
                <Switch checked={isManagerView} onChange={() => onToggleManagerView?.()} />
                매니저 모드
              </label>
            )}
          </div>
          <p className="snippet-subtitle">
            과거에 작성한 데일리 스니핏을 날짜별로 조회합니다.
          </p>
        </div>
        <button type="button" className="snippet-write-btn" onClick={onWriteSnippet}>
          <Icon src="/icons-solid/pencil-01.svg" size={20} color="var(--text-white)" baseUrl={baseUrl} />
          <span>스니핏 작성</span>
        </button>
      </div>

      <div className="snippet-body">
        {isManagerView && (
          <SnippetMemberAvatars
            members={members}
            selectedId={selectedMemberId}
            onSelect={onSelectMember}
          />
        )}

        {/* 필터 row — 기간 segmented + 날짜 범위 + 검색 */}
        <div className="snippet-filter-row">
          <SegmentedControl
            items={PERIOD_ITEMS}
            value={periodTab}
            onChange={onPeriodTabChange}
            ariaLabel="기간 선택"
          />
          <button
            type="button"
            className={`snippet-date-btn ${picker?.which === 'from' ? 'is-open' : ''}`}
            onClick={(e) => openPicker('from', e)}
          >
            <Icon src="/icons/calendar.svg" size={20} color="var(--text-tertiary)" baseUrl={baseUrl} />
            <span>{fmtDate(dateFrom)}</span>
          </button>
          <span className="snippet-date-sep">-</span>
          <button
            type="button"
            className={`snippet-date-btn ${picker?.which === 'to' ? 'is-open' : ''}`}
            onClick={(e) => openPicker('to', e)}
          >
            <Icon src="/icons/calendar.svg" size={20} color="var(--text-tertiary)" baseUrl={baseUrl} />
            <span>{fmtDate(dateTo)}</span>
          </button>
          <div className={`snippet-search ${hasSearch ? 'is-active' : ''}`}>
            <Icon src="/icons/search-sm.svg" size={20} color="var(--text-tertiary)" baseUrl={baseUrl} />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                onSearchChange?.(e.target.value);
              }}
            />
          </div>
        </div>

        {/* 통계 카드 3개 */}
        <div className="snippet-stats">
          <div className="snippet-stat-card">
            <span className="snippet-stat-label">기록 수</span>
            <span className="snippet-stat-value">{recordCount}개</span>
          </div>
          {healthTrend ? (
            <div className="snippet-stat-card">
              <div className="snippet-stat-head">
                <span className="snippet-stat-label">평균 헬스</span>
                <span className="snippet-stat-caption">{healthTrend.caption}</span>
              </div>
              <div className="snippet-stat-value-row">
                <span className="snippet-stat-value">{avgHealth}</span>
                {(healthTrend.status === 'loading' || healthTrend.status === 'ready') && (
                  <HealthTrendBars days={healthTrend.days} />
                )}
              </div>
            </div>
          ) : (
            <div className="snippet-stat-card">
              <span className="snippet-stat-label">평균 헬스</span>
              <span className="snippet-stat-value">{avgHealth}</span>
            </div>
          )}
          <div className="snippet-stat-card">
            <span className="snippet-stat-label">평균 작성</span>
            <span className="snippet-stat-value">{avgWrite}</span>
          </div>
        </div>

        {/* 본문 — 빈 상태 / 검색 결과 없음 / 스니핏 리스트 */}
        {isEmpty ? (
          hasSearch ? (
            <div className="snippet-noresult">
              {`"${searchQuery.trim()}"에 대한 검색 결과가 없습니다.`}
            </div>
          ) : (
            <div className="snippet-empty">
              <div className="snippet-empty-inner">
                <img className="snippet-empty-paper" src={assetUrl(baseUrl, 'paper-empty.svg')} alt="" aria-hidden="true" />
                {isManagerView ? (
                  // 매니저가 멤버의 스니핏을 볼 때 — 안내문/작성 버튼 없이 타이틀만.
                  <p className="snippet-empty-title">아직 작성된 스니핏이 없습니다</p>
                ) : (
                  <>
                    <p className="snippet-empty-title">아직 작성한 스니핏이 없습니다</p>
                    <p className="snippet-empty-desc">
                      오늘의 스니핏을 작성하여 업무 맥락을 기록해보세요.
                      <br />
                      AI가 OKR 달성 근거로 자동 연결합니다.
                    </p>
                    <button type="button" className="snippet-empty-btn" onClick={onWriteNow}>
                      <Icon src="/icons-solid/pencil-01.svg" size={20} color="var(--text-secondary)" baseUrl={baseUrl} />
                      <span>지금 작성하기</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        ) : (
          <div className="snippet-list">
            {filteredSnippets.map((s) => (
              <SnippetListRow
                key={s.id}
                dateLabel={s.dateLabel}
                summary={s.summary}
                timestamp={s.timestamp}
                recent={s.recent}
                highlight={searchQuery}
                onClick={onSnippetClick ? () => onSnippetClick(s) : undefined}
              />
            ))}
          </div>
        )}
        {!hasSearch && !isEmpty && more && (
          <LoadMoreButton
            label={more.label}
            loadingLabel={more.loadingLabel}
            loading={!!more.loading}
            onClick={onMore}
          />
        )}
      </div>

      {picker && (
        <DatePicker
          anchorRect={picker.rect}
          anchorEl={picker.el}
          selectedDate={picker.which === 'from' ? dateFrom : dateTo}
          onSelect={handlePick}
          onClose={closePicker}
        />
      )}
    </main>
  );
}
