import React, { useMemo } from 'react';
import RosterTable from '../shared/RosterTable.jsx';
import Pagination from '../shared/Pagination.jsx';
import Icon from '../shared/Icon.jsx';
import Button from '../shared/Button.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import Avatar from '../shared/Avatar.jsx';
import { CloseGlyph, ChevronDownGlyph, ChevronUpGlyph } from '../shared/lineIcons.jsx';
import CustomSelect from '../timeline/CustomSelect.jsx';
import PhotoOr from './PhotoOr.jsx';
import { isEnterKey } from '../shared/enterKey.js';
import OrgTabNav from './OrgTabNav.jsx';
import { MEMBER_STATUSES } from './constants.js';
import { OrgLabelsContext, makeOrgLabels } from './orgchart-labels.jsx';

/**
 * 조직도 「리스트」 탭 — 전 직원을 한 줄에 한 명씩 보는 표 (pivit-work PW-678 · pivit-specs
 * org-chart-public-card-spec.md §3-D-1 열·행·정렬·페이지 · §3-D-2 팀 고르기 · 이름 검색).
 *
 * 디자이너 시안이 아직 없어 같은 조직도 화면에서 디자이너가 그린 모양을 따랐다(pivit-work design-review):
 * 머리(탭 줄 · 「전체 인원 · N명」)는 프로젝트·스쿼드 탭의 `.pj-header`, 표는 공용 명단 표(RosterTable),
 * 이름 칸의 사진·배지는 조직도 사람 카드(MemberCard)의 `.avatar-sm`·`role-badge-*`, 근무 상태는 프로젝트 카드의
 * 상태 딱지(점 + 글 · `.pj-status-dot`), 팀 고르기와 검색칸은 원온원 대시보드 필터 줄(Figma 17749:20369 ·
 * `.ono-filter`·`.ono-filter-search` 값 그대로 · org_list.css), 페이지 넘김은 공용 Pagination 이다.
 *
 * 거르기·정렬·쪽 나누기는 호스트가 한다 — 이 부품은 받은 줄(지금 쪽)과 수를 그리기만 한다.
 *
 * @param {Array<object>} rows  지금 쪽의 사람 — `{ id, name, avatar, isCeo, role, isSelf, ceoLabel, selfLabel,
 *   unit: { kind: 'unit'|'ceo'|'ceoDirect'|'unassigned', name?, path? }, concurrent?: string[], concurrentHere?,
 *   title?, grade?, position?, status? }`
 * @param {string} headcount   머리 줄 「전체 인원 · …」 오른쪽 문구(조직도 탭과 같은 값)
 * @param {{ unitName: string, count: number, concurrent: number }|null} [scope]  고른 조직의 결과 줄
 * @param {number|null} [searchCount]  찾는 말이 있을 때 결과 수
 * @param {boolean} showGrade  회사가 직급 표시를 켰나 — 끄면 「직급·직책」 열이 없다(§3-D-1 4열)
 * @param {boolean} [showStatus]  「근무 상태」 열을 그릴지 — 호스트가 그 값의 출처를 정할 때까지 끌 수 있다
 * @param {{ value: string, options: Array<{value,label}>, onChange: (v) => void }} unitFilter
 * @param {{ value: string, onChange: (v: string) => void }} search
 * @param {{ key: 'org'|'name', dir: 'asc'|'desc' }} sort
 * @param {(key: 'org'|'name') => void} onSortChange  「이름」 머리는 가나다 ↔ 역순, 「소속」 머리는 조직 순서로
 * @param {{ page: number, pageSize: number, total: number, onPageChange: (p: number) => void }} pager
 *   `total` 이 `pageSize` 이하이면 페이지 넘김을 그리지 않는다
 * @param {(row) => void} [onRowClick]  줄을 누르면 — 트리와 같은 프로필 카드(§3-D-1 행 누르기)
 */
