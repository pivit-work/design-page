import { useState } from 'react';
import ProfilePhotoPlaceholder from './ProfilePhotoPlaceholder.jsx';

/**
 * 사람 사진 한 장 — 주소가 없거나 못 불러오면(404·만료) 디자이너의 실루엣 자리(ProfilePhotoPlaceholder)가 선다.
 * 프로필 창 머리(130)와 매니저 대시보드 카드(130)가 같이 쓴다. 틀(모서리·테두리·그림자)은 감싸는 쪽이 그린다.
 *
 * @param {string|null} [photo] 사진 주소
 * @param {number} [size=130]
 * @param {string} [className] img 와 실루엣 svg 에 같이 붙는 클래스
 */
export default function ProfilePhoto({ photo, size = 130, className = '' }) {
  // 못 불러온 주소 — 그 주소인 동안만 실루엣 자리를 보이고, 주소가 바뀌면 다시 시도한다.
  const [failedSrc, setFailedSrc] = useState(null);
  const showPhoto = !!photo && failedSrc !== photo;
  if (!showPhoto) return <ProfilePhotoPlaceholder size={size} className={className} />;
  return <img className={className} src={photo} alt="" draggable={false} onError={() => setFailedSrc(photo)} />;
}
