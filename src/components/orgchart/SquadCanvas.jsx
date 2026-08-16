/**
 * 조직도 — 스쿼드 뷰 (스쿼드 원장 관리 · 팀원 할당 · 배치 매트릭스).
 *
 * 정본 기획: `screen-org-chart-squad.policy.md` v3.7
 * 디자인 시안: `조직도-renewal-with-public-card/org-chart-v2.jsx` 의 `SquadView`
 *
 * 시안과 다른 점 — 실서비스로 옮기며 의도적으로 바꾼 것들:
 *  1. **키가 이름이 아니라 `userId`** 다. 시안은 데모라 동명이인이 없지만 실조직에는 있다.
 *  2. **상태·역할은 서버 코드값**(`planned|active|done|archived`, `lead|member`)을 그대로
 *     받고 라벨은 `squad-constants.js` 가 해석한다 — 코드값이 화면에 새지 않는 단일 지점.
 *  3. **로컬에서 데이터를 고치지 않는다.** 모든 편집은 `on*` 콜백으로 부모에 올리고,
 *     부모가 낙관적 반영·롤백을 책임진다. 콜백이 없으면 그 버튼을 **렌더하지 않는다** —
 *     핸들러 부재를 "데모 모드" 로 흡수하면 저장된 것처럼 보이는 가짜 저장이 된다.
 *  4. 이모지 글리프 대신 인라인 SVG(`squadIcons.jsx`).
 *
 * **생김새는 프로젝트 탭(`ProjectCanvas`)이 정본이다.** 같은 조직도 안의 이웃 탭이라
 * 카드 그리드(`pj-cards-grid`)·카드(`pj-card`)·상태 점(`pj-card-status`+`pj-status-dot`)·
 * 진행 바(`pj-progress-bar`)·멤버 표(`pj-table`/`pj-th`/`pj-td`/`pj-member-*`)를 그대로
 * 가져다 쓰고, 스쿼드에만 있는 조각만 `org_squad.css` 의 `sq-*` 로 정의한다.
 * 인라인 스타일에는 **데이터에서 오는 값**(스쿼드 색·계산된 폭·팝오버 좌표)과 z 층만 남긴다.
 *
 * 프로젝트 연결(`SquadProject`)은 이 캔버스 범위 밖이다 — 서버 창구가 아직 없다(PW-109/113).
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import SquadFormCard from './SquadFormCard.jsx';
import {
  CapacityBar,
  SquadComposition,
  SquadAssignPopover,
  SquadHistoryPopover,
} from './SquadPieces.jsx';
import {
  CAPACITY,
  SQUAD_PALETTE,
  SQUAD_MENU_BACKDROP_Z,
  SQUAD_MENU_Z,
  SQUAD_MODAL_Z,
  avatarFontPx,
  capacityState,
  fmtYmd,
  isCapacityUnset,
  isCountedStatus,
  leadOf,
  planSegments,
  plannedTotalPct,
  squadCountOf,
  squadStatusMeta,
  squadStatusLabel,
  transitionsFrom,
  unsetCapacityCount,
} from './squad-constants.js';
import {
  LeadStarIcon, CalendarIcon, WarningIcon, LockIcon,
  CloseIcon, MoreIcon, ChevronDownIcon, PlusIcon, CheckIcon, EditIcon,
} from './squadIcons.jsx';

const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * 셀 툴팁의 마지막 줄 — 이 셀을 눌렀을 때 무엇을 할 수 있는지.
 * 본인 행은 «내 캐파 설정» 이 정상 경로라 관리자 문구와 다르게 안내한다(§5-3.7).
 */
function cellHint(isMine, editable) {
  if (isMine) return '클릭: 내 캐파 설정';
  return editable ? '클릭: 비중·캐파·리드 편집' : '';
}

/**
 * 「캐파 사용」 열의 아래 문구 (§5-3.2 상태표).
 *
 * 합계 0 은 두 가지 이유로 생긴다 — 정말 배정이 없거나, 배정은 있는데 **캐파가 아직
 * 아무도 정해지지 않아 합계에서 빠진** 것이다. 둘을 같은 「미배정」 으로 쓰면 왜 0인지
 * 화면이 설명하지 못한다(§10-A19).
 */
function capacityNote({ total, diff, count, unsetCount }) {
  if (total === 0) return unsetCount > 0 ? '합계 제외됨' : '미배정';
  if (diff > 0) return `초과 ${diff}%p · ${count}개`;
  return `여유 ${-diff}%p · ${count}개`;
}