export default function OrgMemberListCanvas({
  rows = [],
  headcount = '',
  scope = null,
  searchCount = null,
  showGrade = true,
  showStatus = true,
  unitFilter,
  search,
  sort = { key: 'org', dir: 'asc' },
  onSortChange,
  pager,
  onRowClick,
  onSubTabChange,
  showProjectTab = false,
  labels,
  baseUrl = '',
}) {
  const L = useMemo(() => makeOrgLabels(labels), [labels]);
  const query = search?.value ?? '';

  const unitCell = (row) => {
    const { unit } = row;
    const name =
      unit.kind === 'ceo' ? L('list.unit.ceo')
        : unit.kind === 'ceoDirect' ? L('list.unit.ceoDirect')
          : unit.kind === 'unassigned' ? L('list.unit.unassigned')
            : unit.name;
    const concurrent = row.concurrent ?? [];
    return (
      <div className="ol-unit">
        {unit.path && <span className="ol-unit-path">{unit.path}</span>}
        <span className="ol-unit-name">
          {name}
          {row.concurrentHere && (
            <StatusBadge tone="neutral" data-testid="org-list-concurrent-here">{L('list.concurrentHere')}</StatusBadge>
          )}
          {concurrent.length > 0 && (
            <StatusBadge tone="neutral" title={[name, ...concurrent].join(' · ')} data-testid="org-list-concurrent">
              {L('list.concurrentMore', { count: concurrent.length })}
            </StatusBadge>
          )}
        </span>
      </div>
    );
  };

  const statusCell = (row) => {
    const key = MEMBER_STATUSES[row.status] ? row.status : 'working';
    return (
      <span className="ol-status">
        <span className="pj-status-dot" style={{ background: MEMBER_STATUSES[key].dotColor }} />
        {row.statusLabel || L(`member.status.${key}`)}
      </span>
    );
  };

  // 정렬 상태는 머리 칸(th)의 aria-sort 로 알린다 — 화면 읽기 프로그램은 버튼이 아니라 칸에서 읽는다
  const ariaSort = (key) =>
    key === 'name' && sort.key === 'name' ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined;
  const sortHead = (key, label) => {
    const active = sort.key === key;
    const Arrow = sort.dir === 'asc' ? ChevronUpGlyph : ChevronDownGlyph;
    return (
      <button
        type="button"
        className={`ol-sort${active ? ' is-active' : ''}`}
        onClick={() => onSortChange?.(key)}
        data-testid={`org-list-sort-${key}`}
      >
        {label}
        {key === 'name' && active && <Arrow size={12} aria-hidden />}
      </button>
    );
  };

  const columns = [
    {
      key: 'name',
      header: sortHead('name', L('list.col.name')),
      headerProps: { 'aria-sort': ariaSort('name') },
      render: (row) => (
        <div className="member-row">
          <PhotoOr src={row.avatar} className="avatar-sm" fallback={<Avatar name={row.name} size={32} className="avatar-sm" />} />
          <span className="member-name">{row.name}</span>
          {row.role && <StatusBadge className={`role-badge role-badge-${row.role.toLowerCase()}`}>{row.role}</StatusBadge>}
          {row.isCeo && <StatusBadge className="role-badge role-badge-ceo">{row.ceoLabel || L('org.ceoBadge')}</StatusBadge>}
          {row.isSelf && <StatusBadge className="role-badge role-badge-self">{row.selfLabel || L('org.selfBadge')}</StatusBadge>}
        </div>
      ),
    },
    { key: 'unit', header: sortHead('org', L('list.col.unit')), render: unitCell },
    { key: 'title', header: L('list.col.title'), render: (row) => row.title || L('list.empty') },
    ...(showGrade
      ? [{
          key: 'grade',
          header: L('list.col.grade'),
          render: (row) => [row.grade || L('list.empty'), row.position].filter(Boolean).join(' · '),
        }]
      : []),
    ...(showStatus ? [{ key: 'status', header: L('list.col.status'), render: statusCell }] : []),
    { key: 'email', header: L('list.col.email'), render: (row) => row.email || L('list.empty') },
  ];

  const emptyText = query
    ? L(scope ? 'list.emptySearchInUnit' : 'list.emptySearch', { query })
    : L('list.emptyUnit');

  return (
    <OrgLabelsContext.Provider value={L}>
      <div className="content-area pj-content-area" data-testid="org-list-canvas">
        <div className="content-canvas">
          <div className="pj-header">
            <OrgTabNav active="list" onSubTabChange={onSubTabChange} showProjectTab={showProjectTab} showListTab L={L} />
            <div className="ol-subline">
              <div className="header-subtitle">
                <b>{L('org.totalHeadcount')}</b>
                <span className="dot">&#8729;</span>
                <span className="brand-count">{headcount}</span>
                {scope && (
                  <>
                    <span className="dot">&#8729;</span>
                    <b data-testid="org-list-scope">
                      {L('list.scope', { unit: scope.unitName, count: scope.count })}
                      {scope.concurrent > 0 ? L('list.scopeConcurrent', { count: scope.concurrent }) : ''}
                    </b>
                  </>
                )}
                {searchCount != null && (
                  <>
                    <span className="dot">&#8729;</span>
                    <b data-testid="org-list-search-count">{L('list.searchCount', { count: searchCount })}</b>
                  </>
                )}
              </div>
              <div className="ol-tools">
                {unitFilter && (
                  <span className="ol-filter">
                  <CustomSelect
                    value={unitFilter.value}
                    onChange={unitFilter.onChange}
                    options={unitFilter.options}
                    ariaLabel={L('list.unitFilter')}
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
                      placeholder={L('list.searchPlaceholder')}
                      aria-label={L('list.searchPlaceholder')}
                      onChange={(e) => search.onChange(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Escape') search.onChange(''); }}
                      data-testid="org-list-search"
                    />
                    {query && (
                      <button type="button" className="ol-search-clear" aria-label={L('list.searchClear')} onClick={() => search.onChange('')} data-testid="org-list-search-clear">
                        <CloseGlyph width={16} height={16} />
                      </button>
                    )}
                  </label>
                )}
              </div>
            </div>
          </div>

          <div className="pj-body">
            <RosterTable
              columns={columns}
              rows={rows}
              rowProps={(row) => ({
                onClick: onRowClick ? () => onRowClick(row) : undefined,
                // 키보드로도 줄을 고른다 — Tab 으로 옮겨 Enter·Space
                ...(onRowClick
                  ? {
                      tabIndex: 0,
                      onKeyDown: (e) => {
                        if (isEnterKey(e) || e.key === ' ') {
                          e.preventDefault();
                          onRowClick(row);
                        }
                      },
                    }
                  : {}),
                'data-testid': `org-list-row-${row.id}`,
              })}
              empty={
                <span data-testid="org-list-empty">
                  {emptyText}
                  {query && (
                    <Button variant="ghost" size="sm" onClick={() => search.onChange('')}>{L('list.searchClear')}</Button>
                  )}
                </span>
              }
              testId="org-list-table"
            />
            {pager && pager.total > pager.pageSize && (
              <Pagination
                page={pager.page}
                totalPages={Math.ceil(pager.total / pager.pageSize)}
                pageSize={pager.pageSize}
                total={pager.total}
                onPageChange={pager.onPageChange}
                labels={{ of: L('list.pager.of'), prev: L('list.pager.prev'), next: L('list.pager.next') }}
                countSuffix={L('list.pager.suffix')}
                data-testid="org-list-pager"
              />
            )}
          </div>
        </div>
      </div>
    </OrgLabelsContext.Provider>
  );
}
