/**
 * 구성원 기록 모달 3종 — HR 기록 · 연봉 이력 · 대표(CEO) 지정 확인.
 *
 * 🔴 **왜 별도 모듈인가 (PW-576).** 이 셋은 원래 `AdminEmployeeSheetCanvas.jsx`
 * (스프레드시트 뷰) 안에 있었다. 2026-09-02 정기미팅 §1 (David) 이 그 뷰를 폐기해
 * 파일이 통째로 사라지는데, **모달 셋은 화면과 함께 사라지면 안 되는 것**이다 —
 * 학력·경력·자격증·부양가족·서류·신원 정보를 보는 자리가 제품에서 없어지고,
 * 연봉 이력과 대표 지정도 진입점을 잃는다. 기획서 `admin-spec.md` §3.2.4·§3.6-A 는
 * 이것들을 **목록 뷰의 편집 패널·행 메뉴** 몫으로 정하고 있다.
 *
 * 그래서 시트를 걷어내기 전에 여기로 **옮겨** 두고, 목록 뷰가 그대로 쓴다.
 * 코드는 옮긴 것이고 동작은 바뀌지 않았다 — 시트에서 열든 패널에서 열든 같은 창이다.
 */
import { useState, useEffect, useMemo } from 'react';
import DatePicker from '../shared/DatePicker.jsx';
import { IconLock } from './employeeExport.jsx';

/* 시트에서 함께 옮겨 온 토큰 — 이 폴더의 다른 캔버스와 같은 값이다. */
const T = {
  font: "'Pretendard','Noto Sans KR',sans-serif",
  mono: "'DM Mono',monospace",
  bg: '#F8FAFC',
  card: '#fff',
  border: '#E2E8F0',
  bl: '#F1F5F9',
  text: '#0F172A',
  sub: '#64748B',
  muted: '#94A3B8',
  accent: '#4F6AF5',
};


const fmtKRW = (v) => {
  if (v === '' || v === null || v === undefined) return '—';
  const n = Number(String(v).replace(/[^0-9]/g, ''));
  return Number.isFinite(n) && n > 0 ? '₩' + n.toLocaleString('ko-KR') : '—';
};


/**
 * 연봉(이력) 아이콘. 통화 글리프 `₩` 를 아이콘 자리에 쓰면 폰트에 따라 굵기·폭이
 * 달라지고 fontSize 로만 크기가 정해져 옆 아이콘과 광학 크기가 안 맞는다.
 * 지폐 도형으로 그려 다른 인라인 SVG 와 같은 24 그리드·같은 stroke 를 쓴다.
 */
export function IconSalary({ size = 14 }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden focusable={false} style={{ display: 'block', flexShrink: 0 }}
    >
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 12h.01" />
      <path d="M18 12h.01" />
    </svg>
  );
}

/** 일괄 적용 완료 표시. `✓`(U+2713) 는 폰트마다 굵기가 달라 배지 안에서 튄다. */
export function IconCheck({ size = 13 }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden focusable={false} style={{ display: 'block', flexShrink: 0 }}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/** 더하기. `+` 글리프는 폰트마다 두께·수직 중심이 달라 버튼 라벨 옆에서 흔들린다. */
export function IconPlusSmall({ size = 12 }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden focusable={false} style={{ display: 'block', flexShrink: 0 }}
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

/** 모달 닫기. `✕`(U+2715) 는 폰트마다 두께·중심이 달라 버튼 안에서 흔들린다. */
export function IconClose({ size = 16 }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden focusable={false} style={{ display: 'block', flexShrink: 0 }}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

// members prop → 내부 편집 row 로 매핑(빈 값 정규화).

/* ── 대표(CEO) ────────────────────────────────────────────
 * 왕관은 이모지(👑)가 아니라 인라인 SVG 다 — OS·폰트마다 모양이 달라지고
 * color 를 상속하지 않아 배지 안에서 혼자 튄다.
 * ---------------------------------------------------------- */
export function IconCrown({ size = 13 }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden focusable={false} style={{ display: 'block', flexShrink: 0 }}
    >
      <path d="M3 7l4.5 4L12 4l4.5 7L21 7l-1.8 11H4.8L3 7Z" />
    </svg>
  );
}

/**
 * 이름 옆 대표 배지. `isCeo` 하나만 근거로 삼는다 — 권한이 대표(superuser)라거나
 * 직책 문자열이 '대표'라는 것만으로는 붙지 않는다(정책 §2).
 * 라벨은 로케일에 따라 '대표'(2자)↔'CEO' 로 길이가 흔들리므로 고정폭을 주지 않고
 * 안쪽 패딩 + nowrap 으로 감싼다.
 */
export function CeoBadge({ label }) {
  return (
    <span
      title={label}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0,
        boxSizing: 'border-box', padding: '1px 6px 1px 4px', borderRadius: 99,
        background: '#FFFBEB', border: '1px solid #FDE68A', color: '#B45309',
        fontSize: 10, fontWeight: 700, lineHeight: 1.5, whiteSpace: 'nowrap',
      }}
    >
      <IconCrown size={11} />
      {label}
    </span>
  );
}


