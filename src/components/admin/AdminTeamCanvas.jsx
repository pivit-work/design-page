import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import AdminTeamTreeNode, { TeamInsertZone } from './AdminTeamTreeNode.jsx';
import AdminTeamDetailPanel from './AdminTeamDetailPanel.jsx';
import { PlusIcon, SearchIcon, XIcon } from './teamIcons.jsx';

/**
 * AdminTeamCanvas — 팀 관리 화면(좌: 트리 / 우: 상세) 정본 컴포넌트.
 * 순수 표현: 트리·상세 데이터 + labels + 콜백을 받아 렌더. 데이터 패칭/서비스 호출은
 * 소비 측 책임. 콜백(onCreate/Update/Delete/Move/MemberAction/AddMember)은 async 이며
 * 실패 시 throw 하면 캔버스가 에러 토스트를 띄운다. 확인 모달·DnD 가드·토스트는 캔버스 소유.
 */

const DEFAULT_LABELS = {
  title: '팀 관리',
  addTopLevel: '최상위 팀 추가',
  summary: '팀 {{teams}}개 · 구성원 {{members}}명',
  treeSearch: '팀 검색',
  newTeamName: '새 팀 이름',
  noSearchResults: '검색 결과가 없습니다',
  emptyTree: '팀이 없습니다',
  moveTeam: '팀 이동',
  moveTeamSub: '이동할 상위 팀을 선택하세요',
  current: '현재',
  noParent: '최상위(상위 팀 없음)',
  topLevel: '최상위',
  parentTeam: '상위 팀',
  cancel: '취소',
  confirm: '확인',
  deleteTeam: '팀 삭제',
  editTeam: '팀 편집',
  addSubTeam: '하위 팀 추가',
  openMenu: '메뉴 열기',
  confirmDelete: '이 팀을 삭제하시겠습니까?',
  confirmDeleteMembers: '소속 구성원 {{count}}명은 미배정으로 이동합니다.',
  confirmMove: '‘{{team}}’ 팀을 ‘{{parent}}’ 하위로 옮기시겠습니까?',
  confirmMoveToRoot: '‘{{team}}’ 팀을 최상위로 옮기시겠습니까?',
  confirmMoveSubTeams: '하위 팀 {{count}}개도 함께 이동합니다.',
  confirmMoveMembers: '소속 구성원 {{count}}명의 소속 경로가 바뀝니다.',
  unassigned: '미배정',
  unassignedSub: '아직 팀에 배정되지 않은 구성원 {{count}}명',
  noUnassignedMembers: '미배정 구성원이 없습니다',
  noTeamSelected: '좌측에서 팀을 선택하세요',
  pickIcon: '아이콘 선택',
  pickColor: '색상 선택',
  description: '설명',
  descriptionPlaceholder: '팀 설명을 입력하세요',
  members: '구성원',
  noMembers: '구성원이 없습니다',
  searchMember: '구성원 검색하여 추가',
  subTeams: '하위 팀',
  leader: '팀장',
  primary: '주 소속',
  // 인원 배지 옆 `+N` 툴팁 — 이 팀을 겸직으로 두고 있는 인원(합계에는 안 들어감).
  concurrentHint: '겸직 인원 (인원 수에는 포함되지 않음)',
  openProfile: '프로필 열기',
  removeLeader: '팀장 해제',
  setLeader: '팀장 지정',
  // 조직장(Org Leader) 지정·해제 확인 모달
  leaderAssignTitle: '{{name}}님을 ‘{{team}}’의 조직장으로 지정합니다',
  leaderReleaseTitle: '‘{{team}}’의 조직장 지정을 해제합니다',
  leaderReplaceNotice: '현재 조직장 {{name}}님의 지정은 해제됩니다.',
  leaderPromoteNotice: '권한이 ‘매니저’로 자동 승격됩니다.',
  leaderScopeNote: '조직장 권한 범위는 ‘{{team}}’과 그 하위 팀입니다',
  leaderHistoryNote: '이 변경은 발령 이력에 기록됩니다',
  leaderVacantNote: '이 팀은 조직장 미지정 상태가 됩니다 (정상 상태입니다)',
  leaderDemoteCheckbox: '권한을 ‘멤버’로 함께 변경',
  leaderAssignConfirm: '조직장으로 지정',
  leaderReleaseConfirm: '해제',
  leaderResignedHint: '퇴사자는 조직장으로 지정할 수 없습니다',
  setPrimary: '주 소속으로',
  removeMember: '구성원 제거',
  toastCreated: '팀이 생성되었습니다',
  toastUpdated: '변경되었습니다',
  toastDeleted: '팀이 삭제되었습니다',
  toastMemberAdded: '구성원이 추가되었습니다',
  toastMemberRemoved: '구성원이 제거되었습니다',
  toastLeaderSet: '팀장으로 지정되었습니다',
  toastLeaderUnset: '팀장이 해제되었습니다',
  toastPrimarySet: '주 소속으로 변경되었습니다',
  toastError: '오류가 발생했습니다',
  toastCycleError: '하위 팀으로는 이동할 수 없습니다',
  toastDeleteHasChildren: '하위 팀이 있어 삭제할 수 없습니다',
};

