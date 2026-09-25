/**
 * 두 곳 이상에서 쓰는 선 아이콘 — **그림은 여기에 한 벌만 둔다** (PW-1011).
 *
 * ## 왜
 *
 * 화면마다 아이콘을 코드에 직접 그리다 보니 같은 그림이 여러 파일에 복사돼 있었다
 * (2026-09-25 에 재 보니 design-page 와 pivit-work 를 합쳐 45가지 그림이 155곳). 닫기(X)
 * 하나가 22곳이었고, 자물쇠는 뜻이 같은데 모양이 다섯 가지였다. 한 곳을 고쳐도 복사본은 그대로
 * 남아 화면마다 조금씩 갈라진다.
 *
 * ## 규약
 *
 * - `viewBox 0 0 24 24` · `fill none` · `stroke currentColor` · 둥근 끝/모서리 · `aria-hidden`.
 *   (칠한 그림·다른 틀을 쓰는 몇 개는 정의에서 따로 적는다.)
 * - 크기는 `size`, 선 두께는 `strokeWidth`(기본 2), 색은 **감싸는 요소의 `color`** 를 따른다.
 *   그 자리에서 색을 정해야 하면 `color` 를 준다 — svg 의 `color` 로 들어가 `currentColor` 가 그 값을 읽는다.
 * - `className`·`style`·`data-*` 같은 나머지 속성은 svg 에 그대로 붙는다.
 * - 원래 16·20칸 틀에 그렸던 자리는 그림을 24칸 틀로 옮기고 **선 두께만 틀 비율만큼 곱해** 같은 모양을
 *   낸다(16칸에서 1.5 → 24칸에서 2.25).
 *
 * 🔴 **같은 그림을 다른 파일에 또 그리지 않는다.** 두 번째 자리가 생기면 여기로 옮긴다 —
 * `scripts/check-icon-copies.mjs` 가 막는다(pre-push · publish, pivit-work 도 같은 검사를 돈다).
 */
import { useId } from 'react';

function LineSvg({
  size = 16,
  width,
  height,
  strokeWidth = 2,
  color,
  style,
  viewBox = '0 0 24 24',
  children,
  ...rest
}) {
  return (
    <svg
      width={width ?? size}
      height={height ?? size}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={color ? { color, ...style } : style}
      {...rest}
    >
      {children}
    </svg>
  );
}

/** 칠한 그림 — 선이 없다. */
function SolidSvg({ size = 16, color, style, viewBox = '0 0 24 24', children, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="currentColor"
      aria-hidden="true"
      style={color ? { color, ...style } : style}
      {...rest}
    >
      {children}
    </svg>
  );
}

/* ── 닫기 · 더하기 · 체크 ─────────────────────────────── */

