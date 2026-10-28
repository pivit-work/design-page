/**
 * 프로젝트 원장 «리소스» 탭 (pivit-work PW-2319).
 *
 * 정본 기획: `O. 프로젝트-원장/screen-project-detail.policy.md` §4-2 · §5-3 · §6-2 · §7 · §8 · §9 · §10
 * 기획 시안: `O. 프로젝트-원장/project-detail.jsx` 의 `ResourceTab` — «무엇을 보여 주나»만 따른다.
 *
 * 이 탭의 디자이너 원본은 없다. 같은 «퍼센트 배분» 도메인과 같은 용도의 디자이너 부품으로 조합했다:
 *  - 숫자 4칸 = 내 리소스 숫자 칸(`.rsx-stats` · `RsStatCard`)
 *  - 인원 행 = 내 리소스 «내 입력» 행(`.rsx-entry` · `.rsx-slider` · `.rsx-entry-input` · `.rsx-close-btn`)
 *  - 사용률 막대 = 내 리소스 스택 바(`RsStackBar`) — 다른 프로젝트 몫(회색) + 이 프로젝트 몫
 *  - 초과 띠 = 조직도 스쿼드 탭 «과부하 띠»(`.sq-overload`)
 *  - 인원 추가 = 스쿼드 «팀원 추가» 겹창(`.sq-add-*`), 자격 고르기는 `CustomSelect`
 *
 * 데이터를 고치지 않는다 — 저장·캐파 요청은 `on*` 콜백(Promise). 저장 전까지 바꾼 것은 이 탭 안에만 있다(§7).
 * 누가 어느 줄을 고칠 수 있는지, 캐파 요청을 보낼 수 있는지는 서버가 줄마다 준 값만 본다 — 화면이 역할로
 * 다시 가르면 버튼은 보이는데 403 이 난다(§8 v1.3).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import Button from '../shared/Button.jsx';
import { SkeletonList } from '../shared/Skeleton.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import Toast from '../shared/Toast.jsx';
import CustomSelect from '../timeline/CustomSelect.jsx';
import { RsStackBar, RsStatCard } from '../okr/OkrResourcePieces.jsx';
import { CheckIcon, CloseIcon, PlusIcon, SearchIcon, WarningIcon } from './squadIcons.jsx';
import { avatarLabelLayout } from './squad-constants.js';
import { ArrowRightGlyph } from '../shared/lineIcons.jsx';

const clampPct = (v) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
const TOAST_MS = 3000;
const SAVED_MS = 2000;

/** 서버 줄 → 이 탭이 고치는 줄. 상한·다른 프로젝트 몫은 그 자격 스쿼드 기준이다. */
function toDraft(rows) {
  return rows.map((r) => ({
    memberId: r.memberId,
    name: r.name,
    jobPosition: r.jobPosition,
    resigned: !!r.resigned,
    viaSquadId: r.viaSquadId,
    viaSquadName: r.viaSquadName,
    planPct: r.planPct,
    role: r.role,
    cap: r.squadAllocationPct,
    other: r.otherPct,
    actualPct: r.actualPct,
    canEdit: !!r.canEdit,
    capacityRequestable: !!r.capacityRequestable,
    capacityRequestedAt: r.capacityRequestedAt || null,
  }));
}

/** 이 프로젝트에서 더 쓸 수 있는 몫 — 음수면 초과(§6-2 `Σ plan ≤ 개인 캐파`). */
const slackOf = (row) => row.cap - row.other - row.planPct;

function sameDraft(a, b) {
  if (a.length !== b.length) return false;
  const key = (r) => `${r.memberId}|${r.viaSquadId}|${r.planPct}|${r.role}`;
  const left = a.map(key).sort().join('\n');
  return left === b.map(key).sort().join('\n');
}

