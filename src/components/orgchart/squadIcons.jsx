/**
 * 스쿼드 뷰 공용 인라인 SVG 아이콘 세트.
 *
 * 기획 시안(`pivit-specs/조직도-renewal-with-public-card/org-chart-v2.jsx`)은 ⭐ 🗓 ⚠ 🔒
 * 같은 이모지 글리프로 아이콘을 표기하지만, design-page 정본은 인라인 SVG 다 —
 * OS·폰트마다 모양이 갈리고, 컬러 이모지가 흑백 UI 에서 혼자 튀며, `color` 를 상속하지
 * 않아 상태별 색을 줄 수 없기 때문이다. 시안의 배치·색은 그대로 두고 글리프만 SVG 로
 * 옮긴다.
 *
 * 규약: viewBox 0 0 24 24, fill none, stroke currentColor, strokeWidth 2, round cap/join,
 * aria-hidden. 크기는 size prop, 색은 부모의 color 상속(SVG 안에 리터럴 색 금지).
 * 선례: `eval/evalIcons.jsx`, `admin/teamIcons.jsx`.
 */

export function svgProps(size) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    style: { verticalAlign: 'middle', flexShrink: 0 },
  };
}

/**
 * ⭐ 리드 — 스쿼드당 1명. 배지·칩·아바타 오버레이에서 "이 사람이 리드" 를 말한다.
 * 채운 별이라야 작은 크기에서도 식별되므로 fill 만 currentColor 로 예외를 둔다
 * (리터럴 색이 아니라 상속이므로 상태색 규약은 지켜진다).
 */
export function LeadStarIcon({ size = 12 }) {
  return (
    <svg {...svgProps(size)} fill="currentColor" strokeWidth={1}>
      <polygon points="12 2.5 15.09 8.76 22 9.77 17 14.64 18.18 21.52 12 18.27 5.82 21.52 7 14.64 2 9.77 8.91 8.76 12 2.5" />
    </svg>
  );
}

/** ☆ 리드 미지정 — 리드 지정 버튼의 비활성 상태. */
export function LeadStarOutlineIcon({ size = 12 }) {
  return (
    <svg {...svgProps(size)} strokeWidth={1.8}>
      <polygon points="12 2.5 15.09 8.76 22 9.77 17 14.64 18.18 21.52 12 18.27 5.82 21.52 7 14.64 2 9.77 8.91 8.76 12 2.5" />
    </svg>
  );
}

/** 🗓 기간 — 한시 조직의 시작–종료. */
export function CalendarIcon({ size = 12 }) {
  return (
    <svg {...svgProps(size)}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
    </svg>
  );
}

/** ⚠ 경고 — 과부하 배너·완료 전환 넛지. */
export function WarningIcon({ size = 12 }) {
  return (
    <svg {...svgProps(size)}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

/** 🔒 편집 범위 밖 — manager 스코프 표시. */
export function LockIcon({ size = 12 }) {
  return (
    <svg {...svgProps(size)}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

/** ✕ 해제 — 배정 해제·칩 제거. */
export function CloseIcon({ size = 12 }) {
  return (
    <svg {...svgProps(size)}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/** ⋯ 더보기 — 카드 우상단 스쿼드 관리 메뉴. */
export function MoreIcon({ size = 14 }) {
  return (
    <svg {...svgProps(size)} fill="currentColor" strokeWidth={0}>
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

/** ▾ 상태 배지가 전환 트리거임을 알리는 표식. */
export function ChevronDownIcon({ size = 10 }) {
  return (
    <svg {...svgProps(size)} strokeWidth={2.6}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

/** + 추가 — 팀원 추가·스쿼드 만들기·빈 셀 배정. */
export function PlusIcon({ size = 12 }) {
  return (
    <svg {...svgProps(size)}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

/** ✓ 편집 완료 토글. */
export function CheckIcon({ size = 12 }) {
  return (
    <svg {...svgProps(size)}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/** ✏️ 할당 편집 토글. */
export function EditIcon({ size = 12 }) {
  return (
    <svg {...svgProps(size)}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}
