import Button from '../shared/Button.jsx';
import SearchSelect from '../shared/SearchSelect.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import Switch from '../shared/Switch.jsx';
import { SkeletonList } from '../shared/Skeleton.jsx';
import { UsersGlyph } from '../shared/lineIcons.jsx';
import { LeadStarIcon } from '../orgchart/squadIcons.jsx';
import { CardEmpty, CardFailed, CardNote, GrantList, GrantRow } from './AdminOkrGrantPanel.jsx';
import { RbacPanel } from './AdminRbacCanvas.jsx';

/**
 * AdminSquadGrantPanel — 권한 관리 «스쿼드 조직 권한» 탭 본문 (pivit-work PW-2635 · 기획 스쿼드 정책 §5-8-A).
 *
 * 순수 표현 컴포넌트다. 줄·켬/끔·변경 건수·저장 중 여부는 전부 소비 측이 들고 props 로 넘긴다 — 누가 받을
 * 수 있나(어드민·퇴사자 제외)·누가 리드인가는 서버 판정을 그대로 받는다.
 *
 * 디자이너 원본이 없는 탭이라 바로 옆 «OKR 작성 권한» 탭(`AdminOkrGrantPanel`)의 머리 · 2단 흰 판 · 줄 ·
 * 켬/끔 · 딱지 · 검색되는 선택 목록을 그대로 쓴다(기획 §5-8-A «새 시각 언어를 만들지 않는다»).
 * 생김새는 pivit-work PW-3121 에서 디자이너 화면 값으로 다시 칠했다(admin.css «권한 기준정보» 절). (design-review)
 */