function Avatar({ name, size = 32 }) {
  const fit = avatarLabelLayout(name.slice(0, 2), size);
  return (
    <div
      className={`sq-avatar${fit.lines.length > 1 ? ' is-two-line' : ''}`}
      style={{ width: size, height: size, fontSize: fit.fontPx, background: 'var(--bg-active)', color: 'var(--text-secondary)' }}
      aria-hidden
    >{fit.lines.map((line, i) => <span key={i} className="sq-avatar-line">{line}</span>)}</div>
  );
}

export default function ProjectResourceTab({
  L,
  project,
  /** `{ loading, error, data }` — `data` 는 `GET /projects/:id/assignments` 응답. `error` 가 참이면 «불러오지 못했습니다». */
  resource,
  /** 지금 보는 사람 id — 초과 행이 «내 행»인지 가른다(내 행 → 스쿼드 뷰 딥링크, 남의 행 → 캐파 요청). */
  meId,
  /** `(rows: [{ memberId, viaSquadId, planPct, role }], version) => Promise` — 실패면 `Error`(+ `code`·`violations`). */
  onSave,
  /** `(row) => Promise` — 캐파 설정 요청. 실패면 `Error`(+ `status`: 409·403). */
  onRequestCapacity,
  /** `() => void` — 다시 불러오기(실패 뒤 · 충돌 뒤 · 요청 403 뒤). */
  onReload,
  /** `(row) => void` — 내 초과 행의 [스쿼드 뷰에서 내 캐파 조정 →]. */
  onOpenMyCapacity,
  /** `() => void` — 연결 스쿼드가 없을 때 조직도 스쿼드 탭으로. */
  onOpenSquads,
}) {
  const data = resource?.data || null;
  const closed = !!data?.closed;
  const [draft, setDraft] = useState(() => (data ? toDraft(data.rows) : []));
  const [baseVersion, setBaseVersion] = useState(data?.version ?? null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState(null); // { message, tone }
  const [flagged, setFlagged] = useState([]); // 서버 422 가 짚은 사람
  const [requested, setRequested] = useState({}); // memberId → true (보낸 뒤 · 409)
  const [requesting, setRequesting] = useState(null);
  const [adding, setAdding] = useState(false);
  const timers = useRef([]);

  // 새 판이 오면(저장 뒤 · 다시 불러오기) 고치던 것을 그 판으로 맞춘다 — 그리는 중에 맞춘다(effect 로 미루면 한 번 옛 판이 그려진다).
  if (data && data.version !== baseVersion) {
    setDraft(toDraft(data.rows));
    setBaseVersion(data.version);
    setFlagged([]);
    setRequested({});
  }
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const later = (fn, ms) => { timers.current.push(setTimeout(fn, ms)); };
  const showToast = (message, tone = 'success') => {
    setToast({ message, tone });
    later(() => setToast(null), TOAST_MS);
  };

  const squads = useMemo(() => data?.squads || [], [data]);
  const editableSquadIds = useMemo(
    () => new Set(closed ? [] : squads.filter((s) => s.canEdit).map((s) => s.squadId)),
    [squads, closed],
  );
  const canAssign = editableSquadIds.size > 0;
  const dirty = data ? !sameDraft(draft, toDraft(data.rows)) : false;

  if (!data) {
    if (resource?.error) {
      return (
        <section className="pd-card" data-testid="project-resource-error">
          <div className="pd-hist-fail" role="alert">
            <p className="pd-empty">{L('projectDetail.resource.loadFailed')}</p>
            {onReload && (
              <Button className="sq-btn sq-btn-sm sq-btn-outline" data-testid="project-resource-retry" onClick={onReload}>
                {L('projectDetail.resource.retry')}
              </Button>
            )}
          </div>
        </section>
      );
    }
    return (
      <section className="pd-card" data-testid="project-resource-loading">
        <SkeletonList count={3} height={96} gap={12} />
      </section>
    );
  }

  // 연결 스쿼드가 없으면 후보도 없어 배정할 수 없다 — 탭 전체를 잠근다(§9).
  if (squads.length === 0 && draft.length === 0) {
    return (
      <section className="pd-card" data-testid="project-resource-unlinked">
        <div className="pd-hist-fail">
          <p className="pd-empty">{L('projectDetail.resource.unlinked')}</p>
          {onOpenSquads && (
            <Button className="sq-btn sq-btn-sm sq-btn-outline" data-testid="project-resource-open-squads" onClick={onOpenSquads}>
              {L('projectDetail.resource.openSquads')}
            </Button>
          )}
        </div>
      </section>
    );
  }

  const rowEditable = (r) => !closed && (r.isNew || (r.canEdit && editableSquadIds.has(r.viaSquadId)));
  const counted = draft.filter((r) => !r.resigned);
  const overRows = draft.filter((r) => slackOf(r) < 0);
  const actualMissing = counted.filter((r) => r.actualPct == null).length;
  const unallocated = counted.reduce((sum, r) => sum + Math.max(0, slackOf(r)), 0);

  const patch = (memberId, fn) =>
    setDraft((rows) => rows.map((r) => (r.memberId === memberId ? fn(r) : r)));
  const setPct = (memberId, v) => {
    setSaved(false);
    patch(memberId, (r) => ({ ...r, planPct: clampPct(v) }));
  };
  const setPO = (memberId) => {
    const prev = draft.find((r) => r.role === 'po' && r.memberId !== memberId);
    setDraft((rows) => rows.map((r) => ({ ...r, role: r.memberId === memberId ? 'po' : 'member' })));
    if (prev) showToast(L('projectDetail.resource.poChanged', { name: prev.name }), 'info');
  };
  const remove = (memberId) => setDraft((rows) => rows.filter((r) => r.memberId !== memberId));

  const save = async () => {
    if (saving || overRows.length > 0 || !onSave) return;
    setSaving(true);
    setFlagged([]);
    try {
      await onSave(
        draft.map(({ memberId, viaSquadId, planPct, role }) => ({ memberId, viaSquadId, planPct, role })),
        baseVersion,
      );
      setSaved(true);
      later(() => setSaved(false), SAVED_MS);
    } catch (err) {
      // 입력은 그대로 둔다(§9) — 422 는 어느 줄인지 표시, 충돌은 새 판을 불러온다.
      if (err?.code === 'exceeds_squad_plan' && Array.isArray(err.violations)) {
        setFlagged(err.violations.map((v) => v.memberId));
      }
      if (err?.code === 'project_edit_conflict') {
        showToast(L('projectDetail.resource.conflict'), 'danger');
        onReload?.();
      } else {
        showToast(err?.message || L('projectDetail.resource.saveFailed'), 'danger');
      }
    } finally {
      setSaving(false);
    }
  };

  const request = async (row) => {
    if (!onRequestCapacity || requesting) return;
    setRequesting(row.memberId);
    try {
      await onRequestCapacity(row);
      setRequested((m) => ({ ...m, [row.memberId]: true }));
    } catch (err) {
      if (err?.status === 409) {
        setRequested((m) => ({ ...m, [row.memberId]: true }));
      } else if (err?.status === 403) {
        showToast(L('projectDetail.resource.requestForbidden'), 'danger');
        onReload?.();
      } else {
        showToast(L('projectDetail.resource.requestFailed'), 'danger');
      }
    } finally {
      setRequesting(null);
    }
  };

  // 묶음 — 연결 스쿼드 순서(주 스쿼드가 앞), 그 밖 자격(연결이 끊긴 스쿼드)의 줄은 뒤에.
  const groups = [
    ...squads.map((s) => ({ squadId: s.squadId, name: s.name, isPrimary: s.isPrimary })),
    ...[...new Set(draft.map((r) => r.viaSquadId))]
      .filter((id) => !squads.some((s) => s.squadId === id))
      .map((id) => ({
        squadId: id,
        name: draft.find((r) => r.viaSquadId === id)?.viaSquadName || L('projectDetail.resource.unknownSquad'),
        isPrimary: false,
      })),
  ]
    .map((g) => ({ ...g, rows: draft.filter((r) => r.viaSquadId === g.squadId) }))
    .filter((g) => g.rows.length > 0);

  const candidates = (data.candidates || []).filter((c) => !draft.some((r) => r.memberId === c.memberId));
  const addPicked = (picked) => {
    setDraft((rows) => [
      ...rows,
      ...picked.map(({ candidate, squadId }) => ({
        memberId: candidate.memberId,
        name: candidate.name,
        jobPosition: candidate.jobPosition,
        resigned: false,
        viaSquadId: squadId,
        viaSquadName: squads.find((s) => s.squadId === squadId)?.name || null,
        planPct: 0,
        role: 'member',
        cap: candidate.caps?.[squadId] ?? 0,
        other: candidate.otherPcts?.[squadId] ?? 0,
        actualPct: null,
        canEdit: true,
        capacityRequestable: false,
        capacityRequestedAt: null,
        isNew: true,
      })),
    ]);
    setAdding(false);
  };

  const pctColor = (over) => (over ? 'var(--text-error-primary)' : project.color || 'var(--fg-brand-primary)');

  return (
    <div className="pd-resource" data-testid="project-resource">
      {/* 다시 받는 중 — 앞서 받은 표는 그대로 두고 위에 얇은 막대만(§9 «탭 전환 로딩»). */}
      {resource?.loading && (
        <div className="pd-tab-progress" role="progressbar" aria-label={L('projectDetail.resource.refreshing')} data-testid="project-resource-refreshing" />
      )}
      {/* ── 숫자 4칸 (§4-2 · §5-3) ── */}
      <div className="rsx-stats pd-resource-stats" data-testid="project-resource-stats">
        <RsStatCard tone="brand" label={L('projectDetail.stats.headcount')}
          value={<>{counted.length}<small>{L('projectDetail.stats.peopleUnit')}</small></>} />
        <RsStatCard label={L('projectDetail.stats.planTotal')}
          value={<>{counted.reduce((s, r) => s + r.planPct, 0)}<small>%</small></>} />
        <RsStatCard label={L('projectDetail.stats.actualTotal', { period: data.period })}
          value={<>{counted.reduce((s, r) => s + (r.actualPct ?? 0), 0)}<small>%</small></>}
          sub={actualMissing > 0 ? L('projectDetail.stats.actualMissing', { count: actualMissing }) : null} />
        <RsStatCard tone={overRows.length > 0 ? 'bad' : ''} label={L('projectDetail.resource.overCount')}
          value={<>{overRows.length}<small>{L('projectDetail.stats.peopleUnit')}</small></>} />
      </div>

      {/* ── 초과 띠 — 딥링크 없음(v1.2: 관리자가 도착해도 고칠 수 없다) ── */}
      {overRows.length > 0 && (
        <div className="sq-overload" role="status" data-testid="project-resource-over-banner">
          <span className="sq-overload-title"><WarningIcon size={14} /> {L('projectDetail.resource.overTitle')}</span>
          <span className="sq-overload-body">{L('projectDetail.resource.overBody')}</span>
        </div>
      )}

      {closed && (
        <div className="sq-banner" role="status" data-testid="project-resource-closed">
          <div className="sq-banner-title">{L('projectDetail.resource.closed')}</div>
        </div>
      )}

      {groups.map((g) => (
        <section key={g.squadId} className="pd-resource-group" data-testid={`project-resource-group-${g.squadId}`}>
          <div className="pd-card-head">
            <span className="pd-card-title">{g.name}</span>
            {g.isPrimary && <StatusBadge tone="accent" className="pd-badge">{L('projectDetail.squads.primary')}</StatusBadge>}
            {canAssign && !editableSquadIds.has(g.squadId) && (
              <StatusBadge tone="neutral" className="pd-badge" data-testid={`project-resource-readonly-${g.squadId}`}>
                {L('projectDetail.resource.outOfScope')}
              </StatusBadge>
            )}
          </div>
          <div className="pd-resource-rows">
            {g.rows.map((r) => (
              <ResourceRow
                key={r.memberId} L={L} row={r}
                editable={rowEditable(r)}
                over={slackOf(r) < 0}
                flagged={flagged.includes(r.memberId)}
                mine={r.memberId === meId}
                closed={closed}
                color={pctColor(slackOf(r) < 0)}
                requested={!!(requested[r.memberId] || r.capacityRequestedAt)}
                requesting={requesting === r.memberId}
                onPct={(v) => setPct(r.memberId, v)}
                // 기존 PO 줄을 이 사람이 못 고치면 PO 를 옮길 수 없다 — 그 줄이 팀원으로 바뀌어 저장이 403 이 된다.
                canSetPO={draft.every((x) => x.role !== 'po' || x.memberId === r.memberId || rowEditable(x))}
                onPO={() => setPO(r.memberId)}
                onRemove={() => remove(r.memberId)}
                onRequest={() => request(r)}
                onOpenMyCapacity={onOpenMyCapacity ? () => onOpenMyCapacity(r) : null}
              />
            ))}
          </div>
        </section>
      ))}

      {draft.length === 0 && (
        <section className="pd-card" data-testid="project-resource-empty">
          <p className="pd-empty">{L('projectDetail.resource.empty')}</p>
        </section>
      )}

      {unallocated > 0 && (
        <p className="pd-empty pd-resource-note" data-testid="project-resource-unallocated">
          {L('projectDetail.resource.unallocated', { value: unallocated })}
        </p>
      )}

      {canAssign && (
        <div className="pd-resource-add-row">
          <Button className="sq-btn sq-btn-sm sq-btn-outline" data-testid="project-resource-add" onClick={() => setAdding(true)}>
            <PlusIcon size={12} /> {L('projectDetail.resource.add')}
          </Button>
          {adding && (
            <AddPeopleDialog L={L} candidates={candidates} squads={squads}
              onAdd={addPicked} onClose={() => setAdding(false)} />
          )}
        </div>
      )}

      {canAssign && (
        <div className="pd-form-actions">
          {saved && <span className="pd-resource-saved" role="status" data-testid="project-resource-saved"><CheckIcon size={12} /> {L('projectDetail.resource.saved')}</span>}
          <Button
            variant="primary"
            data-testid="project-resource-save"
            disabled={overRows.length > 0 || saving || !dirty}
            title={overRows.length > 0 ? L('projectDetail.resource.saveBlocked') : undefined}
            pending={saving}
            onClick={save}
          >{L('projectDetail.resource.save')}</Button>
        </div>
      )}

      <p className="pd-empty pd-resource-note" data-testid="project-resource-caption">{L('projectDetail.resource.caption')}</p>

      <Toast message={toast?.message} tone={toast?.tone} data-testid="project-resource-toast" />
    </div>
  );
}

function ResourceRow({
  L, row, editable, over, flagged, mine, closed, color, requested, requesting, canSetPO,
  onPct, onPO, onRemove, onRequest, onOpenMyCapacity,
}) {
  const slack = slackOf(row);
  const gap = row.actualPct == null ? null : row.actualPct - row.planPct;
  const red = over || flagged;
  // 초과 행의 조치 (§5-3 v1.3) — 내 행이면 딥링크, 남의 행은 서버의 요청 권한으로 가른다. 완료 프로젝트는 없음.
  let action = null;
  if (over && !closed) {
    if (mine) {
      if (onOpenMyCapacity) {
        action = (
          <Button className="sq-btn sq-btn-sm sq-btn-outline" data-testid={`project-resource-my-capacity-${row.memberId}`} onClick={onOpenMyCapacity}>
            {L('projectDetail.resource.myCapacity')} <ArrowRightGlyph size={12} />
          </Button>
        );
      }
    } else if (row.capacityRequestable) {
      action = (
        <>
          <Button
            className="sq-btn sq-btn-sm sq-btn-outline"
            data-testid={`project-resource-request-${row.memberId}`}
            disabled={requested || requesting}
            onClick={onRequest}
          >{L(requested ? 'projectDetail.resource.requested' : 'projectDetail.resource.request')}</Button>
          {!requested && <span className="rsx-entry-note">{L('projectDetail.resource.requestReason')}</span>}
        </>
      );
    } else if (editable) {
      action = <span className="rsx-entry-note" data-testid={`project-resource-no-request-${row.memberId}`}>{L('projectDetail.resource.requestNotAllowed')}</span>;
    }
  }
  return (
    <div
      className="rsx-entry pd-resource-row"
      data-testid={`project-resource-row-${row.memberId}`}
      data-over={red ? 'true' : undefined}
    >
      <div className="rsx-entry-main">
        <div className="rsx-entry-head">
          <div className="rsx-entry-title">
            <Avatar name={row.name || '?'} />
            <span className="pd-resource-name">{row.name}</span>
            {row.jobPosition && <span className="rsx-entry-note">{row.jobPosition}</span>}
            {row.resigned && <StatusBadge tone="neutral">{L('projectDetail.history.resigned')}</StatusBadge>}
            {row.role === 'po' && <StatusBadge tone="ai" data-testid={`project-resource-po-${row.memberId}`}>PO</StatusBadge>}
            {red && <StatusBadge tone="danger">{L('projectDetail.resource.overBadge')}</StatusBadge>}
          </div>
          <span className="rsx-entry-pct" style={{ color }}>{row.planPct}%</span>
        </div>
        {editable && (
          <div className="rsx-entry-slider">
            <div className="rsx-slider" style={{ '--rsx-slider-fill': color }}>
              <div className="rsx-slider-track"><i style={{ width: `${row.planPct}%` }} /></div>
              <input
                type="range" min="0" max="100" value={row.planPct}
                aria-label={L('projectDetail.resource.sliderAria', { name: row.name })}
                data-testid={`project-resource-slider-${row.memberId}`}
                onChange={(e) => onPct(e.target.value)}
              />
              <span className="rsx-slider-ball" style={{ left: `${row.planPct}%` }} />
            </div>
            <div className="rsx-entry-input">
              <input
                type="number" min="0" max="100" value={row.planPct}
                aria-label={L('projectDetail.resource.inputAria', { name: row.name })}
                data-testid={`project-resource-input-${row.memberId}`}
                onChange={(e) => onPct(e.target.value)}
              />
              <span>%</span>
            </div>
          </div>
        )}
        <div className="pd-resource-bar">
          <RsStackBar segments={[
            { pct: Math.min(100, row.other), color: 'var(--bg-quaternary)', label: L('projectDetail.resource.otherSeg', { value: row.other }) },
            { pct: Math.max(0, Math.min(100 - Math.min(100, row.other), row.planPct)), color, label: L('projectDetail.resource.mineSeg', { value: row.planPct }) },
          ]} />
        </div>
        <p className={`rsx-entry-note${red ? ' pd-resource-over' : ''}`} data-testid={`project-resource-caption-${row.memberId}`}>
          {L('projectDetail.resource.capLine', { cap: row.cap, other: row.other, mine: row.planPct })}
          {'  ·  '}
          {slack < 0
            ? L('projectDetail.resource.overBy', { value: -slack })
            : L('projectDetail.resource.slack', { value: slack })}
          {'  ·  '}
          {gap === null
            ? L('projectDetail.resource.actualMissing')
            : L('projectDetail.resource.actual', { value: row.actualPct, gap: `${gap >= 0 ? '+' : ''}${gap}` })}
        </p>
        {/* [PO 지정]은 행 아래 조치 줄에 — 오른쪽 열은 ✕ 하나라 큰 %의 오른쪽 끝이 행마다 같다(내 리소스 입력 행과 같은 열). */}
        {(action || (editable && row.role !== 'po' && canSetPO)) && (
          <div className="pd-resource-actions">
            {editable && row.role !== 'po' && canSetPO && (
              <Button className="sq-btn sq-btn-sm sq-btn-outline" data-testid={`project-resource-set-po-${row.memberId}`} onClick={onPO}>
                {L('projectDetail.resource.setPo')}
              </Button>
            )}
            {action}
          </div>
        )}
      </div>
      {editable && (
        <button
          type="button" className="rsx-close-btn"
          aria-label={L('projectDetail.resource.removeAria', { name: row.name })}
          data-testid={`project-resource-remove-${row.memberId}`}
          onClick={onRemove}
        ><CloseIcon size={14} /></button>
      )}
    </div>
  );
}

/** 스쿼드 «팀원 추가» 겹창과 같은 틀 — 검색 · 체크 여럿 · [선택 n명 추가]. 자격이 둘 이상이면 고르게 한다(§6-2). */
function AddPeopleDialog({ L, candidates, squads, onAdd, onClose }) {
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState({}); // memberId → squadId | ''
  const q = query.trim().toLowerCase();
  const rows = candidates.filter((c) => q === '' || `${c.name} ${c.jobPosition || ''}`.toLowerCase().includes(q));
  const squadName = (id) => squads.find((s) => s.squadId === id)?.name || '';
  const toggle = (c) => setPicked((p) => {
    const next = { ...p };
    if (c.memberId in next) delete next[c.memberId];
    else next[c.memberId] = c.squadIds.length === 1 ? c.squadIds[0] : '';
    return next;
  });
  const ids = Object.keys(picked);
  const ready = ids.length > 0 && ids.every((id) => picked[id]);
  return (
    <div className="sq-add-cover pd-resource-cover" data-testid="project-resource-add-dialog"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sq-add-dialog" role="group" aria-label={L('projectDetail.resource.add')}
        onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}>
        <p className="sq-add-title">{L('projectDetail.resource.add')}</p>
        <div className="sq-add-body">
          <label className="sq-add-search">
            <SearchIcon size={20} />
            <input autoFocus value={query} aria-label={L('projectDetail.resource.search')}
              placeholder={L('projectDetail.resource.search')} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <div className="sq-add-list" role="listbox" aria-multiselectable="true">
            {rows.map((c) => {
              const on = c.memberId in picked;
              const ambiguous = c.squadIds.length > 1;
              return (
                <div key={c.memberId}>
                  <div
                    className={`sq-add-item${on ? ' is-picked' : ''}`}
                    role="option" aria-selected={on}
                    data-testid={`project-resource-candidate-${c.memberId}`}
                    onClick={() => toggle(c)}
                  >
                    <Avatar name={c.name} />
                    <div className="sq-add-text">
                      <span className="sq-add-name">{c.name}</span>
                      <span className="sq-add-meta">
                        {ambiguous ? L('projectDetail.resource.pickSquad') : squadName(c.squadIds[0])}
                      </span>
                    </div>
                    {on && <span className="sq-add-pick" aria-hidden><CheckIcon size={16} /></span>}
                  </div>
                  {on && ambiguous && (
                    <CustomSelect
                      value={picked[c.memberId]}
                      onChange={(v) => setPicked((p) => ({ ...p, [c.memberId]: v }))}
                      placeholder={L('projectDetail.resource.pickSquad')}
                      ariaLabel={L('projectDetail.resource.pickSquadAria', { name: c.name })}
                      options={c.squadIds.map((id) => ({ value: id, label: squadName(id) }))}
                    />
                  )}
                </div>
              );
            })}
            {rows.length === 0 && (
              <div className="sq-add-none" data-testid="project-resource-no-candidates">{L('projectDetail.resource.noCandidates')}</div>
            )}
          </div>
        </div>
        <div className="sq-add-actions">
          <Button className="sq-btn sq-btn-sm sq-btn-outline" onClick={onClose}>{L('projectDetail.resource.cancel')}</Button>
          <Button
            className="sq-btn sq-btn-sm sq-btn-primary"
            data-testid="project-resource-add-confirm"
            disabled={!ready}
            onClick={() => onAdd(ids.map((id) => ({ candidate: candidates.find((c) => c.memberId === id), squadId: picked[id] })))}
          >{L('projectDetail.resource.addConfirm', { count: ids.length })}</Button>
        </div>
      </div>
    </div>
  );
}
