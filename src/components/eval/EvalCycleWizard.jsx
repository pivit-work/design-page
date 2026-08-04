import { useState } from 'react';
import { createPortal } from 'react-dom';
import DatePicker from '../shared/DatePicker.jsx';

// 고정 단계 자물쇠 아이콘 — design-page 정본 lock-keyhole-square (인라인 SVG).
function LockIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M17.8385 2H6.16146C5.63433 1.99998 5.17954 1.99997 4.80497 2.03057C4.40963 2.06287 4.01641 2.13419 3.63803 2.32698C3.07354 2.6146 2.6146 3.07354 2.32698 3.63803C2.13419 4.01641 2.06287 4.40963 2.03057 4.80497C1.99997 5.17954 1.99998 5.63429 2 6.16142V17.8385C1.99998 18.3657 1.99997 18.8205 2.03057 19.195C2.06287 19.5904 2.13419 19.9836 2.32698 20.362C2.6146 20.9265 3.07354 21.3854 3.63803 21.673C4.01641 21.8658 4.40963 21.9371 4.80497 21.9694C5.17954 22 5.6343 22 6.16144 22H17.8386C18.3657 22 18.8205 22 19.195 21.9694C19.5904 21.9371 19.9836 21.8658 20.362 21.673C20.9265 21.3854 21.3854 20.9265 21.673 20.362C21.8658 19.9836 21.9371 19.5904 21.9694 19.195C22 18.8205 22 18.3657 22 17.8386V6.16144C22 5.6343 22 5.17954 21.9694 4.80497C21.9371 4.40963 21.8658 4.01641 21.673 3.63803C21.3854 3.07354 20.9265 2.6146 20.362 2.32698C19.9836 2.13419 19.5904 2.06287 19.195 2.03057C18.8205 1.99997 18.3657 1.99998 17.8385 2ZM13.7316 13.1947L14.649 15.947C14.7675 16.3025 14.8268 16.4803 14.7912 16.6218C14.7601 16.7456 14.6828 16.8529 14.5752 16.9216C14.4522 17 14.2648 17 13.8901 17H10.1099C9.7352 17 9.54783 17 9.42484 16.9216C9.31718 16.8529 9.23987 16.7456 9.20877 16.6218C9.17324 16.4803 9.23249 16.3025 9.351 15.947L10.2684 13.1947C10.339 12.9831 10.3743 12.8772 10.3724 12.7907C10.3705 12.6996 10.3583 12.6519 10.3164 12.5711C10.2765 12.4942 10.17 12.395 9.95681 12.1967C9.36819 11.649 9 10.8675 9 10C9 8.34315 10.3431 7 12 7C13.6569 7 15 8.34315 15 10C15 10.8675 14.6318 11.649 14.0432 12.1967C13.83 12.395 13.7235 12.4942 13.6836 12.5711C13.6417 12.6519 13.6295 12.6996 13.6276 12.7907C13.6257 12.8772 13.661 12.9831 13.7316 13.1947Z"
        fill="currentColor"
      />
    </svg>
  );
}

// 드래그 핸들 그립 아이콘 — 6점 그립(표준 유틸리티 글리프, 인라인 SVG).
function GripIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <circle cx="6" cy="4" r="1.3" />
      <circle cx="10" cy="4" r="1.3" />
      <circle cx="6" cy="8" r="1.3" />
      <circle cx="10" cy="8" r="1.3" />
      <circle cx="6" cy="12" r="1.3" />
      <circle cx="10" cy="12" r="1.3" />
    </svg>
  );
}

