import CustomSelect from '../timeline/CustomSelect.jsx';
import Icon from '../shared/Icon.jsx';

/**
 * 1on1 페이지 상단 제목 줄 — 타이틀 + 「매니저 · 팀원 N명」 메타 + 우측 슬롯.
 *
 * `OneOnOneCanvasV2` 안에 있던 헤더를 그대로 떼어낸 것이다. 모양은 바뀌지 않는다 —
 * 옮기는 것이 목적이다.
 *
 * 발단(PW-477): 같은 제목 줄이 두 군데서 그려지고 있었다. 1on1 목록 화면은 이
 * 캔버스를, 진행 화면(pivit-work `/one-on-one`)은 자기 파일에 손으로 다시 그린
 * 사본을 썼고, 모양이 맞아 보인 것은 클래스 이름(`ono-page-header`·`ono-title`·
 * `ono-meta`)만 빌려 썼기 때문이었다. 한쪽이 움직이는 순간 어긋난다.
 *
 * 우측 슬롯(`children`)에 목록 화면은 「1on1 일정 추가」 버튼을, 진행 화면은 경과
 * 시간 타이머를 끼운다. `.ono-page-header` 가 `justify-content: space-between`
 * 이라 슬롯이 비면 제목 줄만 남는다.
 *
 * 라벨은 소비처가 번역해 넘길 수 있다(`managerLabel`·`teamCountLabel`). 안 넘기면
 * 캔버스가 쓰던 한국어 그대로라 기존 화면은 변화가 없다.
 */
/*
 * 팀 필터 (PW-720 · 기획 policy §20.3 · arch-design-tokens §9-O-2) · 정렬 (PW-1491).
 *
 * 자리는 제목 줄 **아래 한 줄**(`.ono-filter-row` · Figma 17749:20369, 2026-10-23). 종전엔
 * 「팀원 N명」 오른쪽 같은 줄에 붙어 있었는데, 시안이 제목 밑 자기 줄로 옮기고 모양도
 * 시안 「Buttons」(alpha-black-3 바탕 · r 8 · 36 높이) 로 바꿨다. 제목 줄이 sticky 라
 * 이 줄은 header 바깥 형제로 그린다 — 브리핑 바처럼 스크롤과 함께 올라간다.
 * 부품은 새로 만들지 않고 공용 드롭다운(`CustomSelect`)을 쓴다 — 그 기본 모양은
 * `styles/timeline.css` 에 있으니 이 헤더에 필터를 넘기는 화면은 그 스타일도 불러야 한다.
 * 「내 원온원」(`metaText`) 에서는 그리지 않는다 — 팀을 보는 화면이 아니다 (17556:23218).
 *
 * `search` = { value, onChange(text), placeholder, ariaLabel } — 필터 줄 맨 앞의 검색칸
 *   (Figma 17749:20407 · 270×40 · alpha-black-3 바탕, 글자가 들어오면 흰 바탕). 거르는 건 호스트가
 *   한다 — 이 칸은 글자만 넘긴다. 안 넘기면 검색칸이 없다. 글자가 들어 있는 동안은 「담당 팀원」 범위
 *   드롭다운을 감춘다(검색은 범위와 무관하게 찾는다는 뜻) — 다 지우면 다시 보인다.
 *
 * `scopeFilter` = { value, options: [{value,label}], onChange, ariaLabel }
 * `scopeNotice` = 넓혀 본 상태를 알리는 글자(예: 「담당 밖까지 보는 중」). 눈 아이콘과 함께 넘기면 필터 옆에
 *   브랜드 3차색으로 붙고, 드롭다운에는 브랜드 포커스 링이 둘린다(Figma 17753:20940) — 넓힌 상태가
 *   평소 화면과 구별돼야 한다(policy P-Q3).
 * 둘 다 안 넘기면 종전과 같은 화면이다.
 */
