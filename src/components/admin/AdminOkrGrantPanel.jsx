import Avatar from '../shared/Avatar.jsx';
import Button from '../shared/Button.jsx';
import DateInput from '../shared/DateInput.jsx';
import SearchInput from '../shared/SearchInput.jsx';
import SearchSelect from '../shared/SearchSelect.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import Switch from '../shared/Switch.jsx';
import { SkeletonList } from '../shared/Skeleton.jsx';
import { NoticeLines, Panel } from '../frames/index.js';

/**
 * AdminOkrGrantPanel — 권한 기준정보 «OKR 작성 권한» 탭 본문 (pivit-work PW-1501 · 기획 okr-policy §2A.4).
 *
 * 순수 표현 컴포넌트다. 목록·켬/끔·만료일·저장 중 여부는 전부 소비 측이 들고 props 로 넘긴다 —
 * 서버 판정(누가 후보인가·누가 조직장인가)을 여기서 다시 하지 않는다.
 *
 * 생김새는 pivit-work PW-3121 에서 디자이너 화면 값으로 다시 칠했다 — 흰 판 · 안내 줄은 공용 틀(Panel · NoticeLines · PW-3139), 사람 줄 · 빈/실패 안내는
 * admin.css «권한 기준정보 (pivit-work PW-3121)» 절. «스쿼드 조직 권한» 탭도 같은 조각을 쓴다(두 탭이 한 화면에서 같은 모양).
 */

/** 이 줄 수를 넘으면 판 안에서 넘긴다(약 8줄 · admin.css .rbac-list.is-long) */
export const LONG_LIST_ROWS = 8;

