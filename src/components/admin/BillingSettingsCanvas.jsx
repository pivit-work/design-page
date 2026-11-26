import { useEffect, useState } from 'react';
import Button from '../shared/Button.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import { AlertTriangleGlyph, ArrowRightGlyph, InfoGlyph } from '../shared/lineIcons.jsx';
import { Panel, SaveBar } from '../frames/index.js';
import { BillingCheckoutSteps, BillingNotice, BillingPage, BillingPageHead } from './kit/BillingSurface.jsx';
import { BILLING_PAGE_WIDTH } from './kit/billingPageWidth.js';

// ─────────────────────────────────────────────────────────────
// 결제·구독 — 청구 정보 (BillingSettingsCanvas)  /admin/billing/settings
// pivit-specs 의 billing-settings.jsx 시안을 design-page 정본으로 포팅.
//
// 폼 상태(fields/touched/errors/saved 베이스라인/saving/saveSuccess)는 내부에서
// 관리하고, profile prop 으로 초기값을 seeds 한다. 검증 통과 시 onSave(fields)
// 콜백을 호출(await)하며, 저장 상태머신(idle→saving→saved 2초→idle)은 내부.
// 캔버스는 인라인 스타일로 자기 완결적으로 렌더한다.
// ─────────────────────────────────────────────────────────────

// 검증 규칙
const BIZ_REG_PATTERN = /^\d{3}-\d{2}-\d{5}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const REQUIRED_FIELDS = ['company_name', 'biz_reg_no'];

const FIELD_KEYS = [
  'company_name',
  'biz_reg_no',
  'ceo_name',
  'biz_address',
  'biz_type',
  'billing_contact_name',
  'billing_contact_email',
];

const EMPTY_FIELDS = {
  company_name: '', biz_reg_no: '', ceo_name: '',
  biz_address: '', biz_type: '',
  billing_contact_name: '', billing_contact_email: '',
};

