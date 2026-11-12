/**
 * 사진이 없는 사람의 머리 자리 — 디자이너의 «user placeholder image» (Figma 17876:34266 · 130×130).
 *
 * 시안 SVG 의 모양(머리 원 + 어깨 곡면 Union 패스)을 그대로 쓰고, 색만 토큰으로 바꿨다
 * (시안 #F3F4F6 = fg-quaternary_hover 바탕 · #D2D6DB = border-primary 실루엣). 어두운 화면에서도 같은 뜻의 색이 된다.
 */
export default function ProfilePhotoPlaceholder({ size = 130, className = '' }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 130 130"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="130" height="130" fill="var(--colors-foreground-fgQuaternaryHover)" />
      <path
        d="M64.7617 87.4766C92.2443 87.4766 114.523 109.756 114.523 137.238C114.523 164.721 92.2443 187 64.7617 187C37.2791 187 15 164.721 15 137.238C15 109.756 37.2791 87.4766 64.7617 87.4766ZM64.7617 30C79.6748 30 91.7646 42.0899 91.7646 57.0029C91.7644 71.9158 79.6746 84.0049 64.7617 84.0049C49.8488 84.0049 37.759 71.9158 37.7588 57.0029C37.7588 42.0899 49.8487 30 64.7617 30Z"
        fill="var(--border-primary)"
      />
    </svg>
  );
}