// 소형 유틸리티 아이콘(인라인 SVG). 이모지 글리프 대신 currentColor·size prop 으로
// 톤을 맞춘다. viewBox 0 0 24 24, stroke 기반(Feather 계열 표준 글리프).
function svgProps(size) {
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
    // 인라인(텍스트 옆) 배치 시 수직 정렬. flex 컨테이너에선 무시된다.
    style: { verticalAlign: 'middle' },
  };
}
// 간소형 프리셋 — 문서(간단 코멘트).
function DocIcon({ size = 16 }) {
  return (
    <svg {...svgProps(size)}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  );
}
// 중간형 프리셋(권장) — 별.
function StarIcon({ size = 16 }) {
  return (
    <svg {...svgProps(size)}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
// 세분화형 프리셋 — 레이어(세부 척도).
function LayersIcon({ size = 16 }) {
  return (
    <svg {...svgProps(size)}>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}
// 미리보기 — 눈.
function EyeIcon({ size = 16 }) {
  return (
    <svg {...svgProps(size)}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
// 이메일 채널 — 봉투.
function MailIcon({ size = 16 }) {
  return (
    <svg {...svgProps(size)}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polyline points="22 7 12 13 2 7" />
    </svg>
  );
}
// 슬랙 채널 — 말풍선.
function ChatIcon({ size = 16 }) {
  return (
    <svg {...svgProps(size)}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
// 슬랙 DM — 사람.
function UserIcon({ size = 16 }) {
  return (
    <svg {...svgProps(size)}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
// 슬랙 채널 모드 — 해시.
function HashIcon({ size = 16 }) {
  return (
    <svg {...svgProps(size)}>
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" />
      <line x1="16" y1="3" x2="14" y2="21" />
    </svg>
  );
}
// 점수 이유 필수/선택 — 연필.
function PencilIcon({ size = 16 }) {
  return (
    <svg {...svgProps(size)}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}
// 리마인더 — 종.
function BellIcon({ size = 16 }) {
  return (
    <svg {...svgProps(size)}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
// 리마인더 상세 — 톱니바퀴.
function GearIcon({ size = 16 }) {
  return (
    <svg {...svgProps(size)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
// 참조 대상 — 사람들.
function UsersIcon({ size = 16 }) {
  return (
    <svg {...svgProps(size)}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

// 단계 일정은 '날짜 + 시·분'(2026-07-02 결정). 저장 포맷은 datetime-local 과 같은
// 'YYYY-MM-DDTHH:mm' 이며, 시각을 지정하지 않으면 시작 09:00 · 종료 18:00 을 쓴다.
// 날짜만 저장된 기존 사이클도 그대로 읽히도록 두 포맷을 모두 받아 준다.
const DEFAULT_TIME = { start: '09:00', end: '18:00' };
const datePart = (v) => (v || '').slice(0, 10);
const timePart = (v, field) =>
  (v || '').length >= 16 ? v.slice(11, 16) : DEFAULT_TIME[field];
const joinDateTime = (date, time) => (date ? `${date}T${time}` : '');

// 'YYYY-MM-DD' 문자열 ↔ Date 변환 (DatePicker 는 Date 를 주고받는다).
const dateToIso = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
const isoToDate = (iso) => {
  const [y, m, d] = datePart(iso).split('-').map(Number);
  return y ? new Date(y, m - 1, d) : new Date();
};

/**
 * EvalCycleWizard — 새 평가 사이클 생성 마법사.
 *
 * 이번 슬라이스: 3 스텝(기본 정보 / 단계별 일정 / 확인·생성). prop 으로 받은 labels(L)와
 * onSubmit/onCancel 로 동작하는 순수 컴포넌트. 생성은 draft 로만 만들고, 오픈은 목록에서
 * 별도 수행(생성/오픈 분리). 템플릿·등급·대상자 스텝은 후속 슬라이스에서 확장.
 */

const fill = (s, vars) => {
  let out = s == null ? '' : String(s);
  for (const k of Object.keys(vars)) out = out.replace(`{{${k}}}`, vars[k]);
  return out;
};

const REVIEW_TYPE_KEYS = {
  self: 'reviewSelf',
  peer: 'reviewPeer',
  upward: 'reviewUpward',
  leader: 'reviewLeader',
};

const PEER_MODES = [
  { key: 'ai_recommend', label: 'modeAiRecommend', badge: 'recommendedBadge' },
  { key: 'self_select', label: 'modeSelfSelect' },
  { key: 'leader_assign', label: 'modeLeaderAssign' },
  { key: 'hr_assign', label: 'modeHrAssign', badge: 'exceptionBadge' },
];

// 단계별 일정 모델(시안 WizardStep2 ALL_PHASES). 선택 리뷰종류로 활성 단계 도출.
//  - self·share 는 앵커(양끝 고정, DnD 불가). 중간 단계만 재배열.
//  - required 단계(self·calibration·share)는 항상 ON. dependsOn 은 해당 유형 선택 시 활성.
//  - always 단계는 리뷰 종류와 무관하게 항상 목록에 있고, 토글로 끌 수 있다.
//  - 하향 단계 id 는 'leader'(리뷰종류 id 와 1:1; manager 개명은 별도 마이그레이션).
const ALL_PHASES = [
  { id: 'self', nameKey: 'phaseSelf', targetKey: 'ownerEvaluatee', required: true, anchor: true },
  { id: 'peer_confirm', nameKey: 'phasePeerConfirm', targetKey: 'ownerLeader', dependsOn: 'peer' },
  { id: 'peer', nameKey: 'phasePeer', targetKey: 'ownerPeer' },
  { id: 'upward', nameKey: 'phaseUpward', targetKey: 'ownerEvaluatee' },
  { id: 'leader', nameKey: 'phaseLeader', targetKey: 'ownerLeader' },
  // 조정·확정은 캘리브레이션 위원회 몫이고 HR 은 조회 전용(§3 재설계).
  { id: 'calibration', nameKey: 'phaseCalibration', targetKey: 'ownerCommittee', required: true },
  // §4.1.2 6단계 — 피평가자별 통합 요약을 조직장이 1차 검수(HR 은 열람).
  { id: 'report_review', nameKey: 'phaseReportReview', targetKey: 'ownerLeaderHr', always: true },
  { id: 'share', nameKey: 'phaseShare', targetKey: 'ownerHr', required: true, anchor: true },
];
// 단계 → 평가 유형(적용 템플릿 매핑용). 이 유형 템플릿만 해당 단계에 매핑 가능.
const PHASE_TO_REVIEW_TYPE = { self: 'self', peer: 'peer', upward: 'upward', leader: 'leader' };
// §5.2.1 단계별 리마인더 커스텀 — 단계당 복수 리마인더 자유 설정
const REMINDER_CHANNELS = [
  { id: 'email', labelKey: 'reminderChEmail', Icon: MailIcon },
  { id: 'slack', labelKey: 'reminderChSlack', Icon: ChatIcon },
];
const REMINDER_ANCHORS = [
  { id: 'before_end', labelKey: 'reminderAnchorEnd' },
  { id: 'before_start', labelKey: 'reminderAnchorStart' },
];
// 단계별 '미제출 당사자' 요약 라벨(받는 사람 요약용)
const PHASE_RESPONDER_SHORT = {
  self: 'reminderRespSelf',
  peer: 'reminderRespPeer',
  upward: 'reminderRespUpward',
  leader: 'reminderRespLeader',
  peer_confirm: 'reminderRespLeader',
  calibration: 'reminderRespCalib',
  report_review: 'reminderRespLeader',
  share: 'reminderRespShare',
};
const SLACK_CHANNELS = ['#performance-review', '#hr-notice', '#team-lead', '#general'];
// ⚙ 상세(sub-slice B): 참조 대상 · 이메일 템플릿 · 슬랙 상세
// 당사자(self)는 항상 고정 포함, 리더·HR 은 참조(에스컬레이션). 단계별 당사자 역할과
// 겹치면 중복 억제(PHASE_RESPONDER_ROLE).
const REMINDER_TARGETS = [
  { id: 'self', labelKey: 'reminderTgtSelf', fixed: true },
  { id: 'leader', labelKey: 'reminderTgtLeader', fixed: false },
  { id: 'hr', labelKey: 'reminderTgtHr', fixed: false },
];
// 단계별 당사자 역할 카테고리 — 참조(리더/HR) 중복 판정용
const PHASE_RESPONDER_ROLE = {
  self: 'member', peer: 'member', upward: 'member',
  leader: 'leader', peer_confirm: 'leader', report_review: 'leader',
  calibration: 'hr', share: 'hr',
};
const SLACK_SEND_MODES = [
  { id: 'dm', labelKey: 'reminderSlackDm', Icon: UserIcon },
  { id: 'channel', labelKey: 'reminderSlackChannel', Icon: HashIcon },
];
const EMAIL_TEMPLATES = [
  { id: 'default', labelKey: 'reminderTplDefault' },
  { id: 'urgent', labelKey: 'reminderTplUrgent' },
  { id: 'custom', labelKey: 'reminderTplCustom' },
];
// 사전 정의 템플릿 미리보기(읽기 전용, §14.2 spec 에서 관리) — 변수 토큰 그대로 표시
const EMAIL_TEMPLATE_PREVIEW = {
  default: {
    subject: '[{cycleName}] {stage} 마감 D-{offset}',
    body: '{name}님, 아직 {stage}가 완료되지 않았습니다. {dueDate}까지 제출해주세요.',
    cta: '{stage} 완료하기 → {link}',
  },
  urgent: {
    subject: '[{cycleName}] {stage} 마감 임박 — {dueDate}까지',
    body: '{name}님, {dueDate}까지 제출하지 않으면 마감 후 제출이 불가합니다. 지금 완료해주세요.',
    cta: '지금 완료하기 → {link}',
  },
};
// 치환 변수 정규 세트(SSOT: spec §14.0)
const EMAIL_VARS = ['{name}', '{cycleName}', '{stage}', '{dueDate}', '{offset}', '{link}'];
let __rmSeq = 0;
const nextRmId = () => `rm_${++__rmSeq}`;
const makeReminder = (offset = 1, channels = ['email']) => ({
  id: nextRmId(),
  anchor: 'before_end',
  offset,
  time: '09:00',
  channels,
  targets: { leader: false, hr: false },
  email: { template: 'default', subject: '', body: '' },
  slack: { mode: 'dm', channel: SLACK_CHANNELS[0], mention: true },
});
// 단계 진입 시 기본 2회(종료 D-3·D-1) — "2회 이상" 요건 충족.
// id 는 결정적(phase 배열 내 고유) — state seeding 없이도 매 렌더 동일 id 라
// 채널 토글·삭제가 id 매칭으로 정상 동작(첫 변경 시 state 에 영속).
const defaultReminders = () => [
  { ...makeReminder(3, ['email']), id: 'r_default_d3' },
  { ...makeReminder(1, ['email', 'slack']), id: 'r_default_d1' },
];

// ── 평가 템플릿(WizardStep3) 모델 ─────────────────────────────
// 템플릿이 적용될 리뷰 종류 — 리뷰종류 id(self/peer/upward/leader)와 1:1.
const TEMPLATE_TYPES = [
  { id: 'self', nameKey: 'reviewSelf' },
  { id: 'peer', nameKey: 'reviewPeer' },
  { id: 'upward', nameKey: 'reviewUpward' },
  { id: 'leader', nameKey: 'reviewLeader' },
];
// 버전 프리셋(간소형/중간형/세분화형).
const TEMPLATE_VERSIONS = [
  { id: 'simple', labelKey: 'tplVersionSimple' },
  { id: 'standard', labelKey: 'tplVersionStandard' },
  { id: 'detailed', labelKey: 'tplVersionDetailed' },
];
// 상대비율 적용 범위.
const RATIO_SCOPES = [
  { id: 'dept', labelKey: 'ratioScopeDept' },
  { id: 'div', labelKey: 'ratioScopeDiv' },
  { id: 'company', labelKey: 'ratioScopeCompany' },
];
// 질문 유형(항목 응답 방식).
const QUESTION_TYPES = [
  { id: 'textarea', labelKey: 'qTypeTextarea' },
  { id: 'rating', labelKey: 'qTypeRating' },
  { id: 'grade', labelKey: 'qTypeGrade' },
  { id: 'checkbox', labelKey: 'qTypeCheckbox' },
];
// 프리셋 카드 메타(아이콘·설명·권장).
const TEMPLATE_PRESET_META = [
  { id: 'simple', labelKey: 'tplVersionSimple', descKey: 'tplPresetSimpleDesc', Icon: DocIcon },
  { id: 'standard', labelKey: 'tplVersionStandard', descKey: 'tplPresetStandardDesc', Icon: StarIcon, recommended: true },
  { id: 'detailed', labelKey: 'tplVersionDetailed', descKey: 'tplPresetDetailedDesc', Icon: LayersIcon },
];
// 섹션별 색(시안 SECTION_COLORS): 성과=blue, 역량=purple, 성장=green, 최종등급=amber.
const SECTION_COLORS = {
  '성과 (What)': 'var(--utility-blue-600, #175cd3)',
  '역량 (How)': 'var(--utility-purple-600, #6938ef)',
  '성장 (Growth)': 'var(--utility-success-600, #079455)',
  '최종 등급 결정': 'var(--utility-warning-600, #dc6803)',
};
const sectionColor = (s) => SECTION_COLORS[s] || 'var(--text-tertiary, #98a2b3)';
// 프리셋별 질문 시드(편집 가능한 콘텐츠). ai=AI 초안 지원, requiresRationale=점수 이유 필수.
const TEMPLATE_PRESETS = {
  simple: [
    { id: 's1', section: '성과 (What)', text: '이번 기간 종합 코멘트를 작성해주세요.', type: 'textarea', ai: true },
    { id: 's2', section: '최종 등급 결정', text: '최종 등급을 선택하세요.', type: 'grade' },
  ],
  standard: [
    { id: 'q1', section: '성과 (What)', text: '이번 기간 주요 성과를 서술해주세요.', type: 'textarea', ai: true },
    { id: 'q2', section: '성과 (What)', text: 'OKR/KR 달성도', type: 'rating' },
    { id: 'q3', section: '역량 (How)', text: '주도성 · 오너십', type: 'rating' },
    { id: 'q4', section: '역량 (How)', text: '협업 · 커뮤니케이션', type: 'rating' },
    { id: 'q5', section: '성장 (Growth)', text: '강점', type: 'textarea', ai: true },
    { id: 'q6', section: '성장 (Growth)', text: '개선점 / 성장 영역', type: 'textarea', ai: true },
    { id: 'q7', section: '최종 등급 결정', text: '최종 등급을 선택하세요.', type: 'grade' },
  ],
  detailed: [
    { id: 'd1', section: '성과 (What)', text: '이번 기간 주요 성과를 서술해주세요.', type: 'textarea', ai: true },
    { id: 'd2', section: '성과 (What)', text: 'OKR/KR 달성도', type: 'rating' },
    { id: 'd3', section: '성과 (What)', text: '정량 목표 달성률', type: 'rating', requiresRationale: true },
    { id: 'd4', section: '역량 (How)', text: '주도성 / 오너십', type: 'rating', requiresRationale: true },
    { id: 'd5', section: '역량 (How)', text: '협업 · 커뮤니케이션', type: 'rating', requiresRationale: true },
    { id: 'd6', section: '역량 (How)', text: '실행력', type: 'rating', requiresRationale: true },
    { id: 'd7', section: '역량 (How)', text: '전문성 · 문제 해결', type: 'rating', requiresRationale: true },
    { id: 'd8', section: '역량 (How)', text: '리더십 · 영향력', type: 'rating', requiresRationale: true },
    { id: 'd9', section: '성장 (Growth)', text: '강점', type: 'textarea', ai: true },
    { id: 'd10', section: '성장 (Growth)', text: '개선점 / 성장 영역', type: 'textarea', ai: true },
    { id: 'd11', section: '성장 (Growth)', text: '성장 가능성', type: 'rating' },
    { id: 'd12', section: '최종 등급 결정', text: '승진 추천 여부', type: 'checkbox' },
    { id: 'd13', section: '최종 등급 결정', text: '최종 등급을 선택하세요.', type: 'grade' },
  ],
};
/**
 * [F1] 동료 리뷰는 **피드백 전용**이다 — 동료 리뷰어에게는 평가권이 없으므로
 * 등급 항목은 빼고, 점수(척도)형은 서술형으로 내려 보여준다.
 * (서버 resolvePhaseTemplate 도 peerMode 에서 같은 강등을 하므로, 빌더가 보여주는 것과
 *  동료가 실제로 받는 폼이 어긋나지 않게 여기서 미리 맞춘다.)
 */
function presetFor(version, reviewType) {
  const base = TEMPLATE_PRESETS[version] ?? TEMPLATE_PRESETS.standard;
  if (reviewType !== 'peer') return base;
  return base
    .filter((q) => q.type !== 'grade')
    .map((q) =>
      q.type === 'rating'
        ? { ...q, type: 'textarea', requiresRationale: false }
        : q,
    );
}

// 워크스페이스 기본 등급 체계(상대비율 포함).
const DEFAULT_GRADES = [
  { label: '탁월', desc: '기대를 초과하는 성과를 달성함', ratio: 15 },
  { label: '충족', desc: '기대에 부합하는 성과를 달성함', ratio: 70 },
  { label: '미흡', desc: '기대에 미달하는 성과를 보임', ratio: 15 },
];
const MAX_GRADES = 10;
const MIN_GRADES = 2;

// 현재 빌더 상태 → 템플릿 요약 문자열(항목 N · 등급 M단계).
const gradeSum = (grades) => grades.reduce((a, g) => a + (Number(g.ratio) || 0), 0);

/**
 * §4.1.1 대상자 범위 축. §4.1.1-D 로 직무·직군·레벨·직책이 추가됐다.
 *
 * 어드민 정본 어휘 주의 — 직급은 User.title, 레벨은 User.grade(G1~G6), 직책은 position.
 * (mode 값은 백엔드 IncludeMode 와 1:1)
 */
const TARGET_AXES = [
  { mode: 'by_dept', field: 'department', labelKey: 'targetModeDept', headKey: 'targetDeptLabel' },
  { mode: 'by_grade', field: 'title', labelKey: 'targetModeGrade', headKey: 'targetGradeLabel' },
  { mode: 'by_job_role', field: 'jobRole', labelKey: 'targetModeJobRole', headKey: 'targetJobRoleLabel' },
  { mode: 'by_job_group', field: 'jobGroup', labelKey: 'targetModeJobGroup', headKey: 'targetJobGroupLabel' },
  { mode: 'by_level', field: 'level', labelKey: 'targetModeLevel', headKey: 'targetLevelLabel' },
  { mode: 'by_position', field: 'position', labelKey: 'targetModePosition', headKey: 'targetPositionLabel' },
];

/** 선택한 리뷰종류로 활성 단계 목록 도출. */
function activePhasesFor(reviewTypes) {
  return ALL_PHASES.filter(
    (p) =>
      p.required ||
      p.always ||
      reviewTypes.includes(p.id) ||
      (p.dependsOn && reviewTypes.includes(p.dependsOn)),
  );
}

/** 겹치는(병렬 진행) 단계 쌍. 겹침은 오류가 아니라 허용. */
function getOverlapPairs(rows) {
  const pairs = [];
  for (let i = 0; i < rows.length; i += 1) {
    for (let j = i + 1; j < rows.length; j += 1) {
      const a = rows[i];
      const b = rows[j];
      if (!a.start || !a.end || !b.start || !b.end) continue;
      if (a.start < b.end && b.start < a.end) {
        pairs.push({ key: [a.id, b.id].sort().join('|'), a: a.name, b: b.name });
      }
    }
  }
  return pairs;
}

/** 활성 단계에 7일 간격 초기 일정(시작·종료 일시) 배치. 기본 시각 09:00~18:00. */
function initSchedule(phases, baseDate) {
  const DAY = 86400000;
  const base = baseDate ? new Date(baseDate) : new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const s = {};
  phases.forEach((p, i) => {
    const st = new Date(base.getTime() + i * 7 * DAY);
    const en = new Date(st.getTime() + 6 * DAY);
    s[p.id] = {
      start: joinDateTime(iso(st), DEFAULT_TIME.start),
      end: joinDateTime(iso(en), DEFAULT_TIME.end),
    };
  });
  return s;
}

function StepBar({ steps, current, labels: L, onJump }) {
  return (
    <div className="evc-wiz-steps">
      {steps.map((s, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'future';
        return (
          <button
            type="button"
            key={s.titleKey}
            className={`evc-wiz-step is-${state}`}
            onClick={() => state === 'done' && onJump(i)}
            disabled={state === 'future'}
          >
            <span className="evc-wiz-step-num">{state === 'done' ? '✓' : i + 1}</span>
            <span className="evc-wiz-step-label">{L[s.titleKey]}</span>
          </button>
        );
      })}
    </div>
  );
}

// 평가 항목 추가 폼 — section·text·type 입력 후 추가.
function AddQuestionRow({ onAdd, labels: L }) {
  const [section, setSection] = useState('성과 (What)');
  const [text, setText] = useState('');
  const [type, setType] = useState('textarea');
  const submit = () => {
    if (!text.trim()) return;
    onAdd(section, text, type);
    setText('');
  };
  return (
    <div className="evc-tpl-additem">
      <input
        className="evc-input"
        value={section}
        onChange={(e) => setSection(e.target.value)}
        placeholder={L.templateSectionPlaceholder}
        data-testid="evc-tpl-add-section"
      />
      <input
        className="evc-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={L.templateItemPlaceholder}
        data-testid="evc-tpl-add-text"
      />
      <select className="evc-input" value={type} onChange={(e) => setType(e.target.value)}>
        {QUESTION_TYPES.map((t) => (
          <option key={t.id} value={t.id}>{L[t.labelKey]}</option>
        ))}
      </select>
      <button type="button" className="evc-btn is-ghost" onClick={submit} data-testid="evc-tpl-add-item">
        {L.templateAddItem}
      </button>
    </div>
  );
}

// 템플릿 미리보기 모달 — 구성원이 보게 될 형태로 항목을 렌더(입력 비활성). 단일/전체 모드.
function TemplatePreviewModal({ questions, grades, focus, onClose, labels: L }) {
  const focusQ =
    focus && focus.questionId
      ? questions.find((q) => q.id === focus.questionId)
      : null;
  const items = focusQ ? [focusQ] : questions;
  const sections = [];
  items.forEach((q) => {
    let g = sections.find((s) => s.sec === q.section);
    if (!g) {
      g = { sec: q.section, items: [] };
      sections.push(g);
    }
    g.items.push(q);
  });
  return createPortal(
    <div className="evc-modal-overlay" onClick={onClose}>
      <div className="evc-modal is-wide" onClick={(e) => e.stopPropagation()}>
        <div className="evc-wiz-header">
          <h3 className="evc-modal-title">
            {focusQ ? L.previewItemTitle : L.previewTitle}
          </h3>
          <button type="button" className="evc-wiz-close" onClick={onClose} aria-label={L.cancel}>
            ✕
          </button>
        </div>
        <div className="evc-preview-body">
          {sections.map((s) => (
            <div key={s.sec} className="evc-preview-section">
              <div className="evc-preview-sec-title" style={{ color: sectionColor(s.sec) }}>
                {s.sec}
              </div>
              {s.items.map((q) => (
                <div key={q.id} className="evc-preview-q">
                  <div className="evc-preview-q-text">
                    {q.text}
                    {q.requiresRationale && (
                      <span className="evc-mode-badge is-warn">{L.rationaleRequired}</span>
                    )}
                  </div>
                  {q.type === 'textarea' && (
                    <textarea className="evm-textarea" rows={3} disabled placeholder={L.previewTextareaPlaceholder} />
                  )}
                  {q.type === 'rating' && (
                    <div className="evc-preview-scale">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span key={n} className="evc-preview-scale-dot">{n}</span>
                      ))}
                    </div>
                  )}
                  {q.type === 'grade' && (
                    <div className="evc-preview-gradechips">
                      {grades.map((g, i) => (
                        <span key={i} className="evc-type-chip">{g.label}</span>
                      ))}
                    </div>
                  )}
                  {q.type === 'checkbox' && (
                    <label className="evl-promo-row">
                      <input type="checkbox" disabled />
                      <span>{q.text}</span>
                    </label>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function EvalCycleWizard({
  labels: L,
  candidates = [],
  committeeCandidates = [],
  onCancel,
  onSubmit,
  // TC-028 사이클 설정 프리셋(불러오기/저장)
  presets = [],
  onSavePreset,
  onLoadPreset,
}) {
  const [step, setStep] = useState(0);
  // R1b 경로 B — 캘리브레이션 위원회 구성(선택). committee[0] = 위원장.
  const [committeeOn, setCommitteeOn] = useState(false);
  const [committee, setCommittee] = useState([]);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  // 날짜 picker 팝오버 상태: { field:'start'|'end', rect, el }
  const [picker, setPicker] = useState(null);
  const openPicker = (field) => (e) =>
    setPicker({ field, rect: e.currentTarget.getBoundingClientRect(), el: e.currentTarget });
  // 단계별 일정 date picker 팝오버: { phaseId, field:'start'|'end', rect, el }
  const [schedPicker, setSchedPicker] = useState(null);
  const openSchedPicker = (phaseId, field) => (e) =>
    setSchedPicker({ phaseId, field, rect: e.currentTarget.getBoundingClientRect(), el: e.currentTarget });
  const [reviewTypes, setReviewTypes] = useState(['self', 'leader']);
  // TC-046/047 하향 최종 등급 카드 위치(상단/하단/상단고정)
  const [gradeCardPosition, setGradeCardPosition] = useState('bottom');
  // v2: 동료 리뷰어 지정 방식 다중선택(시안 peerAssign[]) + 결과 본인 공개 기본값
  const [peerAssignModes, setPeerAssignModes] = useState(['ai_recommend']);
  const [peerVisibility, setPeerVisibility] = useState(false);
  // 단계별 일정(review_sequence) 상태
  const [schedule, setSchedule] = useState({}); // { phaseId: { start, end } } 사용자 오버라이드
  const [reminders, setReminders] = useState({}); // { phaseId: [reminderObj] }
  const [rmDetail, setRmDetail] = useState(() => new Set()); // 상세(⚙) 펼친 리마인더 id
  const [disabledPhases, setDisabledPhases] = useState(() => new Set());
  const [phaseOrder, setPhaseOrder] = useState([]); // 중간 단계 재배열 순서(id)
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  // §4.1.1 대상자 범위 — 'bulk'(전체) | 'by_dept'(부서) | 'by_grade'(직급) | 'individual_select'(개인)
  const [includeMode, setIncludeMode] = useState('bulk');
  const [selectedIds, setSelectedIds] = useState([]);
  // 축 모드별로 고른 값 — { by_dept: ['개발팀'], by_grade: ['책임'], ... }
  const [axisValues, setAxisValues] = useState({});
  const [memberSearch, setMemberSearch] = useState('');
  // §4.1.1 제외 조건 필터(자동 탐지). 데이터 근거가 있는 두 축만 노출한다.
  const [excludeOnLeave, setExcludeOnLeave] = useState(false);
  const [excludeHireDate, setExcludeHireDate] = useState(false);
  const [hireDateRef, setHireDateRef] = useState('');
  const [hireDateDirection, setHireDateDirection] = useState('after');
  const [hirePicker, setHirePicker] = useState(null);
  // §4.1.2 0단계 '리뷰 & 조정' — 자동 산출 명단을 사람이 최종 가감한다.
  const [manualExcludedIds, setManualExcludedIds] = useState([]); // 대상 → 제외
  const [keptIds, setKeptIds] = useState([]); // 자동 제외를 되돌려 대상으로 유지
  // 평가 템플릿(step 1) — 워크스페이스 라이브러리 + 빌더 상태
  const [savedTemplates, setSavedTemplates] = useState([]); // 이 세션 라이브러리
  const [tplType, setTplType] = useState('self'); // 빌더가 편집중인 평가 유형
  const [tplName, setTplName] = useState('');
  const [tplVersion, setTplVersion] = useState('standard');
  const [tplQuestions, setTplQuestions] = useState(() => presetFor('standard', 'self'));
  const [tplGrades, setTplGrades] = useState(DEFAULT_GRADES);
  const [tplAbsolute, setTplAbsolute] = useState(false); // 절대평가(상대비율 없음)
  const [tplRatioScope, setTplRatioScope] = useState('div');
  const [phaseTemplateMap, setPhaseTemplateMap] = useState({}); // { phaseId: templateId }
  const [tplDragIdx, setTplDragIdx] = useState(null);
  const [tplDragOverIdx, setTplDragOverIdx] = useState(null);
  const [tplPreview, setTplPreview] = useState(null); // null | 'all' | {questionId}
  // 직급별 템플릿 버전 (시안 eval_role_template_map). 직급은 멤버 position 에서 도출.
  const [roleMode, setRoleMode] = useState('uniform'); // 'uniform' | 'by_role'
  const [roleVersions, setRoleVersions] = useState({}); // { 직급: version }

  const steps = [
    { titleKey: 'wizardStep1' }, // 기본 정보
    { titleKey: 'wizardStepTemplate' }, // 평가 템플릿
    { titleKey: 'wizardStep2' }, // 단계별 일정
    { titleKey: 'wizardStepTargets' }, // 대상자
    { titleKey: 'wizardStepCommittee' }, // R1b 경로 B — 캘리브레이션 위원회(선택)
    { titleKey: 'wizardStep3' }, // 확인 및 생성
  ];

  const hasPeer = reviewTypes.includes('peer');
  const activePhases = activePhasesFor(reviewTypes);
  const defaultSchedule = initSchedule(activePhases, startDate);
  const scheduleOf = (id) => schedule[id] || defaultSchedule[id] || { start: '', end: '' };
  const remindersOf = (id) => reminders[id] ?? defaultReminders();
  const middleIds = activePhases.filter((p) => !p.anchor).map((p) => p.id);
  const orderedMiddle = [
    ...phaseOrder.filter((id) => middleIds.includes(id)),
    ...middleIds.filter((id) => !phaseOrder.includes(id)),
  ];
  const displayPhases = [
    activePhases.find((p) => p.id === 'self'),
    ...orderedMiddle.map((id) => activePhases.find((p) => p.id === id)),
    activePhases.find((p) => p.id === 'share'),
  ].filter(Boolean);
  const enabledRows = displayPhases
    .filter((p) => !disabledPhases.has(p.id))
    .map((p) => ({ id: p.id, name: L[p.nameKey], ...scheduleOf(p.id) }));
  const overlapPairs = getOverlapPairs(enabledRows);
  const overlapIds = new Set(overlapPairs.flatMap((p) => p.key.split('|')));

  const updateSchedule = (id, field, value) =>
    setSchedule((s) => ({ ...s, [id]: { ...scheduleOf(id), [field]: value } }));
  // 날짜·시각을 각각 편집해도 저장은 'YYYY-MM-DDTHH:mm' 한 값으로 유지한다.
  const updateSchedDate = (id, field, isoDate) =>
    updateSchedule(
      id,
      field,
      joinDateTime(isoDate, timePart(scheduleOf(id)[field], field)),
    );
  const updateSchedTime = (id, field, hhmm) => {
    const date = datePart(scheduleOf(id)[field]);
    if (!date) return;
    updateSchedule(id, field, joinDateTime(date, hhmm || DEFAULT_TIME[field]));
  };

  // §5.2.1 리마인더 편집
  const addReminder = (pid) =>
    setReminders((r) => ({ ...r, [pid]: [...remindersOf(pid), makeReminder(1, ['email'])] }));
  const removeReminder = (pid, rid) =>
    setReminders((r) => ({ ...r, [pid]: remindersOf(pid).filter((x) => x.id !== rid) }));
  const updateReminder = (pid, rid, field, value) =>
    setReminders((r) => ({
      ...r,
      [pid]: remindersOf(pid).map((x) => (x.id === rid ? { ...x, [field]: value } : x)),
    }));
  const patchReminder = (pid, rid, fn) =>
    setReminders((r) => ({
      ...r,
      [pid]: remindersOf(pid).map((x) => (x.id === rid ? { ...x, ...fn(x) } : x)),
    }));
  const toggleChannel = (pid, rid, ch) =>
    setReminders((r) => ({
      ...r,
      [pid]: remindersOf(pid).map((x) => {
        if (x.id !== rid) return x;
        const has = x.channels.includes(ch);
        if (has && x.channels.length === 1) return x; // 최소 1채널 유지
        return {
          ...x,
          channels: has ? x.channels.filter((c) => c !== ch) : [...x.channels, ch],
        };
      }),
    }));
  const toggleRmDetail = (rid) =>
    setRmDetail((prev) => {
      const n = new Set(prev);
      if (n.has(rid)) n.delete(rid);
      else n.add(rid);
      return n;
    });
  const togglePhaseEnabled = (id) =>
    setDisabledPhases((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const movePhase = (targetId) => {
    if (!dragId || dragId === targetId) return;
    const arr = [...orderedMiddle];
    const from = arr.indexOf(dragId);
    const to = arr.indexOf(targetId);
    if (from < 0 || to < 0) return;
    arr.splice(to, 0, arr.splice(from, 1)[0]);
    setPhaseOrder(arr);
  };

  const toggleType = (t) =>
    setReviewTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );

  // ── 평가 템플릿 빌더 헬퍼 ──
  const tplRatioSum = gradeSum(tplGrades);
  const tplRatioInvalid = !tplAbsolute && tplRatioSum !== 100;
  // 중복 등급명(공백 제거·대소문자 무시) 집합.
  const tplDupLabels = (() => {
    const seen = new Set();
    const dup = new Set();
    for (const g of tplGrades) {
      const l = g.label.trim().toLowerCase();
      if (!l) continue;
      if (seen.has(l)) dup.add(l);
      else seen.add(l);
    }
    return dup;
  })();
  const tplGradesValid =
    tplGrades.length >= MIN_GRADES &&
    tplGrades.every((g) => g.label.trim()) &&
    tplDupLabels.size === 0 &&
    !tplRatioInvalid;
  // 대상 멤버 position 에서 직급 목록 도출(중복 제거, 빈값 제외).
  const roleLevels = [
    ...new Set(candidates.map((c) => c.position).filter(Boolean)),
  ];
  const roleVersionOf = (role) => roleVersions[role] || 'standard';
  const setRoleVersion = (role, v) =>
    setRoleVersions((prev) => ({ ...prev, [role]: v }));
  const selectTplPreset = (id) => {
    setTplVersion(id);
    setTplQuestions(presetFor(id, tplType));
  };
  const tplIsCustomized =
    JSON.stringify(tplQuestions) !== JSON.stringify(presetFor(tplVersion, tplType));
  // 유형을 바꾸면(특히 동료로) 손대지 않은 프리셋은 그 유형에 맞게 다시 깐다.
  const selectTplType = (id) => {
    if (!tplIsCustomized) setTplQuestions(presetFor(tplVersion, id));
    setTplType(id);
  };
  const tplDrop = (targetIdx) => {
    if (tplDragIdx === null || tplDragIdx === targetIdx) {
      setTplDragIdx(null);
      setTplDragOverIdx(null);
      return;
    }
    setTplQuestions((qs) => {
      const next = [...qs];
      const [moved] = next.splice(tplDragIdx, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
    setTplDragIdx(null);
    setTplDragOverIdx(null);
  };
  const toggleRationale = (id) =>
    setTplQuestions((qs) =>
      qs.map((q) => (q.id === id ? { ...q, requiresRationale: !q.requiresRationale } : q)),
    );
  const removeQuestion = (id) =>
    setTplQuestions((qs) => qs.filter((q) => q.id !== id));
  const addQuestion = (section, text, type) => {
    if (!text.trim()) return;
    setTplQuestions((qs) => [
      ...qs,
      { id: `c${qs.length}_${text.length}`, section, text: text.trim(), type },
    ]);
  };
  const updateGrade = (i, field, value) =>
    setTplGrades((gs) => gs.map((g, idx) => (idx === i ? { ...g, [field]: value } : g)));
  const addGrade = () =>
    setTplGrades((gs) => (gs.length >= MAX_GRADES ? gs : [...gs, { label: '', desc: '', ratio: 0 }]));
  const removeGrade = (i) =>
    setTplGrades((gs) => (gs.length <= MIN_GRADES ? gs : gs.filter((_, idx) => idx !== i)));
  const saveTemplate = () => {
    const name = tplName.trim();
    if (!name || !tplGradesValid) return;
    const tpl = {
      id: `tpl${savedTemplates.length}_${name.length}`,
      name,
      reviewType: tplType,
      version: tplVersion,
      questions: tplQuestions,
      grades: tplGrades,
      absolute: tplAbsolute,
      ratioScope: tplRatioScope,
    };
    setSavedTemplates((prev) => [tpl, ...prev]);
    setTplName('');
  };
  const loadTemplate = (tpl) => {
    setTplType(tpl.reviewType);
    setTplName(tpl.name);
    setTplVersion(tpl.version);
    setTplQuestions(tpl.questions);
    setTplGrades(tpl.grades);
    setTplAbsolute(!!tpl.absolute);
    setTplRatioScope(tpl.ratioScope || 'div');
  };
  const deleteTemplate = (id) => {
    setSavedTemplates((prev) => prev.filter((t) => t.id !== id));
    setPhaseTemplateMap((m) => {
      const n = { ...m };
      Object.keys(n).forEach((k) => {
        if (n[k] === id) delete n[k];
      });
      return n;
    });
  };

  const togglePeerMode = (key) =>
    setPeerAssignModes((prev) =>
      prev.includes(key)
        ? prev.filter((x) => x !== key)
        : [...prev, key],
    );

  const toggleMember = (id) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  const toggleIn = (setter) => (value) =>
    setter((prev) =>
      prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value],
    );
  // 축 값 토글 — 모드별로 고른 값을 따로 기억해 두어, 모드를 바꿨다 돌아와도 유지된다.
  const toggleAxisValue = (mode, value) =>
    setAxisValues((prev) => {
      const cur = prev[mode] ?? [];
      return {
        ...prev,
        [mode]: cur.includes(value)
          ? cur.filter((x) => x !== value)
          : [...cur, value],
      };
    });
  // 0단계 '리뷰 & 조정' 이동. 대상 → 제외는 manual, 제외 → 대상은 자동 판정 무시(keep).
  const excludeOne = (id) => {
    setKeptIds((prev) => prev.filter((x) => x !== id));
    setManualExcludedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };
  const includeOne = (id) => {
    setManualExcludedIds((prev) => prev.filter((x) => x !== id));
    setKeptIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  // §4.1.1 + §4.1.1-D 대상자 범위. 축은 전부 "후보의 한 필드에서 값 목록을 뽑아
  // 고른 값만 남긴다"로 같은 모양이라, 모드별로 코드를 복제하지 않고 표로 둔다.
  const axisOf = (mode) => TARGET_AXES.find((a) => a.mode === mode) ?? null;
  const activeAxis = axisOf(includeMode);
  const axisOptions = activeAxis
    ? [...new Set(candidates.map((c) => c[activeAxis.field]).filter(Boolean))]
    : [];
  const axisSelected = activeAxis ? (axisValues[includeMode] ?? []) : [];
  const scopedCandidates = activeAxis
    ? candidates.filter((c) => axisSelected.includes(c[activeAxis.field]))
    : includeMode === 'individual_select'
      ? candidates.filter((c) => selectedIds.includes(c.id))
      : candidates;

  // §4.1.1 제외 조건 필터 — 개별 선택 모드는 관리자가 직접 고른 명단이므로 적용하지 않는다.
  const exclusionActive = includeMode !== 'individual_select';
  const autoExclusions = !exclusionActive
    ? []
    : scopedCandidates.flatMap((c) => {
        if (excludeOnLeave && c.employmentStatus === 'on_leave') {
          return [{ memberId: c.id, exclusionType: 'leave' }];
        }
        if (excludeHireDate && hireDateRef && c.hireDate) {
          const after = hireDateDirection === 'after';
          const hit = after ? c.hireDate > hireDateRef : c.hireDate < hireDateRef;
          if (hit) {
            return [
              {
                memberId: c.id,
                exclusionType: 'hire_date',
                referenceDate: hireDateRef,
                referenceDateDirection: hireDateDirection,
              },
            ];
          }
        }
        return [];
      });
  // 0단계 '리뷰 & 조정' 에서 손으로 뺀 사람(개별 지정 제외).
  const manualExclusions = manualExcludedIds
    .filter((id) => scopedCandidates.some((c) => c.id === id))
    .map((id) => ({ memberId: id, exclusionType: 'manual' }));
  const exclusions = [
    ...manualExclusions,
    ...autoExclusions.filter(
      (e) => !manualExcludedIds.includes(e.memberId) && !keptIds.includes(e.memberId),
    ),
  ];
  const excludedIds = new Set(exclusions.map((e) => e.memberId));
  const targetMembers = scopedCandidates.filter((c) => !excludedIds.has(c.id));
  const excludedMembers = scopedCandidates.filter((c) => excludedIds.has(c.id));
  const targetIds = targetMembers.map((c) => c.id);
  const targetCount = targetIds.length;
  const exclusionReasonOf = (id) =>
    exclusions.find((e) => e.memberId === id)?.exclusionType ?? 'manual';

  const filteredCandidates = memberSearch.trim()
    ? candidates.filter((c) =>
        `${c.name} ${c.department ?? ''}`
          .toLowerCase()
          .includes(memberSearch.trim().toLowerCase()),
      )
    : candidates;

  const step1Valid =
    name.trim() &&
    startDate &&
    endDate &&
    reviewTypes.length > 0 &&
    (!hasPeer || peerAssignModes.length > 0);
  const targetsValid = targetCount > 0;
  const committeeValid = !committeeOn || committee.length > 0;
  const canAdvance =
    (step === 0 && step1Valid) ||
    step === 1 ||
    step === 2 ||
    (step === 3 && targetsValid) ||
    (step === 4 && committeeValid);

  const submit = () => {
    const payload = {
      name: name.trim(),
      startDate,
      endDate,
      reviewTypes,
      peerAssignMode: hasPeer ? peerAssignModes[0] : undefined,
      peerAssignModes: hasPeer ? peerAssignModes : undefined,
      peerVisibilityDefault: hasPeer ? peerVisibility : false,
      // v2 SSOT: 단계별 일정/순서/사용여부/리마인더를 review_sequence 로 전달.
      reviewSequence: {
        order: displayPhases.map((p) => p.id),
        enabled: Object.fromEntries(
          displayPhases.map((p) => [p.id, !disabledPhases.has(p.id)]),
        ),
        schedule: Object.fromEntries(
          displayPhases.map((p) => [p.id, scheduleOf(p.id)]),
        ),
        reminders: Object.fromEntries(
          displayPhases
            .filter((p) => !disabledPhases.has(p.id))
            .map((p) => [p.id, remindersOf(p.id)]),
        ),
        templateMap: phaseTemplateMap,
        gradeCardPosition,
        roleMode,
        roleVersions: roleMode === 'by_role' ? roleVersions : {},
      },
      // v2 슬라이스2: 단계에 매핑된 템플릿 정의를 백엔드로 전달(clientId 로 참조).
      evalTemplates: savedTemplates
        .filter((t) => Object.values(phaseTemplateMap).includes(t.id))
        .map((t) => ({
          clientId: t.id,
          name: t.name,
          reviewType: t.reviewType,
          version: t.version,
          absolute: t.absolute,
          ratioScope: t.ratioScope,
          questions: t.questions.map((q) => ({
            section: q.section,
            text: q.text,
            type: q.type,
            requiresRationale: !!q.requiresRationale,
            // TC-051/052 항목 설명 · TC-053 공개 대상(피평가자 비공개 여부)
            description: q.description?.trim() || null,
            visibleToRoles: q.hideFromEvaluatee
              ? ['manager', 'hr', 'committee']
              : null,
          })),
          grades: t.grades.map((g) => ({
            label: g.label,
            desc: g.desc,
            ratio: g.ratio,
          })),
        })),
      // 구 flat due 컬럼은 review_sequence 로 대체 — back-compat 위해 null 전달.
      peerAssignDue: null,
      selfReviewDue: null,
      peerReviewDue: null,
      calibrationDue: null,
      includeMode,
      memberIds: targetIds,
      // §4.1.1 제외 조건 필터 결과 — 소비 측이 생성 후 eval_cycle_exclusions 로 영속한다.
      exclusions,
      // R1b 경로 B — 위원회를 지금 구성하면 생성 후 캘리브레이션 세션도 함께 만든다.
      committee:
        committeeOn && committee.length > 0
          ? committee.map((userId, i) => ({
              userId,
              role: i === 0 ? 'chair' : 'member',
            }))
          : undefined,
    };
    onSubmit(payload);
  };

  // TC-028 현재 위자드 설정을 프리셋으로 저장.
  const [presetName, setPresetName] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [presetSaved, setPresetSaved] = useState(false);
  const handleSavePreset = () => {
    if (!onSavePreset || !presetName.trim()) return;
    onSavePreset({
      name: presetName.trim(),
      reviewSequence: {
        order: displayPhases.map((p) => p.id),
        enabled: Object.fromEntries(
          displayPhases.map((p) => [p.id, !disabledPhases.has(p.id)]),
        ),
        schedule: Object.fromEntries(
          displayPhases.map((p) => [p.id, scheduleOf(p.id)]),
        ),
        templateMap: phaseTemplateMap,
        gradeCardPosition,
        roleMode,
      },
      targetConfig: { reviewTypes, peerAssignModes, peerVisibility },
    });
    setPresetSaved(true);
    setPresetName('');
  };

  // TC-028 프리셋 불러오기 → 기본 설정 프리필(리뷰종류·배정방식·공개·등급위치·일정).
  const handleLoadPreset = async (presetId) => {
    setSelectedPresetId(presetId);
    if (!presetId || !onLoadPreset) return;
    const preset = await onLoadPreset(presetId);
    const cfg = preset?.targetConfig || {};
    if (Array.isArray(cfg.reviewTypes)) setReviewTypes(cfg.reviewTypes);
    if (Array.isArray(cfg.peerAssignModes))
      setPeerAssignModes(cfg.peerAssignModes);
    if (typeof cfg.peerVisibility === 'boolean')
      setPeerVisibility(cfg.peerVisibility);
    const rs = preset?.reviewSequence;
    if (rs?.gradeCardPosition) setGradeCardPosition(rs.gradeCardPosition);
    if (rs?.schedule) setSchedule(rs.schedule);
  };

  return createPortal(
    <div className="evc-modal-overlay" onClick={onCancel}>
      <div className="evc-wiz" onClick={(e) => e.stopPropagation()}>
        <div className="evc-wiz-header">
          <h3 className="evc-modal-title">{L.createTitle}</h3>
          <button type="button" className="evc-wiz-close" onClick={onCancel} aria-label={L.cancel}>
            ✕
          </button>
        </div>

        <StepBar steps={steps} current={step} labels={L} onJump={setStep} />

        <div className="evc-wiz-body">
          {step === 0 && (
            <div className="evc-wiz-panel">
              {/* TC-028 저장된 설정 프리셋 불러오기 */}
              {presets.length > 0 && onLoadPreset && (
                <div className="evc-wiz-preset-load">
                  <label className="evc-field-label" htmlFor="evc-wiz-preset">
                    {L.presetLoadLabel}
                  </label>
                  <select
                    id="evc-wiz-preset"
                    className="evc-input"
                    value={selectedPresetId}
                    onChange={(e) => handleLoadPreset(e.target.value)}
                    data-testid="evc-wiz-preset-load"
                  >
                    <option value="">{L.presetLoadPlaceholder}</option>
                    {presets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <label className="evc-field-label" htmlFor="evc-wiz-name">{L.cycleName}</label>
              <input
                id="evc-wiz-name"
                className="evc-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={L.cycleNamePlaceholder}
                autoFocus
                data-testid="evc-wiz-name"
              />
              <div className="evc-field-grid">
                <div>
                  <label className="evc-field-label">{L.startDate}</label>
                  <button
                    type="button"
                    className={`evc-input evc-date-btn${picker?.field === 'start' ? ' is-open' : ''}`}
                    style={{ textAlign: 'left', cursor: 'pointer' }}
                    onClick={openPicker('start')}
                    data-testid="evc-wiz-start"
                  >
                    {startDate || <span style={{ opacity: 0.45 }}>YYYY-MM-DD</span>}
                  </button>
                </div>
                <div>
                  <label className="evc-field-label">{L.endDate}</label>
                  <button
                    type="button"
                    className={`evc-input evc-date-btn${picker?.field === 'end' ? ' is-open' : ''}`}
                    style={{ textAlign: 'left', cursor: 'pointer' }}
                    onClick={openPicker('end')}
                    data-testid="evc-wiz-end"
                  >
                    {endDate || <span style={{ opacity: 0.45 }}>YYYY-MM-DD</span>}
                  </button>
                </div>
              </div>
              {picker && (
                <DatePicker
                  anchorRect={picker.rect}
                  anchorEl={picker.el}
                  selectedDate={isoToDate(picker.field === 'start' ? startDate : endDate)}
                  onSelect={(d) => {
                    const iso = dateToIso(d);
                    if (picker.field === 'start') setStartDate(iso);
                    else setEndDate(iso);
                    setPicker(null);
                  }}
                  onClose={() => setPicker(null)}
                />
              )}

              <span className="evc-field-label">{L.reviewTypes}</span>
              <div className="evc-type-row">
                {['self', 'peer', 'upward', 'leader'].map((t) => (
                  <button
                    type="button"
                    key={t}
                    className={`evc-type-chip${reviewTypes.includes(t) ? ' is-on' : ''}`}
                    onClick={() => toggleType(t)}
                    data-testid={`evc-wiz-type-${t}`}
                  >
                    {L[REVIEW_TYPE_KEYS[t]]}
                  </button>
                ))}
              </div>
              {reviewTypes.length === 0 && (
                <p
                  className="evc-wiz-warn"
                  data-testid="evc-wiz-alltype-off"
                >
                  {L.allTypesOffWarn}
                </p>
              )}

              {hasPeer && (
                <>
                  <span className="evc-field-label">{L.peerAssignModeLabel}</span>
                  <div className="evc-mode-list">
                    {PEER_MODES.map((m) => (
                      <button
                        type="button"
                        key={m.key}
                        className={`evc-mode-item${peerAssignModes.includes(m.key) ? ' is-on' : ''}`}
                        onClick={() => togglePeerMode(m.key)}
                        data-testid={`evc-wiz-mode-${m.key}`}
                      >
                        <span className="evc-member-check" />
                        <span className="evc-mode-name">{L[m.label]}</span>
                        {m.badge && (
                          <span className={`evc-mode-badge${m.badge === 'exceptionBadge' ? ' is-warn' : ''}`}>
                            {L[m.badge]}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  <label className="evl-promo-row" style={{ marginTop: 'var(--spacing-md, 8px)' }}>
                    <input
                      type="checkbox"
                      checked={peerVisibility}
                      onChange={(e) => setPeerVisibility(e.target.checked)}
                      data-testid="evc-wiz-peer-visibility"
                    />
                    <span>{L.peerVisibilityLabel}</span>
                  </label>
                </>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="evc-wiz-panel">
              <p className="evc-wiz-hint">{L.templateHint}</p>

              <span className="evc-field-label">{L.templateTypeLabel}</span>
              <div className="evc-type-row">
                {TEMPLATE_TYPES.map((rt) => (
                  <button
                    type="button"
                    key={rt.id}
                    className={`evc-type-chip${tplType === rt.id ? ' is-on' : ''}${reviewTypes.includes(rt.id) ? '' : ' is-dim'}`}
                    onClick={() => selectTplType(rt.id)}
                    data-testid={`evc-tpl-type-${rt.id}`}
                  >
                    {L[rt.nameKey]}
                  </button>
                ))}
              </div>

              <span className="evc-field-label">{L.templateNameLabel}</span>
              <input
                className="evc-input"
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
                placeholder={L.templateNamePlaceholder}
                data-testid="evc-tpl-name"
              />

              <span className="evc-field-label">{L.templateVersionLabel}</span>
              <div className="evc-tpl-presets">
                {TEMPLATE_PRESET_META.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    className={`evc-tpl-preset${tplVersion === p.id ? ' is-on' : ''}`}
                    onClick={() => selectTplPreset(p.id)}
                    data-testid={`evc-tpl-version-${p.id}`}
                  >
                    <span className="evc-tpl-preset-icon"><p.Icon size={20} /></span>
                    <span className="evc-tpl-preset-head">
                      <span className="evc-tpl-preset-label">
                        {L[p.labelKey]}
                        {tplVersion === p.id && tplIsCustomized ? ` ${L.tplCustomized}` : ''}
                      </span>
                      {p.recommended && <span className="evc-mode-badge">{L.recommendedBadge}</span>}
                    </span>
                    <span className="evc-tpl-preset-desc">{L[p.descKey]}</span>
                  </button>
                ))}
              </div>

              {roleLevels.length > 0 && (
                <>
                  <div className="evc-tpl-role-head">
                    <span className="evc-field-label">{L.roleVersionTitle}</span>
                    <div className="evc-type-row evc-tpl-rolemode">
                      <button
                        type="button"
                        className={`evc-type-chip${roleMode === 'uniform' ? ' is-on' : ''}`}
                        onClick={() => setRoleMode('uniform')}
                        data-testid="evc-tpl-rolemode-uniform"
                      >
                        {L.roleModeUniform}
                      </button>
                      <button
                        type="button"
                        className={`evc-type-chip${roleMode === 'by_role' ? ' is-on' : ''}`}
                        onClick={() => setRoleMode('by_role')}
                        data-testid="evc-tpl-rolemode-byrole"
                      >
                        {L.roleModeByRole}
                      </button>
                    </div>
                  </div>
                  {roleMode === 'uniform' ? (
                    <p className="evc-wiz-hint">
                      {fill(L.roleUniformNote, {
                        version: L[TEMPLATE_VERSIONS.find((v) => v.id === tplVersion)?.labelKey],
                      })}
                    </p>
                  ) : (
                    <div className="evc-tpl-roles">
                      {roleLevels.map((role) => (
                        <div key={role} className="evc-tpl-role-row">
                          <span className="evc-tpl-role-name">{role}</span>
                          <div className="evc-tpl-role-versions">
                            {TEMPLATE_VERSIONS.map((v) => (
                              <button
                                type="button"
                                key={v.id}
                                className={`evc-tpl-role-ver${roleVersionOf(role) === v.id ? ' is-on' : ''}`}
                                onClick={() => setRoleVersion(role, v.id)}
                                data-testid={`evc-tpl-role-${role}-${v.id}`}
                              >
                                {L[v.labelKey]}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              <div className="evc-tpl-items-head">
                <span className="evc-field-label">
                  {L.templateItemsLabel} ({tplQuestions.length})
                </span>
                <button
                  type="button"
                  className="evc-btn is-ghost"
                  onClick={() => setTplPreview('all')}
                  data-testid="evc-tpl-preview-all"
                >
                  <EyeIcon size={15} /> {L.templatePreview}
                </button>
              </div>
              <div className="evc-tpl-items">
                {tplQuestions.map((q, idx) => (
                  <div
                    key={q.id}
                    draggable
                    onDragStart={() => setTplDragIdx(idx)}
                    onDragOver={(e) => { e.preventDefault(); setTplDragOverIdx(idx); }}
                    onDrop={() => tplDrop(idx)}
                    onDragEnd={() => { setTplDragIdx(null); setTplDragOverIdx(null); }}
                    className={`evc-tpl-item${tplDragOverIdx === idx && tplDragIdx !== idx ? ' is-over' : ''}${tplDragIdx === idx ? ' is-dragging' : ''}`}
                    data-testid={`evc-tpl-item-${q.id}`}
                  >
                    <span className="evc-tpl-item-handle" title={L.phaseDragHint}>
                      <GripIcon size={12} />
                    </span>
                    <span
                      className="evc-tpl-item-section"
                      style={{
                        color: sectionColor(q.section),
                        background: 'color-mix(in srgb, currentColor 12%, transparent)',
                      }}
                    >
                      {q.section}
                    </span>
                    <span className="evc-tpl-item-text">{q.text}</span>
                    <span className="evc-tpl-item-type">
                      {L[QUESTION_TYPES.find((t) => t.id === q.type)?.labelKey] || q.type}
                    </span>
                    {q.ai && <span className="evc-mode-badge evc-tpl-ai">{L.templateAiBadge}</span>}
                    {q.type === 'rating' && (
                      <button
                        type="button"
                        className={`evc-tpl-rationale${q.requiresRationale ? ' is-on' : ''}`}
                        onClick={() => toggleRationale(q.id)}
                        data-testid={`evc-tpl-rationale-${q.id}`}
                      >
                        <PencilIcon size={13} /> {q.requiresRationale ? L.rationaleRequired : L.rationaleOptional}
                      </button>
                    )}
                    {/* TC-053 이 항목을 피평가자에게 숨김(위원회·매니저·HR만) */}
                    <button
                      type="button"
                      className={`evc-tpl-rationale${q.hideFromEvaluatee ? ' is-on' : ''}`}
                      onClick={() =>
                        setTplQuestions((qs) =>
                          qs.map((x) =>
                            x.id === q.id
                              ? { ...x, hideFromEvaluatee: !x.hideFromEvaluatee }
                              : x,
                          ),
                        )
                      }
                      title={L.hideFromEvaluateeHint}
                      data-testid={`evc-tpl-hide-${q.id}`}
                    >
                      {q.hideFromEvaluatee ? (
                        <><LockIcon size={13} /> {L.hideFromEvaluateeOn}</>
                      ) : (
                        <><EyeIcon size={13} /> {L.hideFromEvaluateeOff}</>
                      )}
                    </button>
                    <button
                      type="button"
                      className="evc-tpl-x"
                      onClick={() => setTplPreview({ questionId: q.id })}
                      aria-label={L.templatePreview}
                      data-testid={`evc-tpl-item-preview-${q.id}`}
                    >
                      <EyeIcon size={15} />
                    </button>
                    <button
                      type="button"
                      className="evc-tpl-x"
                      onClick={() => removeQuestion(q.id)}
                      aria-label={L.delete}
                      data-testid={`evc-tpl-item-del-${q.id}`}
                    >
                      ✕
                    </button>
                    {/* TC-051/052 항목 설명(작성 안내 툴팁) 입력 — 항목 아래 전체폭 */}
                    <input
                      type="text"
                      className="evc-tpl-item-desc"
                      value={q.description ?? ''}
                      placeholder={L.itemDescPlaceholder}
                      onChange={(e) =>
                        setTplQuestions((qs) =>
                          qs.map((x) =>
                            x.id === q.id
                              ? { ...x, description: e.target.value }
                              : x,
                          ),
                        )
                      }
                      data-testid={`evc-tpl-desc-${q.id}`}
                    />
                  </div>
                ))}
              </div>
              <AddQuestionRow onAdd={addQuestion} labels={L} />

              <span className="evc-field-label">{L.templateGradesLabel}</span>
              <label className="evl-promo-row">
                <input
                  type="checkbox"
                  checked={tplAbsolute}
                  onChange={(e) => setTplAbsolute(e.target.checked)}
                  data-testid="evc-tpl-absolute"
                />
                <span>{L.templateAbsolute}</span>
              </label>
              {!tplAbsolute && (
                <select
                  className="evc-input"
                  value={tplRatioScope}
                  onChange={(e) => setTplRatioScope(e.target.value)}
                  data-testid="evc-tpl-ratioscope"
                >
                  {RATIO_SCOPES.map((r) => (
                    <option key={r.id} value={r.id}>{L[r.labelKey]}</option>
                  ))}
                </select>
              )}
              <div className="evc-tpl-grades">
                {tplGrades.map((g, i) => (
                  <div key={i} className="evc-tpl-grade">
                    <input
                      className={`evc-input${
                        g.label.trim() &&
                        tplDupLabels.has(g.label.trim().toLowerCase())
                          ? ' is-invalid'
                          : ''
                      }`}
                      value={g.label}
                      placeholder={L.gradeLabelPlaceholder}
                      onChange={(e) => updateGrade(i, 'label', e.target.value)}
                      data-testid={`evc-tpl-grade-label-${i}`}
                    />
                    <input
                      className="evc-input"
                      value={g.desc}
                      placeholder={L.gradeDescPlaceholder}
                      onChange={(e) => updateGrade(i, 'desc', e.target.value)}
                    />
                    {!tplAbsolute && (
                      <input
                        type="number"
                        className="evc-input evc-tpl-grade-ratio"
                        value={g.ratio}
                        onChange={(e) => updateGrade(i, 'ratio', Number(e.target.value))}
                        data-testid={`evc-tpl-grade-ratio-${i}`}
                      />
                    )}
                    <button
                      type="button"
                      className="evc-tpl-x"
                      onClick={() => removeGrade(i)}
                      disabled={tplGrades.length <= MIN_GRADES}
                      aria-label={L.delete}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <div className="evc-tpl-grade-foot">
                <button
                  type="button"
                  className="evc-btn is-ghost"
                  onClick={addGrade}
                  disabled={tplGrades.length >= MAX_GRADES}
                  data-testid="evc-tpl-add-grade"
                >
                  {L.templateAddGrade}
                </button>
                {!tplAbsolute && (
                  <span className={`evc-tpl-ratiosum${tplRatioInvalid ? ' is-invalid' : ''}`}>
                    {fill(L.templateRatioSum, { sum: tplRatioSum })}
                  </span>
                )}
                {tplDupLabels.size > 0 && (
                  <span
                    className="evc-tpl-ratiosum is-invalid"
                    data-testid="evc-tpl-dup-warn"
                  >
                    {L.templateDupWarn}
                  </span>
                )}
              </div>

              {/* §4.2.2-B 최종 등급 카드 위치는 하향 리뷰 템플릿 설정 영역 소속.
                  기본 정보 스텝에 있던 것을 등급 체계 바로 아래로 옮겼다. */}
              {tplType === 'leader' && (
                <div className="evc-wiz-gradepos">
                  <span className="evc-field-label">{L.gradePosLabel}</span>
                  <div className="evc-type-row">
                    {['top', 'bottom', 'freeze'].map((pos) => (
                      <button
                        type="button"
                        key={pos}
                        className={`evc-type-chip${gradeCardPosition === pos ? ' is-on' : ''}`}
                        onClick={() => setGradeCardPosition(pos)}
                        data-testid={`evc-wiz-gradepos-${pos}`}
                      >
                        {L[`gradePos_${pos}`]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="evc-tpl-lib">
                <button
                  type="button"
                  className="evc-btn is-primary"
                  onClick={saveTemplate}
                  disabled={!tplName.trim() || !tplGradesValid}
                  data-testid="evc-tpl-save"
                >
                  {L.templateSave}
                </button>
                {savedTemplates.length > 0 && (
                  <div className="evc-tpl-lib-list">
                    {savedTemplates.map((t) => (
                      <div key={t.id} className="evc-tpl-lib-item">
                        <span className="evc-mode-badge">
                          {L[TEMPLATE_TYPES.find((x) => x.id === t.reviewType)?.nameKey]}
                        </span>
                        <span className="evc-tpl-lib-name">{t.name}</span>
                        <span className="evc-tpl-lib-meta">
                          {fill(L.templateMeta, {
                            items: t.questions.length,
                            grades: t.grades.length,
                          })}
                        </span>
                        <button
                          type="button"
                          className="evc-btn is-ghost"
                          onClick={() => loadTemplate(t)}
                          data-testid={`evc-tpl-load-${t.id}`}
                        >
                          {L.templateLoad}
                        </button>
                        <button
                          type="button"
                          className="evc-tpl-x"
                          onClick={() => deleteTemplate(t.id)}
                          aria-label={L.delete}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {tplPreview && (
                <TemplatePreviewModal
                  questions={tplQuestions}
                  grades={tplGrades}
                  focus={tplPreview === 'all' ? null : tplPreview}
                  onClose={() => setTplPreview(null)}
                  labels={L}
                />
              )}
            </div>
          )}

          {step === 2 && (
            <div className="evc-wiz-panel">
              <p className="evc-wiz-hint">{L.scheduleHint}</p>
              {overlapPairs.length > 0 && (
                <div className="evc-sched-overlap-note" data-testid="evc-sched-overlap">
                  {L.scheduleOverlapNote}
                </div>
              )}
              {(() => {
                let n = 0;
                return displayPhases.map((ph) => {
                  const enabled = !disabledPhases.has(ph.id);
                  if (enabled) n += 1;
                  const isOver =
                    overId === ph.id && !ph.anchor && dragId && dragId !== ph.id;
                  const rtype = PHASE_TO_REVIEW_TYPE[ph.id];
                  const sc = scheduleOf(ph.id);
                  return (
                    <div
                      key={ph.id}
                      draggable={!ph.anchor}
                      onDragStart={() => { if (!ph.anchor) setDragId(ph.id); }}
                      onDragOver={(e) => { if (!ph.anchor && dragId) { e.preventDefault(); setOverId(ph.id); } }}
                      onDrop={() => { if (!ph.anchor) movePhase(ph.id); setDragId(null); setOverId(null); }}
                      onDragEnd={() => { setDragId(null); setOverId(null); }}
                      className={`evc-sched-card${ph.required ? ' is-required' : ''}${enabled ? '' : ' is-off'}${isOver ? ' is-over' : ''}${enabled && overlapIds.has(ph.id) ? ' has-overlap' : ''}`}
                      data-testid={`evc-sched-card-${ph.id}`}
                    >
                      <div className="evc-sched-head">
                        <span
                          className="evc-sched-handle"
                          title={ph.anchor ? L.phaseFixedHint : L.phaseDragHint}
                        >
                          {ph.anchor ? <LockIcon /> : <GripIcon />}
                        </span>
                        <span className="evc-sched-num">{enabled ? n : '–'}</span>
                        <span className="evc-sched-name">{L[ph.nameKey]}</span>
                        <span className="evc-sched-owner">
                          {L.ownerLabel}: {L[ph.targetKey]}
                        </span>
                        {ph.required && <span className="evc-mode-badge">{L.badgeRequired}</span>}
                        {ph.anchor && <span className="evc-mode-badge is-muted">{L.badgeFixed}</span>}
                        {!enabled && <span className="evc-mode-badge is-muted">{L.badgeUnused}</span>}
                        {enabled && overlapIds.has(ph.id) && (
                          <span className="evc-mode-badge is-warn">{L.badgeParallel}</span>
                        )}
                        <button
                          type="button"
                          className={`evc-sched-toggle${enabled ? ' is-on' : ''}${ph.required ? ' is-locked' : ''}`}
                          onClick={() => { if (!ph.required) togglePhaseEnabled(ph.id); }}
                          disabled={ph.required}
                          aria-pressed={enabled}
                          data-testid={`evc-sched-toggle-${ph.id}`}
                        >
                          <span className="evc-sched-toggle-dot" />
                        </button>
                      </div>
                      {enabled && (
                        <div className="evc-sched-fields">
                          {['start', 'end'].map((field) => (
                            <div className="evc-sched-field" key={field}>
                              <span className="evc-field-label">
                                {field === 'start' ? L.startDateTime ?? L.startDate : L.endDateTime ?? L.endDate}
                              </span>
                              <div className="evc-sched-dt">
                                <button
                                  type="button"
                                  className={`evc-input evc-date-btn${schedPicker?.phaseId === ph.id && schedPicker?.field === field ? ' is-open' : ''}`}
                                  style={{ textAlign: 'left', cursor: 'pointer' }}
                                  onClick={openSchedPicker(ph.id, field)}
                                  data-testid={`evc-sched-${field}-${ph.id}`}
                                >
                                  {datePart(sc[field]) || <span style={{ opacity: 0.45 }}>YYYY-MM-DD</span>}
                                </button>
                                <input
                                  type="time"
                                  className="evc-input evc-time-input"
                                  value={timePart(sc[field], field)}
                                  onChange={(e) => updateSchedTime(ph.id, field, e.target.value)}
                                  disabled={!datePart(sc[field])}
                                  aria-label={field === 'start' ? L.startTime : L.endTime}
                                  data-testid={`evc-sched-${field}-time-${ph.id}`}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {enabled && (
                        <div className="evc-rm-block" data-testid={`evc-rm-block-${ph.id}`}>
                          <div className="evc-rm-head">
                            <span className="evc-field-label"><BellIcon size={13} /> {L.reminderLabel}</span>
                            <span className="evc-rm-count">
                              {fill(L.reminderCount, { count: remindersOf(ph.id).length })}
                            </span>
                            <span className="evc-rm-hint">{L.reminderHint}</span>
                          </div>
                          {remindersOf(ph.id).length === 0 ? (
                            <div className="evc-rm-empty">{L.reminderEmpty}</div>
                          ) : (
                            <div className="evc-rm-list">
                              {remindersOf(ph.id).map((rm, i) => (
                                <div
                                  key={rm.id}
                                  className="evc-rm-row"
                                  data-testid={`evc-rm-${ph.id}-${i}`}
                                >
                                  <div className="evc-rm-main">
                                    <span className="evc-rm-num">{i + 1}</span>
                                    <select
                                      className="evc-rm-field"
                                      value={rm.anchor}
                                      onChange={(e) => updateReminder(ph.id, rm.id, 'anchor', e.target.value)}
                                    >
                                      {REMINDER_ANCHORS.map((a) => (
                                        <option key={a.id} value={a.id}>{L[a.labelKey]}</option>
                                      ))}
                                    </select>
                                    <span className="evc-rm-inline">
                                      <span className="evc-rm-dtext">D-</span>
                                      <input
                                        type="number"
                                        min={0}
                                        max={60}
                                        className="evc-rm-field evc-rm-offset"
                                        value={rm.offset}
                                        onChange={(e) =>
                                          updateReminder(
                                            ph.id, rm.id, 'offset',
                                            Math.max(0, Math.min(60, Number(e.target.value) || 0)),
                                          )}
                                      />
                                      <span className="evc-rm-unit">{L.reminderDay}</span>
                                    </span>
                                    <span className="evc-rm-inline">
                                      <span className="evc-rm-unit">{L.reminderTime}</span>
                                      <input
                                        type="time"
                                        className="evc-rm-field"
                                        value={rm.time}
                                        onChange={(e) => updateReminder(ph.id, rm.id, 'time', e.target.value)}
                                      />
                                    </span>
                                    <span className="evc-rm-channels">
                                      {REMINDER_CHANNELS.map((ch) => {
                                        const on = rm.channels.includes(ch.id);
                                        return (
                                          <button
                                            key={ch.id}
                                            type="button"
                                            className={`evc-rm-ch${on ? ' is-on' : ''}`}
                                            onClick={() => toggleChannel(ph.id, rm.id, ch.id)}
                                            data-testid={`evc-rm-ch-${ph.id}-${i}-${ch.id}`}
                                          >
                                            <ch.Icon size={14} /> {L[ch.labelKey]}
                                          </button>
                                        );
                                      })}
                                    </span>
                                    <button
                                      type="button"
                                      className={`evc-rm-detail-btn${rmDetail.has(rm.id) ? ' is-open' : ''}`}
                                      onClick={() => toggleRmDetail(rm.id)}
                                      title={L.reminderDetail}
                                      data-testid={`evc-rm-detail-${ph.id}-${i}`}
                                    >
                                      <GearIcon size={12} /> {L.reminderDetail} {rmDetail.has(rm.id) ? '▲' : '▼'}
                                    </button>
                                    <button
                                      type="button"
                                      className="evc-rm-del"
                                      onClick={() => removeReminder(ph.id, rm.id)}
                                      title={L.reminderDelete}
                                      data-testid={`evc-rm-del-${ph.id}-${i}`}
                                    >
                                      ×
                                    </button>
                                  </div>
                                  <div className="evc-rm-summary">
                                    <span className="evc-rm-sum-label">{L.reminderRecipients}</span>
                                    <span className="evc-rm-sum-chip is-primary">
                                      {L[PHASE_RESPONDER_SHORT[ph.id]] ?? L.reminderRespSelf}
                                    </span>
                                    {rm.channels.map((cid) => {
                                      const ch = REMINDER_CHANNELS.find((c) => c.id === cid);
                                      return (
                                        <span key={cid} className="evc-rm-sum-ch">
                                          <ch.Icon size={13} /> {L[ch.labelKey]}
                                        </span>
                                      );
                                    })}
                                  </div>
                                  {rmDetail.has(rm.id) && (
                                    <div
                                      className="evc-rm-detail"
                                      data-testid={`evc-rm-detail-panel-${ph.id}-${i}`}
                                    >
                                      {/* 1. 수신 대상 */}
                                      <div className="evc-rm-dsec">
                                        <div className="evc-rm-dsec-title"><UsersIcon size={13} /> {L.reminderTargetsTitle}</div>
                                        <div className="evc-rm-tgts">
                                          {REMINDER_TARGETS.map((t) => {
                                            const dup = !t.fixed && PHASE_RESPONDER_ROLE[ph.id] === t.id;
                                            const on = t.fixed || (rm.targets?.[t.id] && !dup);
                                            const disabled = t.fixed || dup;
                                            return (
                                              <button
                                                key={t.id}
                                                type="button"
                                                disabled={disabled}
                                                className={`evc-rm-tgt${on ? ' is-on' : ''}${dup ? ' is-dup' : ''}`}
                                                onClick={() =>
                                                  !disabled &&
                                                  patchReminder(ph.id, rm.id, (r) => ({
                                                    targets: { ...r.targets, [t.id]: !r.targets?.[t.id] },
                                                  }))}
                                                data-testid={`evc-rm-tgt-${ph.id}-${i}-${t.id}`}
                                              >
                                                {on ? '✓' : '+'}{' '}
                                                {t.fixed
                                                  ? `${L[PHASE_RESPONDER_SHORT[ph.id]] ?? L.reminderRespSelf} · ${L.reminderTgtFixed}`
                                                  : L[t.labelKey]}
                                                {dup ? ` · ${L.reminderTgtDup}` : ''}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                      {/* 2. 이메일 상세 */}
                                      {rm.channels.includes('email') && (
                                        <div className="evc-rm-dsec is-box">
                                          <div className="evc-rm-dsec-title"><MailIcon size={13} /> {L.reminderEmailTitle}</div>
                                          <label className="evc-rm-dfield">
                                            <span>{L.reminderEmailTpl}</span>
                                            <select
                                              className="evc-rm-field"
                                              value={rm.email?.template ?? 'default'}
                                              onChange={(e) =>
                                                patchReminder(ph.id, rm.id, (r) => ({
                                                  email: { ...r.email, template: e.target.value },
                                                }))}
                                              data-testid={`evc-rm-email-tpl-${ph.id}-${i}`}
                                            >
                                              {EMAIL_TEMPLATES.map((t) => (
                                                <option key={t.id} value={t.id}>{L[t.labelKey]}</option>
                                              ))}
                                            </select>
                                          </label>
                                          {(rm.email?.template ?? 'default') !== 'custom' ? (
                                            (() => {
                                              const tpl =
                                                EMAIL_TEMPLATE_PREVIEW[rm.email?.template] ??
                                                EMAIL_TEMPLATE_PREVIEW.default;
                                              return (
                                                <div className="evc-rm-preview">
                                                  <div className="evc-rm-preview-tag">
                                                    {L.reminderPreview} · {L.reminderReadonly}
                                                  </div>
                                                  <div className="evc-rm-preview-body">
                                                    <div><strong>{L.reminderEmailSubject}</strong> {tpl.subject}</div>
                                                    <div><strong>{L.reminderEmailBody}</strong> {tpl.body}</div>
                                                    <div className="evc-rm-preview-cta">[{L.reminderEmailCta}] {tpl.cta}</div>
                                                  </div>
                                                </div>
                                              );
                                            })()
                                          ) : (
                                            <div className="evc-rm-custom">
                                              <input
                                                type="text"
                                                className="evc-rm-field evc-rm-cinput"
                                                placeholder={L.reminderEmailSubjectPh}
                                                value={rm.email?.subject ?? ''}
                                                onChange={(e) =>
                                                  patchReminder(ph.id, rm.id, (r) => ({
                                                    email: { ...r.email, subject: e.target.value },
                                                  }))}
                                                data-testid={`evc-rm-email-subject-${ph.id}-${i}`}
                                              />
                                              <textarea
                                                className="evc-rm-field evc-rm-cbody"
                                                rows={4}
                                                placeholder={L.reminderEmailBodyPh}
                                                value={rm.email?.body ?? ''}
                                                onChange={(e) =>
                                                  patchReminder(ph.id, rm.id, (r) => ({
                                                    email: { ...r.email, body: e.target.value },
                                                  }))}
                                                data-testid={`evc-rm-email-body-${ph.id}-${i}`}
                                              />
                                              <div className="evc-rm-vars">
                                                <span className="evc-rm-vars-label">{L.reminderVarInsert}</span>
                                                {EMAIL_VARS.map((v) => (
                                                  <button
                                                    key={v}
                                                    type="button"
                                                    className="evc-rm-var"
                                                    onClick={() =>
                                                      patchReminder(ph.id, rm.id, (r) => ({
                                                        email: { ...r.email, body: (r.email?.body ?? '') + v },
                                                      }))}
                                                  >
                                                    {v}
                                                  </button>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                      {/* 3. 슬랙 상세 */}
                                      {rm.channels.includes('slack') && (
                                        <div className="evc-rm-dsec is-box">
                                          <div className="evc-rm-dsec-title"><ChatIcon size={13} /> {L.reminderSlackTitle}</div>
                                          <div className="evc-rm-tgts">
                                            {SLACK_SEND_MODES.map((m) => {
                                              const on = (rm.slack?.mode ?? 'dm') === m.id;
                                              return (
                                                <button
                                                  key={m.id}
                                                  type="button"
                                                  className={`evc-rm-tgt${on ? ' is-on' : ''}`}
                                                  onClick={() =>
                                                    patchReminder(ph.id, rm.id, (r) => ({
                                                      slack: { ...r.slack, mode: m.id },
                                                    }))}
                                                  data-testid={`evc-rm-slack-mode-${ph.id}-${i}-${m.id}`}
                                                >
                                                  <m.Icon size={14} /> {L[m.labelKey]}
                                                </button>
                                              );
                                            })}
                                          </div>
                                          {(rm.slack?.mode ?? 'dm') === 'channel' && (
                                            <div className="evc-rm-slack-ch">
                                              <select
                                                className="evc-rm-field"
                                                value={rm.slack?.channel ?? SLACK_CHANNELS[0]}
                                                onChange={(e) =>
                                                  patchReminder(ph.id, rm.id, (r) => ({
                                                    slack: { ...r.slack, channel: e.target.value },
                                                  }))}
                                                data-testid={`evc-rm-slack-channel-${ph.id}-${i}`}
                                              >
                                                {SLACK_CHANNELS.map((c) => (
                                                  <option key={c} value={c}>{c}</option>
                                                ))}
                                              </select>
                                              <button
                                                type="button"
                                                className={`evc-rm-tgt${rm.slack?.mention ? ' is-on' : ''}`}
                                                onClick={() =>
                                                  patchReminder(ph.id, rm.id, (r) => ({
                                                    slack: { ...r.slack, mention: !r.slack?.mention },
                                                  }))}
                                                data-testid={`evc-rm-slack-mention-${ph.id}-${i}`}
                                              >
                                                {rm.slack?.mention ? '✓' : '+'} {L.reminderSlackMention}
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          <button
                            type="button"
                            className="evc-rm-add"
                            onClick={() => addReminder(ph.id)}
                            data-testid={`evc-rm-add-${ph.id}`}
                          >
                            + {L.reminderAdd}
                          </button>
                        </div>
                      )}
                      {enabled && rtype && (() => {
                        const opts = savedTemplates.filter((t) => t.reviewType === rtype);
                        return (
                          <div className="evc-sched-tpl">
                            <span className="evc-field-label">
                              {L.appliedTemplate}{' '}
                              <span className="evc-mode-badge">{L[REVIEW_TYPE_KEYS[rtype]]}</span>
                            </span>
                            {opts.length === 0 ? (
                              <div className="evc-sched-tpl-empty">{L.templateEmptyHint}</div>
                            ) : (
                              <select
                                className="evc-input"
                                value={phaseTemplateMap[ph.id] || ''}
                                onChange={(e) =>
                                  setPhaseTemplateMap((m) => ({ ...m, [ph.id]: e.target.value }))
                                }
                                data-testid={`evc-sched-tpl-${ph.id}`}
                              >
                                <option value="">{L.templateSelectPlaceholder}</option>
                                {opts.map((t) => (
                                  <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  );
                });
              })()}
              {schedPicker && (
                <DatePicker
                  anchorRect={schedPicker.rect}
                  anchorEl={schedPicker.el}
                  selectedDate={isoToDate(scheduleOf(schedPicker.phaseId)[schedPicker.field])}
                  onSelect={(d) => {
                    updateSchedDate(schedPicker.phaseId, schedPicker.field, dateToIso(d));
                    setSchedPicker(null);
                  }}
                  onClose={() => setSchedPicker(null)}
                />
              )}
            </div>
          )}

          {step === 3 && (
            <div className="evc-wiz-panel">
              <div className="evc-type-row">
                {[
                  { mode: 'bulk', labelKey: 'targetModeAll' },
                  ...TARGET_AXES,
                  { mode: 'individual_select', labelKey: 'targetModeIndividual' },
                ].map(({ mode, labelKey }) => (
                  <button
                    type="button"
                    key={mode}
                    className={`evc-type-chip${includeMode === mode ? ' is-on' : ''}`}
                    onClick={() => setIncludeMode(mode)}
                    data-testid={`evc-wiz-mode-${mode}`}
                  >
                    {L[labelKey]}
                  </button>
                ))}
              </div>

              {activeAxis && (
                <>
                  <span className="evc-field-label">{L[activeAxis.headKey]}</span>
                  <div
                    className="evc-type-row"
                    data-testid={`evc-wiz-axis-options-${activeAxis.mode}`}
                  >
                    {axisOptions.map((v) => (
                      <button
                        type="button"
                        key={v}
                        className={`evc-type-chip${axisSelected.includes(v) ? ' is-on' : ''}`}
                        onClick={() => toggleAxisValue(activeAxis.mode, v)}
                        data-testid={`evc-wiz-axis-${v}`}
                      >
                        {v}
                      </button>
                    ))}
                    {axisOptions.length === 0 && (
                      <p className="evc-wiz-hint" data-testid="evc-wiz-axis-empty">
                        {L.targetAxisEmpty}
                      </p>
                    )}
                  </div>
                </>
              )}

              {includeMode === 'bulk' ? (
                <p className="evc-wiz-hint" data-testid="evc-wiz-bulk-note">
                  {fill(L.targetAllNote, { count: candidates.length })}
                </p>
              ) : includeMode !== 'individual_select' ? null : (
                <>
                  <input
                    className="evc-input"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder={L.searchMember}
                    data-testid="evc-wiz-member-search"
                  />
                  <p className="evc-wiz-hint">
                    {fill(L.selectedCount, { count: targetCount })}
                  </p>
                  <div className="evc-member-list">
                    {filteredCandidates.map((c) => (
                      <button
                        type="button"
                        key={c.id}
                        className={`evc-member-item${selectedIds.includes(c.id) ? ' is-on' : ''}`}
                        onClick={() => toggleMember(c.id)}
                        data-testid={`evc-wiz-member-${c.id}`}
                      >
                        <span className="evc-member-check" />
                        <span className="evc-member-name">{c.name}</span>
                        {c.department && (
                          <span className="evc-member-dept">{c.department}</span>
                        )}
                      </button>
                    ))}
                    {filteredCandidates.length === 0 && (
                      <p className="evc-wiz-hint">{L.noMembers}</p>
                    )}
                  </div>
                </>
              )}

              {/* §4.1.1 제외 조건 필터 — 개별 선택은 관리자가 직접 고른 명단이라 적용하지 않는다. */}
              {exclusionActive && (
                <div className="evc-excl-block" data-testid="evc-wiz-exclusions">
                  <span className="evc-field-label">{L.exclusionLabel}</span>
                  <p className="evc-wiz-hint">{L.exclusionHint}</p>
                  <label className="evl-promo-row">
                    <input
                      type="checkbox"
                      checked={excludeOnLeave}
                      onChange={(e) => setExcludeOnLeave(e.target.checked)}
                      data-testid="evc-wiz-excl-leave"
                    />
                    <span>{L.exclusionOnLeave}</span>
                  </label>
                  <label className="evl-promo-row">
                    <input
                      type="checkbox"
                      checked={excludeHireDate}
                      onChange={(e) => setExcludeHireDate(e.target.checked)}
                      data-testid="evc-wiz-excl-hiredate"
                    />
                    <span>{L.exclusionHireDate}</span>
                  </label>
                  {excludeHireDate && (
                    <div className="evc-excl-date">
                      <button
                        type="button"
                        className="evc-input evc-date-btn"
                        style={{ textAlign: 'left', cursor: 'pointer' }}
                        onClick={(e) =>
                          setHirePicker({
                            rect: e.currentTarget.getBoundingClientRect(),
                            el: e.currentTarget,
                          })
                        }
                        data-testid="evc-wiz-excl-hiredate-ref"
                      >
                        {hireDateRef || (
                          <span style={{ opacity: 0.45 }}>YYYY-MM-DD</span>
                        )}
                      </button>
                      <div className="evc-type-row">
                        {[
                          ['after', L.exclusionAfter],
                          ['before', L.exclusionBefore],
                        ].map(([dir, label]) => (
                          <button
                            type="button"
                            key={dir}
                            className={`evc-type-chip${hireDateDirection === dir ? ' is-on' : ''}`}
                            onClick={() => setHireDateDirection(dir)}
                            data-testid={`evc-wiz-excl-dir-${dir}`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* §4.1.2 0단계 '리뷰 & 조정' — 자동 산출된 명단을 사람이 최종 확인·가감한다. */}
              <div className="evc-review-block" data-testid="evc-wiz-review-adjust">
                <span className="evc-field-label">{L.targetReviewLabel}</span>
                <p className="evc-wiz-hint" data-testid="evc-wiz-target-summary">
                  {fill(L.targetReviewSummary, {
                    count: targetCount,
                    excluded: excludedMembers.length,
                  })}
                </p>
                <div className="evc-review-cols">
                  <div className="evc-review-col">
                    <span className="evc-review-col-head">
                      {fill(L.targetReviewIncluded, { count: targetMembers.length })}
                    </span>
                    <div className="evc-member-list">
                      {targetMembers.map((c) => (
                        <div key={c.id} className="evc-member-item is-static">
                          <span className="evc-member-name">{c.name}</span>
                          {c.department && (
                            <span className="evc-member-dept">{c.department}</span>
                          )}
                          <button
                            type="button"
                            className="evc-tpl-x"
                            onClick={() => excludeOne(c.id)}
                            aria-label={L.targetReviewExcludeOne}
                            title={L.targetReviewExcludeOne}
                            data-testid={`evc-wiz-exclude-${c.id}`}
                          >
                            →
                          </button>
                        </div>
                      ))}
                      {targetMembers.length === 0 && (
                        <p className="evc-wiz-hint">{L.noMembers}</p>
                      )}
                    </div>
                  </div>
                  <div className="evc-review-col">
                    <span className="evc-review-col-head">
                      {fill(L.targetReviewExcluded, { count: excludedMembers.length })}
                    </span>
                    <div className="evc-member-list">
                      {excludedMembers.map((c) => (
                        <div key={c.id} className="evc-member-item is-static is-off">
                          <button
                            type="button"
                            className="evc-tpl-x"
                            onClick={() => includeOne(c.id)}
                            aria-label={L.targetReviewIncludeOne}
                            title={L.targetReviewIncludeOne}
                            data-testid={`evc-wiz-include-${c.id}`}
                          >
                            ←
                          </button>
                          <span className="evc-member-name">{c.name}</span>
                          <span className="evc-member-dept">
                            {L[`exclusionType_${exclusionReasonOf(c.id)}`] ??
                              exclusionReasonOf(c.id)}
                          </span>
                        </div>
                      ))}
                      {excludedMembers.length === 0 && (
                        <p className="evc-wiz-hint">{L.targetReviewNoExcluded}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {hirePicker && (
                <DatePicker
                  anchorRect={hirePicker.rect}
                  anchorEl={hirePicker.el}
                  selectedDate={isoToDate(hireDateRef)}
                  onSelect={(d) => {
                    setHireDateRef(dateToIso(d));
                    setHirePicker(null);
                  }}
                  onClose={() => setHirePicker(null)}
                />
              )}
            </div>
          )}

          {step === 4 && (
            <div className="evc-wiz-panel">
              <label className="evc-wiz-committee-toggle">
                <input
                  type="checkbox"
                  checked={committeeOn}
                  onChange={(e) => setCommitteeOn(e.target.checked)}
                  data-testid="evc-wiz-committee-toggle"
                />
                <span>{L.wizardCommitteeEnable}</span>
              </label>
              <p className="evc-wiz-hint">{L.wizardCommitteeHint}</p>
              {committeeOn && (
                <>
                  {committeeCandidates.length === 0 ? (
                    <p className="evc-wiz-hint">{L.wizardCommitteeEmpty}</p>
                  ) : (
                    <div className="evc-wiz-committee-list">
                      {committeeCandidates.map((c) => {
                        const idx = committee.indexOf(c.id);
                        const on = idx >= 0;
                        return (
                          <button
                            type="button"
                            key={c.id}
                            className={`evc-wiz-committee-item${on ? ' is-on' : ''}`}
                            onClick={() =>
                              setCommittee((prev) =>
                                prev.includes(c.id)
                                  ? prev.filter((x) => x !== c.id)
                                  : [...prev, c.id],
                              )
                            }
                            data-testid="evc-wiz-committee-item"
                          >
                            <span className="evc-wiz-committee-name">
                              {c.name}
                              {on && idx === 0 && (
                                <span className="evc-wiz-committee-chair">
                                  {L.wizardCommitteeChair}
                                </span>
                              )}
                            </span>
                            <span className="evc-wiz-committee-meta">
                              {c.kind === 'lead'
                                ? L.wizardCommitteeLead
                                : L.wizardCommitteeSenior}
                              {c.dept ? ` · ${c.dept}` : ''}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <p className="evc-wiz-hint">{L.wizardCommitteeChairHint}</p>
                </>
              )}
            </div>
          )}

          {step === 5 && (
            <div className="evc-wiz-panel">
              <div className="evc-summary-card">
                <div className="evc-summary-row"><span>{L.cycleName}</span><b>{name}</b></div>
                <div className="evc-summary-row"><span>{L.period}</span><b>{startDate} ~ {endDate}</b></div>
                <div className="evc-summary-row">
                  <span>{L.reviewTypes}</span>
                  <b>{reviewTypes.map((t) => L[REVIEW_TYPE_KEYS[t]]).join(' · ')}</b>
                </div>
                {hasPeer && (
                  <div className="evc-summary-row">
                    <span>{L.peerAssignModeLabel}</span>
                    <b>
                      {peerAssignModes
                        .map((k) => L[PEER_MODES.find((m) => m.key === k)?.label])
                        .join(' · ')}
                    </b>
                  </div>
                )}
                {hasPeer && (
                  <div className="evc-summary-row">
                    <span>{L.peerVisibilityLabel}</span>
                    <b>{peerVisibility ? L.peerVisibilityOn : L.peerVisibilityOff}</b>
                  </div>
                )}
                <div className="evc-summary-row">
                  <span>{L.targetSummaryLabel}</span>
                  <b>{fill(L.targetSummaryValue, { count: targetCount })}</b>
                </div>
                <div className="evc-summary-row">
                  <span>{L.wizardStepCommittee}</span>
                  <b>
                    {committeeOn && committee.length > 0
                      ? fill(L.wizardCommitteeSummary, {
                          count: committee.length,
                        })
                      : L.wizardCommitteeNone}
                  </b>
                </div>
                <div className="evc-summary-row">
                  <span>{L.scheduleSummaryLabel}</span>
                  <b>
                    {displayPhases
                      .filter((p) => !disabledPhases.has(p.id))
                      .map((p) => L[p.nameKey])
                      .join(' · ')}
                  </b>
                </div>
              </div>
              <p className="evc-wiz-hint">{L.createDraftHint}</p>
              {/* TC-028 이 설정을 프리셋으로 저장 */}
              {onSavePreset && (
                <div className="evc-wiz-preset-save" data-testid="evc-wiz-preset-save">
                  <span className="evc-field-label">{L.presetSaveLabel}</span>
                  <div className="evc-wiz-preset-save-row">
                    <input
                      className="evc-input"
                      value={presetName}
                      placeholder={L.presetSavePlaceholder}
                      onChange={(e) => {
                        setPresetName(e.target.value);
                        setPresetSaved(false);
                      }}
                      data-testid="evc-wiz-preset-name"
                    />
                    <button
                      type="button"
                      className="evc-btn is-ghost"
                      disabled={!presetName.trim()}
                      onClick={handleSavePreset}
                      data-testid="evc-wiz-preset-save-btn"
                    >
                      {L.presetSaveButton}
                    </button>
                  </div>
                  {presetSaved && (
                    <span className="evc-tpl-saved" data-testid="evc-wiz-preset-saved">
                      ✓ {L.presetSaved}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="evc-wiz-footer">
          <button type="button" className="evc-btn is-ghost" onClick={step === 0 ? onCancel : () => setStep(step - 1)}>
            {step === 0 ? L.cancel : L.prev}
          </button>
          {step < steps.length - 1 ? (
            <button
              type="button"
              className="evc-btn is-primary"
              disabled={!canAdvance}
              onClick={() => setStep(step + 1)}
              data-testid="evc-wiz-next"
            >
              {L.next}
            </button>
          ) : (
            <button type="button" className="evc-btn is-primary" onClick={submit} data-testid="evc-wiz-submit">
              {L.create}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