export default function SquadCanvas({
  squads = [],
  people = [],
  /** `p013` — 스쿼드 원장 생성·수정·상태 전환·삭제 (hr_admin 전용). */
  canManageLedger = false,
  /** 할당 편집 버튼 노출 여부 (hr_admin·manager). */
  canEditAssignments = false,
  /**
   * manager 의 편집 범위 — 배정 대상 **구성원**의 id 목록.
   * `null` 이면 전체 편집 가능(hr_admin). 빈 배열이면 편집 대상 없음.
   */
  editableUserIds = null,
  /**
   * 로그인한 본인의 userId (§5-3.7).
   *
   * 캐파 사용의 **소유자는 본인**이라, 이 값이 있어야 «내 행은 역할·편집 모드와 무관하게
   * 열린다» 를 판정할 수 있다. 없으면(비로그인 미리보기 등) 본인 경로 없이 관리자
   * 규칙만 남는다 — 「내 캐파」 배너도 뜨지 않는다.
   */
  currentUserId = null,
  loading = false,
  error = null,
  onRetry,
  /** 서버가 돌려준 폼 인라인 에러 — `{ name?, endDate? }` (409/422). */
  serverFormErrors = null,
  submitting = false,
  history = null,
  historyLoading = false,
  historyError = null,
  onLoadHistory,
  onCreateSquad,
  onUpdateSquad,
  onDeleteSquad,
  onChangeStatus,
  onUpsertMember,
  onRemoveMember,
  onSetLead,
  onMemberClick,
  onSubTabChange,
  // 조직 축 탭 노출 여부. OrgChartCanvas 와 같은 계약 (pivit-work PW-249).
  showProjectTab = true,
}) {
  const [hov, setHov] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [popover, setPopover] = useState(null); // { squadId, userId, x, y }
  const [addTarget, setAddTarget] = useState(null);
  const [addQuery, setAddQuery] = useState('');
  const [squadForm, setSquadForm] = useState(null);
  const [localErr, setLocalErr] = useState({});
  const [moreMenu, setMoreMenu] = useState(null);
  const [histFor, setHistFor] = useState(null);
  const [delAsk, setDelAsk] = useState(null); // { squadId, typed }
  const [statusMenu, setStatusMenu] = useState(null);
  const [statusAsk, setStatusAsk] = useState(null); // { squadId, to, kind, overloads }

  /**
   * Escape 로 카드 위 레이어를 닫는다 (§4 — 메뉴·팝오버는 외부 클릭·Escape 로 닫힘).
   * 클릭아웃 배경만 두면 키보드로는 빠져나올 수 없고, 열린 배경이 다음 클릭을 전부
   * 가로채 화면이 멈춘 것처럼 보인다. 확인 모달은 파괴적 작업이라 Escape 로 닫지 않는다.
   */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setStatusMenu(null);
      setMoreMenu(null);
      setAddTarget(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const peopleById = useMemo(() => {
    const map = new Map();
    people.forEach((p) => map.set(p.id, p));
    return map;
  }, [people]);
  const personOf = useCallback((id) => peopleById.get(id) || null, [peopleById]);
  const nameOf = useCallback(
    (id) => peopleById.get(id)?.name || '알 수 없는 구성원',
    [peopleById],
  );

  /**
   * 툴팁에 쓰는 캐파 문구. **미설정과 0% 를 구분한다** — 미설정은 합계에서 빠져 있으므로
   * 「0%」 로 쓰면 왜 합계가 낮은지 설명이 사라진다(§5-3.7).
   */
  const capText = (m) => (isCapacityUnset(m)
    ? '미설정 — 합계에서 제외됨'
    : `${m.allocationPct}%`);

  // ── 권한 ──
  // 원장 관리(p013)는 **편집 모드와 무관하게 상시** 동작한다 — 스쿼드가 0건이면 편집할
  // 대상 자체가 없어 편집 모드 진입이 무의미하고, 상태 전환은 '할당' 이 아니라 조직
  // 라이프사이클 관리이기 때문이다(§2).
  const ledgerReady = canManageLedger && !!onCreateSquad;
  const isEditing = editMode && canEditAssignments;
  const editableSet = useMemo(
    () => (editableUserIds === null ? null : new Set(editableUserIds)),
    [editableUserIds],
  );
  const inScope = useCallback(
    (userId) => editableSet === null || editableSet.has(userId),
    [editableSet],
  );
  /**
   * 🔴 **두 축은 소유자가 다르므로 권한도 두 갈래다**(§5-3.7).
   *
   *  · ① 비중 — **조직**이 정한다. 편집 모드 + 조직 범위로만 판정하며, 대상이 본인이라는
   *    사실은 권한을 주지 않는다. 리드 지정·배정 해제도 조직의 결정이라 여기를 따른다.
   *  · ② 캐파 사용 — **본인**이 정한다. 자기 행이면 역할·편집 모드와 무관하게 열린다.
   *    `member` 가 자기 캐파를 정하는 것이 정상 경로다.
   *
   * 이 갈림이 무너지면 관리자가 남의 시간을 추정해 적는 구조로 돌아간다.
   */
  const canEditShareOf = useCallback(
    (userId) => isEditing && inScope(userId) && !!onUpsertMember,
    [isEditing, inScope, onUpsertMember],
  );
  const isSelfRow = useCallback(
    (userId) => !!currentUserId && userId === currentUserId,
    [currentUserId],
  );
  const canEditCapacityOf = useCallback(
    (userId) => (!!onUpsertMember && isSelfRow(userId)) || canEditShareOf(userId),
    [onUpsertMember, isSelfRow, canEditShareOf],
  );
  /** 팝오버를 열 수 있는가 — 둘 중 하나라도 편집 가능하면 연다. */
  const canEditMemberOf = useCallback(
    (userId) => canEditShareOf(userId) || canEditCapacityOf(userId),
    [canEditShareOf, canEditCapacityOf],
  );

  /**
   * 서버가 준 필드 에러는 **그 입력값에 대한 판정**이다. 사용자가 값을 고치기 시작하면
   * 낡은 정보가 되므로 즉시 치운다 — 안 그러면 새 이름을 다 입력한 뒤에도 "같은 이름의
   * 스쿼드가 이미 있습니다" 가 남아 무엇이 잘못됐는지 오해하게 된다.
   * 새 에러가 오면(객체 신원이 바뀌면) 다시 보인다.
   */
  const [dismissedErrors, setDismissedErrors] = useState(null);
  const activeServerErrors =
    serverFormErrors && dismissedErrors !== serverFormErrors ? serverFormErrors : null;
  const errors = { ...localErr, ...(activeServerErrors || {}) };

  const editForm = useCallback(
    (updater) => {
      setSquadForm(updater);
      setLocalErr({});
      setDismissedErrors(serverFormErrors ?? null);
    },
    [serverFormErrors],
  );

  // ── 생성·수정 폼 ──
  const openSquadForm = () => {
    const used = new Set(squads.map((s) => s.color));
    setSquadForm({
      mode: 'create',
      name: '', mission: '', startDate: todayIso(), endDate: '',
      color: SQUAD_PALETTE.find((c) => !used.has(c)) || SQUAD_PALETTE[0],
      leadUserId: null,
    });
    setLocalErr({});
  };

  const openSquadEdit = (sq) => {
    setSquadForm({
      mode: 'edit', id: sq.id,
      name: sq.name, mission: sq.mission || '',
      startDate: sq.startDate, endDate: sq.endDate || '', color: sq.color,
    });
    setLocalErr({});
    setMoreMenu(null);
  };

  const closeSquadForm = () => { setSquadForm(null); setLocalErr({}); };

  const submitSquadForm = async () => {
    const f = squadForm;
    const name = f.name.trim();
    const errs = {};
    if (!name) errs.name = '스쿼드명을 입력해주세요';
    // 동명 검사 — 수정 시에는 자기 자신을 비교에서 제외한다(서버 409 를 앞당겨 잡는다)
    else if (squads.some((s) => s.id !== f.id && s.name.trim().toLowerCase() === name.toLowerCase())) {
      errs.name = '같은 이름의 스쿼드가 이미 있습니다';
    }
    if (f.endDate && f.endDate < f.startDate) errs.endDate = '종료일은 시작일 이후여야 합니다';
    if (Object.keys(errs).length) { setLocalErr(errs); return; }

    const payload = {
      name,
      mission: f.mission.trim() || null,
      color: f.color,
      startDate: f.startDate,
      endDate: f.endDate || null,
    };

    // status 는 어느 경로로도 보내지 않는다 — 전이 규칙 우회 차단(§7)
    const ok = f.mode === 'edit'
      ? await onUpdateSquad?.(f.id, payload)
      : await onCreateSquad?.({ ...payload, leadUserId: f.leadUserId || undefined });
    if (ok !== false) closeSquadForm();
  };

  // ── 상태 전이 ──
  const transitionsFor = (sq) => (ledgerReady && onChangeStatus ? transitionsFrom(sq.status) : []);

  // 재개(완료→진행중) 시 이 스쿼드 계획%가 합계에 다시 더해져 과부하가 새로 생길 수 있다.
  // 캐파 미설정 배정은 지금도 합계 밖이라 재개해도 더해지지 않는다.
  const reopenOverloads = (sq) => (sq.members || [])
    .map((m) => ({
      userId: m.userId,
      total: plannedTotalPct(squads, m.userId) + (isCapacityUnset(m) ? 0 : m.allocationPct),
    }))
    .filter((x) => x.total > CAPACITY);

  const applyStatus = async (squadId, to) => {
    setStatusMenu(null);
    setStatusAsk(null);
    await onChangeStatus?.(squadId, to);
  };

  // 재개·보관은 확인 모달을 거친다. 나머지(시작·완료·복원)는 즉시 전환
  const requestStatus = (sq, to) => {
    if (to === 'active' && sq.status === 'done') {
      setStatusAsk({ squadId: sq.id, to, kind: 'reopen', overloads: reopenOverloads(sq) });
    } else if (to === 'archived') {
      setStatusAsk({ squadId: sq.id, to, kind: 'archive', overloads: [] });
    } else {
      applyStatus(sq.id, to);
    }
    setStatusMenu(null);
  };

  // ── 완료 전환 넛지: 종료일이 지난 진행중 스쿼드. 자동 전이는 하지 않는다(안내만) ──
  const overdueSquads = ledgerReady
    ? squads.filter((sq) => sq.status === 'active' && sq.endDate && sq.endDate < todayIso())
    : [];

  // ── 배정 ──
  // 신규 배정은 **아무 값도 보내지 않는다** — 서버가 비중 0(미배분) · 캐파 미설정으로
  // 만든다(§5-3.7). 여기서 기본 캐파를 채우면 관리자가 남의 시간에 숫자를 적는 것이 된다.
  const assign = (squadId, userId) => onUpsertMember?.(squadId, userId, {});
  // 🔴 두 축은 각각 **자기 필드만** 보낸다. 한 호출에 둘을 같이 실으면 슬라이더 하나를
  // 움직였을 때 다른 값이 함께 저장되고, 그 순간 두 축이 다시 묶인다(§10-A17).
  const setShare = (squadId, userId, share) =>
    onUpsertMember?.(squadId, userId, { sharePct: share });
  const setPct = (squadId, userId, pct) =>
    onUpsertMember?.(squadId, userId, { allocationPct: pct });
  const unassign = (squadId, userId) => {
    setPopover(null);
    return onRemoveMember?.(squadId, userId);
  };
  // 리드는 스쿼드당 1명 — 지정 시 기존 리드는 서버가 같은 트랜잭션으로 강등한다
  const toggleLead = (squadId, userId, isLead) => onSetLead?.(squadId, isLead ? null : userId);

  // ── 매트릭스 행: 읽기 = 배정 1건 이상 / 편집 = 조직 전체 ──
  const assignedIds = useMemo(
    () => [...new Set(squads.flatMap((sq) => (sq.members || []).map((m) => m.userId)))],
    [squads],
  );
  const rowIds = useMemo(() => {
    if (!isEditing) return assignedIds.filter((id) => peopleById.has(id));
    const ordered = people.map((p) => p.id);
    // 명부에 없는 배정(퇴사 등)도 행을 잃지 않게 뒤에 덧붙인다
    return [...ordered, ...assignedIds.filter((id) => !peopleById.has(id))];
  }, [isEditing, assignedIds, people, peopleById]);

  const overloaded = rowIds.filter((id) => plannedTotalPct(squads, id) > CAPACITY);

  /**
   * 「내 캐파」 요약 배너의 재료 (§5-3.7).
   *
   * `target` = CTA 가 열 배정. **첫 미설정**을 먼저 열고, 미설정이 없으면 캐파가 가장 큰
   * 배정을 연다 — 배너를 눌렀는데 아무 일도 안 일어나는 상태를 만들지 않는다.
   * 활성 스쿼드 배정이 0건이면 배너 자체를 렌더하지 않는다(보여줄 값이 없다).
   */
  const myCapacity = useMemo(() => {
    if (!currentUserId) return null;
    const active = squads.filter((sq) => isCountedStatus(sq.status));
    const mine = active.filter((sq) => (sq.members || []).some((m) => m.userId === currentUserId));
    if (mine.length === 0) return null;

    const total = plannedTotalPct(squads, currentUserId);
    const unset = unsetCapacityCount(squads, currentUserId);
    const memberIn = (sq) => (sq.members || []).find((m) => m.userId === currentUserId);
    const target = mine.find((sq) => isCapacityUnset(memberIn(sq)))
      ?? [...mine].sort((a, b) => (memberIn(b)?.allocationPct || 0) - (memberIn(a)?.allocationPct || 0))[0];

    return { total, unset, target, diff: total - CAPACITY, state: capacityState(total) };
  }, [squads, currentUserId]);

  const popSquad = popover && squads.find((sq) => sq.id === popover.squadId);
  const popAssign = popSquad && (popSquad.members || []).find((m) => m.userId === popover.userId);

  const candidatesFor = (sq) => {
    const q = addQuery.trim().toLowerCase();
    return people.filter(
      (n) => !(sq.members || []).some((m) => m.userId === n.id)
        && inScope(n.id)
        && (q === '' || `${n.name} ${n.nameEn || ''} ${n.team || ''} ${n.dept || ''} ${n.title || ''}`.toLowerCase().includes(q)),
    );
  };

  // 생성 폼 팀장 후보 — 비활성(퇴사·휴직) 구성원은 제외한다(서버도 422 로 재검증)
  const leadCandidates = people.filter(
    (n) => n.employmentStatus !== 'resigned' && n.employmentStatus !== 'on_leave',
  );

  const tabStrip = (
    <div className="tab-nav">
      <span className="tab-inactive" onClick={() => onSubTabChange && onSubTabChange('orgchart')}>조직도</span>
      {showProjectTab && (
        <span className="tab-inactive" onClick={() => onSubTabChange && onSubTabChange('project')}>프로젝트</span>
      )}
      <span className="tab-active">스쿼드</span>
    </div>
  );

  return (
    <div className="content-area pj-content-area" data-testid="squad-canvas">
      <div className="content-canvas">
        <div className="pj-header">
          {tabStrip}
          <div className="header-subtitle">
            <b>스쿼드</b>
            <span className="dot">&#8729;</span>
            <span className="brand-count">{squads.length}개</span>
          </div>
        </div>

        <div className="pj-body">
          {/* 헤더 + 편집 모드 토글 */}
          <div className="sq-toolbar">
            <div>
              <p className="sq-toolbar-title">스쿼드</p>
              <p className="sq-toolbar-desc">
                {isEditing
                  ? (editableSet === null
                    ? '전체 스쿼드의 팀원 할당을 편집할 수 있습니다'
                    : '내 조직 구성원의 할당만 편집할 수 있습니다 (범위 밖 셀은 비활성)')
                  : '기능 조직과 평행한 한시 조직 — 스쿼드 카드와 배치 매트릭스로 구성을 확인합니다'}
              </p>
            </div>
            <div className="sq-toolbar-actions">
              {ledgerReady && !squadForm && (
                <button
                  type="button" onClick={openSquadForm} data-testid="squad-create-open"
                  className="sq-btn sq-btn-dashed"
                >
                  <PlusIcon size={14} /> 스쿼드 만들기
                </button>
              )}
              {canEditAssignments && (
                <button
                  type="button" data-testid="squad-edit-toggle"
                  className={`sq-btn sq-btn-toggle${editMode ? ' is-on' : ''}`}
                  onClick={() => { setEditMode((v) => !v); setPopover(null); setAddTarget(null); }}
                >
                  {editMode ? <CheckIcon size={14} /> : <EditIcon size={14} />}
                  {editMode ? '편집 완료' : '할당 편집'}
                </button>
              )}
            </div>
          </div>

          {loading && (
            <div className="sq-loading">스쿼드 정보를 불러오는 중…</div>
          )}

          {!loading && error && (
            <div className="sq-banner sq-banner-error" data-testid="squad-error-banner">
              <div className="sq-banner-title">스쿼드 정보를 불러오지 못했습니다</div>
              {onRetry && (
                <button type="button" onClick={onRetry} className="sq-btn sq-btn-sm sq-btn-outline">
                  다시 시도
                </button>
              )}
            </div>
          )}

          {!loading && !error && (
            <>
              {/* 완료 전환 넛지 — 자동 전이는 하지 않고 안내만. p013 미보유자에게는 미노출 */}
              {overdueSquads.length > 0 && (
                <div className="sq-banner sq-banner-warn" data-testid="squad-overdue-banner">
                  <div className="sq-banner-title">
                    <WarningIcon size={14} /> 종료일이 지난 진행중 스쿼드 {overdueSquads.length}건
                  </div>
                  <div className="sq-banner-body">
                    {overdueSquads.map((sq) => `${sq.name} (${fmtYmd(sq.endDate)})`).join(' · ')}
                  </div>
                  <div className="sq-banner-note">
                    상태 배지에서 완료로 전환하세요 — 자동으로 바뀌지 않습니다
                  </div>
                </div>
              )}

              {/* 스쿼드 0건 빈 상태 — 실제 고객 조직은 전부 여기서 시작한다 */}
              {squads.length === 0 && !squadForm && (
                <div className="sq-empty" data-testid="squad-empty-state">
                  <p className="sq-empty-title">운영 중인 스쿼드가 없습니다</p>
                  {ledgerReady ? (
                    <>
                      <p className="sq-empty-desc">첫 스쿼드를 만들어 팀원을 배정해보세요</p>
                      <button
                        type="button" onClick={openSquadForm} data-testid="squad-create-open-empty"
                        className="sq-btn sq-btn-primary"
                      >
                        <PlusIcon size={14} /> 스쿼드 만들기
                      </button>
                    </>
                  ) : (
                    <p className="sq-empty-desc">관리자가 스쿼드를 만들면 표시됩니다</p>
                  )}
                </div>
              )}

              {/* 카드 그리드 — 프로젝트 탭과 같은 격자 */}
              <div className="pj-cards-grid">
                {squadForm && squadForm.mode === 'create' && (
                  <SquadFormCard
                    form={squadForm} setForm={editForm} errors={errors}
                    palette={SQUAD_PALETTE} onSubmit={submitSquadForm} onCancel={closeSquadForm}
                    leadCandidates={leadCandidates} submitting={submitting}
                  />
                )}

                {squads.map((sq) => {
                  if (squadForm && squadForm.mode === 'edit' && squadForm.id === sq.id) {
                    return (
                      <SquadFormCard
                        key={sq.id}
                        form={squadForm} setForm={editForm} errors={errors}
                        palette={SQUAD_PALETTE} onSubmit={submitSquadForm} onCancel={closeSquadForm}
                        leadCandidates={leadCandidates} submitting={submitting}
                      />
                    );
                  }
                  const members = sq.members || [];
                  const lead = leadOf(sq);
                  const candidates = addTarget === sq.id ? candidatesFor(sq) : [];
                  const stBadge = squadStatusMeta(sq.status);
                  const sqTransitions = transitionsFor(sq);
                  const canTransition = sqTransitions.length > 0;
                  // 이 카드 위에 메뉴·팝오버가 떠 있는가.
                  // hover 의 `transform` 은 **새 스태킹 컨텍스트를 만든다** — 그 안에 갇히면
                  // 메뉴의 z 를 아무리 올려도 사이드바를 넘지 못하고, `position: fixed` 클릭아웃
                  // 배경마저 카드 기준으로 잡혀 화면 전체를 덮지 못한다. 그래서 오버레이가 열린
                  // 동안에는 lift 를 끄고 그림자로만 hover 를 표현한다.
                  const overlayOpen = moreMenu === sq.id || statusMenu === sq.id
                    || histFor === sq.id || addTarget === sq.id;

                  return (
                    <div
                      key={sq.id} data-testid={`squad-card-${sq.id}`}
                      onMouseEnter={() => setHov(sq.id)} onMouseLeave={() => setHov(null)}
                      className={[
                        'pj-card sq-card',
                        addTarget === sq.id ? 'is-open' : '',
                        sq.status === 'archived' ? 'is-archived' : '',
                      ].filter(Boolean).join(' ')}
                      style={{
                        // 스쿼드 색은 데이터라 토큰으로 표현할 수 없다 — hover 강조만 인라인
                        boxShadow: hov === sq.id ? `0 6px 24px ${sq.color}24` : undefined,
                        transform: hov === sq.id && !overlayOpen ? 'translateY(-2px)' : 'none',
                      }}
                    >
                      <span className="sq-card-strip" style={{ background: sq.color }} />

                      <div className="sq-card-actions">
                        {/* 상태 배지 = 전환 트리거 (p013). 편집 모드와 무관하게 동작.
                            부품은 프로젝트 카드의 상태 표시와 같은 것을 쓴다. */}
                        <span
                          data-testid={`squad-status-${sq.id}`}
                          className={`pj-card-status sq-status${canTransition ? ' is-clickable' : ''}`}
                          onClick={() => canTransition && setStatusMenu((m) => (m === sq.id ? null : sq.id))}
                          title={canTransition ? '상태 변경' : undefined}
                          style={{ color: stBadge.textColor }}
                        >
                          <span className="pj-status-dot" style={{ background: stBadge.dotColor }} />
                          <span>{stBadge.label}</span>
                          {canTransition && <ChevronDownIcon size={12} />}
                        </span>

                        {ledgerReady && (
                          <span
                            data-testid={`squad-more-${sq.id}`}
                            className="sq-more"
                            onClick={() => setMoreMenu((m) => (m === sq.id ? null : sq.id))}
                            title="스쿼드 관리"
                          >
                            <MoreIcon size={16} />
                          </span>
                        )}

                        {moreMenu === sq.id && ledgerReady && (
                          <>
                            <div onClick={() => setMoreMenu(null)} style={{ position: 'fixed', inset: 0, zIndex: SQUAD_MENU_BACKDROP_Z }} />
                            <div className="sq-menu" style={{ zIndex: SQUAD_MENU_Z }}>
                              <div
                                data-testid={`squad-more-edit-${sq.id}`} onClick={() => openSquadEdit(sq)}
                                className="sq-menu-item"
                              >수정</div>
                              <div
                                data-testid={`squad-more-history-${sq.id}`}
                                onClick={() => { setHistFor(sq.id); setMoreMenu(null); onLoadHistory?.(sq.id); }}
                                className="sq-menu-item"
                              >이력</div>
                              {/* 삭제는 보관 상태에서만 활성 — 운영 중 조직의 실수 삭제 방지(§5-2-B 1번) */}
                              <div
                                data-testid={`squad-more-delete-${sq.id}`}
                                onClick={() => {
                                  if (sq.status === 'archived') { setDelAsk({ squadId: sq.id, typed: '' }); setMoreMenu(null); }
                                }}
                                title={sq.status === 'archived' ? undefined : '보관 상태에서만 삭제할 수 있습니다'}
                                className={`sq-menu-item sq-menu-item-danger${sq.status === 'archived' ? '' : ' is-disabled'}`}
                              >삭제</div>
                            </div>
                          </>
                        )}

                        {histFor === sq.id && (
                          <SquadHistoryPopover
                            squad={sq}
                            rows={history?.[sq.id]}
                            loading={historyLoading}
                            error={historyError}
                            onRetry={() => onLoadHistory?.(sq.id)}
                            onClose={() => setHistFor(null)}
                          />
                        )}

                        {statusMenu === sq.id && canTransition && (
                          <>
                            <div onClick={() => setStatusMenu(null)} style={{ position: 'fixed', inset: 0, zIndex: SQUAD_MENU_BACKDROP_Z }} />
                            <div
                              data-testid={`squad-status-menu-${sq.id}`}
                              className="sq-menu"
                              style={{ zIndex: SQUAD_MENU_Z }}
                            >
                              {/* 허용된 전이만 렌더 — 차단 전이는 비활성 항목으로도 보여주지 않는다 */}
                              {sqTransitions.map((t) => (
                                <div
                                  key={t.to} data-testid={`squad-transition-${sq.id}-${t.to}`}
                                  onClick={() => requestStatus(sq, t.to)}
                                  className="sq-menu-item"
                                >
                                  {t.label} <span className="sq-menu-item-to">→ {squadStatusLabel(t.to)}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>

                      <div className="pj-card-info">
                        <p className="pj-card-name">{sq.name}</p>
                        <p className="pj-card-desc">{sq.mission}</p>
                      </div>

                      {/* 기간 (한시 조직) */}
                      <div className="sq-period">
                        <CalendarIcon size={14} /> {fmtYmd(sq.startDate)} – {fmtYmd(sq.endDate)}
                      </div>

                      {/* 팀원 리소스 구성 — 스쿼드 100 기준 (매트릭스의 캐파 기준값과 분모가 다름) */}
                      <SquadComposition squad={sq} members={members} personOf={personOf} />

                      {!isEditing ? (
                        <div className="sq-members">
                          {/* 시안은 아바타를 -6px 로 겹쳐 쌓았지만, 그건 라벨이 'KR' 같은
                              2글자 코드일 때의 간격이다. 실제 명부는 '박소율' 처럼 3~4글자
                              한글 이름이라 겹치면 뒷글자가 가려 읽히지 않는다 — 겹치는 대신
                              띄우고 넘치면 줄바꿈한다(카드당 인원은 많아야 한 자릿수). */}
                          <div className="sq-avatar-group">
                            {members.map((mm) => {
                              const p = personOf(mm.userId);
                              const tint = p?.color || null;
                              const label = p?.avatar || nameOf(mm.userId).slice(0, 2);
                              return (
                                <div
                                  key={mm.userId}
                                  className={`sq-avatar-wrap${p && onMemberClick ? ' is-clickable' : ''}`}
                                  onClick={() => p && onMemberClick?.(p)}
                                  title={`${nameOf(mm.userId)} — 스쿼드 내 비중 ${mm.sharePct || 0}% · 개인 캐파 사용 ${capText(mm)}${mm.role === 'lead' ? ' · 리드' : ''}`}
                                >
                                  <div
                                    className="sq-avatar"
                                    style={{
                                      fontSize: avatarFontPx(label, 24),
                                      ...(tint
                                        ? { background: `${tint}24`, color: tint }
                                        : { background: 'var(--bg-active)', color: 'var(--text-secondary)' }),
                                    }}
                                  >{label}</div>
                                  {mm.role === 'lead' && (
                                    <span className="sq-lead-mark sq-lead-badge"><LeadStarIcon size={11} /></span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          <span className="sq-member-count">
                            {members.length}명 · 리드{' '}
                            {lead
                              ? nameOf(lead.userId)
                              : <em className="sq-unset">미지정</em>}
                          </span>
                        </div>
                      ) : (
                        <div>
                          <div className="sq-chip-row">
                            {members.map((mm) => {
                              const p = personOf(mm.userId);
                              const editable = canEditMemberOf(mm.userId);
                              return (
                                <div
                                  key={mm.userId}
                                  data-testid={`squad-chip-${sq.id}-${mm.userId}`}
                                  className={[
                                    'sq-chip',
                                    mm.role === 'lead' ? 'is-lead' : '',
                                    editable ? 'is-clickable' : 'is-locked',
                                  ].filter(Boolean).join(' ')}
                                  onClick={(e) => editable && setPopover({
                                    squadId: sq.id, userId: mm.userId, x: e.clientX, y: e.clientY + 10,
                                  })}
                                  title={`${nameOf(mm.userId)} — 스쿼드 내 비중 ${mm.sharePct || 0}% · 개인 캐파 사용 ${capText(mm)}${editable ? '\n클릭: 비중·캐파·리드 편집' : '\n편집 권한 없음 (내 조직 아님)'}`}
                                >
                                  {mm.role === 'lead' && (
                                    <span className="sq-lead-mark"><LeadStarIcon size={11} /></span>
                                  )}
                                  <span className="sq-chip-name">{nameOf(mm.userId)}</span>
                                  {/* 칩에도 두 축을 함께 — 비중(강조) + 캐파(괄호).
                                      한 값만 보이면 나머지를 보는 사람이 추측으로 채운다 */}
                                  <span
                                    className="sq-chip-pct"
                                    style={{ color: p?.color || 'var(--text-tertiary)' }}
                                  >
                                    {mm.sharePct || 0}%
                                  </span>
                                  <span className="sq-chip-cap">
                                    (캐파 {isCapacityUnset(mm) ? '—' : mm.allocationPct})
                                  </span>
                                  {editable && onRemoveMember && (
                                    <span
                                      className="sq-chip-remove"
                                      onClick={(e) => { e.stopPropagation(); unassign(sq.id, mm.userId); }}
                                      title="배정 해제"
                                    >
                                      <CloseIcon size={11} />
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                            {members.length === 0 && (
                              <span className="sq-chip-empty">배정된 팀원이 없습니다</span>
                            )}
                          </div>

                          {onUpsertMember && (addTarget === sq.id ? (
                            <div className="sq-add-wrap">
                              <input
                                autoFocus value={addQuery} aria-label="팀원 검색"
                                className="sq-add-input"
                                onChange={(e) => setAddQuery(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Escape') { setAddTarget(null); setAddQuery(''); } }}
                                placeholder="이름 · 팀 · 직함 검색…"
                              />
                              <div className="sq-add-list">
                                {candidates.map((n) => (
                                  <div
                                    key={n.id} data-testid={`squad-add-candidate-${n.id}`}
                                    className="sq-add-item"
                                    onClick={() => { assign(sq.id, n.id); setAddTarget(null); setAddQuery(''); }}
                                  >
                                    <div
                                      className="sq-avatar"
                                      style={{
                                        fontSize: avatarFontPx(n.avatar || n.name.slice(0, 2), 24),
                                        ...(n.color
                                          ? { background: `${n.color}24`, color: n.color }
                                          : { background: 'var(--bg-active)', color: 'var(--text-secondary)' }),
                                      }}
                                    >{n.avatar || n.name.slice(0, 2)}</div>
                                    <div>
                                      <span className="sq-add-name">{n.name}</span>{' '}
                                      <span className="sq-add-meta">{n.title} · {n.team}</span>
                                    </div>
                                  </div>
                                ))}
                                {candidates.length === 0 && (
                                  <div className="sq-add-none">
                                    추가할 수 있는 구성원이 없습니다{editableSet !== null ? ' (내 조직 범위 밖)' : ''}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button" data-testid={`squad-add-member-${sq.id}`}
                              className="sq-btn sq-btn-sm sq-btn-dashed"
                              onClick={() => { setAddTarget(sq.id); setAddQuery(''); }}
                            >
                              <PlusIcon size={12} /> 팀원 추가
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ── 멤버 × 스쿼드 배치 매트릭스 ── */}
              {squads.length > 0 && (
                <div className="sq-panel">
                  <div className="sq-panel-head">
                    <p className="pj-table-title">멤버 × 스쿼드 배치</p>
                    <p className="pj-table-subtitle">
                      {isEditing
                        ? '빈 셀 클릭 = 배정 (비중 미배분 · 캐파 미설정) · 배정 셀 클릭 = 비중·캐파·리드 편집'
                        : '셀 윗줄 = 개인 캐파 사용(합계의 재료) · 아랫줄 = 스쿼드 내 비중(합계 밖)'}
                    </p>
                  </div>

                  {/* ── 「내 캐파」 요약 배너 (§5-3.7) ──
                      캐파의 소유자는 본인이므로, 본인이 자기 값을 어디서 정하는지가 화면에
                      늘 보여야 한다. 관리자용 [할당 편집] 토글과 무관하게 상시 노출한다. */}
                  {myCapacity && (
                    <div className="sq-mycap" data-testid="squad-my-capacity-banner">
                      <span className="sq-mycap-label">내 캐파 사용</span>
                      <span className="sq-mycap-total" style={{ color: myCapacity.state.color }}>
                        {myCapacity.total}
                      </span>
                      <span className="sq-mycap-max">/ 100</span>
                      <span className="sq-mycap-note">
                        {myCapacity.diff > 0
                          ? `초과 ${myCapacity.diff}%p`
                          : `여유 ${-myCapacity.diff}%p`}
                        {myCapacity.unset > 0 && (
                          <span className="sq-mycap-unset"> · 미설정 {myCapacity.unset}곳</span>
                        )}
                      </span>
                      <span className="sq-mycap-owner">
                        이 값은 <b>본인이 정한다</b> — 스쿼드 볼륨이 나오기 전까지 자동 계산하지 않는다
                      </span>
                      {myCapacity.target && (
                        <button
                          type="button"
                          className="sq-btn sq-btn-sm sq-btn-primary"
                          data-testid="squad-my-capacity-cta"
                          onClick={() => setPopover({
                            squadId: myCapacity.target.id,
                            userId: currentUserId,
                            x: window.innerWidth / 2,
                            y: 220,
                          })}
                        >
                          {myCapacity.unset > 0 ? '내 캐파 설정 →' : '조정 →'}
                        </button>
                      )}
                    </div>
                  )}

                  {/* 과부하 경고 배너 — 차단하지 않고 현실을 먼저 드러낸다 */}
                  {overloaded.length > 0 && (
                    <div
                      className="sq-banner sq-banner-error sq-banner-flush"
                      data-testid="squad-overload-banner"
                    >
                      <span className="sq-banner-title">
                        <WarningIcon size={14} /> 과부하
                      </span>
                      <span className="sq-banner-body">
                        {overloaded.map((id) => `${nameOf(id)} ${plannedTotalPct(squads, id)}%`).join(' · ')}
                        {' — 개인 캐파 100을 넘겨 배정됐습니다 (저장은 허용 · 조정은 사람이 결정)'}
                      </span>
                    </div>
                  )}

                  <div className="sq-table-scroll">
                    <table className="pj-table sq-table">
                      <thead>
                        <tr>
                          <th className="pj-th sq-th-name">멤버</th>
                          {squads.map((sq) => (
                            <th key={sq.id} className="pj-th sq-th-col">
                              <span className="sq-th-col-inner">
                                <span className="pj-th-dot" style={{ background: sq.color }} />
                                <span className="pj-th-label">{sq.name}</span>
                              </span>
                            </th>
                          ))}
                          <th className="pj-th sq-th-cap">
                            캐파 사용
                            <span className="sq-th-cap-basis">내 캐파 100 기준</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rowIds.map((userId) => {
                          const p = personOf(userId);
                          const count = squadCountOf(squads, userId);
                          const total = plannedTotalPct(squads, userId);
                          const segments = planSegments(squads, userId);
                          const cst = capacityState(total);
                          const diff = total - CAPACITY;
                          // 미설정은 합계에서 빠져 있다 — 합계가 낮은 이유를 화면이 스스로 말한다
                          const unsetCount = unsetCapacityCount(squads, userId);
                          const clickable = !!(p && onMemberClick);
                          const rowLabel = p?.avatar || nameOf(userId).slice(0, 2);
                          return (
                            <tr key={userId} data-testid={`squad-matrix-row-${userId}`}>
                              <td className="pj-td">
                                <div
                                  className={`sq-name-cell${clickable ? ' is-clickable' : ''}`}
                                  onClick={() => p && onMemberClick?.(p)}
                                >
                                  <span
                                    className="pj-member-avatar pj-member-initials sq-avatar-lg"
                                    style={{
                                      fontSize: avatarFontPx(rowLabel, 40),
                                      ...(p?.color
                                        ? { background: `${p.color}24`, color: p.color, borderColor: 'transparent' }
                                        : {}),
                                    }}
                                  >{rowLabel}</span>
                                  <span className="pj-member-name">{nameOf(userId)}</span>
                                  {isEditing && !inScope(userId) && (
                                    <span className="sq-lock" title="편집 권한 없음 (내 조직 아님)">
                                      <LockIcon size={13} />
                                    </span>
                                  )}
                                </div>
                              </td>
                              {squads.map((sq) => {
                                const mm = (sq.members || []).find((x) => x.userId === userId);
                                const editable = canEditMemberOf(userId);
                                // 🔴 **배정을 새로 만드는 것은 조직의 결정**이다(§5-3.7) —
                                // 본인 여부로 열리는 것은 이미 있는 내 배정의 캐파뿐이다.
                                // 서버도 같은 규칙이라, 여기서 열어 두면 403 만 돌아온다.
                                const canAssign = canEditShareOf(userId);
                                const isLead = mm?.role === 'lead';
                                const capUnset = !!mm && isCapacityUnset(mm);
                                const mine = isSelfRow(userId);
                                return (
                                  <td key={sq.id} className="pj-td sq-td-cell">
                                    {mm ? (
                                      <div
                                        data-testid={`squad-cell-${sq.id}-${userId}`}
                                        className={[
                                          'sq-cell',
                                          editable ? 'is-clickable' : '',
                                          // 미설정은 **형태**로 말한다 — 색이 죽어도 점선은 남는다(§5-3.7)
                                          capUnset ? 'is-cap-unset' : '',
                                        ].filter(Boolean).join(' ')}
                                        onClick={(e) => editable && setPopover({
                                          squadId: sq.id, userId, x: e.clientX + 8, y: e.clientY + 8,
                                        })}
                                        title={[
                                          `${nameOf(userId)} · ${sq.name}`,
                                          `개인 캐파 사용 ${capText(mm)} (내 캐파 100 기준 — 오른쪽 합계의 재료)`,
                                          `스쿼드 내 비중 ${mm.sharePct || 0}% (이 스쿼드 100 기준 — 합계에 들어가지 않음)`,
                                          mm.capacitySetBy === 'manager' ? '관리자가 조정한 값' : '',
                                          isLead ? '리드' : '',
                                          cellHint(mine, editable),
                                        ].filter(Boolean).join('\n')}
                                        style={capUnset
                                          ? undefined
                                          : { background: `${sq.color}1F`, borderColor: `${sq.color}47` }}
                                      >
                                        {/* 윗줄 = 캐파 사용(합계의 재료) · 아랫줄 = 스쿼드 내 비중(합계 밖).
                                            한 값만 보이면 나머지를 보는 사람이 추측으로 채우고,
                                            그 추측이 두 축을 하나로 뭉갠다(§5-3.2) */}
                                        <span className="sq-cell-top">
                                          {isLead && (
                                            <span className="sq-lead-mark"><LeadStarIcon size={11} /></span>
                                          )}
                                          {capUnset ? (
                                            <span
                                              className="sq-cell-pct is-unset"
                                              data-testid={`squad-cell-cap-unset-${sq.id}-${userId}`}
                                              title="캐파 사용이 아직 설정되지 않았습니다"
                                            >—</span>
                                          ) : (
                                            <span className="sq-cell-pct" style={{ color: sq.color }}>
                                              {mm.allocationPct}%
                                            </span>
                                          )}
                                          {mm.capacitySetBy === 'manager' && (
                                            <span
                                              className="sq-cell-adjusted"
                                              data-testid={`squad-cell-adjusted-${sq.id}-${userId}`}
                                              title="관리자가 조정한 값입니다"
                                            >조정</span>
                                          )}
                                        </span>
                                        <span
                                          className="sq-cell-share"
                                          data-testid={`squad-cell-share-${sq.id}-${userId}`}
                                        >
                                          {mm.sharePct ? `스쿼드 ${mm.sharePct}%` : '스쿼드 —'}
                                        </span>
                                      </div>
                                    ) : isEditing ? (
                                      <div
                                        data-testid={`squad-empty-cell-${sq.id}-${userId}`}
                                        className={`sq-cell-add${canAssign ? '' : ' is-locked'}`}
                                        onClick={() => canAssign && assign(sq.id, userId)}
                                        title={canAssign
                                          ? `클릭: ${sq.name}에 배정 (비중 미배분 · 캐파 미설정 — 캐파는 본인이 정한다)`
                                          : '편집 권한 없음 (내 조직 아님)'}
                                      >
                                        {canAssign && <PlusIcon size={12} />}
                                      </div>
                                    ) : (
                                      <span className="pj-cell-dot pj-cell-dot-empty" />
                                    )}
                                  </td>
                                );
                              })}
                              {/* 캐파 사용 — 개인 가용 100 기준. 게이지 + 잔여/초과 %p 를 함께 읽힌다 */}
                              <td className="pj-td sq-td-cap">
                                <div className="sq-cap">
                                  <div className="sq-cap-nums">
                                    {/* 초과 표식 — 「빨강」만으로 초과를 말하지 않기 위한 형태 신호(§5-3.2).
                                        색각 이상·흑백 인쇄에서 숫자색이 죽어도 이 표식은 남는다 */}
                                    {cst.key === 'over' && (
                                      <span
                                        data-testid={`squad-capacity-over-${userId}`}
                                        className="sq-cap-warn"
                                        title="개인 캐파 100 초과"
                                      >
                                        <WarningIcon size={12} />
                                      </span>
                                    )}
                                    <span
                                      data-testid={`squad-capacity-total-${userId}`}
                                      className="sq-cap-total"
                                      style={{ color: cst.color }}
                                    >
                                      {total}
                                    </span>
                                    <span className="sq-cap-max">/ 100</span>
                                  </div>
                                  <CapacityBar segments={segments} total={total} />
                                  <span className={`sq-cap-note${cst.key === 'over' ? ' is-over' : ''}`}>
                                    {unsetCount > 0 && (
                                      <span data-testid={`squad-capacity-unset-${userId}`}>
                                        미설정 {unsetCount}곳 ·{' '}
                                      </span>
                                    )}
                                    {capacityNote({ total, diff, count, unsetCount })}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {rowIds.length === 0 && (
                          <tr>
                            <td colSpan={squads.length + 2} className="sq-empty-row">
                              배정된 팀원이 없습니다 — 「할당 편집」에서 배정해보세요
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* 범례 — 두 분모를 혼동하지 않게 상시 안내한다 */}
                  <div className="sq-legend">
                    <span className="sq-legend-item">
                      <span className="sq-lead-mark"><LeadStarIcon size={12} /></span>
                      리드 (스쿼드당 1명)
                    </span>
                    <span className="sq-legend-item">
                      셀 <b>윗줄</b> = 내 가용 캐파 100 중 이 스쿼드에 쓰는 비율(합산 대상) · <b>아랫줄</b> = 이 스쿼드 100 중 내 비중 —
                      <b> 서로 파생되지 않는 별개 값</b>이다 (스쿼드마다 절대 볼륨이 달라 한쪽에서 다른 쪽을 계산할 수 없다)
                    </span>
                    <span className="sq-legend-item">
                      캐파 사용(완료·보관 스쿼드 제외): <span className="sq-legend-over">&gt;100 초과</span>
                      (빗금 = 캐파 밖) · 100 가득 · 70~99 적정 · &lt;70 여유
                    </span>
                    <span className="sq-legend-item">
                      소유자가 다르다 — <b>비중은 조직</b>이 정하고 <b>캐파 사용은 본인</b>이 정한다 ·
                      점선 <b>—</b> = 미설정(합계 제외) · <b>조정</b> 배지 = 관리자가 대신 정한 값
                    </span>
                    <span className="sq-legend-item sq-legend-faint">
                      스쿼드 내 비중은 「캐파 사용」 합계에 들어가지 않는다 · 실제 투입%는 「리소스 투입현황」 자기신고 값과 별개
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 배정 편집 팝오버 */}
      {popover && popSquad && popAssign && (
        <SquadAssignPopover
          pos={popover}
          squad={popSquad}
          assignment={popAssign}
          personName={nameOf(popover.userId)}
          othersPct={plannedTotalPct(squads.filter((sq) => sq.id !== popSquad.id), popover.userId)}
          othersShare={(popSquad.members || [])
            .filter((m) => m.userId !== popover.userId)
            .reduce((t, m) => t + (m.sharePct || 0), 0)}
          counted={isCountedStatus(popSquad.status)}
          canEditShare={canEditShareOf(popover.userId)}
          canEditCapacity={canEditCapacityOf(popover.userId)}
          isSelf={isSelfRow(popover.userId)}
          onSetShare={(share) => setShare(popover.squadId, popover.userId, share)}
          onSetPct={(pct) => setPct(popover.squadId, popover.userId, pct)}
          onToggleLead={() => toggleLead(popover.squadId, popover.userId, popAssign.role === 'lead')}
          onRemove={() => unassign(popover.squadId, popover.userId)}
          onClose={() => setPopover(null)}
        />
      )}

      {/* 스쿼드 삭제 확인 모달 — 파괴적 작업. 스쿼드명 정확 재입력을 요구한다(§5-2-B) */}
      {delAsk && (() => {
        const sq = squads.find((s) => s.id === delAsk.squadId);
        if (!sq) return null;
        const nameOk = delAsk.typed.trim() === sq.name;
        return (
          <div
            onClick={() => setDelAsk(null)} data-testid="squad-delete-modal"
            className="sq-modal-scrim"
            style={{ position: 'fixed', inset: 0, zIndex: SQUAD_MODAL_Z }}
          >
            <div onClick={(e) => e.stopPropagation()} className="sq-modal">
              <p className="sq-modal-title is-danger">스쿼드를 삭제할까요?</p>

              {/* 사라지는 것 / 남는 것을 나란히 보여준다 */}
              <div className="sq-split">
                <div className="sq-split-col is-loss">
                  <div className="sq-split-title">함께 삭제</div>
                  <div className="sq-split-body">
                    팀원 배정 {(sq.members || []).length}건<br />
                    상태 이력 전체
                  </div>
                </div>
                <div className="sq-split-col is-kept">
                  <div className="sq-split-title">보존</div>
                  <div className="sq-split-body">
                    프로젝트 원장<br />
                    실제 투입% 이력
                  </div>
                </div>
              </div>

              <p className="sq-modal-note">
                되돌릴 수 없습니다. 확인을 위해 스쿼드명 <b>{sq.name}</b> 을(를) 입력하세요.
              </p>
              <input
                autoFocus value={delAsk.typed} aria-label="삭제 확인용 스쿼드명"
                className="sq-modal-input"
                onChange={(e) => setDelAsk((d) => ({ ...d, typed: e.target.value }))}
                placeholder={sq.name}
              />

              <div className="sq-modal-actions">
                <button
                  type="button" data-testid="squad-delete-confirm"
                  className="sq-btn sq-btn-danger"
                  onClick={() => { if (nameOk) { onDeleteSquad?.(sq.id); setDelAsk(null); setMoreMenu(null); } }}
                  disabled={!nameOk}
                >삭제</button>
                <button type="button" onClick={() => setDelAsk(null)} className="sq-btn sq-btn-outline">
                  취소
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 상태 전환 확인 모달 — 재개(과부하 경고)·보관만 거친다 */}
      {statusAsk && (() => {
        const sq = squads.find((s) => s.id === statusAsk.squadId);
        if (!sq) return null;
        const reopen = statusAsk.kind === 'reopen';
        return (
          <div
            onClick={() => setStatusAsk(null)} data-testid="squad-status-modal"
            className="sq-modal-scrim"
            style={{ position: 'fixed', inset: 0, zIndex: SQUAD_MODAL_Z }}
          >
            <div onClick={(e) => e.stopPropagation()} className="sq-modal">
              <p className="sq-modal-title">
                {reopen ? '스쿼드를 재개할까요?' : '스쿼드를 보관할까요?'}
              </p>
              <p className="sq-modal-desc">
                <b>{sq.name}</b>
                {reopen
                  ? ' 을(를) 진행중으로 되돌립니다. 이 스쿼드 배정이 캐파 합계에 다시 포함됩니다.'
                  : ' 을(를) 보관합니다. 목록에서 흐리게 표시되며 캐파 합계에서 계속 제외됩니다. 언제든 복원할 수 있습니다.'}
              </p>

              {/* 재개로 과부하가 새로 생기는 멤버 사전 경고 — 차단하지는 않는다 */}
              {reopen && statusAsk.overloads.length > 0 && (
                <div className="sq-warnbox">
                  <div className="sq-warnbox-title">
                    <WarningIcon size={14} /> 재개하면 {statusAsk.overloads.length}명이 과부하(&gt;100%)가 됩니다
                  </div>
                  <div className="sq-warnbox-body">
                    {statusAsk.overloads.map((o) => `${nameOf(o.userId)} ${o.total}%`).join(' · ')}
                  </div>
                  <div className="sq-warnbox-note">저장은 허용됩니다 — 경고만 표시합니다</div>
                </div>
              )}

              <div className="sq-modal-actions">
                <button
                  type="button" data-testid="squad-status-confirm"
                  // 재개든 보관이든 이 모달의 **확인** 은 주 동작이다 — 연한 배지처럼 두면
                  // 비활성으로 읽혀 사용자가 취소를 누른다. 성격 차이는 본문 문구가 설명한다.
                  className="sq-btn sq-btn-primary"
                  onClick={() => applyStatus(statusAsk.squadId, statusAsk.to)}
                >{reopen ? '재개' : '보관'}</button>
                <button type="button" onClick={() => setStatusAsk(null)} className="sq-btn sq-btn-outline">
                  취소
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