function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
function mergeLabels(base, provided) {
  if (!provided) return base;
  const out = { ...base };
  for (const k of Object.keys(provided)) {
    if (isObj(provided[k])) out[k] = mergeLabels(base[k] || {}, provided[k]);
    else if (provided[k] !== undefined) out[k] = provided[k];
  }
  return out;
}
const fill = (s, vars) => {
  let out = s == null ? '' : String(s);
  for (const k of Object.keys(vars)) out = out.replace(`{{${k}}}`, vars[k]);
  return out;
};

function containsId(node, id) {
  if (node.id === id) return true;
  return node.children.some((c) => containsId(c, id));
}
function isDescendant(nodes, parentId, targetId) {
  for (const n of nodes) {
    if (n.id === parentId) return containsId(n, targetId);
    if (isDescendant(n.children, parentId, targetId)) return true;
  }
  return false;
}
function countDescendants(node) {
  return (node.children || []).reduce((acc, c) => acc + 1 + countDescendants(c), 0);
}
function findNode(nodes, id) {
  for (const n of nodes) {
    if (n.id === id) return n;
    const f = findNode(n.children, id);
    if (f) return f;
  }
  return null;
}
function findParentId(nodes, id, parent = null) {
  for (const n of nodes) {
    if (n.id === id) return parent;
    const f = findParentId(n.children, id, n.id);
    if (f !== undefined && f !== null) return f;
    if (f === null && findNode(n.children, id)) return n.id;
  }
  return null;
}
function filterTree(nodes, query) {
  if (!query) return nodes;
  const q = query.toLowerCase();
  const filterNode = (node) => {
    const filteredChildren = node.children.map(filterNode).filter(Boolean);
    const matches = node.name.toLowerCase().includes(q);
    if (matches || filteredChildren.length > 0) return { ...node, children: filteredChildren };
    return null;
  };
  return nodes.map(filterNode).filter(Boolean);
}

/**
 * 확인 모달.
 *
 * `notes` 는 "이 변경이 함께 일으키는 일" 을 한 줄씩 나열하는 보조 안내다(· 로 시작).
 * `checkbox` 는 선택적 부수 동작 — 조직장 해제 시의 "권한을 멤버로 함께 변경" 처럼
 * **기본 OFF** 로 두고 사용자가 켤 때만 일어나야 하는 것에만 쓴다.
 */