const DEFAULT_LABELS = {
  title: 'OKR 작성 권한 위임',
  description: '전사 OKR 과 조직(본부·부문·팀) OKR 의 작성 권한을 맡길 사람을 고릅니다.',
  save: '저장',
  saving: '저장 중…',
  reset: '되돌리기',
  retry: '다시 시도',
  loadFailed: '권한 목록을 불러오지 못했습니다.',
  delegated: '위임됨',
  headDefault: '조직장 (기본)',
  expiresPlaceholder: '만료일 (선택)',
  toggle: '{{name}} 위임',
  count: '{{count}}명',
  countDelegated: '{{count}}명 · 위임 {{delegated}}명',
  company: {
    title: '전사 OKR 작성 권한',
    description: '조직장이나 대표에게 전사 OKR·전략 캔버스를 쓸 수 있게 합니다.',
    empty: '전사 OKR 을 넘겨받을 수 있는 사람이 없습니다. 조직장이나 대표가 지정되면 여기에 나타납니다.',
    search: '이름으로 찾기',
    noMatch: '찾는 사람이 없습니다.',
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

/**
 * 판 안 설명 · 발 안내 — 바탕 없는 흐린 안내 줄(공용 틀 NoticeLines muted · PW-3139).
 * 발 안내(`foot`)는 나란한 두 판에서 판 맨 아래로 내린다 — 틀이 제 바깥 여백을 0 으로 박아 두어 감싸는 칸이 내린다.
 */
export function CardNote({ foot = false, children }) {
  if (!children) return null;
  const note = <NoticeLines lines={[children]} tone="muted" />;
  return foot ? <div className="rbac-note-foot">{note}</div> : note;
}

/** 빈 · 찾는 사람 없음 — 판 가운데 옅은 글 */
export function CardEmpty({ children, testId }) {
  return (
    <p className="rbac-empty" data-testid={testId}>
      {children}
    </p>
  );
}

/** 불러오지 못함 — 가운데 글 + [다시 시도] 흰 보조 버튼 */
export function CardFailed({ message, retryLabel, onRetry, testId }) {
  return (
    <div className="rbac-failed" data-testid={testId}>
      <span>{message}</span>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        {retryLabel}
      </Button>
    </div>
  );
}

/** 사람 줄 목록 — 많으면 위에 인원 수를 두고 판 안 약 8줄 높이에서 넘긴다 */
export function GrantList({ rows, countLabel, testId, children }) {
  const long = rows.length > LONG_LIST_ROWS;
  return (
    <div>
      {long && countLabel ? (
        <div className="rbac-count" data-testid={testId ? `${testId}-count` : undefined}>
          {countLabel}
        </div>
      ) : null}
      <div className={`rbac-list ${long ? 'is-long' : ''}`.trim()} data-testid={testId}>
        {children}
      </div>
    </div>
  );
}

/**
 * 위임 한 줄 — «스쿼드 조직 권한» 탭도 같은 줄을 쓴다(pivit-work PW-2635). 그 탭은 `testIdPrefix` 로
 * 시험 이름을 바꾸고, 만료일 칸 없이(`onExpiryChange` 없음) 리드·휴직·만든 사람 딱지를 `chips` 로 넣는다.
 * 딱지 뜻 → 색: 위임됨·만든 사람 = 초록(success) · 조직장 (기본)·리드·휴직 = 회색(neutral).
 */
export function GrantRow({ row, scope, L, today, onToggle, onExpiryChange, testIdPrefix = 'okr-grant', chips = null }) {
  return (
    <div className="rbac-row" data-testid={`${testIdPrefix}-row-${scope}-${row.userId}`}>
      <Avatar name={row.name} size={28} />
      <div className="rbac-row-text">
        <b title={row.name}>{row.name}</b>
        {row.subLabel ? <small title={row.subLabel}>{row.subLabel}</small> : null}
      </div>
      {row.isHead ? (
        <StatusBadge className="rbac-badge" tone="neutral">{L.headDefault}</StatusBadge>
      ) : (
        <>
          {chips}
          {row.delegated ? <StatusBadge className="rbac-badge" tone="success">{L.delegated}</StatusBadge> : null}
          {row.on && onExpiryChange ? (
            <DateInput
              className="admin-emp-input is-sm"
              // 안내 글이 칸보다 길면 잘린다 — 글 길이만큼 넓힌다.
              size={Math.max(13, String(L.expiresPlaceholder).length + 1)}
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
            data-testid={`${testIdPrefix}-toggle-${scope}-${row.userId}`}
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
  companyQuery = '',
  onCompanyQueryChange,
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
  const loading = status === 'loading';
  const failed = status === 'failed';
  const rowProps = { L, today, onToggle, onExpiryChange };
  const skeleton = <SkeletonList count={3} height={40} />;
  const countOf = (rows) => fill(L.countDelegated, { count: rows.length, delegated: rows.filter((r) => r.delegated).length });

  return (
    <div className="rbac-grant" data-testid="okr-grant-panel">
      <div className="rbac-grant-head">
        <div className="rbac-grant-head-text">
          <h2>{L.title}</h2>
          <p>{L.description}</p>
        </div>
        {/* 목록을 받기 전·못 받았을 때는 저장할 것이 없다 — 버튼도 그리지 않는다(§2F.6 fail-closed). */}
        {loading || failed ? null : (
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

      {failed ? (
        <Panel>
          <CardFailed message={L.loadFailed} retryLabel={L.retry} onRetry={onRetry} testId="okr-grant-load-failed" />
        </Panel>
      ) : (
        <div className="rbac-grant-cols">
          <Panel title={L.company.title} testId="okr-grant-company">
            <CardNote>{L.company.description}</CardNote>
            {/* 거르기는 소비 측이 한다 — 여기는 칸만 그리고, 받은 줄을 그대로 보여 준다. 후보가 아예 없으면 칸도 없다. */}
            {loading || (companyRows.length === 0 && !companyQuery) ? null : (
              <SearchInput
                value={companyQuery}
                onChange={(e) => onCompanyQueryChange?.(e.target.value)}
                placeholder={L.company.search}
                data-testid="okr-grant-company-search"
              />
            )}
            {loading ? (
              skeleton
            ) : companyRows.length === 0 ? (
              <CardEmpty testId={companyQuery ? 'okr-grant-company-no-match' : 'okr-grant-company-empty'}>
                {companyQuery ? L.company.noMatch : L.company.empty}
              </CardEmpty>
            ) : (
              <GrantList rows={companyRows} testId="okr-grant-company-list" countLabel={countOf(companyRows)}>
                {companyRows.map((row) => (
                  <GrantRow key={row.userId} row={row} scope="company" {...rowProps} />
                ))}
              </GrantList>
            )}
            <CardNote foot>{L.company.footer}</CardNote>
          </Panel>

          <Panel title={L.unit.title} testId="okr-grant-unit">
            <CardNote>{L.unit.description}</CardNote>
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
            {loading ? (
              skeleton
            ) : selectedUnitId ? (
              <>
                {unitRows.length === 0 ? (
                  <CardEmpty testId="okr-grant-unit-empty">{L.unit.empty}</CardEmpty>
                ) : (
                  <GrantList rows={unitRows} testId="okr-grant-unit-list" countLabel={countOf(unitRows)}>
                    {unitRows.map((row) => (
                      <GrantRow key={row.userId} row={row} scope="unit" {...rowProps} />
                    ))}
                  </GrantList>
                )}
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
              </>
            ) : null}
            <CardNote foot>{L.unit.footer}</CardNote>
          </Panel>
        </div>
      )}
    </div>
  );
}
