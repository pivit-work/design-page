import { useMemo, useState } from 'react';
import Icon from '../shared/Icon.jsx';
import Avatar from '../shared/Avatar.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import RosterTable from '../shared/RosterTable.jsx';
import CustomSelect from '../timeline/CustomSelect.jsx';
import PhotoOr from './PhotoOr.jsx';
import ProfileModal from './ProfileModal.jsx';
import AsOfButton from './AsOfButton.jsx';
import OrgTabNav from './OrgTabNav.jsx';
import { MEMBER_STATUSES } from './constants.js';
import { OrgLabelsContext, makeOrgLabels } from './orgchart-labels.jsx';
import { collectOrgRows, collectOrgUnits, sortOrgRows } from './orgListRows.js';

const SORT_KEYS = ['name', 'dept', 'grade'];

/**
 * OrgListCanvas — 조직도 메뉴의 「리스트」 탭 (Figma 16610:35863 · 17757:29331).
 *
 * 조직도 탭과 **같은 트리(`orgData`)** 를 한 줄에 한 사람인 표로 편다 — 이름 · 부서 · 직급 ·
 * 근무 상황 · 출퇴근시각 · 휴가. 머리 줄 위에는 기준일 버튼(조직도 탭과 같은 것) · 「팀별 보기」
 * (조직 하나를 고르면 그 안의 사람만, 하위 조직 포함) · 정렬(이름 순 · 부서 순 · 직급 순)이 있다.
 * 조직을 고른 동안은 그 드롭다운이 브랜드 바탕 + 포커스 링으로 「걸러 보는 중」을 알린다(17757:29507).
 *
 * 표는 공용 `RosterTable` 이다 — 이름 열은 가로로 밀어도 왼쪽에 붙는다. 줄을 누르면 프로필 창이
 * 뜬다(조직도 카드와 같은 `ProfileModal`). 호스트가 `onMemberClick` 을 주면 창 대신 그것을 부른다.
 *
 * Props 는 `OrgChartCanvas` 와 같은 계약이다 — orgData · onSubTabChange · statIcons · baseUrl ·
 * findSubordinates · adminMode · renderAvatar · onMemberClick · labels · asOf · showProjectTab.
 */