function ConfirmModal({
  title, body, notes, checkbox, confirmLabel, cancelLabel, onConfirm, onCancel, danger,
}) {
  return (
    <div className="tm-modal-overlay" onClick={onCancel}>
      <div className="tm-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="tm-modal-title">{title}</h3>
        {body && <p className="tm-modal-sub">{body}</p>}
        {checkbox && (
          <label className="tm-modal-check">
            <input
              type="checkbox"
              checked={!!checkbox.checked}
              onChange={(e) => checkbox.onChange?.(e.target.checked)}
            />
            <span>{checkbox.label}</span>
          </label>
        )}
        {notes && notes.length > 0 && (
          <ul className="tm-modal-notes">
            {notes.map((n) => <li key={n}>{n}</li>)}
          </ul>
        )}
        <div className="tm-modal-actions">
          <button type="button" className="tm-btn is-ghost" onClick={onCancel}>{cancelLabel}</button>
          <button type="button" className={`tm-btn ${danger ? 'is-danger' : 'is-primary'}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

/**
 * 조직장 지정·해제 확인 모달.
 *
 * 이 조작은 누르는 사람이 보는 것보다 많은 일을 한다 — 지정은 **기존 조직장의
 * 자격을 떼고** 대상의 권한을 매니저로 올리며, 해제는 그 팀을 조직장 없는 상태로
 * 만든다. 그래서 "무엇이 함께 바뀌는지" 를 먼저 보여주고 확인을 받는다.
 *
 * 강등 체크박스는 **기본 OFF** 이며, 다른 팀 조직장을 겸하고 있거나 어드민인
 * 대상에게는 아예 렌더하지 않는다 — 조직장 자격이 남아 있는데 권한만 떼면 즉시
 * 모순 상태가 되고, 어드민 권한은 조직장 여부에서 파생된 것이 아니기 때문이다.
 */
function LeaderConfirmModal({
  state, teamName, currentLeader, labels, demoteChecked, onDemoteChange, onConfirm, onCancel,
}) {
  const { member, mode } = state;
  const assigning = mode === 'assign';

  const bodyLines = [];
  if (assigning) {
    if (currentLeader && currentLeader.id !== member.id) {
      bodyLines.push(fill(labels.leaderReplaceNotice, { name: currentLeader.name }));
    }
    // 이미 매니저 이상인 사람에게 "승격됩니다" 를 보이면 잘못된 기대를 만든다.
    if (member.role === 'member') bodyLines.push(labels.leaderPromoteNotice);
  }

  const showDemote = !assigning
    && !member.leadsOtherTeams
    && member.role !== 'admin'
    && member.role !== 'ceo';

  return (
    <ConfirmModal
      title={assigning
        ? fill(labels.leaderAssignTitle, { name: member.name, team: teamName })
        : fill(labels.leaderReleaseTitle, { team: teamName })}
      body={bodyLines.join(' ')}
      checkbox={showDemote
        ? { label: labels.leaderDemoteCheckbox, checked: demoteChecked, onChange: onDemoteChange }
        : null}
      notes={assigning
        ? [fill(labels.leaderScopeNote, { team: teamName }), labels.leaderHistoryNote]
        : [labels.leaderVacantNote, labels.leaderHistoryNote]}
      confirmLabel={assigning ? labels.leaderAssignConfirm : labels.leaderReleaseConfirm}
      cancelLabel={labels.cancel}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

function MoveTeamModal({ tree, movingId, currentParentId, labels, onConfirm, onCancel }) {
  const [selectedParentId, setSelectedParentId] = useState(undefined);
  const flatOptions = [
    { id: null, name: labels.noParent, depth: 0, disabled: currentParentId === null, current: currentParentId === null },
  ];
  const flatten = (nodes, depth) => {
    for (const n of nodes) {
      if (n.isUnassigned) continue;
      const disabled = n.id === movingId || isDescendant([n], movingId, n.id);
      flatOptions.push({ id: n.id, name: n.name, depth, disabled, current: n.id === currentParentId });
      flatten(n.children, depth + 1);
    }
  };
  flatten(tree, 1);

  return (
    <div className="tm-modal-overlay" style={{ zIndex: 1100 }} onClick={onCancel}>
      <div className="tm-modal is-wide" onClick={(e) => e.stopPropagation()}>
        <h3 className="tm-modal-title">{labels.moveTeam}</h3>
        <p className="tm-modal-sub">{labels.moveTeamSub}</p>
        <div className="tm-modal-list">
          {flatOptions.map((opt) => {
            const selectable = !opt.disabled;
            const isSelected = selectedParentId === opt.id;
            return (
              <button
                type="button"
                key={opt.id ?? '__root__'}
                className={`tm-modal-list-item${isSelected ? ' is-selected' : ''}`}
                disabled={!selectable}
                onClick={() => selectable && setSelectedParentId(opt.id)}
                style={{ paddingLeft: 14 + opt.depth * 16 }}
              >
                <span className="tm-modal-list-item-name">{opt.name}</span>
                {opt.current && <span className="tm-modal-list-badge">{labels.current}</span>}
              </button>
            );
          })}
        </div>
        <div className="tm-modal-actions">
          <button type="button" className="tm-btn is-ghost" onClick={onCancel}>{labels.cancel}</button>
          <button
            type="button"
            className="tm-btn is-primary"
            disabled={selectedParentId === undefined}
            onClick={() => onConfirm(selectedParentId ?? null)}
          >
            {labels.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminTeamCanvas({
  tree = [],
  selectedTeam = null,
  selectedId = '',
  availableMembers = [],
  totalTeams = 0,
  totalMembers = 0,
  loading = false,
  labels: providedLabels,
  renderAvatar,
  onSelectTeam,
  onCreateTeam,
  onUpdateTeam,
  onDeleteTeam,
  onMoveTeam,
  onReorderTeam,
  onMemberAction,
  onAddMember,
  onSelectMember,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);

  const [treeSearch, setTreeSearch] = useState('');
  const [searchFocus, setSearchFocus] = useState(false);
  const [draggingId, setDraggingId] = useState('');
  const [moveModalId, setMoveModalId] = useState('');
  const [inlineCreateParentId, setInlineCreateParentId] = useState(null);
  const [inlineCreateValue, setInlineCreateValue] = useState('');
  const [confirmModal, setConfirmModal] = useState(null);
  // 조직장 지정·해제 확인 모달 — 체크박스 상태를 모달 밖에서 들고 있어야 확인
  // 시점에 값을 읽을 수 있다. 열 때마다 false 로 되돌린다(M1).
  const [leaderModal, setLeaderModal] = useState(null);
  const [demoteChecked, setDemoteChecked] = useState(false);

  // Toast (캔버스 소유)
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const run = useCallback(async (fn, successMsg) => {
    try {
      await fn();
      if (successMsg) showToast(successMsg);
    } catch {
      showToast(L.toastError, 'error');
    }
  }, [showToast, L.toastError]);

  const handleCreate = useCallback(async (parentId, name) => {
    await run(() => onCreateTeam?.(parentId, name), L.toastCreated);
  }, [run, onCreateTeam, L.toastCreated]);

  const handleUpdate = useCallback((id, patch) => {
    void run(() => onUpdateTeam?.(id, patch), L.toastUpdated);
  }, [run, onUpdateTeam, L.toastUpdated]);

  const handleMove = useCallback((id, parentId) => {
    void run(() => onMoveTeam?.(id, parentId), L.toastUpdated);
  }, [run, onMoveTeam, L.toastUpdated]);

  // 같은 부모(형제) 내 재정렬: 새 형제 id 순서 전체를 방출. 소비자는 이 순서로
  // sortOrder 를 저장한다(백엔드 reorderUnits). 검색 필터 중에는 부분집합만 보여
  // 순서가 왜곡되므로 비활성(reorderEnabled) 처리한다.
  const handleReorder = useCallback((orderedIds) => {
    setDraggingId(''); // 재정렬 드롭 후 드래그중(opacity) 상태 즉시 해제.
    void run(() => onReorderTeam?.(orderedIds), L.toastUpdated);
  }, [run, onReorderTeam, L.toastUpdated]);

  const handleAddMember = useCallback((teamId, memberId) => {
    void run(() => onAddMember?.(teamId, memberId), L.toastMemberAdded);
  }, [run, onAddMember, L.toastMemberAdded]);

  const handleMemberAction = useCallback((action, teamId, memberId) => {
    // 조직장 지정·해제는 그 한 번의 조작이 **다른 사람의 자격과 권한까지** 바꾼다
    // (기존 조직장 해제 + 권한 승격). 눌리자마자 반영하지 않고 확인 모달을 거친다.
    if (action === 'setLeader') {
      const m = selectedTeam?.members?.find((x) => x.id === memberId);
      if (!m) return;
      if (!m.isLeader && m.canBeLeader === false) return; // G2 — 퇴사자 지정 불가
      setDemoteChecked(false); // M1 — 강등 체크박스는 언제나 기본 OFF
      setLeaderModal({ teamId, member: m, mode: m.isLeader ? 'release' : 'assign' });
      return;
    }
    let msg = L.toastUpdated;
    if (action === 'remove') msg = L.toastMemberRemoved;
    else if (action === 'setPrimary') msg = L.toastPrimarySet;
    void run(() => onMemberAction?.(action, teamId, memberId), msg);
  }, [run, onMemberAction, selectedTeam, L]);

  const commitLeaderChange = useCallback(() => {
    if (!leaderModal) return;
    const { teamId, member, mode } = leaderModal;
    const alsoDemoteRole = mode === 'release' && demoteChecked;
    setLeaderModal(null);
    void run(
      () => onMemberAction?.('setLeader', teamId, member.id, { alsoDemoteRole }),
      mode === 'release' ? L.toastLeaderUnset : L.toastLeaderSet,
    );
  }, [leaderModal, demoteChecked, run, onMemberAction, L]);

  const requestDelete = useCallback((nodeId) => {
    const node = findNode(tree, nodeId);
    if (!node) return;
    if (node.children && node.children.length > 0) {
      showToast(L.toastDeleteHasChildren, 'error');
      return;
    }
    let body = L.confirmDelete;
    if (node.memberCount > 0) body += '\n' + fill(L.confirmDeleteMembers, { count: node.memberCount });
    setConfirmModal({
      title: L.deleteTeam,
      body,
      danger: true,
      onConfirm: () => {
        setConfirmModal(null);
        void run(() => onDeleteTeam?.(nodeId), L.toastDeleted);
      },
    });
  }, [tree, showToast, L, run, onDeleteTeam]);

  // 팀 이동은 조직 구조가 통째로 바뀌는 변경이라, 드래그로 실수 이동하는 걸 막기 위해
  // 확인 모달을 거친다(모달로 상위 팀을 골라 '확인' 을 누르는 경로는 그 자체가 확인이므로 제외).
  const requestMove = useCallback((nodeId, newParentId) => {
    const node = findNode(tree, nodeId);
    if (!node) return;
    const parent = newParentId ? findNode(tree, newParentId) : null;
    let body = newParentId
      ? fill(L.confirmMove, { team: node.name, parent: parent?.name ?? '' })
      : fill(L.confirmMoveToRoot, { team: node.name });
    const subTeams = countDescendants(node);
    if (subTeams > 0) body += '\n' + fill(L.confirmMoveSubTeams, { count: subTeams });
    if (node.memberCount > 0) body += '\n' + fill(L.confirmMoveMembers, { count: node.memberCount });
    setConfirmModal({
      title: L.moveTeam,
      body,
      onConfirm: () => {
        setConfirmModal(null);
        handleMove(nodeId, newParentId);
      },
    });
  }, [tree, L, handleMove]);

  // DnD
  const handleDragStart = useCallback((id) => setDraggingId(id), []);
  // 드래그 종료(성공/취소/재정렬 무관)에 항상 발생 — 드래그중(opacity) 상태를
  // 확실히 해제한다. 재정렬·"아무데도 안 놓기" 후 원본 행이 흐리게 남던 버그 방지.
  const handleDragEnd = useCallback(() => setDraggingId(''), []);
  const handleDrop = useCallback((targetId) => {
    if (!draggingId || draggingId === targetId) { setDraggingId(''); return; }
    if (isDescendant(tree, draggingId, targetId)) {
      setDraggingId('');
      showToast(L.toastCycleError, 'error');
      return;
    }
    const moving = draggingId;
    setDraggingId('');
    requestMove(moving, targetId);
  }, [draggingId, tree, showToast, L.toastCycleError, requestMove]);

  const handleContextAction = useCallback((action, nodeId) => {
    switch (action) {
      case 'edit': onSelectTeam?.(nodeId); break;
      case 'addSub': setInlineCreateParentId(nodeId); setInlineCreateValue(''); break;
      case 'delete': requestDelete(nodeId); break;
      case 'move': setMoveModalId(nodeId); break;
      default: break;
    }
  }, [onSelectTeam, requestDelete]);

  const handleInlineCreateConfirm = useCallback(async () => {
    const name = inlineCreateValue.trim();
    const parentId = inlineCreateParentId;
    setInlineCreateParentId(null);
    setInlineCreateValue('');
    if (name && parentId !== null) {
      await handleCreate(parentId === '__root__' ? undefined : parentId, name);
    }
  }, [inlineCreateValue, inlineCreateParentId, handleCreate]);

  const handleInlineCreateCancel = useCallback(() => {
    setInlineCreateParentId(null);
    setInlineCreateValue('');
  }, []);

  const filteredTree = filterTree(tree, treeSearch);
  const movingParentId = moveModalId ? findParentId(tree, moveModalId) : null;

  if (loading) {
    return <div className="tm-loading">{L.loading ?? '...'}</div>;
  }

  return (
    <div className="tm-root">
      {toast && <div className={`tm-toast ${toast.type === 'success' ? 'is-success' : 'is-error'}`}>{toast.msg}</div>}

      {/* Left: Tree */}
      <div className="tm-tree-panel">
        <div className="tm-tree-header">
          <div className="tm-tree-header-row">
            <h1 className="tm-tree-title">{L.title}</h1>
            <button
              type="button"
              className="tm-tree-add"
              onClick={() => { setInlineCreateParentId('__root__'); setInlineCreateValue(''); }}
              aria-label={L.addTopLevel}
            >
              <PlusIcon size={16} />
            </button>
          </div>
          <p className="tm-tree-summary">{fill(L.summary, { teams: totalTeams, members: totalMembers })}</p>
        </div>

        <div className="tm-tree-search">
          <div className={`tm-search-box${searchFocus ? ' is-focus' : ''}`}>
            <span className="tm-search-icon"><SearchIcon size={13} /></span>
            <input
              className="tm-search-input"
              value={treeSearch}
              onChange={(e) => setTreeSearch(e.target.value)}
              onFocus={() => setSearchFocus(true)}
              onBlur={() => setSearchFocus(false)}
              placeholder={L.treeSearch}
              data-testid="tree-search"
            />
          </div>
        </div>

        {inlineCreateParentId === '__root__' && (
          <div className="tm-inline-create">
            <input
              autoFocus
              className="tm-inline-input"
              value={inlineCreateValue}
              onChange={(e) => setInlineCreateValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleInlineCreateConfirm();
                if (e.key === 'Escape') handleInlineCreateCancel();
              }}
              onBlur={handleInlineCreateCancel}
              placeholder={L.newTeamName}
              data-testid="inline-create-root-input"
            />
            <button type="button" className="tm-inline-cancel" onMouseDown={(e) => e.preventDefault()} onClick={handleInlineCreateCancel}><XIcon size={14} /></button>
          </div>
        )}

        <div className="tm-tree-list">
          {(() => {
            const rootIds = filteredTree.map((n) => n.id);
            // 재정렬은 콜백이 있고 검색 필터가 없을 때만(필터 시 부분집합이라 순서 왜곡).
            const reorderEnabled = !!onReorderTeam && !treeSearch;
            const showRootZones = reorderEnabled && !!draggingId && rootIds.includes(draggingId);
            return filteredTree.map((node, i) => (
              <div key={node.id}>
                {showRootZones && (
                  <TeamInsertZone siblingIds={rootIds} index={i} depth={0} draggingId={draggingId} onReorder={handleReorder} />
                )}
                <AdminTeamTreeNode
                  node={node}
                  selectedId={selectedId}
                  labels={L}
                  onSelect={onSelectTeam}
                  onContextAction={handleContextAction}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDrop={handleDrop}
                  onReorder={handleReorder}
                  reorderEnabled={reorderEnabled}
                  draggingId={draggingId}
                  inlineCreateParentId={inlineCreateParentId ?? undefined}
                  inlineCreateValue={inlineCreateValue}
                  onInlineCreateChange={setInlineCreateValue}
                  onInlineCreateConfirm={() => void handleInlineCreateConfirm()}
                  onInlineCreateCancel={handleInlineCreateCancel}
                />
                {showRootZones && i === filteredTree.length - 1 && (
                  <TeamInsertZone siblingIds={rootIds} index={filteredTree.length} depth={0} draggingId={draggingId} onReorder={handleReorder} />
                )}
              </div>
            ));
          })()}
          {filteredTree.length === 0 && (
            <p className="tm-empty-note" style={{ padding: '12px' }}>
              {treeSearch ? L.noSearchResults : L.emptyTree}
            </p>
          )}
        </div>
      </div>

      {/* Right: Detail */}
      <AdminTeamDetailPanel
        team={selectedTeam}
        availableMembers={availableMembers}
        labels={L}
        renderAvatar={renderAvatar}
        onUpdateTeam={handleUpdate}
        onMemberAction={handleMemberAction}
        onSelectSubTeam={onSelectTeam}
        onSelectMember={onSelectMember}
        onAddMember={handleAddMember}
        onDeleteTeam={requestDelete}
      />

      {leaderModal && (
        <LeaderConfirmModal
          state={leaderModal}
          teamName={selectedTeam?.name ?? ''}
          currentLeader={selectedTeam?.members?.find((m) => m.isLeader) ?? null}
          labels={L}
          demoteChecked={demoteChecked}
          onDemoteChange={setDemoteChecked}
          onConfirm={commitLeaderChange}
          onCancel={() => setLeaderModal(null)}
        />
      )}

      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          body={confirmModal.body}
          danger={confirmModal.danger}
          confirmLabel={L.confirm}
          cancelLabel={L.cancel}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {moveModalId && (
        <MoveTeamModal
          tree={tree}
          movingId={moveModalId}
          currentParentId={movingParentId}
          labels={L}
          onConfirm={(newParentId) => { setMoveModalId(''); handleMove(moveModalId, newParentId); }}
          onCancel={() => setMoveModalId('')}
        />
      )}
    </div>
  );
}
