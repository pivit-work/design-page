import React, { useEffect, useRef, useState } from 'react';
import { useOrgChrome, useFillToBottom, ORG_VIEW_ATTR } from './orgChrome.js';
import Icon from '../shared/Icon.jsx';
import Button from '../shared/Button.jsx';
import EmptyState from '../shared/EmptyState.jsx';
import Skeleton from '../shared/Skeleton.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import CustomSelect from '../timeline/CustomSelect.jsx';
import { isEnterKey } from '../shared/enterKey.js';
import OrgTabNav from './OrgTabNav.jsx';
import OfficeSpace from './OfficeSpace.jsx';
import SegmentedControl from '../shared/SegmentedControl.jsx';
import { OrgLabelsContext, makeOrgLabels } from './orgchart-labels.jsx';

/**
 * 조직도 «근무지» 탭 — «지역» 보기 (pivit-work PW-3237 · 기획 screen-org-chart-place.policy.md v1.1 §1 · §2 · §5 #10).
 *
 * 국가 묶음 → 근무지(도시) 카드 → 펼치면 최상위 조직별 사람. 묶음 · 순서 · 수는 소비자가 정해 `region` 으로 넘긴다
 * (pivit-work `orgPlaceRegion.ts`) — 이 부품은 그리기만 한다.
 *
 * 틀은 다른 탭과 같다 — 머리(탭 줄 · 서브라인)는 리스트 캔버스(`OrgMemberListCanvas`)의 `pj-header`, 카드는 조직도 트리와
 * 같은 `.canvas-area`(embedded), 툴바 · 조직 고르기 · 찾기 칸은 리스트 보기(`ol-toolbar` · `ol-filter` · `ol-search`) 그대로다.
 * 새로 그린 것은 국가 묶음 · 근무지 카드 · 사람 칸뿐이고 값은 org_place.css 머리 주석의 디자이너 값을 따른다.
 *
 * [PW-3238] 카드 왼쪽 위 «지역 / 빌딩 · 층» 전환(`placeView` · `onPlaceViewChange`)과 근무지 카드 아래 빌딩 단추(`city.buildings` ·
 * `onOpenBuilding`). «빌딩 · 층» 보기는 근무 공간 보기 `OfficeSpace`(mode="org")를 `office` 그대로 받아 그린다(§3).
 *
 * @param {object} props
 * @param {'loading'|'failed'|'ready'} props.status
 * @param {() => void} [props.onRetry]  실패 줄 [다시 시도]
 * @param {object|null} props.region  `{ countries, filtered, shown, countryTotal, cityTotal, unsetCount, noValues }`
 * @param {{ value: string, options: Array<{value: string, label: string}>, onChange: (v: string) => void }} props.unitFilter
 * @param {{ value: string, onChange: (v: string) => void }} props.search
 * @param {(person: object) => void} [props.onOpenPerson]  사람 칸을 누름 — 퍼블릭 카드
 * @param {(() => void) | null} [props.onGoMembers]  어드민만 — 근무지가 하나도 없을 때 «구성원 관리에서 근무지 넣기 ›»
 * @param {string} props.headcount  서브라인 인원 글자(`102명 +2 겸직`)
 * @param {(tab: string) => void} [props.onSubTabChange]
 * @param {boolean} [props.showProjectTab]
 * @param {import('react').ReactNode} [props.titleHelp]
 * @param {object|function} [props.labels]
 * @param {string} [props.baseUrl]
 * @param {'region'|'building'} [props.placeView]  [PW-3238] 지금 보기(처음 «지역» · 주소에 싣지 않는다 — 정책 §1)
 * @param {(v: 'region'|'building') => void} [props.onPlaceViewChange]
 * @param {object} [props.office]  [PW-3238] «빌딩 · 층» 보기의 `OfficeSpace` props(mode 는 org)
 * @param {(building: string) => void} [props.onOpenBuilding]  [PW-3238] 근무지 카드 아래 `{빌딩} ›`
 */
