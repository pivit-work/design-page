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
import DateInput from '../shared/DateInput.jsx';
import { IconLock } from './employeeExport.jsx';
import ModalShell from '../shared/ModalShell.jsx';
import RosterTable from '../shared/RosterTable.jsx';

/* 시트에서 함께 옮겨 온 토큰 — 이 폴더의 다른 캔버스와 같은 값이다. */
const T = {
  font: 'var(--font-family-body)',
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

  const title = assigning
    ? (L.ceoAssignTitle || '{name}님을 대표로 지정합니다').replace('{name}', name)
    : (L.ceoReleaseTitle || '{name}님의 대표 지정을 해제합니다').replace('{name}', name);

  // 껍데기는 공용 창 틀(ModalShell · PW-836). 처리 중(busy)에는 Esc·막·닫기 X 를 받지 않는다 —
  // 요청은 이미 나갔으므로 닫혀서 「아무 일도 없었다」로 읽히면 안 된다.
  return (
    <ModalShell
      title={title}
      titleId="ceo-confirm-title"
      closeLabel={L.cancel || '취소'}
      onClose={onClose}
      busy={busy}
      zIndex={9999}
      className="adm-shell"
      testId="ceo-confirm-modal"
      footer={
        <>
          <button
            type="button"
            className="tl-group-modal-btn tl-group-modal-btn-secondary"
            onClick={onClose}
            disabled={busy}
          >
            {L.cancel || '취소'}
          </button>
          <button
            type="button"
            className={`tl-group-modal-btn ${assigning ? 'tl-group-modal-btn-primary' : 'adm-btn-danger'}`}
            onClick={confirm}
            disabled={busy}
          >
            {assigning ? (L.ceoAssignConfirm || '대표로 지정') : (L.ceoReleaseConfirm || '해제')}
          </button>
        </>
      }
    >
      <div className="adm-shell-body" style={{ fontFamily: T.font }}>
        <div style={{ fontSize: 12, color: T.sub, lineHeight: 1.7 }}>
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
          <div style={{ padding: '12px 14px', border: `1px solid ${T.border}`, borderRadius: 8, background: T.bg, display: 'flex', flexDirection: 'column', gap: 10 }}>
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
          <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.8 }}>
            <div>· {L.ceoNoteManager || '대표는 상급자를 가질 수 없습니다.'}</div>
            <div>· {L.ceoNoteRole || '권한은 바뀌지 않습니다 — 권한 관리 화면에서 따로 조정하세요.'}</div>
            <div>· {L.ceoNoteHistory || '이 변경은 발령 이력에 기록됩니다.'}</div>
          </div>
        )}

        {error && (
          <div data-testid="ceo-modal-error" style={{ padding: '8px 12px', borderRadius: 6, background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: 12 }}>
            {error}
          </div>
        )}
      </div>
    </ModalShell>
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
/**
 * 주소 다섯 칸을 읽기용 한 줄로 잇는다 (PW-920).
 *
 * 저장은 다섯 칸이고 한 줄은 **읽을 때만** 만든다 — 같은 값이 두 모양으로 남으면
 * 한쪽만 고쳐졌을 때 어느 쪽이 맞는지 판정할 수 없다.
 */
function joinAddressLine(address) {
  if (!address || typeof address !== 'object') return address ?? '';
  const line = [address.region, address.line2, address.line1].filter(Boolean).join(' ');
  const head = address.postalCode ? `[${address.postalCode}]` : '';
  const tail = address.country ? `(${address.country})` : '';
  return [head, line, tail].filter(Boolean).join(' ');
}

function HrEditPair({ k, value, onChange, type = 'text', date = false, options }) {
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
      ) : date ? (
        /* 기본 날짜 칸은 영어 브라우저에서 09/29/2026 으로 보인다 (PW-793) */
        <DateInput
          className="admin-emp-input"
          value={value ?? ''}
          onChange={onChange}
          aria-label={k}
          style={{ flex: 1, height: 30, fontSize: 12 }}
        />
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
  'probationEndDate',
  'leaveStartDate',
  'leaveEndDate',
  'militaryService',
  /* ── 인사 정보 25칸 (PW-920 · 코어 §1-3-g) ── */
  'lastName',
  'serviceStartDate',
  'firstHireDate',
  'employmentTypeStartDate',
  'lastWorkingDate',
  'isRehire',
  'workSchedule',
  'payType',
  'payCycle',
  'targetBonus',
  'targetBonusStart',
  'targetBonusEnd',
  'bankName',
  'bankAccount',
  'contractOvertime',
  'contractHoliday',
  'contractNight',
  /* 주소는 다섯 칸이다. 묶음(객체)으로 비교하면 참조가 달라 늘 «고쳤다»가 된다. */
  'addressPostalCode',
  'addressRegion',
  'addressDistrict',
  'addressDetail',
  'addressCountry',
];

/**
 * 서버가 주는 모양 → 화면이 쓰는 납작한 칸 (PW-920).
 *
 * 주소와 포괄 계약 시간은 묶음으로 오는데, 화면은 칸마다 하나씩 그린다. 묶음을 그대로
 * draft 에 두면 「고쳤나」 판정이 참조 비교가 되어 저장 버튼이 늘 켜진 채로 남는다.
 */
