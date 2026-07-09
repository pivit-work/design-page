import { useState } from 'react';

// ─────────────────────────────────────────────────────────────
// 결제·구독 — 영업 문의 (BillingContactSalesCanvas)  /admin/billing/contact-sales
// pivit-specs 의 billing-contact-sales.jsx 시안을 design-page 정본으로 포팅.
//
// 진입: billing-plans 의 Pro·Enterprise [영업팀 문의] CTA.
// 목적: 엔터프라이즈 리드 캡처 → 영업팀 통지 (SalesInquiry 생성).
// 권한: owner·billing_admin (그 외 접근 불가).
//
// 폼 상태·검증·제출 상태머신은 캔버스가 내부에서 소유한다. workspace prop 으로
// 기본값을 seed 하고, 제출 시 onSubmit(payload) 콜백을 await 하여
// form→submitting→success/error 로 전이한다. fetch·라우팅·통지는 wrapper 소유.
// ─────────────────────────────────────────────────────────────

const T = {
  font: "'Pretendard','Noto Sans KR',sans-serif",
  bg: '#F8FAFC', card: '#fff',
  border: '#E2E8F0', bl: '#F1F5F9',
  text: '#0F172A', sub: '#64748B', muted: '#94A3B8',
  accent: '#4F6AF5',
  green: '#22C55E', greenBg: '#F0FDF4',
  red: '#DC2626', redBg: '#FEF2F2',
  purple: '#7C3AED', purpleBg: '#F5F3FF',
};

// 관심 기능 옵션 (Pro·Enterprise 차별 기능) — 다중 선택
const INTEREST_OPTS = [
  { id: 'sso', label: 'SSO / 보안 정책' },
  { id: 'rbac', label: '고급 권한·가시성' },
  { id: 'ai', label: '전용 AI 한도' },
  { id: 'aichat', label: 'AI Chat' },
  { id: 'eval', label: '성과평가 운영' },
  { id: 'support', label: '전담 지원·온보딩' },
  { id: 'contract', label: '약정 할인·계약' },
  { id: 'etc', label: '기타' },
];

// 희망 도입 시기 — 단일 선택 (라벨 그대로 저장)
const TIMING_OPTS = ['1개월 내', '1~3개월', '3~6개월', '미정'];

const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const DEFAULT_LABELS = {
  noAccess: '접근 권한이 없습니다.',
  backToPlans: '← 플랜으로',

  successTitle: '문의가 접수되었습니다',
  successDesc: (email) => (
    <>영업팀이 <b>영업일 기준 1~2일 내</b> {email} 로 연락드립니다.</>
  ),
  successNote: '접수 번호는 등록하신 이메일로 발송됩니다.',
  successCta: '구독 현황으로',

  planBadge: 'Pro · Enterprise',
  pageTitle: '영업팀 문의',
  pageSubtitle:
    '100인+ 조직·엔터프라이즈 요건(SSO·고급 권한·전용 AI 한도·약정 할인)에 맞춰 커스텀 견적을 제공합니다. 아래 정보를 남겨주시면 영업팀이 연락드립니다.',

  wsContext: (name, seats) => (
    <>워크스페이스 <b style={{ color: T.text }}>{name}</b> · 현재 활성 좌석 <b style={{ color: T.text }}>{seats}명</b></>
  ),

  contactNameLabel: '담당자명',
  emailLabel: '이메일',
  emailPlaceholder: 'name@company.com',
  phoneLabel: '연락처',
  phonePlaceholder: '010-0000-0000 (선택)',
  expectedSeatsLabel: '예상 도입 인원(좌석)',
  interestsLabel: '관심 기능 (복수 선택)',
  timingLabel: '희망 도입 시기',
  messageLabel: '문의 내용',
  messagePlaceholder: '조직 규모·현재 사용 도구·필요 요건 등을 적어주시면 상담이 빨라집니다. (선택)',

  errContactName: '담당자명을 입력해 주세요',
  errEmailRequired: '이메일을 입력해 주세요',
  errEmailFormat: '이메일 형식이 올바르지 않습니다',
  errExpectedSeats: '예상 인원을 숫자로 입력해 주세요',

  submitError: '문의 접수에 실패했습니다. 잠시 후 다시 시도해 주세요.',
  submit: '문의 보내기',
  submitting: '접수 중...',
  submitNote: '제출 시 입력하신 정보가 영업팀에 전달됩니다.',
};

