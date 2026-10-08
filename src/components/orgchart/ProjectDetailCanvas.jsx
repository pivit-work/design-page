/**
 * 프로젝트 원장 상세 — 머리 + 개요(기본 정보 · 연결 스쿼드) (pivit-work PW-1428).
 *
 * 정본 기획: `O. 프로젝트-원장/screen-project-detail.policy.md` §4-0 · §4-1 · §6-1 · §7
 * 디자인 시안: `O. 프로젝트-원장/project-detail.jsx` 의 `ProjectDetail` 머리와 `OverviewTab`.
 *
 * 시안에서 옮기지 않은 것 (이 카드 범위 밖 — 뒤 카드가 붙인다):
 *  - 데모 계정 고르기(기획 데모 전용).
 *  - 개요 | 리소스 | 이력 탭 줄, 리소스·이력 탭.
 *  - 요약 숫자 3칸(참여 인원 · 계획 합계 · 실제 합계).
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
import StatusBadge from '../shared/StatusBadge.jsx';
import useDismissLayer from '../shared/useDismissLayer.js';
import { CloseIcon, EditIcon, EyeIcon, MoreIcon, WarningIcon } from './squadIcons.jsx';
import { OrgLabelsContext, makeOrgLabels, rich } from './orgchart-labels.jsx';
import { projectStatusCode, projectStatusText, projectStatusTone } from './project-constants.js';
import { SQUAD_MENU_Z, SQUAD_MODAL_Z } from './squad-constants.js';

/** 허용 전이 (§6-1). `→ planned` · `planned → done` 은 없다 — 메뉴에 비활성으로도 그리지 않는다. */
const PROJECT_TRANSITIONS = {
  planned: [{ to: 'active', key: 'start' }],
  active: [{ to: 'done', key: 'complete' }],
  done: [{ to: 'active', key: 'reopen' }],
};

const MORE_ANCHOR = '[data-project-detail-anchor="more"]';

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
  /** 연결 스쿼드 행의 「主 지정」·「연결 해제」 (p063). */
  canEditSquad = false,
  /**
   * 삭제를 막는 사유. 문자열이면 ⋯ 메뉴의 「삭제」 가 비활성이고 그 아래에 사유가 보인다.
   * `null` 이면 삭제할 수 있다. 사유 문구는 호스트가 정한다.
   */
  deleteBlockedReason = null,
  /** `(status) => Promise` — 허용 전이만 부른다. */
  onChangeStatus,
  /** `({ name, description, startDate, endDate }) => Promise` — 상태는 보내지 않는다(§5-2). */
  onSave,
  /** `() => Promise` — 이름을 똑같이 친 뒤에만 부른다. 성공 뒤 화면 이동은 호스트가 한다. */
  onDelete,
  /** `(squadId) => Promise` */
  onSetPrimarySquad,
  /** `(squadId) => Promise` — 主 인데 다른 연결이 남으면 서버가 409 → 그 사유를 띄운다. */
  onUnlinkSquad,
  /** `(squadId) => void` — 스쿼드 이름을 눌렀을 때. 없으면 이름은 글자뿐이다. */
  onOpenSquad,
  /** 화면 문구 — `SquadCanvas` 와 같은 계약(`orgchart-labels.jsx`). */
  labels,
}) {
  const L = useMemo(() => makeOrgLabels(labels), [labels]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [draft, setDraft] = useState(null); // 수정 폼 { name, description, startDate, endDate }
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
  const deleteBlocked = deleteBlockedReason != null || !onDelete;
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
              {/* 편집 가능 / 조회 전용 (시안은 탭 줄 오른쪽 — 탭 줄이 아직 없어 제목 줄 오른쪽에 둔다) */}
              <StatusBadge tone={canManage ? 'accent' : 'neutral'} className="pd-badge" data-testid="project-detail-mode">
                {canManage ? <EditIcon size={12} /> : <EyeIcon size={12} />}
                {L(canManage ? 'projectDetail.editable' : 'projectDetail.readOnly')}
              </StatusBadge>
              {canManage && (
                <button
                  type="button"
                  className="pd-more"
                  data-project-detail-anchor="more"
                  data-testid="project-detail-more"
                  aria-label={L('projectDetail.menu')}
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
          </div>

          {actionError && (
            <div className="sq-banner sq-banner-error" role="alert" data-testid="project-detail-action-error">
              <div className="sq-banner-title">{actionError}</div>
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
                <input
                  className="pd-input"
                  value={draft.description}
                  aria-label={L('projectDetail.form.description')}
                  placeholder={L('projectDetail.form.description')}
                  data-testid="project-detail-form-description"
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
                <div className="pd-form-dates">
                  <DateInput
                    className="pd-input pd-date"
                    value={draft.startDate}
                    aria-label={L('projectDetail.form.startDate')}
                    data-testid="project-detail-form-start"
                    onChange={(v) => { setDraft((d) => ({ ...d, startDate: v })); setFormError(''); }}
                  />
                  <span className="pd-subline-muted">~</span>
                  <DateInput
                    className="pd-input pd-date"
                    value={draft.endDate}
                    aria-label={L('projectDetail.form.endDate')}
                    data-testid="project-detail-form-end"
                    onChange={(v) => { setDraft((d) => ({ ...d, endDate: v })); setFormError(''); }}
                  />
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
                {canEditSquad && (
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