/** 닫기 — ×. 창·칩·알림 띠를 닫는 자리. */
export function CloseGlyph(props) {
  return (
    <LineSvg {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </LineSvg>
  );
}

/** 더하기. */
export function PlusGlyph(props) {
  return (
    <LineSvg {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </LineSvg>
  );
}

/** 체크 — 고른 항목 · 끝난 단계. */
export function CheckGlyph(props) {
  return (
    <LineSvg {...props}>
      <path d="m20 6-11 11-5-5" />
    </LineSvg>
  );
}

/** 원 안 체크(선). */
export function CheckCircleGlyph(props) {
  return (
    <LineSvg {...props}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </LineSvg>
  );
}

/** 원 안 체크(칠한 것) — 14칸 틀에 그린 그림이다. */
export function CheckCircleSolidGlyph(props) {
  return (
    <SolidSvg viewBox="0 0 14 14" {...props}>
      <path d="M7 0a7 7 0 1 0 7 7A7 7 0 0 0 7 0zm3.3 5.7-4 4a1 1 0 0 1-1.4 0l-2-2a1 1 0 1 1 1.4-1.4L5.6 7.6l3.3-3.3a1 1 0 0 1 1.4 1.4z" />
    </SolidSvg>
  );
}

/* ── 꺾쇠 · 화살표 ────────────────────────────────────── */

export function ChevronDownGlyph(props) {
  return (
    <LineSvg {...props}>
      <path d="m6 9 6 6 6-6" />
    </LineSvg>
  );
}

export function ChevronUpGlyph(props) {
  return (
    <LineSvg {...props}>
      <polyline points="6 15 12 9 18 15" />
    </LineSvg>
  );
}

export function ChevronLeftGlyph(props) {
  return (
    <LineSvg {...props}>
      <polyline points="15 18 9 12 15 6" />
    </LineSvg>
  );
}

export function ChevronRightGlyph(props) {
  return (
    <LineSvg {...props}>
      <polyline points="9 18 15 12 9 6" />
    </LineSvg>
  );
}

export function ArrowRightGlyph(props) {
  return (
    <LineSvg {...props}>
      <line x1="4" y1="12" x2="19" y2="12" />
      <polyline points="13 6 19 12 13 18" />
    </LineSvg>
  );
}

export function ArrowLeftGlyph(props) {
  return (
    <LineSvg {...props}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="11 18 5 12 11 6" />
    </LineSvg>
  );
}

/* ── 알림 · 안내 ─────────────────────────────────────── */

/** 경고 — 느낌표 삼각형. */
export function AlertTriangleGlyph(props) {
  return (
    <LineSvg {...props}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </LineSvg>
  );
}

/** 안내 — 원 안 i. */
export function InfoGlyph(props) {
  return (
    <LineSvg {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </LineSvg>
  );
}

/** 시계. */
export function ClockGlyph(props) {
  return (
    <LineSvg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </LineSvg>
  );
}

/* ── 자물쇠 · 눈 · 돋보기 ─────────────────────────────── */

/**
 * 자물쇠(선). 평가·내 설정·온보딩·조직도·어드민 항목 설정·결제 잠금이 이 한 벌을 쓴다.
 * 모양이 다섯 가지였던 것을 가장 많이 쓰던 이 모양으로 맞췄다(PW-1011).
 */
export function LockGlyph(props) {
  return (
    <LineSvg {...props}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </LineSvg>
  );
}

/** 자물쇠(칠한 네모) — 어드민 메뉴의 `icons-solid/lock-keyhole-square.svg` 와 같은 그림. */
export function LockKeyholeSquareGlyph(props) {
  return (
    <SolidSvg {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M17.8385 2H6.16146C5.63433 1.99998 5.17954 1.99997 4.80497 2.03057C4.40963 2.06287 4.01641 2.13419 3.63803 2.32698C3.07354 2.6146 2.6146 3.07354 2.32698 3.63803C2.13419 4.01641 2.06287 4.40963 2.03057 4.80497C1.99997 5.17954 1.99998 5.63429 2 6.16142V17.8385C1.99998 18.3657 1.99997 18.8205 2.03057 19.195C2.06287 19.5904 2.13419 19.9836 2.32698 20.362C2.6146 20.9265 3.07354 21.3854 3.63803 21.673C4.01641 21.8658 4.40963 21.9371 4.80497 21.9694C5.17954 22 5.6343 22 6.16144 22H17.8386C18.3657 22 18.8205 22 19.195 21.9694C19.5904 21.9371 19.9836 21.8658 20.362 21.673C20.9265 21.3854 21.3854 20.9265 21.673 20.362C21.8658 19.9836 21.9371 19.5904 21.9694 19.195C22 18.8205 22 18.3657 22 17.8386V6.16144C22 5.6343 22 5.17954 21.9694 4.80497C21.9371 4.40963 21.8658 4.01641 21.673 3.63803C21.3854 3.07354 20.9265 2.6146 20.362 2.32698C19.9836 2.13419 19.5904 2.06287 19.195 2.03057C18.8205 1.99997 18.3657 1.99998 17.8385 2ZM13.7316 13.1947L14.649 15.947C14.7675 16.3025 14.8268 16.4803 14.7912 16.6218C14.7601 16.7456 14.6828 16.8529 14.5752 16.9216C14.4522 17 14.2648 17 13.8901 17H10.1099C9.7352 17 9.54783 17 9.42484 16.9216C9.31718 16.8529 9.23987 16.7456 9.20877 16.6218C9.17324 16.4803 9.23249 16.3025 9.351 15.947L10.2684 13.1947C10.339 12.9831 10.3743 12.8772 10.3724 12.7907C10.3705 12.6996 10.3583 12.6519 10.3164 12.5711C10.2765 12.4942 10.17 12.395 9.95681 12.1967C9.36819 11.649 9 10.8675 9 10C9 8.34315 10.3431 7 12 7C13.6569 7 15 8.34315 15 10C15 10.8675 14.6318 11.649 14.0432 12.1967C13.83 12.395 13.7235 12.4942 13.6836 12.5711C13.6417 12.6519 13.6295 12.6996 13.6276 12.7907C13.6257 12.8772 13.661 12.9831 13.7316 13.1947Z"
      />
    </SolidSvg>
  );
}

/** 눈 — 미리 보기. */
export function EyeGlyph(props) {
  return (
    <LineSvg {...props}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </LineSvg>
  );
}

/** 돋보기 — 검색. */
export function SearchGlyph(props) {
  return (
    <LineSvg {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </LineSvg>
  );
}

/* ── 사람 · 문서 · 그 밖 ─────────────────────────────── */

export function UserGlyph(props) {
  return (
    <LineSvg {...props}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </LineSvg>
  );
}

export function UsersGlyph(props) {
  return (
    <LineSvg {...props}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </LineSvg>
  );
}

/** 연필 — 고치기. */
export function PencilGlyph(props) {
  return (
    <LineSvg {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </LineSvg>
  );
}

/** 문서 — 줄 두 개. */
export function FileTextGlyph(props) {
  return (
    <LineSvg {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
    </LineSvg>
  );
}

export function FolderGlyph(props) {
  return (
    <LineSvg {...props}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </LineSvg>
  );
}

/** 말풍선. */
export function ChatGlyph(props) {
  return (
    <LineSvg {...props}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </LineSvg>
  );
}

/** 봉투 — 메일. */
export function MailGlyph(props) {
  return (
    <LineSvg {...props}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polyline points="22 7 12 13 2 7" />
    </LineSvg>
  );
}

/** 달력. */
export function CalendarGlyph(props) {
  return (
    <LineSvg {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </LineSvg>
  );
}

/** 올리기 — 트레이 + 위 화살. */
export function UploadGlyph(props) {
  return (
    <LineSvg {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </LineSvg>
  );
}

/** 내려받기 — 트레이 + 아래 화살. */
export function DownloadGlyph(props) {
  return (
    <LineSvg {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </LineSvg>
  );
}

/** 톱니바퀴 — 설정. */
export function SettingsGlyph(props) {
  return (
    <LineSvg {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </LineSvg>
  );
}

/** 왕관 — 조직장. */
export function CrownGlyph(props) {
  return (
    <LineSvg {...props}>
      <path d="M3 7l4.5 4L12 4l4.5 7L21 7l-1.8 11H4.8L3 7Z" />
    </LineSvg>
  );
}

/** 일시 정지 — 세로 막대 둘. */
export function PauseGlyph(props) {
  return (
    <LineSvg {...props}>
      <line x1="9" y1="5" x2="9" y2="19" />
      <line x1="15" y1="5" x2="15" y2="19" />
    </LineSvg>
  );
}

/** 조직도 잇는 선 — 굽은 선. */
export function ConnectorCurveGlyph(props) {
  return (
    <LineSvg {...props}>
      <path d="M4 19 C 4 9, 20 15, 20 5" />
    </LineSvg>
  );
}

/** 조직도 잇는 선 — 꺾인 선. */
export function ConnectorElbowGlyph(props) {
  return (
    <LineSvg {...props}>
      <path d="M4 19 V12 H20 V5" />
    </LineSvg>
  );
}

/**
 * 끌어 옮기는 손잡이 — 점 여섯 개. 6×10 틀이라 `size` 가 아니라 `width`·`height` 로 준다.
 * 점 색은 원래 그림대로 회색(#D2D6DB)이 기본이고, `color` 로 바꿀 수 있다.
 */
export function DragHandleGlyph({ width = 6, height = 10, color = '#D2D6DB', style, ...rest }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 6 10"
      fill="currentColor"
      aria-hidden="true"
      style={{ color, ...style }}
      {...rest}
    >
      <circle cx="1.25" cy="1.25" r="1.25" />
      <circle cx="4.75" cy="1.25" r="1.25" />
      <circle cx="1.25" cy="5" r="1.25" />
      <circle cx="4.75" cy="5" r="1.25" />
      <circle cx="1.25" cy="8.75" r="1.25" />
      <circle cx="4.75" cy="8.75" r="1.25" />
    </svg>
  );
}

/**
 * 반짝이 — AI 블록. 매니저 요약 카드는 보라 그라데이션(정해진 색), 리소스·OKR 은 감싸는 요소의 색 한 가지로
 * 칠한다 — `gradient={false}` 면 `currentColor` 다.
 * 그라데이션 이름은 아이콘마다 따로 짓는다 — 한 화면에 둘이 뜨면 같은 이름이 겹친다.
 */
export function SparkleGlyph({ size = 16, gradient = true, color, style, ...rest }) {
  const gradId = `dp-sparkle-${useId().replace(/:/g, '')}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={color ? { color, ...style } : style}
      {...rest}
    >
      {gradient && (
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#7a5af8" />
            <stop offset="0.6" stopColor="#a07cf8" />
            <stop offset="1" stopColor="#c4b3fd" />
          </linearGradient>
        </defs>
      )}
      <path
        d="M11.8933 1C12.6278 0.999154 12.7142 1.82916 12.9151 2.39753C13.2233 3.27862 13.5176 4.16465 13.7978 5.05525C14.0098 5.70656 14.2292 6.41676 14.5234 7.03415C15.0493 8.13793 16.3268 9.44969 17.4777 9.86148C18.8303 10.3454 20.2585 10.7221 21.6215 11.186C21.8924 11.2781 22.3076 11.419 22.4323 11.7109C22.8252 12.756 21.4057 12.8886 20.7837 13.1959C20.2358 13.4147 19.6904 13.6343 19.1426 13.854C18.1159 14.2659 17.0429 14.5578 16.1693 15.2678C15.3749 15.9134 14.6393 16.8353 14.282 17.8099C13.7161 19.3532 13.2417 20.9465 12.604 22.4616C12.4894 22.7334 12.3324 22.8537 12.0705 22.9732C11.5089 23.2074 11.1416 21.8394 10.9951 21.4741C10.6378 20.5828 10.3577 19.6628 10.0087 18.768C9.84481 18.3039 9.71619 17.8243 9.50352 17.3795C9.05714 16.4442 8.38158 15.6987 7.57562 15.0693C7.13554 14.7255 6.68868 14.5919 6.18291 14.3839C5.64717 14.1435 5.09356 13.9635 4.54856 13.7532C3.83007 13.4759 3.14997 13.119 2.40411 12.9029C2.12591 12.8223 1.6763 12.5904 1.55509 12.3205C1.4058 11.9881 1.5711 11.515 1.91621 11.3701C2.88794 10.9322 3.94703 10.7451 4.9448 10.3844C5.03546 10.3575 5.13891 10.3117 5.22884 10.2883C7.23736 9.76508 8.92551 8.55585 9.69103 6.54961C9.83106 6.18258 9.92322 5.77593 10.0563 5.39032L10.9767 2.70013C11.1096 2.31117 11.23 1.90806 11.3741 1.52427C11.4991 1.19157 11.5906 1.13 11.8933 1Z"
        fill={gradient ? `url(#${gradId})` : 'currentColor'}
      />
    </svg>
  );
}
