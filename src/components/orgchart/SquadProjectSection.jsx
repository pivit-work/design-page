/**
 * 스쿼드 카드의 「담당 프로젝트」 칸 (pivit-work PW-1428).
 *
 * 정본 기획: `screen-org-chart-squad.policy.md` §4 카드 구조 · 요소 표 · §7 인터랙션
 * 디자인 시안: `조직도-renewal-with-public-card/org-chart-app.jsx` SquadView 의 담당 프로젝트 칸과
 * 「주 스쿼드 이전」 모달.
 *
 * 시안과 다른 점:
 *  1. 데이터를 고치지 않는다 — 연결·主 지정·해제·생성은 모두 `on*` 콜백(Promise)으로 올린다.
 *     콜백이 없으면 그 버튼을 그리지 않는다(SquadCanvas 와 같은 규칙).
 *  2. ☐/☑ ✕ 🔒 글리프 대신 공용 체크박스·인라인 SVG. `主` 는 한자 **글자**라 그대로 둔다.
 *  3. 새 프로젝트 폼에 「한 줄 설명(선택)」 칸을 더했다 — 정책 요소 표(「프로젝트명 필수 · 한 줄 설명 선택」).
 *  4. 주 스쿼드 이전 모달은 시안의 「스쿼드마다 버튼」 대신 정책 문구대로 «남은 스쿼드 고르기 +
 *     [지정 후 해제]» 로 그린다. 하는 일(새 主 지정 → 이 스쿼드 연결 해제)은 같다.
 */

import { useState } from 'react';
import Button from '../shared/Button.jsx';
import ConfirmModal from '../shared/ConfirmModal.jsx';
import Radio from '../shared/Radio.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import Tooltip from '../shared/Tooltip.jsx';
import { CheckIcon, CloseIcon, FileIcon, LockIcon, PlusIcon, SearchIcon } from './squadIcons.jsx';
import { useOrgLabels, rich } from './orgchart-labels.jsx';
import { SQUAD_MODAL_Z } from './squad-constants.js';
import { projectStatusText, projectStatusTone } from './project-constants.js';


/** 실패 사유를 사람이 읽을 문구로. Error 가 아니면 호출부가 준 기본 문구. */
function messageOf(err, fallback) {
  return (err && typeof err.message === 'string' && err.message) || fallback;
}

/**
 * 「+ 프로젝트 추가」 를 눌렀을 때 카드 안에 펼쳐지는 멀티셀렉트 (§7 · p063).
 * 열릴 때마다 새로 마운트돼 검색어·선택·새 프로젝트 폼이 비워진다(시안 `closeProjDropdown`).
 */