const DEFAULT_LABELS = {
  pageTitle: '청구 정보',
  pageSubtitle: '영수증(카드매출전표) 발행 및 청구에 사용되는 사업자 정보를 입력합니다.',
  noEditBadge: '편집 권한 없음',

  // 아직 저장된 청구 정보가 없을 때(첫 입력) — screen-billing-settings.policy.md §3
  emptyNotice: '아직 청구 정보가 없습니다. 영수증 발행을 위해 입력해 주세요.',

  // 결제 진행 모드 (PW-2110 · screen-billing-settings.policy.md §2) — 결제 도중(플랜 화면 업그레이드 ·
  // 결제하기 [수정]/[입력하러 가기]) 들어온 상태. 위 단계 표시 + 고른 요금제 안내 + 저장이 곧 다음 단계.
  checkoutSteps: ['플랜 선택', '청구 정보', '카드 등록·결제'],
  checkoutBannerTitle: (t) => `${t.planLabel} · ${t.intervalLabel} 결제를 위해 청구 정보를 입력해 주세요.`,
  checkoutBannerDesc: (t) =>
    `등록 구성원 ${t.seats}명 기준 · 저장하면 바로 카드 등록·결제 단계로 넘어갑니다. 사업자명·사업자등록번호는 필수입니다.`,
  // 결제 대상(고른 요금제)이 사라졌다 — 30분 경과 등
  checkoutTargetLostTitle: '결제할 요금제 정보가 만료되었습니다.',
  checkoutTargetLostDesc: '저장한 뒤 요금제를 다시 고르면 결제로 이어집니다. 사업자명·사업자등록번호는 필수입니다.',
  reselectPlan: '플랜 다시 고르기',
  continueSaveLabel: '저장하고 결제 계속',
  continueLabel: '결제 계속',
  flowStatusDirty: '저장하면 카드 등록·결제 단계로 넘어갑니다.',
  flowStatusSaved: '저장된 청구 정보로 결제를 계속합니다.',
  flowStatusEmpty: '사업자명·사업자등록번호를 입력해 주세요.',

  // 카드 등록 진행 모드 (PW-2111 · screen-billing-settings.policy.md §2) — 결제수단 [카드 추가]를 청구 정보 없이
  // 눌러 들어온 상태. 결제 진행 모드와 같은 모양에 단계·문구만 다르고, 저장 뒤 다음 단계는 카드 인증 창이다.
  cardSteps: ['청구 정보', '카드 등록'],
  cardBannerTitle: '카드를 등록하려면 청구 정보가 먼저 필요합니다.',
  cardBannerDesc:
    '저장하면 바로 카드 인증 창이 열리고, 인증을 마치면 결제수단 화면으로 돌아와 카드가 등록됩니다. 사업자명·사업자등록번호는 필수입니다.',
  backToMethods: '결제수단으로 돌아가기',
  cardContinueSaveLabel: '저장하고 카드 등록',
  cardContinueLabel: '카드 등록 계속',
  cardFlowStatusDirty: '저장하면 카드 인증 창이 열립니다.',
  cardFlowStatusSaved: '저장된 청구 정보로 카드 등록을 계속합니다.',
  openingCardLabel: '카드 인증 창을 여는 중...',

  noPermTitle: '접근 권한이 없습니다.',
  noPermDesc: '청구 정보는 회사 Owner 또는 billing_admin만 조회·수정할 수 있습니다. 담당자에게 요청하세요.',

  bizSectionTitle: '사업자 정보',
  contactSectionTitle: '청구 담당자',

  bizRegHint: '숫자를 입력하면 자동으로 포맷됩니다 (000-00-00000)',

  requiredError: '필수 항목입니다.',
  bizRegError: '올바른 사업자등록번호 형식(000-00-00000)을 입력해 주세요.',
  emailError: '올바른 이메일 주소를 입력해 주세요.',

  statusNoChanges: '변경 사항이 없습니다.',
  statusDirty: '저장되지 않은 변경 사항이 있습니다.',
  statusSaved: '청구 정보가 저장되었습니다.',
  saveLabel: '저장',
  savingLabel: '저장 중...',
  savedLabel: '저장됨 ✓',

  fields: {
    // note = 칸 안내(앱 PW-2711 · 결제 정책 §2) — 회사 설정과 같은 값인지 따로인지 알린다. 항상 보인다.
    company_name: { label: '사업자명', required: true, placeholder: '예) (주)피빗',
      note: '사업자등록증의 상호입니다. 회사 설정의 회사명과 따로 적습니다.' },
    biz_reg_no: { label: '사업자등록번호', required: true, placeholder: '000-00-00000',
      note: '회사 설정 › 회사 정보의 사업자 등록번호와 같은 번호입니다. 여기서 고치면 회사 설정에도 바뀝니다.' },
    ceo_name: { label: '대표자', required: false, placeholder: '예) 홍길동',
      note: '사업자등록증의 대표자입니다. 회사 설정의 대표자(구성원 관리에서 지정)와 따로입니다.' },
    biz_address: { label: '사업장 주소', required: false, placeholder: '사업장 주소를 입력하세요',
      note: '사업자등록증의 사업장 주소입니다. 회사 설정의 본점 주소와 따로 적습니다.' },
    biz_type: { label: '업태 / 종목', required: false, placeholder: '예) 정보통신업 / 소프트웨어 개발' },
    billing_contact_name: { label: '청구 담당자 이름', required: false, placeholder: '예) 이담당' },
    billing_contact_email: { label: '청구 담당자 이메일', required: false, placeholder: 'billing@example.com' },
  },
};

function mergeLabels(provided) {
  if (!provided) return DEFAULT_LABELS;
  return {
    ...DEFAULT_LABELS,
    ...provided,
    fields: { ...DEFAULT_LABELS.fields, ...(provided.fields || {}) },
  };
}

// 문구는 문자열 또는 (값) => 문자열 — 앱이 번역한 함수를 넘긴다.
const textOf = (label, v) => (typeof label === 'function' ? label(v) : label);

