import { useEffect, useState } from 'react';
import {
  BillingCard as Card,
  BillingBadge as Badge,
  BillingCheckoutSteps,
} from './kit/BillingSurface.jsx';

// ─────────────────────────────────────────────────────────────
// 결제·구독 — 청구 정보 (BillingSettingsCanvas)  /admin/billing/settings
// pivit-specs 의 billing-settings.jsx 시안을 design-page 정본으로 포팅.
//
// 폼 상태(fields/touched/errors/saved 베이스라인/saving/saveSuccess)는 내부에서
// 관리하고, profile prop 으로 초기값을 seeds 한다. 검증 통과 시 onSave(fields)
// 콜백을 호출(await)하며, 저장 상태머신(idle→saving→saved 2초→idle)은 내부.
// 캔버스는 인라인 스타일로 자기 완결적으로 렌더한다.
// ─────────────────────────────────────────────────────────────

const T = {
  font: 'var(--font-family-body)',
  bg: '#F8FAFC', card: '#fff',
  border: '#E2E8F0', bl: '#F1F5F9',
  text: '#0F172A', sub: '#64748B', muted: '#94A3B8',
  // 강조색은 앱 브랜드 토큰 (PW-1894) — 채움·테두리는 기본 버튼(.dp-btn--primary) 바탕, 글씨는 1on1 화면의 브랜드 글씨
  accent: 'var(--bg-brand-solid)', accentText: 'var(--text-brand-secondary)',
  green: '#22C55E', greenBg: '#F0FDF4',
  amber: '#F59E0B', amberBg: '#FFFBEB',
  red: '#DC2626', redBg: '#FEF2F2',
};

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
  noPermDesc: '청구 정보는 워크스페이스 Owner 또는 billing_admin만 조회·수정할 수 있습니다. 담당자에게 요청하세요.',

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
    company_name: { label: '사업자명', required: true, placeholder: '예) (주)피빗' },
    biz_reg_no: { label: '사업자등록번호', required: true, placeholder: '000-00-00000' },
    ceo_name: { label: '대표자', required: false, placeholder: '예) 홍길동' },
    biz_address: { label: '주소', required: false, placeholder: '사업장 주소를 입력하세요' },
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

function Btn({ children, onClick, kind = 'primary', disabled }) {
  const styles = {
    primary: { bg: T.accent, color: '#fff', border: 'transparent' },
    secondary: { bg: '#fff', color: T.text, border: T.border },
    success: { bg: T.green, color: '#fff', border: 'transparent' },
    danger: { bg: '#fff', color: T.red, border: '#FCA5A5' },
  }[kind];
  return (
    <button type="button" onClick={disabled ? undefined : onClick} disabled={disabled}
      style={{ fontFamily: T.font, fontSize: 14, fontWeight: 700,
        padding: '10px 18px', borderRadius: 10, cursor: disabled ? 'not-allowed' : 'pointer',
        background: styles.bg, color: styles.color, border: `1px solid ${styles.border}`,
        opacity: disabled ? 0.5 : 1 }}>
      {children}
    </button>
  );
}

// ── 재사용 폼 필드 컴포넌트 ───────────────────────────────

