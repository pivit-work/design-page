import Button from '../shared/Button.jsx';
import SearchSelect from '../shared/SearchSelect.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import Switch from '../shared/Switch.jsx';
import { SkeletonList } from '../shared/Skeleton.jsx';
import { UsersGlyph } from '../shared/lineIcons.jsx';
import { LeadStarIcon } from '../orgchart/squadIcons.jsx';
import { CardFoot, CardHead, CardNote, GrantRow } from './AdminOkrGrantPanel.jsx';

// 색·카드 바탕은 «OKR 작성 권한» 탭(`AdminOkrGrantPanel`)과 같은 값이다.
const DP = {
  textP: 'var(--text-primary, #596069)',
  textS: 'var(--text-secondary, #687079)',
  borderT: 'var(--colors-border-borderSecondary, #e6e8ea)',
};
const cardStyle = {
  background: 'var(--bg-quaternary, #ffffff)',
  borderRadius: 16,
  boxShadow: 'var(--admin-card-shadow, 0 1px 2px 0 var(--colors-effects-shadows-shadowSm01), 0 1px 3px 0 var(--colors-effects-shadows-shadowSm02))',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
};

/**
 * AdminSquadGrantPanel — 권한 관리 «스쿼드 조직 권한» 탭 본문 (pivit-work PW-2635 · 기획 스쿼드 정책 §5-8-A).
 *
 * 순수 표현 컴포넌트다. 줄·켬/끔·변경 건수·저장 중 여부는 전부 소비 측이 들고 props 로 넘긴다 — 누가 받을
 * 수 있나(어드민·퇴사자 제외)·누가 리드인가는 서버 판정을 그대로 받는다.
 *
 * 디자이너 원본이 없는 탭이라 바로 옆 «OKR 작성 권한» 탭(`AdminOkrGrantPanel`)의 머리 · 2단 카드 · 줄 ·
 * 켬/끔 · 딱지 · 검색되는 선택 목록을 그대로 쓴다(기획 §5-8-A «새 시각 언어를 만들지 않는다»). 딱지는
 * 같은 화면의 `admin-pill` — 켜짐(위임됨·만든 사람)은 강조, 리드·휴직은 회색. (design-review)
 */

