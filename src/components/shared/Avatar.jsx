import { useState } from 'react';
import { nameFontSize, nameInitials } from './nameInitials.js';

/**
 * 사람 원 — 사진이 있으면 사진, 없거나 못 불러오면 이름 글자 (PW-1014).
 *
 * 사람 사진·이니셜 원을 41개 파일이 따로 그렸다(평가용 `AvatarPhoto`, 어드민용 `AvatarFallback`,
 * 화면마다 `Avatar` 다섯 벌). 원 색·글자 수·사진 실패 처리가 화면마다 달라서, 같은 사람이
 * 평가 화면에서는 파란 그라데이션에 성 한 글자, 리소스 화면에서는 사진이 없으면 **빈 원**으로
 * 보였다. 이 부품 하나가 그 셋을 정한다.
 *
 *   <Avatar name="유경민" photo={row.avatar} size={32} />
 *   <Avatar name={m.name} photo={m.avatar} color={m.color} />   // 사람마다 색이 있는 화면
 *
 * - 원 안 글자는 `nameInitials` — 한글 이름은 이름 전체(4자까지), 영문은 두 글자.
 * - 사진을 못 불러오면(주소가 깨졌거나 권한이 없으면) 그 자리에서 글자로 바뀐다. 사진 주소가
 *   바뀌면 다시 시도한다.
 * - 바탕은 `color` 를 옅게 깐 원, 글자는 `color`. 색을 안 주면 브랜드 색.
 *
 * @param {string} [name] 원 안 글자를 뽑을 이름
 * @param {string|null} [photo] 사진 주소. 비었으면 글자
 * @param {number} [size=32] 지름(px)
 * @param {string} [color] 사람 색 — 글자색이 되고 바탕은 이 색을 옅게 깐다. CSS 변수도 된다
 * @param {string} [text] 원 안 글자를 직접 준다(서버가 정해 준 표시 글자가 있을 때)
 * @param {string} [alt] 화면 읽기 프로그램이 읽을 이름. 없으면 옆에 이름이 따로 적혀 있다고 보고 원을 숨긴다
 */
export default function Avatar({
  name,
  photo,
  size = 32,
  color,
  text,
  alt,
  className = '',
  style,
  ...rest
}) {
  const [failedSrc, setFailedSrc] = useState(null);
  const showPhoto = !!photo && failedSrc !== photo;
  const label = text ?? nameInitials(name);
  const a11y = alt ? { role: 'img', 'aria-label': alt } : { 'aria-hidden': true };
  return (
    <span
      className={['dp-avatar', className].filter(Boolean).join(' ')}
      data-photo={showPhoto ? 'true' : 'false'}
      style={{
        width: size,
        height: size,
        fontSize: nameFontSize(label, size),
        ...(color ? { '--dp-avatar-color': color } : null),
        ...style,
      }}
      {...a11y}
      {...rest}
    >
      {showPhoto ? (
        <img src={photo} alt="" onError={() => setFailedSrc(photo)} />
      ) : (
        label
      )}
    </span>
  );
}
