/**
 * 프로젝트 원장 상세 — 머리 + 개요(기본 정보 · 연결 스쿼드) (pivit-work PW-1428).
 *
 * 정본 기획: `O. 프로젝트-원장/screen-project-detail.policy.md` §4-0 · §4-1 · §6-1 · §7
 * 디자인 시안: `O. 프로젝트-원장/project-detail.jsx` 의 `ProjectDetail` 머리와 `OverviewTab`.
 *
 * 시안에서 옮기지 않은 것 (이 카드 범위 밖 — 뒤 카드가 붙인다):
 *  - 데모 계정 고르기(기획 데모 전용).
 *  - 리소스 탭의 내용. 탭은 보이지만 고를 수 없다(사유는 말풍선).
 *
 * 탭 줄과 이력 탭은 PW-1865 에서 붙였다 (§4-0 · §4-3 · §5-4 · 시안 `TABS` · `HistoryTab`).
 * 탭 줄은 시안의 흰 알약 모양 그대로인 공용 `SegmentedControl` 이다. 이력 한 줄은 시안처럼
 * 네모 아이콘 · 한 줄 요약 · 오른쪽 «실행자 · 시각» 이고, 줄 사이 선과 간격은 연결 스쿼드 줄(`pd-squad-row`)을 따른다.
 * 요약 문장·시각 글자는 호스트가 만든다(화면 언어·시간대는 앱이 안다). `onChangeTab` 이 없으면 탭 줄 없이 개요만 그린다.
 *
 * 요약 숫자 3칸(참여 인원 · 계획 합계 · 실제 합계)과 수정 폼의 색상·진행률은 PW-1435 에서 붙였다.
 * 숫자 칸은 내 리소스의 숫자 칸(`RsStatCard`)을 그대로 쓴다 — 같은 «퍼센트 배분» 도메인이다(§1 레이아웃).
 * 색상은 스쿼드 폼의 색 고르기(`sq-swatch`), 진행률은 공용 슬라이더(`rsx-slider`)다. 시안 폼에는 두 칸이
 * 없고 정책서 §5-2 「이름·설명·기간·색상·진행률」에만 있어 기존 부품으로 채웠다.
 *
 * 시안과 다른 점:
 *  1. 데이터를 고치지 않는다 — 저장·상태 전환·삭제·主 지정·연결 해제는 모두 `on*` 콜백(Promise).
 *     거절되면 `error.message` 를 그 자리(폼·창·머리 아래 띠)에 띄운다.
 *  2. ⋯ 메뉴의 「상태 전환」 은 허용 전이만 메뉴 안에 바로 나열한다(§6-1 · 시안은 항목 하나).
 *  3. 비활성 메뉴 항목의 사유를 말풍선(title)만이 아니라 항목 아래 작은 글씨로도 쓴다 —
 *     휴대폰에서는 title 이 안 뜬다.
 *  4. ■ ✎ 👁 ⚠ ✕ 글리프 대신 색 네모 · 인라인 SVG. `主` 는 한자 글자라 그대로 둔다.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import AnchoredLayer from '../shared/AnchoredLayer.jsx';
import Button from '../shared/Button.jsx';
import ConfirmModal from '../shared/ConfirmModal.jsx';
import DateInput from '../shared/DateInput.jsx';
import SegmentedControl from '../shared/SegmentedControl.jsx';
import { SkeletonList } from '../shared/Skeleton.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import Tooltip from '../shared/Tooltip.jsx';
import {
  ArrowRightGlyph,
  CloseGlyph,
  PencilGlyph,
  PlusGlyph,
  UserGlyph,
  UsersGlyph,
} from '../shared/lineIcons.jsx';
import useDismissLayer from '../shared/useDismissLayer.js';
import { CloseIcon, EditIcon, EyeIcon, LeadStarIcon, MoreIcon, WarningIcon } from './squadIcons.jsx';
import { OrgLabelsContext, makeOrgLabels, rich } from './orgchart-labels.jsx';
import { projectStatusCode, projectStatusText, projectStatusTone } from './project-constants.js';
import { SQUAD_MENU_Z, SQUAD_MODAL_Z, SQUAD_PALETTE } from './squad-constants.js';
import { RsStatCard } from '../okr/OkrResourcePieces.jsx';

/** 허용 전이 (§6-1). `→ planned` · `planned → done` 은 없다 — 메뉴에 비활성으로도 그리지 않는다. */
const PROJECT_TRANSITIONS = {
  planned: [{ to: 'active', key: 'start' }],
  active: [{ to: 'done', key: 'complete' }],
  done: [{ to: 'active', key: 'reopen' }],
};

