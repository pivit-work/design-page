import { useMemo, useState } from 'react';
import Icon from '../shared/Icon.jsx';
import Avatar from '../shared/Avatar.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import RosterTable from '../shared/RosterTable.jsx';
import CustomSelect from '../timeline/CustomSelect.jsx';
import PhotoOr from './PhotoOr.jsx';
import AsOfButton from './AsOfButton.jsx';
import { MEMBER_STATUSES } from './constants.js';
import { collectOrgRows, collectOrgUnits, sortOrgRows } from './orgListRows.js';

const SORT_KEYS = ['name', 'dept', 'grade'];

/**
 * OrgListView — 조직도 탭의 「리스트」 보기 (Figma 17788:33051 · 표 17757:29445).
 *
 * 조직도 캔버스 카드(`.canvas-area`) **안에** 선다 — 트리와 같은 카드, 같은 자리다. 왼쪽 위 툴바(16px 안쪽)에
 * 트리/리스트 전환(`leading`, 캔버스가 넘긴다) · 기준일 · 「팀별 보기」(조직 하나를 고르면 그 안의 사람만, 하위
 * 포함) · 정렬(이름 순 · 부서 순 · 직급 순)이 서고, 그 아래 18px 띄워 표가 카드 폭 가득 편다. 표는 카드 안에서
 * 세로로 흐르고 머리 행은 위에 붙는다. 조직을 고른 동안은 그 드롭다운이 브랜드 바탕 + 포커스 링으로 「걸러
 * 보는 중」을 알린다(17757:29507).
 *
 * 트리와 **같은 `orgData`** 를 한 줄에 한 사람인 표로 편다 — 이름 · 부서 · 직급 · 근무 상황 · 출퇴근시각 · 휴가.
 * 표는 공용 `RosterTable` 이다 — 이름 열은 가로로 밀어도 왼쪽에 붙는다. 줄을 누르면 `onOpenMember(member)`.
 *
 * @param {object} orgData
 * @param {React.ReactNode} [leading]  툴바 맨 앞 — 트리/리스트 전환
 * @param {object} [asOf]  기준일 — 트리 툴바와 같은 AsOfButton
 * @param {(member) => void} onOpenMember
 * @param {(key: string) => string} L
 * @param {string} [baseUrl]
 * @param {string} [locale]  정렬 글자 순서
 */
export default function OrgListView({ orgData, leading, asOf, onOpenMember, L, baseUrl = '', locale }) {
  const [unitId, setUnitId] = useState('all');
  const [sortBy, setSortBy] = useState('name');

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
    <div className="ol-view" data-testid="org-list-view">
      {/* 툴바 (17788:33261) — 트리/리스트 · 기준일 · 팀별 보기 · 정렬. 트리 툴바와 같은 16px 안쪽, 8px 간격. */}
      <div className="org-toolbar org-toolbar-left ol-toolbar" data-testid="org-list-toolbar">
        {leading}
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

      {/* 명단 표 (17757:29445) — 카드 폭 가득, 카드 안에서 세로로 흐른다. 이름 열은 왼쪽에 붙는다. */}
      <RosterTable
        columns={columns}
        rows={visibleRows}
        rowKey={(row) => row.id}
        rowProps={(row) => ({ onClick: () => onOpenMember(row.member), 'data-testid': 'org-list-row' })}
        empty={L('list.empty')}
        scroll="both"
        minWidth={900}
        fixed
        nowrap
        className="ol-table-frame"
        scrollClassName="ol-table-scroll"
        tableClassName="ol-table"
        testId="org-list-table"
        ariaLabel={L('org.view.list')}
      />
    </div>
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

/**
 * 맨 시 숫자를 시안의 「9am」「6pm」 꼴로 — 조직도 카드는 「9 → 6」 처럼 숫자만 쓰는데, 리스트 시안(17757:27009)은
 * am/pm 을 붙인다. 13 이상은 12 를 빼 pm, 12 는 12pm, 끝나는 시가 시작하는 시보다 작으면(9 → 6) 오후다.
 * 숫자가 아닌 값(「09:00」 같은)은 손대지 않는다.
 */
function formatHour(text, startHour) {
  if (!/^\d{1,2}$/.test(text)) return text;
  const h = Number(text);
  if (h > 12) return `${h - 12}pm`;
  if (h === 12) return '12pm';
  if (startHour != null && h < startHour) return `${h}pm`;
  return `${h}am`;
}

/** 출퇴근시각 — 「9 → 6」을 시작·화살표·끝 세 칸으로 (시안 17757:27008: 양쪽 42px 고정 칸). */
function HoursCell({ value, none }) {
  if (!value) return none;
  const parts = String(value).split('→').map((s) => s.trim());
  if (parts.length < 2) return value;
  const start = /^\d{1,2}$/.test(parts[0]) ? Number(parts[0]) : null;
  return (
    <span className="ol-hours">
      <span className="ol-hours-slot">{formatHour(parts[0])}</span>
      <span aria-hidden="true">→</span>
      <span className="ol-hours-slot">{formatHour(parts[1], start)}</span>
    </span>
  );
}