export default function OrgPlaceCanvas({
  status,
  onRetry,
  region,
  unitFilter,
  search,
  onOpenPerson,
  onGoMembers,
  headcount,
  onSubTabChange,
  showProjectTab = false,
  titleHelp,
  labels,
  baseUrl = '',
  placeView = 'region',
  onPlaceViewChange,
  office = null,
  onOpenBuilding,
}) {
  const L = makeOrgLabels(labels);
  const [open, setOpen] = useState(null);
  const query = search?.value ?? '';
  // 거르는 값이 바뀌면 펼친 카드를 접는다 — 펼친 카드가 목록에서 사라져도 «하나만 펼침»이 다음 카드를 막지 않게
  const filterKey = `${unitFilter?.value ?? ''}|${query}`;
  const [seenFilter, setSeenFilter] = useState(filterKey);
  if (seenFilter !== filterKey) {
    setSeenFilter(filterKey);
    setOpen(null);
  }

  const unitSelected = unitFilter && unitFilter.value !== unitFilter.options?.[0]?.value;
  const building = placeView === 'building';
  const viewSwitch = onPlaceViewChange && (
    <SegmentedControl
      items={[
        { value: 'region', label: L('place.viewRegion'), testId: 'org-place-view-region' },
        { value: 'building', label: L('place.viewBuilding'), testId: 'org-place-view-building' },
      ]}
      value={placeView}
      onChange={onPlaceViewChange}
      ariaLabel={L('place.viewsAria')}
    />
  );
  const toolbar = building ? (
    <div className="org-toolbar org-toolbar-left ol-toolbar op-toolbar" data-testid="org-place-toolbar">{viewSwitch}</div>
  ) : (
    <div className="org-toolbar org-toolbar-left ol-toolbar op-toolbar" data-testid="org-place-toolbar">
      {viewSwitch}
      {unitFilter && (
        <span className={`ol-filter${unitSelected ? ' is-selected' : ''}`}>
          <CustomSelect
            value={unitFilter.value}
            onChange={unitFilter.onChange}
            options={unitFilter.options}
            ariaLabel={L('place.unitFilter')}
            size="sm"
          />
        </span>
      )}
      {search && (
        <label className={`ol-search${query ? ' has-value' : ''}`}>
          <Icon src="/icons/search-sm.svg" size={20} color="var(--text-tertiary)" baseUrl={baseUrl} />
          <input
            type="search"
            value={query}
            placeholder={L('place.searchPlaceholder')}
            aria-label={L('place.searchPlaceholder')}
            onChange={(e) => search.onChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') search.onChange(''); }}
            data-testid="org-place-search"
          />
        </label>
      )}
      {status === 'ready' && region && (
        <span className="header-subtitle" data-testid="org-place-result">
          <b>
            {region.filtered
              ? L('place.resultMatched', { count: region.shown })
              : L('place.resultTotal', { countries: region.countryTotal, cities: region.cityTotal })}
          </b>
        </span>
      )}
    </div>
  );

  // 보기 영역 — 화면 아래 끝까지(§5.1 «보기 영역» · 정책 place §1). 머리 · 탭 줄은 휠로 접힌다(PW-3314)
  //   «지역» — 최소 높이(카드가 길면 늘어난다)
  //   «빌딩 · 층» 넓은 화면 — 높이(왼쪽 목록 · 오른쪽 층 그림이 그 높이를 채운다 · 층 그림은 제 크기가 커서 최소 높이면 판 밖으로 자란다)
  //   «빌딩 · 층» 좁은 화면(1024 미만 · 위아래로 쌓임) — 최소 높이([목록 보기]로 목록이 위에 서면 판이 늘고 페이지가 스크롤된다)
  const viewRef = useRef(null);
  const narrow = useNarrowPlace();
  useOrgChrome();
  const fixedH = building && !narrow;
  useFillToBottom(viewRef, { prop: fixedH ? 'height' : 'minHeight', key: building ? `building|${narrow}` : 'region' });

  let body;
  if (building) {
    // 소비자가 정한 key 로 층 보기를 새로 연다(빌딩 단추로 다른 빌딩에 들어올 때) — key 는 펼쳐 넘기지 않는다
    const { key: officeKey, ...officeProps } = office || {};
    body = <OfficeSpace key={officeKey} mode="org" labels={labels} {...officeProps} />;
  } else if (status === 'loading') {
    body = (
      <div className="op-grid" aria-busy="true" data-testid="org-place-loading">
        {[0, 1, 2].map((i) => <Skeleton key={i} width="100%" height={120} radius="var(--radius-lg)" />)}
      </div>
    );
  } else if (status === 'failed') {
    body = (
      <EmptyState
        size="lg"
        className="op-empty"
        data-testid="org-place-failed"
        role="alert"
        description={L('place.loadFailed')}
        actions={onRetry ? <Button variant="secondary" size="sm" onClick={onRetry} data-testid="org-place-retry">{L('place.retry')}</Button> : null}
      />
    );
  } else if (!region || region.countries.length === 0) {
    body = <EmptyState size="lg" className="op-empty" data-testid="org-place-empty" description={L('place.emptyMatched')} />;
  } else {
    body = (
      <>
        <div className="op-grid" data-testid="org-place-grid">
          {region.countries.map((c) => (
            <CountryGroup key={c.key} country={c} open={open} onToggle={setOpen} onOpenPerson={onOpenPerson} onOpenBuilding={onOpenBuilding} L={L} />
          ))}
        </div>
        {!region.filtered && (region.unsetCount > 0 || (region.noValues && onGoMembers)) && (
          <div className="op-note-row">
            {region.unsetCount > 0 && (
              <p className="op-note" data-testid="org-place-unset-note">{L('place.unsetNote', { count: region.unsetCount })}</p>
            )}
            {region.noValues && onGoMembers && (
              <Button variant="ghost" size="sm" onClick={onGoMembers} data-testid="org-place-go-members">{L('place.goMembers')}</Button>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <OrgLabelsContext.Provider value={L}>
      <div className="content-area pj-content-area org-view-page" data-testid="org-place-canvas" {...{ [ORG_VIEW_ATTR]: '' }}>
        <div className="content-canvas">
          <div className="pj-header org-head org-title-row">
            <OrgTabNav active="place" onSubTabChange={onSubTabChange} showProjectTab={showProjectTab} L={L} help={titleHelp} />
            <div className="header-subtitle">
              <b>{L('org.totalHeadcount')}</b>
              <span className="dot">&#8729;</span>
              <span className="brand-count" data-testid="org-place-headcount">{headcount}</span>
            </div>
          </div>
          <div className="pj-body">
            <div ref={viewRef} className={`canvas-area is-embedded is-list op-view${building ? ' is-building' : ''}`} data-place-view={building ? 'building' : 'region'}>
              {toolbar}
              <div className="op-body">{body}</div>
            </div>
          </div>
        </div>
      </div>
    </OrgLabelsContext.Provider>
  );
}

/** 좁은 화면(office_space.css · org_place.css 의 max-width 1023 과 같은 경계)인가 — 창 폭이 바뀌면 다시 묻는다. */
const NARROW_PLACE = '(max-width: 1023px)';
function useNarrowPlace() {
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(NARROW_PLACE).matches);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia(NARROW_PLACE);
    const on = () => setNarrow(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return narrow;
}

/** 국가 하나 — 자기 카드 수만큼(많아야 셋) 칸을 차지한다. 카드를 펼친 국가는 한 줄을 다 쓴다(§2 «국가 묶음의 폭»). */
function CountryGroup({ country, open, onToggle, onOpenPerson, onOpenBuilding, L }) {
  const wide = country.cities.some((ct) => ct.key === open);
  const span = wide ? 'full' : String(Math.min(3, Math.max(1, country.cities.length)));
  const name = country.name ?? L('place.countryUnset');
  return (
    <section className={`op-span-${span}`} data-country={name}>
      <div className="op-country-head">
        <span className={`pj-table-title${country.name ? '' : ' op-unset-text'}`}>{name}</span>
        <span className="pj-table-subtitle">{L('place.countryMeta', { cities: country.cityCount, count: country.count })}</span>
      </div>
      <div className="op-cities">
        {country.cities.map((ct) => (
          <CityCard key={ct.key} city={ct} on={ct.key === open} onToggle={() => onToggle(ct.key === open ? null : ct.key)} onOpenPerson={onOpenPerson} onOpenBuilding={onOpenBuilding} L={L} />
        ))}
      </div>
    </section>
  );
}

// 배지 색 — 조직도 트리와 같은 짝(대표 앰버 · 최상위 조직장 파랑 · 그 밖 조직장 분홍 · org_chart.css .role-badge-*)
const BADGE_TONE = { ceo: 'ceo', topHead: 'dl', head: 'tl' };
const toneClass = (g) => (g.tone == null ? 'op-tone-muted' : `op-tone-${g.tone % 8}`);
const keyActivate = (fn) => (e) => {
  if (isEnterKey(e) || e.key === ' ') {
    e.preventDefault();
    fn();
  }
};

function CityCard({ city, on, onToggle, onOpenPerson, onOpenBuilding, L }) {
  const name = city.name ?? L('place.cityUnset');
  return (
    <article className={`op-city${city.name ? '' : ' is-unset'}${on ? ' is-open' : ''}`} data-city={name}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={on}
        className="op-city-head dept-card"
        onClick={onToggle}
        onKeyDown={keyActivate(onToggle)}
        data-testid="org-place-city"
      >
        <span className="op-city-title">
          <span className={`dept-name op-city-name${city.name ? '' : ' op-unset-text'}`}>{name}</span>
          <span className="dept-meta op-city-count">{L('place.cityCount', { count: city.count })}</span>
        </span>
        <span className="op-bar" aria-hidden="true">
          {city.groups.map((g) => (
            <span key={g.key} className="op-bar-seg" style={{ width: `${(g.people.length / city.count) * 100}%` }}>
              <span className={`op-bar-fill ${toneClass(g)}`} />
            </span>
          ))}
        </span>
        <span className="sq-comp-legend op-legend">
          {city.groups.map((g) => (
            <span key={g.key} className="sq-comp-item">
              <span className={`sq-comp-swatch ${toneClass(g)}`} aria-hidden="true" />
              <span className="sq-comp-name">{g.name}</span>
              <span className="sq-comp-raw">{L('place.groupCount', { count: g.people.length })}</span>
            </span>
          ))}
        </span>
      </div>
      {/* [PW-3238] 그 도시 사람들의 «근무 위치(빌딩)»마다 하나(가나다 · 정책 §2 «빌딩 단추» · §5 #7) */}
      {onOpenBuilding && (city.buildings || []).length > 0 && (
        <div className="op-buildings" data-testid="org-place-buildings">
          {city.buildings.map((b) => (
            <Button key={b} variant="ghost" size="sm" onClick={() => onOpenBuilding(b)} data-place-building={b}>{L('place.buildingButton', { name: b })}</Button>
          ))}
        </div>
      )}
      {on && (
        <div className="op-city-body" data-testid="org-place-city-body">
          {city.groups.map((g) => (
            <div key={g.key} className="op-group">
              <div className="op-group-name">{L('place.groupHead', { name: g.name, count: g.people.length })}</div>
              <div className="op-people">
                {g.people.map((p) => (
                  <div
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    className="op-person"
                    onClick={() => onOpenPerson && onOpenPerson(p)}
                    onKeyDown={keyActivate(() => onOpenPerson && onOpenPerson(p))}
                    data-place-person={p.name}
                  >
                    <span className={`op-person-avatar ${toneClass(g)}`} aria-hidden="true">{String(p.name).slice(-2)}</span>
                    <span className="op-person-text">
                      <span className="op-person-name">
                        <span className="op-person-label">{p.name}</span>
                        {p.badge && <StatusBadge className={`role-badge role-badge-${BADGE_TONE[p.badgeTone] || 'tl'} op-person-badge`}>{p.badge}</StatusBadge>}
                      </span>
                      {p.sub && <span className="op-person-sub">{p.sub}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