const MORE_ANCHOR = '[data-project-detail-anchor="more"]';

/** 이력 사건 → 아이콘 (시안 `EVENT_ICON` 의 글리프를 선 아이콘으로). 모르는 사건은 연필. */
const HISTORY_ICON = {
  created: PlusGlyph,
  field_updated: PencilGlyph,
  status_changed: ArrowRightGlyph,
  squad_linked: UsersGlyph,
  squad_unlinked: CloseGlyph,
  primary_changed: LeadStarIcon,
  assignment_added: UserGlyph,
  assignment_updated: PencilGlyph,
  assignment_removed: CloseGlyph,
};

/** 탭 (§1 `?tab=overview|resource|history`). 리소스는 내용이 아직 없어 고를 수 없다. */
const TAB_KEYS = ['overview', 'resource', 'history'];

const clampProgress = (v) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));

function messageOf(err, fallback) {
  return (err && typeof err.message === 'string' && err.message) || fallback;
}

/** 머리 둘째 줄의 연결 스쿼드 — 主 를 맨 앞에 `(主)` 로 (§4-0). */
function squadLine(L, squads) {
  return [...squads]
    .sort((a, b) => Number(!!b.isPrimary) - Number(!!a.isPrimary))
    .map((s) => (s.isPrimary ? L('projectDetail.primarySuffix', { name: s.name }) : s.name))
    .join(' · ');
}