/** 대표 지정/해제 확인 모달 — 정책 §4-A. 실패해도 닫지 않고 인라인 에러를 띄운다. */
export function CeoConfirmModal({ row, mode, currentCeoName, labels, positionOptions = [], onConfirm, onClose }) {
  const L = labels || {};
  const assigning = mode === 'assign';
  // 체크박스는 isCeo 와 독립된 컬럼을 함께 설정할 뿐, 자동 연동이 아니다.
  const [alsoSetJobPosition, setAlsoSetJobPosition] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!row) return null;
  const name = row.name || '';
  // 조직 설정에서 '대표' 직책 옵션을 지웠으면 직책 체크박스를 쓸 수 없다(§4-A).
  const ceoPositionLabel = L.ceoPositionValue || '대표';
  const positionAvailable =
    positionOptions.length === 0 || positionOptions.includes(ceoPositionLabel);

  async function confirm() {
    setBusy(true);
    setError('');
    try {
      await onConfirm({ alsoSetJobPosition: alsoSetJobPosition && positionAvailable });
      onClose();
    } catch (e) {
      setError((e && e.message) || L.ceoErrorGeneric || '처리하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  const checkbox = (checked, onChange, label, disabled, hint) => (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: disabled ? T.muted : T.text, cursor: disabled ? 'not-allowed' : 'pointer' }}>
      <input
        type="checkbox" checked={checked} disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: 2, accentColor: T.accent, cursor: disabled ? 'not-allowed' : 'pointer' }}
      />
      <span>
        {label}
        {hint && <span style={{ display: 'block', fontSize: 11, color: T.muted }}>{hint}</span>}
      </span>
    </label>
  );

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 24, fontFamily: T.font }}
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
    >
      <div data-testid="ceo-confirm-modal" style={{ background: '#fff', borderRadius: 14, width: 'min(460px,100%)', boxShadow: '0 20px 60px rgba(0,0,0,.22)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px 10px', display: 'flex', alignItems: 'center', gap: 8, color: '#B45309' }}>
          <IconCrown size={18} />
          <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>
            {assigning
              ? (L.ceoAssignTitle || '{name}님을 대표로 지정합니다').replace('{name}', name)
              : (L.ceoReleaseTitle || '{name}님의 대표 지정을 해제합니다').replace('{name}', name)}
          </div>
        </div>
        <div style={{ padding: '0 22px 4px', fontSize: 12, color: T.sub, lineHeight: 1.7 }}>
          {assigning ? (
            <>
              <div>{L.ceoAssignBody || '이 구성원이 조직도의 최상위가 됩니다.'}</div>
              {currentCeoName && currentCeoName !== name && (
                <div data-testid="ceo-replace-note">
                  {(L.ceoAssignReplace || '현재 대표 {name}님의 지정은 해제됩니다.').replace('{name}', currentCeoName)}
                </div>
              )}
            </>
          ) : (
            <div>{L.ceoReleaseBody || '조직도 최상위가 비고, 이 구성원은 상급자 없는 상태가 됩니다. 권한과 직책은 자동으로 되돌리지 않습니다.'}</div>
          )}
        </div>

        {assigning && (
          <div style={{ margin: '14px 22px', padding: '12px 14px', border: `1px solid ${T.border}`, borderRadius: 8, background: T.bg, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {checkbox(
              alsoSetJobPosition && positionAvailable,
              setAlsoSetJobPosition,
              (L.ceoAlsoSetJobPosition || "직책을 '{value}'로 함께 변경").replace('{value}', ceoPositionLabel),
              !positionAvailable,
              positionAvailable ? null : (L.ceoPositionMissing || "직책 옵션에 '대표'가 없습니다 — 조직 설정에서 추가하세요."),
            )}
          </div>
        )}

        {assigning && (
          <div style={{ padding: '0 22px', fontSize: 11, color: T.muted, lineHeight: 1.8 }}>
            <div>· {L.ceoNoteManager || '대표는 상급자를 가질 수 없습니다.'}</div>
            <div>· {L.ceoNoteRole || '권한은 바뀌지 않습니다 — 권한 관리 화면에서 따로 조정하세요.'}</div>
            <div>· {L.ceoNoteHistory || '이 변경은 발령 이력에 기록됩니다.'}</div>
          </div>
        )}

        {error && (
          <div data-testid="ceo-modal-error" style={{ margin: '12px 22px 0', padding: '8px 12px', borderRadius: 6, background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: 12 }}>
            {error}
          </div>
        )}

        <div style={{ padding: '16px 22px 18px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} disabled={busy} style={{ padding: '8px 16px', borderRadius: 6, border: `1px solid ${T.border}`, background: '#fff', color: T.sub, fontSize: 12, fontWeight: 700, fontFamily: T.font, cursor: busy ? 'not-allowed' : 'pointer' }}>
            {L.cancel || '취소'}
          </button>
          <button onClick={confirm} disabled={busy} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: busy ? T.border : assigning ? T.accent : '#DC2626', color: busy ? T.muted : '#fff', fontSize: 12, fontWeight: 700, fontFamily: T.font, cursor: busy ? 'not-allowed' : 'pointer' }}>
            {assigning ? (L.ceoAssignConfirm || '대표로 지정') : (L.ceoReleaseConfirm || '해제')}
          </button>
        </div>
      </div>
    </div>
  );
}