export default function OrgListCanvas({
  orgData,
  onSubTabChange,
  statIcons,
  baseUrl = '',
  findSubordinates,
  adminMode = false,
  renderAvatar,
  onMemberClick,
  labels,
  asOf,
  // 조직 축 탭 노출 여부 — OrgChartCanvas 와 같은 계약. 옛 프로젝트 탭은 호스트가 켤 때만.
  showProjectTab = false,
  locale,
}) {
  const L = useMemo(() => makeOrgLabels(labels), [labels]);
  const [unitId, setUnitId] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [selectedMember, setSelectedMember] = useState(null);

  const units = useMemo(() => collectOrgUnits(orgData), [orgData]);
  const rows = useMemo(() => collectOrgRows(orgData), [orgData]);
  const visibleRows = useMemo(() => {
    const picked = unitId === 'all' ? rows : rows.filter((r) => r.path.includes(unitId));
    return sortOrgRows(picked, sortBy, locale);
  }, [rows, unitId, sortBy, locale]);

  const unitOptions = useMemo(() => [
    { value: 'all', label: L('list.teamAll') },
    ...units.map((u) => ({ value: u.id, label: u.name, subLabel: u.type })),
  ], [units, L]);
  const sortOptions = useMemo(() => SORT_KEYS.map((k) => ({ value: k, label: L(`list.sort.${k}`) })), [L]);

  const openMember = (member) => {
    if (onMemberClick) onMemberClick(member);
    else setSelectedMember(member);
  };

  const columns = [
    {
      key: 'name',
      header: L('list.colName'),
      width: 203,
      sticky: true,
      cellProps: { className: 'ol-name-cell' },
      render: (row) => <NameCell member={row.member} />,
    },
    { key: 'dept', header: L('list.colDept'), render: (row) => row.dept.name },
    { key: 'grade', header: L('list.colGrade'), render: (row) => row.member.grade || row.member.position || L('list.none') },
    {
      key: 'attendance',
      header: L('list.colAttendance'),
      render: (row) => (
        <span className="ol-attendance">
          <Icon src="/icons-solid/clock-stopwatch.svg" size={14} color="var(--text-tertiary)" baseUrl={baseUrl} />
          <span>{row.member.attendance ?? 0}%</span>
        </span>
      ),
    },
    { key: 'hours', header: L('list.colWorkHours'), render: (row) => <HoursCell value={row.member.workHours} none={L('list.none')} /> },
    {
      key: 'vacation',
      header: L('list.colVacation'),
      width: 93,
      render: (row) => row.member.vacation ?? (row.member.onVacation ? L('list.onVacation') : L('list.none')),
    },
  ];

  return (
    <OrgLabelsContext.Provider value={L}>
      <div className="content-area ol-content-area">
        <div className="content-canvas">
          <div className="ol-header">
            <OrgTabNav active="list" onSubTabChange={onSubTabChange} showProjectTab={showProjectTab} showListTab L={L} />
            <div className="header-subtitle">
              <b>{L('org.totalHeadcount')}</b>
              <span className="dot">&#8729;</span>
              {/* 머리글 인원은 조직도 탭과 같은 값이다 — 회사 카드 문구(summaryCount)가 있으면 그것. */}
              <span className="brand-count">{orgData?.summaryCount ?? orgData?.count ?? ''}</span>
            </div>
          </div>

          <div className="ol-body">
            {/* 툴바 (Figma 17755:26751) — 기준일 · 팀별 보기 · 정렬 */}
            <div className="ol-toolbar" data-testid="org-list-toolbar">
              {asOf && <AsOfButton asOf={asOf} L={L} />}
              <span className={`ol-filter${unitId !== 'all' ? ' is-selected' : ''}`} data-testid="org-list-unit">
                <CustomSelect
                  value={unitId}
                  onChange={setUnitId}
                  options={unitOptions}
                  ariaLabel={L('list.teamFilter')}
                  size="sm"
                />
              </span>
              <span className="ol-filter" data-testid="org-list-sort">
                <CustomSelect
                  value={sortBy}
                  onChange={setSortBy}
                  options={sortOptions}
                  ariaLabel={L('list.sortBy')}
                  size="sm"
                />
              </span>
            </div>

            {/* 명단 표 (Figma 17757:29445) — 이름 열은 왼쪽에 붙는다 */}
            <div className="ol-table-card">
              <RosterTable
                columns={columns}
                rows={visibleRows}
                rowKey={(row) => row.id}
                rowProps={(row) => ({ onClick: () => openMember(row.member), 'data-testid': 'org-list-row' })}
                empty={L('list.empty')}
                minWidth={900}
                fixed
                nowrap
                tableClassName="ol-table"
                testId="org-list-table"
                ariaLabel={L('tab.list')}
              />
            </div>
          </div>
        </div>
      </div>
      {!onMemberClick && (
        <ProfileModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
          statIcons={statIcons}
          baseUrl={baseUrl}
          renderAvatar={renderAvatar}
          findSubordinates={findSubordinates}
          adminMode={adminMode}
        />
      )}
    </OrgLabelsContext.Provider>
  );
}

/** 이름 칸 — 24px 사진(없으면 이름 글자) + 상태 점 + 이름 + 조직장 배지(DL/TL/PL). 조직도 카드와 같은 배지다. */
function NameCell({ member }) {
  const status = member.statusColors || MEMBER_STATUSES[member.status] || MEMBER_STATUSES.working;
  return (
    <span className="ol-name">
      <span className="ol-avatar">
        <PhotoOr
          src={member.avatar}
          className="ol-avatar-img"
          fallback={<Avatar name={member.name} size={24} className="ol-avatar-img" />}
        />
        <span className="ol-online-dot" style={{ background: status.dotColor }} />
      </span>
      {/* 열 폭(203)을 넘는 이름은 말줄임 — 전체 이름은 말풍선과 프로필 창에서 본다. */}
      <span className="ol-name-text" title={member.name}>{member.name}</span>
      {member.role && (
        <StatusBadge className={`role-badge role-badge-${member.role.toLowerCase()}`}>{member.role}</StatusBadge>
      )}
    </span>
  );
}

/** 출퇴근시각 — 「9 → 6」을 시작·화살표·끝 세 칸으로 (시안 17757:27008: 양쪽 42px 고정 칸). */
function HoursCell({ value, none }) {
  if (!value) return none;
  const parts = String(value).split('→').map((s) => s.trim());
  if (parts.length < 2) return value;
  return (
    <span className="ol-hours">
      <span className="ol-hours-slot">{parts[0]}</span>
      <span aria-hidden="true">→</span>
      <span className="ol-hours-slot">{parts[1]}</span>
    </span>
  );
}