const DEFAULT_LABELS = {
  title: '스쿼드 조직 권한 위임',
  description: '스쿼드를 만들고 꾸릴 사람을 고릅니다. 어드민은 늘 모든 스쿼드를 관리할 수 있습니다.',
  save: '저장',
  saving: '저장 중…',
  changes: '변경 {{count}}건',
  count: '{{count}}명',
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

function Chips({ row, L }) {
  return (
    <>
      {row.isLead ? <StatusBadge tone="neutral">{L.lead}</StatusBadge> : null}
      {row.onLeave ? <StatusBadge tone="neutral">{L.onLeave}</StatusBadge> : null}
      {/* 만들어서 받은 사람은 «위임됨» 대신 «만든 사람»(§5-8-A «만든 사람 행»). 끄면 둘 다 없다. */}
      {row.on && row.isCreator ? <StatusBadge tone="success">{L.creator}</StatusBadge> : null}
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
 * 사람 줄이 아니라 «자리» 설정이라 아바타 대신 같은 크기의 옅은 초록 네모 아이콘을 둔다. 설명은 길어 줄을 바꾼다.
 */
function ManagerSettingRow({ row, onToggle }) {
  return (
    <div className="rbac-row" data-testid={`squad-grant-manager-row-${row.key}`}>
      <span className="rbac-row-icon" aria-hidden>
        {row.key === 'lead' ? <LeadStarIcon size={14} /> : <UsersGlyph size={14} />}
      </span>
      <div className="rbac-row-text">
        <b title={row.name}>{row.name}</b>
        <small className="is-wrap">{row.sub}</small>
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
    <RbacPanel title={M.title} testId="squad-grant-manager">
      <CardNote>{M.description}</CardNote>
      {card.status === 'loading' ? (
        <SkeletonList count={2} height={40} />
      ) : card.status === 'failed' ? (
        <CardFailed
          message={M.loadFailed}
          retryLabel={retryLabel}
          onRetry={card.onRetry}
          testId="squad-grant-manager-load-failed"
        />
      ) : (
        <div className="rbac-list">
          {(card.rows ?? []).map((row) => (
            <ManagerSettingRow key={row.key} row={row} onToggle={card.onToggle} />
          ))}
        </div>
      )}
      <CardNote>{M.footer}</CardNote>
    </RbacPanel>
  );
}

/**
 * @param props.managerCard «스쿼드 장에게 매니저 일 맡기기» 전폭 판(PW-2778) — 머리 아래 · 2단 판 위.
 *   `{ status: 'loading'|'failed'|'ready', rows: [{ key: 'lead'|'head', name, sub, on }], onToggle(key, next), onRetry }`.
 *   없으면 그리지 않는다. 2단 판과 따로 불러오고 따로 실패한다.
 * @param props.createRows 만들기 권한 줄 — 지금 권한이 있는 사람(+ 이번에 켰다 끈 사람).
 * @param props.createOptions «사람 찾기» 후보 — 줄에 없는 사람만 · `subLabel` 은 소속 조직명(§5-8-A «검색 결과 행»).
 *   고르면 켜진 채 목록 끝에 붙는다.
 * @param props.squadOptions 스쿼드 고르기 — `{ value, label, subLabel(상태) }`. 비면 «아직 스쿼드가 없습니다».
 * @param props.squadRows 고른 스쿼드의 줄 — 리드 → 배정된 사람 → 배정되지 않은 권한자 순으로 받은 그대로.
 * @param props.assignedCount 고른 스쿼드에 배정된 사람 수 — 0 이면 «이 스쿼드에 배정된 사람이 없습니다».
 * @param props.changeCount 저장 안 한 변경 건수 — 0 이면 [저장] 이 꺼진다(«변경 0건»은 그대로 보인다 · TC-ADM-509).
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
    <CardFailed message={L.loadFailed} retryLabel={L.retry} onRetry={onRetry} testId="squad-grant-load-failed" />
  );
  const skeleton = <SkeletonList count={3} height={40} />;
  const rowProps = { L, onToggle };
  const countOf = (rows) => fill(L.count, { count: rows.length });

  return (
    <div className="rbac-grant" data-testid="squad-grant-panel">
      <div className="rbac-grant-head">
        <div className="rbac-grant-head-text">
          <h2>{L.title}</h2>
          <p>{L.description}</p>
        </div>
        {/* 목록을 받기 전·못 받았을 때는 바꿀 수 있는 것이 없다 — 버튼도 그리지 않는다(§5-8-A «상태»). */}
        {loading || failed ? null : (
          <>
            <span className="rbac-grant-changes" data-testid="squad-grant-changes">
              {fill(L.changes, { count: changeCount })}
            </span>
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

      <div className="rbac-grant-cols">
        <RbacPanel title={L.create.title} testId="squad-grant-create">
          <CardNote>{L.create.description}</CardNote>
          {loading ? (
            skeleton
          ) : failed ? (
            failedNote
          ) : (
            <>
              {createRows.length === 0 ? (
                <CardEmpty testId="squad-grant-create-empty">{L.create.empty}</CardEmpty>
              ) : (
                <GrantList rows={createRows} testId="squad-grant-create-list" countLabel={countOf(createRows)}>
                  {createRows.map((row) => (
                    <Row key={row.userId} row={row} scope="create" {...rowProps} />
                  ))}
                </GrantList>
              )}
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
            </>
          )}
          <CardNote>{L.create.footer}</CardNote>
        </RbacPanel>

        <RbacPanel title={L.squad.title} testId="squad-grant-squad">
          <CardNote>{L.squad.description}</CardNote>
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
          {loading ? (
            skeleton
          ) : failed ? (
            failedNote
          ) : squadOptions.length === 0 ? (
            <CardEmpty testId="squad-grant-no-squads">{L.squad.noSquads}</CardEmpty>
          ) : (
            <>
              {assignedCount === 0 ? <CardEmpty testId="squad-grant-squad-empty">{L.squad.empty}</CardEmpty> : null}
              {squadRows.length > 0 ? (
                <GrantList rows={squadRows} testId="squad-grant-squad-list" countLabel={countOf(squadRows)}>
                  {squadRows.map((row) => (
                    <Row key={row.userId} row={row} scope="squad" {...rowProps} />
                  ))}
                </GrantList>
              ) : null}
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
            </>
          )}
          <CardNote>{L.squad.footer}</CardNote>
        </RbacPanel>
      </div>
    </div>
  );
}
