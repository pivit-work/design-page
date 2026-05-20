import { Component, useState, useEffect, useRef, useCallback } from 'react';
import Spline from '@splinetool/react-spline';
import Icon from '../shared/Icon.jsx';
import { MEMBER_STATUSES } from './constants.js';

const DEFAULT_PROFILE = {
  title: '사원',
  dept: '경영지원본부',
  bio: '열정적으로 업무에 임하고 있습니다.',
  skills: '경영전략 • 기획 • 매니징 • IR',
  contacts: '@woojin.kim\nmanager1@pivit.com',
  links: ['https://woojin.dev', 'https://github.com/woojin-kim'],
  teamMembers: [],
  employeeId: 'PVT-008',
  hireDate: '2026-05-02',
  phone: '010-1234-5678',
  employmentType: '정규직',
  rank: 'L3',
  workHours: '10-7',
};

const PROFILE_IMAGE = 'https://pivit-work.github.io/design-page/man.png';

const PROFILE_SCENE = 'https://prod.spline.design/lUTrZH2tVSyiKzPA/scene.splinecode';

/**
 * `<Spline>` 격리용 Error Boundary — manager ProfileModal·SplineHero 와 동일 패턴.
 * WebGL 컨텍스트 생성 실패 시 Spline 내부 throw 가 부모 트리를 통째로 언마운트하므로
 * boundary 로 격리해 헥사 영역만 비운다.
 */
class SplineBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFail?.(); }
  render() { return this.state.failed ? null : this.props.children; }
}

/**
 * Spline scene 의 'profileImage' 오브젝트 텍스처를 교체 — manager ProfileModal 과 동일 구현.
 */
function applyTexture(app, objectName, imageSrc) {
  return new Promise((resolve) => {
    const obj = app.findObjectByName(objectName);
    if (!obj) { resolve(); return; }
    const layers = obj.material?.layers;
    if (!layers) { resolve(); return; }
    const texLayer = [...Array(layers.length)]
      .map((_, i) => layers[i])
      .find((l) => l.type === 'texture');
    if (!texLayer) { resolve(); return; }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      try {
        texLayer.updateTexture(img);
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        c.getContext('2d').drawImage(img, 0, 0);
        texLayer.updateTexture(c.toDataURL('image/png'));
        const tex = texLayer.texture;
        tex.image = img;
        texLayer.texture = tex;
      } catch (e) { /* texture swap 실패 — baked 텍스처 유지 */ }
      resolve();
    };
    img.onerror = () => resolve();
  });
}

/**
 * 조직도 프로필 모달.
 *
 * Spline 은 `@splinetool/react-spline` 단일 공유 런타임으로 렌더한다 (manager
 * ProfileModal·SplineHero 와 동일). iframe 시절엔 `spline-profile.html` 을 src 로
 * 띄웠는데, nginx 의 `.html` rewrite 가 query string 을 날려 React index.html 로
 * fallback 되는 버그가 있었다 (dev 배포에서만 재현).
 */
