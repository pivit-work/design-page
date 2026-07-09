import { useState } from 'react';

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
  font: "'Pretendard','Noto Sans KR',sans-serif",
  mono: "'DM Mono',monospace",
  bg: '#F8FAFC', card: '#fff',
  border: '#E2E8F0', bl: '#F1F5F9',
  text: '#0F172A', sub: '#64748B', muted: '#94A3B8',
  accent: '#4F6AF5',
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

  checkoutBannerTitle: '결제 전 청구 정보를 먼저 입력해 주세요.',
  checkoutBannerDesc: '저장 후 결제 화면으로 돌아갑니다. 사업자명·사업자등록번호는 필수입니다.',

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
  statusReturn: '저장되었습니다. 결제 화면으로 돌아가세요.',

  returnToCheckout: '결제로 돌아가기 →',
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

function Card({ children, style }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 16, padding: 24, ...style }}>
      {children}
    </div>
  );
}

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

function Badge({ children, color, bg }) {
  return (
    <span style={{ fontSize: 12, fontWeight: 700, color, background: bg,
      padding: '3px 10px', borderRadius: 999, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

// ── 재사용 폼 필드 컴포넌트 ───────────────────────────────

function FormField({ meta, value, error, disabled, onChange, onBlur, hint, style }) {
  return (
    <div style={{ marginBottom: 20, ...style }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 700,
        color: T.text, marginBottom: 6 }}>
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
          width: '100%', boxSizing: 'border-box',
          fontFamily: T.font,
          fontSize: 14, padding: '10px 12px', borderRadius: 8,
          border: `1px solid ${error ? T.red : T.border}`,
          background: disabled ? T.bl : '#fff',
          color: disabled ? T.sub : T.text,
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
  fromCheckout = false,
  labels: providedLabels,
  onSave,
  onReturnToCheckout,
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
    if (key === 'billing_contact_email' && value.trim() && !EMAIL_PATTERN.test(value.trim())) {
      return labels.emailError;
    }
    return '';
  };

  // 폼 상태
  const base = seedFields(profile);
  const [fields, setFields] = useState(base);
  const [saved, setSaved] = useState(base); // 마지막 저장값 (dirty 비교용)
  const [touched, setTouched] = useState({}); // blur 된 필드 추적
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showReturnBtn, setShowReturnBtn] = useState(false);

  // dirty — 저장값과 현재 값 다른지 확인
  const isDirty = FIELD_KEYS.some((k) => fields[k] !== saved[k]);

  // 전체 검증 통과 여부
  const allValid = FIELD_KEYS.every((k) => !validateField(k, fields[k]));

  const canSave = canEdit && isDirty && allValid && !saving;

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

    setSaving(true);
    try {
      await onSave?.({ ...fields });
      setSaved({ ...fields });
      setSaving(false);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        if (fromCheckout) setShowReturnBtn(true);
      }, 2000);
    } catch {
      setSaving(false);
    }
  };

  // 저장 버튼 스타일 결정
  const saveBtnKind = saveSuccess ? 'success' : 'primary';
  const saveBtnLabel = saving ? labels.savingLabel : saveSuccess ? labels.savedLabel : labels.saveLabel;

  return (
    <div style={{ fontFamily: T.font, background: T.bg, minHeight: '100vh', padding: 32, color: T.text }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{labels.pageTitle}</h1>
          {!canEdit && <Badge color={T.sub} bg={T.bl}>{labels.noEditBadge}</Badge>}
        </div>
        <p style={{ color: T.sub, fontSize: 14, marginTop: 0, marginBottom: 24 }}>
          {labels.pageSubtitle}
        </p>

        {/* 체크아웃 복귀 안내 배너 */}
        {fromCheckout && (
          <Card style={{ marginBottom: 16, background: T.amberBg, border: '1px solid #FDE68A' }}>
            <div style={{ fontWeight: 700, color: T.amber, marginBottom: 4 }}>{labels.checkoutBannerTitle}</div>
            <div style={{ fontSize: 13, color: T.text }}>
              {labels.checkoutBannerDesc}
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
              <div style={{ fontSize: 13, color: T.sub }}>
                {!isDirty && !saveSuccess && labels.statusNoChanges}
                {isDirty && !saveSuccess && labels.statusDirty}
                {saveSuccess && !showReturnBtn && labels.statusSaved}
                {showReturnBtn && labels.statusReturn}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {showReturnBtn && (
                  <Btn kind="primary" onClick={onReturnToCheckout}>
                    {labels.returnToCheckout}
                  </Btn>
                )}
                <Btn kind={saveBtnKind} onClick={handleSave} disabled={!canSave}>
                  {saveBtnLabel}
                </Btn>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