function flattenIdentity(identity) {
  const a = identity.address ?? {};
  const c = identity.contractHours ?? {};
  return {
    ...identity,
    addressPostalCode: a.postalCode ?? '',
    addressRegion: a.region ?? '',
    addressDistrict: a.line2 ?? '',
    addressDetail: a.line1 ?? '',
    addressCountry: a.country ?? '',
    contractOvertime: c.overtime ?? '',
    contractHoliday: c.holiday ?? '',
    contractNight: c.night ?? '',
    /* 계좌번호는 원래 값이 오지 않는다 — 「들어 있나」만 온다. 빈 칸으로 시작하고,
       손대지 않으면 보내지 않아 서버 값이 그대로 남는다. */
    bankAccount: '',
  };
}

/** 화면의 납작한 칸 → 서버가 받는 모양. */
function shapeIdentityForSave(draft) {
  const out = { ...draft };
  out.address = {
    postalCode: draft.addressPostalCode,
    region: draft.addressRegion,
    line2: draft.addressDistrict,
    line1: draft.addressDetail,
    country: draft.addressCountry,
  };
  const num = (v) => (String(v ?? '').trim() === '' ? undefined : Number(v));
  const hours = {
    overtime: num(draft.contractOvertime),
    holiday: num(draft.contractHoliday),
    night: num(draft.contractNight),
  };
  out.contractHours =
    hours.overtime === undefined &&
    hours.holiday === undefined &&
    hours.night === undefined
      ? null
      : hours;
  /* 손대지 않은 계좌번호는 아예 보내지 않는다 — 빈 문자열을 보내면 「지운다」가 된다. */
  if (!String(draft.bankAccount ?? '').trim()) delete out.bankAccount;
  for (const k of [
    'addressPostalCode', 'addressRegion', 'addressDistrict',
    'addressDetail', 'addressCountry',
    'contractOvertime', 'contractHoliday', 'contractNight',
  ]) delete out[k];
  return out;
}

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