// profile prop → 폼 초기값. null 이면 빈 값 seed.
function seedFields(profile) {
  if (!profile) return { ...EMPTY_FIELDS };
  const seeded = {};
  FIELD_KEYS.forEach((k) => { seeded[k] = profile[k] || ''; });
  return seeded;
}

// 사업자등록번호 자동 하이픈 포맷
function formatBizRegNo(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return digits.slice(0, 3) + '-' + digits.slice(3);
  return digits.slice(0, 3) + '-' + digits.slice(3, 5) + '-' + digits.slice(5);
}

// ── 유틸리티 컴포넌트 ──────────────────────────────────────

// onClick 이 돌려주는 약속(Promise)은 Button 에 넘기지 않는다 — 넘기면 Button 이 글자를 감추고 도는 표시만 띄워,
// 화면이 직접 바꾸는 «다운로드 중…»·«카드 인증 창을 여는 중...» 같은 진행 글자가 안 보인다(기획서가 글자로 정함).
const fireOnly = (onClick) => (onClick ? (e) => { onClick(e); } : undefined);
// 버튼은 공용 Button(디자이너 어드민 버튼과 같은 값)으로 그린다 (pivit-work PW-2938). 손으로 칠한 값을 두지 않는다.
// «저장됨»(success)은 주 버튼 모양에 성공 초록 바탕(기획서 settings §81 «버튼 초록 전환 2초»). 위험(danger)은 danger-ghost.
function Btn({ children, onClick, kind = 'primary', disabled, size }) {
  const variant = kind === 'success' ? 'primary' : kind === 'danger' ? 'danger-ghost' : kind;
  return (
    <Button variant={variant} size={size} onClick={fireOnly(onClick)} disabled={disabled}
      style={kind === 'success' ? { background: 'var(--colors-success-500)' } : undefined}>
      {children}
    </Button>
  );
}

// ── 재사용 폼 필드 컴포넌트 ───────────────────────────────

// 칸 이름표 = 디자이너가 그린 1on1 「일정 추가」 창 값 그대로 (PW-1894 · one_on_one.css `.ono-add-modal-*`) — 14px 굵게 회색 · 이름표 → 칸 12px.
// 칸 → 다음 칸 24px 은 판 안 구역(`Panel.Section`)의 줄 사이가 띄운다.
// 입력칸 = 타임라인 «그룹 추가» 창 입력칸(timeline.css `.tl-emp-input` · 높이 40 · 옅은 회색 · 테두리 없음) (pivit-work PW-3132 · 시안 ㊷).
// 틀린 칸은 흰 바탕 + 빨간 테두리(시안 ㊺). 잠긴 칸은 디자이너 값이 없어 옅은 회색 · 흐린 글을 둔다.
const FIELD_LABEL_STYLE = {
  display: 'block', fontFamily: 'var(--font-family-body)', fontWeight: 700,
  fontSize: 'var(--font-size-text-sm)', lineHeight: 'var(--line-height-text-sm)',
  color: 'var(--text-secondary)', marginBottom: 'var(--spacing-lg)',
};
const FIELD_REQUIRED_STYLE = { color: 'var(--colors-text-textErrorPrimary)', marginLeft: 'var(--spacing-xxs)' };
const FIELD_INPUT_ERROR_STYLE = { borderColor: 'var(--colors-error-200)', background: 'var(--bg-primary)' };
const FIELD_INPUT_DISABLED_STYLE = { background: 'var(--bg-secondary)', color: 'var(--text-tertiary)', cursor: 'not-allowed' };
/** 칸 아래 도움말 · 잘못 넣은 값 안내 — 12/18(시안 ㊸ · ㊺ «그대로»). */
const FIELD_HELP_STYLE = {
  fontSize: 'var(--font-size-text-xs)', lineHeight: 'var(--line-height-text-xs)',
  color: 'var(--text-secondary)', marginTop: 'var(--spacing-xs)',
};
const FIELD_ERROR_STYLE = { ...FIELD_HELP_STYLE, color: 'var(--colors-text-textErrorPrimary)' };

