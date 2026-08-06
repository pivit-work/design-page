import { useState } from 'react';

/**
 * 평가 화면 공용 아바타 사진 레이어.
 *
 * 평가 캔버스들은 저마다 이니셜 타일(`Avatar`, `evs-leader-avatar`,
 * `evtcal-avatar`)을 갖고 있었고 **사진을 받을 자리가 아예 없었다.** 그래서
 * 조직도·직원 관리에는 프로필 사진이 나오는데 평가 화면만 전부 이니셜이었다.
 *
 * 이 컴포넌트는 원래의 이니셜 타일 위에 사진을 덮는 방식이라,
 * `photo` 가 없거나 로드에 실패하면 **기존 화면 그대로**로 떨어진다
 * (디자인이 바뀌는 건 사진이 실제로 있는 경우뿐).
 *
 * 사용법 — 이니셜을 그리던 요소를 `position: relative` 로 두고 안에 넣는다:
 *
 *   <span className="evs-leader-avatar" style={{ position: 'relative' }}>
 *     {initial}
 *     <AvatarPhoto photo={row.avatar} name={row.name} />
 *   </span>
 */
export default function AvatarPhoto({ photo, name }) {
  const [failed, setFailed] = useState(false);
  if (!photo || failed) return null;
  return (
    <img
      src={photo}
      alt={name || ''}
      onError={() => setFailed(true)}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        borderRadius: 'inherit',
        display: 'block',
      }}
    />
  );
}
