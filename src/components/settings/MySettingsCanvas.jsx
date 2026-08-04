import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * MySettingsCanvas — 내 설정 화면 정본.
 *
 * pivit-specs `K. 내-설정/my-settings-view.jsx` 시안을 design-page 토큰/프리미티브
 * (admin-card, admin-emp-input, admin-notif-toggle, admin-notif-btn, admin-notif-banner,
 * admin-notif-modal-*)로 포팅한 것. 스타일은 settings.css(msc-*) + admin.css.
 *
 * 순수/controlled 컴포넌트 — 데이터는 전부 props, 사용자 액션은 on* 콜백으로 방출.
 * 내부 state 는 편집 draft(프로필 폼, 비밀번호 폼)와 모달 open 여부 등 ephemeral UI 뿐.
 *
 * 탭 구성(설정 그룹): profile | visibility | notifications | integrations | security.
 * 프로필 그룹 확장 탭(내 프로필/가족/조직/성과/보상, PF1~PF4)은 백엔드 준비 후
 * tabs prop 에 추가하는 방식으로 확장한다.
 *
 * 2FA 는 다음 스프린트로 연기되어 이 캔버스에 없다 (2026-07-18 결정).
 */

const DEFAULT_LABELS = {
  navGroups: { profile: '프로필', settings: '설정' },
  tabs: {
    my_profile: '내 프로필',
    profile: '기본 정보',
    profile_basic: '기본 정보',
    profile_family: '가족 정보',
    profile_org: '조직 정보',
    profile_perf: '성과 정보',
    profile_comp: '보상 정보',
    visibility: '공개 범위',
    notifications: '알림',
    integrations: '개인 연동',
    security: '보안',
  },
  myProfile: {
    edit: '편집',
    basicInfo: '기본 정보',
    orgInfo: '조직 정보',
    perfInfo: '성과 정보',
    compInfo: '보상 정보',
    evaluator: '평가자',
    salaryTotal: '연봉 (총액)',
    effectiveDate: '적용 시작일',
    reveal: '보기',
    hide: '가리기',
    noEval: '아직 평가 이력이 없습니다.',
    noComp: '등록된 보상 정보가 없습니다.',
  },
  family: {
    section: '가족 정보',
    intro: '가족 정보는 인사 기록 목적으로 저장되며, 권한자(HR·어드민)만 열람할 수 있습니다. 입력은 선택 사항입니다.',
    maritalStatus: '혼인 여부',
    maritalOptions: { single: '미혼', married: '기혼', other: '기타' },
    emergencyName: '비상연락처 이름',
    emergencyRelation: '관계',
    emergencyPhone: '연락처',
    namePlaceholder: '이름',
    relationPlaceholder: '예: 배우자',
    phonePlaceholder: '010-XXXX-XXXX',
    dependents: '부양가족',
    childrenCount: (n) => `자녀 ${n}명 (자동 집계)`,
    dependentsNote: '부양가족 정보는 연말정산·4대보험 목적으로 저장되며, 본인과 HR(어드민)만 열람할 수 있습니다.',
    dependentsEmpty: '등록된 부양가족이 없습니다.',
    dobEmpty: '생년월일 미입력',
    isDependent: '부양중',
    notDependent: '비부양',
    addDependent: '+ 부양가족 추가',
    dependentName: '이름',
    dependentRelation: '관계',
    dependentDob: '생년월일',
    relationOptions: { spouse: '배우자', child: '자녀', parent: '부모', sibling: '형제자매', other: '기타' },
    add: '추가',
    cancel: '취소',
    save: '변경사항 저장',
    saving: '저장 중…',
    saved: '✓ 저장됐습니다',
    saveFailed: '저장 실패 — 다시 시도',
  },
  org: {
    current: '현재 조직',
    currentManager: '현재 매니저',
    level: '레벨',
    dept: '소속',
    joinDate: '입사일',
    currentNote: '조직 정보는 어드민에서만 변경 가능합니다.',
    managerHistory: '매니저 이력',
    managerHistoryEmpty: '아직 매니저 이력이 없습니다.',
    now: '현재',
    appointmentHistory: '발령 이력',
    appointmentEmpty: '아직 발령 이력이 없습니다.',
    education: '학력',
    educationEmpty: '등록된 학력이 없습니다.',
    isFinal: '최종학력',
    addEducation: '+ 학력 추가',
    career: '경력',
    careerEmpty: '등록된 경력이 없습니다.',
    addCareer: '+ 경력 추가',
    certifications: '자격증',
    certEmpty: '등록된 자격증이 없습니다.',
    certNo: '자격번호',
    issued: '발급',
    expiry: '만료',
    addCert: '+ 자격증 추가',
    documents: '증명서 첨부',
    documentsNote: '학력·경력·자격증 등 증빙 서류를 첨부합니다. PDF·이미지 형식, 파일당 최대 10MB. 본인과 HR(어드민)만 열람할 수 있습니다.',
    attach: '📎 파일 첨부 (PDF · 이미지, 최대 10MB)',
    download: '다운로드',
    add: '추가',
    cancel: '취소',
    delete: '삭제',
    degreeOptions: { high_school: '고졸', associate: '전문학사', bachelor: '학사', master: '석사', doctorate: '박사', other: '기타' },
    eduStatusOptions: { graduated: '졸업', enrolled: '재학', completed: '수료', dropped: '중퇴', expected: '졸업예정' },
    docTypeOptions: { resume: '이력서', education_cert: '학위증명서', career_cert: '경력증명서', certification: '자격증 사본', contract: '근로계약서', id_copy: '신분증 사본', bankbook: '통장 사본', other: '기타' },
    fields: {
      school: '학교', major: '전공', degree: '학위', from: '시작', to: '종료', status: '상태',
      company: '회사', department: '부서', role: '직무',
      certName: '자격증명', issuer: '발급기관', credentialNo: '자격번호', issuedDate: '발급일', expiryDate: '만료일',
    },
  },
  performance: {
    banner: '성과 정보는 평가 모듈 데이터를 참조합니다. 입력·수정은 평가 모듈에서 진행됩니다.',
    section: '평가 이력',
    evaluator: '평가자',
    empty: '아직 평가 이력이 없습니다.',
    loadError: '성과 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
  },
  compensation: {
    banner: '보상 정보는 기본적으로 가려져 있습니다. 본인·어드민·권한 매니저만 열람할 수 있습니다. "보기"를 클릭하면 해당 세션에서만 노출됩니다.',
    current: '현재 보상',
    history: '보상 이력',
    salaryTotal: '연봉 (총액)',
    effectiveDate: '적용 시작일',
    reveal: '보기',
    hide: '가리기',
    empty: '등록된 보상 정보가 없습니다.',
    ssot: '보상 데이터는 어드민 직원 관리의 연봉 이력(salary_histories)과 동일 출처(SSOT)이며, 적용일(effective-date) 기준으로 누적됩니다. 입력·수정은 어드민에서 진행됩니다.',
  },
  profile: {
    photoSection: '프로필 사진',
    photoInUse: '사용 중',
    photoHelp: '사진을 클릭하면 프로필 사진으로 설정됩니다.',
    basicInfo: '기본 정보',
    name: '이름',
    displayName: '닉네임 (표시 이름)',
    displayNameHint: '평가·조직도·슬랙 표시명으로 사용됩니다.',
    displayNamePlaceholder: '예: 데이빗 민 (민현식)',
    title: '직함',
    email: '이메일',
    emailReadonlyHint: '이메일은 로그인 계정입니다. 변경은 관리자에게 문의하세요.',
    phone: '전화번호',
    phoneHint: '개인 휴대폰 번호입니다.',
    personalEmail: '개인 이메일',
    personalEmailHint: '업무 이메일과 별도로 인사 연락 목적입니다.',
    dateOfBirth: '생년월일',
    gender: '성별',
    genderOptions: { male: '남성', female: '여성', other: '기타', undisclosed: '밝히지 않음' },
    nationality: '국적',
    nationalityPlaceholder: '대한민국',
    address: '주소',
    addressPlaceholder: '자택 주소 입력',
    addressHint: '본인·HR만 열람할 수 있습니다.',
    bio: '소개 (Bio)',
    bioHint: '타임라인·공개 카드에 표시됩니다.',
    bioPlaceholder: '나를 한 줄로 소개해 보세요',
    location: '위치',
    locationPlaceholder: '서울 마포구',
    workInfo: '근무 정보',
    workStart: '근무 시작 시간',
    workEnd: '근무 종료 시간',
    workHoursHint: '공개 카드와 조직도 툴팁에 표시됩니다.',
    timezone: '타임존',
    joinDate: '입사일',
    joinDateHint: '입사일은 어드민에서만 변경 가능합니다.',
    save: '변경사항 저장',
    saving: '저장 중…',
    saved: '✓ 저장됐습니다',
    saveFailed: '저장 실패 — 다시 시도',
  },
  upload: {
    title: '사진 업로드',
    dropTitle: '클릭하거나 사진을 끌어놓으세요',
    dropSub: 'JPG · PNG · WEBP · 최대 5MB',
    changeFile: '다른 사진 선택하기',
    cancel: '취소',
    confirm: '프로필에 추가',
    confirmEmpty: '사진을 선택하세요',
  },
  visibility: {
    banner:
      'Pivit의 공개 범위는 2단계로 구성됩니다. 항목별로 공개 여부를 직접 결정할 수 있으며, 비활성화된 항목은 나 외에 누구에게도 표시되지 않습니다.',
    saveError: '공개 범위 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.',
  },
  integrations: {
    banner:
      '개인 연동은 나만의 데이터 흐름을 설정합니다. 회사 전체 연동은 어드민 설정에서 관리합니다.',
    connected: '연결됨',
    comingSoon: '준비 중',
    managedByOrg: '어드민에서 관리',
    connect: '연결하기',
    disconnect: '연결 해제',
    sync: '지금 동기화',
    syncing: '동기화 중…',
    loading: '불러오는 중…',
    loadError: '연동 정보를 불러오지 못했습니다.',
  },
  security: {
    changePassword: '비밀번호 변경',
    currentPassword: '현재 비밀번호',
    currentPwPlaceholder: '현재 비밀번호 입력',
    newPassword: '새 비밀번호',
    newPwHint: '8자 이상, 영문·숫자·특수문자 포함을 권장합니다.',
    newPwPlaceholder: '새 비밀번호 (8자 이상)',
    confirmPassword: '새 비밀번호 확인',
    confirmPwPlaceholder: '새 비밀번호 재입력',
    pwMismatch: '비밀번호가 일치하지 않습니다',
    pwSave: '비밀번호 변경',
    pwSaving: '변경 중…',
    pwSaved: '✓ 변경됐습니다',
    activeSessions: '활성 세션',
    sessionsEmpty: '세션 목록은 준비 중입니다.',
    sessionCurrent: '현재',
    endSession: '종료',
    logout: '로그아웃',
    logoutDesc: '이 기기에서 로그아웃합니다.',
    dangerZone: '위험 구역',
    deleteAccount: '계정 삭제',
    deleteAccountDesc: '모든 데이터가 영구 삭제됩니다.',
    deleteAccountBtn: '삭제 요청',
    deleteConfirmMessage:
      '정말 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며 모든 데이터가 영구적으로 삭제됩니다.',
    deleteCancel: '취소',
    deleteConfirmBtn: '영구 삭제',
    deleteProcessing: '삭제 중…',
    deleteError: '계정 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.',
  },
};