export default function ProjectDetailCanvas({
  /** `{ id, name, description, color, status, progress, startDate, endDate, squads: [{ squadId, name, isPrimary }] }` */
  project,
  /** 어드민(p062) — ⋯ 메뉴 · 기본 정보 「수정」. 머리 오른쪽 딱지도 이 값으로 갈린다. */
  canManage = false,
  /**
   * 연결 스쿼드 행의 「主 지정」·「연결 해제」 (p063) — 모든 줄에. 줄마다 가르려면 `project.squads[].canLink`
   * 를 준다(그 스쿼드 리드·매니저 · PW-1435). 둘 중 하나라도 참이면 그 줄에 버튼이 보인다.
   */
  canEditSquad = false,
  /**
   * 개요 숫자 3칸 `{ headcount, planTotal, actualTotal, actualMissing, period }` (§4-1). 없으면 칸을 그리지 않는다.
   * `period` 는 실제 합계가 본 달(`YYYY-MM`) — 라벨에 그대로 붙는다.
   */
  stats = null,
  /** 색 고르기 후보 — 없으면 스쿼드 색과 같은 팔레트. 지금 색이 후보에 없으면 맨 앞에 더해 보인다. */
  palette = SQUAD_PALETTE,
  /**
   * 삭제를 막는 사유. 문자열이면 ⋯ 메뉴의 「삭제」 가 비활성이고 그 아래에 사유가 보인다.
   * `null` 이면 삭제할 수 있다. 사유 문구는 호스트가 정한다.
   */
  deleteBlockedReason = null,
  /** `(status) => Promise` — 허용 전이만 부른다. */
  onChangeStatus,
  /** `({ name, description, startDate, endDate, color, progress }) => Promise` — 상태는 보내지 않는다(§5-2). */
  onSave,
  /** `() => Promise` — 이름을 똑같이 친 뒤에만 부른다. 성공 뒤 화면 이동은 호스트가 한다. */
  onDelete,
  /** `(squadId) => Promise` */
  onSetPrimarySquad,
  /** `(squadId) => Promise` — 主 인데 다른 연결이 남으면 서버가 409 → 그 사유를 띄운다. */
  onUnlinkSquad,
  /** `(squadId) => void` — 스쿼드 이름을 눌렀을 때. 없으면 이름은 글자뿐이다. */
  onOpenSquad,
  /** 지금 탭 — `'overview' | 'history'`. 고를 수 없는 탭(리소스)이 오면 개요를 그린다. */
  tab = 'overview',
  /** `(tab) => void` — 탭을 눌렀을 때. 없으면 탭 줄을 그리지 않는다. */
  onChangeTab,
  /**
   * 이력 탭 `{ items, loading, error, hasMore, loadingMore }` (§4-3 · §5-4 · §9).
   * `items[]` = `{ id, eventType, summary, actor, actorResigned, at, atTitle }` — `summary`·`at`(상대 시각)·
   * `atTitle`(절대 시각, 올리면 뜬다)은 호스트가 만든 글자다. `error` 가 참이면 빈 목록이 아니라 «불러오지 못했습니다».
   */
  history = null,
  /** `() => void` — 「더 보기」 (20건씩). */
  onLoadMoreHistory,
  /** `() => void` — 불러오기 실패 뒤 「다시 시도」. */
  onRetryHistory,
  /** 화면 문구 — `SquadCanvas` 와 같은 계약(`orgchart-labels.jsx`). */
  labels,
}) {
  const L = useMemo(() => makeOrgLabels(labels), [labels]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [draft, setDraft] = useState(null); // 수정 폼 { name, description, startDate, endDate, color, progress }
  const [formError, setFormError] = useState('');
  const [delAsk, setDelAsk] = useState(null); // { typed, busy, error }
  const [actionError, setActionError] = useState('');
  const menuRef = useRef(null);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useDismissLayer(closeMenu, menuRef, MORE_ANCHOR, menuOpen);

  if (!project) return null;

  const status = projectStatusCode(project.status);
  const closed = status === 'done';
  const squads = project.squads || [];
  const transitions = onChangeStatus ? PROJECT_TRANSITIONS[status] : [];
  const canEdit = canManage && !!onSave && !closed;
  const canEditSquadRow = (s) => canEditSquad || s.canLink === true;
  // 머리의 「편집 가능」 — 이 화면에서 고칠 수 있는 것이 하나라도 있으면(원장 또는 스쿼드 줄).
  const editable = canManage || squads.some(canEditSquadRow);
  // 지금 색이 팔레트 밖이면 맨 앞에 남긴다 — 다른 색을 눌렀다가도 원래 색으로 돌아올 수 있게.
  const colorChoices = project.color && !palette.includes(project.color)
    ? [project.color, ...palette]
    : palette;
  const deleteBlocked = deleteBlockedReason != null || !onDelete;
  const showTabs = typeof onChangeTab === 'function';
  const activeTab = showTabs && tab === 'history' ? 'history' : 'overview';
  // 머리의 딱지는 탭마다 — 이력은 누구에게나 조회 전용이다(§5-1 「탭별 편집 권한에 따라 전환」).
  const modeEditable = activeTab === 'overview' && editable;
  const tabItems = TAB_KEYS.map((key) => ({
    value: key,
    label: L(`projectDetail.tabs.${key}`),
    testId: `project-detail-tab-${key}`,
    ...(key === 'resource' ? { disabled: true, title: L('projectDetail.tabs.resourcePending') } : {}),
  }));
  const modeBadge = (
    <StatusBadge tone={modeEditable ? 'accent' : 'neutral'} className="pd-badge" data-testid="project-detail-mode">
      {modeEditable ? <EditIcon size={12} /> : <EyeIcon size={12} />}
      {L(modeEditable ? 'projectDetail.editable' : 'projectDetail.readOnly')}
    </StatusBadge>
  );
  const period = `${project.startDate || L('projectDetail.undecided')} ~ ${project.endDate || L('projectDetail.undecided')}`;

  /** 콜백을 부르고 실패하면 머리 아래 띠에 사유를 쓴다 (상태 전환 · 主 지정 · 연결 해제). */
  const run = async (fn, fallbackKey) => {
    setActionError('');
    try {
      await fn();
    } catch (err) {
      setActionError(messageOf(err, L(fallbackKey)));
    }
  };

  const openEdit = () => {
    setMenuOpen(false);
    setFormError('');
    setDraft({
      name: project.name || '',
      description: project.description || '',
      startDate: project.startDate || '',
      endDate: project.endDate || '',
      color: project.color || palette[0],
      progress: clampProgress(project.progress),
    });
  };

  const save = async () => {
    const name = draft.name.trim();
    if (!name) { setFormError(L('projectDetail.form.errNameRequired')); return; }
    if (draft.endDate && draft.startDate && draft.endDate < draft.startDate) {
      setFormError(L('projectDetail.form.errEndBeforeStart'));
      return;
    }
    setFormError('');
    try {
      await onSave({
        name,
        description: draft.description.trim(),
        startDate: draft.startDate || null,
        endDate: draft.endDate || null,
        color: draft.color,
        progress: clampProgress(draft.progress),
      });
      setDraft(null);
    } catch (err) {
      setFormError(messageOf(err, L('projectDetail.form.saveFailed')));
    }
  };

  const confirmDelete = async () => {
    if (!delAsk || delAsk.busy || delAsk.typed !== project.name) return;
    setDelAsk((d) => ({ ...d, busy: true, error: '' }));
    try {
      await onDelete();
      setDelAsk(null);
    } catch (err) {
      setDelAsk((d) => (d ? { ...d, busy: false, error: messageOf(err, L('projectDetail.del.failed')) } : d));
    }
  };

  const changeStatus = (to) => {
    setMenuOpen(false);
    return run(() => onChangeStatus(to), 'projectDetail.actionFailed');
  };

  return (
    <OrgLabelsContext.Provider value={L}>
    <div className="content-area pj-content-area" data-testid="project-detail-canvas">
      <div className="content-canvas">
        <div className="pd-page">
          {/* ── 머리 (§4-0) ── */}
          <div className="pd-head">
            <div className="pd-title-row">
              <span className="pd-color" style={{ color: project.color || 'var(--fg-brand-primary)' }} aria-hidden>
                <span className="pd-color-fill" />
              </span>
              <h1 className="pd-name">{project.name}</h1>
              <StatusBadge tone={projectStatusTone(status)} className="pd-badge" data-testid="project-detail-status">
                {projectStatusText(L, status)}
              </StatusBadge>
              <span className="pd-spacer" />
              {/* 편집 가능 / 조회 전용 — 시안대로 탭 줄 오른쪽. 탭 줄이 없으면 제목 줄 오른쪽에 둔다 */}
              {!showTabs && modeBadge}
              {canManage && (
                <button
                  type="button"
                  className="pd-more"
                  data-project-detail-anchor="more"
                  data-testid="project-detail-more"
                  aria-label={L('projectDetail.menuLabel')}
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((v) => !v)}
                ><MoreIcon size={16} /></button>
              )}
              {canManage && menuOpen && (
                <AnchoredLayer
                  anchorSelector={MORE_ANCHOR}
                  align="right"
                  panelRef={menuRef}
                  className="sq-menu pd-menu"
                  style={{ zIndex: SQUAD_MENU_Z }}
                  data-testid="project-detail-menu"
                >
                  <button
                    type="button"
                    className={`pd-menu-item${canEdit ? '' : ' is-disabled'}`}
                    data-testid="project-detail-menu-edit"
                    disabled={!canEdit}
                    onClick={openEdit}
                  >
                    {L('projectDetail.menu.edit')}
                    {closed && <span className="pd-menu-hint">{L('projectDetail.menu.editDoneHint')}</span>}
                  </button>
                  {transitions.length > 0 && (
                    <div className="pd-menu-group">{L('projectDetail.menu.status')}</div>
                  )}
                  {transitions.map((t) => (
                    <button
                      key={t.to}
                      type="button"
                      className="pd-menu-item is-sub"
                      data-testid={`project-detail-transition-${t.to}`}
                      onClick={() => changeStatus(t.to)}
                    >
                      {L(`projectDetail.transition.${t.key}`)}{' '}
                      <span className="sq-menu-item-to">→ {projectStatusText(L, t.to)}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`pd-menu-item is-danger${deleteBlocked ? ' is-disabled' : ''}`}
                    data-testid="project-detail-menu-delete"
                    disabled={deleteBlocked}
                    onClick={() => { setMenuOpen(false); setDelAsk({ typed: '', busy: false, error: '' }); }}
                  >
                    {L('projectDetail.menu.delete')}
                    {deleteBlockedReason != null && (
                      <span className="pd-menu-hint" data-testid="project-detail-delete-reason">{deleteBlockedReason}</span>
                    )}
                  </button>
                </AnchoredLayer>
              )}
            </div>

            <div className="pd-subline" data-testid="project-detail-subline">
              {squads.length === 0 ? (
                <span className="pd-unassigned"><WarningIcon size={12} /> {L('projectDetail.unassigned')}</span>
              ) : (
                <span>{squadLine(L, squads)}</span>
              )}
              <span className="pd-subline-muted">
                {' · '}{period}{' · '}{L('projectDetail.progress', { value: project.progress || 0 })}
              </span>
            </div>

            {showTabs && (
              <div className="pd-tabs-row">
                <SegmentedControl
                  items={tabItems}
                  value={activeTab}
                  onChange={(next) => { if (next !== activeTab) onChangeTab(next); }}
                  ariaLabel={L('projectDetail.tabs.label')}
                />
                <span className="pd-spacer" />
                {modeBadge}
              </div>
            )}
          </div>

          {actionError && (
            <div className="sq-banner sq-banner-error" role="alert" data-testid="project-detail-action-error">
              <div className="sq-banner-title">{actionError}</div>
            </div>
          )}

          {activeTab === 'overview' && (<>
          {/* ── 요약 숫자 3칸 (§4-1 · §5-2) — 실제 합계는 당월, 안 적은 사람은 0 이 아니라 «미입력» 으로 센다(§10) ── */}
          {stats && (
            <div className="pd-stats" data-testid="project-detail-stats">
              <RsStatCard
                tone="brand"
                label={L('projectDetail.stats.headcount')}
                value={<>{stats.headcount}<small>{L('projectDetail.stats.peopleUnit')}</small></>}
              />
              <RsStatCard
                label={L('projectDetail.stats.planTotal')}
                value={<>{stats.planTotal}<small>%</small></>}
              />
              <RsStatCard
                label={L('projectDetail.stats.actualTotal', { period: stats.period })}
                value={<>{stats.actualTotal}<small>%</small></>}
                sub={stats.actualMissing > 0
                  ? L('projectDetail.stats.actualMissing', { count: stats.actualMissing })
                  : null}
              />
            </div>
          )}

          {/* ── 기본 정보 (§4-1) ── */}
          <section className="pd-card" data-testid="project-detail-info">
            <div className="pd-card-head">
              <span className="pd-card-title">{L('projectDetail.info.title')}</span>
              {canEdit && !draft && (
                <button type="button" className="sq-btn sq-btn-sm sq-btn-outline pd-card-action" data-testid="project-detail-edit" onClick={openEdit}>
                  <EditIcon size={12} /> {L('projectDetail.info.edit')}
                </button>
              )}
            </div>

            {!draft ? (
              <dl className="pd-info">
                <dt>{L('projectDetail.info.description')}</dt>
                <dd className={project.description ? '' : 'is-empty'}>
                  {project.description || L('projectDetail.info.noDescription')}
                </dd>
                <dt>{L('projectDetail.info.period')}</dt>
                <dd className="pd-mono">{period}</dd>
                <dt>{L('projectDetail.info.progress')}</dt>
                <dd className="pd-mono">{project.progress || 0}%</dd>
              </dl>
            ) : (
              <div className="pd-form" data-testid="project-detail-form">
                {/* 칸마다 이름표를 위에 단다 — 안내 글자는 입력하면 사라져 무슨 칸인지 잊는다.
                    이름표·간격·입력칸은 스쿼드 폼과 같은 1on1 「일정 추가」 창 값 (PW-1900) */}
                <div className="sq-form-field">
                  <div className="sq-field-label">{L('projectDetail.form.name')}</div>
                  <input
                    autoFocus
                    className="pd-input"
                    value={draft.name}
                    maxLength={50}
                    aria-label={L('projectDetail.form.name')}
                    placeholder={L('projectDetail.form.name')}
                    data-testid="project-detail-form-name"
                    onChange={(e) => { setDraft({ ...draft, name: e.target.value }); setFormError(''); }}
                  />
                </div>
                <div className="sq-form-field">
                  <div className="sq-field-label">{L('projectDetail.form.description')}</div>
                  <input
                    className="pd-input"
                    value={draft.description}
                    aria-label={L('projectDetail.form.description')}
                    placeholder={L('projectDetail.form.description')}
                    data-testid="project-detail-form-description"
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  />
                </div>
                <div className="sq-field-row">
                  <div className="sq-form-field">
                    <div className="sq-field-label">{L('projectDetail.form.startDate')}</div>
                    <DateInput
                      className="pd-input pd-date"
                      value={draft.startDate}
                      aria-label={L('projectDetail.form.startDate')}
                      data-testid="project-detail-form-start"
                      onChange={(v) => { setDraft((d) => ({ ...d, startDate: v })); setFormError(''); }}
                    />
                  </div>
                  <div className="sq-form-field">
                    <div className="sq-field-label">{L('projectDetail.form.endDate')}</div>
                    <DateInput
                      className="pd-input pd-date"
                      value={draft.endDate}
                      aria-label={L('projectDetail.form.endDate')}
                      data-testid="project-detail-form-end"
                      onChange={(v) => { setDraft((d) => ({ ...d, endDate: v })); setFormError(''); }}
                    />
                  </div>
                </div>
                <div className="sq-form-field">
                  <div className="sq-field-label">{L('projectDetail.form.color')}</div>
                  <div className="sq-swatches pd-swatches" role="radiogroup" aria-label={L('projectDetail.form.color')}>
                    {colorChoices.map((c) => (
                      <button
                        key={c}
                        type="button"
                        role="radio"
                        aria-checked={draft.color === c}
                        aria-label={c}
                        title={c}
                        data-testid={`project-detail-form-color-${c}`}
                        className={`sq-swatch${draft.color === c ? ' is-picked' : ''}`}
                        style={{ background: c }}
                        onClick={() => setDraft((d) => ({ ...d, color: c }))}
                      />
                    ))}
                  </div>
                </div>
                <div className="sq-form-field">
                  <div className="sq-field-label">{L('projectDetail.form.progress')}</div>
                  <div className="pd-form-progress">
                    <div className="rsx-slider" style={{ '--rsx-slider-fill': draft.color }}>
                      <div className="rsx-slider-track"><i style={{ width: `${draft.progress}%` }} /></div>
                      <input
                        type="range" min={0} max={100} step={5} value={draft.progress}
                        aria-label={L('projectDetail.form.progress')}
                        data-testid="project-detail-form-progress"
                        onChange={(e) => setDraft((d) => ({ ...d, progress: clampProgress(e.target.value) }))}
                      />
                      <span className="rsx-slider-ball" style={{ left: `${draft.progress}%` }} />
                    </div>
                    <div className="rsx-entry-input">
                      <input
                        type="number" min={0} max={100} value={draft.progress}
                        aria-label={L('projectDetail.form.progressDirect')}
                        data-testid="project-detail-form-progress-input"
                        onChange={(e) => setDraft((d) => ({ ...d, progress: clampProgress(e.target.value) }))}
                      />
                      <span>%</span>
                    </div>
                  </div>
                </div>
                {/* 상태는 이 폼에 없다 — 전이 규칙 우회 차단 (§5-2 · §6-1) */}
                {formError && (
                  <div className="sq-proj-error" role="alert" data-testid="project-detail-form-error">{formError}</div>
                )}
                <div className="pd-form-actions">
                  <button type="button" className="sq-btn sq-btn-sm sq-btn-outline" onClick={() => { setDraft(null); setFormError(''); }}>
                    {L('projectDetail.form.cancel')}
                  </button>
                  <Button className="sq-btn sq-btn-sm sq-btn-primary" data-testid="project-detail-form-save" onClick={save}>
                    {L('projectDetail.form.save')}
                  </Button>
                </div>
              </div>
            )}
          </section>

          {/* ── 연결 스쿼드 (§4-1) ── */}
          <section className="pd-card" data-testid="project-detail-squads">
            <div className="pd-card-head">
              <span className="pd-card-title">{L('projectDetail.squads.title')}</span>
            </div>
            {squads.map((s) => (
              <div key={s.squadId} className="pd-squad-row" data-testid={`project-detail-squad-${s.squadId}`}>
                {onOpenSquad ? (
                  <button type="button" className="pd-squad-name is-link" onClick={() => onOpenSquad(s.squadId)}>{s.name}</button>
                ) : (
                  <span className="pd-squad-name">{s.name}</span>
                )}
                {s.isPrimary && (
                  <StatusBadge tone="accent" className="pd-badge">{L('projectDetail.squads.primary')}</StatusBadge>
                )}
                {canEditSquadRow(s) && (
                  <span className="pd-squad-actions">
                    {!s.isPrimary && onSetPrimarySquad && (
                      <Button
                        className="sq-btn sq-btn-sm sq-btn-outline"
                        data-testid={`project-detail-set-primary-${s.squadId}`}
                        onClick={() => run(() => onSetPrimarySquad(s.squadId), 'projectDetail.actionFailed')}
                      >{L('projectDetail.squads.setPrimary')}</Button>
                    )}
                    {onUnlinkSquad && (
                      <Button
                        className="sq-btn sq-btn-sm sq-btn-outline"
                        data-testid={`project-detail-unlink-${s.squadId}`}
                        title={s.isPrimary ? L('projectDetail.squads.unlinkPrimaryHint') : undefined}
                        onClick={() => run(() => onUnlinkSquad(s.squadId), 'projectDetail.actionFailed')}
                      ><CloseIcon size={11} /> {L('projectDetail.squads.unlink')}</Button>
                    )}
                  </span>
                )}
              </div>
            ))}
            {squads.length === 0 && (
              <p className="pd-empty">{L('projectDetail.squads.empty')}</p>
            )}
          </section>
          </>)}

          {activeTab === 'history' && (
            <HistoryTab L={L} history={history} onLoadMore={onLoadMoreHistory} onRetry={onRetryHistory} />
          )}
        </div>
      </div>

      {/* 삭제 확인 — 공용 확인 창(막을 document.body 로 포털, PW-533). 이름을 똑같이 쳐야 열린다. */}
      {delAsk && (
        <ConfirmModal
          title={L('projectDetail.del.title')}
          body={(
            <>
              <p className="sq-modal-desc">{L('projectDetail.del.desc')}</p>
              <p className="sq-modal-note">{rich(L('projectDetail.del.note', { name: project.name }))}</p>
              <input
                autoFocus
                className="sq-modal-input"
                value={delAsk.typed}
                aria-label={L('projectDetail.del.input')}
                placeholder={project.name}
                data-testid="project-detail-delete-input"
                onChange={(e) => setDelAsk((d) => ({ ...d, typed: e.target.value, error: '' }))}
              />
              {delAsk.error && (
                <div className="sq-proj-error" role="alert" data-testid="project-detail-delete-error">{delAsk.error}</div>
              )}
            </>
          )}
          danger
          busy={delAsk.busy}
          confirmDisabled={delAsk.typed !== project.name}
          confirmLabel={L('projectDetail.del.confirm')}
          cancelLabel={L('projectDetail.del.cancel')}
          onConfirm={confirmDelete}
          onCancel={() => { if (!delAsk.busy) setDelAsk(null); }}
          zIndex={SQUAD_MODAL_Z}
          testId="project-detail-delete-modal"
          cancelTestId="project-detail-delete-cancel"
          confirmTestId="project-detail-delete-confirm"
        />
      )}
    </div>
    </OrgLabelsContext.Provider>
  );
}

/** 이력 탭 (§4-3 · §5-4 · §9) — 최신순 한 줄씩, 20건 넘으면 「더 보기」. 실패는 빈 목록이 아니라 다시 시도. */
function HistoryTab({ L, history, onLoadMore, onRetry }) {
  const h = history || {};
  const items = h.items || [];
  let body;
  if (h.loading && items.length === 0) {
    body = <SkeletonList count={3} height={26} gap={20} data-testid="project-detail-history-loading" />;
  } else if (h.error && items.length === 0) {
    body = (
      <div className="pd-hist-fail" role="alert" data-testid="project-detail-history-error">
        <p className="pd-empty">{L('projectDetail.history.loadFailed')}</p>
        {onRetry && (
          <Button className="sq-btn sq-btn-sm sq-btn-outline" data-testid="project-detail-history-retry" onClick={onRetry}>
            {L('projectDetail.history.retry')}
          </Button>
        )}
      </div>
    );
  } else if (items.length === 0) {
    body = <p className="pd-empty" data-testid="project-detail-history-empty">{L('projectDetail.history.empty')}</p>;
  } else {
    body = items.map((item) => {
      const Glyph = HISTORY_ICON[item.eventType] || PencilGlyph;
      return (
        <div key={item.id} className="pd-hist-row" data-testid="project-detail-history-row">
          <span className="pd-hist-icon"><Glyph size={13} /></span>
          <span className="pd-hist-text">{item.summary}</span>
          <Tooltip content={item.atTitle}>
            <span className="pd-hist-meta">
              {item.actor}
              {item.actorResigned && <span className="pd-hist-resigned"> {L('projectDetail.history.resigned')}</span>}
              {item.actor ? ' · ' : ''}{item.at}
            </span>
          </Tooltip>
        </div>
      );
    });
  }
  return (
    <section className="pd-card" data-testid="project-detail-history">
      {body}
      {items.length > 0 && h.error && (
        <div className="pd-hist-more">
          <span className="pd-empty">{L('projectDetail.history.loadFailed')}</span>
          {onRetry && (
            <Button className="sq-btn sq-btn-sm sq-btn-outline" data-testid="project-detail-history-retry" onClick={onRetry}>
              {L('projectDetail.history.retry')}
            </Button>
          )}
        </div>
      )}
      {items.length > 0 && !h.error && h.hasMore && onLoadMore && (
        <div className="pd-hist-more">
          <Button
            className="sq-btn sq-btn-sm sq-btn-outline"
            data-testid="project-detail-history-more"
            disabled={!!h.loadingMore}
            onClick={onLoadMore}
          >{L('projectDetail.history.more')}</Button>
        </div>
      )}
    </section>
  );
}
