import { useState, useMemo } from 'react';

/**
 * AdminRbacCanvas — 권한 관리(RBAC) 읽기 전용 뷰어 (design-page 정본)
 *
 * 순수 표현 컴포넌트: 데이터(matrix·visibility)와 라벨(labels)을 props 로 받아
 * 역할별 기능 접근 범위 + 정보 공개 범위를 "조회만" 한다. 편집·저장·커스텀 역할은
 * 다음 phase. i18n / 데이터 패칭은 소비 측(consumer) 책임이다.
 *
 * 정본 정합 원칙: 역할을 색으로 분류하지 않는다(조직도 role badge 외 역할색 체계 없음).
 * 허용/공개 등 active 상태만 화면 단일 액센트(brand emerald)로 표시한다.
 */

// ── design-page 토큰 (admin.css / index.css 정본) ───────────────────
const DP = {
  font: "var(--font-family-body, 'Pretendard','Noto Sans KR',sans-serif)",
  mono: "var(--font-family-mono, 'DM Mono', monospace)",
  surface: 'var(--bg-quaternary, #ffffff)',
  inset: 'var(--bg-secondary, #f9fafb)',
  borderT: '#e6e8ea',
  textP: 'var(--text-primary, #596069)',
  textS: 'var(--text-secondary, #687079)',
  textT: 'var(--text-tertiary, #b1b6be)',
  accent: 'var(--text-brand-tertiary, #21a67a)',
  accentBg: 'var(--utility-brand-50, #f1fffa)',
  accentBd: 'var(--utility-brand-200, #bbf0dd)',
  accentTc: 'var(--text-brand-secondary, #10774d)',
  shadow: '0 1px 2px 0 rgba(10,13,18,0.1), 0 1px 3px 0 rgba(10,13,18,0.1)',
  radius: { md: 10, lg: 12, xl: 16 },
};

// 역할 3종 — 실제 인증 role 문자열(org_admin/manager/employee)을
// 컬럼 키로 사용해야 권한 판정과 정합한다. (CEO/superuser 는 이번 버전에서 미노출)
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

const VIS_ITEMS = [
  { id: 'health', sensitive: true },
  { id: 'snippet', sensitive: true },
  { id: 'okr', sensitive: false },
  { id: 'salary', sensitive: true },
  { id: 'eval', sensitive: true },
  { id: 'oneononone', sensitive: false },
];

// 라벨 기본값(한국어) — 소비 측 labels 와 deep-merge 되어 누락 키를 메운다.
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
// i18next 스타일 {{key}} 플레이스홀더 치환
function fill(str, vars) {
  let s = str == null ? '' : String(str);
  for (const k of Object.keys(vars)) s = s.replace(`{{${k}}}`, vars[k]);
  return s;
}

