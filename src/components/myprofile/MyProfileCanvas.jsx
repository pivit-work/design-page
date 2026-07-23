import { useState } from 'react';

/**
 * MyProfileCanvas — 내 프로필 페이지 정본 (읽기 전용 표출).
 *
 * pivit-specs `K. 내-설정/Public-Card/my-profile-view.jsx` 시안 + 정책
 * `screen-my-profile.policy.md` v1.0 을 design-page 토큰/프리미티브(admin-card,
 * admin-section-label, admin-notif-btn, msc-hero-*, msc-pairs, msc-comp-grid,
 * msc-amount)로 포팅한 것. 스타일은 settings.css(msc-*) + admin.css + myprofile.css(mp-*).
 *
 * 순수/controlled 컴포넌트 — 데이터는 전부 props, 사용자 액션은 on* 콜백으로 방출한다.
 * 편집·사진 업로드는 이 화면에서 처리하지 않고 내 설정(`/settings`)으로 위임한다
 * (onEdit / onEditPhoto). 보상 마스킹 토글만 세션 로컬 state 로 관리한다.
 *
 * 경로 `/me` — 항상 요청자 본인. 직속 팀원 목록·타인 카드는 설계상 제외.
 */

const DEFAULT_LABELS = {
  hero: {
    edit: '프로필 편집',
    uploadPhoto: '사진 업로드',
    changePhoto: '사진 변경',
    bioEmpty: '자기소개가 아직 없습니다. 내 설정에서 추가하세요.',
  },
  basic: {
    section: '기본 정보',
    email: '이메일',
    slack: '슬랙',
    location: '위치',
    workHours: '근무 시간',
    skills: '스킬',
    projects: '참여 프로젝트',
  },
  org: {
    section: '조직 · 인사 정보',
    managed: '어드민 관리 · 읽기 전용',
    employmentType: '고용 형태',
    joinDate: '입사일',
    position: '직급 / 직책',
    dept: '소속',
    manager: '현재 매니저',
  },
  comp: {
    section: '보상 정보',
    sensitive: '본인만 열람 · 민감',
    reveal: '보기',
    hide: '가리기',
    salaryTotal: '기본급 (연)',
    effectiveDate: '적용일',
    empty: '등록된 보상 정보가 없습니다.',
    ssot: '보상 데이터는 어드민(HR)이 관리하는 단일 출처이며, 이 화면은 표시·마스킹 전용입니다.',
  },
  dash: '—',
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

/* ── 값 정규화 ── */
function orDash(value, dash) {
  if (value == null) return dash;
  if (Array.isArray(value)) return value.length ? value.join(', ') : dash;
  const s = String(value).trim();
  return s === '' ? dash : s;
}

/* ── 보상 마스킹 ── */
const SALARY_MASK = '●●●,●●●,●●● 원';
function formatKRW(amount) {
  if (amount == null || amount === '') return '-';
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (Number.isNaN(n)) return '-';
  return `${n.toLocaleString('ko-KR')} 원`;
}

function Card({ children, className = '', testId }) {
  return (
    <div className={`admin-card msc-card ${className}`.trim()} data-testid={testId}>
      {children}
    </div>
  );
}

function Pair({ label, value, dash, testId }) {
  return (
    <div>
      <div className="msc-pair-label">{label}</div>
      <div className="msc-pair-value" data-testid={testId}>{orDash(value, dash)}</div>
    </div>
  );
}

/* ── 히어로 아바타: 사진 있으면 이미지(로드 실패 시 이니셜 폴백), 없으면 이니셜 ── */
function HeroAvatar({ photoUrl, initial, color }) {
  const [imgError, setImgError] = useState(false);
  const showImg = Boolean(photoUrl) && !imgError;
  const style = showImg
    ? undefined
    : { background: `${color || '#4F6AF5'}1f`, color: color || '#4F6AF5' };
  return (
    <div className="msc-hero-avatar mp-hero-avatar" style={style} data-testid="myprofile-hero-avatar">
      {showImg ? (
        <img src={photoUrl} alt="" onError={() => setImgError(true)} />
      ) : (
        initial
      )}
    </div>
  );
}

export default function MyProfileCanvas({
  me = {},
  org = null,
  compensation = null,
  isAdmin = false,
  onEdit,
  onEditPhoto,
  labels: providedLabels,
  // baseUrl 은 향후 아이콘/에셋 경로 스레딩용 (현재 인라인 SVG 미사용).
  baseUrl = '/',
}) {
  const L = merge(DEFAULT_LABELS, providedLabels);
  const [revealComp, setRevealComp] = useState(false);

  const dash = L.dash;
  const cur = org || {};
  const manager = cur.manager
    ? `${cur.manager.name}${cur.manager.title ? ` (${cur.manager.title})` : ''}`
    : dash;
  const position =
    orDash([cur.level, cur.title || cur.position].filter(Boolean).join(' / ') || null, dash);

  const comp = compensation && compensation.current ? compensation.current : null;
  const compRevealed = isAdmin || revealComp;

  const hasPhoto = Boolean(me.avatarUrl);
  const heroMeta = [me.title, cur.dept ?? me.dept].filter(Boolean).join(' · ');

  return (
    <div className="mp-page" data-baseurl={baseUrl} data-testid="my-profile-canvas">
      {/* ── 히어로 ── */}
      <Card testId="myprofile-hero-card">
        <div className="msc-hero">
          <HeroAvatar photoUrl={me.avatarUrl} initial={me.initial} color={me.color} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="msc-hero-name" data-testid="myprofile-name">{me.name}</div>
            {me.displayName && (
              <div className="msc-hero-sub" data-testid="myprofile-display-name">{me.displayName}</div>
            )}
            {heroMeta && <div className="msc-hero-meta" data-testid="myprofile-hero-meta">{heroMeta}</div>}
          </div>
          <div className="mp-hero-actions">
            {onEditPhoto && (
              <button
                type="button"
                className="admin-notif-btn is-soft is-sm"
                onClick={onEditPhoto}
                data-testid="myprofile-photo-btn"
              >
                {hasPhoto ? L.hero.changePhoto : L.hero.uploadPhoto}
              </button>
            )}
            {onEdit && (
              <button
                type="button"
                className="admin-notif-btn is-soft is-sm"
                onClick={onEdit}
                title={L.hero.edit}
                data-testid="myprofile-edit-btn"
              >
                {L.hero.edit}
              </button>
            )}
          </div>
        </div>
        <p
          className={`msc-hero-bio${me.bio ? '' : ' mp-bio-empty'}`}
          data-testid="myprofile-bio"
        >
          {me.bio || L.hero.bioEmpty}
        </p>
      </Card>

      {/* ── 기본 정보 ── */}
      <Card testId="myprofile-basic-card">
        <div className="admin-section-label">{L.basic.section}</div>
        <div className="msc-pairs">
          <Pair label={L.basic.email} value={me.email} dash={dash} testId="myprofile-basic-email" />
          <Pair label={L.basic.slack} value={me.slack} dash={dash} testId="myprofile-basic-slack" />
          <Pair label={L.basic.location} value={me.location} dash={dash} testId="myprofile-basic-location" />
          <Pair label={L.basic.workHours} value={me.workHours} dash={dash} testId="myprofile-basic-workhours" />
          <Pair label={L.basic.skills} value={me.skills} dash={dash} testId="myprofile-basic-skills" />
          <Pair label={L.basic.projects} value={me.projects} dash={dash} testId="myprofile-basic-projects" />
        </div>
      </Card>

      {/* ── 조직 · 인사 정보 (어드민 관리 · 읽기 전용) ── */}
      <Card testId="myprofile-org-card">
        <div className="admin-section-label">
          {L.org.section} <span className="mp-section-sub">({L.org.managed})</span>
        </div>
        <div className="msc-pairs">
          <Pair label={L.org.employmentType} value={cur.employmentType} dash={dash} testId="myprofile-org-employment" />
          <Pair label={L.org.joinDate} value={cur.joinDate} dash={dash} testId="myprofile-org-joindate" />
          <Pair label={L.org.position} value={position} dash={dash} testId="myprofile-org-position" />
          <Pair label={L.org.dept} value={cur.dept ?? me.dept} dash={dash} testId="myprofile-org-dept" />
          <Pair label={L.org.manager} value={manager} dash={dash} testId="myprofile-org-manager" />
        </div>
      </Card>

      {/* ── 보상 정보 (본인만 · 마스킹) ── */}
      <Card testId="myprofile-comp-card">
        <div className="mp-section-head">
          <div className="admin-section-label" style={{ flex: 1, marginBottom: 0 }}>
            {L.comp.section} <span className="mp-section-sub">({L.comp.sensitive})</span>
          </div>
          {comp && !isAdmin && (
            <button
              type="button"
              className={`admin-notif-btn is-sm ${revealComp ? 'is-primary' : 'is-soft'}`}
              onClick={() => setRevealComp((v) => !v)}
              data-testid="myprofile-comp-reveal"
            >
              {revealComp ? L.comp.hide : L.comp.reveal}
            </button>
          )}
        </div>
        {comp ? (
          <>
            <div className="msc-comp-grid">
              <div>
                <div className="msc-pair-label">{L.comp.salaryTotal}</div>
                <span
                  className={`msc-amount${compRevealed ? '' : ' is-masked'}`}
                  data-testid="myprofile-comp-amount"
                >
                  {compRevealed ? formatKRW(comp.amount) : SALARY_MASK}
                </span>
              </div>
              <div>
                <div className="msc-pair-label">{L.comp.effectiveDate}</div>
                <div className="msc-pair-value" data-testid="myprofile-comp-effective">
                  {comp.effectiveDate || '-'}
                </div>
              </div>
            </div>
            <p className="mp-comp-note">{L.comp.ssot}</p>
          </>
        ) : (
          <div className="msc-empty-state" data-testid="myprofile-comp-empty">{L.comp.empty}</div>
        )}
      </Card>
    </div>
  );
}