function FormField({ meta, value, error, disabled, onChange, onBlur, hint, style }) {
  return (
    // 칸 이름표·입력칸 = 디자이너가 그린 1on1 「일정 추가」 창 값 그대로 (PW-1894 · one_on_one.css `.ono-add-modal-*`).
    // 이름표 14px 굵게 회색 · 이름표 → 칸 12px · 칸 → 다음 칸 24px. 잠긴 칸은 1on1 창에 없어 원래 연회색을 둔다.
    <div style={{ marginBottom: 'var(--spacing-3xl)', ...style }}>
      <label style={{ display: 'block', fontFamily: 'var(--font-family-body)', fontWeight: 700,
        fontSize: 'var(--font-size-text-sm)', lineHeight: 'var(--line-height-text-sm)',
        color: 'var(--text-secondary)', marginBottom: 'var(--spacing-lg)' }}>
        {meta.label}
        {meta.required && (
          <span style={{ color: T.red, marginLeft: 3 }}>*</span>
        )}
      </label>
      <input
        type="text"
        value={value}
        placeholder={meta.placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        style={{
          width: '100%', boxSizing: 'border-box', minHeight: 40,
          padding: 'var(--spacing-md) var(--spacing-lg)',
          fontFamily: 'var(--font-family-body)', fontWeight: 400,
          fontSize: 'var(--font-size-text-md)', lineHeight: 'var(--line-height-text-md)',
          borderRadius: 'var(--radius-md)',
          border: `1px solid ${error ? 'var(--colors-error-200)' : 'var(--componentColors-alpha-alphaBlack5, rgba(0,0,0,0.05))'}`,
          background: disabled ? T.bl : 'var(--componentColors-alpha-alphaBlack3, rgba(0,0,0,0.03))',
          color: disabled ? T.sub : 'var(--text-primary)',
          outline: 'none', cursor: disabled ? 'not-allowed' : 'text',
        }}
      />
      {hint && !error && (
        <div style={{ fontSize: 12, color: T.muted, marginTop: 5 }}>{hint}</div>
      )}
      {error && (
        <div style={{ fontSize: 12, color: T.red, marginTop: 5 }}>{error}</div>
      )}
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────

export default function BillingSettingsCanvas({
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
  const [touched, setTouched] = useState({}); // blur 된 필드 추적
  const [errors, setErrors] = useState({});
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

  return (
    <div style={{ fontFamily: T.font, background: T.bg, minHeight: '100vh', padding: 32, color: T.text }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* 결제 진행 단계 표시 (PW-2110) — 화면 제목 위. ① 플랜 선택 ✓ ② 청구 정보(지금) ③ 카드 등록·결제 */}
        {checkoutMode && <BillingCheckoutSteps steps={labels.checkoutSteps} current={1} />}
        {/* 카드 등록 단계 표시 (PW-2111) — 같은 부품. ① 청구 정보(지금) ② 카드 등록 */}
        {cardMode && <BillingCheckoutSteps steps={labels.cardSteps} current={0} />}

        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{labels.pageTitle}</h1>
          {!canEdit && <Badge color={T.sub} bg={T.bl}>{labels.noEditBadge}</Badge>}
        </div>
        <p style={{ color: T.sub, fontSize: 14, marginTop: 0, marginBottom: 24 }}>
          {labels.pageSubtitle}
        </p>

        {/* 결제 진행 안내 (PW-2110) — 고른 요금제 한 줄 + [플랜 다시 고르기]. 결제 대상이 사라졌으면 그 사실을 알린다 */}
        {checkoutMode && (
          <Card style={{ marginBottom: 16, background: T.amberBg, border: '1px solid #FDE68A' }}>
            <div
              data-testid="billing-settings-checkout-banner"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}
            >
              <div>
                <div style={{ fontWeight: 700, color: T.amber, marginBottom: 4 }}>
                  {checkoutTarget
                    ? textOf(labels.checkoutBannerTitle, checkoutTarget)
                    : labels.checkoutTargetLostTitle}
                </div>
                <div style={{ fontSize: 13, color: T.text }}>
                  {checkoutTarget
                    ? textOf(labels.checkoutBannerDesc, checkoutTarget)
                    : labels.checkoutTargetLostDesc}
                </div>
              </div>
              {onReselectPlan && (
                // 안내 글이 길어도 버튼 이름은 한 줄로 — 줄어들면 두세 줄로 꺾였다
                <div style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
                  <Btn kind="secondary" onClick={onReselectPlan}>
                    {labels.reselectPlan}
                  </Btn>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* 카드 등록 안내 (PW-2111) — 왜 여기 왔는지 + 저장하면 무엇이 일어나는지 + [결제수단으로 돌아가기].
            결제 진행 안내 상자와 같은 모양 */}
        {cardMode && (
          <Card style={{ marginBottom: 16, background: T.amberBg, border: '1px solid #FDE68A' }}>
            <div
              data-testid="billing-settings-card-banner"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}
            >
              <div>
                <div style={{ fontWeight: 700, color: T.amber, marginBottom: 4 }}>{labels.cardBannerTitle}</div>
                <div style={{ fontSize: 13, color: T.text }}>{labels.cardBannerDesc}</div>
              </div>
              {onBackToMethods && (
                <div style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
                  <Btn kind="secondary" onClick={onBackToMethods}>
                    {labels.backToMethods}
                  </Btn>
                </div>
              )}
            </div>
          </Card>
        )}

        {canEdit && !profile && !flowMode && (
          <Card style={{ marginBottom: 16, background: T.bl, border: `1px solid ${T.border}` }}>
            <div data-testid="billing-settings-empty" style={{ fontSize: 13, color: T.text }}>
              {labels.emptyNotice}
            </div>
          </Card>
        )}

        {/* 권한 없음 — hr_admin 등은 청구 정보를 조회조차 할 수 없음. 폼/데이터 미렌더 */}
        {!canEdit ? (
          <Card style={{ background: T.redBg, border: '1px solid #FCA5A5' }}>
            <div style={{ fontWeight: 700, color: T.red, marginBottom: 4 }}>{labels.noPermTitle}</div>
            <div style={{ fontSize: 13, color: T.text }}>
              {labels.noPermDesc}
            </div>
          </Card>
        ) : (
          <>
            {/* 사업자 정보 카드 */}
            <Card style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 20 }}>{labels.bizSectionTitle}</div>

              <FormField
                meta={labels.fields.company_name}
                value={fields.company_name}
                error={touched.company_name ? errors.company_name : ''}
                disabled={!canEdit}
                onChange={(v) => handleChange('company_name', v)}
                onBlur={() => handleBlur('company_name')}
              />

              <FormField
                meta={labels.fields.biz_reg_no}
                value={fields.biz_reg_no}
                error={touched.biz_reg_no ? errors.biz_reg_no : ''}
                disabled={!canEdit}
                onChange={(v) => handleChange('biz_reg_no', v)}
                onBlur={() => handleBlur('biz_reg_no')}
                hint={labels.bizRegHint}
              />

              <FormField
                meta={labels.fields.ceo_name}
                value={fields.ceo_name}
                error={touched.ceo_name ? errors.ceo_name : ''}
                disabled={!canEdit}
                onChange={(v) => handleChange('ceo_name', v)}
                onBlur={() => handleBlur('ceo_name')}
              />

              <FormField
                meta={labels.fields.biz_address}
                value={fields.biz_address}
                error={touched.biz_address ? errors.biz_address : ''}
                disabled={!canEdit}
                onChange={(v) => handleChange('biz_address', v)}
                onBlur={() => handleBlur('biz_address')}
              />

              <FormField
                meta={labels.fields.biz_type}
                value={fields.biz_type}
                error={touched.biz_type ? errors.biz_type : ''}
                disabled={!canEdit}
                onChange={(v) => handleChange('biz_type', v)}
                onBlur={() => handleBlur('biz_type')}
                style={{ marginBottom: 0 }}
              />
            </Card>

            {/* 청구 담당자 카드 */}
            <Card style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 20 }}>{labels.contactSectionTitle}</div>

              <FormField
                meta={labels.fields.billing_contact_name}
                value={fields.billing_contact_name}
                error={touched.billing_contact_name ? errors.billing_contact_name : ''}
                disabled={!canEdit}
                onChange={(v) => handleChange('billing_contact_name', v)}
                onBlur={() => handleBlur('billing_contact_name')}
              />

              <FormField
                meta={labels.fields.billing_contact_email}
                value={fields.billing_contact_email}
                error={touched.billing_contact_email ? errors.billing_contact_email : ''}
                disabled={!canEdit}
                onChange={(v) => handleChange('billing_contact_email', v)}
                onBlur={() => handleBlur('billing_contact_email')}
                style={{ marginBottom: 0 }}
              />
            </Card>

            {/* 저장 버튼 영역 */}
            <Card style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {flowMode ? (
                /* 결제 진행 모드 (PW-2110) · 카드 등록 진행 모드 (PW-2111) — 버튼 하나가 «저장 + 다음 단계»를 맡는다 */
                <>
                  <div style={{ fontSize: 13, color: T.sub }}>
                    {isDirty
                      ? cardMode ? labels.cardFlowStatusDirty : labels.flowStatusDirty
                      : hasSavedRequired
                        ? cardMode ? labels.cardFlowStatusSaved : labels.flowStatusSaved
                        : labels.flowStatusEmpty}
                  </div>
                  <Btn kind="primary" onClick={handleSave} disabled={!canContinue}>
                    {saving
                      ? labels.savingLabel
                      : openingCard
                        ? labels.openingCardLabel
                        : cardMode
                          ? isDirty ? labels.cardContinueSaveLabel : labels.cardContinueLabel
                          : isDirty ? labels.continueSaveLabel : labels.continueLabel}
                  </Btn>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 13, color: T.sub }}>
                    {!isDirty && !saveSuccess && labels.statusNoChanges}
                    {isDirty && !saveSuccess && labels.statusDirty}
                    {saveSuccess && labels.statusSaved}
                  </div>
                  <Btn kind={saveBtnKind} onClick={handleSave} disabled={!canSave}>
                    {saveBtnLabel}
                  </Btn>
                </>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