// 읽기 전용 인디케이터 — 허용: 단일 액센트 체크 / 차단: 옅은 대시
function ReadMark({ on, color }) {
  if (on) {
    return (
      <svg width="14" height="11" viewBox="0 0 11 9" aria-hidden>
        <polyline
          points="1,5 4,8 10,1"
          fill="none"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return <span style={{ color: DP.textT, fontSize: 14, lineHeight: 1 }}>–</span>;
}

// 탭 아이콘 — 앱 라인 아이콘 스타일 인라인 SVG (currentColor · 2px stroke)
const svgBase = {
  width: 15,
  height: 15,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};
function GridIcon() {
  return (
    <svg {...svgBase}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg {...svgBase}>
      <path d="M12 3l7 2.5v6c0 4-3 6.9-7 8.5-4-1.6-7-4.5-7-8.5v-6L12 3z" />
    </svg>
  );
}
function EyeIcon() {
  return (
    <svg {...svgBase}>
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

export default function AdminRbacCanvas({
  matrix = {},
  visibility = {},
  labels: providedLabels,
  initialTab = 'matrix',
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);
  const [tab, setTab] = useState(initialTab);
  const [selectedRole, setSelectedRole] = useState('org_admin');

  const getMatrix = (roleId, permId) => matrix[roleId]?.[permId] ?? false;
  // 분자는 «이 화면이 나열하는 27개» 안에서만 센다. 분모가 ALL_PERM_IDS.length 이므로
  // 목록 밖 권한까지 세면 「28 / 27개」처럼 분자가 분모를 넘는다.
  // 소비 측 매트릭스에는 이 화면에 없는 권한이 정상적으로 들어온다 — pivit-work 서버는
  // p013(스쿼드 원장 관리)을 실제로 판정하지만, 이 화면의 권한 목록에서는 빠져 있다.
  const countPerms = (roleId) =>
    ALL_PERM_IDS.filter((permId) => matrix[roleId]?.[permId]).length;

  const cardStyle = {
    background: DP.surface,
    borderRadius: DP.radius.xl,
    boxShadow: DP.shadow,
    overflow: 'hidden',
  };
  const catHeaderStyle = {
    padding: '9px 16px 4px',
    fontSize: 10,
    fontWeight: 700,
    color: DP.textT,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    background: DP.inset,
    borderBottom: `1px solid ${DP.borderT}`,
  };

  // ── 전체 매트릭스 탭 ──────────────────────────────────────────────
  const matrixContent = (
    <div style={{ ...cardStyle }}>
      <div className="admin-emp-table-scroll" style={{ overflowX: 'auto' }}>
        <table
          className="admin-emp-table"
          style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}
        >
          <thead>
            <tr style={{ background: DP.inset }}>
              <th
                style={{
                  padding: '11px 16px',
                  textAlign: 'left',
                  fontSize: 10,
                  fontWeight: 700,
                  color: DP.textT,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  borderBottom: `1px solid ${DP.borderT}`,
                  minWidth: 230,
                  background: DP.inset,
                }}
              >
                {L.permItem}
              </th>
              {ROLES.map((rid) => (
                <th
                  key={rid}
                  style={{
                    padding: '10px 8px',
                    textAlign: 'center',
                    borderBottom: `1px solid ${DP.borderT}`,
                    minWidth: 112,
                    background: DP.inset,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700, color: DP.textP }}>
                      {L.roles[rid]}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: 99,
                        background: DP.inset,
                        border: `1px solid ${DP.borderT}`,
                        color: DP.textS,
                        fontFamily: DP.mono,
                      }}
                    >
                      {fill(L.countUnit, { count: countPerms(rid) })}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          {PERM_CATEGORIES.map((cat) => (
            <tbody key={cat.catKey}>
              <tr>
                <td colSpan={ROLES.length + 1} style={catHeaderStyle}>
                  {L.permCategories[cat.catKey]}
                </td>
              </tr>
              {cat.ids.map((pid) => (
                <tr key={pid} style={{ borderBottom: `1px solid ${DP.borderT}` }}>
                  <td style={{ padding: '10px 16px' }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: DP.textP,
                        marginBottom: 2,
                      }}
                    >
                      {L.perms[pid]}
                    </div>
                    <div style={{ fontSize: 11, color: DP.textT }}>
                      {L.permDescs[pid]}
                    </div>
                  </td>
                  {ROLES.map((rid) => (
                    <td key={rid} style={{ textAlign: 'center', padding: 8 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          height: 20,
                        }}
                      >
                        <ReadMark on={getMatrix(rid, pid)} color={DP.accent} />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </div>
  );

  // ── 역할별 권한 탭 ────────────────────────────────────────────────
  const rolesContent = (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '210px 1fr',
        gap: 14,
        alignItems: 'start',
      }}
    >
      <div style={{ ...cardStyle, position: 'sticky', top: 12 }}>
        <div
          style={{
            padding: '12px 14px',
            borderBottom: `1px solid ${DP.borderT}`,
            fontSize: 12,
            fontWeight: 700,
            color: DP.textP,
          }}
        >
          {L.selectRole}
        </div>
        <div style={{ padding: 6 }}>
          {ROLES.map((rid) => {
            const active = selectedRole === rid;
            return (
              <div
                key={rid}
                onClick={() => setSelectedRole(rid)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  padding: '9px 11px',
                  borderRadius: DP.radius.md,
                  cursor: 'pointer',
                  background: active ? DP.accentBg : 'transparent',
                  border: `1px solid ${active ? DP.accentBd : 'transparent'}`,
                  marginBottom: 2,
                  transition: 'all .15s',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: active ? 700 : 500,
                      color: active ? DP.accentTc : DP.textP,
                    }}
                  >
                    {L.roles[rid]}
                  </div>
                  <div style={{ fontSize: 10, color: DP.textT }}>
                    {fill(L.permCount, { count: countPerms(rid) })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div style={{ ...cardStyle, marginBottom: 12 }}>
          <div
            style={{
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: DP.textP,
                  marginBottom: 3,
                }}
              >
                {L.roles[selectedRole]}
              </div>
              <div style={{ fontSize: 12, color: DP.textS }}>
                {L.roleDescs[selectedRole]}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: DP.textT, marginBottom: 2 }}>
                {L.grantedPerms}
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: DP.textP,
                  fontFamily: DP.mono,
                }}
              >
                {countPerms(selectedRole)}
                <span style={{ fontSize: 14, color: DP.textT }}>
                  {fill(L.permOf, { total: ALL_PERM_IDS.length })}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ ...cardStyle }}>
          {PERM_CATEGORIES.map((cat) => (
            <div key={cat.catKey}>
              <div style={catHeaderStyle}>{L.permCategories[cat.catKey]}</div>
              {cat.ids.map((pid) => {
                const checked = getMatrix(selectedRole, pid);
                return (
                  <div
                    key={pid}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 16px',
                      borderBottom: `1px solid ${DP.borderT}`,
                    }}
                  >
                    <div
                      style={{ width: 20, display: 'flex', justifyContent: 'center' }}
                    >
                      <ReadMark on={checked} color={DP.accent} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: DP.textP }}>
                        {L.perms[pid]}
                      </div>
                      <div style={{ fontSize: 11, color: DP.textT }}>
                        {L.permDescs[pid]}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 99,
                        background: checked ? DP.accentBg : DP.inset,
                        color: checked ? DP.accentTc : DP.textT,
                        border: `1px solid ${checked ? DP.accentBd : DP.borderT}`,
                      }}
                    >
                      {checked ? L.allowed : L.blocked}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── 정보 공개 범위 탭 ─────────────────────────────────────────────
  const visibilityContent = (
    <div>
      <div style={{ marginBottom: 14 }}>
        <div
          className="admin-section-label"
          style={{ fontSize: 14, fontWeight: 700, color: DP.textP, marginBottom: 3 }}
        >
          {L.visibility.title}
        </div>
        <div style={{ fontSize: 12, color: DP.textS }}>
          {L.visibility.description}
        </div>
      </div>

      <div style={{ ...cardStyle, marginBottom: 14 }}>
        <table
          className="admin-emp-table"
          style={{ width: '100%', borderCollapse: 'collapse' }}
        >
          <thead>
            <tr style={{ background: DP.inset }}>
              <th
                style={{
                  padding: '11px 16px',
                  textAlign: 'left',
                  fontSize: 10,
                  fontWeight: 700,
                  color: DP.textT,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  borderBottom: `1px solid ${DP.borderT}`,
                  minWidth: 200,
                }}
              >
                {L.visibility.infoItem}
              </th>
              {ROLES.map((rid) => (
                <th
                  key={rid}
                  style={{
                    padding: '11px 14px',
                    textAlign: 'center',
                    borderBottom: `1px solid ${DP.borderT}`,
                    minWidth: 100,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: DP.textP }}>
                    {L.roles[rid]}
                  </div>
                  <div style={{ fontSize: 10, color: DP.textT, marginTop: 2 }}>
                    {L.roleDescs[rid]}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {VIS_ITEMS.map((item) => (
              <tr key={item.id} style={{ borderBottom: `1px solid ${DP.borderT}` }}>
                <td style={{ padding: '11px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: DP.textP }}>
                      {L.visItems[item.id]}
                    </span>
                    {item.sensitive && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: 99,
                          background: 'var(--utility-error-50, #fef3f2)',
                          border: '1px solid #fecdca',
                          color: 'var(--text-error-primary, #d92d20)',
                        }}
                      >
                        {L.visibility.sensitive}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: DP.textT, marginTop: 2 }}>
                    {L.visDescs[item.id]}
                  </div>
                </td>
                {ROLES.map((rid) => {
                  const on = visibility[rid]?.[item.id] ?? false;
                  return (
                    <td
                      key={rid}
                      style={{ textAlign: 'center', padding: '11px 14px' }}
                    >
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: 99,
                          background: on ? DP.accentBg : DP.inset,
                          color: on ? DP.accentTc : DP.textT,
                          border: `1px solid ${on ? DP.accentBd : DP.borderT}`,
                        }}
                      >
                        {on ? L.visibility.public : L.visibility.private}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        style={{
          padding: '12px 16px',
          background: DP.accentBg,
          border: `1px solid ${DP.accentBd}`,
          borderRadius: DP.radius.lg,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: DP.accentTc,
            marginBottom: 8,
          }}
        >
          {L.visibility.principlesTitle}
        </div>
        {[1, 2, 3, 4].map((n) => (
          <div key={n} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: DP.accentTc,
                whiteSpace: 'nowrap',
              }}
            >
              {L.visibility[`principle${n}Title`]}
            </span>
            <span style={{ fontSize: 11, color: DP.accentTc, opacity: 0.82 }}>
              {L.visibility[`principle${n}Desc`]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  const TABS = [
    { key: 'matrix', label: L.tabs.matrix, Icon: GridIcon },
    { key: 'roles', label: L.tabs.roles, Icon: ShieldIcon },
    { key: 'visibility', label: L.tabs.visibility, Icon: EyeIcon },
  ];

  return (
    <div style={{ fontFamily: DP.font }}>
      {/* 헤더 — 제목 + 읽기 전용 표시 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 800,
              color: DP.textP,
              letterSpacing: -0.3,
            }}
          >
            {L.title}
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: DP.textT }}>
            {L.description}
          </p>
        </div>
        <span
          style={{
            flexShrink: 0,
            fontSize: 11,
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: 99,
            background: DP.inset,
            color: DP.textT,
            border: `1px solid ${DP.borderT}`,
          }}
        >
          {L.readOnly}
        </span>
      </div>

      {/* 탭 바 (design-page admin-emp-tabbar) */}
      <div className="admin-emp-tabbar" style={{ marginBottom: 16 }}>
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            className={`admin-emp-tab${tab === key ? ' is-active' : ''}`}
            onClick={() => setTab(key)}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Icon />
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* 역할 요약 카드 (정본 admin-stat-tile + admin-eval-bar) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${ROLES.length}, 1fr)`,
          gap: 10,
          marginBottom: 18,
        }}
      >
        {ROLES.map((rid) => {
          const cnt = countPerms(rid);
          const pct = Math.min(100, Math.round((cnt / ALL_PERM_IDS.length) * 100));
          const selected = tab === 'roles' && selectedRole === rid;
          return (
            <div
              key={rid}
              data-testid={`role-summary-card-${rid}`}
              className="admin-stat-tile"
              onClick={() => {
                setTab('roles');
                setSelectedRole(rid);
              }}
              style={{
                padding: '14px 16px',
                cursor: 'pointer',
                boxShadow: selected
                  ? `0 0 0 1.5px ${DP.accent}, var(--admin-card-shadow)`
                  : undefined,
                transition: 'box-shadow .15s',
              }}
            >
              <div className="admin-stat-label" style={{ margin: '0 0 2px' }}>
                {L.roles[rid]}
              </div>
              <div style={{ fontSize: 10, color: DP.textT, marginBottom: 10 }}>
                {L.roleDescs[rid]}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <span className="admin-stat-value" style={{ fontSize: 24 }}>
                  {cnt}
                </span>
                <span className="admin-stat-sub">
                  {fill(L.permOf, { total: ALL_PERM_IDS.length })}
                </span>
              </div>
              <div className="admin-eval-bar" style={{ height: 6 }}>
                <div className="admin-eval-bar-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* 콘텐츠 */}
      {tab === 'matrix' && matrixContent}
      {tab === 'roles' && rolesContent}
      {tab === 'visibility' && visibilityContent}
    </div>
  );
}
