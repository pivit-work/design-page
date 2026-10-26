import Avatar from '../shared/Avatar.jsx';
import Button from '../shared/Button.jsx';
import DateInput from '../shared/DateInput.jsx';
import SearchSelect from '../shared/SearchSelect.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import Switch from '../shared/Switch.jsx';
import { SkeletonList } from '../shared/Skeleton.jsx';

/**
 * AdminOkrGrantPanel — 권한 관리 «OKR 작성 권한» 탭 본문 (pivit-work PW-1501 · 기획 okr-policy §2A.4).
 *
 * 순수 표현 컴포넌트다. 목록·켬/끔·만료일·저장 중 여부는 전부 소비 측이 들고 props 로 넘긴다 —
 * 서버 판정(누가 후보인가·누가 조직장인가)을 여기서 다시 하지 않는다.
 *
 * 디자이너 원본이 없는 화면이라 같은 화면(AdminRbacCanvas «역할별 권한» 탭)의 카드·머리·줄 모양을
 * 그대로 따른다 — 흰 카드(그림자·16 둥근 모서리) · 카드 머리(15/800 제목 + 12 회색 설명) · 줄 사이
 * 회색 선. 켬/끔·딱지·검색 칸·날짜 칸·버튼은 공용 부품이고, 딱지·날짜 칸 생김새는 같은 어드민 화면의
 * 것을 쓴다(딱지 `admin-pill` — 팀 관리 상태 딱지 · 날짜 칸 `admin-emp-input` — 직원 관리 입력 칸). (design-review)
 */

const DP = {
  surface: 'var(--bg-quaternary, #ffffff)',
  inset: 'var(--bg-secondary, #f9fafb)',
  borderT: '#e6e8ea',
  textP: 'var(--text-primary, #596069)',
  textS: 'var(--text-secondary, #687079)',
  shadow: '0 1px 2px 0 rgba(10,13,18,0.1), 0 1px 3px 0 rgba(10,13,18,0.1)',
  radius: { xl: 16 },
};

const DEFAULT_LABELS = {
  description: '어드민이 특정 사람에게 전사·조직 OKR 을 쓸 수 있게 넘겨줍니다.',
  save: '저장',
  saving: '저장 중…',
  reset: '되돌리기',
  retry: '다시 시도',
  loadFailed: '권한 목록을 불러오지 못했습니다.',
  delegated: '위임됨',
  headDefault: '조직장 (기본)',
  expiresPlaceholder: '만료일 (선택)',
  toggle: '{{name}} 위임',
  company: {
    title: '전사 OKR 작성 권한',
    description: '조직장이나 대표에게 전사 OKR·전략 캔버스를 쓸 수 있게 합니다.',
    empty: '전사 OKR 을 넘겨받을 수 있는 사람이 없습니다. 조직장이나 대표가 지정되면 여기에 나타납니다.',
    footer: '위임 권한은 즉시 적용되며, 저장 시 확정됩니다.',
  },
  unit: {
    title: '조직 OKR 작성 권한',
    description: '고른 조직 하나의 OKR 을 쓸 수 있게 합니다. 산하 조직으로는 번지지 않습니다.',
    selectUnit: '조직 선택',
    searchUnit: '조직 이름으로 찾기',
    noUnit: '찾는 조직이 없습니다.',
    empty: '이 조직에 소속된 사람이 없습니다.',
    outside: '다른 조직에서 찾기',
    searchPerson: '이름으로 찾기',
    noPerson: '찾는 사람이 없습니다.',
    footer: '조직장은 기본 작성 권한을 가지며 위임 설정 불필요합니다.',
  },
};

function mergeLabels(base, provided) {
  if (!provided) return base;
  const out = { ...base };
  for (const k of Object.keys(provided)) {
    const v = provided[k];
    out[k] = v && typeof v === 'object' && !Array.isArray(v) ? { ...base[k], ...v } : v;
  }
  return out;
}

function fill(str, vars) {
  return String(str ?? '').replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] ?? ''));
}

const cardStyle = {
  background: DP.surface,
  borderRadius: DP.radius.xl,
  boxShadow: DP.shadow,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
};

function CardHead({ title, description, children }) {
  return (
    <div style={{ padding: '14px 18px', borderBottom: `1px solid ${DP.borderT}` }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: DP.textP, marginBottom: 3 }}>{title}</div>
      <div style={{ fontSize: 12, color: DP.textS }}>{description}</div>
      {children ? <div style={{ marginTop: 10 }}>{children}</div> : null}
    </div>
  );
}

function CardNote({ children, testId }) {
  return (
    <div data-testid={testId} style={{ padding: '18px', fontSize: 12, color: DP.textS }}>
      {children}
    </div>
  );
}

function CardFoot({ children }) {
  return (
    <div
      style={{
        marginTop: 'auto',
        padding: '10px 18px',
        fontSize: 11,
        color: DP.textS,
        background: DP.inset,
        borderTop: `1px solid ${DP.borderT}`,
      }}
    >
      {children}
    </div>
  );
}