export default function ProfileModal({ member, onClose, statIcons, baseUrl = '', renderAvatar, adminMode = false, findSubordinates }) {
  const [splineReady, setSplineReady] = useState(false);
  const [splineFailed, setSplineFailed] = useState(false);
  const [splineActive, setSplineActive] = useState(false);
  const scrollWrapRef = useRef(null);
  // 닫힘 애니메이션 중에도 마지막 멤버 콘텐츠가 계속 보이도록 state 로 유지.
  // "Adjusting state while rendering" 패턴으로 member prop 변화에 맞춰 갱신.
  const [displayMember, setDisplayMember] = useState(member);
  if (member && member !== displayMember) setDisplayMember(member);
  // 모달이 닫히면 spline 인터랙션 상태도 리셋.
  if (!member && splineActive) setSplineActive(false);

  // scene 로드 완료 → 텍스처 교체 → ready. PROFILE_IMAGE 가 고정이라 멤버가 바뀌어도
  // 재로드 불필요 — Spline 은 한 번만 마운트되어 모달 재오픈 시 즉시 표시된다.
  const handleSplineLoad = useCallback(async (app) => {
    await applyTexture(app, 'profileImage', PROFILE_IMAGE);
    await applyTexture(app, 'profileImage-2', PROFILE_IMAGE);
    setSplineReady(true);
  }, []);

  // 새 멤버로 열릴 때 스크롤 위치 초기화.
  useEffect(() => {
    if (member && scrollWrapRef.current) {
      scrollWrapRef.current.scrollTop = 0;
    }
  }, [member]);
  const profile = displayMember ? (displayMember.profile || DEFAULT_PROFILE) : DEFAULT_PROFILE;
  const isOpen = !!member;

  return (
    <>
    {/* Always-mounted overlay + modal — hidden via CSS when closed */}
    <div className="modal-overlay" onClick={onClose} style={{ display: isOpen ? '' : 'none' }} />
    <div className="modal-scroll-wrap" ref={scrollWrapRef} onClick={onClose} style={{ display: isOpen ? '' : 'none' }}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <button className="modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {renderAvatar ? renderAvatar(displayMember) : (
            <div
              className={`modal-spline-wrap ${splineActive ? 'spline-active' : ''}`}
              onClick={() => setSplineActive(true)}
              onMouseLeave={() => setSplineActive(false)}
            >
              {!splineFailed && (
                <div className={`modal-spline-stage ${splineReady ? 'is-ready' : ''}`}>
                  <SplineBoundary onFail={() => setSplineFailed(true)}>
                    <Spline scene={PROFILE_SCENE} onLoad={handleSplineLoad} />
                  </SplineBoundary>
                </div>
              )}
            </div>
          )}
          <div className="modal-name">{displayMember?.name}</div>
          <div className="modal-title">{profile.title} · {profile.dept}</div>
          <div className="modal-bio">{profile.bio}</div>
          <span className="modal-status-badge">{(MEMBER_STATUSES[displayMember?.status] || MEMBER_STATUSES.working).label}</span>
        </div>

        {/* Stats Row — Admin: 고용형태/직급/업무시간, Employee: 업무시간 only */}
        {statIcons && adminMode ? (
          <div className="modal-stats">
            <div className="modal-stat">
              <div className="modal-stat-icon modal-stat-employment">
                <img src={statIcons.employment} alt="고용형태" />
              </div>
              <div className="modal-stat-label">고용형태</div>
              <div className="modal-stat-value">{profile.employmentType || '정규직'}</div>
            </div>
            <div className="modal-stat">
              <div className="modal-stat-icon modal-stat-rank">
                <img src={statIcons.rank} alt="직급" />
              </div>
              <div className="modal-stat-label">직급</div>
              <div className="modal-stat-value">{profile.rank || 'L3'}</div>
            </div>
            <div className="modal-stat">
              <div className="modal-stat-icon modal-stat-workhours-admin">
                <img src={statIcons.workHoursAdmin} alt="업무시간" />
              </div>
              <div className="modal-stat-label">업무시간</div>
              <div className="modal-stat-value">{profile.workHours || '10-7'}</div>
            </div>
          </div>
        ) : statIcons ? (
          <div className="modal-stats">
            <div className="modal-stat">
              <div className="modal-stat-icon modal-stat-hours">
                <img src={statIcons.workHours} alt="업무시간" />
              </div>
              <div className="modal-stat-label">업무시간</div>
              <div className="modal-stat-value">{profile.workHours || '10-7'}</div>
            </div>
          </div>
        ) : null}

        {/* Action Buttons */}
        {(() => {
          const isDisabled = displayMember?.status === 'resigned' || displayMember?.status === 'leave';
          return (
            <div className={`modal-actions ${isDisabled ? 'modal-actions-disabled' : ''}`}>
              <button className="modal-btn-feedback" disabled={isDisabled}>
                <Icon src="/icons-solid/send-03.svg" size={20} baseUrl={baseUrl} />
                피드백주기
              </button>
              <button className="modal-btn-meeting" disabled={isDisabled}>
                <Icon src="/icons-solid/calendar-heart-02.svg" size={20} baseUrl={baseUrl} />
                미팅잡기
              </button>
            </div>
          );
        })()}

        {/* Admin-only: 사번/입사일/전화번호 */}
        {adminMode && (
          <div className="modal-info-sections">
            <div className="modal-info-section">
              <div className="modal-info-label">사번</div>
              <div className="modal-info-content">{profile.employeeId || 'PVT-008'}</div>
            </div>
            <div className="modal-info-section">
              <div className="modal-info-label">입사일</div>
              <div className="modal-info-content">{profile.hireDate || '2026-05-02'}</div>
            </div>
            <div className="modal-info-section">
              <div className="modal-info-label">전화번호</div>
              <div className="modal-info-content">{profile.phone || '010-1234-5678'}</div>
            </div>
          </div>
        )}

        {/* Info Sections */}
        <div className="modal-info-sections">
          <div className="modal-info-section">
            <div className="modal-info-label">스킬</div>
            <div className="modal-info-content">{profile.skills}</div>
          </div>
          <div className="modal-info-section">
            <div className="modal-info-label">연락처</div>
            <div className="modal-info-content">{profile.contacts}</div>
          </div>
          <div className="modal-info-section">
            <div className="modal-info-label">링크</div>
            <div className="modal-info-content">
              {profile.links.map((link, i) => (
                <a key={i} className="modal-info-link" href={link} target="_blank" rel="noopener noreferrer">
                  {link}
                  <Icon src="/icons/arrow-up-right.svg" size={14} color="var(--text-tertiary)" baseUrl={baseUrl} />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Team Members — dynamic from org tree or profile */}
        {(() => {
          const subs = findSubordinates ? findSubordinates(displayMember) : [];
          const teamList = subs.length > 0 ? subs : (profile.teamMembers || []);
          if (teamList.length === 0) return null;
          return (
            <div className="modal-team">
              <div className="modal-team-header">
                <span className="modal-team-title">직속팀원</span>
                <span className="modal-team-count">{teamList.length}명</span>
              </div>
              <div className="modal-team-grid">
                {teamList.map((tm, i) => (
                  <div key={i} className="modal-team-member">
                    <div className="modal-team-avatar-wrap">
                      <img src={tm.avatar} alt="" className="modal-team-avatar" />
                      <span className={`modal-team-dot ${tm.online ? 'online' : 'offline'}`} />
                    </div>
                    <div className="modal-team-name">{tm.name}</div>
                    <div className="modal-team-role">{tm.role || '사원'}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Footer */}
        <div className="modal-footer">
          <span className="modal-footer-text">Get Communication with</span>
          <img src={`${baseUrl}logo.svg`} alt="Pivit" className="modal-footer-logo" />
        </div>
      </div>
    </div>
    </>
  );
}

export { DEFAULT_PROFILE };