function ProjectPicker({
  squad, candidates, linkCountOf,
  onLink, onClose,
}) {
  const L = useOrgLabels();
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState([]);
  const [linkError, setLinkError] = useState('');

  const q = query.trim().toLowerCase();
  const rows = candidates.filter((p) => q === '' || `${p.name} ${p.description || ''}`.toLowerCase().includes(q));
  const toggle = (id) => setPicked((ps) => (ps.includes(id) ? ps.filter((x) => x !== id) : [...ps, id]));

  const commitLink = async () => {
    if (picked.length === 0) return;
    setLinkError('');
    try {
      await onLink(picked);
      onClose();
    } catch (err) {
      setLinkError(messageOf(err, L('squad.project.linkFailed')));
    }
  };

  /* 팀원 추가 겹창(17765:40299)과 같은 틀 — 카드를 흐린 흰 막으로 덮고 가운데에 제목 · 검색 · 후보 목록 ·
     취소/연결. 고른 줄은 오른쪽 브랜드 체크, 올린 줄은 회색 바탕. 모양 규칙은 `.sq-add-*`(org_squad.css)를
     그대로 쓴다 — 사람 대신 문서 아이콘(32 원)이 선다. */
  return (
    <div
      className="sq-add-cover" data-testid={`squad-project-picker-${squad.id}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
    <div
      className="sq-add-dialog" role="group" aria-label={L('squad.project.add')}
      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}
    >
      <p className="sq-add-title">{L('squad.project.add')}</p>
      <div className="sq-add-body">
      <label className="sq-add-search">
        <SearchIcon size={20} />
        <input
          autoFocus value={query}
          aria-label={L('squad.project.search')}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={L('squad.project.search')}
        />
      </label>
      <div className="sq-add-list" role="listbox" aria-multiselectable="true">
        {rows.map((p) => {
          const on = picked.includes(p.id);
          const linkCount = linkCountOf(p.id);
          return (
            <div
              key={p.id}
              className={`sq-add-item${on ? ' is-picked' : ''}`}
              role="option" aria-selected={on}
              data-testid={`squad-project-candidate-${p.id}`}
              onClick={() => toggle(p.id)}
            >
              <span className="sq-add-glyph"><FileIcon size={14} /></span>
              <div className="sq-add-text">
                <span className="sq-add-name">{p.name}</span>
                {linkCount > 0 && (
                  <span className="sq-add-meta">{L('squad.project.linkCount', { count: linkCount })}</span>
                )}
              </div>
              {on && <span className="sq-add-pick" aria-hidden><CheckIcon size={16} /></span>}
            </div>
          );
        })}
        {rows.length === 0 && (
          <div className="sq-add-none" data-testid={`squad-project-none-${squad.id}`}>
            {L('squad.project.noCandidates')}
            {/* 새 프로젝트는 여기서 만들지 않는다(2026-10-26 시안 17765:40299) — 어드민 콘솔에서 만든 것만 고른다 */}
          </div>
        )}
      </div>
      </div>
      {linkError && <div className="sq-proj-error" role="alert">{linkError}</div>}
      <div className="sq-add-actions">
        <button type="button" className="sq-btn sq-btn-sm sq-btn-outline" onClick={onClose}>
          {L('squad.project.cancel')}
        </button>
        <Button
          className="sq-btn sq-btn-sm sq-btn-primary"
          data-testid={`squad-project-link-${squad.id}`}
          disabled={picked.length === 0}
          onClick={commitLink}
        >{L('squad.project.linkSelected', { count: picked.length })}</Button>
      </div>
    </div>
    </div>
  );
}

/**
 * 主 행을 해제하려는데 다른 스쿼드 연결이 남아 있을 때 — 새 主 를 먼저 고르게 한다(서버 409 대응).
 * 순서: 새 주 스쿼드 지정(`onSetPrimarySquad`) → 이 스쿼드 연결 해제(`onUnlinkProject`).
 */
function PrimaryTransferModal({ project, others, onConfirm, onCancel }) {
  const L = useOrgLabels();
  const [to, setTo] = useState(others[0]?.squadId ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const confirm = async () => {
    if (!to || busy) return;
    setBusy(true);
    setError('');
    try {
      await onConfirm(to);
    } catch (err) {
      setError(messageOf(err, L('squad.project.transfer.failed')));
      setBusy(false);
    }
  };

  return (
    <ConfirmModal
      title={L('squad.project.transfer.title')}
      body={(
        <>
          <p className="sq-modal-desc">{rich(L('squad.project.transfer.desc', { name: project.name }))}</p>
          <div className="sq-proj-transfer-list" role="radiogroup">
            {others.map((s) => (
              <Radio
                key={s.squadId}
                name={`sq-proj-transfer-${project.id}`}
                checked={to === s.squadId}
                onChange={() => setTo(s.squadId)}
                variant="card"
                data-testid={`squad-project-transfer-to-${s.squadId}`}
                label={s.name}
              />
            ))}
          </div>
          {error && <div className="sq-proj-error" role="alert">{error}</div>}
        </>
      )}
      busy={busy}
      confirmDisabled={!to}
      confirmLabel={L('squad.project.transfer.confirm')}
      cancelLabel={L('squad.project.cancel')}
      onConfirm={confirm}
      onCancel={() => { if (!busy) onCancel(); }}
      zIndex={SQUAD_MODAL_Z}
      testId="squad-project-transfer-modal"
      confirmTestId="squad-project-transfer-confirm"
      cancelTestId="squad-project-transfer-cancel"
    />
  );
}

/**
 * @param squad          스쿼드 (`squad.projects` 를 그린다)
 * @param linkCountOf    (projectId) => 이 프로젝트가 연결된 스쿼드 수 — 후보 행 `연결 N개`
 * @param candidates     이 스쿼드에 아직 안 붙은 프로젝트 (`projectOptions` − 연결분)
 * @param isEditing      「할당 편집」 이 켜져 있는가
 * @param editable       이 스쿼드의 프로젝트 칸을 고칠 수 있는가(편집 모드 포함 판정)
 * @param pickerOpen     이 카드의 추가 겹창이 열려 있는가(한 번에 한 카드)
 *
 * 새 프로젝트 만들기는 여기 없다(2026-10-26 시안 17765:40299) — 겹창은 이미 있는 프로젝트만 고른다.
 */
export default function SquadProjectSection({
  squad,
  linkCountOf,
  candidates,
  isEditing,
  editable,
  pickerOpen,
  onOpenPicker,
  onClosePicker,
  onOpenProject,
  onLinkProjects,
  onSetPrimarySquad,
  onUnlinkProject,
}) {
  const L = useOrgLabels();
  const [transfer, setTransfer] = useState(null); // project
  const projects = squad.projects || [];

  // 행의 主 지정·해제 실패는 호스트가 카드 위 실패 띠(`actionError`)로 알린다 — 여기서는 삼킨다.
  const quietly = (p) => Promise.resolve(p).catch(() => {});

  const unlink = (p) => {
    const others = (p.linkedSquads || []).filter((s) => s.squadId !== squad.id);
    if (p.isPrimary && others.length > 0 && onSetPrimarySquad) { setTransfer(p); return undefined; }
    return quietly(onUnlinkProject(squad.id, p.id));
  };

  return (
    <div className="sq-proj" data-testid={`squad-projects-${squad.id}`}>
      <div className="sq-proj-head">
        {L('squad.project.title', { count: projects.length })}
        {isEditing && !editable && (
          <Tooltip content={L('squad.project.locked')}>
            <span className="sq-proj-lock" data-testid={`squad-projects-locked-${squad.id}`}><LockIcon size={12} /></span>
          </Tooltip>
        )}
      </div>

      <div className="sq-proj-list">
        {projects.map((p) => {
          // 원장을 열 수 없는 행(canOpen === false)은 링크로 그리지 않는다 — 밑줄·포인터·이동 없음,
          // 말풍선 끝에 사유 한 줄. 판정은 서버가 준 값만 본다(PW-2278 · 기획서 조직도 스쿼드 §9 「프로젝트 공개 범위」).
          const openable = !!onOpenProject && p.canOpen !== false;
          return (
          <div
            key={p.id}
            className={`sq-proj-row${openable ? ' is-clickable' : ''}`}
            data-testid={`squad-project-row-${squad.id}-${p.id}`}
            data-can-open={p.canOpen === false ? 'false' : undefined}
            title={[
              p.description,
              // 다른 스쿼드가 主 인 프로젝트 — 줄 안에 적으면 이름 자리를 먹어 말풍선으로 옮겼다(시안 17757:34900 은 이름만)
              !p.isPrimary && p.primarySquadName ? L('squad.project.primaryOf', { name: p.primarySquadName }) : '',
              p.canOpen === false ? L('squad.project.cannotOpen') : '',
            ].filter(Boolean).join('\n') || undefined}
            onClick={openable ? () => onOpenProject(p.id) : undefined}
          >
            {/* 왼쪽 반 — 파일 아이콘 · 이름 · 主 표식 (Figma 17757:34900) */}
            <span className="sq-proj-main">
              <FileIcon size={14} />
              <span className="sq-proj-name">{p.name}</span>
              {p.isPrimary && (
                <Tooltip content={L('squad.project.primaryTip')}>
                  <StatusBadge tone="accent" className="sq-proj-primary" data-testid={`squad-project-primary-${squad.id}-${p.id}`}>
                    {L('squad.project.primaryMark')}
                  </StatusBadge>
                </Tooltip>
              )}
            </span>
            {/* 오른쪽 반 — 상태 딱지 · 진행 바 · 퍼센트 (17757:34884) */}
            <span className="sq-proj-side">
              <StatusBadge tone={projectStatusTone(p.status)} className="sq-proj-status">
                {projectStatusText(L, p.status)}
              </StatusBadge>
              <span className="sq-proj-bar">
                <span className="sq-proj-bar-fill" style={{ width: `${Math.max(0, Math.min(100, p.progress || 0))}%`, background: squad.color }} />
              </span>
              <span className="sq-proj-pct">{p.progress || 0}%</span>
            </span>
            {editable && onSetPrimarySquad && (
              <button
                type="button"
                className="sq-proj-btn"
                data-testid={`squad-project-set-primary-${squad.id}-${p.id}`}
                disabled={p.isPrimary}
                title={L(p.isPrimary ? 'squad.project.alreadyPrimary' : 'squad.project.setPrimaryTip')}
                onClick={(e) => { e.stopPropagation(); if (!p.isPrimary) quietly(onSetPrimarySquad(p.id, squad.id)); }}
              >{L('squad.project.primaryMark')}</button>
            )}
            {editable && onUnlinkProject && (
              <button
                type="button"
                className="sq-proj-remove"
                data-testid={`squad-project-unlink-${squad.id}-${p.id}`}
                title={L('squad.project.unlink')}
                aria-label={L('squad.project.unlink')}
                onClick={(e) => { e.stopPropagation(); unlink(p); }}
              ><CloseIcon size={12} /></button>
            )}
          </div>
          );
        })}
        {projects.length === 0 && (
          <span className="sq-chip-empty">{L('squad.project.empty')}</span>
        )}

        {editable && onLinkProjects && !pickerOpen && (
          <button
            type="button"
            className="sq-proj-add"
            data-testid={`squad-project-add-${squad.id}`}
            onClick={onOpenPicker}
          >
            <PlusIcon size={20} /> {L('squad.project.add')}
          </button>
        )}
        {editable && onLinkProjects && pickerOpen && (
          <ProjectPicker
            squad={squad}
            candidates={candidates}
            linkCountOf={linkCountOf}
            onLink={(ids) => onLinkProjects(squad.id, ids)}
            onClose={onClosePicker}
          />
        )}
      </div>

      {transfer && (
        <PrimaryTransferModal
          project={transfer}
          others={(transfer.linkedSquads || []).filter((s) => s.squadId !== squad.id)}
          onCancel={() => setTransfer(null)}
          onConfirm={async (toSquadId) => {
            await onSetPrimarySquad(transfer.id, toSquadId);
            await onUnlinkProject(squad.id, transfer.id);
            setTransfer(null);
          }}
        />
      )}
    </div>
  );
}