function GrantRow({ row, scope, L, today, onToggle, onExpiryChange }) {
  return (
    <div
      data-testid={`okr-grant-row-${scope}-${row.userId}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 18px',
        borderBottom: `1px solid ${DP.borderT}`,
      }}
    >
      <Avatar name={row.name} size={28} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: DP.textP,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {row.name}
        </div>
        {row.subLabel ? (
          <div
            style={{
              fontSize: 11,
              color: DP.textS,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={row.subLabel}
          >
            {row.subLabel}
          </div>
        ) : null}
      </div>
      {row.isHead ? (
        <StatusBadge className="admin-pill is-inactive">{L.headDefault}</StatusBadge>
      ) : (
        <>
          {row.delegated ? <StatusBadge className="admin-pill is-active">{L.delegated}</StatusBadge> : null}
          {row.on ? (
            <DateInput
              className="admin-emp-input"
              value={row.expiresOn ?? ''}
              min={today}
              placeholder={L.expiresPlaceholder}
              aria-label={L.expiresPlaceholder}
              data-testid={`okr-grant-expiry-${scope}-${row.userId}`}
              onChange={(v) => onExpiryChange?.(scope, row.userId, v || null)}
            />
          ) : null}
          <Switch
            checked={row.on}
            label={fill(L.toggle, { name: row.name })}
            data-testid={`okr-grant-toggle-${scope}-${row.userId}`}
            onChange={(next) => onToggle?.(scope, row.userId, next)}
          />
        </>
      )}
    </div>
  );
}

export default function AdminOkrGrantPanel({
  labels,
  status = 'ready',
  onRetry,
  companyRows = [],
  unitOptions = [],
  selectedUnitId = null,
  onSelectUnit,
  unitRows = [],
  outsideOptions = [],
  onAddOutside,
  onToggle,
  onExpiryChange,
  dirty = false,
  saving = false,
  onSave,
  onReset,
  today,
}) {
  const L = mergeLabels(DEFAULT_LABELS, labels);

  if (status === 'failed') {
    return (
      <div style={cardStyle} data-testid="okr-grant-load-failed">
        <div style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, fontSize: 13, color: DP.textP }}>{L.loadFailed}</div>
          <Button variant="secondary" size="sm" onClick={onRetry}>
            {L.retry}
          </Button>
        </div>
      </div>
    );
  }

  const loading = status === 'loading';
  const rowProps = { L, today, onToggle, onExpiryChange };

  return (
    <div data-testid="okr-grant-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1, fontSize: 13, color: DP.textS }}>{L.description}</div>
        {/* 목록을 받기 전에는 저장할 것이 없다 — 버튼도 그리지 않는다(§2F.6 fail-closed). */}
        {loading ? null : (
          <>
            <Button variant="secondary" size="sm" disabled={!dirty || saving} onClick={onReset}>
              {L.reset}
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!dirty}
              pending={saving}
              pendingLabel={L.saving}
              onClick={onSave}
              data-testid="okr-grant-save"
            >
              {L.save}
            </Button>
          </>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 14,
          alignItems: 'start',
        }}
      >
        <div style={cardStyle} data-testid="okr-grant-company">
          <CardHead title={L.company.title} description={L.company.description} />
          {loading ? (
            <div style={{ padding: 18 }}>
              <SkeletonList count={3} height={40} />
            </div>
          ) : companyRows.length === 0 ? (
            <CardNote testId="okr-grant-company-empty">{L.company.empty}</CardNote>
          ) : (
            companyRows.map((row) => (
              <GrantRow key={row.userId} row={row} scope="company" {...rowProps} />
            ))
          )}
          <CardFoot>{L.company.footer}</CardFoot>
        </div>

        <div style={cardStyle} data-testid="okr-grant-unit">
          <CardHead title={L.unit.title} description={L.unit.description}>
            {loading ? null : (
              <SearchSelect
                value={selectedUnitId ?? ''}
                options={unitOptions}
                onChange={(v) => onSelectUnit?.(v || null)}
                placeholder={L.unit.selectUnit}
                searchPlaceholder={L.unit.searchUnit}
                noResultLabel={L.unit.noUnit}
                aria-label={L.unit.selectUnit}
                data-testid="okr-grant-unit-select"
              />
            )}
          </CardHead>
          {loading ? (
            <div style={{ padding: 18 }}>
              <SkeletonList count={3} height={40} />
            </div>
          ) : selectedUnitId ? (
            <>
              {unitRows.length === 0 ? (
                <CardNote testId="okr-grant-unit-empty">{L.unit.empty}</CardNote>
              ) : (
                unitRows.map((row) => (
                  <GrantRow key={row.userId} row={row} scope="unit" {...rowProps} />
                ))
              )}
              <div style={{ padding: '12px 18px' }}>
                <SearchSelect
                  value=""
                  options={outsideOptions}
                  onChange={(v) => v && onAddOutside?.(v)}
                  placeholder={L.unit.outside}
                  searchPlaceholder={L.unit.searchPerson}
                  noResultLabel={L.unit.noPerson}
                  aria-label={L.unit.outside}
                  data-testid="okr-grant-outside"
                />
              </div>
            </>
          ) : null}
          <CardFoot>{L.unit.footer}</CardFoot>
        </div>
      </div>
    </div>
  );
}
