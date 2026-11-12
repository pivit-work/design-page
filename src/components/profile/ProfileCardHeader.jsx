import { useRef, useState } from 'react';
import ProfilePhoto from './ProfilePhoto.jsx';
import ProfilePhotoViewer from './ProfilePhotoViewer.jsx';
import { PROFILE_PHOTO_SIZE } from './constants.js';

/**
 * 프로필 창 왼쪽 머리 칸 (Figma 17873:33574) — 410 폭, 옆 20 · 아래 20.
 *
 *   사진 130(모서리 46 · 1px 검정 3% 테두리 · shadow-2xl) → 20 → [이름 24 · 직책 ∙ 소속 12] → 18 → 소개 → 18 → 근무 상태 알약
 *   → 20 → 통계 세 칸(24px 아이콘 · 이름표 · 값) → 27 → 버튼 둘
 *
 * 모든 칸은 props 로 받는다. 없는 칸은 자리도 남기지 않는다 — 매니저 창은 통계·알약 없이 AI 한 줄을 소개 자리에 둔다.
 *
 * @param {string} name
 * @param {string|null} [photo]  사진 주소. 없거나 못 불러오면 회색 실루엣 자리(ProfilePhotoPlaceholder)
 * @param {(name) => React.ReactNode} [renderPhoto]  사진 자리를 소비자가 통째로 그릴 때
 * @param {string} [photoLabel]  사진 버튼의 화면 읽기 이름(«사진 크게 보기»). 사진이 있으면 누를 수 있고, 누르면 가운데로 날아가 크게 보인다(Figma 17876:34463)
 * @param {string} [closeLabel]  큰 사진 창의 닫기 X 이름
 * @param {React.ReactNode} [title]  직책 ∙ 소속 한 줄
 * @param {React.ReactNode} [afterTitle]  직책 줄 아래 더 붙일 것(소속 목록 등)
 * @param {React.ReactNode} [note]  소개 한 줄
 * @param {string} [noteTone]  'ai' 면 보라색 AI 문구
 * @param {React.ReactNode} [badge]  근무 상태 알약(또는 알약 줄)
 * @param {React.ReactNode} [afterBadge]  알약 아래 더 붙일 것(현지 시간 줄 등)
 * @param {Array<{ key, icon, label, value, note? }>} [stats]  통계 칸들
 * @param {React.ReactNode} [afterStats]  통계 아래 펼칠 창(근무시간 조정 등)
 * @param {React.ReactNode} [actions]  버튼 줄 안에 놓을 버튼들
 * @param {string} [actionsClassName]
 */
export default function ProfileCardHeader({
  name,
  photo,
  renderPhoto,
  photoLabel = '사진 크게 보기',
  closeLabel = '닫기',
  title,
  afterTitle,
  note,
  noteTone,
  badge,
  afterBadge,
  stats,
  afterStats,
  actions,
  actionsClassName = '',
}) {
  // 큰 사진 창 — 작은 사진의 지금 화면 좌표를 재 주는 함수를 들고 연다(열 때 출발, 닫을 때 귀환). 날아가는 동안 작은 사진은 자리만 남기고 숨긴다.
  const photoRef = useRef(null);
  const [viewing, setViewing] = useState(false);
  const getOrigin = () => photoRef.current?.getBoundingClientRect() || null;
  const openViewer = () => { if (photoRef.current) setViewing(true); };
  const photoNode = <ProfilePhoto photo={photo} size={PROFILE_PHOTO_SIZE} className="profile-photo-img" />;
  return (
    <aside className="profile-head" data-testid="profile-head">
      {renderPhoto ? renderPhoto(name) : photo ? (
        <button
          type="button"
          ref={photoRef}
          className={`profile-photo profile-photo-btn ${viewing ? 'is-viewing' : ''}`.trim()}
          onClick={openViewer}
          aria-label={photoLabel}
          title={photoLabel}
          data-testid="profile-photo"
        >
          {photoNode}
        </button>
      ) : (
        <div className="profile-photo" data-testid="profile-photo" data-placeholder="true">
          {photoNode}
        </div>
      )}
      {viewing && (
        <ProfilePhotoViewer photo={photo} getOrigin={getOrigin} closeLabel={closeLabel} onClose={() => setViewing(false)} />
      )}
      <div className="profile-head-text">
        <div className="profile-name-block">
          <div className="profile-name">{name}</div>
          {title && <div className="profile-title">{title}</div>}
          {afterTitle}
        </div>
        {note && <div className={`profile-bio ${noteTone === 'ai' ? 'is-ai' : ''}`.trim()}>{note}</div>}
        {badge}
        {afterBadge}
      </div>
      {(stats?.length > 0 || actions) && (
        <div className="profile-head-body">
          {stats?.length > 0 && (
            <div className="profile-stats">
              {stats.map((s) => (
                <div key={s.key} className="profile-stat" data-testid={s.testId}>
                  <span className="profile-stat-icon">{s.icon}</span>
                  <div className="profile-stat-label">{s.label}</div>
                  {s.value}
                  {s.note && <div className="profile-stat-note" data-testid={s.noteTestId}>{s.note}</div>}
                </div>
              ))}
            </div>
          )}
          {afterStats}
          {actions && <div className={`profile-actions ${actionsClassName}`.trim()}>{actions}</div>}
        </div>
      )}
    </aside>
  );
}
