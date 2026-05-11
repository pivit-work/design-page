import Icon from '../shared/Icon.jsx';
import SegmentedControl from '../shared/SegmentedControl.jsx';
import SnippetMemberAvatars from './SnippetMemberAvatars.jsx';

/**
 * SnippetCanvas — "스니핏" (스니핏 히스토리) 페이지 Pure 컴포넌트.
 * Figma: 멤버 뷰 16960:13435 / 매니저 뷰 16960:20541.
 *
 * 매니저 뷰는 멤버 뷰 위에 멤버 아바타 행이 추가된 형태. isManagerView 로 분기.
 * 그 토글은 개발 확인용 — 타이틀 옆 작은 토글 버튼으로 노출.
 *
 * 본문은 현재 빈 상태(작성한 스니핏 없음) 디자인만 구현 — paper 아이콘 +
 * 안내 문구 + "지금 작성하기" 버튼.
 *
 * 모든 데이터는 props 로 받는다.
 */
const PERIOD_ITEMS = [
  { value: 'thisWeek', label: '이번주' },
  { value: 'thisMonth', label: '이번 달' },
  { value: 'lastMonth', label: '지난 달' },
  { value: 'all', label: '전체' },
];

export default function SnippetCanvas({
  baseUrl,
  // 필터 — 기간 segmented
  periodTab,
  onPeriodTabChange,
  // 날짜 범위 (현재는 표시만)
  dateFrom = '',
  dateTo = '',
  // 검색어 (표시만)
  searchPlaceholder = '키워드 또는 태그로 검색',
  // 통계 카드
  recordCount = 0,
  avgHealth = '-',
  avgWrite = '-',
  // 매니저 뷰 토글 + 멤버 목록
  isManagerView = false,
  onToggleManagerView,
  members = [],
  selectedMemberId,
  onSelectMember,
  // 작성 액션
  onWriteSnippet,
  onWriteNow,
  // 빈 상태 여부 (현재는 항상 true — 리스트 디자인은 추후)
  isEmpty = true,
}) {
  return (
    <main className="tl-page snippet-page">
      {/* 헤더 카드 — 타이틀 + 부제 + 우측 "스니핏 작성" 버튼 */}
      <div className="snippet-header">
        <div className="snippet-header-info">
          <div className="snippet-title-row">
            <h1 className="snippet-title">스니핏</h1>
            {/* 개발 확인용 매니저 뷰 토글 */}
            <button
              type="button"
              className={`snippet-view-toggle ${isManagerView ? 'is-on' : ''}`}
              onClick={onToggleManagerView}
              title="개발 확인용 — 매니저/멤버 뷰 전환"
            >
              <span className="snippet-view-toggle-dot" />
              매니저 모드 {isManagerView ? 'on' : 'off'}
            </button>
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
          <button type="button" className="snippet-date-btn">
            <Icon src="/icons/calendar.svg" size={20} color="var(--text-tertiary)" baseUrl={baseUrl} />
            <span>{dateFrom || '시작일'}</span>
          </button>
          <span className="snippet-date-sep">-</span>
          <button type="button" className="snippet-date-btn">
            <Icon src="/icons/calendar.svg" size={20} color="var(--text-tertiary)" baseUrl={baseUrl} />
            <span>{dateTo || '종료일'}</span>
          </button>
          <div className="snippet-search">
            <Icon src="/icons/search-sm.svg" size={20} color="var(--text-tertiary)" baseUrl={baseUrl} />
            <input type="text" placeholder={searchPlaceholder} readOnly />
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

        {/* 본문 — 빈 상태 */}
        {isEmpty && (
          <div className="snippet-empty">
            <div className="snippet-empty-inner">
              <Icon src="/icons/file-05.svg" size={48} color="var(--text-tertiary)" baseUrl={baseUrl} />
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
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
