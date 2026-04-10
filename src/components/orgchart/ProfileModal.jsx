import { useState, useEffect, useRef } from 'react';
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

/* Preloaded Spline iframe — stays mounted so it's instant on re-open */
export default function ProfileModal({ member, onClose, statIcons, baseUrl = '', renderAvatar, adminMode = false, findSubordinates }) {
  const [splineReady, setSplineReady] = useState(false);
  const [splineActive, setSplineActive] = useState(false);
  const iframeRef = useRef(null);
  const scrollWrapRef = useRef(null);
  const prevMemberRef = useRef(null);

  // Listen for spline-ready message (scene + texture fully loaded)
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === 'spline-ready') setSplineReady(true);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  useEffect(() => {
    if (!member) setSplineActive(false);
    if (member) {
      prevMemberRef.current = member;
      if (scrollWrapRef.current) scrollWrapRef.current.scrollTop = 0;
    }
  }, [member]);

  // The member to use for rendering (keep last member visible during close animation)
  const displayMember = member || prevMemberRef.current;
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
              <iframe
                src={`${baseUrl}spline-profile.html?img=${encodeURIComponent(PROFILE_IMAGE)}`}
                sandbox="allow-scripts"
                frameBorder="0"
                width="100%"
                height="100%"
                title="Spline 3D"
                style={{ border: 'none', opacity: splineReady ? 1 : 0, transition: 'opacity 0.3s ease' }}
              />
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
                <Icon src="/icons-solid/send-03.svg" size={20} color="white" baseUrl={baseUrl} />
                피드백주기
              </button>
              <button className="modal-btn-meeting" disabled={isDisabled}>
                <Icon src="/icons-solid/calendar-heart-02.svg" size={20} color="#21a67a" baseUrl={baseUrl} />
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