function FormField({ meta, value, error, disabled, onChange, onBlur, hint, maxLength }) {
  return (
    <div>
      <label style={FIELD_LABEL_STYLE}>
        {meta.label}
        {meta.required && (
          <span style={FIELD_REQUIRED_STYLE}>*</span>
        )}
      </label>
      <input
        type="text"
        className="tl-emp-input"
        value={value}
        placeholder={meta.placeholder}
        maxLength={maxLength}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        style={error ? FIELD_INPUT_ERROR_STYLE : disabled ? FIELD_INPUT_DISABLED_STYLE : undefined}
      />
      {hint && !error && (
        <div style={FIELD_HELP_STYLE}>{hint}</div>
      )}
      {error && (
        <div style={FIELD_ERROR_STYLE}>{error}</div>
      )}
      {/* 칸 안내 (앱 PW-2711 · 결제 정책 §2 「칸 안내」) — 항상 보인다. 오류가 떠도 남는다(형식 안내 hint 와 다르다).
          모양은 위 hint 와 같다 — 기획 시안 billing-app.jsx FormField 의 meta.note 와 같은 자리·글씨. */}
      {meta.note && (
        <div style={FIELD_HELP_STYLE}>{meta.note}</div>
      )}
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────

export default function BillingSettingsCanvas({
  /** 결제 단계 표시 줄 끝 «?» 튜토리얼 도움말 버튼 (pivit-work PW-2567). 결제 진행 중일 때만 그린다. 안 주면 지금과 같다. */
  stepsHelp,
  profile = null,
  role = 'owner',
  // 결제 진행 모드 (PW-2110) — 결제 도중 들어왔다. 저장 영역의 주 버튼이 «저장 + 결제로 이어 가기»가 된다.
  fromCheckout = false,
  // 결제 진행 모드의 결제 대상 { planLabel, intervalLabel, seats } — null 이면 사라졌다(30분 경과 등).
  // seats 는 표시용이다(결제 좌석은 서버가 센다 · PW-1102).
  checkoutTarget = null,
  labels: providedLabels,
  onSave,
  // 결제 진행 모드에서 저장이 성공한 뒤(또는 고친 것이 없어 저장 없이) 부른다 — 앱이 결제하기(또는
  // 결제 대상이 사라졌으면 플랜 화면)로 옮긴다. 인자 { saved } = 이번에 저장했나.
  onContinueToCheckout,
  // [플랜 다시 고르기]
  onReselectPlan,
  // 카드 등록 진행 모드 (PW-2111) — 결제수단 [카드 추가]에서 들어왔다. 결제 진행 모드(fromCheckout)와 함께 켜지면
  // 결제 진행 모드가 이긴다(앱은 주소의 from 값 하나로 가르므로 둘이 함께 오지 않는다).
  fromMethods = false,
  // 카드 등록 진행 모드에서 저장이 성공한 뒤(또는 저장 없이) 부른다 — 앱이 카드 인증 창을 연다. 약속을 돌려주면
  // 그동안 버튼이 「카드 인증 창을 여는 중...」으로 막힌다. 인자 { saved } = 이번에 저장했나.
  onContinueToCard,
  // [결제수단으로 돌아가기]
  onBackToMethods,
  // 저장 안 한 변경이 생기고 사라질 때마다 알린다 — 앱이 떠날 때 경고를 건다(§4).
  onDirtyChange,
  // 저장하지 않은 입력값으로 폼을 연다(마지막 저장값은 profile 그대로라 «저장 안 한 변경»으로 보인다).
  // 자동 로그아웃 뒤 다시 로그인했을 때 고치던 값을 되살리는 데 쓴다(앱 PW-1673). 처음 열 때만 읽는다.
  draftFields = null,
  // 입력값이 바뀔 때마다 알린다 — 앱이 떠나기 직전 고치던 값을 남기는 데 쓴다(앱 PW-1673).
  onFieldsChange,
  // 메일 칸을 앱의 공용 메일 검사로 판정 — 받을 수 없는 주소면 안내 문구, 아니면 null (앱 PW-2413).
  // EMAIL_PATTERN 은 모양만 봐서 한글이 섞인 주소를 받았다.
  emailError,
  // 칸마다 글자 수 한도 { company_name: 100, ... } — 앱이 서버와 같은 값을 넘긴다(앱 PW-2472).
  // 넘기지 않은 칸은 한도 없이 받는다.
  fieldMaxLengths = null,
}) {
  const labels = mergeLabels(providedLabels);

  const canEdit = role === 'owner' || role === 'billing_admin';

  // 검증 함수 (labels 참조 위해 컴포넌트 내부)
  const validateField = (key, value) => {
    if (REQUIRED_FIELDS.includes(key) && !value.trim()) {
      return labels.requiredError;
    }
    if (key === 'biz_reg_no' && value.trim() && !BIZ_REG_PATTERN.test(value.trim())) {
      return labels.bizRegError;
    }
    if (key === 'billing_contact_email' && value.trim()) {
      const mailError = emailError?.(value.trim());
      if (mailError) return mailError;
      if (!EMAIL_PATTERN.test(value.trim())) return labels.emailError;
    }
    return '';
  };

  // 폼 상태
  const base = seedFields(profile);
  const [fields, setFields] = useState(() =>
    draftFields ? seedFields(draftFields) : base,
  );
  const [saved, setSaved] = useState(base); // 마지막 저장값 (dirty 비교용)
  // 이미 저장된 청구 담당자 메일이 받을 수 없는 주소면 처음부터 칸 아래에 보인다 (앱 PW-2413) — 안 보이면
  // 다른 칸만 고쳐도 [저장]이 막힌 이유를 알 수 없다(그 칸은 손대지 않아 blur 가 없다).
  const initialEmailError = () => validateField('billing_contact_email', fields.billing_contact_email ?? '');
  const [touched, setTouched] = useState(() => (initialEmailError() ? { billing_contact_email: true } : {})); // blur 된 필드 추적
  const [errors, setErrors] = useState(() => {
    const e = initialEmailError();
    return e ? { billing_contact_email: e } : {};
  });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [openingCard, setOpeningCard] = useState(false);

  // dirty — 저장값과 현재 값 다른지 확인
  const isDirty = FIELD_KEYS.some((k) => fields[k] !== saved[k]);
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);
  useEffect(() => {
    onFieldsChange?.(fields);
  }, [fields, onFieldsChange]);

  // 전체 검증 통과 여부
  const allValid = FIELD_KEYS.every((k) => !validateField(k, fields[k]));

  const canSave = canEdit && isDirty && allValid && !saving;

  // 결제 진행 모드 (PW-2110) — 저장된 필수 2항목이 있고 고친 것이 없으면 저장 없이 [결제 계속]
  const checkoutMode = fromCheckout && canEdit;
  // 카드 등록 진행 모드 (PW-2111) — 같은 규칙으로 [저장하고 카드 등록]/[카드 등록 계속]
  const cardMode = fromMethods && !fromCheckout && canEdit;
  const flowMode = checkoutMode || cardMode;
  const hasSavedRequired = REQUIRED_FIELDS.every((k) => !!saved[k]);
  const canContinue =
    canEdit && !saving && !openingCard && allValid && (isDirty || hasSavedRequired);

  // 진행 모드의 다음 단계 — 결제하기로 옮기거나(PW-2110) 카드 인증 창을 연다(PW-2111).
  const continueFlow = async (r) => {
    if (!cardMode) {
      onContinueToCheckout?.(r);
      return;
    }
    setOpeningCard(true);
    try {
      await onContinueToCard?.(r);
    } finally {
      setOpeningCard(false);
    }
  };

  // 필드 변경
  const handleChange = (key, raw) => {
    const value = key === 'biz_reg_no' ? formatBizRegNo(raw) : raw;
    setFields((prev) => ({ ...prev, [key]: value }));
    // 이미 touched 된 필드는 실시간 재검증
    if (touched[key]) {
      setErrors((prev) => ({ ...prev, [key]: validateField(key, value) }));
    }
  };

  // 필드 blur
  const handleBlur = (key) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
    setErrors((prev) => ({ ...prev, [key]: validateField(key, fields[key]) }));
  };

  // 저장
  const handleSave = async () => {
    // 전체 필드 touched 처리 + 에러 재계산
    const newErrors = {};
    const newTouched = {};
    FIELD_KEYS.forEach((k) => {
      newTouched[k] = true;
      newErrors[k] = validateField(k, fields[k]);
    });
    setTouched(newTouched);
    setErrors(newErrors);
    if (Object.values(newErrors).some(Boolean)) return;

    // 결제 진행 모드에서 고친 것이 없으면 저장 없이 바로 결제로 (PW-2110)
    if (flowMode && !isDirty) {
      await continueFlow({ saved: false });
      return;
    }

    setSaving(true);
    try {
      await onSave?.({ ...fields });
      setSaved({ ...fields });
      setSaving(false);
      // 결제 진행 모드: 저장이 성공하면 곧바로 이어 간다 — 2초 대기·[결제로 돌아가기] 없음 (PW-2110).
      // 이동은 저장 성공을 받은 뒤다 — 실패하면 아래 catch 로 가서 화면에 남는다 (PW-966).
      if (flowMode) {
        await continueFlow({ saved: true });
        return;
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch {
      // 실패하면 마지막으로 저장된 값으로 되돌린다(§3·§5 「폼 값 원복」) — 화면에 남은 값이
      // 저장된 것처럼 읽히지 않게.
      setFields({ ...saved });
      setTouched({});
      setErrors({});
      setSaving(false);
    }
  };

  // 저장 버튼 스타일 결정
  const saveBtnKind = saveSuccess ? 'success' : 'primary';
  const saveBtnLabel = saving ? labels.savingLabel : saveSuccess ? labels.savedLabel : labels.saveLabel;

  const field = (key, extra) => (
    <FormField
      meta={labels.fields[key]}
      maxLength={fieldMaxLengths?.[key]}
      value={fields[key]}
      error={touched[key] ? errors[key] : ''}
      disabled={!canEdit}
      onChange={(v) => handleChange(key, v)}
      onBlur={() => handleBlur(key)}
      {...extra}
    />
  );

  return (
    <BillingPage width={BILLING_PAGE_WIDTH.settings}>
      {/* 결제 진행 단계 표시 (PW-2110) — 화면 제목 위. ① 플랜 선택 ✓ ② 청구 정보(지금) ③ 카드 등록·결제 */}
      {checkoutMode && <BillingCheckoutSteps steps={labels.checkoutSteps} current={1} help={stepsHelp} />}
      {/* 카드 등록 단계 표시 (PW-2111) — 같은 부품. ① 청구 정보(지금) ② 카드 등록 */}
      {cardMode && <BillingCheckoutSteps steps={labels.cardSteps} current={0} />}

      <BillingPageHead
        title={labels.pageTitle}
        titleAside={!canEdit ? <StatusBadge tone="neutral" className="ono-done-badge">{labels.noEditBadge}</StatusBadge> : undefined}
        description={[labels.pageSubtitle]}
      />

      {/* 결제 진행 안내 (PW-2110) — 고른 요금제 한 줄 + [플랜 다시 고르기]. 결제 대상이 사라졌으면 그 사실을 알린다 */}
      {checkoutMode && (
        <BillingNotice
          tone="warn"
          testId="billing-settings-checkout-banner"
          icon={<AlertTriangleGlyph size={16} />}
          title={checkoutTarget ? textOf(labels.checkoutBannerTitle, checkoutTarget) : labels.checkoutTargetLostTitle}
          lines={[checkoutTarget ? textOf(labels.checkoutBannerDesc, checkoutTarget) : labels.checkoutTargetLostDesc]}
          actions={onReselectPlan && (
            <Btn kind="secondary" size="sm" onClick={onReselectPlan}>{labels.reselectPlan}</Btn>
          )}
        />
      )}

      {/* 카드 등록 안내 (PW-2111) — 왜 여기 왔는지 + 저장하면 무엇이 일어나는지 + [결제수단으로 돌아가기].
          결제 진행 안내 띠와 같은 모양 */}
      {cardMode && (
        <BillingNotice
          tone="warn"
          testId="billing-settings-card-banner"
          icon={<AlertTriangleGlyph size={16} />}
          title={labels.cardBannerTitle}
          lines={[labels.cardBannerDesc]}
          actions={onBackToMethods && (
            <Btn kind="secondary" size="sm" onClick={onBackToMethods}>{labels.backToMethods}</Btn>
          )}
        />
      )}

      {/* 사업자명이 없으면 아직 청구 정보가 없다 — 회사 설정에서 적은 사업자등록번호만 채워져 올 수 있다
          (앱 PW-2711 · 결제 정책 §3 빈 상태 «사업자등록번호 칸은 그 번호로 채워져 열린다»). */}
      {canEdit && !profile?.company_name && !flowMode && (
        <BillingNotice tone="info" testId="billing-settings-empty" icon={<InfoGlyph size={16} />} title={labels.emptyNotice} />
      )}

      {/* 권한 없음 — hr_admin 등은 청구 정보를 조회조차 할 수 없음. 폼/데이터 미렌더 */}
      {!canEdit ? (
        <BillingNotice tone="bad" icon={<AlertTriangleGlyph size={16} />} title={labels.noPermTitle} lines={[labels.noPermDesc]} />
      ) : (
        <>
          {/* 흰 판 하나에 두 구역 — 사업자 정보 · 청구 담당자 (시안 ㊶) */}
          <Panel testId="billing-settings-form">
            <Panel.Section title={labels.bizSectionTitle}>
              {field('company_name')}
              {field('biz_reg_no', { hint: labels.bizRegHint })}
              {field('ceo_name')}
              {field('biz_address')}
              {field('biz_type')}
            </Panel.Section>
            <Panel.Section title={labels.contactSectionTitle}>
              {field('billing_contact_name')}
              {field('billing_contact_email')}
            </Panel.Section>
          </Panel>

          {/* 저장 줄 — 판 아래 바탕 없는 한 줄 · 버튼 오른쪽 (시안 ㊹) */}
          {flowMode ? (
            /* 결제 진행 모드 (PW-2110) · 카드 등록 진행 모드 (PW-2111) — 버튼 하나가 «저장 + 다음 단계»를 맡는다 */
            <SaveBar
              testId="billing-settings-save-bar"
              hint={isDirty
                ? cardMode ? labels.cardFlowStatusDirty : labels.flowStatusDirty
                : hasSavedRequired
                  ? cardMode ? labels.cardFlowStatusSaved : labels.flowStatusSaved
                  : labels.flowStatusEmpty}
              actions={
                <Btn kind="primary" onClick={handleSave} disabled={!canContinue}>
                  {saving
                    ? labels.savingLabel
                    : openingCard
                      ? labels.openingCardLabel
                      : cardMode
                        ? isDirty ? labels.cardContinueSaveLabel : labels.cardContinueLabel
                        : isDirty ? labels.continueSaveLabel : labels.continueLabel}
                  {/* 기획서 settings §51·§53 이름 «[… 계속 →]» — 기다리는 글자일 때는 붙이지 않는다 (PW-2938) */}
                  {!saving && !openingCard && <ArrowRightGlyph size={13} />}
                </Btn>
              }
            />
          ) : (
            <SaveBar
              testId="billing-settings-save-bar"
              hint={saveSuccess ? labels.statusSaved : isDirty ? labels.statusDirty : labels.statusNoChanges}
              actions={
                <Btn kind={saveBtnKind} onClick={handleSave} disabled={!canSave}>
                  {saveBtnLabel}
                </Btn>
              }
            />
          )}
        </>
      )}
    </BillingPage>
  );
}