/*
 * 제목 탭 (Figma 17556:26509 · 17682:23155) — 매니저가 보는 1on1 은 제목 자리가 두 탭이다:
 * 「대시보드」(팀원들을 보는 매니저 화면) · 「내 원온원」(자기가 팀원으로 받는 1on1).
 * 종전 PW-926 의 `subNav`(제목 «위» 탭 줄) 를 제목 글자 자체로 합친 모양이다.
 *
 * `titleTabs` = [{ key, label, active, onClick }]. 넘기면 `title` 대신 이 탭들을 display-sm 으로
 * 그린다 — 활성 탭은 text-primary, 나머지는 text-quaternary. 이동은 `onClick` 으로 호스트가 한다
 * (라우팅은 여기 없다). 안 넘기면 종전처럼 `title` 한 줄이다.
 */
export default function OneOnOnePageHeader({
  title = '1on1',
  titleTabs,
  /** 메타 줄을 통째로 바꿔 끼우는 글자 — 「내 원온원」 탭처럼 매니저·팀원 수 대신
   *  보는 사람 자신(예: 「김민준 사원」)만 적을 때. 넘기면 managerName 줄 대신 이것만 그린다. */
  metaText,
  managerName,
  teamCount,
  managerLabel = '매니저',
  teamCountLabel,
  scopeFilter,
  sortControl,
  scopeNotice,
  search,
  baseUrl = '',
  children,
  actions,
  contained = false,
}) {
  const hasFilters = !metaText && (search || scopeFilter || sortControl);
  return (
    <>
    <header className={`ono-page-header${contained ? ' is-contained' : ''}`}>
      <div className="ono-title-block">
        {titleTabs?.length ? (
          <div className="ono-title-switch">
            {titleTabs.map((t) => (
              <button
                key={t.key ?? t.label}
                type="button"
                className={`ono-title-switch-btn${t.active ? ' is-active' : ''}`}
                aria-current={t.active ? 'page' : undefined}
                onClick={t.active ? undefined : t.onClick}
                data-testid={t.key ? `ono-title-tab-${t.key}` : undefined}
              >
                {t.label}
              </button>
            ))}
          </div>
        ) : (
          <h1 className="ono-title">{title}</h1>
        )}
        {metaText && (
          <div className="ono-meta">
            <span className="ono-meta-name">{metaText}</span>
          </div>
        )}
        {!metaText && managerName && (
          <div className="ono-meta">
            <span className="ono-meta-name">{managerName} {managerLabel}</span>
            <span className="ono-meta-divider">∙</span>
            <span className="ono-meta-count">
              {teamCountLabel ?? `팀원 ${teamCount}명`}
            </span>
          </div>
        )}
      </div>
      {actions && <div className="ono-member-actions">{actions}</div>}
      {children}
    </header>
    {hasFilters && (
      <div className="ono-filter-row" data-testid="ono-filter-row">
        {search && (
          <label className={`ono-filter-search${search.value ? ' has-value' : ''}`}>
            <Icon src="/icons/search-sm.svg" size={20} color="var(--text-tertiary)" baseUrl={baseUrl} />
            <input
              type="search"
              value={search.value ?? ''}
              placeholder={search.placeholder}
              aria-label={search.ariaLabel ?? search.placeholder}
              onChange={(e) => search.onChange?.(e.target.value)}
              data-testid="ono-filter-search"
            />
          </label>
        )}
        {scopeFilter && !search?.value && (
          <span className={`ono-filter${scopeNotice ? ' is-widened' : ''}`}>
            <CustomSelect
              value={scopeFilter.value}
              onChange={scopeFilter.onChange}
              options={scopeFilter.options}
              ariaLabel={scopeFilter.ariaLabel}
              size="sm"
            />
          </span>
        )}
        {sortControl && (
          <span className="ono-filter">
            <CustomSelect
              value={sortControl.value}
              onChange={sortControl.onChange}
              options={sortControl.options}
              ariaLabel={sortControl.ariaLabel}
              size="sm"
            />
          </span>
        )}
        {scopeNotice && (
          <span className="ono-filter-notice" role="status">
            <Icon src="/icons-solid/eye.svg" size={16} color="var(--text-brand-tertiary)" baseUrl={baseUrl} />
            <span>{scopeNotice}</span>
          </span>
        )}
      </div>
    )}
    </>
  );
}
