import { useState } from 'react';
import SegmentedControl from '../shared/SegmentedControl.jsx';
import Checkbox from '../shared/Checkbox.jsx';
import Button from '../shared/Button.jsx';
import { AlertTriangleGlyph, CheckGlyph, InfoGlyph } from '../shared/lineIcons.jsx';
import { Panel } from '../frames/index.js';
import { BillingInlineNote, BillingNotice, BillingPage, BillingPageHead } from './kit/BillingSurface.jsx';
import { BILLING_PAGE_WIDTH } from './kit/billingPageWidth.js';

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
  font: 'var(--font-family-body)',
  bg: '#F8FAFC', card: '#fff',
  border: '#E2E8F0', bl: '#F1F5F9',
  text: '#0F172A', sub: '#64748B', muted: '#94A3B8',
  // 강조색은 앱 브랜드 토큰 (PW-1894) — 채움·테두리는 기본 버튼(.dp-btn--primary) 바탕, 글씨는 1on1 화면의 브랜드 글씨
  accent: 'var(--bg-brand-solid)', accentText: 'var(--text-brand-secondary)',
  green: '#22C55E', greenBg: '#F0FDF4',
  red: '#DC2626', redBg: '#FEF2F2',
  purple: '#7C3AED', purpleBg: '#F5F3FF',
};

// 관심 기능 옵션 (Pro·Enterprise 차별 기능) — 다중 선택. 보내는 값은 id, 보이는 이름은 labels.interestOptions[id]
const INTEREST_IDS = ['sso', 'rbac', 'ai', 'aichat', 'eval', 'support', 'contract', 'etc'];

// 희망 도입 시기 — 단일 선택. value 는 영업팀 문의에 그대로 저장되는 값이라 화면 언어와 상관없이 한국어로 둔다
// (앱 PW-2548). 보이는 이름은 labels.timingOptions[id] — 영어 화면은 앱이 영어 이름을 넘긴다.
const TIMING_OPTS = [
  { id: 'within1m', value: '1개월 내' },
  { id: 'm1to3', value: '1~3개월' },
  { id: 'm3to6', value: '3~6개월' },
  { id: 'undecided', value: '미정' },
];