function merge(base, provided) {
  if (!provided) return base;
  const out = { ...base };
  for (const k of Object.keys(provided)) {
    if (provided[k] && typeof provided[k] === 'object' && !Array.isArray(provided[k])) {
      out[k] = merge(base[k] || {}, provided[k]);
    } else if (provided[k] !== undefined) {
      out[k] = provided[k];
    }
  }
  return out;
}

/* ── 토글 스위치 (admin.css 공유 클래스) ─────────────── */
function Toggle({ value, onChange, ariaLabel, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!value)}
      className={`admin-notif-toggle${value ? ' is-on' : ''}`}
    >
      <span className="admin-notif-toggle-knob" />
    </button>
  );
}

function Card({ children, className = '', testId }) {
  return (
    <div className={`admin-card msc-card ${className}`.trim()} data-testid={testId}>
      {children}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div className="msc-field">
      <label className="msc-field-label">{label}</label>
      {hint && <p className="msc-field-hint">{hint}</p>}
      {children}
    </div>
  );
}

function Banner({ children, testId }) {
  return (
    <div className="admin-notif-banner" data-testid={testId}>
      <span className="admin-notif-banner-icon" aria-hidden="true">
        ℹ
      </span>
      <p className="admin-notif-banner-text">{children}</p>
    </div>
  );
}

function AvatarBox({ photoUrl, initial, color, className, testId }) {
  const fallbackStyle = photoUrl
    ? undefined
    : { background: `${color || '#2dbd82'}20`, color: color || '#2dbd82' };
  return (
    <div className={className} style={fallbackStyle} data-testid={testId}>
      {photoUrl ? <img src={photoUrl} alt="" /> : initial}
    </div>
  );
}

/* ── 보상 마스킹 ─────────────────────────────────────── */
const SALARY_MASK = '●●●,●●●,●●● 원';
function formatKRW(amount) {
  if (amount == null || amount === '') return '-';
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (Number.isNaN(n)) return '-';
  return `${n.toLocaleString('ko-KR')} 원`;
}
function MaskedAmount({ amount, revealed, testId }) {
  return (
    <span
      className={`msc-amount${revealed ? '' : ' is-masked'}`}
      data-testid={testId}
    >
      {revealed ? formatKRW(amount) : SALARY_MASK}
    </span>
  );
}

/* 평가 등급 배지 색 (시안 GRADE_COLOR 정본) */
const GRADE_COLOR = {
  S: { bg: '#FEF3C7', bd: '#FDE68A', tx: '#B45309' },
  'A+': { bg: '#DBEAFE', bd: '#BFDBFE', tx: '#1D4ED8' },
  A: { bg: '#EEF2FF', bd: '#C7D2FE', tx: '#4338CA' },
  'B+': { bg: '#F0FDF4', bd: '#BBF7D0', tx: '#15803D' },
  B: { bg: '#F8FAFC', bd: '#E2E8F0', tx: '#475569' },
  C: { bg: '#FFF7ED', bd: '#FED7AA', tx: '#C2410C' },
};
const CJK_CHAR = /[ㄱ-힝぀-ヿ一-鿿]/;

/**
 * 등급 라벨을 배지(정사각형) 안에 가둘 글자 크기.
 * 등급 라벨은 사이클 템플릿에서 정의되므로 'S'/'탁월' 같은 짧은 값만 온다는 보장이
 * 없다('해당없음', 영문 'Exceeds' 등). 기본 크기로 넘치면 배지 밖으로 글자가 삐져나오므로
 * 폭을 추정해 축소한다. 2~3자 이하(기존 케이스)는 기본 크기 그대로라 시각 변화가 없다.
 */
function fitGradeFontSize(label, size) {
  const text = String(label ?? '').trim();
  const base = Math.round(size * 0.41); // 44px 배지 → 18px (기존 값)
  if (!text) return base;
  const inner = size - 8; // 좌우 패딩 4px
  // 글자 폭 계수: CJK 는 폰트 크기와 거의 같고, 라틴·숫자는 bold 기준 약 62%.
  const units = [...text].reduce((sum, ch) => sum + (CJK_CHAR.test(ch) ? 1 : 0.62), 0);
  const lines = units > 2.6 ? 2 : 1; // 긴 라벨은 두 줄까지 허용
  // 두 줄로 쪼갤 땐 줄 경계에서 남는 여백이 생기므로 0.85 로 보정한다.
  const fitted =
    lines === 1
      ? Math.floor(inner / units)
      : Math.floor((inner * lines * 0.85) / units);
  return Math.max(9, Math.min(base, fitted));
}

function GradeBadge({ grade, size = 44 }) {
  const c = GRADE_COLOR[grade] || GRADE_COLOR.B;
  return (
    <span
      className="msc-grade-badge"
      style={{
        width: size,
        height: size,
        background: c.bg,
        border: `1px solid ${c.bd}`,
        color: c.tx,
        fontSize: fitGradeFontSize(grade, size),
      }}
    >
      {grade}
    </span>
  );
}

function ReadonlyPairs({ pairs }) {
  return (
    <div className="msc-pairs">
      {pairs.map((p) => (
        <div key={p.label} className="msc-pair">
          <div className="msc-pair-label">{p.label}</div>
          <div className="msc-pair-value">{p.value || '-'}</div>
        </div>
      ))}
    </div>
  );
}

function saveLabelOf(state, L) {
  return state === 'saving' ? L.saving : state === 'saved' ? L.saved : state === 'error' ? L.saveFailed : L.save;
}