// ── HR 모달 표시 헬퍼(모듈 레벨 — render 내 컴포넌트 생성 금지) ──
function HrSection({ title, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}
function HrPair({ k, v }) {
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 12, padding: '3px 0' }}>
      <span style={{ minWidth: 88, color: T.muted }}>{k}</span>
      <span style={{ color: T.text }}>{v == null || v === '' ? '—' : v}</span>
    </div>
  );
}
function HrList({ items, render, empty }) {
  if (items.length === 0) {
    return <div style={{ fontSize: 12, color: T.muted, padding: '4px 0' }}>{empty}</div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map((it, i) => (
        <div key={it.id ?? i} style={{ fontSize: 12, color: T.text, padding: '7px 10px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8 }}>{render(it)}</div>
      ))}
    </div>
  );
}

// ── HR 기록 모달 (읽기 전용) ──────────────────────────────
// 어드민(HR)이 구성원의 신원·가족·부양가족·학력·경력·자격증·증빙을 조회한다.
// 편집은 향후(admin EditPanel) — 현재는 표출 전용. 입력은 본인 내 설정에서.
/**
 * 신원 정보 편집 필드 — 값이 없어도 입력할 수 있어야 한다.
 * 성별·국적은 본인 프로필에서 잠긴 인사 정보라(PW-25) 여기가 유일한 입력 경로다.
 */
function HrEditPair({ k, value, onChange, type = 'text', options }) {
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 12, padding: '3px 0', alignItems: 'center' }}>
      <span style={{ minWidth: 88, color: T.muted }}>{k}</span>
      {options ? (
        <select
          className="admin-emp-input"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          aria-label={k}
          style={{ flex: 1, height: 30, fontSize: 12 }}
        >
          <option value="">—</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : (
        <input
          className="admin-emp-input"
          type={type}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          aria-label={k}
          style={{ flex: 1, height: 30, fontSize: 12 }}
        />
      )}
    </div>
  );
}

/**
 * HR 기록 모달의 신원·인사 편집 필드. 렌더와 dirty 판정이 **같은 목록**을 본다 —
 * 갈라지면 값을 고쳐도 저장 버튼이 계속 비활성인 채로 남는다.
 * 수습 종료일·휴직 기간·병역은 PW-178 에서 더해졌다(대량 메시지 발송 대상 조건의
 * 저장 자리이며, 이 모달이 유일한 입력 경로다).
 */
const HR_IDENTITY_FIELDS = [
  'personalEmail',
  'birthDate',
  'gender',
  'nationality',
  'address',
  'probationEndDate',
  'leaveStartDate',
  'leaveEndDate',
  'militaryService',
];

