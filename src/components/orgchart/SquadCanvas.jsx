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
 * 프로젝트 연결(`SquadProject`)은 이 캔버스 범위 밖이다 — 서버 창구가 아직 없다(PW-109/113).
 */

import { useState, useMemo, useCallback } from 'react';
import SquadFormCard from './SquadFormCard.jsx';
import {
  CapacityBar,
  SquadComposition,
  SquadAssignPopover,
  SquadHistoryPopover,
} from './SquadPieces.jsx';
import {
  CAPACITY,
  DEFAULT_ASSIGN_PCT,
  SQUAD_PALETTE,
  SQUAD_MENU_BACKDROP_Z,
  SQUAD_MENU_Z,
  SQUAD_MODAL_Z,
  capacityState,
  fmtYmd,
  isCountedStatus,
  leadOf,
  planSegments,
  plannedTotalPct,
  squadCountOf,
  squadStatusMeta,
  squadStatusLabel,
  transitionsFrom,
} from './squad-constants.js';
import {
  LeadStarIcon, CalendarIcon, WarningIcon, LockIcon,
  CloseIcon, MoreIcon, ChevronDownIcon, PlusIcon, CheckIcon, EditIcon,
} from './squadIcons.jsx';

const FONT = "'Pretendard','Noto Sans KR',sans-serif";
const MONO = "'DM Mono',monospace";

