/**
 * eval 캔버스 공용 인라인 SVG 아이콘 세트.
 *
 * design-page 는 이모지 글리프가 아니라 인라인 SVG(currentColor·size prop) 로 아이콘을
 * 표현한다. 기존 EvalCycleWizard 의 로컬 아이콘(svgProps 패턴, Feather 계열 stroke 글리프)
 * 을 공용 모듈로 승격해 전 eval 캔버스가 이모지 대신 재사용한다.
 *
 * 규약: viewBox 0 0 24 24, fill none, stroke currentColor, strokeWidth 2, round cap/join,
 * aria-hidden. 크기·색은 size / color(currentColor 상속) 로 맞춘다.
 * 두 곳 이상 쓰는 그림은 design-page `shared/lineIcons.jsx` 한 벌을 부른다(PW-1011).
 */
import {
  AlertTriangleGlyph,
  ChatGlyph,
  CheckCircleGlyph,
  ChevronLeftGlyph,
  ChevronRightGlyph,
  DownloadGlyph,
  EyeGlyph,
  FileTextGlyph,
  InfoGlyph,
  LockGlyph,
  MailGlyph,
  UsersGlyph,
} from '../shared/lineIcons.jsx';

/** `svgProps` 가 주던 style — 공용 아이콘에도 똑같이 넘긴다. */
const GLYPH_STYLE = { verticalAlign: 'middle', flexShrink: 0 };

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

// 📈 등급 추이 — 우상향 라인.
export function TrendIcon({ size = 16 }) {
  return (
    <svg {...svgProps(size)}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

// 🎯 목표/OKR — 과녁.
export function TargetIcon({ size = 16 }) {
  return (
    <svg {...svgProps(size)}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

// 💬 피드백/코멘트 — 말풍선.
export function ChatIcon({ size = 16 }) {
  return <ChatGlyph size={size} style={GLYPH_STYLE} />;
}

// 📝 스니핏/기록 — 문서.
export function NoteIcon({ size = 16 }) {
  return <FileTextGlyph size={size} style={GLYPH_STYLE} />;
}

// 🤝/👥 1:1·인원 — 두 사람.
export function UsersIcon({ size = 16 }) {
  return <UsersGlyph size={size} style={GLYPH_STYLE} />;
}

// ✨/✦ AI — 스파클.
export function SparkleIcon({ size = 16 }) {
  return (
    <svg {...svgProps(size)}>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
    </svg>
  );
}

// ℹ️/ⓘ 정보 — info 원.
export function InfoIcon({ size = 16 }) {
  return <InfoGlyph size={size} style={GLYPH_STYLE} />;
}

// ✅/✓ 완료 — check 원.
export function CheckCircleIcon({ size = 16 }) {
  return <CheckCircleGlyph size={size} style={GLYPH_STYLE} />;
}

// ⚠️/🚨 경고 — 삼각형.
export function AlertIcon({ size = 16 }) {
  return <AlertTriangleGlyph size={size} style={GLYPH_STYLE} />;
}

// 👁 공개 — 눈.
export function EyeIcon({ size = 16 }) {
  return <EyeGlyph size={size} style={GLYPH_STYLE} />;
}

// 🔒 비공개/기밀 — 자물쇠.
export function LockIcon({ size = 16 }) {
  return <LockGlyph size={size} style={GLYPH_STYLE} />;
}

// 🔄 재개/전환 — 순환 화살표.
export function RefreshIcon({ size = 16 }) {
  return (
    <svg {...svgProps(size)}>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

// 🏷️ 태그 — tag.
export function TagIcon({ size = 16 }) {
  return (
    <svg {...svgProps(size)}>
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

// 📅 날짜/기간 — 달력.
export function CalendarIcon({ size = 16 }) {
  return (
    <svg {...svgProps(size)}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

// ⏰ 시간/과거 — 시계.
export function ClockIcon({ size = 16 }) {
  return (
    <svg {...svgProps(size)}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

// 🌱/🌿 수습·휴직 — 새싹.
export function LeafIcon({ size = 16 }) {
  return (
    <svg {...svgProps(size)}>
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6" />
    </svg>
  );
}

// 🛑 비상 정지 — 팔각형.
export function StopIcon({ size = 16 }) {
  return (
    <svg {...svgProps(size)}>
      <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

// ⏸ 일시 중단 — pause.
export function PauseIcon({ size = 16 }) {
  return (
    <svg {...svgProps(size)}>
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

// ⏵ 재개 — play.
export function PlayIcon({ size = 16 }) {
  return (
    <svg {...svgProps(size)}>
      <polygon points="6 4 20 12 6 20 6 4" />
    </svg>
  );
}

// ⚡ 프리즈/강조 — 번개.
export function ZapIcon({ size = 16 }) {
  return (
    <svg {...svgProps(size)}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

// 📥 CSV 내보내기 — download.
export function DownloadIcon({ size = 16 }) {
  return <DownloadGlyph size={size} style={GLYPH_STYLE} />;
}

// 📩 요청/수신 — 봉투.
export function MailIcon({ size = 16 }) {
  return <MailGlyph size={size} style={GLYPH_STYLE} />;
}

// 📋 목록/리포트 — 클립보드.
export function ClipboardIcon({ size = 16 }) {
  return (
    <svg {...svgProps(size)}>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  );
}

// 🤖 AI 데이터 — cpu.
export function CpuIcon({ size = 16 }) {
  return (
    <svg {...svgProps(size)}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" />
      <line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" />
      <line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" />
      <line x1="20" y1="14" x2="23" y2="14" />
      <line x1="1" y1="9" x2="4" y2="9" />
      <line x1="1" y1="14" x2="4" y2="14" />
    </svg>
  );
}

// ◀ 되돌아가기 — 왼쪽 꺾쇠. 「단계 목록으로」 같은 되돌아가는 버튼 앞에 선다(PW-585).
export function ChevronLeftIcon({ size = 16 }) {
  return <ChevronLeftGlyph size={size} style={GLYPH_STYLE} />;
}

// ▶ 접힘/펼침 — 오른쪽 꺾쇠. 펼치면 부모가 90° 돌린다(리더 정책 §6.3.0 · PW-561).
export function ChevronRightIcon({ size = 16 }) {
  return <ChevronRightGlyph size={size} style={GLYPH_STYLE} />;
}