/**
 * 병역 코드 → 라벨. 읽기 전용 표시에서 코드(`completed`)가 그대로 새어 나가지
 * 않게 한다. 목록에 없는 값은 그대로 통과시킨다(서버가 이미 라벨을 준 경우).
 */
function militaryLabel(value, options) {
  if (!value) return value;
  const list = options || MILITARY_OPTIONS;
  const hit = list.find((o) => o.value === value);
  return hit ? hit.label : value;
}

/** 병역 기본 선택지. 소비자가 L.hrMilitaryOptions 로 로케일 라벨을 덮는다. */
const MILITARY_OPTIONS = [
  { value: 'completed', label: '군필' },
  { value: 'unfulfilled', label: '미필' },
  { value: 'exempted', label: '면제' },
  { value: 'serving', label: '복무중' },
  { value: 'not_applicable', label: '해당없음' },
];

export function HrProfileModal({ row, labels, onLoad, onSaveIdentity, onClose }) {
  const L = labels || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // 신원 정보 편집 draft — onSaveIdentity 가 없으면 읽기 전용(기존 동작).
  const [identityDraft, setIdentityDraft] = useState(null);
  const [identityState, setIdentityState] = useState('idle');

  useEffect(() => {
    // loading/error 초기값(true/false) — 모달은 열 때마다 새로 마운트되므로
    // effect 내 동기 setState 는 하지 않는다(react-hooks/set-state-in-effect 회피).
    let alive = true;
    Promise.resolve(onLoad(row?.id))
      .then((d) => { if (alive) setData(d); })
      .catch(() => { if (alive) setError(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [row?.id, onLoad]);

  const identity = data?.identity ?? {};
  // 서버 값이 들어오면 draft 를 한 번 시드한다(렌더 중 파생 — effect 불필요).
  const [seededId, setSeededId] = useState(null);
  if (data && seededId !== row?.id) {
    setSeededId(row?.id ?? null);
    setIdentityDraft({ ...identity });
    setIdentityState('idle');
  }
  const idDraft = identityDraft ?? identity;
  const setIdField = (key) => (v) => {
    setIdentityDraft((p) => ({ ...(p ?? identity), [key]: v }));
    setIdentityState('idle');
  };
  const identityDirty =
    !!identityDraft &&
    HR_IDENTITY_FIELDS.some(
      (k) => (identityDraft[k] ?? '') !== (identity[k] ?? ''),
    );
  const submitIdentity = () => {
    setIdentityState('saving');
    Promise.resolve(onSaveIdentity(row?.id, { ...idDraft }))
      .then((saved) => {
        // 서버가 돌려준 값이 정본 — 정규화(빈 문자열→null)를 화면에 반영한다.
        if (saved) setData((d) => ({ ...(d ?? {}), identity: saved }));
        setIdentityState('saved');
      })
      .catch(() => setIdentityState('error'));
  };

  const family = data?.family ?? {};
  const org = data?.org ?? {};
  const ec = family.emergencyContact ?? {};
  const deps = family.dependents ?? [];
  const relLabel = (r) => (L.hrRelation && L.hrRelation[r]) || r;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 520, maxHeight: '84vh', overflowY: 'auto', background: T.card, borderRadius: 16, padding: 22, fontFamily: T.font, boxShadow: '0 24px 64px rgba(0,0,0,.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>{row?.name || ''} · {L.hrProfileTitle || 'HR 기록'}</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{L.hrProfileDesc || '본인·HR 전용 · 읽기 전용(입력은 본인 내 설정)'}</div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 18, color: T.muted, cursor: 'pointer' }}>×</button>
        </div>

        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: T.muted, fontSize: 13 }}>{L.loading || '불러오는 중…'}</div>
        ) : error ? (
          <div style={{ padding: 24, textAlign: 'center', color: T.muted, fontSize: 13 }}>{L.hrProfileError || 'HR 기록을 불러오지 못했습니다.'}</div>
        ) : (
          <>
            <HrSection title={L.hrIdentity || '개인 신원'}>
              {onSaveIdentity ? (
                <div data-testid="hr-identity-edit">
                  <HrEditPair k={L.hrPersonalEmail || '개인 이메일'} type="email" value={idDraft.personalEmail} onChange={setIdField('personalEmail')} />
                  <HrEditPair k={L.hrBirthDate || '생년월일'} type="date" value={idDraft.birthDate} onChange={setIdField('birthDate')} />
                  <HrEditPair
                    k={L.hrGender || '성별'}
                    value={idDraft.gender}
                    onChange={setIdField('gender')}
                    options={L.hrGenderOptions || [{ value: 'male', label: '남성' }, { value: 'female', label: '여성' }, { value: 'other', label: '기타' }]}
                  />
                  <HrEditPair k={L.hrNationality || '국적'} value={idDraft.nationality} onChange={setIdField('nationality')} />
                  <HrEditPair k={L.hrAddress || '주소'} value={idDraft.address} onChange={setIdField('address')} />
                  <HrEditPair k={L.hrProbationEndDate || '수습 종료일'} type="date" value={idDraft.probationEndDate} onChange={setIdField('probationEndDate')} />
                  <HrEditPair k={L.hrLeaveStartDate || '휴직 시작일'} type="date" value={idDraft.leaveStartDate} onChange={setIdField('leaveStartDate')} />
                  <HrEditPair k={L.hrLeaveEndDate || '휴직 종료일'} type="date" value={idDraft.leaveEndDate} onChange={setIdField('leaveEndDate')} />
                  <HrEditPair
                    k={L.hrMilitaryService || '병역'}
                    value={idDraft.militaryService}
                    onChange={setIdField('militaryService')}
                    options={L.hrMilitaryOptions || MILITARY_OPTIONS}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    {identityState === 'error' && (
                      <span style={{ fontSize: 11, color: '#DC2626' }} role="alert">
                        {L.hrIdentitySaveError || '저장에 실패했습니다.'}
                      </span>
                    )}
                    {identityState === 'saved' && (
                      <span style={{ fontSize: 11, color: '#16A34A' }} role="status">
                        {L.hrIdentitySaved || '저장됐습니다'}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={submitIdentity}
                      disabled={!identityDirty || identityState === 'saving'}
                      className="admin-btn-primary"
                      style={{ fontSize: 12, padding: '6px 14px', opacity: !identityDirty || identityState === 'saving' ? 0.5 : 1 }}
                    >
                      {identityState === 'saving' ? (L.hrIdentitySaving || '저장 중…') : (L.hrIdentitySave || '신원 정보 저장')}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <HrPair k={L.hrPersonalEmail || '개인 이메일'} v={identity.personalEmail} />
                  <HrPair k={L.hrBirthDate || '생년월일'} v={identity.birthDate} />
                  <HrPair k={L.hrGender || '성별'} v={identity.gender} />
                  <HrPair k={L.hrNationality || '국적'} v={identity.nationality} />
                  <HrPair k={L.hrAddress || '주소'} v={identity.address} />
                  <HrPair k={L.hrProbationEndDate || '수습 종료일'} v={identity.probationEndDate} />
                  <HrPair k={L.hrLeaveStartDate || '휴직 시작일'} v={identity.leaveStartDate} />
                  <HrPair k={L.hrLeaveEndDate || '휴직 종료일'} v={identity.leaveEndDate} />
                  <HrPair
                    k={L.hrMilitaryService || '병역'}
                    v={militaryLabel(identity.militaryService, L.hrMilitaryOptions)}
                  />
                </>
              )}
            </HrSection>
            <HrSection title={L.hrFamily || '가족'}>
              <HrPair k={L.hrMarital || '혼인 여부'} v={family.maritalStatus} />
              <HrPair k={L.hrEmergency || '비상연락처'} v={[ec.name, ec.relation, ec.phone].filter(Boolean).join(' · ')} />
            </HrSection>
            <HrSection title={`${L.hrDependents || '부양가족'} (${deps.length})`}>
              <HrList items={deps} empty={L.hrDependentsEmpty || '등록된 부양가족이 없습니다.'} render={(d) => `${d.name} · ${relLabel(d.relation)}${d.dateOfBirth ? ` · ${d.dateOfBirth}` : ''} · ${d.isDependent ? (L.hrDep || '부양중') : (L.hrNotDep || '비부양')}`} />
            </HrSection>
            <HrSection title={`${L.hrEducation || '학력'} (${(org.education ?? []).length})`}>
              <HrList items={org.education ?? []} empty={L.hrEducationEmpty || '등록된 학력이 없습니다.'} render={(e) => [e.school, e.major, e.degree, `${e.from ?? ''}~${e.to ?? ''}`, e.status].filter(Boolean).join(' · ')} />
            </HrSection>
            <HrSection title={`${L.hrCareer || '경력'} (${(org.career ?? []).length})`}>
              <HrList items={org.career ?? []} empty={L.hrCareerEmpty || '등록된 경력이 없습니다.'} render={(c) => [c.company, c.department, c.role, `${c.from ?? ''}~${c.to ?? ''}`].filter(Boolean).join(' · ')} />
            </HrSection>
            <HrSection title={`${L.hrCert || '자격증'} (${(org.certifications ?? []).length})`}>
              <HrList items={org.certifications ?? []} empty={L.hrCertEmpty || '등록된 자격증이 없습니다.'} render={(c) => [c.name, c.issuer, c.issuedDate && `발급 ${c.issuedDate}`, c.expiryDate && `만료 ${c.expiryDate}`].filter(Boolean).join(' · ')} />
            </HrSection>
            <HrSection title={`${L.hrDocuments || '증빙서류'} (${(org.documents ?? []).length})`}>
              <HrList items={org.documents ?? []} empty={L.hrDocumentsEmpty || '첨부된 서류가 없습니다.'} render={(d) => [d.fileName, d.docType, d.uploadedAt].filter(Boolean).join(' · ')} />
            </HrSection>
          </>
        )}
      </div>
    </div>
  );
}

// ── 연봉 이력 모달 ──────────────────────────────────────
export function SalaryHistoryModal({ row, labels, onLoad, onAdd, onClose, onSalarySynced }) {
  const L = labels || {};
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ effectiveDate: '', amount: '', reason: '' });
  const [busy, setBusy] = useState(false);
  // 날짜 picker 팝오버 앵커 — 열려 있으면 { rect, el }.
  const [picker, setPicker] = useState(null);
  const [addError, setAddError] = useState(false);

  useEffect(() => {
    // loading 초기값이 true — 모달은 열 때마다 새로 마운트되므로 여기서 다시
    // 동기 setState 하지 않는다(effect 내 synchronous setState 회피).
    let alive = true;
    Promise.resolve(onLoad?.(row.id))
      .then((h) => {
        if (alive) setHistory(Array.isArray(h) ? h : []);
      })
      .catch(() => {
        if (alive) setHistory([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [row.id, onLoad]);

  // ESC 로 닫기 — 같은 파일의 SalaryExportModal 과 같은 관례.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const sorted = [...history].sort((a, b) => String(a.effectiveDate).localeCompare(String(b.effectiveDate)));
  const canAdd = form.effectiveDate && form.amount && !busy;

  async function add() {
    if (!canAdd || !onAdd) return;
    setBusy(true);
    setAddError(false);
    try {
      const res = await onAdd(row.id, { ...form });
      if (res?.history) setHistory(res.history);
      else setHistory((prev) => [...prev, { ...form }]);
      if (res && 'salary' in res) onSalarySynced?.(res.salary);
      setForm({ effectiveDate: '', amount: '', reason: '' });
    } catch {
      // 저장 실패를 삼키면 "눌렀는데 아무 일도 안 난다"가 된다. 전역 에러 화면으로
      // 튕기지 않고(입력이 날아간다) 폼 안에서 알린다 — 입력값은 그대로 남긴다.
      setAddError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-modal-root" role="dialog" aria-modal="true" data-testid="salary-history-modal">
      <div className="admin-modal-backdrop" onClick={onClose} />
      <div className="admin-modal">
        <div className="admin-modal-header">
          <div className="admin-modal-headline">
            <span className="admin-modal-headline-icon"><IconSalary size={17} /></span>
            <div>
              <div className="admin-modal-title">
                {row.name || (L.newEmployee || '신규 직원')} · {L.salaryHistoryTitle || '연봉 이력'}
              </div>
              <div className="admin-modal-desc">
                {L.salaryHistoryDesc || '적용일 기준 누적 이력 · 최신 이력이 현재 연봉으로 반영'}
                {/* 자물쇠는 이모지가 아니라 인라인 SVG — 색은 감싸는 span 의 color 를 따른다. */}
                <span className="admin-emp-sal-mask">
                  <IconLock size={11} />
                  {L.salaryHistoryMask || '권한별 마스킹'}
                </span>
              </div>
            </div>
          </div>
          <button type="button" className="admin-modal-close" onClick={onClose} aria-label={L.close || '닫기'}>
            <IconClose size={16} />
          </button>
        </div>
        <div className="admin-modal-body">
          {loading ? (
            <div className="admin-emp-sal-status">{L.loading || '불러오는 중…'}</div>
          ) : sorted.length === 0 ? (
            <div className="admin-emp-sal-status">{L.salaryHistoryEmpty || '등록된 연봉 이력이 없습니다. 아래에서 추가하세요. (연봉은 비필수 항목입니다)'}</div>
          ) : (
            <table className="admin-emp-sal-table">
              <thead>
                <tr>
                  <th>{L.salaryHistEffDate || '적용일'}</th>
                  <th className="is-amount">{L.salaryHistAmount || '연봉'}</th>
                  <th>{L.salaryHistReason || '사유'}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((h, i) => {
                  const isLatest = i === sorted.length - 1;
                  return (
                    <tr key={i} className={isLatest ? 'is-current' : undefined}>
                      <td className="is-date">
                        {h.effectiveDate}
                        {isLatest && <span className="admin-emp-sal-current">{L.salaryHistCurrent || '현재'}</span>}
                      </td>
                      <td className="is-amount">{fmtKRW(h.amount)}</td>
                      <td>{h.reason || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <div className="admin-emp-sal-add">
            <div className="admin-emp-sal-add-title">{L.salaryHistAdd || '연봉 이력 추가'}</div>
            <div className="admin-emp-sal-add-row">
              <div className="admin-emp-field">
                <label className="admin-emp-field-label" htmlFor="sal-hist-date">{L.salaryHistEffDate || '적용일'}</label>
                {/* 브라우저 기본 date 입력은 로케일에 따라 mm/dd/yyyy 로 떠서 한국어 화면과
                    어긋난다. 다른 어드민 화면과 같은 공용 DatePicker 를 연다. */}
                <button
                  type="button"
                  id="sal-hist-date"
                  className={`admin-emp-input admin-emp-sal-date${picker ? ' is-open' : ''}${form.effectiveDate ? '' : ' is-empty'}`}
                  onClick={(e) => setPicker(picker ? null : { rect: e.currentTarget.getBoundingClientRect(), el: e.currentTarget })}
                >
                  {form.effectiveDate || (L.salaryHistEffDatePh || 'YYYY-MM-DD')}
                </button>
              </div>
              <div className="admin-emp-field">
                <label className="admin-emp-field-label" htmlFor="sal-hist-amount">{L.salaryHistAmount || '연봉'}</label>
                <input
                  id="sal-hist-amount"
                  className="admin-emp-input admin-emp-sal-amount"
                  type="text"
                  inputMode="numeric"
                  placeholder={L.salaryHistAmountPh || '연봉(원)'}
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value.replace(/[^0-9]/g, '') }))}
                />
              </div>
              <div className="admin-emp-field is-reason">
                <label className="admin-emp-field-label" htmlFor="sal-hist-reason">{L.salaryHistReason || '사유'}</label>
                <input
                  id="sal-hist-reason"
                  className="admin-emp-input"
                  type="text"
                  placeholder={L.salaryHistReasonPh || '사유 (예: 연봉 조정/승진)'}
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                />
              </div>
              <button type="button" className="admin-emp-btn is-primary" onClick={add} disabled={!canAdd}>
                {L.salaryHistAddBtn || '추가'}
              </button>
            </div>
            {addError && (
              <div className="admin-emp-sal-error" role="alert">
                {L.salaryHistAddError || '연봉 이력을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'}
              </div>
            )}
            <div className="admin-emp-sal-note">{L.salaryHistNote || '적용일은 발령/조정 효력 시작일입니다. 요청일과 다를 수 있습니다(effective-date 기준).'}</div>
          </div>
        </div>
      </div>
      {picker && (
        <DatePicker
          anchorRect={picker.rect}
          anchorEl={picker.el}
          selectedDate={isoToDate(form.effectiveDate)}
          onSelect={(d) => { setForm((f) => ({ ...f, effectiveDate: dateToIso(d) })); setPicker(null); }}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}

// 로컬 타임존 기준 'YYYY-MM-DD' (toISOString 의 UTC off-by-one 회피).
// AdminNotificationsCanvas 와 같은 구현 — 날짜 입력이 하루 밀리던 자리다.
function dateToIso(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function isoToDate(iso) {
  const [y, m, d] = (iso || '').split('-').map(Number);
  return y ? new Date(y, m - 1, d) : new Date();
}