export function HrProfileModal({
  row, labels, onLoad, onSaveIdentity, onClose,
  // 수료한 교육 과정·복리후생 (PW-920 재작업) — 넘기면 그 묶음을 넣고 고치고 지우는 자리가 선다.
  onLoadTrainings, onAddTraining, onUpdateTraining, onDeleteTraining,
  onLoadBenefits, onSaveBenefits,
  // 줄을 지우기 전에 묻는 자리 (PW-942) — `({ kind, label }) => Promise<boolean>`.
  confirmDelete,
}) {
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
    setIdentityDraft(flattenIdentity(identity));
    setIdentityState('idle');
  }
  const idDraft = identityDraft ?? flattenIdentity(identity);
  const setIdField = (key) => (v) => {
    setIdentityDraft((p) => ({ ...(p ?? identity), [key]: v }));
    setIdentityState('idle');
  };
  const identityBase = flattenIdentity(identity);
  const identityDirty =
    !!identityDraft &&
    HR_IDENTITY_FIELDS.some(
      (k) => (identityDraft[k] ?? '') !== (identityBase[k] ?? ''),
    );
  const submitIdentity = () => {
    setIdentityState('saving');
    Promise.resolve(onSaveIdentity(row?.id, shapeIdentityForSave(idDraft)))
      .then((saved) => {
        // 서버가 돌려준 값이 정본 — 정규화(빈 문자열→null)를 화면에 반영한다.
        if (saved) {
          setData((d) => ({ ...(d ?? {}), identity: saved }));
          setIdentityDraft(flattenIdentity(saved));
        }
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
    // 껍데기는 공용 창 틀(ModalShell · PW-836). 읽기(+신원 저장) 창이라 아래 버튼 줄이 없다 —
    // 신원 저장 버튼은 그 칸 바로 아래에 산다.
    <ModalShell
      title={`${row?.name || ''} · ${L.hrProfileTitle || 'HR 기록'}`}
      description={L.hrProfileDesc || '본인·HR 전용 · 읽기 전용(입력은 본인 내 설정)'}
      titleId="hr-profile-title"
      closeLabel={L.close || '닫기'}
      onClose={onClose}
      zIndex={1000}
      className="adm-shell"
      testId="hr-profile-modal"
      footer={null}
    >
      <div style={{ fontFamily: T.font }}>
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
                  <HrEditPair k={L.hrBirthDate || '생년월일'} date value={idDraft.birthDate} onChange={setIdField('birthDate')} />
                  <HrEditPair
                    k={L.hrGender || '성별'}
                    value={idDraft.gender}
                    onChange={setIdField('gender')}
                    options={L.hrGenderOptions || [{ value: 'male', label: '남성' }, { value: 'female', label: '여성' }, { value: 'other', label: '기타' }]}
                  />
                  <HrEditPair k={L.hrNationality || '국적'} value={idDraft.nationality} onChange={setIdField('nationality')} />
                  <HrEditPair k={L.hrLastName || '성'} value={idDraft.lastName} onChange={setIdField('lastName')} />
                  {/* 집 주소 다섯 칸 (PW-920 · 코어 §1-3-g 11~15번). 한 칸에 몰아 담으면
                      우편번호를 따로 쓰는 곳이 그 문자열을 다시 갈라내야 한다. */}
                  <HrEditPair k={L.hrAddressPostalCode || '우편번호'} value={idDraft.addressPostalCode} onChange={setIdField('addressPostalCode')} />
                  <HrEditPair k={L.hrAddressRegion || '시 · 도'} value={idDraft.addressRegion} onChange={setIdField('addressRegion')} />
                  <HrEditPair k={L.hrAddressDistrict || '시군구 · 동'} value={idDraft.addressDistrict} onChange={setIdField('addressDistrict')} />
                  <HrEditPair k={L.hrAddressDetail || '상세 주소'} value={idDraft.addressDetail} onChange={setIdField('addressDetail')} />
                  <HrEditPair k={L.hrAddressCountry || '국가'} value={idDraft.addressCountry} onChange={setIdField('addressCountry')} />
                  <HrEditPair k={L.hrProbationEndDate || '수습 종료일'} date value={idDraft.probationEndDate} onChange={setIdField('probationEndDate')} />
                  <HrEditPair k={L.hrLeaveStartDate || '휴직 시작일'} date value={idDraft.leaveStartDate} onChange={setIdField('leaveStartDate')} />
                  <HrEditPair k={L.hrLeaveEndDate || '휴직 종료일'} date value={idDraft.leaveEndDate} onChange={setIdField('leaveEndDate')} />
                  <HrEditPair
                    k={L.hrMilitaryService || '병역'}
                    value={idDraft.militaryService}
                    onChange={setIdField('militaryService')}
                    options={L.hrMilitaryOptions || MILITARY_OPTIONS}
                  />
                  {/* ── 고용 일자·근무 일정 (PW-920 · 코어 §1-3-g 분류 2·4) ── */}
                  <HrEditPair k={L.hrServiceStartDate || '기산일'} date value={idDraft.serviceStartDate} onChange={setIdField('serviceStartDate')} />
                  <HrEditPair k={L.hrFirstHireDate || '최초 입사일'} date value={idDraft.firstHireDate} onChange={setIdField('firstHireDate')} />
                  <HrEditPair k={L.hrEmploymentTypeStartDate || '현 고용형태 시작일'} date value={idDraft.employmentTypeStartDate} onChange={setIdField('employmentTypeStartDate')} />
                  <HrEditPair k={L.hrLastWorkingDate || '마지막 출근일'} date value={idDraft.lastWorkingDate} onChange={setIdField('lastWorkingDate')} />
                  <HrEditPair
                    k={L.hrIsRehire || '재입사 여부'}
                    value={idDraft.isRehire ? 'yes' : 'no'}
                    onChange={(v) => setIdField('isRehire')(v === 'yes')}
                    options={L.hrYesNoOptions || [{ value: 'no', label: '아니오' }, { value: 'yes', label: '예' }]}
                  />
                  <HrEditPair
                    k={L.hrWorkSchedule || '근무 일정'}
                    value={idDraft.workSchedule}
                    onChange={setIdField('workSchedule')}
                    options={L.hrWorkScheduleOptions || []}
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
                      data-testid="hr-identity-save"
                      className="admin-emp-btn is-primary"
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
                  <HrPair k={L.hrAddress || '주소'} v={joinAddressLine(identity.address)} />
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
            {/*
              급여·계좌 (PW-920 · 코어 §1-3-g 분류 3).
              전부 가장 민감한 등급이라 **본인과 HR 만** 본다 — 이 모달은 어드민 전용
              경로로만 열린다. 계좌번호는 원래 값이 내려오지 않고, 손대지 않으면 보내지도
              않는다(빈 칸을 보내면 「지운다」가 된다).
            */}
            {onSaveIdentity && (
              <HrSection title={L.hrPaySection || '급여 · 계좌'}>
                <HrEditPair
                  k={L.hrPayType || '급여 유형'}
                  value={idDraft.payType}
                  onChange={setIdField('payType')}
                  options={L.hrPayTypeOptions || []}
                />
                <HrEditPair
                  k={L.hrPayCycle || '급여 지급 주기'}
                  value={idDraft.payCycle}
                  onChange={setIdField('payCycle')}
                  options={L.hrPayCycleOptions || []}
                />
                <HrEditPair k={L.hrContractOvertime || '포괄 계약 시간 · 초과'} value={idDraft.contractOvertime} onChange={setIdField('contractOvertime')} />
                <HrEditPair k={L.hrContractHoliday || '포괄 계약 시간 · 휴일'} value={idDraft.contractHoliday} onChange={setIdField('contractHoliday')} />
                <HrEditPair k={L.hrContractNight || '포괄 계약 시간 · 야간'} value={idDraft.contractNight} onChange={setIdField('contractNight')} />
                <HrEditPair k={L.hrTargetBonus || '타겟 보너스'} value={idDraft.targetBonus} onChange={setIdField('targetBonus')} />
                <HrEditPair k={L.hrTargetBonusStart || '타겟 보너스 시작'} date value={idDraft.targetBonusStart} onChange={setIdField('targetBonusStart')} />
                <HrEditPair k={L.hrTargetBonusEnd || '타겟 보너스 종료'} date value={idDraft.targetBonusEnd} onChange={setIdField('targetBonusEnd')} />
                <HrEditPair k={L.hrBankName || '은행명'} value={idDraft.bankName} onChange={setIdField('bankName')} />
                <HrEditPair
                  k={L.hrBankAccount || '계좌번호'}
                  value={idDraft.bankAccount}
                  onChange={setIdField('bankAccount')}
                />
                <div style={{ fontSize: 11, color: T.muted, padding: '2px 0 0 96px' }}>
                  {identity.bankAccount?.present
                    ? (L.hrBankAccountStored || '등록돼 있습니다. 바꾸려면 새 번호를 넣으세요.')
                    : (L.hrBankAccountEmpty || '등록된 계좌가 없습니다.')}
                </div>
              </HrSection>
            )}
            {onLoadTrainings && (
              <HrTrainingsSection
                memberId={row?.id}
                labels={L}
                onLoad={onLoadTrainings}
                onAdd={onAddTraining}
                onUpdate={onUpdateTraining}
                onDelete={onDeleteTraining}
                confirmDelete={confirmDelete}
              />
            )}
            {onLoadBenefits && (
              <HrBenefitsSection memberId={row?.id} labels={L} onLoad={onLoadBenefits} onSave={onSaveBenefits} />
            )}
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
    </ModalShell>
  );
}

// ── 수료한 교육 과정 (PW-920 재작업 · 코어 §1-3-g 81번) ─────────────────────
// 한 사람에 여러 건이 쌓인다. 줄마다 고치기·지우기, 아래 한 줄로 추가한다.
// 실패는 전역 오류 화면으로 튕기지 않고 이 묶음 안에 알린다 — 적던 값이 날아가지 않게.
const EMPTY_TRAINING = { courseName: '', completedAt: '', note: '' };

function HrTrainingsSection({ memberId, labels, onLoad, onAdd, onUpdate, onDelete, confirmDelete }) {
  const L = labels || {};
  const [rows, setRows] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [form, setForm] = useState(EMPTY_TRAINING);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.resolve(onLoad(memberId))
      .then((r) => { if (alive) setRows(Array.isArray(r) ? r : []); })
      .catch(() => { if (alive) { setRows([]); setLoadError(true); } });
    return () => { alive = false; };
  }, [memberId, onLoad]);

  const run = async (fn) => {
    setBusy(true);
    setError(false);
    try {
      const next = await fn();
      if (Array.isArray(next)) setRows(next);
      return true;
    } catch {
      setError(true);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    const body = {
      courseName: form.courseName.trim(),
      completedAt: form.completedAt || null,
      note: form.note.trim() || null,
    };
    const ok = await run(() => (editingId ? onUpdate(memberId, editingId, body) : onAdd(memberId, body)));
    if (ok) { setForm(EMPTY_TRAINING); setEditingId(null); }
  };
  const startEdit = (r) => {
    setEditingId(r.id);
    setForm({ courseName: r.courseName ?? '', completedAt: r.completedAt ?? '', note: r.note ?? '' });
    setError(false);
  };
  const cancelEdit = () => { setEditingId(null); setForm(EMPTY_TRAINING); };

  const canEdit = Boolean(onAdd);
  const list = rows ?? [];
  return (
    <HrSection title={`${L.hrTrainings || '수료한 교육 과정'} (${list.length})`}>
      <div data-testid="hr-trainings">
        {rows === null ? (
          <div style={{ fontSize: 12, color: T.muted, padding: '4px 0' }}>{L.loading || '불러오는 중…'}</div>
        ) : loadError ? (
          <div style={{ fontSize: 12, color: '#DC2626', padding: '4px 0' }} role="alert">{L.hrTrainingsLoadError || '교육 기록을 불러오지 못했습니다.'}</div>
        ) : list.length === 0 ? (
          <div style={{ fontSize: 12, color: T.muted, padding: '4px 0' }}>{L.hrTrainingsEmpty || '등록된 교육 과정이 없습니다.'}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {list.map((r) => (
              <div
                key={r.id}
                data-testid="hr-training-row"
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: T.text, padding: '7px 10px', background: editingId === r.id ? '#EEF2FF' : T.bg, border: `1px solid ${T.border}`, borderRadius: 8 }}
              >
                <span style={{ flex: 1 }}>
                  {/* 수료일이 없으면 날짜 자리를 비운다 (PW-942). 「이수 중」으로 적으면 초대 CSV 처럼
                      과정명만 받은 기록이 수료하지 않은 것처럼 읽힌다 — 칸 이름이 「수료한 교육 과정」이다. */}
                  {[r.courseName, r.completedAt ? `${L.hrTrainingCompletedPrefix || '수료'} ${r.completedAt}` : null, r.note].filter(Boolean).join(' · ')}
                </span>
                {canEdit && onUpdate && (
                  <button type="button" className="admin-emp-btn" onClick={() => startEdit(r)} disabled={busy} style={{ fontSize: 11, padding: '3px 8px' }}>
                    {L.hrRecordEdit || '고치기'}
                  </button>
                )}
                {canEdit && onDelete && (
                  <button type="button" className="admin-emp-btn" onClick={async () => {
                    if (confirmDelete && !(await confirmDelete({ kind: 'training', label: r.courseName }))) return;
                    await run(() => onDelete(memberId, r.id));
                  }} disabled={busy} style={{ fontSize: 11, padding: '3px 8px' }} aria-label={`${L.hrRecordDelete || '지우기'} ${r.courseName}`}>
                    {L.hrRecordDelete || '지우기'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {canEdit && !loadError && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${T.bl}` }}>
            <HrEditPair k={L.hrTrainingCourse || '과정명'} value={form.courseName} onChange={(v) => setForm((f) => ({ ...f, courseName: v }))} />
            <HrEditPair k={L.hrTrainingCompletedAt || '수료일'} date value={form.completedAt} onChange={(v) => setForm((f) => ({ ...f, completedAt: v }))} />
            <HrEditPair k={L.hrTrainingNote || '메모'} value={form.note} onChange={(v) => setForm((f) => ({ ...f, note: v }))} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 6 }}>
              {error && <span style={{ fontSize: 11, color: '#DC2626' }} role="alert">{L.hrRecordSaveError || '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'}</span>}
              {editingId && (
                <button type="button" className="admin-emp-btn" onClick={cancelEdit} disabled={busy} style={{ fontSize: 12, padding: '6px 12px' }}>
                  {L.hrRecordCancel || '취소'}
                </button>
              )}
              <button
                type="button"
                className="admin-emp-btn is-primary"
                data-testid="hr-training-submit"
                onClick={submit}
                disabled={busy || !form.courseName.trim()}
              >
                {editingId ? (L.hrRecordSave || '저장') : (L.hrTrainingAdd || '교육 과정 추가')}
              </button>
            </div>
          </div>
        )}
      </div>
    </HrSection>
  );
}

// ── 복리후생 (PW-920 재작업 · 코어 §1-3-g 87~91번) ─────────────────────────
// 한 사람에 한 벌이라 다섯 칸을 한 번에 저장한다. 서버는 «보낸 것이 전부»로 덮으므로
// 비운 칸은 지워진다. 기타 복리후생은 회사마다 항목이 달라 이름·값 줄로 쌓는다.
const EMPTY_BENEFIT = { healthInsuranceProvider: '', planType: '', pensionContribution: '', stockOptions: '', otherBenefits: [] };

const benefitDraftOf = (b) => ({
  healthInsuranceProvider: b?.healthInsuranceProvider ?? '',
  planType: b?.planType ?? '',
  // numeric 은 `350000.00` 처럼 올 수 있다 — 칸에는 정수로 보인다.
  pensionContribution: b?.pensionContribution != null && b.pensionContribution !== '' ? String(Math.round(Number(b.pensionContribution))) : '',
  stockOptions: b?.stockOptions ?? '',
  otherBenefits: Array.isArray(b?.otherBenefits) ? b.otherBenefits.map((o) => ({ name: o.name ?? '', value: o.value ?? '' })) : [],
});

function HrBenefitsSection({ memberId, labels, onLoad, onSave }) {
  const L = labels || {};
  const [draft, setDraft] = useState(null);
  const [base, setBase] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [state, setState] = useState('idle');

  useEffect(() => {
    let alive = true;
    Promise.resolve(onLoad(memberId))
      .then((b) => { if (alive) { const d = benefitDraftOf(b); setDraft(d); setBase(d); } })
      .catch(() => { if (alive) { setDraft(EMPTY_BENEFIT); setBase(EMPTY_BENEFIT); setLoadError(true); } });
    return () => { alive = false; };
  }, [memberId, onLoad]);

  const d = draft ?? EMPTY_BENEFIT;
  const set = (key) => (v) => { setDraft((p) => ({ ...(p ?? EMPTY_BENEFIT), [key]: v })); setState('idle'); };
  const setOther = (i, key, v) => {
    setDraft((p) => ({ ...p, otherBenefits: p.otherBenefits.map((o, j) => (j === i ? { ...o, [key]: v } : o)) }));
    setState('idle');
  };
  const addOther = () => { setDraft((p) => ({ ...p, otherBenefits: [...p.otherBenefits, { name: '', value: '' }] })); setState('idle'); };
  const removeOther = (i) => { setDraft((p) => ({ ...p, otherBenefits: p.otherBenefits.filter((_, j) => j !== i) })); setState('idle'); };

  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(base);
  const pensionBad = d.pensionContribution !== '' && !/^\d+$/.test(String(d.pensionContribution).replace(/,/g, ''));

  const save = () => {
    setState('saving');
    const body = {
      healthInsuranceProvider: d.healthInsuranceProvider.trim() || null,
      planType: d.planType.trim() || null,
      pensionContribution: String(d.pensionContribution).replace(/,/g, '').trim() || null,
      stockOptions: d.stockOptions.trim() || null,
      otherBenefits: d.otherBenefits
        .map((o) => ({ name: o.name.trim(), value: o.value.trim() }))
        .filter((o) => o.name)
        .map((o) => (o.value ? o : { name: o.name })),
    };
    Promise.resolve(onSave(memberId, body))
      .then((saved) => {
        const next = benefitDraftOf(saved ?? body);
        setDraft(next);
        setBase(next);
        setState('saved');
      })
      .catch(() => setState('error'));
  };

  const readOnly = !onSave;
  return (
    <HrSection title={L.hrBenefits || '복리후생'}>
      <div data-testid="hr-benefits">
        {draft === null ? (
          <div style={{ fontSize: 12, color: T.muted, padding: '4px 0' }}>{L.loading || '불러오는 중…'}</div>
        ) : loadError ? (
          <div style={{ fontSize: 12, color: '#DC2626', padding: '4px 0' }} role="alert">{L.hrBenefitsLoadError || '복리후생을 불러오지 못했습니다.'}</div>
        ) : readOnly ? (
          <>
            <HrPair k={L.hrHealthInsuranceProvider || '건강 보험 제공사'} v={d.healthInsuranceProvider} />
            <HrPair k={L.hrInsurancePlanType || '보험 플랜 유형'} v={d.planType} />
            <HrPair k={L.hrPensionContribution || '퇴직연금 기여금'} v={fmtKRW(d.pensionContribution)} />
            <HrPair k={L.hrStockOptions || '주식 옵션'} v={d.stockOptions} />
            <HrPair k={L.hrOtherBenefits || '기타 복리후생'} v={d.otherBenefits.map((o) => (o.value ? `${o.name}: ${o.value}` : o.name)).join(' · ')} />
          </>
        ) : (
          <>
            <HrEditPair k={L.hrHealthInsuranceProvider || '건강 보험 제공사'} value={d.healthInsuranceProvider} onChange={set('healthInsuranceProvider')} />
            <HrEditPair k={L.hrInsurancePlanType || '보험 플랜 유형'} value={d.planType} onChange={set('planType')} />
            <HrEditPair k={L.hrPensionContribution || '퇴직연금 기여금'} value={d.pensionContribution} onChange={set('pensionContribution')} />
            {pensionBad && (
              <div style={{ fontSize: 11, color: '#DC2626', padding: '2px 0 0 96px' }} role="alert">{L.hrPensionContributionInvalid || '금액(숫자)으로 적어 주세요.'}</div>
            )}
            <HrEditPair k={L.hrStockOptions || '주식 옵션'} value={d.stockOptions} onChange={set('stockOptions')} />
            <div style={{ display: 'flex', gap: 8, fontSize: 12, padding: '3px 0', alignItems: 'flex-start' }}>
              <span style={{ minWidth: 88, color: T.muted, paddingTop: 7 }}>{L.hrOtherBenefits || '기타 복리후생'}</span>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {d.otherBenefits.map((o, i) => (
                  <div key={i} style={{ display: 'flex', gap: 4 }} data-testid="hr-other-benefit-row">
                    <input className="admin-emp-input" value={o.name} onChange={(e) => setOther(i, 'name', e.target.value)} placeholder={L.hrOtherBenefitName || '항목 (예: 식대)'} aria-label={L.hrOtherBenefitName || '항목'} style={{ flex: 1, minWidth: 0, height: 30, fontSize: 12 }} />
                    <input className="admin-emp-input" value={o.value} onChange={(e) => setOther(i, 'value', e.target.value)} placeholder={L.hrOtherBenefitValue || '내용 (예: 월 20만원)'} aria-label={L.hrOtherBenefitValue || '내용'} style={{ flex: 1, minWidth: 0, height: 30, fontSize: 12 }} />
                    <button type="button" className="admin-emp-btn" onClick={() => removeOther(i)} style={{ flexShrink: 0, fontSize: 11, padding: '3px 8px' }}>{L.hrRecordDelete || '지우기'}</button>
                  </div>
                ))}
                <button type="button" className="admin-emp-btn" onClick={addOther} style={{ alignSelf: 'flex-start', fontSize: 11, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <IconPlusSmall size={11} />
                  {L.hrOtherBenefitAdd || '항목 추가'}
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 8 }}>
              {state === 'error' && <span style={{ fontSize: 11, color: '#DC2626' }} role="alert">{L.hrRecordSaveError || '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'}</span>}
              {state === 'saved' && <span style={{ fontSize: 11, color: '#16A34A' }} role="status">{L.hrIdentitySaved || '저장됐습니다'}</span>}
              <button
                type="button"
                className="admin-emp-btn is-primary"
                data-testid="hr-benefits-save"
                onClick={save}
                disabled={!dirty || pensionBad || state === 'saving'}
              >
                {state === 'saving' ? (L.hrIdentitySaving || '저장 중…') : (L.hrBenefitsSave || '복리후생 저장')}
              </button>
            </div>
          </>
        )}
      </div>
    </HrSection>
  );
}

// ── 연봉 이력 모달 ──────────────────────────────────────
/**
 * 보상 종류 (PW-920 재작업 · 코어 §2-1 `compensation_type`). 이 창에서 넣는 것은 셋이다.
 *
 * - 연봉 — 쌓아 가는 기록이라 **고치거나 지우지 않는다**(서버도 거절한다). 가장 늦은 적용일의
 *   금액이 현재 연봉이 된다.
 * - 계약 기간 — 시작·종료일. 금액은 비워도 된다(기획서가 «기간»으로 지정한 칸이다).
 * - 초과근무 수당 — 매월 금액이 달라져 행으로 쌓는다. 현재 연봉에 섞이지 않는다.
 */
const COMP_TYPES = ['salary', 'contract', 'overtime_allowance'];
const COMP_TYPE_DEFAULT_LABEL = { salary: '연봉', contract: '계약 기간', overtime_allowance: '초과근무 수당', stock: '주식' };
const EMPTY_COMP_FORM = { compensationType: 'salary', effectiveDate: '', effectiveEndDate: '', amount: '', reason: '' };

// ── 보상 이력 모달 (연봉 · 계약 기간 · 초과근무 수당) ──────────────────────
export function SalaryHistoryModal({ row, labels, onLoad, onAdd, onUpdate, onDelete, onClose, onSalarySynced, confirmDelete }) {
  const L = labels || {};
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_COMP_FORM);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
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

  // ESC 로 닫기는 공용 창 틀(ModalShell)이 한다 — 날짜 칸의 Esc 는 달력만 닫는다.

  const typeOf = (h) => h.compensationType || 'salary';
  const typeLabel = (t) => (L.compTypeLabels && L.compTypeLabels[t]) || COMP_TYPE_DEFAULT_LABEL[t] || t;
  const sorted = [...history].sort((a, b) => String(a.effectiveDate).localeCompare(String(b.effectiveDate)));
  // 「현재」는 연봉 줄에만 붙는다 — 수당·계약이 뒤에 쌓여도 현재 연봉은 연봉 줄이다.
  const salaryRows = sorted.filter((h) => typeOf(h) === 'salary');
  const currentSalary = salaryRows[salaryRows.length - 1];
  const isContract = form.compensationType === 'contract';
  const endBeforeStart = isContract && form.effectiveEndDate && form.effectiveDate && form.effectiveEndDate < form.effectiveDate;
  const canSubmit = form.effectiveDate && (form.amount || isContract) && !endBeforeStart && !busy;
  const canEditRow = (h) => typeOf(h) !== 'salary' && h.id;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setAddError(false);
    const body = {
      compensationType: form.compensationType,
      effectiveDate: form.effectiveDate,
      ...(isContract && form.effectiveEndDate ? { effectiveEndDate: form.effectiveEndDate } : {}),
      ...(form.amount ? { amount: form.amount } : {}),
      ...(form.reason ? { reason: form.reason } : {}),
    };
    try {
      const res = editingId ? await onUpdate(row.id, editingId, body) : await onAdd(row.id, body);
      if (res?.history) setHistory(res.history);
      else if (!editingId) setHistory((prev) => [...prev, { ...body }]);
      if (res && 'salary' in res) onSalarySynced?.(res.salary);
      setForm(EMPTY_COMP_FORM);
      setEditingId(null);
    } catch {
      // 저장 실패를 삼키면 "눌렀는데 아무 일도 안 난다"가 된다. 전역 에러 화면으로
      // 튕기지 않고(입력이 날아간다) 폼 안에서 알린다 — 입력값은 그대로 남긴다.
      setAddError(true);
    } finally {
      setBusy(false);
    }
  }

  async function remove(h) {
    // 지우기 전에 묻는다 (PW-942) — 보상 기록은 되돌릴 길이 없다.
    if (confirmDelete && !(await confirmDelete({ kind: 'salary', label: typeLabel(typeOf(h)) }))) return;
    setBusy(true);
    setAddError(false);
    try {
      const res = await onDelete(row.id, h.id);
      if (res?.history) setHistory(res.history);
      else setHistory((prev) => prev.filter((x) => x.id !== h.id));
      if (res && 'salary' in res) onSalarySynced?.(res.salary);
      if (editingId === h.id) { setEditingId(null); setForm(EMPTY_COMP_FORM); }
    } catch {
      setAddError(true);
    } finally {
      setBusy(false);
    }
  }

  function startEdit(h) {
    setEditingId(h.id);
    setAddError(false);
    setForm({
      compensationType: typeOf(h),
      effectiveDate: h.effectiveDate ?? '',
      effectiveEndDate: h.effectiveEndDate ?? '',
      amount: h.amount != null ? String(Math.round(Number(h.amount))) : '',
      reason: h.reason ?? '',
    });
  }

  const withActions = Boolean(onUpdate || onDelete);

  return (
    // 껍데기는 공용 창 틀(ModalShell · PW-836). 읽기 + 추가 줄 창이라 아래 버튼 줄이 없다.
    <ModalShell
      title={`${row.name || (L.newEmployee || '신규 직원')} · ${L.salaryHistoryTitle || '보상 이력'}`}
      description={
        <>
          {L.salaryHistoryDesc || '적용일 기준 누적 이력 · 최신 연봉 이력이 현재 연봉으로 반영'}
          {/* 자물쇠는 이모지가 아니라 인라인 SVG — 색은 감싸는 span 의 color 를 따른다. */}
          <span className="admin-emp-sal-mask">
            <IconLock size={11} />
            {L.salaryHistoryMask || '권한별 마스킹'}
          </span>
        </>
      }
      titleId="salary-history-title"
      closeLabel={L.close || '닫기'}
      onClose={onClose}
      zIndex={1000}
      className="adm-shell is-wide"
      bodyClassName="adm-shell-body"
      testId="salary-history-modal"
      footer={null}
    >
      {loading ? (
        <div className="admin-emp-sal-status">{L.loading || '불러오는 중…'}</div>
      ) : sorted.length === 0 ? (
        <div className="admin-emp-sal-status">{L.salaryHistoryEmpty || '등록된 보상 이력이 없습니다. 아래에서 추가하세요. (보상은 비필수 항목입니다)'}</div>
      ) : (
        <RosterTable
          tableClassName="admin-emp-sal-table"
          rows={sorted}
          rowKey={(h, i) => h.id ?? i}
          rowProps={(h) => ({ tone: h === currentSalary ? 'current' : undefined })}
          columns={[
            {
              key: 'type',
              header: L.salaryHistType || '종류',
              // 「초과근무 수당」이 좁은 칸에서 한 글자씩 꺾이지 않게 날짜 칸과 같이 줄바꿈을 막는다.
              cellProps: { className: 'is-date' },
              render: (h) => typeLabel(typeOf(h)),
            },
            {
              key: 'date',
              header: L.salaryHistEffDate || '적용일',
              // 기간은 「~」 뒤에서 줄을 넘길 수 있게 둔다 (PW-942). 한 줄로 묶으면 계약 기간
              // 한 칸이 표 폭을 다 먹어 사유 칸이 한 글자씩 꺾이고 「지우기」가 창 밖으로 밀린다.
              cellProps: { className: 'is-range' },
              render: (h) => (
                <>
                  {h.effectiveEndDate ? (
                    <>
                      <span className="admin-emp-sal-day">{h.effectiveDate} ~</span>{' '}
                      <span className="admin-emp-sal-day">{h.effectiveEndDate}</span>
                    </>
                  ) : (
                    <span className="admin-emp-sal-day">{h.effectiveDate}</span>
                  )}
                  {h === currentSalary && <span className="admin-emp-sal-current">{L.salaryHistCurrent || '현재'}</span>}
                </>
              ),
            },
            {
              key: 'amount',
              header: L.salaryHistAmount || '금액',
              align: 'right',
              cellProps: { className: 'is-amount' },
              render: (h) => fmtKRW(h.amount),
            },
            {
              key: 'reason',
              header: L.salaryHistReason || '사유',
              cellProps: { className: 'is-reason' },
              headerProps: { className: 'is-reason' },
              render: (h) => h.reason || '—',
            },
            ...(withActions
              ? [{
                  key: 'actions',
                  header: '',
                  align: 'right',
                  cellProps: { className: 'is-actions' },
                  render: (h) =>
                    canEditRow(h) ? (
                      <span style={{ display: 'inline-flex', gap: 4 }}>
                        {onUpdate && (
                          <button type="button" className="admin-emp-btn" data-testid="comp-row-edit" onClick={() => startEdit(h)} disabled={busy} style={{ fontSize: 11, padding: '3px 8px' }}>
                            {L.hrRecordEdit || '고치기'}
                          </button>
                        )}
                        {onDelete && (
                          <button type="button" className="admin-emp-btn" data-testid="comp-row-delete" onClick={() => remove(h)} disabled={busy} style={{ fontSize: 11, padding: '3px 8px' }}>
                            {L.hrRecordDelete || '지우기'}
                          </button>
                        )}
                      </span>
                    ) : null,
                }]
              : []),
          ]}
        />
      )}

      {onAdd && (
        <div className="admin-emp-sal-add">
          <div className="admin-emp-sal-add-title">
            {editingId ? (L.salaryHistEditTitle || '보상 이력 고치기') : (L.salaryHistAdd || '보상 이력 추가')}
          </div>
          <div className="admin-emp-sal-add-row">
            <div className="admin-emp-field">
              <label className="admin-emp-field-label" htmlFor="sal-hist-type">{L.salaryHistType || '종류'}</label>
              {/* 고치는 중에는 종류를 못 바꾼다 — 서버도 종류는 그대로 둔다. */}
              <select
                id="sal-hist-type"
                className="admin-emp-input"
                value={form.compensationType}
                disabled={Boolean(editingId)}
                onChange={(e) => setForm((f) => ({ ...f, compensationType: e.target.value, effectiveEndDate: '' }))}
              >
                {COMP_TYPES.map((t) => (
                  <option key={t} value={t}>{typeLabel(t)}</option>
                ))}
              </select>
            </div>
            <div className="admin-emp-field">
              <label className="admin-emp-field-label" htmlFor="sal-hist-date">
                {isContract ? (L.salaryHistStartDate || '시작일') : (L.salaryHistEffDate || '적용일')}
              </label>
              {/* 기본 날짜 칸은 영어 브라우저에서 09/29/2026 으로 보인다 (PW-793) — 공용 날짜 칸. */}
              <DateInput
                id="sal-hist-date"
                className="admin-emp-input"
                value={form.effectiveDate}
                onChange={(v) => setForm((f) => ({ ...f, effectiveDate: v }))}
              />
            </div>
            {isContract && (
              <div className="admin-emp-field">
                <label className="admin-emp-field-label" htmlFor="sal-hist-end">{L.salaryHistEndDate || '종료일'}</label>
                <DateInput
                  id="sal-hist-end"
                  className="admin-emp-input"
                  value={form.effectiveEndDate}
                  onChange={(v) => setForm((f) => ({ ...f, effectiveEndDate: v }))}
                />
              </div>
            )}
            <div className="admin-emp-field">
              <label className="admin-emp-field-label" htmlFor="sal-hist-amount">
                {isContract ? (L.salaryHistAmountOptional || '금액(선택)') : (L.salaryHistAmount || '금액')}
              </label>
              <input
                id="sal-hist-amount"
                className="admin-emp-input admin-emp-sal-amount"
                type="text"
                inputMode="numeric"
                placeholder={L.salaryHistAmountPh || '금액(원)'}
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
            {editingId && (
              <button type="button" className="admin-emp-btn" onClick={() => { setEditingId(null); setForm(EMPTY_COMP_FORM); }} disabled={busy}>
                {L.hrRecordCancel || '취소'}
              </button>
            )}
            <button type="button" className="admin-emp-btn is-primary" data-testid="comp-submit" onClick={submit} disabled={!canSubmit}>
              {editingId ? (L.hrRecordSave || '저장') : (L.salaryHistAddBtn || '추가')}
            </button>
          </div>
          {endBeforeStart && (
            <div className="admin-emp-sal-error" role="alert">{L.salaryHistEndBeforeStart || '종료일이 시작일보다 앞설 수 없습니다.'}</div>
          )}
          {addError && (
            <div className="admin-emp-sal-error" role="alert">
              {L.salaryHistAddError || '보상 이력을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'}
            </div>
          )}
          <div className="admin-emp-sal-note">{L.salaryHistNote || '적용일은 발령/조정 효력 시작일입니다. 요청일과 다를 수 있습니다(effective-date 기준). 연봉 이력은 고치거나 지울 수 없어 새 이력으로 추가합니다.'}</div>
        </div>
      )}
    </ModalShell>
  );
}
