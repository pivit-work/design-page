import { useState } from 'react';
import Icon from '../shared/Icon.jsx';
import SegmentedControl from '../shared/SegmentedControl.jsx';
import SnippetMemberAvatars from './SnippetMemberAvatars.jsx';
import SnippetListRow from './SnippetListRow.jsx';
import DatePicker from '../shared/DatePicker.jsx';
import assetUrl from '../shared/assetUrl.js';

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

// 검색어(공백 구분 토큰)가 스니핏의 summary/dateLabel/tags 어딘가에 모두
// 포함되면 매치. 토큰 0개면 전체 통과.
function matchesQuery(s, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const tokens = q.split(/\s+/).filter(Boolean);
  const haystack = [
    s.summary ?? '',
    s.dateLabel ?? '',
    ...(s.detail?.tags ?? s.tags ?? []),
  ].join(' ').toLowerCase();
  return tokens.every((t) => haystack.includes(t));
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

  return (
    <main className="tl-page snippet-page">
      {/* 헤더 카드 — 타이틀 + 부제 + 우측 "스니핏 작성" 버튼 */}
      <div className="snippet-header">
        <div className="snippet-header-info">
          <div className="snippet-title-row">
            <h1 className="snippet-title">스니핏</h1>
            {/* 개발 확인용 매니저 뷰 토글 */}
            {showManagerToggle && (
              <button
                type="button"
                className={`snippet-view-toggle ${isManagerView ? 'is-on' : ''}`}
                onClick={onToggleManagerView}
                title="개발 확인용 — 매니저/멤버 뷰 전환"
              >
                <span className="snippet-view-toggle-dot" />
                매니저 모드 {isManagerView ? 'on' : 'off'}
              </button>
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
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* 통계 카드 3개 */}
        <div className="snippet-stats">
          <div className="snippet-stat-card">
            <span className="snippet-stat-label">기록 수</span>
            <span className="snippet-stat-value">{recordCount}개</span>
          </div>
          <div className="snippet-stat-card">
            <span className="snippet-stat-label">평균 헬스</span>
            <span className="snippet-stat-value">{avgHealth}</span>
          </div>
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