const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const DEFAULT_LABELS = {
  noAccess: '접근 권한이 없습니다.',
  backToPlans: '← 플랜으로',

  successTitle: '문의가 접수되었습니다',
  successDesc: (email) => (
    <>영업팀이 <b>영업일 기준 1~2일 내</b> {email} 로 연락드립니다.</>
  ),
  successNote: '접수 번호는 등록하신 이메일로 발송됩니다.',
  // 문의는 끝점이 아니라 협의 단가 경로의 시작점이다 (PW-344 · screen-billing-contact-sales §3).
  successNextStep: (
    <>협의가 끝나면 <b>플랜 화면에서 바로 결제</b>하실 수 있도록 협의 단가가 등록됩니다.</>
  ),

  // 이미 견적이 있거나 만료된 채 재문의 (PW-344 · §7). 제출은 막지 않는다.
  quoteActiveNotice: '협의 단가가 등록되어 있습니다',
  quoteActiveCta: '플랜에서 결제하기',
  quoteExpiredNotice: '이전 견적이 만료되었습니다',
  successCta: '구독 현황으로',

  planBadge: 'Pro · Enterprise',
  pageTitle: '영업팀 문의',
  pageSubtitle:
    '100인+ 조직·엔터프라이즈 요건(SSO·고급 권한·전용 AI 한도·약정 할인)에 맞춰 커스텀 견적을 제공합니다. 아래 정보를 남겨주시면 영업팀이 연락드립니다.',

  wsContext: (name, seats) => (
    <>회사 <b style={{ color: 'var(--text-primary)' }}>{name}</b> · 현재 활성 좌석 <b style={{ color: 'var(--text-primary)' }}>{seats}명</b></>
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

  // 고르는 칸의 보이는 이름 (앱 PW-2548 — 영어 화면에서 앱이 덮는다)
  interestOptions: {
    sso: 'SSO / 보안 정책',
    rbac: '고급 권한·가시성',
    ai: '전용 AI 한도',
    aichat: 'AI Chat',
    eval: '성과평가 운영',
    support: '전담 지원·온보딩',
    contract: '약정 할인·계약',
    etc: '기타',
  },
  timingOptions: {
    within1m: '1개월 내',
    m1to3: '1~3개월',
    m3to6: '3~6개월',
    undecided: '미정',
  },
};

function mergeLabels(provided) {
  if (!provided) return DEFAULT_LABELS;
  return {
    ...DEFAULT_LABELS,
    ...provided,
    interestOptions: { ...DEFAULT_LABELS.interestOptions, ...(provided.interestOptions || {}) },
    timingOptions: { ...DEFAULT_LABELS.timingOptions, ...(provided.timingOptions || {}) },
  };
}

// 칸 이름표 = 디자이너가 그린 1on1 「일정 추가」 창 값 그대로 (PW-1894 · one_on_one.css `.ono-add-modal-*`) — 14px 굵게 회색 ·
// 이름표 → 칸 12px. 칸 → 다음 칸 24px 은 흰 판 본문의 줄 사이(`Panel` · `.okr-h-body` gap 24)가 띄운다.
const FIELD_LABEL_STYLE = {
  display: 'block', fontFamily: 'var(--font-family-body)', fontWeight: 700,
  fontSize: 'var(--font-size-text-sm)', lineHeight: 'var(--line-height-text-sm)',
  color: 'var(--text-secondary)', marginBottom: 'var(--spacing-lg)',
};
const FIELD_ERROR_STYLE = {
  fontSize: 'var(--font-size-text-xs)', lineHeight: 'var(--line-height-text-xs)',
  color: 'var(--colors-text-textErrorPrimary)', marginTop: 'var(--spacing-xs)',
};

function Field({ label, required, error, children }) {
  return (
    <div>
      <label style={FIELD_LABEL_STYLE}>
        {label}{required && <span style={{ color: 'var(--colors-text-textErrorPrimary)' }}> *</span>}
      </label>
      {children}
      {error && <div style={FIELD_ERROR_STYLE}>{error}</div>}
    </div>
  );
}

// 입력칸 = 타임라인 «그룹 추가» 창 입력칸(timeline.css `.tl-emp-input` · 높이 40 · 옅은 회색 · 테두리 없음) — 청구 정보 화면과 같다
// (pivit-work PW-3132 · 시안 ㊽). 틀린 칸은 흰 바탕 + 빨간 테두리. 문의 내용 칸만 여러 줄이라 높이를 푼다.
const INPUT_ERROR_STYLE = { borderColor: 'var(--colors-error-200)', background: 'var(--bg-primary)' };
const inputStyle = (err) => (err ? INPUT_ERROR_STYLE : undefined);
const TEXTAREA_STYLE = { height: 'auto', minHeight: 96, resize: 'vertical' };

/** 머리 위 작은 글 «Pro · Enterprise» — 12px 브랜드 굵게(시안 ㊻ · designer.css `.eyebrow`). 제목과 사이 4. */
const EYEBROW_STYLE = {
  fontSize: 'var(--font-size-text-xs)',
  lineHeight: 'var(--line-height-text-xs)',
  fontWeight: 600,
  color: 'var(--text-brand-secondary)',
};
const HEAD_WRAP_STYLE = { display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)', minWidth: 0 };

/** 접수 완료 — 판 가운데 체크 원 + 안내 + [구독 현황으로]. 모양은 전과 같다(시안 ㊷ «그대로»). */
const DONE_STYLE = { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 'var(--spacing-sm)' };
const DONE_ICON_STYLE = {
  width: 56, height: 56, borderRadius: '50%',
  background: 'var(--utility-success-50)', color: 'var(--utility-success-600)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--spacing-md)',
};
const DONE_TITLE_STYLE = { fontSize: 'var(--font-size-text-lg)', lineHeight: 'var(--line-height-text-lg)', fontWeight: 700, color: 'var(--text-primary)' };
const DONE_TEXT_STYLE = { fontSize: 'var(--font-size-text-sm)', lineHeight: 'var(--line-height-text-sm)', color: 'var(--text-secondary)' };
const DONE_NOTE_STYLE = { ...DONE_TEXT_STYLE, color: 'var(--text-tertiary)' };

const SUBMIT_NOTE_STYLE = {
  textAlign: 'center',
  fontSize: 'var(--font-size-text-xs)',
  lineHeight: 'var(--line-height-text-xs)',
  color: 'var(--text-tertiary)',
  marginTop: 'var(--spacing-md)',
};

export default function BillingContactSalesCanvas({
  workspace = { name: '', seats: 0, contactName: '', contactEmail: '' },
  role = 'owner',
  labels: providedLabels,
  /**
   * 폼 위 견적 안내 — `'active'`(유효 견적 있음 · [플랜에서 결제하기]) / `'expired'`(가장 최근
   * 견적이 만료) / `null`. 어느 쪽이든 제출은 막지 않는다.
   */
  quoteNotice = null,
  /** [플랜에서 결제하기] — `quoteNotice === 'active'` 일 때만 쓴다. */
  onGoPlans,
  onSubmit,
  onBack,
  onDone,
  /** 메일 칸을 앱의 공용 메일 검사로 판정 — 받을 수 없는 주소면 안내 문구, 아니면 null (앱 PW-2413). */
  emailError,
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
      : (emailError?.(f.email.trim()) || (!emailOk(f.email) ? labels.errEmailFormat : '')),
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
    <BillingPage width={BILLING_PAGE_WIDTH.contact}>
      <div>
        <button type="button" onClick={onBack}
          style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: 'var(--font-size-text-sm)',
            cursor: 'pointer', padding: 0 }}>{labels.backToPlans}</button>
      </div>

      {state === 'success' ? (
        <Panel>
          <div style={DONE_STYLE}>
            <div style={DONE_ICON_STYLE}><CheckGlyph size={28} /></div>
            <div style={DONE_TITLE_STYLE}>{labels.successTitle}</div>
            <div style={DONE_TEXT_STYLE}>{labels.successDesc(f.email)}</div>
            <div style={DONE_NOTE_STYLE}>{labels.successNote}</div>
            <div style={{ ...DONE_TEXT_STYLE, marginBottom: 'var(--spacing-xl)' }}>{labels.successNextStep}</div>
            <Button variant="primary" onClick={onDone}>{labels.successCta}</Button>
          </div>
        </Panel>
      ) : (
        <>
          {/* 머리 — 제목 위 작은 브랜드 글 «Pro · Enterprise» (보라 딱지 대신 · 시안 ㊻) */}
          <div style={HEAD_WRAP_STYLE}>
            <div style={EYEBROW_STYLE}>{labels.planBadge}</div>
            <BillingPageHead title={labels.pageTitle} description={[labels.pageSubtitle]} />
          </div>

          {/* 견적 안내 (PW-344) — 유효 견적이면 결제로 가는 길, 만료면 그 사실. 제출은 막지 않는다. */}
          {quoteNotice === 'active' && (
            <BillingNotice
              tone="info"
              testId="billing-contact-quote-active"
              icon={<InfoGlyph size={16} />}
              title={labels.quoteActiveNotice}
              actions={onGoPlans && (
                <Button variant="primary" size="sm" onClick={onGoPlans}>{labels.quoteActiveCta}</Button>
              )}
            />
          )}
          {quoteNotice === 'expired' && (
            <BillingNotice
              tone="info"
              testId="billing-contact-quote-expired"
              icon={<InfoGlyph size={16} />}
              title={labels.quoteExpiredNotice}
            />
          )}

          {/* 워크스페이스 컨텍스트(자동) — 바탕 없는 한 줄 (시안 ㊼) */}
          <BillingInlineNote testId="billing-contact-workspace">
            {labels.wsContext(workspace.name, workspace.seats)}
          </BillingInlineNote>

          <Panel testId="billing-contact-form">
            <Field label={labels.contactNameLabel} required error={touched.contactName ? errors.contactName : ''}>
              <input className="tl-emp-input" style={inputStyle(touched.contactName && errors.contactName)} value={f.contactName}
                onChange={(e) => set('contactName', e.target.value)} onBlur={() => blur('contactName')} />
            </Field>
            <Field label={labels.emailLabel} required error={touched.email ? errors.email : ''}>
              <input className="tl-emp-input" style={inputStyle(touched.email && errors.email)} value={f.email}
                onChange={(e) => set('email', e.target.value)} onBlur={() => blur('email')}
                placeholder={labels.emailPlaceholder} />
            </Field>
            <Field label={labels.phoneLabel}>
              <input className="tl-emp-input" value={f.phone}
                onChange={(e) => set('phone', e.target.value)} placeholder={labels.phonePlaceholder} />
            </Field>
            <Field label={labels.expectedSeatsLabel} required error={touched.expectedSeats ? errors.expectedSeats : ''}>
              <input className="tl-emp-input" style={inputStyle(touched.expectedSeats && errors.expectedSeats)} value={f.expectedSeats}
                onChange={(e) => set('expectedSeats', e.target.value.replace(/[^\d]/g, ''))}
                onBlur={() => blur('expectedSeats')} inputMode="numeric" />
            </Field>

            <Field label={labels.interestsLabel}>
              {/* 여럿 고르는 칸 = 공용 체크박스. 줄 사이는 1on1 창 고르기 묶음 간격(12px) */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-lg)' }}>
                {INTEREST_IDS.map((id) => (
                  <Checkbox key={id} label={labels.interestOptions[id]}
                    checked={interests.includes(id)}
                    onChange={() => toggleInterest(id)} />
                ))}
              </div>
            </Field>

            <Field label={labels.timingLabel}>
              {/* 하나만 고르는 칸 = 공용 세그먼트 버튼 */}
              <SegmentedControl
                ariaLabel={labels.timingLabel}
                items={TIMING_OPTS.map((o) => ({ value: o.value, label: labels.timingOptions[o.id] }))}
                value={f.timing}
                onChange={(t) => set('timing', t)}
              />
            </Field>

            <Field label={labels.messageLabel}>
              <textarea className="tl-emp-input" style={TEXTAREA_STYLE}
                value={f.message} onChange={(e) => set('message', e.target.value)}
                placeholder={labels.messagePlaceholder} />
            </Field>

            {state === 'error' && (
              <BillingNotice tone="bad" testId="billing-contact-submit-error" icon={<AlertTriangleGlyph size={16} />} title={labels.submitError} />
            )}

            <div>
              {/* [문의 보내기] — 폭 전체 큰 주 버튼(시안 ㊿ «그대로 · 높이 48») */}
              <Button variant="primary" onClick={handleSubmit} disabled={state === 'submitting'}
                style={{ width: '100%', minHeight: 48, fontSize: 'var(--font-size-text-md)' }}>
                {state === 'submitting' ? labels.submitting : labels.submit}
              </Button>
              <div style={SUBMIT_NOTE_STYLE}>
                {labels.submitNote}
              </div>
            </div>
          </Panel>
        </>
      )}
    </BillingPage>
  );
}