function mergeLabels(provided) {
  if (!provided) return DEFAULT_LABELS;
  return { ...DEFAULT_LABELS, ...provided };
}

function Card({ children, style }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 16, padding: 24, ...style }}>{children}</div>
  );
}

function Field({ label, required, error, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
        {label}{required && <span style={{ color: T.red }}> *</span>}
      </label>
      {children}
      {error && <div style={{ fontSize: 12, color: T.red, marginTop: 4 }}>{error}</div>}
    </div>
  );
}

const inputStyle = (err) => ({
  width: '100%', fontFamily: T.font, fontSize: 14, padding: '10px 12px',
  borderRadius: 10, border: `1px solid ${err ? '#FCA5A5' : T.border}`,
  color: T.text, background: '#fff', boxSizing: 'border-box',
});

export default function BillingContactSalesCanvas({
  workspace = { name: '', seats: 0, contactName: '', contactEmail: '' },
  role = 'owner',
  labels: providedLabels,
  onSubmit,
  onBack,
  onDone,
}) {
  const labels = mergeLabels(providedLabels);

  const [f, setF] = useState({
    contactName: workspace.contactName || '',
    email: workspace.contactEmail || '',
    phone: '',
    expectedSeats: workspace.seats != null ? String(workspace.seats) : '',
    message: '',
    timing: '1~3개월',
  });
  const [interests, setInterests] = useState([]);
  const [touched, setTouched] = useState({});
  const [state, setState] = useState('form'); // form | submitting | success | error

  if (role !== 'owner' && role !== 'billing_admin') {
    return <div style={{ fontFamily: T.font, padding: 40 }}>{labels.noAccess}</div>;
  }

  const errors = {
    contactName: !f.contactName.trim() ? labels.errContactName : '',
    email: !f.email.trim()
      ? labels.errEmailRequired
      : (!emailOk(f.email) ? labels.errEmailFormat : ''),
    expectedSeats: !/^\d+$/.test(f.expectedSeats) || +f.expectedSeats < 1
      ? labels.errExpectedSeats
      : '',
  };
  const valid = !errors.contactName && !errors.email && !errors.expectedSeats;

  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const blur = (k) => setTouched((s) => ({ ...s, [k]: true }));
  const toggleInterest = (id) =>
    setInterests((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const handleSubmit = async () => {
    setTouched({ contactName: true, email: true, expectedSeats: true });
    if (!valid || state === 'submitting') return;
    setState('submitting');
    try {
      await onSubmit?.({
        contactName: f.contactName.trim(),
        email: f.email.trim(),
        phone: f.phone,
        expectedSeats: Number(f.expectedSeats),
        interests,
        timing: f.timing,
        message: f.message,
      });
      setState('success');
    } catch {
      setState('error');
    }
  };

  return (
    <div style={{ fontFamily: T.font, background: T.bg, minHeight: '100vh', padding: 32, color: T.text }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>

        <button type="button" onClick={onBack}
          style={{ background: 'none', border: 'none', color: T.sub, fontSize: 13,
            cursor: 'pointer', padding: 0, marginBottom: 16 }}>{labels.backToPlans}</button>

        {state === 'success' ? (
          <Card style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: T.greenBg,
              color: T.green, fontSize: 28, display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 16px' }}>✓</div>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>{labels.successTitle}</div>
            <div style={{ fontSize: 14, color: T.sub, marginBottom: 6 }}>
              {labels.successDesc(f.email)}
            </div>
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 24 }}>
              {labels.successNote}
            </div>
            <button type="button" onClick={onDone}
              style={{ fontFamily: T.font, fontSize: 14, fontWeight: 700, padding: '12px 24px',
                borderRadius: 10, border: 'none', background: T.accent, color: '#fff', cursor: 'pointer' }}>
              {labels.successCta}
            </button>
          </Card>
        ) : (
          <>
            {/* 헤더 */}
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.purple, background: T.purpleBg,
                padding: '3px 10px', borderRadius: 999 }}>{labels.planBadge}</span>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: '8px 0 6px' }}>{labels.pageTitle}</h1>
            <p style={{ color: T.sub, fontSize: 14, marginTop: 0, marginBottom: 20 }}>
              {labels.pageSubtitle}
            </p>

            {/* 워크스페이스 컨텍스트(자동) */}
            <Card style={{ marginBottom: 16, background: T.bl, border: 'none' }}>
              <div style={{ fontSize: 13, color: T.sub }}>
                {labels.wsContext(workspace.name, workspace.seats)}
              </div>
            </Card>

            <Card>
              <Field label={labels.contactNameLabel} required error={touched.contactName ? errors.contactName : ''}>
                <input style={inputStyle(touched.contactName && errors.contactName)} value={f.contactName}
                  onChange={(e) => set('contactName', e.target.value)} onBlur={() => blur('contactName')} />
              </Field>
              <Field label={labels.emailLabel} required error={touched.email ? errors.email : ''}>
                <input style={inputStyle(touched.email && errors.email)} value={f.email}
                  onChange={(e) => set('email', e.target.value)} onBlur={() => blur('email')}
                  placeholder={labels.emailPlaceholder} />
              </Field>
              <Field label={labels.phoneLabel}>
                <input style={inputStyle(false)} value={f.phone}
                  onChange={(e) => set('phone', e.target.value)} placeholder={labels.phonePlaceholder} />
              </Field>
              <Field label={labels.expectedSeatsLabel} required error={touched.expectedSeats ? errors.expectedSeats : ''}>
                <input style={inputStyle(touched.expectedSeats && errors.expectedSeats)} value={f.expectedSeats}
                  onChange={(e) => set('expectedSeats', e.target.value.replace(/[^\d]/g, ''))}
                  onBlur={() => blur('expectedSeats')} inputMode="numeric" />
              </Field>

              <Field label={labels.interestsLabel}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {INTEREST_OPTS.map((o) => {
                    const on = interests.includes(o.id);
                    return (
                      <button key={o.id} type="button" onClick={() => toggleInterest(o.id)}
                        style={{ fontFamily: T.font, fontSize: 13, fontWeight: on ? 700 : 500,
                          padding: '7px 13px', borderRadius: 999, cursor: 'pointer',
                          border: `1px solid ${on ? T.accent : T.border}`,
                          background: on ? '#EEF2FF' : '#fff', color: on ? T.accent : T.sub }}>
                        {on ? '✓ ' : ''}{o.label}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <Field label={labels.timingLabel}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {TIMING_OPTS.map((t) => {
                    const on = f.timing === t;
                    return (
                      <button key={t} type="button" onClick={() => set('timing', t)}
                        style={{ fontFamily: T.font, fontSize: 13, fontWeight: on ? 700 : 500,
                          padding: '7px 13px', borderRadius: 10, cursor: 'pointer',
                          border: `1px solid ${on ? T.accent : T.border}`,
                          background: on ? '#EEF2FF' : '#fff', color: on ? T.accent : T.sub }}>{t}</button>
                    );
                  })}
                </div>
              </Field>

              <Field label={labels.messageLabel}>
                <textarea style={{ ...inputStyle(false), minHeight: 96, resize: 'vertical' }}
                  value={f.message} onChange={(e) => set('message', e.target.value)}
                  placeholder={labels.messagePlaceholder} />
              </Field>

              {state === 'error' && (
                <div style={{ fontSize: 13, color: T.red, background: T.redBg,
                  border: '1px solid #FCA5A5', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
                  {labels.submitError}
                </div>
              )}

              <button type="button" onClick={handleSubmit} disabled={state === 'submitting'}
                style={{ width: '100%', fontFamily: T.font, fontSize: 15, fontWeight: 800,
                  padding: '14px', borderRadius: 12, border: 'none', color: '#fff',
                  background: state === 'submitting' ? T.muted : T.accent,
                  cursor: state === 'submitting' ? 'not-allowed' : 'pointer' }}>
                {state === 'submitting' ? labels.submitting : labels.submit}
              </button>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 10, textAlign: 'center' }}>
                {labels.submitNote}
              </div>
            </Card>
          </>
        )}

      </div>
    </div>
  );
}
