import { useState, useMemo } from 'react';
import Tabs from '../shared/Tabs.jsx';
import RosterTable from '../shared/RosterTable.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import { isEnterKey } from '../shared/enterKey.js';
import { NoticeLines, PageHead, Panel } from '../frames/index.js';

/**
 * AdminRbacCanvas — 권한 기준정보(RBAC) 읽기 전용 뷰어.
 *
 * 순수 표현 컴포넌트: 데이터(matrix·visibility)와 라벨(labels)을 props 로 받아
 * 역할별 기능 접근 범위 + 정보 공개 범위를 «조회만» 한다. i18n / 데이터 패칭은 소비 측 책임이다.
 *
 * 디자이너 원본이 없는 화면이라 pivit-work PW-3121 에서 디자이너 화면 값으로 다시 칠했다 — 클래스와 따른 디자이너 화면은
 * admin.css «권한 기준정보 (pivit-work PW-3121)» 절. 흰 판 · 표 · 안내 줄은 앱 공용 틀(PW-2994)과 같은 디자이너 클래스다.
 * 역할을 색으로 가르지 않는다 — 뜻 있는 색(허용 · 공개 초록, 민감 빨강, 잠금 주황)만 쓴다.
 */

// 역할 3종 — 실제 인증 role 문자열을 칸 키로 쓴다(권한 판정과 같게).
const ROLES = ['org_admin', 'manager', 'employee'];

const PERM_CATEGORIES = [
  { catKey: 'hr', ids: ['p001', 'p002', 'p003', 'p004'] },
  { catKey: 'orgChart', ids: ['p010', 'p011', 'p012'] },
  { catKey: 'snippet', ids: ['p020', 'p021', 'p022'] },
  { catKey: 'oneOnOne', ids: ['p030', 'p031', 'p032'] },
  { catKey: 'okr', ids: ['p040', 'p041', 'p042', 'p043'] },
  { catKey: 'eval', ids: ['p050', 'p051', 'p052', 'p053'] },
  { catKey: 'project', ids: ['p060', 'p061'] },
  { catKey: 'system', ids: ['p070', 'p071', 'p072', 'p073'] },
];
const ALL_PERM_IDS = PERM_CATEGORIES.flatMap((c) => c.ids);

/**
 * 어느 역할에도 켤 수 없는 권한 — 기획 admin-app.jsx PERMS 의 `locked:true`(p032 전사 1on1 열람 · 1on1 기획 §9-A-3).
 * «꺼 둔 것(차단)»과 «켤 수 없는 것»을 가르려고 «잠금» 딱지와 잠긴 이유 줄을 단다.
 */
const LOCKED_PERMS = new Set(['p032']);

const PRINCIPLE_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8];

const VIS_ITEMS = [
  { id: 'health', sensitive: true },
  { id: 'snippet', sensitive: true },
  { id: 'okr', sensitive: false },
  { id: 'salary', sensitive: true },
  { id: 'eval', sensitive: true },
  { id: 'oneononone', sensitive: false },
];

const DEFAULT_LABELS = {
  title: '권한 관리',
  description: '역할별 기능 접근 범위와 정보 공개 범위를 설정합니다',
  readOnly: '읽기 전용',
  selectRole: '역할 선택',
  permItem: '권한 항목',
  countUnit: '{{count}}개',
  permCount: '{{count}}개 권한',
  permOf: '/ {{total}}개',
  grantedPerms: '부여된 권한',
  allowed: '허용',
  locked: '잠금',
  lockedReasons: {},
  blocked: '차단',
  tabs: { matrix: '전체 매트릭스', roles: '역할별 권한', visibility: '정보 공개 범위' },
  roles: { org_admin: '어드민', manager: '매니저', employee: '멤버' },
  roleDescs: {},
  permCategories: {},
  perms: {},
  permDescs: {},
  visItems: {},
  visDescs: {},
  visibility: {
    title: '역할별 정보 공개 범위',
    description: '',
    infoItem: '정보 항목',
    public: '공개',
    private: '비공개',
    sensitive: '민감',
    principlesTitle: '',
    // 어드민이 고르지 않는 칸(값 'fixed') — pivit-work PW-2575 · admin-spec §4.4
    fixed: '고정',
    fixedCaption: '',
    fixedHints: {},
  },
};

function isObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function mergeLabels(base, provided) {
  if (!provided) return base;
  const out = { ...base };
  for (const k of Object.keys(provided)) {
    if (isObj(provided[k])) out[k] = mergeLabels(base[k] || {}, provided[k]);
    else if (provided[k] !== undefined) out[k] = provided[k];
  }
  return out;
}

function fill(str, vars) {
  let s = str == null ? '' : String(str);
  for (const k of Object.keys(vars)) s = s.replace(`{{${k}}}`, vars[k]);
  return s;
}

/** 허용은 초록 체크 선, 아니면 옅은 «–». */
function ReadMark({ on }) {
  if (on) {
    return (
      <span className="rbac-mark" data-mark="on">
        <svg width="14" height="11" viewBox="0 0 11 9" aria-hidden>
          <polyline points="1,5 4,8 10,1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  return <span className="rbac-mark is-off" data-mark="off">–</span>;
}

/** 권한 이름 칸 — 이름(+ 잠금 딱지) · 설명 · 잠긴 이유 */
function PermText({ pid, L }) {
  const locked = LOCKED_PERMS.has(pid);
  return (
    <>
      <div className="rbac-cell-name">
        {L.perms[pid]}
        {locked ? (
          <StatusBadge className="rbac-badge" tone="warning" data-testid={`rbac-locked-${pid}`}>
            {L.locked}
          </StatusBadge>
        ) : null}
      </div>
      {L.permDescs[pid] ? <div className="rbac-cell-desc">{L.permDescs[pid]}</div> : null}
      {locked && L.lockedReasons?.[pid] ? <div className="rbac-cell-lock">{L.lockedReasons[pid]}</div> : null}
    </>
  );
}

export default function AdminRbacCanvas({
  titleHelp,
  matrix = {},
  visibility = {},
  labels: providedLabels,
  initialTab = 'matrix',
  extraTab = null,
  extraTabs = [],
  onBeforeTabChange,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);
  const [tab, setTabNow] = useState(initialTab);
  // 덧붙인 탭(OKR·스쿼드 위임)에 저장 안 한 변경이 있으면 소비 측이 묻는다 — 거짓이면 머문다(PW-2635).
  const goTab = async (next) => {
    if (next === tab) return true;
    if (onBeforeTabChange && !(await onBeforeTabChange(tab, next))) return false;
    setTabNow(next);
    return true;
  };
  const [selectedRole, setSelectedRole] = useState('org_admin');

  const getMatrix = (roleId, permId) => !LOCKED_PERMS.has(permId) && (matrix[roleId]?.[permId] ?? false);
  const countPerms = (roleId) => ALL_PERM_IDS.filter((permId) => getMatrix(roleId, permId)).length;
  const permOf = fill(L.permOf, { total: ALL_PERM_IDS.length });

  const matrixContent = (
    <Panel testId="rbac-matrix">
      <RosterTable minWidth={720} tableClassName="ol-table rbac-table">
        <RosterTable.Head>
          <RosterTable.HeadCell style={{ minWidth: 260 }}>{L.permItem}</RosterTable.HeadCell>
          {ROLES.map((rid) => (
            <RosterTable.HeadCell key={rid} align="center" width={160}>
              <span className="rbac-col-role">
                {L.roles[rid]}
                <small>{fill(L.countUnit, { count: countPerms(rid) })}</small>
              </span>
            </RosterTable.HeadCell>
          ))}
        </RosterTable.Head>
        {PERM_CATEGORIES.map((cat) => (
          <RosterTable.Body key={cat.catKey}>
            <RosterTable.GroupRow colSpan={ROLES.length + 1}>{L.permCategories[cat.catKey]}</RosterTable.GroupRow>
            {cat.ids.map((pid) => (
              <RosterTable.Row key={pid} data-testid={`rbac-matrix-row-${pid}`}>
                <RosterTable.Cell>
                  <PermText pid={pid} L={L} />
                </RosterTable.Cell>
                {ROLES.map((rid) => (
                  <RosterTable.Cell key={rid} align="center">
                    <ReadMark on={getMatrix(rid, pid)} />
                  </RosterTable.Cell>
                ))}
              </RosterTable.Row>
            ))}
          </RosterTable.Body>
        ))}
      </RosterTable>
    </Panel>
  );

  const rolesContent = (
    <div className="rbac-split">
      <section className="okr-h-list rbac-panel rbac-roles" data-testid="rbac-role-list">
        <div className="rbac-roles-head">{L.selectRole}</div>
        {ROLES.map((rid) => (
          <div
            key={rid}
            role="button"
            tabIndex={0}
            className={`rbac-role ${selectedRole === rid ? 'is-on' : ''}`.trim()}
            aria-pressed={selectedRole === rid}
            data-testid={`rbac-role-${rid}`}
            onClick={() => setSelectedRole(rid)}
            onKeyDown={(e) => {
              if (!isEnterKey(e) && e.key !== ' ') return;
              e.preventDefault();
              setSelectedRole(rid);
            }}
          >
            <b>{L.roles[rid]}</b>
            <small>{fill(L.permCount, { count: countPerms(rid) })}</small>
          </div>
        ))}
      </section>
      <section className="okr-h-list rbac-panel rbac-detail" data-testid="rbac-role-detail">
        <div className="rbac-detail-head">
          <div>
            <h3>{L.roles[selectedRole]}</h3>
            {L.roleDescs[selectedRole] ? <p>{L.roleDescs[selectedRole]}</p> : null}
          </div>
          <div className="rbac-detail-count">
            <span>{L.grantedPerms}</span>
            <b>
              {countPerms(selectedRole)}
              <small>{permOf}</small>
            </b>
          </div>
        </div>
        {PERM_CATEGORIES.map((cat) => (
          <div key={cat.catKey}>
            <div className="rbac-group">{L.permCategories[cat.catKey]}</div>
            {cat.ids.map((pid) => {
              const checked = getMatrix(selectedRole, pid);
              const locked = LOCKED_PERMS.has(pid);
              return (
                <div key={pid} className="rbac-perm" data-testid={`rbac-role-perm-${pid}`}>
                  <span className="rbac-perm-mark">
                    <ReadMark on={checked} />
                  </span>
                  <div className="rbac-perm-text">
                    <div className="rbac-cell-name">{L.perms[pid]}</div>
                    {L.permDescs[pid] ? <div className="rbac-cell-desc">{L.permDescs[pid]}</div> : null}
                    {locked && L.lockedReasons?.[pid] ? <div className="rbac-cell-lock">{L.lockedReasons[pid]}</div> : null}
                  </div>
                  {/* 「차단」과 「잠금」을 가른다 — 차단은 어드민이 되돌릴 수 있고 잠금은 못 한다(기획 RolesTab) */}
                  {locked ? (
                    <StatusBadge className="rbac-badge" tone="warning" data-testid={`rbac-locked-${pid}`}>
                      {L.locked}
                    </StatusBadge>
                  ) : (
                    <span className={`rbac-state ${checked ? 'is-on' : ''}`.trim()}>{checked ? L.allowed : L.blocked}</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </section>
    </div>
  );

  const principles = PRINCIPLE_NUMBERS.filter((n) => L.visibility[`principle${n}Title`]);
  const visibilityContent = (
    <Panel title={L.visibility.title} testId="rbac-visibility">
      <NoticeLines lines={[L.visibility.description]} tone="muted" />
      <RosterTable minWidth={720} tableClassName="ol-table rbac-table">
        <RosterTable.Head>
          <RosterTable.HeadCell style={{ minWidth: 240 }}>{L.visibility.infoItem}</RosterTable.HeadCell>
          {ROLES.map((rid) => (
            <RosterTable.HeadCell key={rid} align="center" width={160}>
              <span className="rbac-col-role">
                {L.roles[rid]}
                {L.roleDescs[rid] ? <small>{L.roleDescs[rid]}</small> : null}
              </span>
            </RosterTable.HeadCell>
          ))}
        </RosterTable.Head>
        <RosterTable.Body>
          {VIS_ITEMS.map((item) => (
            <RosterTable.Row key={item.id} data-testid={`rbac-vis-row-${item.id}`}>
              <RosterTable.Cell>
                <div className="rbac-cell-name">
                  {L.visItems[item.id]}
                  {item.sensitive ? <StatusBadge className="rbac-badge" tone="danger">{L.visibility.sensitive}</StatusBadge> : null}
                </div>
                {L.visDescs[item.id] ? <div className="rbac-cell-desc">{L.visDescs[item.id]}</div> : null}
              </RosterTable.Cell>
              {ROLES.map((rid) => {
                const on = visibility[rid]?.[item.id] ?? false;
                if (on === 'fixed') {
                  return (
                    <RosterTable.Cell key={rid} align="center" title={L.visibility.fixedHints?.[item.id] || undefined}>
                      <span className="rbac-fixed">
                        <StatusBadge className="rbac-badge" tone="neutral">
                          {L.visibility.fixed}
                        </StatusBadge>
                        {L.visibility.fixedCaption ? <small>{L.visibility.fixedCaption}</small> : null}
                      </span>
                    </RosterTable.Cell>
                  );
                }
                return (
                  <RosterTable.Cell key={rid} align="center">
                    <StatusBadge className="rbac-badge" tone={on ? 'success' : 'neutral'}>{on ? L.visibility.public : L.visibility.private}</StatusBadge>
                  </RosterTable.Cell>
                );
              })}
            </RosterTable.Row>
          ))}
        </RosterTable.Body>
      </RosterTable>
      {/* 원칙 줄은 소비 측이 준 principleN 라벨 수만큼 그린다(admin-spec §4.4). 라벨이 없는 번호에서 멈춘다. */}
      {principles.length > 0 ? (
        <div className="rbac-rules" data-testid="rbac-principles">
          {L.visibility.principlesTitle ? <h4>{L.visibility.principlesTitle}</h4> : null}
          <ul>
            {principles.map((n) => (
              <li key={n}>
                <b>{L.visibility[`principle${n}Title`]}</b>
                <span>{L.visibility[`principle${n}Desc`]}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Panel>
  );

  const added = [...(extraTab ? [extraTab] : []), ...(extraTabs ?? [])];
  // 디자이너 밑줄 탭에는 아이콘이 없다 — 이름만 둔다(PW-3121).
  const TABS = [
    { value: 'matrix', label: L.tabs.matrix },
    { value: 'roles', label: L.tabs.roles },
    { value: 'visibility', label: L.tabs.visibility },
    ...added.map((x) => ({ value: x.key, label: x.label })),
  ];
  const shownExtra = added.find((x) => x.key === tab) ?? null;

  return (
    <div className="rbac-page">
      {/* 덧붙인 위임 탭은 저장하는 탭이라 «읽기 전용»을 달지 않는다 */}
      <PageHead
        title={L.title}
        titleAside={titleHelp}
        description={[L.description]}
        actions={
          shownExtra ? null : (
            <StatusBadge className="rbac-badge" tone="neutral" data-testid="rbac-read-only">
              {L.readOnly}
            </StatusBadge>
          )
        }
      />

      <div className="tl-tabs-row adm-tabs-row is-spaced">
        <Tabs items={TABS} value={tab} onChange={(v) => void goTab(v)} />
      </div>

      {/* 역할 요약 — 기획서는 탭과 상관없이 탭 줄 아래에 늘 둔다(admin-app.jsx «역할 요약 카드»). 누르면 «역할별 권한»으로 */}
      <div className="rbac-sum" data-testid="rbac-role-summary">
        {ROLES.map((rid) => {
          const cnt = countPerms(rid);
          const pct = Math.min(100, Math.round((cnt / ALL_PERM_IDS.length) * 100));
          const selected = tab === 'roles' && selectedRole === rid;
          return (
            <section
              key={rid}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              data-testid={`role-summary-card-${rid}`}
              className={`okr-h-list rbac-sum-card ${selected ? 'is-on' : ''}`.trim()}
              onClick={async () => {
                if (await goTab('roles')) setSelectedRole(rid);
              }}
              onKeyDown={async (e) => {
                if (!isEnterKey(e) && e.key !== ' ') return;
                e.preventDefault();
                if (await goTab('roles')) setSelectedRole(rid);
              }}
            >
              <div className="rbac-sum-name">{L.roles[rid]}</div>
              {L.roleDescs[rid] ? <div className="rbac-sum-sub" title={L.roleDescs[rid]}>{L.roleDescs[rid]}</div> : null}
              <div className="rbac-sum-value">
                {cnt}
                <small>{permOf}</small>
              </div>
              <div className="rbac-sum-bar" aria-hidden>
                <span style={{ width: `${pct}%` }} />
              </div>
            </section>
          );
        })}
      </div>

      {tab === 'matrix' && matrixContent}
      {tab === 'roles' && rolesContent}
      {tab === 'visibility' && visibilityContent}
      {shownExtra && shownExtra.content}
    </div>
  );
}