/* ═══ 내 프로필 (표출·읽기 전용) ═══ */
function MyProfileTab({ me, activePhoto, myProfile, labels, onEdit }) {
  const [revealComp, setRevealComp] = useState(false);
  const L = labels.myProfile;
  const mp = myProfile || {};
  return (
    <>
      <Card testId="myprofile-hero-card">
        <div className="msc-hero">
          <AvatarBox
            photoUrl={activePhoto ? activePhoto.url : me.avatarUrl}
            initial={me.initial}
            color={me.color}
            className="msc-hero-avatar"
            testId="myprofile-hero-avatar"
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="msc-hero-name">{me.name}</div>
            {mp.displayName && <div className="msc-hero-sub">{mp.displayName}</div>}
            <div className="msc-hero-meta">
              {[me.title, mp.dept].filter(Boolean).join(' · ')}
            </div>
          </div>
          {onEdit && (
            <button type="button" className="admin-notif-btn is-soft is-sm" onClick={onEdit} data-testid="myprofile-edit-btn">
              {L.edit}
            </button>
          )}
        </div>
        {mp.bio && <p className="msc-hero-bio">{mp.bio}</p>}
      </Card>

      {mp.basicPairs && mp.basicPairs.length > 0 && (
        <Card testId="myprofile-basic-card">
          <div className="admin-section-label">{L.basicInfo}</div>
          <ReadonlyPairs pairs={mp.basicPairs} />
        </Card>
      )}

      {mp.orgPairs && mp.orgPairs.length > 0 && (
        <Card testId="myprofile-org-card">
          <div className="admin-section-label">{L.orgInfo}</div>
          <ReadonlyPairs pairs={mp.orgPairs} />
        </Card>
      )}

      <Card testId="myprofile-perf-card">
        <div className="admin-section-label">{L.perfInfo}</div>
        {mp.latestEval ? (
          <div className="msc-eval-row">
            <GradeBadge grade={mp.latestEval.grade} size={48} />
            <div>
              <div className="msc-notif-label">{mp.latestEval.period}</div>
              <div className="msc-notif-sub">
                {L.evaluator}: {mp.latestEval.evaluator || '-'}
              </div>
            </div>
          </div>
        ) : (
          <div className="msc-empty-state">{L.noEval}</div>
        )}
      </Card>

      <Card testId="myprofile-comp-card">
        <div className="msc-vis-header" style={{ marginBottom: 10 }}>
          <div className="admin-section-label" style={{ flex: 1, marginBottom: 0 }}>{L.compInfo}</div>
          {mp.compCurrent && (
            <button
              type="button"
              className={`admin-notif-btn is-sm ${revealComp ? 'is-primary' : 'is-soft'}`}
              onClick={() => setRevealComp((v) => !v)}
              data-testid="myprofile-comp-reveal"
            >
              {revealComp ? L.hide : L.reveal}
            </button>
          )}
        </div>
        {mp.compCurrent ? (
          <div className="msc-comp-grid">
            <div>
              <div className="msc-pair-label">{L.salaryTotal}</div>
              <MaskedAmount amount={mp.compCurrent.amount} revealed={revealComp} testId="myprofile-comp-amount" />
            </div>
            <div>
              <div className="msc-pair-label">{L.effectiveDate}</div>
              <div className="msc-pair-value">{mp.compCurrent.effectiveDate || '-'}</div>
            </div>
          </div>
        ) : (
          <div className="msc-empty-state">{L.noComp}</div>
        )}
      </Card>
    </>
  );
}

