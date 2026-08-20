/* ── 구성원 관리 화면군 인라인 라인 아이콘 ──────────────────────────────
 * emoji/타이포 글리프(⚠️ ✓ × ⋯ ▾ ← →) 대체. design-page 의 클린 라인 아이콘
 * 톤(stroke 2, round cap/join)에 맞춘 self-contained SVG.
 * 색은 currentColor 상속 → 버튼/배지 톤을 그대로 따른다.
 *
 * 한 화면군의 아이콘은 **한 모듈에 모은다**. 캔버스와 초대 모달이 각자
 * 인라인으로 들고 있으면 같은 아이콘이 두 벌로 갈라져 굵기·크기가 어긋난다.
 * ------------------------------------------------------------------- */

function strokeProps(size) {
  return {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round',
    strokeLinejoin: 'round', 'aria-hidden': true, focusable: false,
    style: { display: 'block', flexShrink: 0 },
  };
}

export const IconAlert = ({ size = 18 }) => (
  <svg {...strokeProps(size)}>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
export const IconCheck = ({ size = 16 }) => (
  <svg {...strokeProps(size)}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
/* 사람 — 기획서가 `👤` 로 적은 자리(매니저 후보의 조직장 병기, 원클릭 조직장 배정)에
   쓴다. 이모지는 OS 마다 모양이 갈리고 `color` 를 상속하지 않아 버튼 톤과 어긋난다. */
export const IconUser = ({ size = 13 }) => (
  <svg {...strokeProps(size)}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
export const IconX = ({ size = 16 }) => (
  <svg {...strokeProps(size)}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);
export const IconMore = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable={false} style={{ display: 'block', flexShrink: 0 }}>
    <circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" />
  </svg>
);
export const IconChevronDown = ({ size = 14 }) => (
  <svg {...strokeProps(size)}><polyline points="6 9 12 15 18 9" /></svg>
);
export const IconChevronLeft = ({ size = 14 }) => (
  <svg {...strokeProps(size)}><polyline points="15 18 9 12 15 6" /></svg>
);
export const IconChevronRight = ({ size = 14 }) => (
  <svg {...strokeProps(size)}><polyline points="9 18 15 12 9 6" /></svg>
);
export const IconChevronUp = ({ size = 14 }) => (
  <svg {...strokeProps(size)}><polyline points="18 15 12 9 6 15" /></svg>
);
export const IconPlus = ({ size = 14 }) => (
  <svg {...strokeProps(size)}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
);
/** 컬럼 표시 설정(⚙) — 이모지 글리프 대신 인라인 SVG 다(프로젝트 규칙). */
export const IconSettings = ({ size = 14 }) => (
  <svg {...strokeProps(size)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
export const IconSearch = ({ size = 15 }) => (
  <svg {...strokeProps(size)}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
);
export const IconCheckmark = ({ size = 15 }) => (
  <svg {...strokeProps(size)}><polyline points="20 6 9 17 4 12" /></svg>
);
export const IconTrash = ({ size = 14 }) => (
  <svg {...strokeProps(size)}>
    <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
);
/* CSV 업로드 탭(PW-212) — 드롭존·템플릿 다운로드. */
export const IconUpload = ({ size = 20 }) => (
  <svg {...strokeProps(size)}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);
export const IconDownload = ({ size = 14 }) => (
  <svg {...strokeProps(size)}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
