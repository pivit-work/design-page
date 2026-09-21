import { Component, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Spline from '@splinetool/react-spline';
import Icon from '../shared/Icon.jsx';
import { MEMBER_STATUSES } from './constants.js';
import assetUrl from '../shared/assetUrl.js';
import { useOrgLabels, makeOrgLabels } from './orgchart-labels.jsx';

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

const PROFILE_SCENE = 'https://prod.spline.design/zcv5m26Zb2Qxpqcc/scene.splinecode';

/**
 * `<Spline>` 격리용 Error Boundary — manager ProfileModal 과 동일 패턴.
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
 * ProfileModal 과 동일). iframe 시절엔 `spline-profile.html` 을 src 로
 * 띄웠는데, nginx 의 `.html` rewrite 가 query string 을 날려 React index.html 로
 * fallback 되는 버그가 있었다 (dev 배포에서만 재현).
 */
// onFeedbackClick / onMeetingClick — 액션 버튼(피드백주기·미팅잡기) 콜백.
// 미지정이면 지금까지처럼 아무 동작도 하지 않는다(시각·레이아웃 변화 없음).
// isSelf — 본인 카드. 나에게 피드백을 주거나 나와 미팅을 잡을 수는 없으므로
// 퇴사·휴직과 같은 비활성 표시를 재사용한다(PW-28).
// resolvePhoto — 구성원 사진을 3D 아바타에 입힐 때 쓴다. `(member) => url | null | Promise<url | null>`.
// 미지정이면 지금까지처럼 기본 사진(PROFILE_IMAGE)을 입힌다. 사진을 못 구하면(null·실패) 기본 사진.
// 새 멤버로 열리면 그 사람 사진이 입혀질 때까지 무대를 숨겨 앞사람 얼굴이 비치지 않게 한다.
export default function ProfileModal({ member, onClose, statIcons, baseUrl = '', renderAvatar, resolvePhoto, adminMode = false, findSubordinates, showSubordinates = true, subordinatesTitle, directReportChipLabel, onFeedbackClick, onMeetingClick, isSelf = false, labels }) {
  // 화면 문구 — 조직도 캔버스 안에서 열리면 캔버스가 받은 번역을 쓰고, 캔버스 밖(소비자가
  // 따로 띄우는 카드)에서는 `labels` 로 받는다(PW-705). 둘 다 없으면 한국어 기본값.
  // `subordinatesTitle`·`directReportChipLabel`(PW-546)은 주면 그것이 이긴다.
  const ctxL = useOrgLabels();
  const ownL = useMemo(() => (labels ? makeOrgLabels(labels) : null), [labels]);
  const L = ownL || ctxL;
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

  // scene 로드 완료 → 텍스처 교체 → ready. Spline 은 한 번만 마운트되어 모달 재오픈 시
  // 즉시 표시된다 — 멤버가 바뀌면 씬은 그대로 두고 텍스처만 갈아 끼운다.
  const splineAppRef = useRef(null);
  const [sceneLoaded, setSceneLoaded] = useState(false);
  // 사진이 입혀진 멤버. resolvePhoto 를 쓸 때는 이 값이 지금 멤버와 같아야 무대를 보인다.
  const [texturedFor, setTexturedFor] = useState(null);
  const handleSplineLoad = useCallback(async (app) => {
    splineAppRef.current = app;
    await applyTexture(app, 'profileImage', PROFILE_IMAGE);
    await applyTexture(app, 'profileImage-2', PROFILE_IMAGE);
    setSceneLoaded(true);
    setSplineReady(true);
  }, []);

  useEffect(() => {
    const app = splineAppRef.current;
    if (!resolvePhoto || !member || !sceneLoaded || !app) return undefined;
    let cancelled = false;
    Promise.resolve()
      .then(() => resolvePhoto(member))
      .catch(() => null)
      .then(async (src) => {
        if (cancelled) return;
        await applyTexture(app, 'profileImage', src || PROFILE_IMAGE);
        await applyTexture(app, 'profileImage-2', src || PROFILE_IMAGE);
        if (!cancelled) setTexturedFor(member);
      });
    return () => { cancelled = true; };
  }, [resolvePhoto, member, sceneLoaded]);

  const stageReady = splineReady && (!resolvePhoto || texturedFor === displayMember);

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
                <div className={`modal-spline-stage ${stageReady ? 'is-ready' : ''}`}>
                  <SplineBoundary onFail={() => setSplineFailed(true)}>
                    <Spline scene={PROFILE_SCENE} onLoad={handleSplineLoad} />
                  </SplineBoundary>
                </div>
              )}
            </div>
          )}
          <div className="modal-name">{displayMember?.name}</div>
          {/* 둘 중 하나가 비어도 ' · ' 만 남지 않게 조립한다 — 직급·직책이 없거나
              비공개인 사람의 카드에서 구분자가 매달려 보였다. */}
          <div className="modal-title">{[profile.title, profile.dept].filter(Boolean).join(' · ')}</div>
          <div className="modal-bio">{profile.bio}</div>
          <span className="modal-status-badge">{L(`member.status.${MEMBER_STATUSES[displayMember?.status] ? displayMember.status : 'working'}`)}</span>
        </div>

        {/* Stats Row — Admin: 고용형태/직급/업무시간, Employee: 업무시간 only */}
        {statIcons && adminMode ? (
          <div className="modal-stats">
            <div className="modal-stat">
              <div className="modal-stat-icon modal-stat-employment">
                <img src={statIcons.employment} alt={L('profile.employmentType')} />
              </div>
              <div className="modal-stat-label">{L('profile.employmentType')}</div>
              <div className="modal-stat-value">{profile.employmentType || L('profile.employmentTypeDefault')}</div>
            </div>
            <div className="modal-stat">
              <div className="modal-stat-icon modal-stat-rank">
                <img src={statIcons.rank} alt={L('profile.rank')} />
              </div>
              <div className="modal-stat-label">{L('profile.rank')}</div>
              <div className="modal-stat-value">{profile.rank || 'L3'}</div>
            </div>
            <div className="modal-stat">
              <div className="modal-stat-icon modal-stat-workhours-admin">
                <img src={statIcons.workHoursAdmin} alt={L('profile.workHours')} />
              </div>
              <div className="modal-stat-label">{L('profile.workHours')}</div>
              <div className="modal-stat-value">{profile.workHours || '10-7'}</div>
            </div>
          </div>
        ) : statIcons ? (
          <div className="modal-stats">
            <div className="modal-stat">
              <div className="modal-stat-icon modal-stat-hours">
                <img src={statIcons.workHours} alt={L('profile.workHours')} />
              </div>
              <div className="modal-stat-label">{L('profile.workHours')}</div>
              <div className="modal-stat-value">{profile.workHours || '10-7'}</div>
            </div>
          </div>
        ) : null}

        {/* Action Buttons */}
        {(() => {
          const isDisabled =
            isSelf ||
            displayMember?.status === 'resigned' ||
            displayMember?.status === 'leave';
          return (
            <div className={`modal-actions ${isDisabled ? 'modal-actions-disabled' : ''}`}>
              <button
                className="modal-btn-feedback"
                disabled={isDisabled}
                onClick={onFeedbackClick ? () => onFeedbackClick(displayMember) : undefined}
              >
                <Icon src="/icons-solid/send-03.svg" size={20} baseUrl={baseUrl} />
                {L('profile.feedback')}
              </button>
              <button
                className="modal-btn-meeting"
                disabled={isDisabled}
                onClick={onMeetingClick ? () => onMeetingClick(displayMember) : undefined}
              >
                <Icon src="/icons-solid/calendar-heart-02.svg" size={20} baseUrl={baseUrl} />
                {L('profile.meeting')}
              </button>
            </div>
          );
        })()}

        {/* Admin-only: 사번/입사일/전화번호 */}
        {adminMode && (
          <div className="modal-info-sections">
            <div className="modal-info-section">
              <div className="modal-info-label">{L('profile.employeeNo')}</div>
              <div className="modal-info-content">{profile.employeeId || 'PVT-008'}</div>
            </div>
            <div className="modal-info-section">
              <div className="modal-info-label">{L('profile.joinedAt')}</div>
              <div className="modal-info-content">{profile.hireDate || '2026-05-02'}</div>
            </div>
            <div className="modal-info-section">
              <div className="modal-info-label">{L('profile.phone')}</div>
              <div className="modal-info-content">{profile.phone || '010-1234-5678'}</div>
            </div>
          </div>
        )}

        {/* Info Sections */}
        <div className="modal-info-sections">
          <div className="modal-info-section">
            <div className="modal-info-label">{L('profile.skills')}</div>
            <div className="modal-info-content">{profile.skills}</div>
          </div>
          <div className="modal-info-section">
            <div className="modal-info-label">{L('profile.contact')}</div>
            <div className="modal-info-content">{profile.contacts}</div>
          </div>
          <div className="modal-info-section">
            <div className="modal-info-label">{L('profile.links')}</div>
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

        {/* Team Members — dynamic from org tree or profile.
            showSubordinates=false 면(조직 계층 맥락이 아닌 곳, 예: 어드민 개요) 섹션 숨김. */}
        {showSubordinates && (() => {
          const subs = findSubordinates ? findSubordinates(displayMember) : [];
          const teamList = subs.length > 0 ? subs : (profile.teamMembers || []);
          if (teamList.length === 0) return null;
          return (
            <div className="modal-team">
              <div className="modal-team-header">
                {/* 제목은 소비자가 로케일로 준다 — 조직 없이 바로 보고하는 사람(COS·비서)도 섞이므로
                    「팀원」이 맞지 않는 곳이 있다(pivit-specs spec-org-hierarchy-exceptions.md §5 F9). */}
                <span className="modal-team-title">{subordinatesTitle || L('profile.directReports')}</span>
                <span className="modal-team-count">{L('profile.peopleCount', { count: teamList.length })}</span>
              </div>
              <div className="modal-team-grid">
                {teamList.map((tm, i) => (
                  <div key={i} className="modal-team-member">
                    <div className="modal-team-avatar-wrap">
                      <img src={tm.avatar} alt="" className="modal-team-avatar" />
                      <span className={`modal-team-dot ${tm.online ? 'online' : 'offline'}`} />
                    </div>
                    <div className="modal-team-name">{tm.name}</div>
                    {/* 조직 단위 없이 바로 보고하는 사람(직속 칸)에만 붙는다 — 조직 소속과 가른다. */}
                    {tm.isDirectReport && <span className="modal-team-chip">{directReportChipLabel || L('profile.directReportChip')}</span>}
                    <div className="modal-team-role">{tm.role || L('profile.roleDefault')}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Footer */}
        <div className="modal-footer">
          <span className="modal-footer-text">Get Communication with</span>
          <img src={assetUrl(baseUrl, 'logo.svg')} alt="Pivit" className="modal-footer-logo" />
        </div>
      </div>
    </div>
    </>
  );
}

export { DEFAULT_PROFILE };