const todayIso = () => new Date().toISOString().slice(0, 10);

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
  const canEditMemberOf = useCallback(
    (userId) => isEditing && inScope(userId) && !!onUpsertMember,
    [isEditing, inScope, onUpsertMember],
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

  // 재개(완료→진행중) 시 이 스쿼드 계획%가 합계에 다시 더해져 과부하가 새로 생길 수 있다
  const reopenOverloads = (sq) => (sq.members || [])
    .map((m) => ({ userId: m.userId, total: plannedTotalPct(squads, m.userId) + m.allocationPct }))
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
  const assign = (squadId, userId) =>
    onUpsertMember?.(squadId, userId, { allocationPct: DEFAULT_ASSIGN_PCT });
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
      <span className="tab-inactive" onClick={() => onSubTabChange && onSubTabChange('project')}>프로젝트</span>
      <span className="tab-active">스쿼드</span>
    </div>
  );

  return (
    <div className="content-area" data-testid="squad-canvas">
      <div className="content-canvas">
        <div className="pj-header">
          {tabStrip}
          <div className="header-subtitle">
            <b>스쿼드</b>
            <span className="dot">&#8729;</span>
            <span className="brand-count">{squads.length}개</span>
          </div>
        </div>

        <div style={{ padding: '20px 24px 32px', fontFamily: FONT }}>
          {/* 헤더 + 편집 모드 토글 */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 16, gap: 12, flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>스쿼드</div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                {isEditing
                  ? (editableSet === null
                    ? '전체 스쿼드의 팀원 할당을 편집할 수 있습니다'
                    : '내 조직 구성원의 할당만 편집할 수 있습니다 (범위 밖 셀은 비활성)')
                  : '기능 조직과 평행한 한시 조직 — 스쿼드 카드와 배치 매트릭스로 구성을 확인합니다'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {ledgerReady && !squadForm && (
                <button
                  type="button" onClick={openSquadForm} data-testid="squad-create-open"
                  style={{
                    padding: '8px 14px', borderRadius: 9, border: '1.5px dashed #C7D2FE',
                    background: '#fff', color: '#4F6AF5', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: 12, fontWeight: 700, fontFamily: FONT,
                  }}
                >
                  <PlusIcon size={12} /> 스쿼드 만들기
                </button>
              )}
              {canEditAssignments && (
                <button
                  type="button" data-testid="squad-edit-toggle"
                  onClick={() => { setEditMode((v) => !v); setPopover(null); setAddTarget(null); }}
                  style={{
                    padding: '8px 16px', borderRadius: 9,
                    border: editMode ? 'none' : '1.5px solid #C7D2FE',
                    background: editMode ? '#4F6AF5' : '#EEF2FF',
                    color: editMode ? '#fff' : '#4F6AF5',
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: FONT,
                    boxShadow: editMode ? '0 3px 10px rgba(79,106,245,.3)' : 'none',
                  }}
                >
                  {editMode ? <CheckIcon size={12} /> : <EditIcon size={12} />}
                  {editMode ? '편집 완료' : '할당 편집'}
                </button>
              )}
            </div>
          </div>

          {loading && (
            <div style={{ padding: '40px 0', textAlign: 'center', fontSize: 12, color: '#94A3B8' }}>
              스쿼드 정보를 불러오는 중…
            </div>
          )}

          {!loading && error && (
            <div
              data-testid="squad-error-banner"
              style={{
                border: '1px solid #FECACA', background: '#FEF2F2', borderRadius: 10,
                padding: '12px 14px', marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: '#DC2626' }}>
                스쿼드 정보를 불러오지 못했습니다
              </div>
              {onRetry && (
                <button
                  type="button" onClick={onRetry}
                  style={{
                    marginTop: 8, padding: '5px 12px', borderRadius: 7, border: '1px solid #FECACA',
                    background: '#fff', color: '#DC2626', fontSize: 11, fontWeight: 700,
                    cursor: 'pointer', fontFamily: FONT,
                  }}
                >
                  다시 시도
                </button>
              )}
            </div>
          )}

          {!loading && !error && (
            <>
              {/* 완료 전환 넛지 — 자동 전이는 하지 않고 안내만. p013 미보유자에게는 미노출 */}
              {overdueSquads.length > 0 && (
                <div
                  data-testid="squad-overdue-banner"
                  style={{
                    border: '1px solid #FDE68A', background: '#FFFBEB', borderRadius: 10,
                    padding: '10px 14px', marginBottom: 16,
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#D97706', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <WarningIcon size={12} /> 종료일이 지난 진행중 스쿼드 {overdueSquads.length}건
                  </div>
                  <div style={{ fontSize: 10, color: '#92400E', marginTop: 3, lineHeight: 1.6 }}>
                    {overdueSquads.map((sq) => `${sq.name} (${fmtYmd(sq.endDate)})`).join(' · ')}
                  </div>
                  <div style={{ fontSize: 9, color: '#B45309', marginTop: 3 }}>
                    상태 배지에서 완료로 전환하세요 — 자동으로 바뀌지 않습니다
                  </div>
                </div>
              )}

              {/* 스쿼드 0건 빈 상태 — 실제 고객 조직은 전부 여기서 시작한다 */}
              {squads.length === 0 && !squadForm && (
                <div
                  data-testid="squad-empty-state"
                  style={{
                    border: '1px dashed #E2E8F0', borderRadius: 14, padding: '32px 20px',
                    textAlign: 'center', marginBottom: 32, background: '#F8FAFC',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#64748B' }}>운영 중인 스쿼드가 없습니다</div>
                  {ledgerReady ? (
                    <>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                        첫 스쿼드를 만들어 팀원을 배정해보세요
                      </div>
                      <button
                        type="button" onClick={openSquadForm} data-testid="squad-create-open-empty"
                        style={{
                          marginTop: 12, padding: '8px 16px', borderRadius: 9, border: 'none',
                          background: '#4F6AF5', color: '#fff', cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: 12, fontWeight: 700, fontFamily: FONT,
                        }}
                      >
                        <PlusIcon size={12} /> 스쿼드 만들기
                      </button>
                    </>
                  ) : (
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                      관리자가 스쿼드를 만들면 표시됩니다
                    </div>
                  )}
                </div>
              )}

              {/* 카드 그리드 */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))',
                gap: 16, marginBottom: 32,
              }}>
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
                      style={{
                        background: '#fff', borderRadius: 14,
                        overflow: addTarget === sq.id ? 'visible' : 'hidden',
                        border: `1px solid ${hov === sq.id ? `${sq.color}50` : '#E2E8F0'}`,
                        boxShadow: hov === sq.id ? `0 6px 24px ${sq.color}18` : '0 1px 4px rgba(0,0,0,.05)',
                        transition: 'all .2s',
                        transform: hov === sq.id && !overlayOpen ? 'translateY(-2px)' : 'none',
                        // 보관 = 이력 보존용. 흐리게 구분하되 조회·할당 편집은 정상 동작한다
                        opacity: sq.status === 'archived' ? 0.6 : 1,
                      }}
                    >
                      <div style={{ height: 4, background: sq.color }} />
                      <div style={{ padding: '16px 18px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{sq.name}</div>
                            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2, lineHeight: 1.5 }}>{sq.mission}</div>
                          </div>

                          {/* 상태 배지 = 전환 트리거 (p013). 편집 모드와 무관하게 동작 */}
                          <div style={{ position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                            <span
                              data-testid={`squad-status-${sq.id}`}
                              onClick={() => canTransition && setStatusMenu((m) => (m === sq.id ? null : sq.id))}
                              title={canTransition ? '상태 변경' : undefined}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 2,
                                fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 99,
                                background: stBadge.bg, color: stBadge.text,
                                cursor: canTransition ? 'pointer' : 'default',
                              }}
                            >
                              {stBadge.label}
                              {canTransition && <ChevronDownIcon size={9} />}
                            </span>

                            {ledgerReady && (
                              <span
                                data-testid={`squad-more-${sq.id}`}
                                onClick={() => setMoreMenu((m) => (m === sq.id ? null : sq.id))}
                                title="스쿼드 관리"
                                style={{ marginLeft: 4, color: '#94A3B8', cursor: 'pointer', display: 'inline-flex' }}
                              >
                                <MoreIcon size={14} />
                              </span>
                            )}

                            {moreMenu === sq.id && ledgerReady && (
                              <>
                                <div onClick={() => setMoreMenu(null)} style={{ position: 'fixed', inset: 0, zIndex: SQUAD_MENU_BACKDROP_Z }} />
                                <div style={{
                                  position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: SQUAD_MENU_Z,
                                  background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8,
                                  boxShadow: '0 6px 20px rgba(15,23,42,.12)', overflow: 'hidden', minWidth: 116,
                                }}>
                                  <div
                                    data-testid={`squad-more-edit-${sq.id}`} onClick={() => openSquadEdit(sq)}
                                    style={{ padding: '7px 11px', fontSize: 11, fontWeight: 600, color: '#334155', cursor: 'pointer' }}
                                  >수정</div>
                                  <div
                                    data-testid={`squad-more-history-${sq.id}`}
                                    onClick={() => { setHistFor(sq.id); setMoreMenu(null); onLoadHistory?.(sq.id); }}
                                    style={{ padding: '7px 11px', fontSize: 11, fontWeight: 600, color: '#334155', cursor: 'pointer' }}
                                  >이력</div>
                                  {/* 삭제는 보관 상태에서만 활성 — 운영 중 조직의 실수 삭제 방지(§5-2-B 1번) */}
                                  <div
                                    data-testid={`squad-more-delete-${sq.id}`}
                                    onClick={() => {
                                      if (sq.status === 'archived') { setDelAsk({ squadId: sq.id, typed: '' }); setMoreMenu(null); }
                                    }}
                                    title={sq.status === 'archived' ? undefined : '보관 상태에서만 삭제할 수 있습니다'}
                                    style={{
                                      padding: '7px 11px', fontSize: 11, fontWeight: 600,
                                      borderTop: '1px solid #F1F5F9',
                                      color: sq.status === 'archived' ? '#DC2626' : '#CBD5E1',
                                      cursor: sq.status === 'archived' ? 'pointer' : 'not-allowed',
                                    }}
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
                                  style={{
                                    position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: SQUAD_MENU_Z,
                                    background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8,
                                    boxShadow: '0 6px 20px rgba(15,23,42,.12)', overflow: 'hidden', minWidth: 130,
                                  }}
                                >
                                  {/* 허용된 전이만 렌더 — 차단 전이는 비활성 항목으로도 보여주지 않는다 */}
                                  {sqTransitions.map((t) => (
                                    <div
                                      key={t.to} data-testid={`squad-transition-${sq.id}-${t.to}`}
                                      onClick={() => requestStatus(sq, t.to)}
                                      style={{
                                        padding: '7px 11px', fontSize: 11, fontWeight: 600,
                                        color: '#334155', cursor: 'pointer', whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {t.label} <span style={{ color: '#94A3B8', fontWeight: 500 }}>→ {squadStatusLabel(t.to)}</span>
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* 기간 (한시 조직) */}
                        <div style={{
                          fontSize: 10, color: '#94A3B8', fontFamily: MONO, marginBottom: 12,
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          <CalendarIcon size={11} /> {fmtYmd(sq.startDate)} – {fmtYmd(sq.endDate)}
                        </div>

                        {/* 팀원 리소스 구성 — 스쿼드 100 기준 (매트릭스의 캐파 기준값과 분모가 다름) */}
                        <SquadComposition squad={sq} members={members} personOf={personOf} />

                        {!isEditing ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {/* 시안은 아바타를 -6px 로 겹쳐 쌓았지만, 그건 라벨이 'KR' 같은
                                2글자 코드일 때의 간격이다. 실제 명부는 '박소율' 처럼 3~4글자
                                한글 이름이라 겹치면 뒷글자가 가려 읽히지 않는다 — 겹치는 대신
                                2px 로 띄우고 넘치면 줄바꿈한다(카드당 인원은 많아야 한 자릿수). */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                              {members.map((mm) => {
                                const p = personOf(mm.userId);
                                return (
                                  <div
                                    key={mm.userId}
                                    onClick={() => p && onMemberClick?.(p)}
                                    style={{
                                      position: 'relative',
                                      cursor: p && onMemberClick ? 'pointer' : 'default',
                                    }}
                                    title={`${nameOf(mm.userId)} — 개인 캐파 기준 ${mm.allocationPct}%${mm.role === 'lead' ? ' · 리드' : ''}`}
                                  >
                                    <div style={{
                                      width: 26, height: 26, borderRadius: 8,
                                      background: `${p?.color || '#94A3B8'}20`,
                                      border: '2px solid #fff',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      fontSize: 8, fontWeight: 800, color: p?.color || '#94A3B8', fontFamily: MONO,
                                    }}>{p?.avatar || nameOf(mm.userId).slice(0, 2)}</div>
                                    {mm.role === 'lead' && (
                                      <span style={{ position: 'absolute', top: -6, right: -4, color: '#F59E0B', display: 'inline-flex' }}>
                                        <LeadStarIcon size={10} />
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            <span style={{ fontSize: 10, color: '#94A3B8' }}>
                              {members.length}명 · 리드{' '}
                              {lead
                                ? nameOf(lead.userId)
                                : <em style={{ color: '#CBD5E1', fontStyle: 'normal' }}>미지정</em>}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                              {members.map((mm) => {
                                const p = personOf(mm.userId);
                                const editable = canEditMemberOf(mm.userId);
                                return (
                                  <div
                                    key={mm.userId}
                                    data-testid={`squad-chip-${sq.id}-${mm.userId}`}
                                    onClick={(e) => editable && setPopover({
                                      squadId: sq.id, userId: mm.userId, x: e.clientX, y: e.clientY + 10,
                                    })}
                                    title={`${nameOf(mm.userId)} — 개인 캐파 기준 ${mm.allocationPct}%${editable ? '\n클릭: 투입%·리드 편집' : '\n편집 권한 없음 (내 조직 아님)'}`}
                                    style={{
                                      display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 99,
                                      background: mm.role === 'lead' ? '#FFFBEB' : '#F8FAFC',
                                      border: `1px solid ${mm.role === 'lead' ? '#FDE68A' : '#E2E8F0'}`,
                                      cursor: editable ? 'pointer' : 'default', opacity: editable ? 1 : 0.5,
                                    }}
                                  >
                                    {mm.role === 'lead' && (
                                      <span style={{ color: '#F59E0B', display: 'inline-flex' }}><LeadStarIcon size={9} /></span>
                                    )}
                                    <span style={{ fontSize: 10, fontWeight: 700, color: '#334155' }}>{nameOf(mm.userId)}</span>
                                    <span style={{ fontSize: 9, fontWeight: 700, color: p?.color || '#64748B', fontFamily: MONO }}>
                                      {mm.allocationPct}%
                                    </span>
                                    {editable && onRemoveMember && (
                                      <span
                                        onClick={(e) => { e.stopPropagation(); unassign(sq.id, mm.userId); }}
                                        title="배정 해제"
                                        style={{ color: '#94A3B8', cursor: 'pointer', marginLeft: 2, display: 'inline-flex' }}
                                      >
                                        <CloseIcon size={9} />
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                              {members.length === 0 && (
                                <span style={{ fontSize: 10, color: '#CBD5E1' }}>배정된 팀원이 없습니다</span>
                              )}
                            </div>

                            {onUpsertMember && (addTarget === sq.id ? (
                              <div style={{ position: 'relative' }}>
                                <input
                                  autoFocus value={addQuery} aria-label="팀원 검색"
                                  onChange={(e) => setAddQuery(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Escape') { setAddTarget(null); setAddQuery(''); } }}
                                  placeholder="이름 · 팀 · 직함 검색…"
                                  style={{
                                    width: '100%', padding: '7px 10px', borderRadius: 8,
                                    border: `1.5px solid ${sq.color}50`, fontSize: 11, fontFamily: FONT,
                                    outline: 'none', boxSizing: 'border-box',
                                  }}
                                />
                                <div style={{
                                  position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                                  background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10,
                                  boxShadow: '0 8px 24px rgba(0,0,0,.1)', zIndex: 200, maxHeight: 168, overflowY: 'auto',
                                }}>
                                  {candidates.map((n) => (
                                    <div
                                      key={n.id} data-testid={`squad-add-candidate-${n.id}`}
                                      onClick={() => { assign(sq.id, n.id); setAddTarget(null); setAddQuery(''); }}
                                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', cursor: 'pointer' }}
                                    >
                                      <div style={{
                                        width: 22, height: 22, borderRadius: 6, background: `${n.color || '#94A3B8'}20`, flexShrink: 0,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 7, fontWeight: 800, color: n.color || '#94A3B8', fontFamily: MONO,
                                      }}>{n.avatar || n.name.slice(0, 2)}</div>
                                      <div style={{ minWidth: 0 }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: '#0F172A' }}>{n.name}</span>
                                        <span style={{ fontSize: 9, color: '#94A3B8', marginLeft: 6 }}>{n.title} · {n.team}</span>
                                      </div>
                                    </div>
                                  ))}
                                  {candidates.length === 0 && (
                                    <div style={{ padding: '10px 12px', fontSize: 10, color: '#94A3B8' }}>
                                      추가할 수 있는 구성원이 없습니다{editableSet !== null ? ' (내 조직 범위 밖)' : ''}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button" data-testid={`squad-add-member-${sq.id}`}
                                onClick={() => { setAddTarget(sq.id); setAddQuery(''); }}
                                style={{
                                  padding: '5px 10px', borderRadius: 99, border: `1.5px dashed ${sq.color}60`,
                                  background: '#fff', color: sq.color, cursor: 'pointer',
                                  display: 'inline-flex', alignItems: 'center', gap: 3,
                                  fontSize: 10, fontWeight: 700, fontFamily: FONT,
                                }}
                              >
                                <PlusIcon size={10} /> 팀원 추가
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── 멤버 × 스쿼드 배치 매트릭스 ── */}
              {squads.length > 0 && (
                <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>멤버 × 스쿼드 배치</div>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                      {isEditing
                        ? `빈 셀 클릭 = 배정 (기본 ${DEFAULT_ASSIGN_PCT}%) · 배정 셀 클릭 = 투입%(내 캐파 100 기준) · 리드 편집`
                        : '이름 클릭 시 프로필 확인 · 셀 % = 내 캐파 100 중 이 스쿼드 비율'}
                    </div>
                  </div>

                  {/* 과부하 경고 배너 — 차단하지 않고 현실을 먼저 드러낸다 */}
                  {overloaded.length > 0 && (
                    <div
                      data-testid="squad-overload-banner"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px',
                        background: '#FEF2F2', borderBottom: '1px solid #FECACA', flexWrap: 'wrap',
                      }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#DC2626', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <WarningIcon size={12} /> 과부하
                      </span>
                      <span style={{ fontSize: 11, color: '#B91C1C' }}>
                        {overloaded.map((id) => `${nameOf(id)} ${plannedTotalPct(squads, id)}%`).join(' · ')}
                        {' — 개인 캐파 100을 넘겨 배정됐습니다 (저장은 허용 · 조정은 사람이 결정)'}
                      </span>
                    </div>
                  )}

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                      <thead>
                        <tr style={{ background: '#F8FAFC' }}>
                          <th style={{
                            padding: '10px 20px', textAlign: 'left', fontSize: 10, fontWeight: 700,
                            color: '#94A3B8', letterSpacing: 0.5, borderBottom: '1px solid #F1F5F9',
                          }}>멤버</th>
                          {squads.map((sq) => (
                            <th key={sq.id} style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid #F1F5F9' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: sq.color }} />
                                <span style={{
                                  fontSize: 9, fontWeight: 700, color: '#64748B', whiteSpace: 'nowrap',
                                  maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis',
                                }}>{sq.name}</span>
                              </div>
                            </th>
                          ))}
                          <th style={{
                            padding: '10px 12px', textAlign: 'center', fontSize: 10, fontWeight: 700,
                            color: '#94A3B8', borderBottom: '1px solid #F1F5F9', whiteSpace: 'nowrap',
                          }}>
                            캐파 사용
                            <div style={{ fontSize: 8, fontWeight: 600, color: '#CBD5E1', marginTop: 1 }}>내 캐파 100 기준</div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rowIds.map((userId, ri) => {
                          const p = personOf(userId);
                          const count = squadCountOf(squads, userId);
                          const total = plannedTotalPct(squads, userId);
                          const segments = planSegments(squads, userId);
                          const cst = capacityState(total);
                          const diff = total - CAPACITY;
                          return (
                            <tr
                              key={userId} data-testid={`squad-matrix-row-${userId}`}
                              style={{ borderBottom: ri < rowIds.length - 1 ? '1px solid #F8FAFC' : 'none' }}
                            >
                              <td style={{ padding: '9px 20px' }}>
                                <div
                                  onClick={() => p && onMemberClick?.(p)}
                                  style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: p && onMemberClick ? 'pointer' : 'default' }}
                                >
                                  <div style={{
                                    width: 26, height: 26, borderRadius: 7,
                                    background: `${p?.color || '#94A3B8'}20`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 8, fontWeight: 800, color: p?.color || '#94A3B8', fontFamily: MONO,
                                  }}>{p?.avatar || nameOf(userId).slice(0, 2)}</div>
                                  <span style={{
                                    fontSize: 12, fontWeight: 600,
                                    color: p && onMemberClick ? '#4F6AF5' : '#0F172A',
                                    textDecoration: p && onMemberClick ? 'underline' : 'none',
                                    textDecorationStyle: 'dotted',
                                  }}>{nameOf(userId)}</span>
                                  {isEditing && !inScope(userId) && (
                                    <span title="편집 권한 없음 (내 조직 아님)" style={{ color: '#CBD5E1', display: 'inline-flex' }}>
                                      <LockIcon size={11} />
                                    </span>
                                  )}
                                </div>
                              </td>
                              {squads.map((sq) => {
                                const mm = (sq.members || []).find((x) => x.userId === userId);
                                const editable = canEditMemberOf(userId);
                                const isLead = mm?.role === 'lead';
                                return (
                                  <td key={sq.id} style={{ padding: '9px 12px', textAlign: 'center' }}>
                                    {mm ? (
                                      <div
                                        data-testid={`squad-cell-${sq.id}-${userId}`}
                                        onClick={(e) => editable && setPopover({
                                          squadId: sq.id, userId, x: e.clientX + 8, y: e.clientY + 8,
                                        })}
                                        title={`${nameOf(userId)} · ${sq.name} — 내 캐파 100 중 ${mm.allocationPct}%${isLead ? ' · 리드' : ''}${editable ? '\n클릭: 투입%·리드 편집' : ''}`}
                                        style={{
                                          minWidth: 40, height: 24, borderRadius: 7,
                                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                          gap: 2, padding: '0 7px',
                                          background: `${sq.color}18`, border: `1px solid ${sq.color}45`,
                                          cursor: editable ? 'pointer' : 'default',
                                        }}
                                      >
                                        {isLead && (
                                          <span style={{ color: '#F59E0B', display: 'inline-flex' }}><LeadStarIcon size={9} /></span>
                                        )}
                                        <span style={{ fontSize: 10, fontWeight: 800, color: sq.color, fontFamily: MONO }}>
                                          {mm.allocationPct}%
                                        </span>
                                      </div>
                                    ) : isEditing ? (
                                      <div
                                        data-testid={`squad-empty-cell-${sq.id}-${userId}`}
                                        onClick={() => editable && assign(sq.id, userId)}
                                        title={editable ? `클릭: ${sq.name}에 배정 (기본 ${DEFAULT_ASSIGN_PCT}%)` : '편집 권한 없음 (내 조직 아님)'}
                                        style={{
                                          width: 24, height: 24, borderRadius: 7, margin: '0 auto',
                                          background: '#F8FAFC',
                                          border: `1px dashed ${editable ? '#CBD5E1' : '#F1F5F9'}`,
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                          cursor: editable ? 'pointer' : 'not-allowed', color: '#CBD5E1',
                                        }}
                                      >
                                        {editable && <PlusIcon size={11} />}
                                      </div>
                                    ) : (
                                      <div style={{ width: 24, height: 24, borderRadius: 7, margin: '0 auto', background: '#F8FAFC' }} />
                                    )}
                                  </td>
                                );
                              })}
                              {/* 캐파 사용 — 개인 가용 100 기준. 게이지 + 잔여/초과 %p 를 함께 읽힌다 */}
                              <td style={{ padding: '9px 12px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, whiteSpace: 'nowrap' }}>
                                    <span
                                      data-testid={`squad-capacity-total-${userId}`}
                                      style={{ fontSize: 12, fontWeight: 800, color: cst.color, fontFamily: MONO }}
                                    >
                                      {total}
                                    </span>
                                    <span style={{ fontSize: 9, fontWeight: 700, color: '#CBD5E1', fontFamily: MONO }}>/ 100</span>
                                  </div>
                                  <CapacityBar segments={segments} total={total} />
                                  <span style={{
                                    fontSize: 8, color: cst.key === 'over' ? '#DC2626' : '#94A3B8',
                                    fontFamily: MONO, whiteSpace: 'nowrap',
                                  }}>
                                    {total === 0
                                      ? '미배정'
                                      : diff > 0
                                        ? `초과 ${diff}%p · ${count}개`
                                        : `여유 ${-diff}%p · ${count}개`}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {rowIds.length === 0 && (
                          <tr>
                            <td colSpan={squads.length + 2} style={{ padding: '24px 20px', textAlign: 'center', fontSize: 11, color: '#CBD5E1' }}>
                              배정된 팀원이 없습니다 — 「할당 편집」에서 배정해보세요
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* 범례 — 두 분모를 혼동하지 않게 상시 안내한다 */}
                  <div style={{ padding: '10px 20px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, color: '#94A3B8', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <span style={{ color: '#F59E0B', display: 'inline-flex' }}><LeadStarIcon size={10} /></span>
                      리드 (스쿼드당 1명)
                    </span>
                    <span style={{ fontSize: 10, color: '#94A3B8' }}>
                      셀 % = <b>내 가용 캐파 100 중 이 스쿼드에 쓰는 비율</b> (스쿼드 내 지분·상대 비중이 아님 — 그래야 합산이 성립한다)
                    </span>
                    <span style={{ fontSize: 10, color: '#94A3B8' }}>
                      캐파 사용(완료·보관 스쿼드 제외): <span style={{ color: '#DC2626', fontWeight: 700 }}>&gt;100 초과</span>
                      (빗금 = 캐파 밖) · 100 가득 · 70~99 적정 · &lt;70 여유
                    </span>
                    <span style={{ fontSize: 10, color: '#CBD5E1' }}>실제 투입%는 「리소스 투입현황」 자기신고 값과 별개</span>
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
          counted={isCountedStatus(popSquad.status)}
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
            style={{
              position: 'fixed', inset: 0, background: '#0F172A55', zIndex: SQUAD_MODAL_Z,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, padding: 20, width: 380, fontFamily: FONT }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#DC2626' }}>스쿼드를 삭제할까요?</div>

              {/* 사라지는 것 / 남는 것을 나란히 보여준다 */}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <div style={{ flex: 1, padding: '8px 10px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#DC2626', marginBottom: 3 }}>함께 삭제</div>
                  <div style={{ fontSize: 10, color: '#B91C1C', lineHeight: 1.6 }}>
                    팀원 배정 {(sq.members || []).length}건<br />
                    상태 이력 전체
                  </div>
                </div>
                <div style={{ flex: 1, padding: '8px 10px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#16A34A', marginBottom: 3 }}>보존</div>
                  <div style={{ fontSize: 10, color: '#15803D', lineHeight: 1.6 }}>
                    프로젝트 원장<br />
                    실제 투입% 이력
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 10 }}>
                되돌릴 수 없습니다. 확인을 위해 스쿼드명 <b style={{ color: '#334155' }}>{sq.name}</b> 을(를) 입력하세요.
              </div>
              <input
                autoFocus value={delAsk.typed} aria-label="삭제 확인용 스쿼드명"
                onChange={(e) => setDelAsk((d) => ({ ...d, typed: e.target.value }))}
                placeholder={sq.name}
                style={{
                  width: '100%', marginTop: 6, border: '1px solid #E2E8F0', borderRadius: 6,
                  padding: '7px 9px', fontSize: 11, outline: 'none', fontFamily: FONT, boxSizing: 'border-box',
                }}
              />

              <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                <button
                  type="button" data-testid="squad-delete-confirm"
                  onClick={() => { if (nameOk) { onDeleteSquad?.(sq.id); setDelAsk(null); setMoreMenu(null); } }}
                  disabled={!nameOk}
                  style={{
                    padding: '7px 14px', borderRadius: 7, border: 'none',
                    background: nameOk ? '#DC2626' : '#E2E8F0', color: nameOk ? '#fff' : '#94A3B8',
                    fontSize: 11, fontWeight: 700, cursor: nameOk ? 'pointer' : 'not-allowed', fontFamily: FONT,
                  }}
                >삭제</button>
                <button
                  type="button" onClick={() => setDelAsk(null)}
                  style={{
                    padding: '7px 14px', borderRadius: 7, border: '1px solid #E2E8F0',
                    background: '#fff', color: '#64748B', fontSize: 11, fontWeight: 700,
                    cursor: 'pointer', fontFamily: FONT,
                  }}
                >취소</button>
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
            style={{
              position: 'fixed', inset: 0, background: '#0F172A55', zIndex: SQUAD_MODAL_Z,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, padding: 20, width: 360, fontFamily: FONT }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                {reopen ? '스쿼드를 재개할까요?' : '스쿼드를 보관할까요?'}
              </div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 6, lineHeight: 1.6 }}>
                <b>{sq.name}</b>
                {reopen
                  ? ' 을(를) 진행중으로 되돌립니다. 이 스쿼드 배정이 캐파 합계에 다시 포함됩니다.'
                  : ' 을(를) 보관합니다. 목록에서 흐리게 표시되며 캐파 합계에서 계속 제외됩니다. 언제든 복원할 수 있습니다.'}
              </div>

              {/* 재개로 과부하가 새로 생기는 멤버 사전 경고 — 차단하지는 않는다 */}
              {reopen && statusAsk.overloads.length > 0 && (
                <div style={{ marginTop: 10, padding: '9px 11px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <WarningIcon size={12} /> 재개하면 {statusAsk.overloads.length}명이 과부하(&gt;100%)가 됩니다
                  </div>
                  <div style={{ fontSize: 10, color: '#B91C1C', marginTop: 4, lineHeight: 1.6 }}>
                    {statusAsk.overloads.map((o) => `${nameOf(o.userId)} ${o.total}%`).join(' · ')}
                  </div>
                  <div style={{ fontSize: 9, color: '#94A3B8', marginTop: 4 }}>저장은 허용됩니다 — 경고만 표시합니다</div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
                <button
                  type="button" data-testid="squad-status-confirm"
                  onClick={() => applyStatus(statusAsk.squadId, statusAsk.to)}
                  style={{
                    padding: '7px 14px', borderRadius: 7, border: 'none',
                    background: reopen ? '#4F6AF5' : '#64748B', color: '#fff',
                    fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: FONT,
                  }}
                >{reopen ? '재개' : '보관'}</button>
                <button
                  type="button" onClick={() => setStatusAsk(null)}
                  style={{
                    padding: '7px 14px', borderRadius: 7, border: '1px solid #E2E8F0',
                    background: '#fff', color: '#64748B', fontSize: 11, fontWeight: 700,
                    cursor: 'pointer', fontFamily: FONT,
                  }}
                >취소</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