/* ═══ 가족 정보 ═══ */
function FamilyTab({ family, labels, saveState, onSave, onAddDependent, onDeleteDependent }) {
  const L = labels.family;
  const fam = family || { emergencyContact: {}, dependents: [] };
  const [marital, setMarital] = useState(fam.maritalStatus || '');
  const [ec, setEc] = useState(fam.emergencyContact || {});
  const [seed, setSeed] = useState(family);
  if (family !== seed) {
    setSeed(family);
    setMarital(fam.maritalStatus || '');
    setEc(fam.emergencyContact || {});
  }
  const [adding, setAdding] = useState(false);
  const [dep, setDep] = useState({ name: '', relation: 'spouse', dateOfBirth: '', isDependent: true });

  const dependents = fam.dependents || [];
  const childrenCount = dependents.filter((d) => d.relation === 'child').length;

  const submitDependent = () => {
    if (!dep.name || !onAddDependent) return;
    onAddDependent(dep);
    setDep({ name: '', relation: 'spouse', dateOfBirth: '', isDependent: true });
    setAdding(false);
  };

  return (
    <>
      <Card testId="family-info-card">
        <div className="admin-section-label">{L.section}</div>
        <p className="msc-tab-intro">{L.intro}</p>
        <Field label={L.maritalStatus}>
          <select
            className="admin-emp-input"
            value={marital}
            onChange={(e) => setMarital(e.target.value)}
            aria-label={L.maritalStatus}
            data-testid="family-marital"
          >
            <option value="">-</option>
            {Object.entries(L.maritalOptions).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </Field>
        <div className="msc-grid-3col">
          <Field label={L.emergencyName}>
            <input className="admin-emp-input" value={ec.name || ''} placeholder={L.namePlaceholder}
              onChange={(e) => setEc((p) => ({ ...p, name: e.target.value }))} aria-label={L.emergencyName} />
          </Field>
          <Field label={L.emergencyRelation}>
            <input className="admin-emp-input" value={ec.relation || ''} placeholder={L.relationPlaceholder}
              onChange={(e) => setEc((p) => ({ ...p, relation: e.target.value }))} aria-label={L.emergencyRelation} />
          </Field>
          <Field label={L.emergencyPhone}>
            <input className="admin-emp-input" value={ec.phone || ''} placeholder={L.phonePlaceholder}
              onChange={(e) => setEc((p) => ({ ...p, phone: e.target.value }))} aria-label={L.emergencyPhone} />
          </Field>
        </div>
      </Card>

      <Card testId="family-dependents-card">
        <div className="msc-vis-header" style={{ marginBottom: 8 }}>
          <div className="admin-section-label" style={{ flex: 1, marginBottom: 0 }}>{L.dependents}</div>
          <span className="msc-nav-title">{L.childrenCount(childrenCount)}</span>
        </div>
        <p className="msc-tab-intro">{L.dependentsNote}</p>
        {dependents.length === 0 && !adding ? (
          <div className="msc-empty-state" data-testid="dependents-empty">{L.dependentsEmpty}</div>
        ) : (
          <div className="msc-list">
            {dependents.map((d) => (
              <div key={d.id} className="msc-list-row" data-testid={`dependent-${d.id}`}>
                <div style={{ flex: 1 }}>
                  <div className="msc-notif-label">
                    {d.name} <span className="msc-notif-sub" style={{ display: 'inline' }}>· {L.relationOptions[d.relation] || d.relation}</span>
                  </div>
                  <div className="msc-notif-sub">{d.dateOfBirth || L.dobEmpty}</div>
                </div>
                <span className={`msc-vis-badge is-${d.isDependent ? 'green' : 'muted'}`}>
                  {d.isDependent ? L.isDependent : L.notDependent}
                </span>
                {onDeleteDependent && (
                  <button type="button" className="msc-list-del" aria-label={L.delete}
                    data-testid={`dependent-del-${d.id}`} onClick={() => onDeleteDependent(d.id)}>×</button>
                )}
              </div>
            ))}
          </div>
        )}
        {adding ? (
          <div className="msc-add-form" data-testid="dependent-add-form">
            <div className="msc-grid-3col">
              <input className="admin-emp-input" placeholder={L.dependentName} value={dep.name}
                onChange={(e) => setDep((p) => ({ ...p, name: e.target.value }))} aria-label={L.dependentName} />
              <select className="admin-emp-input" value={dep.relation}
                onChange={(e) => setDep((p) => ({ ...p, relation: e.target.value }))} aria-label={L.dependentRelation}>
                {Object.entries(L.relationOptions).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input className="admin-emp-input" type="date" value={dep.dateOfBirth}
                onChange={(e) => setDep((p) => ({ ...p, dateOfBirth: e.target.value }))} aria-label={L.dependentDob} />
            </div>
            <div className="msc-add-actions">
              <button type="button" className="admin-notif-btn is-soft is-sm" onClick={() => setAdding(false)}>{L.cancel}</button>
              <button type="button" className="admin-notif-btn is-primary is-sm" onClick={submitDependent} data-testid="dependent-add-submit">{L.add}</button>
            </div>
          </div>
        ) : (
          onAddDependent && (
            <button type="button" className="msc-add-btn" onClick={() => setAdding(true)} data-testid="dependent-add-btn">
              {L.addDependent}
            </button>
          )
        )}
      </Card>

      <button
        type="button"
        className={`msc-save-btn${saveState === 'saved' ? ' is-saved' : saveState === 'error' ? ' is-error' : ''}`}
        disabled={saveState === 'saving'}
        onClick={() => onSave && onSave({ maritalStatus: marital, emergencyContact: ec })}
        data-testid="family-save-btn"
      >
        {saveLabelOf(saveState, L)}
      </button>
    </>
  );
}

/* ═══ 조직 정보 ═══ */
function OrgTab({ org, labels, onAdd, onDelete, onUpload, onDownload, onDeleteDocument }) {
  const L = labels.org;
  const o = org || {};
  const cur = o.current || {};
  const [adding, setAdding] = useState(null); // 'education' | 'career' | 'certifications'
  const [d, setD] = useState({});
  const [docType, setDocType] = useState('resume');

  const startAdd = (kind, init) => { setAdding(kind); setD(init); };
  const submitAdd = () => { if (onAdd) onAdd(adding, d); setAdding(null); setD({}); };

  const currentPairs = [
    { label: L.currentManager, value: cur.manager ? `${cur.manager.name}${cur.manager.title ? ` (${cur.manager.title})` : ''}` : '-' },
    { label: L.level, value: cur.level },
    { label: L.dept, value: cur.dept },
    { label: L.joinDate, value: cur.joinDate },
  ];

  return (
    <>
      <Card testId="org-current-card">
        <div className="admin-section-label">{L.current}</div>
        <ReadonlyPairs pairs={currentPairs} />
        <p className="msc-field-note">{L.currentNote}</p>
      </Card>

      <Card testId="org-manager-history-card">
        <div className="admin-section-label">{L.managerHistory}</div>
        {(o.managerHistory || []).length === 0 ? (
          <div className="msc-empty-state">{L.managerHistoryEmpty}</div>
        ) : (
          <div className="msc-list">
            {cur.manager && (
              <div className="msc-list-row is-current">
                <span className="msc-dot is-brand" />
                <div style={{ flex: 1 }}>
                  <div className="msc-notif-label">{cur.manager.name}</div>
                  <div className="msc-notif-sub">{cur.manager.title} · {cur.manager.since || ''}~{L.now}</div>
                </div>
                <span className="msc-vis-badge is-brand">{L.now}</span>
              </div>
            )}
            {(o.managerHistory || []).map((m, i) => (
              <div key={i} className="msc-list-row">
                <span className="msc-dot" />
                <div style={{ flex: 1 }}>
                  <div className="msc-notif-label">{m.name}</div>
                  <div className="msc-notif-sub">{m.title} · {m.from}~{m.to || L.now}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card testId="org-appointment-card">
        <div className="admin-section-label">{L.appointmentHistory}</div>
        {(o.appointmentHistory || []).length === 0 ? (
          <div className="msc-empty-state">{L.appointmentEmpty}</div>
        ) : (
          <div className="msc-list">
            {(o.appointmentHistory || []).map((a, i) => (
              <div key={i} className="msc-list-row">
                <span className="msc-mono">{a.date}</span>
                <div style={{ flex: 1 }}>
                  <span className="msc-notif-label" style={{ display: 'inline' }}>{a.type}</span>
                  <span className="msc-notif-sub"> · {[a.dept, a.title].filter(Boolean).join(' · ')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card testId="org-education-card">
        <div className="admin-section-label">{L.education}</div>
        {(o.education || []).length === 0 && adding !== 'education' ? (
          <div className="msc-empty-state">{L.educationEmpty}</div>
        ) : (
          <div className="msc-list">
            {(o.education || []).map((e) => (
              <div key={e.id} className="msc-list-row" data-testid={`education-${e.id}`}>
                <div style={{ flex: 1 }}>
                  <div className="msc-notif-label">
                    {e.school}
                    {e.isFinal && <span className="msc-vis-badge is-brand" style={{ marginLeft: 6 }}>{L.isFinal}</span>}
                  </div>
                  <div className="msc-notif-sub">
                    {[e.major, L.degreeOptions[e.degree] || e.degree, `${e.from || ''}~${e.to || ''}`, L.eduStatusOptions[e.status] || e.status].filter(Boolean).join(' · ')}
                  </div>
                </div>
                {onDelete && <button type="button" className="msc-list-del" data-testid={`education-del-${e.id}`} aria-label={L.delete} onClick={() => onDelete('education', e.id)}>×</button>}
              </div>
            ))}
          </div>
        )}
        {adding === 'education' ? (
          <div className="msc-add-form" data-testid="education-add-form">
            <div className="msc-grid-2col">
              <input className="admin-emp-input" placeholder={L.fields.school} value={d.school || ''} onChange={(e) => setD((p) => ({ ...p, school: e.target.value }))} aria-label={L.fields.school} />
              <input className="admin-emp-input" placeholder={L.fields.major} value={d.major || ''} onChange={(e) => setD((p) => ({ ...p, major: e.target.value }))} aria-label={L.fields.major} />
              <select className="admin-emp-input" value={d.degree || 'bachelor'} onChange={(e) => setD((p) => ({ ...p, degree: e.target.value }))} aria-label={L.fields.degree}>
                {Object.entries(L.degreeOptions).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select className="admin-emp-input" value={d.status || 'graduated'} onChange={(e) => setD((p) => ({ ...p, status: e.target.value }))} aria-label={L.fields.status}>
                {Object.entries(L.eduStatusOptions).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input className="admin-emp-input" placeholder={L.fields.from} value={d.from || ''} onChange={(e) => setD((p) => ({ ...p, from: e.target.value }))} aria-label={L.fields.from} />
              <input className="admin-emp-input" placeholder={L.fields.to} value={d.to || ''} onChange={(e) => setD((p) => ({ ...p, to: e.target.value }))} aria-label={L.fields.to} />
            </div>
            <div className="msc-add-actions">
              <button type="button" className="admin-notif-btn is-soft is-sm" onClick={() => setAdding(null)}>{L.cancel}</button>
              <button type="button" className="admin-notif-btn is-primary is-sm" onClick={submitAdd} data-testid="education-add-submit">{L.add}</button>
            </div>
          </div>
        ) : (
          onAdd && <button type="button" className="msc-add-btn" onClick={() => startAdd('education', { degree: 'bachelor', status: 'graduated' })} data-testid="education-add-btn">{L.addEducation}</button>
        )}
      </Card>

      <Card testId="org-career-card">
        <div className="admin-section-label">{L.career}</div>
        {(o.career || []).length === 0 && adding !== 'career' ? (
          <div className="msc-empty-state">{L.careerEmpty}</div>
        ) : (
          <div className="msc-list">
            {(o.career || []).map((c) => (
              <div key={c.id} className="msc-list-row" data-testid={`career-${c.id}`}>
                <div style={{ flex: 1 }}>
                  <div className="msc-notif-label">{c.company}</div>
                  <div className="msc-notif-sub">{[c.department, c.role, `${c.from || ''}~${c.to || L.now}`].filter(Boolean).join(' · ')}</div>
                </div>
                {onDelete && <button type="button" className="msc-list-del" data-testid={`career-del-${c.id}`} aria-label={L.delete} onClick={() => onDelete('career', c.id)}>×</button>}
              </div>
            ))}
          </div>
        )}
        {adding === 'career' ? (
          <div className="msc-add-form" data-testid="career-add-form">
            <div className="msc-grid-2col">
              <input className="admin-emp-input" placeholder={L.fields.company} value={d.company || ''} onChange={(e) => setD((p) => ({ ...p, company: e.target.value }))} aria-label={L.fields.company} />
              <input className="admin-emp-input" placeholder={L.fields.department} value={d.department || ''} onChange={(e) => setD((p) => ({ ...p, department: e.target.value }))} aria-label={L.fields.department} />
              <input className="admin-emp-input" placeholder={L.fields.role} value={d.role || ''} onChange={(e) => setD((p) => ({ ...p, role: e.target.value }))} aria-label={L.fields.role} />
              <div />
              <input className="admin-emp-input" placeholder={L.fields.from} value={d.from || ''} onChange={(e) => setD((p) => ({ ...p, from: e.target.value }))} aria-label={L.fields.from} />
              <input className="admin-emp-input" placeholder={L.fields.to} value={d.to || ''} onChange={(e) => setD((p) => ({ ...p, to: e.target.value }))} aria-label={L.fields.to} />
            </div>
            <div className="msc-add-actions">
              <button type="button" className="admin-notif-btn is-soft is-sm" onClick={() => setAdding(null)}>{L.cancel}</button>
              <button type="button" className="admin-notif-btn is-primary is-sm" onClick={submitAdd} data-testid="career-add-submit">{L.add}</button>
            </div>
          </div>
        ) : (
          onAdd && <button type="button" className="msc-add-btn" onClick={() => startAdd('career', {})} data-testid="career-add-btn">{L.addCareer}</button>
        )}
      </Card>

      <Card testId="org-cert-card">
        <div className="admin-section-label">{L.certifications}</div>
        {(o.certifications || []).length === 0 && adding !== 'certifications' ? (
          <div className="msc-empty-state" data-testid="cert-empty">{L.certEmpty}</div>
        ) : (
          <div className="msc-list">
            {(o.certifications || []).map((c) => (
              <div key={c.id} className="msc-list-row" data-testid={`cert-${c.id}`}>
                <div style={{ flex: 1 }}>
                  <div className="msc-notif-label">{c.name}</div>
                  <div className="msc-notif-sub">
                    {[c.issuer, c.credentialNo && `${L.certNo} ${c.credentialNo}`, c.issuedDate && `${L.issued} ${c.issuedDate}`, c.expiryDate && `${L.expiry} ${c.expiryDate}`].filter(Boolean).join(' · ')}
                  </div>
                </div>
                {onDelete && <button type="button" className="msc-list-del" data-testid={`cert-del-${c.id}`} aria-label={L.delete} onClick={() => onDelete('certifications', c.id)}>×</button>}
              </div>
            ))}
          </div>
        )}
        {adding === 'certifications' ? (
          <div className="msc-add-form" data-testid="cert-add-form">
            <div className="msc-grid-2col">
              <input className="admin-emp-input" placeholder={L.fields.certName} value={d.name || ''} onChange={(e) => setD((p) => ({ ...p, name: e.target.value }))} aria-label={L.fields.certName} />
              <input className="admin-emp-input" placeholder={L.fields.issuer} value={d.issuer || ''} onChange={(e) => setD((p) => ({ ...p, issuer: e.target.value }))} aria-label={L.fields.issuer} />
              <input className="admin-emp-input" placeholder={L.fields.credentialNo} value={d.credentialNo || ''} onChange={(e) => setD((p) => ({ ...p, credentialNo: e.target.value }))} aria-label={L.fields.credentialNo} />
              <input className="admin-emp-input" type="date" value={d.issuedDate || ''} onChange={(e) => setD((p) => ({ ...p, issuedDate: e.target.value }))} aria-label={L.fields.issuedDate} />
              <input className="admin-emp-input" type="date" value={d.expiryDate || ''} onChange={(e) => setD((p) => ({ ...p, expiryDate: e.target.value }))} aria-label={L.fields.expiryDate} />
            </div>
            <div className="msc-add-actions">
              <button type="button" className="admin-notif-btn is-soft is-sm" onClick={() => setAdding(null)}>{L.cancel}</button>
              <button type="button" className="admin-notif-btn is-primary is-sm" onClick={submitAdd} data-testid="cert-add-submit">{L.add}</button>
            </div>
          </div>
        ) : (
          onAdd && <button type="button" className="msc-add-btn" onClick={() => startAdd('certifications', {})} data-testid="cert-add-btn">{L.addCert}</button>
        )}
      </Card>

      <Card testId="org-documents-card">
        <div className="admin-section-label">{L.documents}</div>
        <p className="msc-tab-intro">{L.documentsNote}</p>
        {(o.documents || []).length > 0 && (
          <div className="msc-list">
            {(o.documents || []).map((doc) => (
              <div key={doc.id} className="msc-list-row" data-testid={`document-${doc.id}`}>
                <span aria-hidden="true">📎</span>
                <div style={{ flex: 1 }}>
                  <div className="msc-notif-label">{doc.fileName}</div>
                  <div className="msc-notif-sub">{[L.docTypeOptions[doc.docType] || doc.docType, doc.uploadedAt].filter(Boolean).join(' · ')}</div>
                </div>
                {onDownload && <button type="button" className="admin-notif-btn is-soft is-sm" onClick={() => onDownload(doc.id)} data-testid={`document-download-${doc.id}`}>{L.download}</button>}
                {onDeleteDocument && <button type="button" className="msc-list-del" data-testid={`document-del-${doc.id}`} aria-label={L.delete} onClick={() => onDeleteDocument(doc.id)}>×</button>}
              </div>
            ))}
          </div>
        )}
        <div className="msc-doc-upload">
          <select className="admin-emp-input" value={docType} onChange={(e) => setDocType(e.target.value)} aria-label={L.documents} data-testid="document-type-select" style={{ maxWidth: 160 }}>
            {Object.entries(L.docTypeOptions).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <label className="msc-add-btn" style={{ margin: 0, flex: 1 }}>
            {L.attach}
            <input type="file" accept=".pdf,image/*" style={{ display: 'none' }} data-testid="document-file-input"
              onChange={(e) => { if (e.target.files[0] && onUpload) onUpload(docType, e.target.files[0]); e.target.value = ''; }} />
          </label>
        </div>
      </Card>
    </>
  );
}

/* ═══ 성과 정보 (읽기 전용) ═══ */
function PerformanceTab({ performance, loading, error, labels }) {
  const L = labels.performance;
  const history = (performance && performance.evalHistory) || [];
  return (
    <>
      <Banner testId="performance-banner">{L.banner}</Banner>
      <Card testId="performance-card">
        <div className="admin-section-label">{L.section}</div>
        {loading ? (
          <div className="msc-skeleton-list" data-testid="performance-loading" aria-busy="true">
            <div className="msc-skeleton-row" />
            <div className="msc-skeleton-row" />
            <div className="msc-skeleton-row" />
          </div>
        ) : error ? (
          <div className="msc-empty-state" data-testid="performance-error">{L.loadError}</div>
        ) : history.length === 0 ? (
          <div className="msc-empty-state" data-testid="performance-empty">{L.empty}</div>
        ) : (
          <div className="msc-list">
            {history.map((e, i) => (
              <div key={i} className="msc-eval-row" data-testid={`eval-${i}`}>
                <GradeBadge grade={e.grade} />
                <div>
                  <div className="msc-notif-label">{e.period}</div>
                  <div className="msc-notif-sub">{L.evaluator}: {e.evaluator || '-'}{e.date ? ` · ${e.date}` : ''}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

/* ═══ 보상 정보 (마스킹) ═══ */
function CompensationTab({ compensation, isAdmin, labels }) {
  const L = labels.compensation;
  const [revealCurrent, setRevealCurrent] = useState(false);
  const [revealHistory, setRevealHistory] = useState(false);
  const comp = compensation || {};
  const showCurrent = isAdmin || revealCurrent;
  const showHistory = isAdmin || revealHistory;
  const hasAny = comp.current || (comp.history && comp.history.length > 0);
  return (
    <>
      <div className="admin-notif-banner is-warn" data-testid="compensation-banner">
        <span className="admin-notif-banner-icon" aria-hidden="true">🔒</span>
        <p className="admin-notif-banner-text">{L.banner}</p>
      </div>
      {!hasAny ? (
        <Card testId="compensation-empty-card">
          <div className="msc-empty-state" data-testid="compensation-empty">{L.empty}</div>
        </Card>
      ) : (
        <>
          {comp.current && (
            <Card testId="compensation-current-card">
              <div className="msc-vis-header" style={{ marginBottom: 10 }}>
                <div className="admin-section-label" style={{ flex: 1, marginBottom: 0 }}>{L.current}</div>
                {!isAdmin && (
                  <button type="button" className={`admin-notif-btn is-sm ${revealCurrent ? 'is-primary' : 'is-soft'}`}
                    onClick={() => setRevealCurrent((v) => !v)} data-testid="compensation-current-reveal">
                    {revealCurrent ? L.hide : L.reveal}
                  </button>
                )}
              </div>
              <div className="msc-comp-grid">
                <div>
                  <div className="msc-pair-label">{L.salaryTotal}</div>
                  <MaskedAmount amount={comp.current.amount} revealed={showCurrent} testId="compensation-current-amount" />
                </div>
                <div>
                  <div className="msc-pair-label">{L.effectiveDate}</div>
                  <div className="msc-pair-value">{comp.current.effectiveDate || '-'}</div>
                </div>
              </div>
            </Card>
          )}
          {comp.history && comp.history.length > 0 && (
            <Card testId="compensation-history-card">
              <div className="msc-vis-header" style={{ marginBottom: 10 }}>
                <div className="admin-section-label" style={{ flex: 1, marginBottom: 0 }}>{L.history}</div>
                {!isAdmin && (
                  <button type="button" className={`admin-notif-btn is-sm ${revealHistory ? 'is-primary' : 'is-soft'}`}
                    onClick={() => setRevealHistory((v) => !v)} data-testid="compensation-history-reveal">
                    {revealHistory ? L.hide : L.reveal}
                  </button>
                )}
              </div>
              <div className="msc-list">
                {comp.history.map((h, i) => (
                  <div key={i} className="msc-list-row" data-testid={`comp-history-${i}`}>
                    <span className="msc-mono" style={{ minWidth: 88 }}>{h.effectiveDate}</span>
                    <MaskedAmount amount={h.amount} revealed={showHistory} />
                    {h.reason && <span className="msc-reason-chip">{h.reason}</span>}
                  </div>
                ))}
              </div>
              <p className="msc-field-note" style={{ marginTop: 10 }}>{L.ssot}</p>
            </Card>
          )}
        </>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════ */

export default function MySettingsCanvas({
  activeTab = 'my_profile',
  onTabChange,
  tabs = [
    { id: 'my_profile', group: 'profile' },
    { id: 'profile_basic', group: 'profile' },
    { id: 'profile_family', group: 'profile' },
    { id: 'profile_org', group: 'profile' },
    { id: 'profile_perf', group: 'profile' },
    { id: 'profile_comp', group: 'profile' },
    { id: 'visibility', group: 'settings' },
    { id: 'notifications', group: 'settings' },
    { id: 'integrations', group: 'settings' },
    { id: 'security', group: 'settings' },
  ],
  me = {},
  isAdmin = false,
  /* 내 프로필 (표출·읽기 전용) */
  myProfile = null,
  onEditProfile,
  /* 가족 정보 */
  family = null,
  familySaveState = 'idle',
  onSaveFamily,
  onAddDependent,
  onDeleteDependent,
  /* 조직 정보 */
  org = null,
  onAddOrgRecord,
  onDeleteOrgRecord,
  onUploadDocument,
  onDownloadDocument,
  onDeleteDocument,
  /* 성과 정보 */
  performance = null,
  performanceLoading = false,
  performanceError = false,
  /* 보상 정보 */
  compensation = null,
  /* 프로필 */
  profile = {},
  timezoneOptions = [],
  photos = [],
  activePhotoId = null,
  maxPhotos = 5,
  minPhotos = 0,
  photoBusy = false,
  onSelectPhoto,
  onAddPhoto,
  onDeletePhoto,
  profileSaveState = 'idle',
  onSaveProfile,
  /* 공개 범위 */
  visibilityGroups = [],
  visibilityError = null,
  onToggleVisibility,
  /* 알림 */
  notifGroups = [],
  onToggleNotif,
  /* 개인 연동 */
  integrations = [],
  integrationsLoading = false,
  integrationsError = false,
  onConnectIntegration,
  onDisconnectIntegration,
  onSyncIntegration,
  onToggleIntegrationSetting,
  /* 보안 */
  passwordState = { saving: false, saved: false, error: null },
  onChangePassword,
  sessions = [],
  onEndSession,
  onLogout,
  logoutError = null,
  labels: providedLabels,
  baseUrl = '/',
}) {
  const labels = merge(DEFAULT_LABELS, providedLabels);

  /* ── 프로필 draft — profile prop 이 바뀌면 렌더 중 재시드 ── */
  const [draft, setDraft] = useState(profile);
  const [seededFrom, setSeededFrom] = useState(profile);
  if (profile !== seededFrom) {
    setSeededFrom(profile);
    setDraft(profile);
  }
  const setField = (key) => (value) => setDraft((prev) => ({ ...prev, [key]: value }));

  /* ── 업로드 모달 ── */
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadDrag, setUploadDrag] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const previewUrlRef = useRef(null);

  function handleFile(file) {
    if (!file || !file.type || !file.type.startsWith('image/')) return;
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;
    setPendingFile(file);
    setUploadPreview(url);
  }

  function closeUpload() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setUploadOpen(false);
    setPendingFile(null);
    setUploadPreview(null);
  }

  function confirmUpload() {
    if (!pendingFile) return;
    onAddPhoto && onAddPhoto(pendingFile);
    closeUpload();
  }

  /* ── 비밀번호 폼 ── */
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const pwSavedPrev = useRef(passwordState.saved);
  useEffect(() => {
    if (passwordState.saved && !pwSavedPrev.current) {
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    }
    pwSavedPrev.current = passwordState.saved;
  }, [passwordState.saved]);
  const pwReady = Boolean(currentPw) && newPw.length >= 8 && newPw === confirmPw;


  const activePhoto = photos.find((p) => p.id === activePhotoId) || photos[0] || null;
  const groups = [...new Set(tabs.map((t) => t.group))];

  const saveLabel =
    profileSaveState === 'saving'
      ? labels.profile.saving
      : profileSaveState === 'saved'
        ? labels.profile.saved
        : profileSaveState === 'error'
          ? labels.profile.saveFailed
          : labels.profile.save;

  return (
    <div className="msc-canvas" data-testid="my-settings-canvas">
      <div className="msc-layout">
        {/* ── 좌측 내비게이션 ── */}
        <nav className="msc-nav" data-testid="settings-nav">
          <div className="msc-nav-profile">
            <AvatarBox
              photoUrl={activePhoto ? activePhoto.url : me.avatarUrl}
              initial={me.initial}
              color={me.color}
              className="msc-nav-avatar"
              testId="settings-nav-avatar"
            />
            <div className="msc-nav-name">{me.name}</div>
            <div className="msc-nav-title">{me.title}</div>
          </div>

          {groups.map((group, gi) => (
            <div key={group} style={{ display: 'contents' }}>
              {gi > 0 && <hr className="msc-nav-divider" />}
              <div className="msc-nav-group-label">{labels.navGroups[group] || group}</div>
              {tabs
                .filter((t) => t.group === group)
                .map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`msc-nav-btn${activeTab === t.id ? ' is-active' : ''}`}
                    onClick={() => onTabChange && onTabChange(t.id)}
                    data-testid={`settings-tab-${t.id}`}
                  >
                    {t.label || labels.tabs[t.id] || t.id}
                  </button>
                ))}
            </div>
          ))}
        </nav>

        {/* ── 콘텐츠 ── */}
        <div className="msc-content">
          {/* ═══ 내 프로필 (표출·읽기 전용) ═══ */}
          {activeTab === 'my_profile' && (
            <MyProfileTab
              me={me}
              activePhoto={activePhoto}
              myProfile={myProfile}
              labels={labels}
              onEdit={onEditProfile}
            />
          )}

          {/* ═══ 가족 정보 ═══ */}
          {activeTab === 'profile_family' && (
            <FamilyTab
              family={family}
              labels={labels}
              saveState={familySaveState}
              onSave={onSaveFamily}
              onAddDependent={onAddDependent}
              onDeleteDependent={onDeleteDependent}
            />
          )}

          {/* ═══ 조직 정보 ═══ */}
          {activeTab === 'profile_org' && (
            <OrgTab
              org={org}
              labels={labels}
              onAdd={onAddOrgRecord}
              onDelete={onDeleteOrgRecord}
              onUpload={onUploadDocument}
              onDownload={onDownloadDocument}
              onDeleteDocument={onDeleteDocument}
            />
          )}

          {/* ═══ 성과 정보 ═══ */}
          {activeTab === 'profile_perf' && (
            <PerformanceTab
              performance={performance}
              loading={performanceLoading}
              error={performanceError}
              labels={labels}
            />
          )}

          {/* ═══ 보상 정보 ═══ */}
          {activeTab === 'profile_comp' && (
            <CompensationTab compensation={compensation} isAdmin={isAdmin} labels={labels} />
          )}

          {/* ═══ 기본 정보 ═══ */}
          {(activeTab === 'profile' || activeTab === 'profile_basic') && (
            <>
              <Card testId="profile-photo-card">
                <div className="admin-section-label">{labels.profile.photoSection}</div>
                <div className="msc-photo-section">
                  <div style={{ flexShrink: 0 }}>
                    <AvatarBox
                      photoUrl={activePhoto ? activePhoto.url : null}
                      initial={me.initial}
                      color={me.color}
                      className="msc-photo-preview"
                      testId="profile-photo-preview"
                    />
                    {activePhoto && <div className="msc-photo-caption">{labels.profile.photoInUse}</div>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="msc-photo-tiles">
                      {photos.map((photo) => (
                        <div
                          key={photo.id}
                          className={`msc-photo-tile${
                            activePhoto && activePhoto.id === photo.id ? ' is-active' : ''
                          }`}
                          onClick={() => onSelectPhoto && onSelectPhoto(photo.id)}
                        >
                          <div className="msc-photo-tile-img">
                            <img src={photo.url} alt="" />
                          </div>
                          {activePhoto && activePhoto.id === photo.id && (
                            <div className="msc-photo-tile-check">✓</div>
                          )}
                          {photos.length > minPhotos && onDeletePhoto && (
                            <button
                              type="button"
                              className="msc-photo-tile-del"
                              aria-label={`${labels.profile.photoSection} 삭제`}
                              data-testid={`photo-delete-${photo.id}`}
                              disabled={photoBusy}
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeletePhoto(photo.id);
                              }}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                      {photos.length < maxPhotos && onAddPhoto && (
                        <button
                          type="button"
                          className="msc-photo-add"
                          aria-label={labels.upload.title}
                          data-testid="photo-add-btn"
                          disabled={photoBusy}
                          onClick={() => setUploadOpen(true)}
                        >
                          +
                        </button>
                      )}
                    </div>
                    <p className="msc-photo-help">{labels.profile.photoHelp}</p>
                  </div>
                </div>
              </Card>

              <Card testId="profile-basic-card">
                <div className="admin-section-label">{labels.profile.basicInfo}</div>
                <div className="msc-grid-2col">
                  <Field label={labels.profile.name}>
                    <input
                      className="admin-emp-input"
                      value={draft.name || ''}
                      onChange={(e) => setField('name')(e.target.value)}
                      aria-label={labels.profile.name}
                    />
                  </Field>
                  <Field label={labels.profile.displayName} hint={labels.profile.displayNameHint}>
                    <input
                      className="admin-emp-input"
                      value={draft.displayName || ''}
                      onChange={(e) => setField('displayName')(e.target.value)}
                      placeholder={labels.profile.displayNamePlaceholder}
                      aria-label={labels.profile.displayName}
                    />
                  </Field>
                  <Field label={labels.profile.title}>
                    <input
                      className="admin-emp-input"
                      value={draft.title || ''}
                      onChange={(e) => setField('title')(e.target.value)}
                      aria-label={labels.profile.title}
                    />
                  </Field>
                  <Field label={labels.profile.email}>
                    <input
                      className="admin-emp-input is-readonly"
                      type="email"
                      value={profile.email || ''}
                      readOnly
                      aria-label={labels.profile.email}
                    />
                    <p className="msc-field-note">{labels.profile.emailReadonlyHint}</p>
                  </Field>
                  <Field label={labels.profile.phone} hint={labels.profile.phoneHint}>
                    <input
                      className="admin-emp-input"
                      value={draft.phone || ''}
                      onChange={(e) => setField('phone')(e.target.value)}
                      aria-label={labels.profile.phone}
                    />
                  </Field>
                  <Field label={labels.profile.personalEmail} hint={labels.profile.personalEmailHint}>
                    <input
                      className="admin-emp-input"
                      type="email"
                      value={draft.personalEmail || ''}
                      onChange={(e) => setField('personalEmail')(e.target.value)}
                      aria-label={labels.profile.personalEmail}
                    />
                  </Field>
                  <Field label={labels.profile.dateOfBirth}>
                    <input
                      className="admin-emp-input"
                      type="date"
                      value={draft.dateOfBirth || ''}
                      onChange={(e) => setField('dateOfBirth')(e.target.value)}
                      aria-label={labels.profile.dateOfBirth}
                    />
                  </Field>
                  <Field label={labels.profile.gender}>
                    <select
                      className="admin-emp-input"
                      value={draft.gender || ''}
                      onChange={(e) => setField('gender')(e.target.value)}
                      aria-label={labels.profile.gender}
                    >
                      <option value="">-</option>
                      {Object.entries(labels.profile.genderOptions).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label={labels.profile.nationality}>
                    <input
                      className="admin-emp-input"
                      value={draft.nationality || ''}
                      onChange={(e) => setField('nationality')(e.target.value)}
                      placeholder={labels.profile.nationalityPlaceholder}
                      aria-label={labels.profile.nationality}
                    />
                  </Field>
                  <Field label={labels.profile.address} hint={labels.profile.addressHint}>
                    <input
                      className="admin-emp-input"
                      value={draft.address || ''}
                      onChange={(e) => setField('address')(e.target.value)}
                      placeholder={labels.profile.addressPlaceholder}
                      aria-label={labels.profile.address}
                    />
                  </Field>
                </div>
                <Field label={labels.profile.bio} hint={labels.profile.bioHint}>
                  <textarea
                    className="admin-emp-input"
                    rows={3}
                    maxLength={200}
                    value={draft.bio || ''}
                    onChange={(e) => setField('bio')(e.target.value)}
                    placeholder={labels.profile.bioPlaceholder}
                    aria-label={labels.profile.bio}
                    style={{ resize: 'none', lineHeight: 1.7 }}
                  />
                  <div className="msc-char-count">{(draft.bio || '').length} / 200</div>
                </Field>
                <Field label={labels.profile.location}>
                  <input
                    className="admin-emp-input"
                    value={draft.location || ''}
                    onChange={(e) => setField('location')(e.target.value)}
                    placeholder={labels.profile.locationPlaceholder}
                    aria-label={labels.profile.location}
                  />
                </Field>
              </Card>

              <Card testId="profile-work-card">
                <div className="admin-section-label">{labels.profile.workInfo}</div>
                <div className="msc-grid-2col">
                  <Field label={labels.profile.workStart} hint={labels.profile.workHoursHint}>
                    <input
                      className="admin-emp-input"
                      type="time"
                      value={draft.workStart || ''}
                      onChange={(e) => setField('workStart')(e.target.value)}
                      aria-label={labels.profile.workStart}
                    />
                  </Field>
                  <Field label={labels.profile.workEnd} hint={labels.profile.workHoursHint}>
                    <input
                      className="admin-emp-input"
                      type="time"
                      value={draft.workEnd || ''}
                      onChange={(e) => setField('workEnd')(e.target.value)}
                      aria-label={labels.profile.workEnd}
                    />
                  </Field>
                </div>
                <Field label={labels.profile.timezone}>
                  <select
                    className="admin-emp-input"
                    value={draft.timezone || ''}
                    onChange={(e) => setField('timezone')(e.target.value)}
                    aria-label={labels.profile.timezone}
                    data-testid="profile-timezone-select"
                  >
                    {timezoneOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={labels.profile.joinDate}>
                  <input
                    className="admin-emp-input is-readonly"
                    type="date"
                    value={profile.joinDate || ''}
                    readOnly
                    aria-label={labels.profile.joinDate}
                  />
                  <p className="msc-field-note">{labels.profile.joinDateHint}</p>
                </Field>
              </Card>

              <button
                type="button"
                className={`msc-save-btn${
                  profileSaveState === 'saved' ? ' is-saved' : profileSaveState === 'error' ? ' is-error' : ''
                }`}
                disabled={profileSaveState === 'saving'}
                onClick={() => onSaveProfile && onSaveProfile(draft)}
                data-testid="profile-save-btn"
              >
                {saveLabel}
              </button>
            </>
          )}

          {/* ═══ 공개 범위 ═══ */}
          {activeTab === 'visibility' && (
            <>
              <Banner testId="visibility-banner">{labels.visibility.banner}</Banner>
              {visibilityError && (
                <div className="msc-input-error" data-testid="visibility-error">
                  {visibilityError}
                </div>
              )}
              {visibilityGroups.map((group) => (
                <Card key={group.key} className={`is-${group.tone || 'brand'}`} testId={`visibility-group-${group.key}`}>
                  <div className="msc-vis-header">
                    {group.icon && <span style={{ fontSize: 16 }}>{group.icon}</span>}
                    <div style={{ flex: 1 }}>
                      <div className="msc-vis-group-title">{group.title}</div>
                      <div className="msc-vis-group-desc">{group.desc}</div>
                    </div>
                  </div>
                  <div className="msc-vis-items">
                    {group.items.map((item) => (
                      <div key={item.key} className="msc-row">
                        <span className="msc-row-label">{item.label}</span>
                        {group.locked ? (
                          <span className={`msc-vis-badge is-${group.tone || 'brand'}`}>{group.badgeLabel}</span>
                        ) : (
                          <Toggle
                            value={Boolean(item.on)}
                            onChange={(next) => onToggleVisibility && onToggleVisibility(item.key, next)}
                            ariaLabel={item.label}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </>
          )}

          {/* ═══ 알림 ═══ */}
          {activeTab === 'notifications' && (
            <>
              {notifGroups.map((group) => (
                <Card key={group.key} testId={`notif-group-${group.key}`}>
                  <div className="admin-section-label">{group.title}</div>
                  <div className="msc-notif-items">
                    {group.items.map((item) => (
                      <div key={item.key} className="msc-row">
                        <div>
                          <div className="msc-notif-label">{item.label}</div>
                          <div className="msc-notif-sub">{item.sub}</div>
                        </div>
                        <Toggle
                          value={Boolean(item.on)}
                          onChange={(next) => onToggleNotif && onToggleNotif(item.key, next)}
                          ariaLabel={item.label}
                        />
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </>
          )}

          {/* ═══ 개인 연동 ═══ */}
          {activeTab === 'integrations' && (
            <>
              <Banner testId="integrations-banner">{labels.integrations.banner}</Banner>
              {integrationsError ? (
                <div className="msc-empty-state" data-testid="integrations-error">
                  {labels.integrations.loadError}
                </div>
              ) : integrationsLoading ? (
                <div className="msc-empty-state" data-testid="integrations-loading">
                  {labels.integrations.loading}
                </div>
              ) : (
                integrations.map((intg) => (
                  <Card key={intg.id} testId={`integration-${intg.id}`}>
                    <div className="msc-intg-row">
                      <span className="msc-intg-icon">
                        {intg.logo ? <img src={`${baseUrl}${intg.logo}`.replace('//', '/')} alt="" /> : null}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <span className="msc-intg-name">{intg.name}</span>
                          {intg.connected && (
                            <span className="msc-intg-badge">{labels.integrations.connected}</span>
                          )}
                          {intg.comingSoon && (
                            <span className="msc-intg-badge is-muted">{labels.integrations.comingSoon}</span>
                          )}
                          {intg.managedByOrg && (
                            <span className="msc-intg-badge is-muted">{labels.integrations.managedByOrg}</span>
                          )}
                        </div>
                        <p className="msc-intg-desc">{intg.desc}</p>
                        {(intg.metaLines || []).map((line, i) => (
                          <span key={i} className="msc-intg-meta">
                            {line}
                          </span>
                        ))}
                      </div>
                      <div className="msc-intg-actions">
                        {intg.connected && intg.syncable && onSyncIntegration && (
                          <button
                            type="button"
                            className="admin-notif-btn is-soft is-sm"
                            disabled={intg.busy || intg.syncing}
                            onClick={() => onSyncIntegration(intg.id)}
                            data-testid={`integration-sync-${intg.id}`}
                          >
                            {intg.syncing ? labels.integrations.syncing : labels.integrations.sync}
                          </button>
                        )}
                        {!intg.comingSoon && !intg.managedByOrg && (
                          <button
                            type="button"
                            className={`admin-notif-btn is-sm ${intg.connected ? 'is-danger' : 'is-soft'}`}
                            disabled={intg.busy || intg.syncing}
                            onClick={() =>
                              intg.connected
                                ? onDisconnectIntegration && onDisconnectIntegration(intg.id)
                                : onConnectIntegration && onConnectIntegration(intg.id)
                            }
                            data-testid={`integration-${intg.connected ? 'disconnect' : 'connect'}-${intg.id}`}
                          >
                            {intg.connected ? labels.integrations.disconnect : labels.integrations.connect}
                          </button>
                        )}
                      </div>
                    </div>

                    {intg.warning && (
                      <div className="admin-notif-banner" style={{ marginTop: 12 }} data-testid={`integration-warning-${intg.id}`}>
                        <span className="admin-notif-banner-icon" aria-hidden="true">
                          ⚠
                        </span>
                        <p className="admin-notif-banner-text">{intg.warning}</p>
                      </div>
                    )}
                    {intg.error && (
                      <div className="msc-input-error" style={{ marginTop: 10 }} data-testid={`integration-error-${intg.id}`}>
                        {intg.error}
                      </div>
                    )}

                    {intg.connected && intg.subSettings && intg.subSettings.length > 0 && (
                      <div className="msc-intg-sub">
                        <div className="msc-intg-sub-title">{intg.subSettingsTitle}</div>
                        {intg.subSettings.map((s) => (
                          <div key={s.key} className="msc-row">
                            <span className="msc-intg-sub-label">{s.label}</span>
                            <Toggle
                              value={Boolean(s.on)}
                              onChange={(next) =>
                                onToggleIntegrationSetting && onToggleIntegrationSetting(intg.id, s.key, next)
                              }
                              ariaLabel={s.label}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                ))
              )}
            </>
          )}

          {/* ═══ 보안 ═══ */}
          {activeTab === 'security' && (
            <>
              <Card testId="security-password-card">
                <div className="admin-section-label">{labels.security.changePassword}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Field label={labels.security.currentPassword}>
                    <input
                      className="admin-emp-input"
                      type="password"
                      value={currentPw}
                      onChange={(e) => setCurrentPw(e.target.value)}
                      placeholder={labels.security.currentPwPlaceholder}
                      aria-label={labels.security.currentPassword}
                    />
                  </Field>
                  <Field label={labels.security.newPassword} hint={labels.security.newPwHint}>
                    <input
                      className="admin-emp-input"
                      type="password"
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      placeholder={labels.security.newPwPlaceholder}
                      aria-label={labels.security.newPassword}
                    />
                  </Field>
                  <Field label={labels.security.confirmPassword}>
                    <input
                      className="admin-emp-input"
                      type="password"
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      placeholder={labels.security.confirmPwPlaceholder}
                      aria-label={labels.security.confirmPassword}
                    />
                    {confirmPw && newPw !== confirmPw && (
                      <p className="msc-input-error" data-testid="pw-mismatch">
                        {labels.security.pwMismatch}
                      </p>
                    )}
                  </Field>
                </div>
                {passwordState.error && (
                  <p className="msc-input-error" data-testid="pw-error">
                    {passwordState.error}
                  </p>
                )}
                <button
                  type="button"
                  className={`msc-save-btn${passwordState.saved ? ' is-saved' : ''}`}
                  style={{ marginTop: 12, padding: '10px 0', fontSize: 13 }}
                  disabled={!pwReady || passwordState.saving}
                  onClick={() =>
                    onChangePassword && onChangePassword({ currentPassword: currentPw, newPassword: newPw })
                  }
                  data-testid="pw-save-btn"
                >
                  {passwordState.saving
                    ? labels.security.pwSaving
                    : passwordState.saved
                      ? labels.security.pwSaved
                      : labels.security.pwSave}
                </button>
              </Card>

              <Card testId="security-sessions-card">
                <div className="admin-section-label">{labels.security.activeSessions}</div>
                {sessions.length === 0 ? (
                  <div className="msc-empty-state" data-testid="sessions-empty">
                    {labels.security.sessionsEmpty}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {sessions.map((s) => (
                      <div key={s.id} className={`msc-session-row${s.current ? ' is-current' : ''}`}>
                        <div style={{ flex: 1 }}>
                          <div className="msc-notif-label">
                            {s.device}
                            {s.current && (
                              <span className="msc-vis-badge is-brand" style={{ marginLeft: 7 }}>
                                {labels.security.sessionCurrent}
                              </span>
                            )}
                          </div>
                          <div className="msc-notif-sub">{s.meta}</div>
                        </div>
                        {!s.current && onEndSession && (
                          <button
                            type="button"
                            className="admin-notif-btn is-soft is-sm"
                            onClick={() => onEndSession(s.id)}
                          >
                            {labels.security.endSession}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* 로그아웃 — 현재 세션만 종료(§8.4). '모든 세션 종료'(전 기기)와 구분해 빨강 강조. */}
              <Card testId="security-logout-card">
                <div className="msc-row">
                  <div>
                    <div className="msc-row-title">{labels.security.logout}</div>
                    <div className="msc-row-sub">{labels.security.logoutDesc}</div>
                  </div>
                  <button
                    type="button"
                    className="admin-notif-btn is-danger-soft is-sm"
                    onClick={() => onLogout && onLogout()}
                    data-testid="logout-btn"
                  >
                    {labels.security.logout}
                  </button>
                </div>
                {logoutError && (
                  <p className="msc-input-error" data-testid="logout-error" style={{ marginTop: 10 }}>
                    {logoutError}
                  </p>
                )}
              </Card>
            </>
          )}
        </div>
      </div>

      {/* ── 사진 업로드 모달 (사이드바·헤더 위로 뜨도록 body 포털) ── */}
      {uploadOpen && typeof document !== 'undefined' && createPortal(
        <div className="admin-notif-modal-root" data-testid="photo-upload-modal">
          <div className="admin-notif-modal-backdrop" onClick={closeUpload} />
          <div className="admin-notif-modal" role="dialog" aria-modal="true" aria-label={labels.upload.title}>
            <div className="admin-notif-modal-header">
              <div className="admin-notif-modal-title">{labels.upload.title}</div>
              <button type="button" className="admin-notif-modal-close" onClick={closeUpload} aria-label="close">
                ×
              </button>
            </div>
            <div className="admin-notif-modal-body">
              <label
                className={`msc-upload-drop${uploadDrag ? ' is-drag' : ''}${uploadPreview ? ' has-preview' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setUploadDrag(true);
                }}
                onDragLeave={() => setUploadDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setUploadDrag(false);
                  handleFile(e.dataTransfer.files[0]);
                }}
              >
                {uploadPreview ? (
                  <>
                    <img src={uploadPreview} alt="" className="msc-upload-preview" />
                    <span className="msc-upload-again">{labels.upload.changeFile}</span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 36 }} aria-hidden="true">
                      📁
                    </span>
                    <span className="msc-upload-title">{labels.upload.dropTitle}</span>
                    <span className="msc-upload-sub">{labels.upload.dropSub}</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  data-testid="photo-file-input"
                  onChange={(e) => handleFile(e.target.files[0])}
                />
              </label>
            </div>
            <div className="admin-notif-modal-footer">
              <button type="button" className="admin-notif-btn is-soft" onClick={closeUpload}>
                {labels.upload.cancel}
              </button>
              <button
                type="button"
                className="admin-notif-btn is-primary"
                disabled={!pendingFile}
                onClick={confirmUpload}
                data-testid="photo-upload-confirm"
              >
                {pendingFile ? labels.upload.confirm : labels.upload.confirmEmpty}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