const DEFAULT_LABELS = {
  title: '스쿼드 조직 권한 위임',
  description: '스쿼드를 만들고 꾸릴 사람을 고릅니다. 어드민은 늘 모든 스쿼드를 관리할 수 있습니다.',
  save: '저장',
  saving: '저장 중…',
  changes: '변경 {{count}}건',
  retry: '다시 시도',
  loadFailed: '권한 목록을 불러오지 못했습니다.',
  delegated: '위임됨',
  creator: '만든 사람',
  lead: '리드',
  onLeave: '휴직',
  toggle: '{{name}} 권한',
  noPerson: '찾는 사람이 없습니다.',
  searchPerson: '이름 · 소속으로 찾기',
  manager: {
    title: '스쿼드 장에게 매니저 일 맡기기',
    description:
      '켜면 맡은 진행중 스쿼드 사람에 대해 조직장과 같은 매니저 일(매니저 대시보드 · 1on1 · 팀 피드백 · 팀 평가 관리)을 합니다.',
    footer: '저장된 매니저(상급자)는 바뀌지 않습니다. 평가의 1차 평가자 추천도 그대로입니다.',
    loadFailed: '설정을 불러오지 못했습니다.',
  },
  create: {
    title: '스쿼드 만들기 권한',
    description: '새 스쿼드를 만들 수 있는 사람을 고릅니다. 만든 스쿼드는 그 사람이 편성할 수 있습니다.',
    empty: '아직 스쿼드를 만들 수 있는 사람이 없습니다. 어드민은 늘 만들 수 있습니다.',
    find: '사람 찾기',
    footer: '저장하면 바로 적용됩니다.',
  },
  squad: {
    title: '스쿼드 편성 권한',
    description: '스쿼드를 고르고, 그 스쿼드를 맡길 사람을 켭니다.',
    select: '스쿼드 선택',
    searchSquad: '스쿼드 이름으로 찾기',
    noSquad: '찾는 스쿼드가 없습니다.',
    noSquads: '아직 스쿼드가 없습니다. 스쿼드가 만들어지면 여기서 편성할 사람을 고를 수 있습니다.',
    empty: '이 스쿼드에 배정된 사람이 없습니다.',
    find: '다른 사람 찾기',
    footer: '리드의 기본 권한(팀원 배정 · 비중 · 프로젝트 연결)은 이 설정과 상관없이 유지됩니다.',
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

// 카드·머리·안내·발·줄은 «OKR 작성 권한» 탭 것을 그대로 쓴다 — 두 탭이 한 화면에서 같은 모양이어야 한다.
const SIDE = 'calc(var(--spacing-xl) + var(--spacing-xxs))'; // 18 — 카드 머리·줄의 좌우와 맞춘다

function Chips({ row, L }) {
  return (
    <>
      {row.isLead ? <StatusBadge className="admin-pill is-inactive">{L.lead}</StatusBadge> : null}
      {row.onLeave ? <StatusBadge className="admin-pill is-inactive">{L.onLeave}</StatusBadge> : null}
      {/* 만들어서 받은 사람은 «위임됨» 대신 «만든 사람»(§5-8-A «만든 사람 행»). 끄면 둘 다 없다. */}
      {row.on && row.isCreator ? <StatusBadge className="admin-pill is-active">{L.creator}</StatusBadge> : null}
    </>
  );
}

function Row({ row, scope, L, onToggle }) {
  return (
    <GrantRow
      row={{ ...row, delegated: !!row.on && !!row.delegated && !row.isCreator, isHead: false }}
      scope={scope}
      L={L}
      onToggle={onToggle}
      testIdPrefix="squad-grant"
      chips={<Chips row={row} L={L} />}
    />
  );
}

/**
 * «스쿼드 장에게 매니저 일 맡기기» 설정 한 줄 (pivit-work PW-2778 · 스쿼드 정책 v3.55 §5-8-A).
 * 사람 줄이 아니라 «자리» 설정이라 아바타 대신 같은 크기의 둥근 네모 아이콘을 둔다.
 */
function ManagerSettingRow({ row, onToggle }) {
  return (
    <div
      data-testid={`squad-grant-manager-row-${row.key}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-lg)',
        // 같은 카드의 사람 줄(GrantRow 10px 18px)과 왼쪽 끝을 맞춘다.
        padding: 'calc(var(--spacing-md) + var(--spacing-xxs)) calc(var(--spacing-xl) + var(--spacing-xxs))',
        borderBottom: `1px solid ${DP.borderT}`,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--utility-brand-50, #f1fffa)',
          color: 'var(--utility-brand-600, #079455)',
        }}
      >
        {row.key === 'lead' ? <LeadStarIcon size={14} /> : <UsersGlyph size={14} />}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: DP.textP, overflowWrap: 'anywhere' }}>{row.name}</div>
        <div style={{ fontSize: 11, color: DP.textS, overflowWrap: 'anywhere' }}>{row.sub}</div>
      </div>
      <Switch
        checked={!!row.on}
        label={row.name}
        data-testid={`squad-grant-manager-toggle-${row.key}`}
        onChange={(next) => onToggle?.(row.key, next)}
      />
    </div>
  );
}

function ManagerCard({ card, L, retryLabel }) {
  const M = L.manager;
  return (
    <div style={{ ...cardStyle, marginBottom: 'var(--spacing-lg)' }} data-testid="squad-grant-manager">
      <CardHead title={M.title} description={M.description} />
      {card.status === 'loading' ? (
        <CardNote>
          <SkeletonList count={2} height={40} />
        </CardNote>
      ) : card.status === 'failed' ? (
        <CardNote testId="squad-grant-manager-load-failed">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-lg)' }}>
            <div style={{ flex: 1, fontSize: 13, color: DP.textP }}>{M.loadFailed}</div>
            <Button variant="secondary" size="sm" onClick={card.onRetry}>
              {retryLabel}
            </Button>
          </div>
        </CardNote>
      ) : (
        (card.rows ?? []).map((row) => <ManagerSettingRow key={row.key} row={row} onToggle={card.onToggle} />)
      )}
      <CardFoot>{M.footer}</CardFoot>
    </div>
  );
}

/**
 * @param props.managerCard «스쿼드 장에게 매니저 일 맡기기» 전폭 카드(PW-2778) — 머리 아래 · 2단 카드 위.
 *   `{ status: 'loading'|'failed'|'ready', rows: [{ key: 'lead'|'head', name, sub, on }], onToggle(key, next), onRetry }`.
 *   없으면 그리지 않는다. 2단 카드와 따로 불러오고 따로 실패한다.
 * @param props.createRows 만들기 권한 줄 — 지금 권한이 있는 사람(+ 이번에 켰다 끈 사람).
 * @param props.createOptions «사람 찾기» 후보 — 줄에 없는 사람만. 고르면 켜진 채 목록 끝에 붙는다.
 * @param props.squadOptions 스쿼드 고르기 — `{ value, label, subLabel(상태) }`. 비면 «아직 스쿼드가 없습니다».
 * @param props.squadRows 고른 스쿼드의 줄 — 리드 → 배정된 사람 → 배정되지 않은 권한자 순으로 받은 그대로.
 * @param props.assignedCount 고른 스쿼드에 배정된 사람 수 — 0 이면 «이 스쿼드에 배정된 사람이 없습니다».
 * @param props.changeCount 저장 안 한 변경 건수 — 0 이면 [저장] 이 꺼진다.
 */
export default function AdminSquadGrantPanel({
  labels,
  status = 'ready',
  onRetry,
  createRows = [],
  createOptions = [],
  onAddCreate,
  squadOptions = [],
  selectedSquadId = null,
  onSelectSquad,
  squadRows = [],
  assignedCount = 0,
  squadOutsideOptions = [],
  onAddSquad,
  onToggle,
  changeCount = 0,
  saving = false,
  onSave,
  managerCard = null,
}) {
  const L = mergeLabels(DEFAULT_LABELS, labels);
  const loading = status === 'loading';
  const failed = status === 'failed';
  const failedNote = (
    <CardNote testId="squad-grant-load-failed">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-lg)' }}>
        <div style={{ flex: 1, fontSize: 13, color: DP.textP }}>{L.loadFailed}</div>
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {L.retry}
        </Button>
      </div>
    </CardNote>
  );
  const skeleton = (
    <CardNote>
      <SkeletonList count={3} height={40} />
    </CardNote>
  );
  const findBox = { padding: `var(--spacing-lg) ${SIDE}` };
  const rowProps = { L, onToggle };

  return (
    <div data-testid="squad-grant-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)', minHeight: 32 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: DP.textP, marginBottom: 'var(--spacing-xxs)' }}>{L.title}</div>
          <div style={{ fontSize: 13, color: DP.textS }}>{L.description}</div>
        </div>
        {/* 목록을 받기 전·못 받았을 때는 바꿀 수 있는 것이 없다 — 버튼도 그리지 않는다(§5-8-A «상태»). */}
        {loading || failed ? null : (
          <>
            {changeCount > 0 ? (
              <span style={{ fontSize: 12, color: DP.textS }} data-testid="squad-grant-changes">
                {fill(L.changes, { count: changeCount })}
              </span>
            ) : null}
            <Button
              variant="primary"
              size="sm"
              disabled={changeCount === 0}
              pending={saving}
              pendingLabel={L.saving}
              onClick={onSave}
              data-testid="squad-grant-save"
            >
              {L.save}
            </Button>
          </>
        )}
      </div>

      {managerCard ? <ManagerCard card={managerCard} L={L} retryLabel={L.retry} /> : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 'var(--spacing-lg)',
          alignItems: 'start',
        }}
      >
        <div style={cardStyle} data-testid="squad-grant-create">
          <CardHead title={L.create.title} description={L.create.description} />
          {loading ? (
            skeleton
          ) : failed ? (
            failedNote
          ) : (
            <>
              {createRows.length === 0 ? (
                <CardNote testId="squad-grant-create-empty">{L.create.empty}</CardNote>
              ) : (
                createRows.map((row) => <Row key={row.userId} row={row} scope="create" {...rowProps} />)
              )}
              <div style={findBox}>
                <SearchSelect
                  value=""
                  options={createOptions}
                  onChange={(v) => v && onAddCreate?.(v)}
                  placeholder={L.create.find}
                  searchPlaceholder={L.searchPerson}
                  noResultLabel={L.noPerson}
                  aria-label={L.create.find}
                  data-testid="squad-grant-create-find"
                />
              </div>
            </>
          )}
          <CardFoot>{L.create.footer}</CardFoot>
        </div>

        <div style={cardStyle} data-testid="squad-grant-squad">
          <CardHead title={L.squad.title} description={L.squad.description}>
            {loading || failed || squadOptions.length === 0 ? null : (
              <SearchSelect
                value={selectedSquadId ?? ''}
                options={squadOptions}
                onChange={(v) => v && onSelectSquad?.(v)}
                placeholder={L.squad.select}
                searchPlaceholder={L.squad.searchSquad}
                noResultLabel={L.squad.noSquad}
                aria-label={L.squad.select}
                data-testid="squad-grant-squad-select"
              />
            )}
          </CardHead>
          {loading ? (
            skeleton
          ) : failed ? (
            failedNote
          ) : squadOptions.length === 0 ? (
            <CardNote testId="squad-grant-no-squads">{L.squad.noSquads}</CardNote>
          ) : (
            <>
              {assignedCount === 0 ? <CardNote testId="squad-grant-squad-empty">{L.squad.empty}</CardNote> : null}
              {squadRows.map((row) => (
                <Row key={row.userId} row={row} scope="squad" {...rowProps} />
              ))}
              <div style={findBox}>
                <SearchSelect
                  value=""
                  options={squadOutsideOptions}
                  onChange={(v) => v && onAddSquad?.(v)}
                  placeholder={L.squad.find}
                  searchPlaceholder={L.searchPerson}
                  noResultLabel={L.noPerson}
                  aria-label={L.squad.find}
                  data-testid="squad-grant-squad-find"
                />
              </div>
            </>
          )}
          <CardFoot>{L.squad.footer}</CardFoot>
        </div>
      </div>
    </div>
  );
}
