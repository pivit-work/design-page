import { useState } from 'react';
import { createPortal } from 'react-dom';
import DatePicker from '../shared/DatePicker.jsx';
import { CheckCircleIcon, InfoIcon } from './evalIcons.jsx';

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
// 불러온 원본 표시 — 클립.
function PaperclipIcon({ size = 16 }) {
  return (
    <svg {...svgProps(size)}>
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}
// 전체 목록에서 찾기 — 폴더.
function FolderIcon({ size = 16 }) {
  return (
    <svg {...svgProps(size)}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
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

// PW-443 4 대상자 — 조직 트리 · 5축 필터 · 대상/제외 이동에 쓰는 글리프.
// 돋보기·깔때기·삼각·화살표·닫기를 이모지 글리프로 쓰지 않는다 — OS·폰트마다 모양이
// 갈리고, color 를 상속하지 못해 상태별 색을 줄 수 없다.
function SearchIcon({ size = 14 }) {
  return (
    <svg {...svgProps(size)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
function FilterIcon({ size = 14 }) {
  return (
    <svg {...svgProps(size)}>
      <path d="M3 5h18l-7 8v6l-4 2v-8Z" />
    </svg>
  );
}
/** 접기·펴기 삼각. `open` 이면 아래, 아니면 오른쪽. */
function CaretIcon({ size = 12, open = false }) {
  return (
    <svg {...svgProps(size)}>
      {open ? <path d="m6 9 6 6 6-6" /> : <path d="m9 6 6 6-6 6" />}
    </svg>
  );
}
function ArrowRightIcon({ size = 13 }) {
  return (
    <svg {...svgProps(size)}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}
function ArrowLeftIcon({ size = 13 }) {
  return (
    <svg {...svgProps(size)}>
      <path d="M19 12H5" />
      <path d="m11 18-6-6 6-6" />
    </svg>
  );
}
function CloseIcon({ size = 12 }) {
  return (
    <svg {...svgProps(size)}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
function UndoIcon({ size = 13 }) {
  return (
    <svg {...svgProps(size)}>
      <path d="M3 7v6h6" />
      <path d="M3.5 13a9 9 0 1 0 2.6-6.4L3 9.5" />
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

/* ── PW-433 항목 단위 설정 ───────────────────────────────────────────────
   어니스트 지적 6건 중 ①③⑤⑥ 은 화면 결함이 아니라 **저장할 자리가 없어서** 생긴 것이었다.
   정본: screen-eval-cycle-hr.policy.md §5.11-A(척도) · §5.11-B(선택지) · §5.11-D(가이드) · §5.12(공개 범위) */

// [①] 척도 길이 = 설계자 입력. 시작값 1 고정 · 간격 1 · 끝값만 받는다.
//   시작값·간격까지 열면 같은 「3점 척도」가 회사마다 0~2 / 1~3 으로 갈려 점수를 비교할 수 없다.
const SCALE_MAX_MIN = 2; // 2점보다 짧은 척도는 척도가 아니다
const SCALE_MAX_MAX = 10; // 10점을 넘으면 응답자가 눈금을 구분하지 못한다
const DEFAULT_SCALE_MAX = 5; // 설정 이전 항목이 읽히는 값 — 5점 고정이던 시절과 같다
const SCALE_PRESETS = [3, 5, 7, 10];
const clampScaleMax = (v) =>
  Math.min(SCALE_MAX_MAX, Math.max(SCALE_MAX_MIN, Math.round(+v) || SCALE_MAX_MIN));
const scaleMaxOf = (q) => q?.scaleMax || DEFAULT_SCALE_MAX;

// [③] 체크박스 = 제목 + 선택지 목록(구글 폼 구조).
const DEFAULT_CHECK_OPTIONS = [
  { id: 'o1', label: '' },
  { id: 'o2', label: '' },
];
const CHECK_MIN_OPTIONS = 1;
const CHECK_MAX_OPTIONS = 20;
/** 선택지가 없는 **기존 항목은 구 동작(제목 1개 단일 체크)으로 폴백**한다. */
const filledOptions = (q) => (q?.options || []).filter((o) => o.label.trim());

// [⑥] 가이드 문구 표시 방식 — 「공개 범위」와 다른 축임을 화면에서 갈라 준다.
const GUIDE_DISPLAYS = [
  { id: 'hidden', labelKey: 'guideDisplayHidden' },
  { id: 'tooltip', labelKey: 'guideDisplayTooltip' },
  { id: 'inline', labelKey: 'guideDisplayInline' },
];

// [⑤] 결과 공개 범위 — 「누가 작성하는가」가 아니라 「이 답변을 누가 보는가」.
const DISCLOSURE_AUDIENCES = [
  { id: 'evaluatee', labelKey: 'audienceEvaluatee' },
  { id: 'manager', labelKey: 'audienceManager' },
  { id: 'upper', labelKey: 'audienceUpper' },
  { id: 'hr', labelKey: 'audienceHr' },
  { id: 'calibration_committee', labelKey: 'audienceCommittee' },
];
const IDENTITY_OPTIONS = [
  { id: 'named', labelKey: 'identityNamed', descKey: 'identityNamedDesc' },
  { id: 'role_only', labelKey: 'identityRoleOnly', descKey: 'identityRoleOnlyDesc' },
  { id: 'anonymous', labelKey: 'identityAnonymous', descKey: 'identityAnonymousDesc' },
];
const DEFAULT_MIN_RESPONSES = 3;
/**
 * 리뷰 유형별 기본값 (policy §5.12.3).
 * - 셀프는 작성자=피평가자라 설정 자체가 성립하지 않는다 → null(블록 미표시)
 * - 동료에 「피평가자」가 없는 이유: 공개는 조직이 준비됐을 때 **켜는 것**이지 기본값이 아니다
 * - 상향에 「차상위 조직장」이 없는 이유: 「아무에게도 공개 안 함」이 기본인 회사가 있다
 *   (David 확정 2026-08-23 — 초안 ON 에서 뒤집힘)
 */
const DEFAULT_DISCLOSURE = {
  self: null,
  peer: {
    audience: ['manager', 'hr', 'calibration_committee'],
    identity: 'anonymous',
    minResponses: DEFAULT_MIN_RESPONSES,
    aiSummaryOnly: false,
  },
  upward: {
    audience: ['hr'],
    identity: 'anonymous',
    minResponses: DEFAULT_MIN_RESPONSES,
    aiSummaryOnly: false,
  },
  leader: {
    audience: ['evaluatee', 'hr', 'calibration_committee'],
    identity: 'named',
    minResponses: null,
    aiSummaryOnly: false,
  },
};

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
/* PW-434 ⑤ 상단 「저장된 템플릿에서 시작」 블록에 인라인으로 펴는 카드 수 상한.
   블록은 목록이 아니라 진입점이라 전량 탐색은 「전체 목록에서 찾기」가 맡는다. */
const MAX_START_TEMPLATES = 4;

// 현재 빌더 상태 → 템플릿 요약 문자열(항목 N · 등급 M단계).
const gradeSum = (grades) => grades.reduce((a, g) => a + (Number(g.ratio) || 0), 0);

/**
 * PW-443 — 「리뷰 & 조정」 필터 5축.
 *
 * 구 「대상 범위」 탭 7종(전체/부서/직급/직렬/직군/직책/개별 선택)은 2026-08-24 에
 * 폐기됐다. 부서·개별 선택은 조직 트리가, 나머지 네 축은 이 필터가 흡수한다.
 *
 * 코어 인사 필드 표준(§1-3) 어휘 — 직급 `job_level` · 고용형태 `employment_type` ·
 * 직렬 `job_ladder`(후보 필드 이름은 역사적으로 `jobTitle`) · 직군 `job_family` ·
 * 직책 `job_position`. 순서는 화면 기획 그대로 고정한다.
 */
const REVIEW_AXES = [
  { key: 'jobLevel', labelKey: 'targetAxisJobLevel' },
  { key: 'employmentType', labelKey: 'targetAxisEmploymentType' },
  { key: 'jobTitle', labelKey: 'targetAxisJobLadder' },
  { key: 'jobFamily', labelKey: 'targetAxisJobFamily' },
  { key: 'jobPosition', labelKey: 'targetAxisJobPosition' },
];
const REVIEW_AXIS_KEYS = REVIEW_AXES.map((a) => a.key);
/** 축별 선택값의 빈 상태. 축이 늘어도 여기 한 곳만 본다. */
const emptyAxisSel = () =>
  REVIEW_AXIS_KEYS.reduce((acc, k) => ({ ...acc, [k]: [] }), {});

/** 위자드 단계 수 — 초안이 담는 단계 번호도 이 범위 안이다 (PW-440). */
const WIZARD_STEP_COUNT = 6;

/**
 * 저장돼 있던 단계를 위자드가 열 수 있는 범위로 눕힌다 (PW-440).
 *
 * 단계 수가 바뀐 뒤에 저장된 초안을 열면(7단계 시절 저장분) 없는 단계가 온다. 그대로
 * 열면 아무것도 안 그려진 빈 화면이 뜨므로, 마지막 단계로 눕혀 이어쓰기를 살린다.
 */
function clampStep(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(Math.trunc(n), 0), WIZARD_STEP_COUNT - 1);
}

/** `2026-08-23T18:20:00Z` → `18:20`. 시각이 없거나 못 읽으면 빈 문자열. */
function stampTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * 초안 배너의 일시 — `2026-08-23 18:20`.
 *
 * 24시간제로 적는다(정책 §5.2.2). 「오후 6:20」 은 목록에 초안이 여럿일 때 어느 것이
 * 최신인지 훑어 가리기 어렵다.
 */
function stampDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 「아직 손대지 않음」 상태에서 쓰는 안정 참조 — 매 렌더 새 배열/Set 을 만들지 않는다. */
const EMPTY_ORG_SEL = new Set();
const EMPTY_IDS = [];

/** 소속이 없는 구성원을 모으는 트리 노드 id. 노드가 없으면 그 사람은 고를 방법이 없다(E7). */
const UNASSIGNED_ORG_ID = '__unassigned__';

/**
 * 조직 트리 — 부서(최상위 단위) → 팀(그 아래 인원을 직접 가진 단위) 2계층.
 *
 * 단위 계층이 3단 이상이어도 화면은 2계층이라, 더 깊은 단위는 '팀' 자리에 부서를 뺀
 * 경로 이름(`인사 · HRD팀`)으로 선다. 부서가 인원을 직접 갖고 있으면 부서 자신도
 * 고를 수 있는 단위가 된다.
 *
 * `orgUnits` 를 안 넘기면 후보의 `department` 문자열로 1계층 트리를 만든다(폴백).
 * 반환: [{ id, name, selfSelectable, teams: [{ id, name }] }]
 */
function buildOrgTree(orgUnits, candidates) {
  const holders = new Set(
    candidates.map((c) => c.orgUnitId).filter((v) => v != null && v !== ''),
  );
  const units = Array.isArray(orgUnits) ? orgUnits : [];
  const tree = [];
  if (units.length > 0) {
    const byId = new Map(units.map((u) => [u.id, u]));
    const childrenOf = (id) => units.filter((u) => u.parentId === id);
    const top = units.filter((u) => !u.parentId || !byId.has(u.parentId));
    // 최상위가 하나뿐이면 그건 「전사」 노드다(시드가 그렇게 만든다). 그 자리는 트리
    // 맨 위의 「전체」 행이 이미 맡고 있으니, 한 단계 내려가 그 자식들을 부서로 삼는다.
    // 안 그러면 부서 열에 회사 이름 하나만 서고 부문·팀이 통째로 한 줄로 눕는다.
    const roots =
      top.length === 1 && childrenOf(top[0].id).length > 0
        ? childrenOf(top[0].id)
        : top;
    roots.forEach((root) => {
      const teams = [];
      const walk = (unit, prefix) => {
        childrenOf(unit.id).forEach((kid) => {
          const label = prefix ? `${prefix} · ${kid.name}` : kid.name;
          if (holders.has(kid.id)) teams.push({ id: kid.id, name: label });
          walk(kid, label);
        });
      };
      walk(root, '');
      tree.push({
        id: root.id,
        name: root.name,
        // 부서가 직접 인원을 갖거나, 하위 팀이 하나도 없으면 부서 행 자체가 고르는 단위다.
        selfSelectable: holders.has(root.id) || teams.length === 0,
        teams,
      });
    });
  } else {
    // 폴백 — 단위 목록이 없으면 소속 이름만으로 1계층을 만든다.
    const seen = [];
    candidates.forEach((c) => {
      const name = c.department;
      if (name && !seen.includes(name)) seen.push(name);
    });
    seen.forEach((name) =>
      tree.push({ id: `dept:${name}`, name, selfSelectable: true, teams: [] }),
    );
  }
  return tree;
}

/** 후보가 트리에서 걸리는 단위 id. 단위 목록이 없으면 소속 이름을 id 로 쓴다(폴백과 짝). */
function orgUnitKeyOf(candidate, hasUnits) {
  if (hasUnits) return candidate.orgUnitId || UNASSIGNED_ORG_ID;
  return candidate.department ? `dept:${candidate.department}` : UNASSIGNED_ORG_ID;
}

/**
 * 3상태 체크박스 — 켬 / 끔 / 부분 선택.
 *
 * 하위 팀 일부만 고른 부서를 켬·끔 둘 중 하나로 그리면 거짓말이 된다. 스크린리더에는
 * `aria-checked="mixed"` 로 나간다.
 */
function TriCheck({ state, label, onToggle }) {
  return (
    <span
      role="checkbox"
      aria-checked={state === 'partial' ? 'mixed' : state === 'on'}
      aria-label={label}
      tabIndex={0}
      className={`evc-tri-check is-${state}`}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          onToggle();
        }
      }}
      data-testid={`evc-tri-${state}`}
    />
  );
}

/**
 * 5축 필터 팝오버 — 좌 축 목록 / 우 값 체크박스.
 *
 * 체크는 팝오버 안의 초안에만 쌓이고 **「적용」을 눌러야** 바깥 명단에 반영된다.
 * 축을 만질 때마다 뒤 명단이 다시 그려지면 그 자체가 「동적 요소」라서 그렇다.
 * 팝오버 밖 클릭은 **적용하지 않고 닫는다** — 되돌아갈 곳이 없으면 「적용」이 뜻을 잃는다.
 */
function ReviewFilterPopover({ labels: L, applied, valuesOf, countsOf, onApply, onClose }) {
  const [draft, setDraft] = useState(() => {
    const d = emptyAxisSel();
    REVIEW_AXIS_KEYS.forEach((k) => {
      d[k] = [...(applied[k] ?? [])];
    });
    return d;
  });
  const [axis, setAxis] = useState(REVIEW_AXIS_KEYS[0]);
  const values = valuesOf(axis, draft);
  const counts = countsOf(axis);

  const toggle = (v) =>
    setDraft((prev) => {
      const cur = prev[axis] ?? [];
      const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
      const merged = { ...prev, [axis]: next };
      // 직군 → 직렬은 부모–자식이다. 남은 직군 아래에 없는 직렬 선택은 함께 해제한다(E5).
      if (axis === 'jobFamily') {
        const allowed = valuesOf('jobTitle', merged);
        merged.jobTitle = (merged.jobTitle ?? []).filter((x) => allowed.includes(x));
      }
      return merged;
    });

  return (
    <>
      {/* 밖 클릭 감지막 — 팝오버보다 아래에 깔린다. */}
      <div
        className="evc-filter-scrim"
        onClick={onClose}
        data-testid="evc-wiz-filter-scrim"
      />
      <div className="evc-filter-pop" data-testid="evc-wiz-filter-pop">
        <div className="evc-filter-axes">
          {REVIEW_AXES.map((a) => {
            const n = (draft[a.key] ?? []).length;
            return (
              <button
                type="button"
                key={a.key}
                className={`evc-filter-axis${axis === a.key ? ' is-on' : ''}`}
                onClick={() => setAxis(a.key)}
                data-testid={`evc-wiz-filter-axis-${a.key}`}
              >
                <span className="evc-filter-axis-name">{L[a.labelKey]}</span>
                {n > 0 && <span className="evc-filter-axis-n">{n}</span>}
              </button>
            );
          })}
        </div>
        <div className="evc-filter-values">
          <p className="evc-filter-multi">{L.targetFilterMulti}</p>
          <div className="evc-filter-value-list">
            {values.length === 0 && (
              <p className="evc-wiz-hint" data-testid="evc-wiz-filter-empty">
                {axis === 'jobTitle' ? L.targetFilterLadderHint : L.targetFilterNoValues}
              </p>
            )}
            {values.map((v) => (
              <label key={v} className="evc-filter-value">
                <input
                  type="checkbox"
                  checked={(draft[axis] ?? []).includes(v)}
                  onChange={() => toggle(v)}
                  data-testid={`evc-wiz-filter-val-${axis}-${v}`}
                />
                <span className="evc-filter-value-name">{v}</span>
                <span className="evc-filter-value-n">{counts[v] ?? 0}</span>
              </label>
            ))}
          </div>
          <div className="evc-filter-actions">
            <button
              type="button"
              className="evc-filter-clear"
              onClick={() => setDraft(emptyAxisSel())}
              data-testid="evc-wiz-filter-clear"
            >
              {L.targetFilterClearAll}
            </button>
            <button
              type="button"
              className="evc-filter-apply"
              onClick={() => onApply(draft)}
              data-testid="evc-wiz-filter-apply"
            >
              {L.targetFilterApply}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

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

/**
 * PW-122 프리셋 일정은 '며칠째'로 저장한다.
 * 프리셋에 담긴 절대 일시(원본 사이클의 날짜)를 그대로 되살리면 새 사이클 기간 밖의
 * 날짜가 들어온다 — 첫 단계 시작일을 기준(0일)으로 한 오프셋 + 시각만 남긴다.
 */
function scheduleToOffsets(schedule) {
  const DAY = 86400000;
  const entries = Object.entries(schedule || {}).filter(
    ([, v]) => v && datePart(v.start),
  );
  if (entries.length === 0) return null;
  const baseMs = Math.min(
    ...entries.map(([, v]) => new Date(`${datePart(v.start)}T00:00`).getTime()),
  );
  const offsetOf = (iso) =>
    Math.round(
      (new Date(`${datePart(iso)}T00:00`).getTime() - baseMs) / DAY,
    );
  const out = {};
  entries.forEach(([id, v]) => {
    out[id] = {
      startDay: offsetOf(v.start),
      startTime: timePart(v.start, 'start'),
      endDay: datePart(v.end) ? offsetOf(v.end) : offsetOf(v.start),
      endTime: timePart(v.end, 'end'),
    };
  });
  return out;
}

/** 오프셋 일정 + 사이클 시작일 → 실제 일시. 시작일이 없으면 되살릴 수 없다. */
function offsetsToSchedule(offsets, baseDate) {
  if (!offsets || !baseDate) return {};
  const DAY = 86400000;
  const base = new Date(`${datePart(baseDate)}T00:00`).getTime();
  const iso = (ms) => dateToIso(new Date(ms));
  const out = {};
  Object.entries(offsets).forEach(([id, o]) => {
    out[id] = {
      start: joinDateTime(iso(base + o.startDay * DAY), o.startTime),
      end: joinDateTime(iso(base + o.endDay * DAY), o.endTime),
    };
  });
  return out;
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

/**
 * PW-433 — 항목 설정 패널 (policy §5.11-C).
 *
 * 항목 행 **바로 아래**에 열리고, 한 번에 하나만 열린다. 구성은
 * ① 유형별 설정(척도 §5.11-A / 선택지 §5.11-B) → ② 작성 가이드 문구(§5.11-D)
 * → ③ 결과 공개 범위(§5.12).
 *
 * 🔴 **저장 버튼이 없다.** 입력은 편집 버퍼에만 반영되고 템플릿 저장·사이클 생성 때 한 번에
 * 영속화된다. 그래서 로딩 상태·스피너도 두지 않는다.
 * 🔴 범위 밖 숫자는 **에러가 아니라 클램프**다 — 입력 중 빨간 테두리가 깜빡이지 않게 한다.
 */
function ItemSettingsPanel({
  q,
  labels: L,
  reviewType,
  disclosureSupported,
  disclosure,
  options,
  onPatch,
  onPatchOption,
  onAddOption,
  onRemoveOption,
  onPatchDisclosure,
  onToggleAudience,
  onClose,
}) {
  const scaleMax = scaleMaxOf(q);
  const guideDisplay = q.descriptionDisplay || 'tooltip';
  return (
    <div className="evc-tpl-settings" data-testid={`evc-tpl-settings-${q.id}`}>
      {q.type === 'rating' && (
        <div className="evc-tpl-set-block">
          <div className="evc-tpl-set-title">{L.scaleSettingsTitle}</div>
          <div className="evc-tpl-set-row">
            <span className="evc-tpl-set-note">{L.scaleFrom}</span>
            <input
              type="number"
              className="evc-input evc-tpl-set-num"
              value={scaleMax}
              min={SCALE_MAX_MIN}
              max={SCALE_MAX_MAX}
              onChange={(e) => onPatch(q.id, { scaleMax: clampScaleMax(e.target.value) })}
              data-testid={`evc-tpl-scalemax-${q.id}`}
            />
            <span className="evc-tpl-set-note">{L.scaleStepFixed}</span>
            {SCALE_PRESETS.map((n) => (
              <button
                type="button"
                key={n}
                className={`evc-type-chip${scaleMax === n ? ' is-on' : ''}`}
                onClick={() => onPatch(q.id, { scaleMax: n })}
                data-testid={`evc-tpl-scale-preset-${q.id}-${n}`}
              >
                {fill(L.scalePresetChip, { n })}
              </button>
            ))}
          </div>
          {/* 숫자만으로는 '5점이 좋은 쪽인지'조차 알 수 없다 — 역방향 척도를 쓰는 조직이 있다. */}
          <div className="evc-tpl-set-row">
            <span className="evc-tpl-set-note">{L.scaleAnchorMinLabel}</span>
            <input
              className="evc-input"
              value={q.scaleAnchorMin || ''}
              placeholder={L.scaleAnchorMinPlaceholder}
              onChange={(e) => onPatch(q.id, { scaleAnchorMin: e.target.value })}
              data-testid={`evc-tpl-anchor-min-${q.id}`}
            />
            <span className="evc-tpl-set-note">
              {fill(L.scaleAnchorMaxLabel, { max: scaleMax })}
            </span>
            <input
              className="evc-input"
              value={q.scaleAnchorMax || ''}
              placeholder={L.scaleAnchorMaxPlaceholder}
              onChange={(e) => onPatch(q.id, { scaleAnchorMax: e.target.value })}
              data-testid={`evc-tpl-anchor-max-${q.id}`}
            />
          </div>
          <p className="evc-tpl-set-help">{L.scaleFrozenAfterOpen}</p>
        </div>
      )}

      {q.type === 'checkbox' && (
        <div className="evc-tpl-set-block">
          <div className="evc-tpl-set-title">{L.optionsTitle}</div>
          <p className="evc-tpl-set-help">{L.optionsTitleHelp}</p>
          <div className="evc-tpl-options">
            {options.map((o, oi) => (
              <div key={o.id} className="evc-tpl-option">
                <span className="evc-tpl-option-mark">{q.allowMultiple ? '☐' : '○'}</span>
                <input
                  className="evc-input"
                  value={o.label}
                  placeholder={fill(L.optionPlaceholder, { n: oi + 1 })}
                  onChange={(e) => onPatchOption(q, o.id, e.target.value)}
                  data-testid={`evc-tpl-option-${q.id}-${oi}`}
                />
                <button
                  type="button"
                  className="evc-tpl-x"
                  onClick={() => onRemoveOption(q, o.id)}
                  disabled={options.length <= CHECK_MIN_OPTIONS}
                  aria-label={L.delete}
                  data-testid={`evc-tpl-option-del-${q.id}-${oi}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="evc-tpl-set-row">
            <button
              type="button"
              className="evc-btn is-ghost"
              onClick={() => onAddOption(q)}
              disabled={options.length >= CHECK_MAX_OPTIONS}
              data-testid={`evc-tpl-option-add-${q.id}`}
            >
              {L.optionAdd}
            </button>
            <label className="evl-promo-row">
              <input
                type="checkbox"
                checked={!!q.allowMultiple}
                onChange={(e) => onPatch(q.id, { allowMultiple: e.target.checked })}
                data-testid={`evc-tpl-allowmultiple-${q.id}`}
              />
              <span>{L.optionsAllowMultiple}</span>
            </label>
          </div>
        </div>
      )}

      {/* ② 가이드 문구 — 「노출 여부」는 이 축이고 「누가 보는가」는 아래 축이다. */}
      <div className="evc-tpl-set-block">
        <div className="evc-tpl-set-title">{L.guideTitle}</div>
        <input
          className="evc-input"
          value={q.description ?? ''}
          placeholder={L.itemDescPlaceholder}
          onChange={(e) => onPatch(q.id, { description: e.target.value })}
          data-testid={`evc-tpl-desc-${q.id}`}
        />
        <div className="evc-tpl-set-row">
          <span className="evc-tpl-set-note">{L.guideDisplayLabel}</span>
          {GUIDE_DISPLAYS.map((o) => (
            <button
              type="button"
              key={o.id}
              className={`evc-type-chip${guideDisplay === o.id ? ' is-on' : ''}`}
              onClick={() => onPatch(q.id, { descriptionDisplay: o.id })}
              data-testid={`evc-tpl-guide-${q.id}-${o.id}`}
            >
              {L[o.labelKey]}
            </button>
          ))}
        </div>
        {/* 이 오독이 티켓에 실제로 적혀 있었다 — 고정 노출한다 (policy §5.11-D). */}
        <p className="evc-tpl-set-help" data-testid={`evc-tpl-guide-axis-note-${q.id}`}>
          {L.guideAxisNote}
        </p>
      </div>

      {/* ③ 결과 공개 범위 — D7 배지가 「보여 주기만」 하던 그 목록을 여기서 정한다. */}
      <div className="evc-tpl-set-block is-last">
        <div className="evc-tpl-set-title">
          {L.disclosureTitle} <span className="evc-tpl-set-note">{L.disclosureTitleHint}</span>
        </div>
        {!disclosureSupported ? (
          <p className="evc-tpl-set-help" data-testid={`evc-tpl-disclosure-self-${q.id}`}>
            {L.disclosureSelfNote}
          </p>
        ) : (
          <>
            <div className="evc-tpl-set-row">
              {DISCLOSURE_AUDIENCES.map((a) => {
                const on = (disclosure.audience || []).includes(a.id);
                // 상향 리뷰의 '직속 조직장' = 평가 대상 본인. 켤 수는 있으나 무엇을 켜는지 알린다.
                const isTargetSelf = reviewType === 'upward' && a.id === 'manager';
                return (
                  <button
                    type="button"
                    key={a.id}
                    className={`evc-type-chip${on ? ' is-on' : ''}${isTargetSelf && on ? ' is-warn' : ''}`}
                    onClick={() => onToggleAudience(q, a.id)}
                    title={isTargetSelf ? L.audienceManagerIsTargetHint : undefined}
                    data-testid={`evc-tpl-audience-${q.id}-${a.id}`}
                  >
                    {L[a.labelKey]}
                    {isTargetSelf && on ? ' ⚠' : ''}
                  </button>
                );
              })}
            </div>
            {reviewType === 'upward' && (disclosure.audience || []).includes('manager') && (
              <p
                className="evc-tpl-set-help is-warn"
                data-testid={`evc-tpl-upward-warn-${q.id}`}
              >
                {L.audienceManagerIsTargetHint}
              </p>
            )}
            {/* 「보이는가」와 「누가 썼는지 보이는가」는 다른 축이다. */}
            <div className="evc-tpl-set-row">
              <span className="evc-tpl-set-note">{L.identityLabel}</span>
              {IDENTITY_OPTIONS.map((o) => (
                <button
                  type="button"
                  key={o.id}
                  className={`evc-type-chip${(disclosure.identity || 'anonymous') === o.id ? ' is-on' : ''}`}
                  onClick={() => onPatchDisclosure(q, { identity: o.id })}
                  title={L[o.descKey]}
                  data-testid={`evc-tpl-identity-${q.id}-${o.id}`}
                >
                  {L[o.labelKey]}
                </button>
              ))}
            </div>
            {/* 인원이 적으면 익명이 익명이 아니게 된다. */}
            <div className="evc-tpl-set-row">
              <label className="evl-promo-row">
                <input
                  type="checkbox"
                  checked={disclosure.minResponses != null}
                  onChange={(e) =>
                    onPatchDisclosure(q, {
                      minResponses: e.target.checked ? DEFAULT_MIN_RESPONSES : null,
                    })
                  }
                  data-testid={`evc-tpl-minresponses-on-${q.id}`}
                />
                <span>{L.minResponsesLabel}</span>
              </label>
              {disclosure.minResponses != null && (
                <input
                  type="number"
                  className="evc-input evc-tpl-set-num"
                  value={disclosure.minResponses}
                  min={2}
                  max={20}
                  onChange={(e) =>
                    onPatchDisclosure(q, {
                      minResponses: Math.min(20, Math.max(2, Math.round(+e.target.value) || 2)),
                    })
                  }
                  data-testid={`evc-tpl-minresponses-${q.id}`}
                />
              )}
            </div>
            <label className="evl-promo-row">
              <input
                type="checkbox"
                checked={!!disclosure.aiSummaryOnly}
                onChange={(e) => onPatchDisclosure(q, { aiSummaryOnly: e.target.checked })}
                data-testid={`evc-tpl-aisummary-${q.id}`}
              />
              <span>{L.aiSummaryOnlyLabel}</span>
            </label>
          </>
        )}
      </div>

      <div className="evc-tpl-set-foot">
        <button
          type="button"
          className="evc-btn is-ghost"
          onClick={onClose}
          data-testid={`evc-tpl-settings-close-${q.id}`}
        >
          {L.itemSettingsClose}
        </button>
      </div>
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
      <div
        className="evc-modal is-wide"
        onClick={(e) => e.stopPropagation()}
        data-testid="evc-tpl-preview-modal"
      >
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
                    {/* PW-433 ⑥ 가이드 문구를 어떻게 보여줄지는 설계자가 정한다. */}
                    {q.description && (q.descriptionDisplay || 'tooltip') === 'tooltip' && (
                      <span className="evc-preview-guide-mark" title={q.description}>?</span>
                    )}
                    {q.requiresRationale && (
                      <span className="evc-mode-badge is-warn">{L.rationaleRequired}</span>
                    )}
                  </div>
                  {q.description && (q.descriptionDisplay || 'tooltip') === 'inline' && (
                    <div className="evc-preview-guide-inline">{q.description}</div>
                  )}
                  {q.type === 'textarea' && (
                    <textarea className="evm-textarea" rows={3} disabled placeholder={L.previewTextareaPlaceholder} />
                  )}
                  {/* PW-118 척도 항목은 '점수 + 바로 아래 사유 서술칸' 복합 구조다(spec-eval-cycle §4.2.2 B6/D4).
                      requiresRationale 는 서술칸의 유무가 아니라 제출 게이팅만 정한다 —
                      미리보기가 점수만 그리면 구성원이 보게 될 화면과 어긋난다. */}
                  {q.type === 'rating' && (
                    <>
                      {/* PW-433 ① 미리보기는 설정한 척도를 **그대로** 그린다.
                          여기가 5점 고정이면 버그다 (policy §5.11-A 「미리보기 정합」). */}
                      <div className="evc-preview-scale">
                        {q.scaleAnchorMin && (
                          <span className="evc-preview-scale-anchor">{q.scaleAnchorMin}</span>
                        )}
                        {Array.from({ length: scaleMaxOf(q) }, (_, i) => i + 1).map((n) => (
                          <span key={n} className="evc-preview-scale-dot">{n}</span>
                        ))}
                        {q.scaleAnchorMax && (
                          <span className="evc-preview-scale-anchor">{q.scaleAnchorMax}</span>
                        )}
                        <span className="evc-preview-scale-of">/ {scaleMaxOf(q)}</span>
                      </div>
                      <textarea
                        className="evm-textarea"
                        rows={2}
                        disabled
                        placeholder={L.previewRationalePlaceholder}
                        data-testid={`evc-preview-rationale-${q.id}`}
                      />
                    </>
                  )}
                  {q.type === 'grade' && (
                    <div className="evc-preview-gradechips">
                      {grades.map((g, i) => (
                        <span key={i} className="evc-type-chip">{g.label}</span>
                      ))}
                    </div>
                  )}
                  {/* PW-433 ③ 제목 하나가 체크박스가 되던 구조 → 제목 + 선택지 N개.
                      선택지를 정한 적 없는 구 항목은 구 동작으로 폴백하고 그 사실을 표기한다. */}
                  {q.type === 'checkbox' &&
                    (filledOptions(q).length > 0 ? (
                      <div className="evc-preview-options">
                        {filledOptions(q).map((o) => (
                          <label key={o.id} className="evl-promo-row">
                            <input type={q.allowMultiple ? 'checkbox' : 'radio'} disabled />
                            <span>{o.label}</span>
                          </label>
                        ))}
                        <span className="evc-preview-scale-of">
                          {q.allowMultiple ? L.optionsMultiHint : L.optionsSingleHint}
                        </span>
                      </div>
                    ) : (
                      <label className="evl-promo-row">
                        <input type="checkbox" disabled />
                        <span>{q.text}</span>
                        <span className="evc-preview-scale-of" data-testid={`evc-preview-nooptions-${q.id}`}>
                          {L.optionsUnset}
                        </span>
                      </label>
                    ))}
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

/**
 * PW-434 ② 저장 템플릿 간이 미리보기 — 「템플릿 이름으로 어떤 템플릿인지 확인이 불가하여
 * 내용을 확인해서 불러올 가능성이 큼」(티켓 원문). 불러오기 목록의 **행 아래 인라인**으로 편다.
 *
 * 전체 미리보기(`TemplatePreviewModal`)를 여기서 쓰지 않는 이유가 둘이다 —
 *   ① 이 목록 자체가 이미 모달이라 그 위에 모달을 또 띄우면 닫기 동선이 꼬인다,
 *   ② 전체 미리보기는 *구성원이 보게 될 형태*라 입력 컨트롤까지 그려서
 *      「무엇이 들었는지 확인」 목적에는 무겁다.
 * 여기서는 읽기 전용 목록만 보여 준다 (policy §5.10.1 「불러오기 전 미리보기」).
 */
function TemplateBriefPreview({ tpl, labels: L }) {
  const groups = [];
  (tpl.questions || []).forEach((q) => {
    let g = groups.find((x) => x.sec === q.section);
    if (!g) {
      g = { sec: q.section, items: [] };
      groups.push(g);
    }
    g.items.push(q);
  });
  return (
    <div className="evc-tpl-peek" data-testid={`evc-tpl-peek-${tpl.id}`}>
      <div>
        <p className="evc-tpl-peek-title">
          {fill(L.tplPeekItems, { count: (tpl.questions || []).length })}
        </p>
        <div className="evc-tpl-peek-secs">
          {groups.map((g) => (
            <div key={g.sec}>
              <div className="evc-tpl-peek-sec">
                <span
                  className="evc-tpl-peek-dot"
                  style={{ background: sectionColor(g.sec) }}
                />
                <span className="evc-tpl-peek-sec-name">{g.sec}</span>
                <span className="evc-tpl-peek-sec-count">{g.items.length}</span>
              </div>
              <div className="evc-tpl-peek-items">
                {g.items.map((q, i) => (
                  <div key={q.id || i} className="evc-tpl-peek-item">
                    {/* 항목 본문이다. 여기가 비면 미리보기가 존재할 이유가 없어진다
                        (policy `screen-eval-template-library.policy.md` 엣지 21). */}
                    <span className="evc-tpl-peek-item-text">{q.text}</span>
                    <span className="evc-tpl-peek-item-type">
                      {L[QUESTION_TYPES.find((t) => t.id === q.type)?.labelKey] || q.type}
                    </span>
                    {q.ai && <span className="evc-tpl-peek-item-ai">{L.tplPeekAi}</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="evc-tpl-peek-title">
          {fill(L.tplPeekGrades, { count: (tpl.grades || []).length })}
          {tpl.absolute ? ` · ${L.templateAbsolute}` : ''}
        </p>
        <div className="evc-preview-gradechips">
          {(tpl.grades || []).map((g, i) => (
            <span key={i} className="evc-tpl-peek-grade" title={g.desc || undefined}>
              {g.label}
              {!tpl.absolute && ` ${g.ratio}%`}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * PW-434 ②④ 전체 목록에서 찾기 — 상단 「저장된 템플릿에서 시작」 블록이 못 담는 전량을 본다.
 *
 * - 기본 노출은 **지금 편집 중인 평가 유형 블록 1개**다. 3단계 「적용 템플릿」 셀렉트는 이미
 *   유형 일치본만 보여 주고 있었으므로 같은 축을 같게 맞춘 것이다 (policy §5.10.1 「유형 범위」).
 *   다른 유형을 참고로 볼 길은 토글로 남긴다 — 끊지 않는다.
 * - ⚠ 유형 필터와 **사이클 필터는 다른 축**이다. 사이클 필터는 여전히 걸지 않는다(PW-122).
 * - PW-435 정합: 「다른 유형도 보기」가 여는 것은 **목록**이지 **권한**이 아니다. 사이클에
 *   포함되지 않은 유형은 **열람만** 되고 불러올 수 없다.
 */
function TemplatePickerModal({
  templates,
  currentType,
  cycleTypes,
  onLoad,
  onClose,
  labels: L,
}) {
  const [q, setQ] = useState('');
  const [allTypes, setAllTypes] = useState(false);
  // 한 번에 하나만 연다 — 여러 개를 동시에 펴면 목록이 다시 스크롤 지옥이 된다.
  const [peekId, setPeekId] = useState(null);

  const pool = templates.filter((t) => (t.status || 'active') === 'active');
  const typePool = allTypes
    ? pool
    : pool.filter((t) => (t.reviewType || 'self') === currentType);
  const otherTypeCount = pool.length - pool.filter(
    (t) => (t.reviewType || 'self') === currentType,
  ).length;
  const kw = q.trim().toLowerCase();
  const matched = kw
    ? typePool.filter((t) => t.name.toLowerCase().includes(kw))
    : typePool;
  const blocks = allTypes
    ? TEMPLATE_TYPES
    : TEMPLATE_TYPES.filter((rt) => rt.id === currentType);
  const currentTypeName = L[TEMPLATE_TYPES.find((rt) => rt.id === currentType)?.nameKey] || '';

  return createPortal(
    <div className="evc-modal-overlay" onClick={onClose}>
      <div
        className="evc-modal is-wide evc-tpl-picker"
        onClick={(e) => e.stopPropagation()}
        data-testid="evc-tpl-picker"
      >
        <div className="evc-wiz-header">
          <h3 className="evc-modal-title">{L.tplPickerTitle}</h3>
          <button type="button" className="evc-wiz-close" onClick={onClose} aria-label={L.cancel}>
            ✕
          </button>
        </div>
        <p className="evc-modal-sub">
          {fill(L.tplPickerSub, { type: currentTypeName })}
        </p>

        {pool.length === 0 ? (
          <div className="evc-empty" data-testid="evc-tpl-picker-empty">
            {L.tplPickerEmpty}
          </div>
        ) : (
          <>
            <div className="evc-tpl-picker-search">
              <SearchIcon size={14} />
              <input
                className="evc-input"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={L.tplPickerSearchPlaceholder}
                data-testid="evc-tpl-picker-search"
              />
            </div>
            <div className="evc-tpl-picker-scope">
              <span className="evc-tpl-picker-scope-note" data-testid="evc-tpl-picker-scope">
                {allTypes
                  ? fill(L.tplPickerScopeAll, { count: pool.length })
                  : fill(L.tplPickerScopeOne, { type: currentTypeName, count: typePool.length })}
              </span>
              <button
                type="button"
                className="evc-tpl-picker-toggle"
                onClick={() => setAllTypes((v) => !v)}
                disabled={!allTypes && otherTypeCount === 0}
                title={!allTypes && otherTypeCount === 0 ? L.tplPickerNoOtherTypes : undefined}
                data-testid="evc-tpl-picker-alltypes"
              >
                {allTypes
                  ? fill(L.tplPickerOnlyCurrent, { type: currentTypeName })
                  : fill(L.tplPickerShowOther, { count: otherTypeCount })}
              </button>
            </div>

            {kw && matched.length === 0 && (
              <div className="evc-empty" data-testid="evc-tpl-picker-nomatch">
                {fill(L.tplPickerNoMatch, { keyword: q })}
              </div>
            )}

            <div className="evc-tpl-picker-blocks">
              {blocks.map((rt) => {
                const items = matched.filter((t) => (t.reviewType || 'self') === rt.id);
                if (kw && items.length === 0) return null;
                const inCycle = cycleTypes.includes(rt.id);
                return (
                  <div key={rt.id} data-testid={`evc-tpl-picker-block-${rt.id}`}>
                    <div className="evc-tpl-picker-block-head">
                      <span className="evc-tpl-picker-block-name">{L[rt.nameKey]}</span>
                      <span className="evc-tpl-picker-block-count">{items.length}</span>
                      {/* PW-435 ③ 유형 카드와 같은 문구를 쓴다 — 두 자리가 다르게 말하면
                          규칙으로 안 읽힌다. */}
                      {!inCycle && (
                        <span className="evc-tpl-picker-block-lock">
                          <LockIcon size={11} /> {L.tplPickerViewOnly}
                        </span>
                      )}
                    </div>
                    {items.length === 0 ? (
                      <div className="evc-tpl-picker-block-empty">{L.tplPickerBlockEmpty}</div>
                    ) : (
                      <div className="evc-tpl-picker-rows">
                        {items.map((t) => {
                          const open = peekId === t.id;
                          const loadable = cycleTypes.includes(t.reviewType || 'self');
                          return (
                            <div
                              key={t.id}
                              className={`evc-tpl-picker-row${open ? ' is-open' : ''}`}
                            >
                              <div className="evc-tpl-picker-row-main">
                                <div className="evc-tpl-picker-row-info">
                                  <div className="evc-tpl-picker-row-name">
                                    <span className="evc-tpl-lib-name">{t.name}</span>
                                    {t.isDefault && (
                                      <span className="evc-mode-badge">{L.tplDefaultBadge}</span>
                                    )}
                                    {(t.revision || 1) > 1 && (
                                      <span className="evc-tpl-rev-badge">v{t.revision}</span>
                                    )}
                                  </div>
                                  <div className="evc-tpl-lib-meta">
                                    {L[TEMPLATE_VERSIONS.find((v) => v.id === t.version)?.labelKey] || t.version}
                                    {' · '}
                                    {fill(L.templateMeta, {
                                      items: (t.questions || []).length,
                                      grades: (t.grades || []).length,
                                    })}
                                    {' · '}
                                    {t.usageCount > 0
                                      ? fill(L.tplUsageCount, { count: t.usageCount })
                                      : L.tplNeverUsed}
                                  </div>
                                </div>
                                <div className="evc-tpl-picker-row-actions">
                                  {/* PW-435 ③ 막는 자리는 «불러오기»(쓰기)이고 «미리보기»(읽기)는
                                      열어 둔다 — 내용을 보는 것 자체는 해롭지 않고, 「이름만으로
                                      판별이 안 되니 내용을 본다」는 이 카드의 목적은 참고 열람에도
                                      그대로 유효하다. */}
                                  <button
                                    type="button"
                                    className={`evc-btn is-ghost${open ? ' is-on' : ''}`}
                                    onClick={() => setPeekId(open ? null : t.id)}
                                    aria-expanded={open}
                                    data-testid={`evc-tpl-peek-btn-${t.id}`}
                                  >
                                    <EyeIcon size={13} /> {L.templatePreview}
                                  </button>
                                  <button
                                    type="button"
                                    className="evc-btn is-ghost"
                                    onClick={() => onLoad(t)}
                                    disabled={!loadable}
                                    title={loadable ? undefined : L.tplLoadBlockedNotInCycle}
                                    data-testid={`evc-tpl-picker-load-${t.id}`}
                                  >
                                    {L.templateLoad}
                                  </button>
                                </div>
                              </div>
                              {open && <TemplateBriefPreview tpl={t} labels={L} />}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

export default function EvalCycleWizard({
  labels: L,
  candidates = [],
  /**
   * PW-443 — 조직 단위 목록 `[{ id, name, parentId }]`. 4 대상자 단계의 조직 트리가
   * 이걸로 선다. 안 넘기면 후보의 `department` 문자열로 1계층 트리를 만든다(폴백) —
   * 그 경우 부서 안에서 팀을 갈라 고를 수 없다.
   */
  orgUnits = [],
  // 발령 변경 이력 [{userId, field, date, before, after}] — '직무 변경'·'직급 변경일'
  // 제외 규칙의 근거. 비면 두 규칙은 아무도 잡지 않는다(조용히 0명).
  appointmentChanges = [],
  committeeCandidates = [],
  /**
   * PW-161 — 위원 후보 명단의 조회 상태. 세 상태(로딩 / 실패 / 후보 0명)가 갈리지 않으면
   * 조회가 실패해도 화면은 "후보가 없습니다" 로만 보여서, HR 이 조직에 후보가 없다고
   * 오해한다. 소비자가 안 넘기면 종전대로 동작한다(전부 optional).
   */
  committeeCandidatesLoading = false,
  committeeCandidatesError = false,
  /** 조회 실패 시 '다시 시도'. 안 넘기면 재시도 버튼을 숨긴다. */
  onReloadCommitteeCandidates,
  onCancel,
  onSubmit,
  // TC-028 사이클 설정 프리셋(불러오기/저장)
  presets = [],
  onSavePreset,
  onLoadPreset,
  /**
   * 관리(수정) 모드 — 기존 사이클을 넘기면 그 값으로 프리필하고 마지막 버튼이
   * '변경사항 저장'이 된다 (정책 §4.3 "관리 → 해당 사이클 위자드 진입(관리 모드)").
   * 넘기지 않으면 종전대로 신규 생성 모드.
   */
  cycle = null,
  /** 관리 모드 대상자 프리필용 현재 참여자 [{ memberId }]. */
  participants = [],
  /**
   * PW-122 — **조직 평가 템플릿 라이브러리**. 배열을 넘기면 2단계의 저장된 템플릿 목록이
   * 이 값(서버 자산)이 되고, 「템플릿 저장」이 `onSaveTemplate` 으로 즉시 서버에 등재된다.
   *
   * 넘기지 않으면(`null`) 종전대로 **마법사 세션 로컬**로 동작한다 — 마법사를 닫으면
   * 사라지고 다른 사이클에서 불러올 수 없다. 그게 정확히 PW-122 의 증상이었다.
   * 시각은 어느 쪽이든 같다.
   */
  libraryTemplates = null,
  /** 저장 요청. 저장된 템플릿을 돌려주면 성공, falsy 면 실패로 보고 입력을 유지한다. */
  onSaveTemplate,
  /**
   * PW-434 — 라이브러리 «조회 상태». `libraryTemplates` 만으로는 「저장된 게 없다」와
   * 「못 불러왔다」가 화면에서 똑같아진다. 둘은 다른 사실이고, 전자로 보이면 설계자가
   * **이미 있는 템플릿을 처음부터 다시 만든다** (policy §5.10.1 「상단 시작 블록 로딩·조회 실패」).
   * 안 넘기면 종전대로 'ready' 다.
   */
  libraryStatus = 'ready',
  /** 조회 실패 시 「다시 시도」. 안 넘기면 재시도 버튼을 숨긴다. */
  onReloadLibraryTemplates,
  /**
   * @deprecated PW-434 — 마법사는 더 이상 템플릿을 지우지 않는다. 조직 자산을 사이클 작업
   * 도중에 지우는 사고를 막기 위해 삭제·보관은 「평가 템플릿」 화면에서만 한다
   * (policy §5.10.1 「위자드에서는 삭제하지 않는다」, 2026-08-16). 기존 소비자가 그대로
   * 넘겨도 깨지지 않게 prop 만 남긴다.
   */
  onDeleteTemplate,
  /** 저장 실패 사유(이름 중복 등). 부모가 서버 문구를 그대로 넘긴다. */
  templateSaveError = null,
  /**
   * PW-440 — 초안 저장. `({ draftState, draftStep, name }) => Promise<{ savedAt } | null>`.
   *
   * 넘기지 않으면 종전대로 동작한다 — 저장도 이탈 확인도 없다. 넘기면 `다음 →`·
   * `← 이전` 마다 자동 저장이 붙고 푸터에 `임시저장` 버튼이 생긴다.
   *
   * 관리(수정) 모드에서는 **무시한다.** 그 화면의 변경은 즉시 반영이라 초안 개념이
   * 성립하지 않고, 버튼을 남기면 오픈된 사이클을 초안으로 되돌리는 것처럼 읽힌다.
   */
  onSaveDraft,
  /** PW-440 — 이어쓰기로 열 때 복원할 초안. `collectDraft()` 가 만든 그 모양 그대로. */
  draftState = null,
  /** PW-440 — 저장돼 있던 단계(0-based). 1단계로 되돌리면 「처음부터 다시」가 재현된다. */
  draftStep = 0,
  /** PW-440 — 마지막 저장 시각(ISO). 배너·푸터 표기와 낙관적 잠금 키에 쓴다. */
  draftSavedAt: draftSavedAtProp = null,
  /** PW-440 — 마지막으로 저장한 사람 이름. 표시용. */
  draftSavedByName = null,
}) {
  const isManage = !!cycle;
  const initialSeq = cycle?.reviewSequence ?? null;
  /**
   * PW-440 — 초안 기능이 켜졌는가. 관리 모드에서는 항상 꺼진다(§5.1-A-1).
   *
   * `D` 는 «이어쓰기로 열렸을 때 복원할 값»이다. 상태 초기화에서만 읽고 그 뒤로는 보지
   * 않는다 — 이펙트로 뒤늦게 덮어쓰면 사용자가 이미 고친 값을 되돌리게 된다.
   */
  const draftEnabled = !!onSaveDraft && !isManage;
  const D = draftEnabled && draftState ? draftState : null;
  const isDraftResume = !!D;

  const [step, setStep] = useState(() =>
    isDraftResume ? clampStep(draftStep) : 0,
  );
  // R1b 경로 B — 캘리브레이션 위원회 구성(선택). committee[0] = 위원장.
  const [committeeOn, setCommitteeOn] = useState(() => !!D?.committeeOn);
  const [committee, setCommittee] = useState(() => [...(D?.committee ?? [])]);
  // PW-161 위원 후보 검색. 후보는 조직장+시니어IC 전원(데모 조직 138명)이라 스크롤만으로는
  // 못 찾는다. 검색은 '표시'만 바꾼다 — 선택과 선택 순서에는 관여하지 않으므로
  // 위원장(= 선택 순서 첫 위원)이 검색·정렬로 옮겨가지 않는다.
  const [committeeSearch, setCommitteeSearch] = useState('');
  const [name, setName] = useState(() => D?.name ?? cycle?.name ?? '');
  const [startDate, setStartDate] = useState(() =>
    datePart(D?.startDate ?? cycle?.startDate ?? ''),
  );
  const [endDate, setEndDate] = useState(() =>
    datePart(D?.endDate ?? cycle?.endDate ?? ''),
  );
  // 날짜 picker 팝오버 상태: { field:'start'|'end', rect, el }
  const [picker, setPicker] = useState(null);
  const openPicker = (field) => (e) =>
    setPicker({ field, rect: e.currentTarget.getBoundingClientRect(), el: e.currentTarget });
  // 단계별 일정 date picker 팝오버: { phaseId, field:'start'|'end', rect, el }
  const [schedPicker, setSchedPicker] = useState(null);
  const openSchedPicker = (phaseId, field) => (e) =>
    setSchedPicker({ phaseId, field, rect: e.currentTarget.getBoundingClientRect(), el: e.currentTarget });
  const [reviewTypes, setReviewTypes] = useState(() => {
    if (D?.reviewTypes) return [...D.reviewTypes];
    return cycle?.reviewTypes?.length ? [...cycle.reviewTypes] : ['self', 'leader'];
  });
  // TC-046/047 하향 최종 등급 카드 위치(상단/하단/상단고정)
  const [gradeCardPosition, setGradeCardPosition] = useState(
    () => D?.gradeCardPosition ?? initialSeq?.gradeCardPosition ?? 'bottom',
  );
  // v2: 동료 리뷰어 지정 방식 다중선택(시안 peerAssign[]) + 결과 본인 공개 기본값
  const [peerAssignModes, setPeerAssignModes] = useState(() => {
    if (D?.peerAssignModes) return [...D.peerAssignModes];
    if (cycle?.peerAssignModes?.length) return [...cycle.peerAssignModes];
    if (cycle?.peerAssignMode) return [cycle.peerAssignMode];
    return ['ai_recommend'];
  });
  // 단계별 일정(review_sequence) 상태
  const [schedule, setSchedule] = useState(() => ({
    ...(D?.schedule ?? initialSeq?.schedule ?? {}),
  })); // { phaseId: { start, end } } 사용자 오버라이드
  // PW-122 프리셋에서 불러온 일정의 '며칠째' 오프셋. 사이클 시작일이 정해지면
  // 거기에 맞춰 다시 깔린다(원본 사이클의 절대 날짜를 그대로 쓰지 않는다).
  const [presetOffsets, setPresetOffsets] = useState(() => D?.presetOffsets ?? null);
  const [reminders, setReminders] = useState(() => ({
    ...(D?.reminders ?? initialSeq?.reminders ?? {}),
  })); // { phaseId: [reminderObj] }
  const [rmDetail, setRmDetail] = useState(() => new Set()); // 상세(⚙) 펼친 리마인더 id
  const [disabledPhases, setDisabledPhases] = useState(() => {
    if (D?.disabledPhases) return new Set(D.disabledPhases);
    return new Set(
      Object.entries(initialSeq?.enabled ?? {})
        .filter(([, on]) => on === false)
        .map(([id]) => id),
    );
  });
  const [phaseOrder, setPhaseOrder] = useState(() => [
    ...(D?.phaseOrder ?? initialSeq?.order ?? []),
  ]); // 중간 단계 재배열 순서(id)
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  /**
   * PW-443 대상자 정의 — 조직 트리에서 고른 단위 id 집합.
   *
   * 구 「대상 범위」 모드 1개(`include_mode`)를 대신하는 유일한 출처다. 저장은
   * `targetScope = { orgIds, manualExclude, manualInclude }` 한 곳이고, 필터·검색·
   * 접힘 상태는 담지 않는다(보기 조건이지 대상자 정의가 아니다).
   */
  const [orgSelEdit, setOrgSelEdit] = useState(() => {
    if (D?.orgIds) return new Set(D.orgIds);
    return cycle?.targetScope?.orgIds ? new Set(cycle.targetScope.orgIds) : null;
  });
  const [treeCollapsed, setTreeCollapsed] = useState(() => new Set());
  const [groupCollapsed, setGroupCollapsed] = useState(() => new Set());
  // 필터·검색은 **표시만** 거른다. 카운터 세 값과 저장되는 대상자는 흔들리지 않는다.
  const [reviewFilters, setReviewFilters] = useState(emptyAxisSel);
  const [filterOpen, setFilterOpen] = useState(false);
  const [reviewQuery, setReviewQuery] = useState('');
  /** 직전 수동 조정 스냅샷 — 「모두 제외」·그룹 제외를 1회 되돌린다. */
  const [undoSnapshot, setUndoSnapshot] = useState(null);
  // §4.1.1 제외 조건 필터(자동 탐지). 데이터 근거가 있는 두 축만 노출한다.
  const [excludeOnLeave, setExcludeOnLeave] = useState(() => !!D?.exclusionRules?.onLeave);
  const [excludeHireDate, setExcludeHireDate] = useState(
    () => !!D?.exclusionRules?.hireDate,
  );
  const [hireDateRef, setHireDateRef] = useState(
    () => D?.exclusionRules?.hireDateRef ?? '',
  );
  const [hireDateDirection, setHireDateDirection] = useState(
    () => D?.exclusionRules?.hireDateDirection ?? 'after',
  );
  const [hirePicker, setHirePicker] = useState(null);
  // 발령 이력 기반 2종 — 평가 기간 중 직무 변경 / 직급(승진) 변경일 기준
  const [excludeRoleChange, setExcludeRoleChange] = useState(
    () => !!D?.exclusionRules?.roleChange,
  );
  const [excludePromotion, setExcludePromotion] = useState(
    () => !!D?.exclusionRules?.promotion,
  );
  const [promotionRef, setPromotionRef] = useState(
    () => D?.exclusionRules?.promotionRef ?? '',
  );
  const [promotionDirection, setPromotionDirection] = useState(
    () => D?.exclusionRules?.promotionDirection ?? 'after',
  );
  const [promotionPicker, setPromotionPicker] = useState(null);
  // §4.1.2 0단계 '리뷰 & 조정' — 자동 산출 명단을 사람이 최종 가감한다.
  /* 셋 다 `null` = 「아직 사람이 손대지 않았다」. 저장된 `targetScope` 가 없는 구 사이클은
     참여자로부터 환산한 값이 그 자리를 대신한다(아래 legacyScope). */
  const [manualExcludedEdit, setManualExcludedEdit] = useState(
    () => D?.manualExclude ?? cycle?.targetScope?.manualExclude ?? null,
  ); // 대상 → 제외
  const [keptEdit, setKeptEdit] = useState(
    () => D?.manualInclude ?? cycle?.targetScope?.manualInclude ?? null,
  ); // 자동 제외를 되돌려 대상으로 유지
  // 평가 템플릿(step 1) — 워크스페이스 라이브러리 + 빌더 상태
  // 세션 로컬 라이브러리(레거시 경로). `libraryTemplates` 를 넘기면 쓰이지 않는다.
  const [localTemplates, setLocalTemplates] = useState(() => [
    ...(D?.localTemplates ?? []),
  ]);
  /**
   * PW-122 — 저장된 템플릿의 **출처**. 라이브러리 모드면 조직 자산(서버), 아니면 세션 로컬.
   * 아래 모든 읽기(목록·단계 매핑 후보·검증)는 이 하나만 본다.
   */
  const libraryMode = Array.isArray(libraryTemplates);
  const savedTemplates = libraryMode ? libraryTemplates : localTemplates;
  const [tplType, setTplType] = useState(() => D?.tplType ?? 'self'); // 빌더가 편집중인 평가 유형
  const [tplName, setTplName] = useState(() => D?.tplName ?? '');
  // PW-119: 저장 직후엔 이름이 비므로 "이름을 입력하세요" 안내가 성공 직후 뜬다.
  // 방금 저장했다는 사실을 들고 있다가 안내 대신 확인 문구를 보여준다(프리셋 저장과 같은 방식).
  const [tplSaved, setTplSaved] = useState(false);
  const [tplVersion, setTplVersion] = useState(() => D?.tplVersion ?? 'standard');
  const [tplQuestions, setTplQuestions] = useState(
    () => D?.tplQuestions ?? presetFor('standard', 'self'),
  );
  const [tplGrades, setTplGrades] = useState(() => D?.tplGrades ?? DEFAULT_GRADES);
  const [tplAbsolute, setTplAbsolute] = useState(() => !!D?.tplAbsolute); // 절대평가(상대비율 없음)
  const [tplRatioScope, setTplRatioScope] = useState(() => D?.tplRatioScope ?? 'div');
  // 관리 모드에서는 이미 저장된 템플릿 매핑(서버 template id)을 그대로 이어받는다.
  // 여기서 비우면 저장 시 매핑이 통째로 날아가 단계에 템플릿이 없는 사이클이 된다.
  const [phaseTemplateMap, setPhaseTemplateMap] = useState(() => ({
    ...(D?.templateMap ?? initialSeq?.templateMap ?? {}),
  })); // { phaseId: templateId }
  /* PW-433 — 항목 설정 패널. **한 번에 하나만** 연다. 행에는 이미 드래그 핸들·섹션 배지·
     질문·유형 배지·AI 배지·이유 토글·버튼 3개가 있어 설정을 더 붙이면 행이 읽히지 않는다
     (policy §5.11-C). */
  const [tplEditingId, setTplEditingId] = useState(null);
  const [tplDragIdx, setTplDragIdx] = useState(null);
  const [tplDragOverIdx, setTplDragOverIdx] = useState(null);
  const [tplPreview, setTplPreview] = useState(null); // null | 'all' | {questionId}
  /**
   * PW-434 ⑤ 「전체 목록에서 찾기」 모달 · ② 상단 카드에서 «불러오기 전» 여는 전체 미리보기.
   * `tplPeek` 는 «남의 템플릿» 을 읽기 전용으로 보는 것이라 편집 버퍼(`tplPreview`)와
   * 상태를 나눈다 — 한 상태로 겸하면 미리보기가 편집 중인 항목을 덮어쓴 것처럼 보인다.
   */
  const [tplPickerOpen, setTplPickerOpen] = useState(false);
  const [tplPeek, setTplPeek] = useState(null); // 상단 카드 미리보기 대상 템플릿
  /**
   * PW-434 ③ 어느 라이브러리 원본에서 왔는지. 고정 컨텍스트 바가 이걸 읽는다
   * (policy §5.10-C). `snapshot` 은 불러온 직후의 항목 스냅샷 — 이후 항목이 바뀌면
   * `(수정됨)` 을 병기한다. 불러오기는 서버 복제가 아니라 편집 버퍼 프리필이므로
   * 여기서 원본을 다시 건드리지 않는다 (policy §5.10.1).
   */
  const [tplLoadedFrom, setTplLoadedFrom] = useState(null);
  // 직급별 템플릿 버전 (시안 eval_role_template_map). 직급은 멤버 position 에서 도출.
  const [roleMode, setRoleMode] = useState(
    () => D?.roleMode ?? initialSeq?.roleMode ?? 'uniform',
  ); // 'uniform' | 'by_role'
  const [roleVersions, setRoleVersions] = useState(() => ({
    ...(D?.roleVersions ?? initialSeq?.roleVersions ?? {}),
  })); // { 직급: version }

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
  // PW-122 우선순위: 사용자가 직접 고친 값 > 프리셋 오프셋(시작일 기준) > 7일 간격 기본값.
  const presetSchedule = offsetsToSchedule(presetOffsets, startDate);
  const scheduleOf = (id) =>
    schedule[id] || presetSchedule[id] || defaultSchedule[id] || { start: '', end: '' };
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
  // PW-119: 저장 버튼을 비활성으로만 두면 왜 안 눌리는지 알 길이 없다.
  // 막고 있는 첫 번째 사유를 골라 버튼 옆에 그대로 띄운다(위에서부터 우선).
  const tplSaveBlockKey = !tplName.trim()
    ? 'templateBlockName'
    : !tplGrades.every((g) => g.label.trim())
      ? 'templateBlockGradeLabel'
      : tplDupLabels.size > 0
        ? 'templateBlockDupGrade'
        : tplRatioInvalid
          ? 'templateBlockRatio'
          : null;
  // 대상 멤버 jobPosition(직책)에서 목록 도출(중복 제거, 빈값 제외).
  const roleLevels = [
    ...new Set(candidates.map((c) => c.jobPosition).filter(Boolean)),
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
  /**
   * PW-434 ⑤ 상단 「저장된 템플릿에서 시작」 블록의 후보 — **지금 편집 중인 유형**만.
   * `기본 지정` 을 앞세우고 그다음 사용 횟수 내림차순이며, 최대 4장만 편다.
   * 이 블록은 목록이 아니라 **진입점**이다 — 전량은 「전체 목록에서 찾기」가 맡는다
   * (policy §5.10.1 「상단 시작 블록 구성」).
   */
  const startTemplates = savedTemplates
    .filter(
      (t) => (t.status || 'active') === 'active' && (t.reviewType || 'self') === tplType,
    )
    .slice()
    .sort(
      (a, b) =>
        (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0) ||
        (b.usageCount || 0) - (a.usageCount || 0),
    )
    .slice(0, MAX_START_TEMPLATES);
  // 불러온 뒤 항목을 고쳤는가 — 고정 바의 `(수정됨)` 병기 판정 (policy §5.10-C).
  const tplLoadedEdited =
    !!tplLoadedFrom && JSON.stringify(tplQuestions) !== tplLoadedFrom.snapshot;
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
    const id = `c${Date.now()}_${text.length}`;
    setTplQuestions((qs) => [
      ...qs,
      {
        id,
        section,
        text: text.trim(),
        type,
        /*
         * PW-433 ③ — 새 체크박스는 **빈 선택지 목록을 실제로 들고** 태어난다.
         * 🔴 `options` 를 비워 두면(undefined) 저장 페이로드에도 안 실려, 서버가
         * 「선택지를 정한 적 없는 구 항목」으로 보고 통과시킨다 — 화면엔 빈 선택지 칸이
         * 두 개 떠 있는데 저장은 조용히 성공하고, 만들어진 항목은 제목 1개짜리 구 체크박스가
         * 된다. 티켓이 신고한 바로 그 증상이다. 목록을 들려 보내야 §5.11-B 저장 차단이 걸린다.
         */
        ...(type === 'checkbox' ? { options: DEFAULT_CHECK_OPTIONS } : null),
      },
    ]);
    // PW-433 §5.11-B — 척도·체크박스는 추가 설정 없이는 미완성인 유형이라 패널을 바로 연다.
    if (type === 'rating' || type === 'checkbox') setTplEditingId(id);
  };

  /* ── PW-433 항목 단위 설정 ──────────────────────────────────────────────
     🔴 이 핸들러들은 **API 를 호출하지 않는다.** 편집 버퍼만 고치고, 영속화는
     `템플릿 저장` 또는 사이클 생성 한 번뿐이다 — 항목마다 저장 요청을 보내면
     위자드 이탈 시 반쯤 저장된 템플릿이 남는다 (policy §5.11-C 「API 호출」). */
  const patchQuestion = (id, patch) =>
    setTplQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));

  const checkOptionsOf = (q) =>
    q.options && q.options.length ? q.options : DEFAULT_CHECK_OPTIONS;
  const patchCheckOption = (q, oid, label) =>
    patchQuestion(q.id, {
      options: checkOptionsOf(q).map((o) => (o.id === oid ? { ...o, label } : o)),
    });
  const addCheckOption = (q) => {
    const cur = checkOptionsOf(q);
    if (cur.length >= CHECK_MAX_OPTIONS) return;
    patchQuestion(q.id, { options: [...cur, { id: `o${Date.now()}`, label: '' }] });
  };
  const removeCheckOption = (q, oid) => {
    const cur = checkOptionsOf(q);
    if (cur.length <= CHECK_MIN_OPTIONS) return;
    patchQuestion(q.id, { options: cur.filter((o) => o.id !== oid) });
  };

  // 셀프 템플릿은 작성자=피평가자라 「피평가자 공개」가 성립하지 않는다.
  const disclosureSupported = tplType !== 'self';
  const disclosureOf = (q) =>
    q.disclosure || DEFAULT_DISCLOSURE[tplType] || DEFAULT_DISCLOSURE.leader;
  const patchDisclosure = (q, patch) =>
    patchQuestion(q.id, { disclosure: { ...disclosureOf(q), ...patch } });
  const toggleAudience = (q, aid) => {
    const cur = disclosureOf(q).audience || [];
    patchDisclosure(q, {
      audience: cur.includes(aid) ? cur.filter((x) => x !== aid) : [...cur, aid],
    });
  };

  const updateGrade = (i, field, value) =>
    setTplGrades((gs) => gs.map((g, idx) => (idx === i ? { ...g, [field]: value } : g)));
  /**
   * PW-433 ④ 등급 서열 이동. **배열 순서가 곧 서열**이라 행을 통째로 맞바꾼다 —
   * 등급명·설명·비율이 함께 움직인다 (policy §5.4.4).
   */
  const moveGrade = (i, dir) =>
    setTplGrades((gs) => {
      const to = i + dir;
      if (to < 0 || to >= gs.length) return gs;
      const next = [...gs];
      [next[i], next[to]] = [next[to], next[i]];
      return next;
    });
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
      // PW-117 셀프에는 '피평가자 공개' 토글 자체가 없다. 다른 유형에서 켠 뒤 셀프로
      // 바꾼 경우(커스텀 항목은 유형 전환 시 유지된다) 보이지 않는 플래그가 그대로
      // 저장돼 visibleToRoles 가 붙는 걸 여기서 끊는다.
      questions:
        tplType === 'self'
          ? tplQuestions.map((q) =>
              q.hideFromEvaluatee ? { ...q, hideFromEvaluatee: false } : q,
            )
          : tplQuestions,
      grades: tplGrades,
      absolute: tplAbsolute,
      ratioScope: tplRatioScope,
    };
    if (libraryMode) {
      // 🔴 마법사를 끝내거나 사이클을 오픈해야 등재되는 지연 저장은 금지다 —
      // 사용자가 "저장했는데 없다" 고 느끼는 지점이 정확히 여기다(정책 §3).
      Promise.resolve(onSaveTemplate?.(tpl)).then((saved) => {
        if (!saved) return; // 실패 사유는 templateSaveError 로 온다. 입력은 남긴다.
        setTplName('');
        setTplSaved(true);
      });
      return;
    }
    setLocalTemplates((prev) => [tpl, ...prev]);
    setTplName('');
    setTplSaved(true);
  };
  /**
   * 라이브러리에서 불러오기 — 서버 복제가 아니라 **편집 버퍼 프리필**이다. 이후 항목을 고쳐도
   * 라이브러리 원본은 바뀌지 않는다 (policy §5.10.1 「불러오기 = 프리필」).
   *
   * 🔴 PW-435 ③ × PW-434 ④ 접점 — 불러오기는 **두 번째 `setTplType` 경로**다. 1단계에서 고르지
   * 않은 평가 종류는 유형 카드 클릭으로는 못 가게 막혀 있는데(`selectTplType` 호출 자체가
   * 비활성), 불러오기에는 같은 가드가 없어서 「하향만 켠 사이클에서 셀프용 템플릿을 만드는」
   * 상황이 그대로 재현됐다. 각각은 맞고 **합치면 뚫린 자리**다.
   *
   * ⚠ 가드를 «화면» 이 아니라 «함수» 에 둔다. 이 함수를 부르는 진입점이 둘이기 때문이다 —
   * ① 상단 「저장된 템플릿에서 시작」 카드 ② 「전체 목록에서 찾기」 모달의 행. ①은 현재 유형만
   * 노출해 지금은 안전하지만, 화면에만 두면 **다음 진입점이 생길 때 또 뚫린다.**
   */
  const loadTemplate = (tpl) => {
    const type = tpl.reviewType || 'self';
    if (!reviewTypes.includes(type)) return;
    setTplType(type);
    setTplName(tpl.name);
    setTplVersion(tpl.version);
    setTplQuestions(tpl.questions);
    setTplGrades(tpl.grades);
    setTplAbsolute(!!tpl.absolute);
    setTplRatioScope(tpl.ratioScope || 'div');
    // PW-434 ③ 고정 바가 읽는 출처. 스냅샷을 함께 들고 있어야 «그 뒤에 고쳤는지» 를 말할 수 있다.
    setTplLoadedFrom({
      name: tpl.name,
      revision: tpl.revision || 1,
      snapshot: JSON.stringify(tpl.questions),
    });
    setTplPickerOpen(false);
    setTplPeek(null);
  };

  const togglePeerMode = (key) =>
    setPeerAssignModes((prev) =>
      prev.includes(key)
        ? prev.filter((x) => x !== key)
        : [...prev, key],
    );

  const toggleIn = (setter) => (value) =>
    setter((prev) =>
      prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value],
    );
  // 「리뷰 & 조정」 이동. 대상 → 제외는 manual, 제외 → 대상은 자동 판정 무시(keep).
  const excludeOne = (id) => {
    setKeptIds((prev) => prev.filter((x) => x !== id));
    setManualExcludedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };
  const includeOne = (id) => {
    setManualExcludedIds((prev) => prev.filter((x) => x !== id));
    setKeptIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  /* ── PW-443 대상자 모집단 = 조직 트리에서 고른 단위의 인원 ────────────────────
     구 「대상 범위」 모드 분기(전체/부서/축/개별)는 사라졌다. 모집단을 정하는 손잡이는
     조직 트리 하나이고, 축(직급·고용형태·직렬·직군·직책)은 **표시만** 거르는 필터다. */
  const hasOrgUnits = Array.isArray(orgUnits) && orgUnits.length > 0;
  const orgTree = buildOrgTree(orgUnits, candidates);
  const unitKeyOf = (c) => orgUnitKeyOf(c, hasOrgUnits);
  /** 트리가 아는 단위 id 전체 — 여기 없는 소속은 「미지정」으로 모은다. */
  const knownUnitIds = new Set(
    orgTree.flatMap((d) => [
      ...(d.selfSelectable ? [d.id] : []),
      ...d.teams.map((t) => t.id),
    ]),
  );
  const bucketOf = (c) => {
    const key = unitKeyOf(c);
    return knownUnitIds.has(key) ? key : UNASSIGNED_ORG_ID;
  };
  const unassignedCount = candidates.filter(
    (c) => bucketOf(c) === UNASSIGNED_ORG_ID,
  ).length;

  /**
   * 구 사이클 환산 — 「대상 범위」 모드로 저장돼 `targetScope` 가 없는 사이클을 관리로 열 때.
   *
   * 참여자들이 실제로 걸려 있는 조직을 켜고, 그 조직에 있으면서 참여자가 아닌 사람을
   * 수동 제외로 채운다. 결과 명단은 저장돼 있던 참여자와 **정확히 같다** — 어느 모드로
   * 만들어졌든 마찬가지다. 참여자가 없어 환산할 근거가 없으면 **아무것도 켜지 않는다**:
   * 대상자를 조용히 0명으로 만드는 것보다 「조직을 선택하세요」가 낫다.
   *
   * 상태가 아니라 파생값이다 — 후보 명단이 늦게 도착해도 도착하는 렌더에서 바로 맞는
   * 값이 나오고, 이펙트로 상태를 뒤늦게 덮어쓰는 경로가 없다.
   */
  const legacyScope = (() => {
    if (!isManage || cycle?.targetScope || participants.length === 0) return null;
    const memberIds = participants.map((p) => p.memberId);
    const units = new Set(
      candidates.filter((c) => memberIds.includes(c.id)).map(bucketOf),
    );
    if (units.size === 0) return null;
    return {
      orgIds: units,
      manualExclude: candidates
        .filter((c) => units.has(bucketOf(c)) && !memberIds.includes(c.id))
        .map((c) => c.id),
    };
  })();
  const orgSel = orgSelEdit ?? legacyScope?.orgIds ?? EMPTY_ORG_SEL;
  const manualExcludedIds =
    manualExcludedEdit ?? legacyScope?.manualExclude ?? EMPTY_IDS;
  const keptIds = keptEdit ?? EMPTY_IDS;
  /* 「손대지 않음(null)」을 현재 값으로 확정하고 나서 갱신한다. 이벤트 핸들러는 이
     렌더의 값을 보고 부르므로 함수형 갱신자도 여기서 안전하게 풀린다. */
  const setOrgSel = (next) =>
    setOrgSelEdit(typeof next === 'function' ? next(orgSel) : next);
  const setManualExcludedIds = (next) =>
    setManualExcludedEdit(typeof next === 'function' ? next(manualExcludedIds) : next);
  const setKeptIds = (next) =>
    setKeptEdit(typeof next === 'function' ? next(keptIds) : next);
  /** 부서 행이 한 번에 켜고 끄는 단위들. */
  const unitsOfDept = (d) => [
    ...(d.selfSelectable ? [d.id] : []),
    ...d.teams.map((t) => t.id),
  ];
  const scopedCandidates = candidates.filter((c) => orgSel.has(bucketOf(c)));

  // 발령 이력 근거 — "이 사람의 이 필드가 언제 바뀌었나". 현재 값(candidates)만으로는
  // 알 수 없어 소비 측이 appointmentChanges 로 넣어 준다. 비어 있으면 규칙이 아무도 못 잡는다.
  const changedInPeriod = (userId, field) =>
    appointmentChanges.some(
      (a) =>
        a.userId === userId &&
        a.field === field &&
        (!startDate || a.date >= startDate) &&
        (!endDate || a.date <= endDate),
    );
  const changedRelativeTo = (userId, field, ref, direction) =>
    appointmentChanges.some(
      (a) =>
        a.userId === userId &&
        a.field === field &&
        (direction === 'after' ? a.date > ref : a.date < ref),
    );

  // §4.1.1 제외 조건 필터 — 개별 선택 모드는 관리자가 직접 고른 명단이므로 적용하지 않는다.
  // 구 '개별 선택' 모드가 사라져 제외 조건을 끄는 분기도 함께 없어졌다 —
  // 모집단은 언제나 조직 트리가 정하고, 조건은 그 위에서 항상 돈다.
  const autoExclusions = scopedCandidates.flatMap((c) => {
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
        // 평가 기간 중 직무가 바뀐 사람(발령 이력 근거). 기간은 1단계에서 고른 평가 기간.
        if (excludeRoleChange && changedInPeriod(c.id, 'jobTitle')) {
          return [{ memberId: c.id, exclusionType: 'role_change' }];
        }
        // 직급(jobLevel) 변경일 기준 — 기준일 이전/이후에 승진한 사람.
        if (excludePromotion && promotionRef) {
          const hit = changedRelativeTo(c.id, 'jobLevel', promotionRef, promotionDirection);
          if (hit) {
            return [
              {
                memberId: c.id,
                exclusionType: 'promotion_change',
                referenceDate: promotionRef,
                referenceDateDirection: promotionDirection,
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

  /* ── 필터·검색 — 표시만 거른다(카운터 3값과 저장분은 흔들리지 않는다) ────────── */
  /** 축의 값 목록. 직렬은 고른 직군 아래로 좁는다(직군 → 직렬은 부모–자식). */
  const axisValuesFor = (axisKey, sel) => {
    const pool =
      axisKey === 'jobTitle' && (sel.jobFamily ?? []).length > 0
        ? scopedCandidates.filter((c) => sel.jobFamily.includes(c.jobFamily))
        : scopedCandidates;
    return [...new Set(pool.map((c) => c[axisKey]).filter(Boolean))];
  };
  /** 값별 인원수 — 「지금 조직 선택 안에서」 센다. */
  const axisCountsFor = (axisKey) =>
    scopedCandidates.reduce((acc, c) => {
      const v = c[axisKey];
      if (!v) return acc;
      return { ...acc, [v]: (acc[v] ?? 0) + 1 };
    }, {});
  const axisHit = (c) =>
    REVIEW_AXIS_KEYS.every((k) => {
      const sel = reviewFilters[k] ?? [];
      return sel.length === 0 || sel.includes(c[k]);
    });
  const nameHit = (c) => {
    const q = reviewQuery.trim().toLowerCase();
    // 검색은 이름만 본다 — 부서·직책까지 걸면 조직 트리·축 필터와 뜻이 겹친다(E8).
    return !q || (c.name ?? '').toLowerCase().includes(q);
  };
  const visibleTargets = targetMembers.filter((c) => axisHit(c) && nameHit(c));
  const activeFilterCount = REVIEW_AXIS_KEYS.reduce(
    (n, k) => n + (reviewFilters[k] ?? []).length,
    0,
  );
  const anyReviewFilter = activeFilterCount > 0 || reviewQuery.trim().length > 0;
  const clearReviewFilters = () => {
    setReviewFilters(emptyAxisSel());
    setReviewQuery('');
  };
  /** 활성 필터 칩 — 축마다 하나. 값이 여럿이면 `직급 · 책임 외 1` 로 접는다. */
  const filterChips = REVIEW_AXES.filter(
    (a) => (reviewFilters[a.key] ?? []).length > 0,
  ).map((a) => {
    const vs = reviewFilters[a.key];
    return {
      key: a.key,
      text:
        vs.length > 1
          ? fill(L.targetFilterChipMore, {
              axis: L[a.labelKey],
              value: vs[0],
              rest: vs.length - 1,
            })
          : fill(L.targetFilterChip, { axis: L[a.labelKey], value: vs[0] }),
    };
  });

  /* ── 조직 트리 조작 ──────────────────────────────────────────────────────── */
  const countOfUnit = (unitId) =>
    candidates.filter((c) => bucketOf(c) === unitId).length;
  const deptCount = (d) =>
    unitsOfDept(d).reduce((n, id) => n + countOfUnit(id), 0);
  const deptState = (d) => {
    const ids = unitsOfDept(d);
    const on = ids.filter((id) => orgSel.has(id)).length;
    if (on === 0) return 'off';
    return on === ids.length ? 'on' : 'partial';
  };
  const allUnitIds = [
    ...orgTree.flatMap(unitsOfDept),
    ...(unassignedCount > 0 ? [UNASSIGNED_ORG_ID] : []),
  ];
  const rootState =
    orgSel.size === 0
      ? 'off'
      : allUnitIds.every((id) => orgSel.has(id))
        ? 'on'
        : 'partial';
  const toggleUnits = (ids, turnOn) =>
    setOrgSel((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (turnOn ? next.add(id) : next.delete(id)));
      return next;
    });

  /* ── 중앙 명단 그룹 — 부서 · 팀 단위. 조직 설정 순서 그대로 세운다(정렬 컨트롤 없음). */
  const reviewGroups = [];
  orgTree.forEach((d) => {
    unitsOfDept(d).forEach((unitId) => {
      if (!orgSel.has(unitId)) return;
      const members = visibleTargets.filter((c) => bucketOf(c) === unitId);
      if (members.length === 0) return;
      const team = d.teams.find((t) => t.id === unitId);
      reviewGroups.push({
        id: unitId,
        label: team ? `${d.name} · ${team.name}` : d.name,
        members,
      });
    });
  });
  if (orgSel.has(UNASSIGNED_ORG_ID)) {
    const members = visibleTargets.filter(
      (c) => bucketOf(c) === UNASSIGNED_ORG_ID,
    );
    if (members.length > 0) {
      reviewGroups.push({
        id: UNASSIGNED_ORG_ID,
        label: L.targetOrgUnassigned,
        members,
      });
    }
  }

  /** 여럿을 한 번에 옮긴다 — 되돌리기 1회를 위해 직전 상태를 스냅샷으로 남긴다. */
  const moveMany = (list, toExcluded) => {
    if (list.length === 0) return;
    setUndoSnapshot({ manual: [...manualExcludedIds], kept: [...keptIds] });
    const ids = list.map((c) => c.id);
    if (toExcluded) {
      setKeptIds((prev) => prev.filter((x) => !ids.includes(x)));
      setManualExcludedIds((prev) => [
        ...prev,
        ...ids.filter((id) => !prev.includes(id)),
      ]);
    } else {
      setManualExcludedIds((prev) => prev.filter((x) => !ids.includes(x)));
      setKeptIds((prev) => [...prev, ...ids.filter((id) => !prev.includes(id))]);
    }
  };
  const undoMove = () => {
    if (!undoSnapshot) return;
    setManualExcludedIds(undoSnapshot.manual);
    setKeptIds(undoSnapshot.kept);
    setUndoSnapshot(null);
  };


  const step1Valid =
    name.trim() &&
    startDate &&
    endDate &&
    reviewTypes.length > 0 &&
    (!hasPeer || peerAssignModes.length > 0);
  const targetsValid = targetCount > 0;
  // 「다음」 판정은 **선택 위원 수**로만 한다 — 검색 결과 수와 무관하다(PW-161).
  const committeeValid = !committeeOn || committee.length > 0;

  /**
   * PW-440 ② — 초안에 담을 것을 한 곳에서 모은다.
   *
   * 🔴 **담는 것과 안 담는 것의 경계가 이 함수다.**
   * 담는다: 1~5단계의 «설정» 과 머문 단계.
   * 안 담는다: 필터·검색·트리 접힘 같은 **보기 조건**(§5.5.3 규칙 1 — 「지금 무엇을
   * 보고 있나」이지 대상자 정의가 아니다), 아직 [적용]하지 않은 AI 초안(절대규칙 3),
   * 열려 있는 팝오버·모달의 미확정 입력(모달은 [확인]으로 본문에 반영된 뒤에야 대상).
   *
   * 라이브러리 템플릿은 **참조 id 로만** 담는다(`templateMap`). 본문을 스냅샷하면
   * PW-122 가 세운 2계층(라이브러리 원본 ↔ 오픈 시 사이클 스냅샷)이 3계층이 된다.
   * 세션 로컬 템플릿(라이브러리를 안 쓰는 소비자)만 본문째 담는다 — 그건 위자드가
   * 소유한 값이라 여기 없으면 어디에도 남지 않는다.
   *
   * `Set` 은 배열로 눕힌다 — JSON 으로 오가는 값이라 `Set` 은 `{}` 가 된다.
   */
  const collectDraft = () => ({
    step,
    // 1단계
    name,
    startDate,
    endDate,
    reviewTypes,
    peerAssignModes,
    // 2단계 — 템플릿 빌더 + 유형별 적용 템플릿
    tplType,
    tplName,
    tplVersion,
    tplQuestions,
    tplGrades,
    tplAbsolute,
    tplRatioScope,
    templateMap: phaseTemplateMap,
    roleMode,
    roleVersions,
    localTemplates: libraryMode ? [] : localTemplates,
    // 3단계 — 일정·순서·ON/OFF·리마인더
    schedule,
    presetOffsets,
    reminders,
    disabledPhases: [...disabledPhases],
    phaseOrder,
    gradeCardPosition,
    // 4단계 — 제외 조건 + 조직 선택 + 수동 가감
    exclusionRules: {
      onLeave: excludeOnLeave,
      hireDate: excludeHireDate,
      hireDateRef,
      hireDateDirection,
      roleChange: excludeRoleChange,
      promotion: excludePromotion,
      promotionRef,
      promotionDirection,
    },
    orgIds: [...orgSel],
    manualExclude: manualExcludedIds,
    manualInclude: keptIds,
    // 5단계 — 위원회
    committeeOn,
    committee,
  });

  /* 저장 상태. `savedSnapshot` 은 마지막으로 서버에 보낸 초안의 JSON 이다 —
     「저장 이후 바뀐 것이 있나」를 값으로 판정한다(플래그로 두면 되돌린 편집까지
     «변경»으로 세어, 아무것도 안 바뀌었는데 이탈할 때마다 묻게 된다). */
  const [draftSavedAt, setDraftSavedAt] = useState(
    () => (isDraftResume ? draftSavedAtProp : null),
  );
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    isDraftResume && draftState ? JSON.stringify(draftState) : null,
  );
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftError, setDraftError] = useState(false);
  /* 이탈 확인 다이얼로그. null 이면 안 떠 있다. */
  const [leaveAsk, setLeaveAsk] = useState(false);

  const draftSnapshot = draftEnabled ? JSON.stringify(collectDraft()) : null;
  /* 저장 이후 바뀐 것이 있나. 한 번도 저장 안 했으면 「입력이 있으면 변경」으로 본다. */
  const draftDirty = draftEnabled && draftSnapshot !== savedSnapshot;

  /**
   * PW-440 ① — 초안 저장. 저장 계기는 셋이다: 단계 이동(자동) · `임시저장`(수동) ·
   * 이탈 시도.
   *
   * 🔴 **이동을 막지 않는다.** 저장을 기다렸다 렌더하면 매 단계마다 화면이 멈춘 것처럼
   * 보인다. 실패해도 이미 일어난 이동은 되돌리지 않고 푸터에만 알린다(§5.1-A-1).
   */
  const saveDraft = async (overrides) => {
    if (!draftEnabled) return null;
    const payload = { ...collectDraft(), ...(overrides ?? {}) };
    const snapshot = JSON.stringify(payload);
    setDraftSaving(true);
    setDraftError(false);
    try {
      const result = await onSaveDraft({
        draftState: payload,
        draftStep: clampStep(payload.step),
        name: payload.name,
      });
      if (!result) {
        setDraftError(true);
        return null;
      }
      setDraftSavedAt(result.savedAt ?? null);
      setSavedSnapshot(snapshot);
      return result;
    } catch {
      // 저장 실패가 위자드를 닫으면 작성 중이던 설정이 통째로 날아간다 — 이 카드가
      // 없애려는 바로 그 일이다. 사유만 푸터에 남기고 화면은 유지한다.
      setDraftError(true);
      return null;
    } finally {
      setDraftSaving(false);
    }
  };

  // 단계 이동 — 위원 검색어는 초기화하고 선택은 유지한다. 돌아왔을 때 예전 검색어가
  // 남아 있으면 후보가 몇 명뿐인 것처럼 보인다.
  const goStep = (next) => {
    setCommitteeSearch('');
    setStep(next);
    // 이동한 «최종» 단계를 담는다 — `step` 은 이 렌더의 값이라 아직 예전 단계다.
    if (draftEnabled) void saveDraft({ step: next });
  };

  /**
   * PW-440 ③ — 이탈 시도. 구 동작은 바깥 클릭·`✕` 에서 **경고 한 줄 없이** 닫혔다
   * (제보 본문 마지막 문장이 이것이다). 이제 세 갈래로 묻는다.
   *
   * 저장 이후 바뀐 것이 없으면 묻지 않는다 — 저장된 것을 두고 「사라집니다」라고
   * 묻는 것은 거짓이다(§5.1-A-5).
   */
  const requestClose = () => {
    if (draftEnabled && draftDirty) {
      setLeaveAsk(true);
      return;
    }
    onCancel?.();
  };

  const leaveWithSave = async () => {
    const result = await saveDraft();
    // 🔴 실패하면 다이얼로그도 위자드도 닫지 않는다. 닫으면 입력이 사라지는데,
    // 사용자는 「임시저장하고 나가기」를 눌렀으니 저장된 줄 안다 — 가장 나쁜 실패다.
    if (!result) return;
    setLeaveAsk(false);
    onCancel?.();
  };

  // PW-161 위원 후보 필터 — 이름·부서·직책 부분 일치(대소문자 무시, 앞뒤 공백 trim).
  // 단계 진입 시 1회 조회한 명단에 대한 클라이언트 필터라 타건마다 API 를 부르지 않는다.
  const committeeQuery = committeeSearch.trim().toLowerCase();
  const visibleCommitteeCandidates = committeeQuery
    ? committeeCandidates.filter((c) =>
        [c.name, c.dept, c.jobPosition].some((v) =>
          String(v ?? '')
            .toLowerCase()
            .includes(committeeQuery),
        ),
      )
    : committeeCandidates;
  // 선택은 검색 결과가 아니라 위자드 상태(committee)가 소유한다. 검색 결과 밖으로 밀려난
  // 선택 위원은 카드로는 안 보이지만 요약 바에서 확인·해제할 수 있어야 한다.
  const visibleCommitteeIds = new Set(visibleCommitteeCandidates.map((c) => c.id));
  const hiddenSelectedCount = committee.filter((id) => !visibleCommitteeIds.has(id)).length;
  const committeeById = new Map(committeeCandidates.map((c) => [c.id, c]));
  const committeeChair = committee.length > 0 ? committeeById.get(committee[0]) : null;
  const toggleCommittee = (id) =>
    setCommittee((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  // PW-123 평가 템플릿 게이트.
  //
  // 템플릿을 하나도 만들지 않고 끝까지 눌러도 사이클이 만들어졌다. 그렇게 만든 사이클은
  // 리뷰 화면에서 templateMap[단계] 가 비어 **문항이 0개인 평가지**가 열린다(에러 없이).
  // 그래서 "각 리뷰 단계에 적용할 템플릿이 지정됐는가"를 진행 조건으로 둔다.
  //
  // 매핑을 채우는 곳은 3단계(단계별 일정)지만, 매핑할 템플릿 자체는 2단계에서 만든다.
  // 2단계에서 유형별 템플릿을 안 만들면 3단계 드롭다운이 아예 안 뜨므로(빈 상태 안내),
  // 두 단계를 각각 막아 어디서 무엇이 모자란지 그 자리에서 알 수 있게 한다.
  const templatePhases = displayPhases.filter(
    (p) => PHASE_TO_REVIEW_TYPE[p.id] && !disabledPhases.has(p.id),
  );
  // 관리 모드는 savedTemplates 가 비어 있고 서버 template id 매핑만 들고 온다 —
  // 이미 매핑된 단계는 라이브러리에 없어도 충족으로 본다.
  const phasesMissingLibrary = templatePhases.filter(
    (p) =>
      !phaseTemplateMap[p.id] &&
      !savedTemplates.some((t) => t.reviewType === PHASE_TO_REVIEW_TYPE[p.id]),
  );
  const phasesMissingTemplate = templatePhases.filter(
    (p) => !phaseTemplateMap[p.id],
  );
  const templateLibraryValid = phasesMissingLibrary.length === 0;
  const templateMapValid = phasesMissingTemplate.length === 0;
  const phaseNames = (phases) => phases.map((p) => L[p.nameKey]).join(', ');

  const canAdvance =
    (step === 0 && step1Valid) ||
    (step === 1 && templateLibraryValid) ||
    (step === 2 && templateMapValid) ||
    (step === 3 && targetsValid) ||
    (step === 4 && committeeValid);

  // 단계 표를 눌러 자유 이동할 수 있으므로(§5.1), 마지막 '생성' 버튼도 같은 조건을 다시 본다.
  // 안 그러면 앞 단계를 건너뛰고 곧장 생성해서 게이트가 통째로 무력해진다.
  const canSubmit =
    step1Valid && templateLibraryValid && templateMapValid && targetsValid && committeeValid;
  const submitBlockHint = !step1Valid
    ? L.submitBlockBasics
    : !templateLibraryValid
      ? L.submitBlockTemplate
      : !templateMapValid
        ? L.submitBlockTemplateMap
        : !targetsValid
          ? L.submitBlockTargets
          : !committeeValid
            ? L.submitBlockCommittee
            : null;

  const submit = () => {
    const payload = {
      name: name.trim(),
      startDate,
      endDate,
      reviewTypes,
      peerAssignMode: hasPeer ? peerAssignModes[0] : undefined,
      peerAssignModes: hasPeer ? peerAssignModes : undefined,
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
      //
      // PW-122 라이브러리 모드에서는 **보내지 않는다.** 템플릿은 이미 조직 자산으로
      // 저장돼 있고 `templateMap` 이 그 실제 id 를 가리킨다. 여기서 또 보내면 같은
      // 평가지가 사이클마다 복제돼 라이브러리가 무의미해진다.
      evalTemplates: libraryMode
        ? []
        : savedTemplates
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
      // PW-443 — 대상자 정의의 단일 출처. 구 `includeMode`(모드 1개 모델)는 폐기했다.
      // 필터·검색은 담지 않는다 — 보기 조건이지 대상자 정의가 아니다.
      targetScope: {
        orgIds: [...orgSel],
        manualExclude: manualExcludedIds.filter((id) =>
          scopedCandidates.some((c) => c.id === id),
        ),
        manualInclude: keptIds.filter((id) =>
          scopedCandidates.some((c) => c.id === id),
        ),
      },
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
        roleVersions: roleMode === 'by_role' ? roleVersions : {},
      },
      // PW-122: 템플릿 본문까지 담아야 '템플릿을 그대로 가져옵니다' 가 사실이 된다.
      // 여기 없으면 단계별 템플릿 매핑(templateMap)만 남아 가리킬 대상이 사라진다.
      templateConfig: { templates: savedTemplates },
      // A4: '대상자 조건' 까지 포함해야 프리셋이 사이클 설정 전체를 복제한다.
      targetConfig: {
        reviewTypes,
        peerAssignModes,
        // 대상자 «조건» 은 이제 조직 선택이다. 프리셋은 사이클 설정의 복제라 함께 담는다.
        orgIds: [...orgSel],
        exclusionRules: {
          onLeave: excludeOnLeave,
          hireDate: excludeHireDate,
          hireDateRef,
          hireDateDirection,
          roleChange: excludeRoleChange,
          promotion: excludePromotion,
          promotionRef,
          promotionDirection,
        },
      },
    });
    setPresetSaved(true);
    setPresetName('');
  };

  // TC-028 프리셋 불러오기 → 기본 설정 프리필(리뷰종류·배정방식·공개·등급위치·일정).
  const applyPreset = (preset) => {
    const cfg = preset?.targetConfig || {};
    if (Array.isArray(cfg.reviewTypes)) setReviewTypes(cfg.reviewTypes);
    if (Array.isArray(cfg.peerAssignModes))
      setPeerAssignModes(cfg.peerAssignModes);
    // A4: 대상자 조건(범위 축·제외 규칙)도 함께 복원한다.
    if (Array.isArray(cfg.orgIds)) setOrgSel(new Set(cfg.orgIds));
    const ex = cfg.exclusionRules || {};
    setExcludeOnLeave(!!ex.onLeave);
    setExcludeHireDate(!!ex.hireDate);
    setHireDateRef(ex.hireDateRef || '');
    setHireDateDirection(ex.hireDateDirection || 'after');
    setExcludeRoleChange(!!ex.roleChange);
    setExcludePromotion(!!ex.promotion);
    setPromotionRef(ex.promotionRef || '');
    setPromotionDirection(ex.promotionDirection || 'after');
    const rs = preset?.reviewSequence;
    if (rs?.gradeCardPosition) setGradeCardPosition(rs.gradeCardPosition);
    // PW-122 일정은 '며칠째'로 바꿔 들고, 사이클 시작일에 맞춰 다시 깐다.
    // 원본 사이클의 절대 날짜를 그대로 넣으면 새 사이클 기간 밖 날짜가 박힌다.
    if (rs?.schedule) {
      setPresetOffsets(scheduleToOffsets(rs.schedule));
      setSchedule({});
    }
    // 단계 순서·on/off 도 복원(저장은 하고 있었는데 복원을 빠뜨렸다).
    if (Array.isArray(rs?.order)) {
      setPhaseOrder(rs.order.filter((id) => id !== 'self' && id !== 'share'));
    }
    if (rs?.enabled && typeof rs.enabled === 'object') {
      setDisabledPhases(
        new Set(Object.keys(rs.enabled).filter((id) => rs.enabled[id] === false)),
      );
    }
    // PW-122 템플릿 라이브러리 + 단계별 매핑 + 직급별 버전까지 복원한다.
    // 템플릿을 먼저 되살려야 매핑(templateMap)이 가리킬 대상이 생긴다.
    const tpl = preset?.templateConfig || {};
    // 라이브러리 모드에서는 템플릿의 정본이 서버 목록이라 프리셋 사본으로 덮지 않는다.
    // (프리셋의 templateMap 은 그대로 라이브러리 id 를 가리킨다.)
    if (!libraryMode && Array.isArray(tpl.templates))
      setLocalTemplates(tpl.templates);
    if (rs?.templateMap && typeof rs.templateMap === 'object') {
      setPhaseTemplateMap({ ...rs.templateMap });
    }
    if (rs?.roleMode) setRoleMode(rs.roleMode);
    if (rs?.roleVersions && typeof rs.roleVersions === 'object') {
      setRoleVersions({ ...rs.roleVersions });
    }
  };

  // A4 불러오기 다이얼로그 — 목록에서 고르고 '이 설정으로 시작'.
  // 이미 입력한 값이 있으면 덮어쓰기 전에 확인을 받는다.
  const [presetDialogOpen, setPresetDialogOpen] = useState(false);
  const [pendingPresetId, setPendingPresetId] = useState(null);
  const wizardDirty =
    !!name.trim() ||
    !!startDate ||
    !!endDate ||
    orgSel.size > 0;

  const loadPresetById = async (presetId) => {
    if (!presetId || !onLoadPreset) return;
    setSelectedPresetId(presetId);
    const preset = await onLoadPreset(presetId);
    applyPreset(preset);
    setPresetDialogOpen(false);
    setPendingPresetId(null);
  };

  const startFromPreset = (presetId) => {
    if (wizardDirty) {
      setPendingPresetId(presetId);
      return;
    }
    void loadPresetById(presetId);
  };

  return createPortal(
    <div className="evc-modal-overlay" onClick={requestClose}>
      <div className="evc-wiz" onClick={(e) => e.stopPropagation()}>
        <div className="evc-wiz-header">
          <h3 className="evc-modal-title" data-testid="evc-wiz-title">
            {isManage
              ? fill(L.manageTitle, { name: cycle.name ?? '' })
              : isDraftResume
                ? fill(L.draftResumeTitle, { name: name || L.draftUntitled })
                : L.createTitle}
          </h3>
          <button
            type="button"
            className="evc-wiz-close"
            onClick={requestClose}
            aria-label={L.cancel}
          >
            ✕
          </button>
        </div>

        {/* PW-440 — 이어쓰기로 열렸다는 사실과 «언제·누가» 저장했는지를 먼저 알린다.
            이게 없으면 값이 채워진 채 열린 화면이 「내가 만들다 만 것」인지
            「누가 만들어 둔 것」인지 구분되지 않는다. */}
        {isDraftResume && (
          <div className="evc-wiz-draft-banner" data-testid="evc-wiz-draft-banner">
            <InfoIcon size={14} />
            <span>
              {fill(L.draftResumeBanner, {
                stamp: stampDateTime(draftSavedAtProp),
              })}
              {draftSavedByName
                ? ` · ${fill(L.draftSavedBy, { name: draftSavedByName })}`
                : ''}
            </span>
          </div>
        )}

        <StepBar steps={steps} current={step} labels={L} onJump={goStep} />

        <div className="evc-wiz-body">
          {step === 0 && (
            <div className="evc-wiz-panel">
              {/* TC-028 저장된 설정 프리셋 불러오기 — 관리 모드에서는 숨긴다
                  (이미 값이 들어 있는 사이클을 프리셋으로 덮어쓰는 건 수정이 아니다). */}
              {!isManage && presets.length > 0 && onLoadPreset && (
                <div className="evc-wiz-preset-load">
                  <div className="evc-preset-cta">
                    <div className="evc-preset-cta-text">
                      <span className="evc-field-label">{L.presetLoadLabel}</span>
                      <span className="evc-preset-cta-sub">
                        {fill(L.presetLoadSub, { count: presets.length })}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="evc-btn is-primary"
                      onClick={() => setPresetDialogOpen(true)}
                      data-testid="evc-wiz-preset-open"
                    >
                      {L.presetLoadOpen}
                    </button>
                  </div>
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
                        <span
                          className={`evc-member-check${peerAssignModes.includes(m.key) ? ' is-on' : ''}`}
                          data-testid={`evc-wiz-mode-check-${m.key}`}
                        />
                        <span className="evc-mode-name">{L[m.label]}</span>
                        {m.badge && (
                          <span className={`evc-mode-badge${m.badge === 'exceptionBadge' ? ' is-warn' : ''}`}>
                            {L[m.badge]}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* PW-433 C안(David 확정 2026-08-23) — 사이클 토글 F2 는 폐지됐다.
                      공개 범위는 항목마다 다를 수 있어 사이클 하나의 ON/OFF 로는 표현되지 않는다.
                      🔴 자리를 비우지 않는 이유: 스위치를 조용히 없애면 쓰던 사람이
                      사라진 스위치를 찾는다 (policy §5.2.3 「화면 처리」). */}
                  <p
                    className="evc-wiz-hint"
                    data-testid="evc-wiz-peer-visibility-moved"
                  >
                    {L.peerVisibilityMovedNote}
                  </p>
                </>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="evc-wiz-panel">
              {/* PW-434 ③ 편집 컨텍스트 고정 바 — 「템플릿을 수정시 내가 지금 어떤 템플릿을
                  수정하는지 확인이 필요함 · 스크롤을 내리면 위의 선택된 부분이 안보이다 보니
                  어떤 항목인지 헷갈릴 수 있음」(티켓 원문).
                  2단계는 유형·버전·직급·등급·항목이 한 화면에 세로로 쌓이는데, 시간을 오래 쓰는
                  곳은 맨 아래 항목이고 «지금 무엇을 만드는가» 는 전부 맨 위에 있었다.
                  고정 오프셋 top:94 는 통합 셸 헤더(sticky top:0, h60)와 평가 서브내비
                  (sticky top:60)가 상단을 덮기 때문이다 — top:0 이면 그 아래로 들어가 안 보인다.
                  끌 수 없다: 끌 수 있으면 꺼 둔 사람에게 원래 문제가 그대로 돌아온다.
                  정책: screen-eval-cycle-hr.policy.md §5.10-C */}
              <div className="evc-tpl-ctxbar" data-testid="evc-tpl-ctxbar">
                <div className="evc-tpl-ctxbar-info">
                  <span className="evc-tpl-ctxbar-label">{L.tplEditingNow}</span>
                  <span className="evc-tpl-ctxbar-type" data-testid="evc-tpl-ctxbar-type">
                    {fill(L.tplForType, {
                      type: L[TEMPLATE_TYPES.find((rt) => rt.id === tplType)?.nameKey] || tplType,
                    })}
                  </span>
                  <span className="evc-tpl-ctxbar-version">
                    {L[TEMPLATE_VERSIONS.find((v) => v.id === tplVersion)?.labelKey] || tplVersion}
                    {tplIsCustomized ? ` ${L.tplCustomized}` : ''}
                    {roleMode === 'by_role' ? ` · ${L.roleModeByRole}` : ''}
                  </span>
                  <span className="evc-tpl-ctxbar-meta">
                    {fill(L.templateMeta, {
                      items: tplQuestions.length,
                      grades: tplGrades.length,
                    })}
                  </span>
                  {/* 어느 라이브러리 원본에서 왔는지도 여기서 항상 보인다. 종전에는 이 정보가
                      아예 없었고, 시안에서는 항목 목록 «아래» 라 정작 항목을 고치는 동안에는
                      화면 밖이었다 (policy §5.10.1 「불러오기 = 프리필」). */}
                  {tplLoadedFrom && (
                    <span className="evc-tpl-ctxbar-from" data-testid="evc-tpl-ctxbar-from">
                      <PaperclipIcon size={12} /> {tplLoadedFrom.name} v{tplLoadedFrom.revision}
                      {tplLoadedEdited && (
                        <strong className="evc-tpl-ctxbar-edited">{L.tplCustomized}</strong>
                      )}
                    </span>
                  )}
                </div>
                {/* 스크롤 위치와 무관하게 닿아야 한다 — 하단 액션바의 미리보기와 같은 동작이며
                    중복 배치는 의도다 (policy §5.10-C 「우측 액션」). */}
                <button
                  type="button"
                  className="evc-btn is-ghost evc-tpl-ctxbar-preview"
                  onClick={() => setTplPreview('all')}
                  data-testid="evc-tpl-ctxbar-preview"
                >
                  <EyeIcon size={13} /> {L.templatePreview}
                </button>
              </div>

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

              {/* PW-434 ⑤ 저장된 템플릿에서 시작 — 평가 유형 «바로 다음», 등급·항목보다 위.
                  「다 작성한 후에 이전 템플릿을 불러올 수 있다고 인지하기 보다는 셋팅전에 과거
                  이력을 먼저 점검하고 불러 올 수 있다면 더 용이」(티켓 원문).
                  🔴 이건 새 요구가 아니라 **결정 복원**이다 — spec-eval-cycle.md §4.2.2-C 의
                  2026-06-27 A4 결정(「템플릿 빌더 상단에도」)이 2026-07-03 에 미리보기·저장·
                  불러오기 셋을 같은 성격으로 보고 하단 액션바로 함께 내리면서 뒤집혔다.
                  다시 아래로 내리지 말 것. 저장(💾)은 «마무리» 행위라 하단에 그대로 둔다.
                  정책: screen-eval-cycle-hr.policy.md §5.10.1 「노출 위치」 */}
              <div className="evc-tpl-start-head">
                <span className="evc-field-label">
                  {L.tplStartTitle}
                  <span className="evc-tpl-start-optional">{L.tplStartOptional}</span>
                </span>
                <button
                  type="button"
                  className="evc-btn is-ghost evc-tpl-start-browse"
                  onClick={() => setTplPickerOpen(true)}
                  data-testid="evc-tpl-start-browse"
                >
                  <FolderIcon size={13} /> {L.tplBrowseAll}
                </button>
              </div>
              <p className="evc-wiz-hint">
                {fill(L.tplStartHint, {
                  type: L[TEMPLATE_TYPES.find((rt) => rt.id === tplType)?.nameKey] || tplType,
                })}
              </p>
              {libraryStatus === 'loading' ? (
                /* 카드 자리에 스켈레톤 2칸 — 레이아웃이 튀지 않게. */
                <div className="evc-tpl-start-cards" data-testid="evc-tpl-start-loading">
                  <div className="evc-tpl-start-card is-skeleton" />
                  <div className="evc-tpl-start-card is-skeleton" />
                </div>
              ) : libraryStatus === 'error' ? (
                /* 🔴 빈 상태 문구로 대체하지 않는다 — 「저장된 게 없다」와 「못 불러왔다」는
                   다른 사실이고, 전자로 보이면 이미 있는 템플릿을 처음부터 다시 만든다.
                   실패해도 아래 등급·항목 구성은 정상 진행한다(이 블록은 선택 경로다). */
                <div className="evc-tpl-start-error" role="alert" data-testid="evc-tpl-start-error">
                  <span>{L.tplStartLoadFailed}</span>
                  {onReloadLibraryTemplates && (
                    <button
                      type="button"
                      className="evc-btn is-ghost"
                      onClick={() => onReloadLibraryTemplates()}
                      data-testid="evc-tpl-start-retry"
                    >
                      {L.tplStartRetry}
                    </button>
                  )}
                </div>
              ) : startTemplates.length === 0 ? (
                /* 저장된 것이 없어도 블록을 숨기지 않는다 — 숨기면 「저장하면 다음에 쓸 수
                   있다」는 사실 자체가 전달되지 않는다 (policy §5.10.1 「빈 상태」). */
                <p className="evc-tpl-start-empty" data-testid="evc-tpl-start-empty">
                  {fill(L.tplStartEmpty, {
                    type: L[TEMPLATE_TYPES.find((rt) => rt.id === tplType)?.nameKey] || tplType,
                  })}
                </p>
              ) : (
                <div className="evc-tpl-start-cards" data-testid="evc-tpl-start-cards">
                  {startTemplates.map((t) => (
                    <div key={t.id} className="evc-tpl-start-card">
                      <div className="evc-tpl-start-card-name">
                        <span className="evc-tpl-lib-name" title={t.name}>{t.name}</span>
                        {t.isDefault && (
                          <span className="evc-mode-badge">{L.tplDefaultBadge}</span>
                        )}
                        {(t.revision || 1) > 1 && (
                          <span className="evc-tpl-rev-badge">v{t.revision}</span>
                        )}
                      </div>
                      <div className="evc-tpl-lib-meta">
                        {L[TEMPLATE_VERSIONS.find((v) => v.id === t.version)?.labelKey] || t.version}
                        {' · '}
                        {fill(L.templateMeta, {
                          items: (t.questions || []).length,
                          grades: (t.grades || []).length,
                        })}
                        {' · '}
                        {t.usageCount > 0
                          ? fill(L.tplUsageCount, { count: t.usageCount })
                          : L.tplNeverUsed}
                      </div>
                      <div className="evc-tpl-start-card-actions">
                        {/* 모달 밖이므로 여기서는 전체 미리보기 모달을 그대로 쓴다. 불러오기 전이라
                            현재 편집 버퍼는 건드리지 않는다 (policy §5.10.1). */}
                        <button
                          type="button"
                          className="evc-btn is-ghost"
                          onClick={() => setTplPeek(t)}
                          data-testid={`evc-tpl-start-peek-${t.id}`}
                        >
                          <EyeIcon size={13} /> {L.templatePreview}
                        </button>
                        <button
                          type="button"
                          className="evc-btn is-ghost"
                          onClick={() => loadTemplate(t)}
                          data-testid={`evc-tpl-load-${t.id}`}
                        >
                          {L.templateLoad}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <span className="evc-field-label">{L.templateNameLabel}</span>
              <input
                className="evc-input"
                value={tplName}
                onChange={(e) => {
                  setTplName(e.target.value);
                  setTplSaved(false);
                }}
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

              {/* PW-433 ② 기준 정보(등급 체계)가 평가 항목보다 **위**에 온다.
                  등급은 아래 '등급 라벨' 항목의 **선택지 재료**다 — 재료를 나중에 정하면
                  항목을 만드는 시점에 선택지가 비어 있다. 2026-06-28 A7 에서 이미 지적됐으나
                  그때는 안내 문구만 붙이고 배치는 그대로 뒀다 (policy §5.4-0-A). */}
              <span className="evc-field-label">{L.templateGradesLabel}</span>
              {/* A7(2026-06-28) 관계 안내 — PW-433 ② 로 배치가 뒤집혔으므로 방향도 반대로 고친다.
                  「위 평가 항목」이 아니라 「아래 평가 항목」이다. */}
              <p className="evc-tpl-grade-note" data-testid="evc-tpl-grade-note">
                {L.gradesFeedItemsNote}
              </p>
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
                    {/* PW-433 ④ 등급에도 서열이 있다 — 목록의 위에서 아래가 곧 상위 → 하위다.
                        드래그가 아니라 ▲▼ 인 이유: 행 안에 입력 필드가 3개라 드래그 핸들이
                        텍스트 선택과 충돌한다 (policy §5.4.4). */}
                    <div className="evc-tpl-grade-move">
                      <button
                        type="button"
                        className="evc-tpl-grade-arrow"
                        onClick={() => moveGrade(i, -1)}
                        disabled={i === 0}
                        aria-label={L.gradeMoveUp}
                        title={L.gradeMoveUp}
                        data-testid={`evc-tpl-grade-up-${i}`}
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        className="evc-tpl-grade-arrow"
                        onClick={() => moveGrade(i, 1)}
                        disabled={i === tplGrades.length - 1}
                        aria-label={L.gradeMoveDown}
                        title={L.gradeMoveDown}
                        data-testid={`evc-tpl-grade-down-${i}`}
                      >
                        ▼
                      </button>
                    </div>
                    {/* 순번을 적어 두지 않으면 이동 결과를 눈으로 확인할 수 없다. */}
                    <span className="evc-tpl-grade-no" data-testid={`evc-tpl-grade-no-${i}`}>
                      {i + 1}
                    </span>
                    <input
                      className={`evc-input${
                        // PW-119: 빈 등급명도 저장을 막으므로 중복명과 똑같이 표시한다.
                        // (어느 행이 문제인지 버튼 옆 안내만으로는 알 수 없다)
                        !g.label.trim() ||
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
                    {/* PW-433 — 패널을 열지 않아도 무엇이 설정됐는지 행에서 읽혀야 한다
                        (policy §5.11-C 「행 요약 배지」). */}
                    {q.type === 'rating' && (
                      <span className="evc-tpl-item-badge" data-testid={`evc-tpl-badge-scale-${q.id}`}>
                        {fill(L.scaleRangeBadge, { max: scaleMaxOf(q) })}
                      </span>
                    )}
                    {q.type === 'checkbox' && (
                      <span className="evc-tpl-item-badge" data-testid={`evc-tpl-badge-options-${q.id}`}>
                        {fill(L.optionsCountBadge, { count: filledOptions(q).length })}
                        {q.allowMultiple ? ` · ${L.optionsMultiBadge}` : ''}
                      </span>
                    )}
                    {q.description && (q.descriptionDisplay || 'tooltip') !== 'hidden' && (
                      <span className="evc-tpl-item-badge" data-testid={`evc-tpl-badge-guide-${q.id}`}>
                        {L.guideBadge}
                      </span>
                    )}
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
                    {/* TC-053 이 항목을 피평가자에게 숨김(위원회·매니저·HR만).
                        PW-117 셀프는 평가자=피평가자라 '피평가자 공개' 가 성립하지 않는다 —
                        작성 화면도 셀프에는 공개 대상 안내를 띄우지 않는다(showVisibility=false). */}
                    {tplType !== 'self' && (
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
                    )}
                    {/* PW-433 — 개정 전에는 동작 없는 버튼이었다(policy §5.11-C). */}
                    <button
                      type="button"
                      className={`evc-tpl-x${tplEditingId === q.id ? ' is-on' : ''}`}
                      onClick={() =>
                        setTplEditingId(tplEditingId === q.id ? null : q.id)
                      }
                      aria-label={L.itemSettings}
                      title={L.itemSettings}
                      aria-expanded={tplEditingId === q.id}
                      data-testid={`evc-tpl-item-settings-${q.id}`}
                    >
                      <PencilIcon size={15} />
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
                    {tplEditingId === q.id && (
                      <ItemSettingsPanel
                        q={q}
                        labels={L}
                        reviewType={tplType}
                        disclosureSupported={disclosureSupported}
                        disclosure={disclosureOf(q)}
                        options={checkOptionsOf(q)}
                        onPatch={patchQuestion}
                        onPatchOption={patchCheckOption}
                        onAddOption={addCheckOption}
                        onRemoveOption={removeCheckOption}
                        onPatchDisclosure={patchDisclosure}
                        onToggleAudience={toggleAudience}
                        onClose={() => setTplEditingId(null)}
                      />
                    )}
                  </div>
                ))}
              </div>
              <AddQuestionRow onAdd={addQuestion} labels={L} />

              <div className="evc-tpl-lib">
                {/* PW-434 ⑤ 하단에는 «저장» 만 남는다 — 저장은 «다 만든 뒤» 의 행위다.
                    미리보기는 「평가 항목 구성」 섹션 헤더(`evc-tpl-preview-all`)와 2단계
                    고정 바 두 곳에 이미 있다. 불러오기 목록은 최상단으로 올라갔다. */}
                <button
                  type="button"
                  className="evc-btn is-primary"
                  onClick={saveTemplate}
                  disabled={!tplName.trim() || !tplGradesValid}
                  data-testid="evc-tpl-save"
                >
                  {L.templateSave}
                </button>
                {templateSaveError ? (
                  /* PW-122 — 서버가 거절한 사유(이름 중복 등)를 여기서 말한다. 전역
                     에러 페이지로 튕기면 작성 중이던 사이클 설정이 통째로 날아간다. */
                  <span
                    /* 기본 .evc-tpl-save-hint 가 이미 오류색이라 별도 클래스가 필요 없다. */
                    className="evc-tpl-save-hint"
                    role="alert"
                    data-testid="evc-tpl-save-error"
                  >
                    {templateSaveError}
                  </span>
                ) : tplSaved ? (
                  <span
                    className="evc-tpl-save-hint is-ok"
                    data-testid="evc-tpl-saved"
                  >
                    ✓ {L.templateSaved}
                  </span>
                ) : (
                  tplSaveBlockKey && (
                    <span
                      className="evc-tpl-save-hint"
                      data-testid="evc-tpl-save-hint"
                    >
                      {L[tplSaveBlockKey]}
                    </span>
                  )
                )}
              </div>
              {/* PW-434 ⑤ 하단 액션바에는 «미리보기 · 템플릿 저장» 만 남는다. 불러오기 목록은
                  2단계 최상단 「저장된 템플릿에서 시작」 블록으로 올라갔다 — 불러오기는 «시작»
                  행위이고 저장은 «마무리» 행위인데, 둘을 같은 자리에 묶어 두면 다 만든 뒤에야
                  불러오기의 존재를 알게 된다. 삭제(✕)도 함께 사라진다: 조직 자산을 사이클 작업
                  도중에 지우는 사고를 막기 위해 삭제·보관은 「평가 템플릿」 화면에서만 한다
                  (policy §5.10.1, 2026-08-16). */}
              {tplPreview && (
                <TemplatePreviewModal
                  questions={tplQuestions}
                  grades={tplGrades}
                  focus={tplPreview === 'all' ? null : tplPreview}
                  onClose={() => setTplPreview(null)}
                  labels={L}
                />
              )}
              {/* PW-434 ② 상단 카드에서 여는 «남의 템플릿» 미리보기. 읽기만 한다 — 불러오기
                  전이므로 편집 중인 항목·등급은 그대로다. */}
              {tplPeek && (
                <TemplatePreviewModal
                  questions={tplPeek.questions || []}
                  grades={tplPeek.grades || []}
                  focus={null}
                  onClose={() => setTplPeek(null)}
                  labels={L}
                />
              )}
              {tplPickerOpen && (
                <TemplatePickerModal
                  templates={savedTemplates}
                  currentType={tplType}
                  cycleTypes={reviewTypes}
                  onLoad={loadTemplate}
                  onClose={() => setTplPickerOpen(false)}
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
              {/* PW-443 — 상단 「대상 범위」 탭 7종과 딸린 축 값 칩·개별 선택 명단을
                  제거했다. 모집단을 정하는 손잡이는 아래 「리뷰 & 조정」의 조직 트리
                  하나이고, 직급·직렬·직군·직책은 그 위의 필터가 흡수한다. 탭은 고를
                  때마다 아래 UI 를 통째로 갈아 끼우는, 이 화면에서 가장 동적인 부품이었다. */}
              {/* 제외 조건 필터 — 조직 트리가 정한 모집단 위에서 언제나 돈다. */}
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
                  {/* 발령 이력 기반 — 현재 값이 아니라 '언제 바뀌었나'를 본다. */}
                  <label className="evl-promo-row">
                    <input
                      type="checkbox"
                      checked={excludeRoleChange}
                      onChange={(e) => setExcludeRoleChange(e.target.checked)}
                      data-testid="evc-wiz-excl-rolechange"
                    />
                    <span>{L.exclusionRoleChange}</span>
                  </label>
                  <label className="evl-promo-row">
                    <input
                      type="checkbox"
                      checked={excludePromotion}
                      onChange={(e) => setExcludePromotion(e.target.checked)}
                      data-testid="evc-wiz-excl-promotion"
                    />
                    <span>{L.exclusionPromotion}</span>
                  </label>
                  {excludePromotion && (
                    <div className="evc-excl-date">
                      <button
                        type="button"
                        className="evc-input evc-date-btn"
                        style={{ textAlign: 'left', cursor: 'pointer' }}
                        onClick={(e) =>
                          setPromotionPicker({
                            rect: e.currentTarget.getBoundingClientRect(),
                            el: e.currentTarget,
                          })
                        }
                        data-testid="evc-wiz-excl-promotion-ref"
                      >
                        {promotionRef || (
                          <span style={{ opacity: 0.45 }}>YYYY-MM-DD</span>
                        )}
                      </button>
                      <div className="evc-type-row">
                        {[
                          ['after', L.exclusionPromotedAfter],
                          ['before', L.exclusionPromotedBefore],
                        ].map(([dir, label]) => (
                          <button
                            type="button"
                            key={dir}
                            className={`evc-type-chip${promotionDirection === dir ? ' is-on' : ''}`}
                            onClick={() => setPromotionDirection(dir)}
                            data-testid={`evc-wiz-excl-promo-dir-${dir}`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {(excludeRoleChange || excludePromotion) &&
                    appointmentChanges.length === 0 && (
                      <p
                        className="evc-wiz-warn"
                        data-testid="evc-wiz-excl-no-history"
                      >
                        {L.exclusionNoHistory}
                      </p>
                    )}
                </div>

              {/* ── 「리뷰 & 조정」 [PW-443] ─────────────────────────────────────────
                  제외 조건이 만든 결과를 같은 화면에서 사람 단위로 확정한다.
                  좌 조직 트리(모집단) / 중앙 부서·팀 그룹 명단 / 우 제외 패널 3분할. */}
              <div className="evc-review-block" data-testid="evc-wiz-review-adjust">
                <div className="evc-review-head">
                  <span className="evc-field-label">{L.targetReviewLabel}</span>
                  {/* ① 3값 카운터 — 필터·검색에 흔들리지 않는다. N − K = M 이 항상 성립한다.
                      「조직을 좁혀서 준 것」과 「사람을 빼서 준 것」은 다른 조작이라
                      한 값으로 합치면 어느 쪽이 줄였는지 알 수 없다. */}
                  {/* 경고 틴트는 「조직은 골랐는데 대상이 0명」일 때만 켠다 — 조직 미선택은
                      아직 아무것도 정하지 않은 상태이지 잘못된 상태가 아니다. */}
                  <span
                    className={`evc-review-counter${
                      targetCount === 0 && scopedCandidates.length > 0 ? ' is-warn' : ''
                    }`}
                    data-testid="evc-wiz-target-summary"
                  >
                    {fill(L.targetCounter, {
                      scoped: scopedCandidates.length,
                      target: targetCount,
                      excluded: excludedMembers.length,
                    })}
                  </span>
                </div>
                {targetCount === 0 && scopedCandidates.length > 0 && (
                  <p className="evc-wiz-warn" data-testid="evc-wiz-target-zero">
                    {L.targetMinOne}
                  </p>
                )}

                {/* ② 검색줄 — 이름 검색 · 필터 버튼 · 활성 칩 · 초기화 */}
                <div className="evc-review-searchbar">
                  <div className="evc-review-search">
                    <span className="evc-review-search-icon">
                      <SearchIcon size={14} />
                    </span>
                    <input
                      className="evc-input"
                      value={reviewQuery}
                      onChange={(e) => setReviewQuery(e.target.value)}
                      placeholder={L.targetSearchName}
                      aria-label={L.targetSearchName}
                      data-testid="evc-wiz-review-search"
                    />
                    {reviewQuery && (
                      <button
                        type="button"
                        className="evc-review-search-clear"
                        onClick={() => setReviewQuery('')}
                        aria-label={L.targetFilterReset}
                        data-testid="evc-wiz-review-search-clear"
                      >
                        <CloseIcon size={12} />
                      </button>
                    )}
                  </div>
                  <div className="evc-filter-anchor">
                    <button
                      type="button"
                      className={`evc-filter-btn${activeFilterCount > 0 ? ' is-on' : ''}`}
                      onClick={() => setFilterOpen((o) => !o)}
                      aria-expanded={filterOpen}
                      data-testid="evc-wiz-filter-btn"
                    >
                      <FilterIcon size={13} />
                      <span>{L.targetFilter}</span>
                      {activeFilterCount > 0 && (
                        <span
                          className="evc-filter-btn-n"
                          data-testid="evc-wiz-filter-count"
                        >
                          {activeFilterCount}
                        </span>
                      )}
                      <CaretIcon size={11} open={filterOpen} />
                    </button>
                    {filterOpen && (
                      <ReviewFilterPopover
                        labels={L}
                        applied={reviewFilters}
                        valuesOf={axisValuesFor}
                        countsOf={axisCountsFor}
                        onApply={(draft) => {
                          setReviewFilters(draft);
                          setFilterOpen(false);
                        }}
                        onClose={() => setFilterOpen(false)}
                      />
                    )}
                  </div>
                  {filterChips.map((chip) => (
                    <span
                      key={chip.key}
                      className="evc-filter-chip"
                      data-testid={`evc-wiz-filter-chip-${chip.key}`}
                    >
                      {chip.text}
                      <button
                        type="button"
                        className="evc-filter-chip-x"
                        onClick={() =>
                          setReviewFilters((prev) => ({ ...prev, [chip.key]: [] }))
                        }
                        aria-label={fill(L.targetFilterChipRemove, {
                          axis: chip.text,
                        })}
                        data-testid={`evc-wiz-filter-chip-x-${chip.key}`}
                      >
                        <CloseIcon size={10} />
                      </button>
                    </span>
                  ))}
                  {anyReviewFilter && (
                    <button
                      type="button"
                      className="evc-filter-reset"
                      onClick={clearReviewFilters}
                      data-testid="evc-wiz-filter-reset"
                    >
                      {L.targetFilterReset}
                    </button>
                  )}
                </div>

                {/* ③④⑤ 3분할 */}
                <div className="evc-review-split">
                  {/* ③ 조직 트리 — 부서 → 팀 2계층. 부분 선택 상태를 그린다. */}
                  <div className="evc-review-pane evc-org-tree" data-testid="evc-wiz-org-tree">
                    <div className="evc-review-pane-head">
                      <span className="evc-review-pane-title">{L.targetOrgTitle}</span>
                      <button
                        type="button"
                        className="evc-review-pane-action"
                        onClick={() =>
                          setTreeCollapsed(new Set(orgTree.map((d) => d.id)))
                        }
                        data-testid="evc-wiz-org-collapse-all"
                      >
                        {L.targetOrgCollapseAll}
                      </button>
                    </div>
                    <div className="evc-review-pane-body">
                      <div className="evc-org-row is-root">
                        <span className="evc-org-caret" />
                        <TriCheck
                          state={rootState}
                          label={L.targetOrgAll}
                          onToggle={() => toggleUnits(allUnitIds, rootState !== 'on')}
                        />
                        <span className="evc-org-name">{L.targetOrgAll}</span>
                        <span className="evc-org-n">{candidates.length}</span>
                      </div>
                      {orgTree.map((d) => {
                        const state = deptState(d);
                        const open = !treeCollapsed.has(d.id);
                        return (
                          <div key={d.id}>
                            <div className={`evc-org-row is-dept${state === 'on' ? ' is-on' : ''}`}>
                              {d.teams.length > 0 ? (
                                <button
                                  type="button"
                                  className="evc-org-caret"
                                  onClick={() =>
                                    setTreeCollapsed((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(d.id)) next.delete(d.id);
                                      else next.add(d.id);
                                      return next;
                                    })
                                  }
                                  aria-label={fill(L.targetToggleNode, {
                                    name: d.name,
                                  })}
                                  aria-expanded={open}
                                  data-testid={`evc-wiz-org-caret-${d.id}`}
                                >
                                  <CaretIcon size={12} open={open} />
                                </button>
                              ) : (
                                <span className="evc-org-caret" />
                              )}
                              <TriCheck
                                state={state}
                                label={d.name}
                                onToggle={() =>
                                  toggleUnits(unitsOfDept(d), state !== 'on')
                                }
                              />
                              <span className="evc-org-name" title={d.name}>
                                {d.name}
                              </span>
                              <span className="evc-org-n">{deptCount(d)}</span>
                            </div>
                            {open &&
                              d.teams.map((t) => (
                                <div key={t.id} className="evc-org-row is-team">
                                  <span className="evc-org-caret" />
                                  <TriCheck
                                    state={orgSel.has(t.id) ? 'on' : 'off'}
                                    label={t.name}
                                    onToggle={() =>
                                      toggleUnits([t.id], !orgSel.has(t.id))
                                    }
                                  />
                                  <span className="evc-org-name" title={t.name}>
                                    {t.name}
                                  </span>
                                  <span className="evc-org-n">{countOfUnit(t.id)}</span>
                                </div>
                              ))}
                          </div>
                        );
                      })}
                      {/* 소속이 없는 사람도 고를 수 있어야 한다 — 노드가 없으면
                          그 사람은 어떤 조직에도 안 걸려 대상이 될 방법 자체가 없다. */}
                      {unassignedCount > 0 && (
                        <div className="evc-org-row is-dept" data-testid="evc-wiz-org-unassigned">
                          <span className="evc-org-caret" />
                          <TriCheck
                            state={orgSel.has(UNASSIGNED_ORG_ID) ? 'on' : 'off'}
                            label={L.targetOrgUnassigned}
                            onToggle={() =>
                              toggleUnits(
                                [UNASSIGNED_ORG_ID],
                                !orgSel.has(UNASSIGNED_ORG_ID),
                              )
                            }
                          />
                          <span className="evc-org-name" title={L.targetOrgUnassigned}>
                            {L.targetOrgUnassigned}
                          </span>
                          <span className="evc-org-n">{unassignedCount}</span>
                        </div>
                      )}
                    </div>
                    <div className="evc-review-pane-foot" data-testid="evc-wiz-org-summary">
                      {fill(L.targetOrgSelected, {
                        orgs: orgSel.size,
                        count: scopedCandidates.length,
                      })}
                    </div>
                  </div>

                  {/* ④ 대상 명단 — 부서·팀 그룹. 일괄은 «지금 보이는 것» 에만 걸린다. */}
                  <div className="evc-review-pane evc-review-roster">
                    <div className="evc-review-pane-head">
                      <span className="evc-review-pane-title">
                        {fill(L.targetReviewIncluded, { count: targetCount })}
                      </span>
                      {visibleTargets.length > 0 && (
                        <button
                          type="button"
                          className="evc-review-pane-action"
                          onClick={() => moveMany(visibleTargets, true)}
                          data-testid="evc-wiz-exclude-all"
                        >
                          {L.targetExcludeAll}
                        </button>
                      )}
                    </div>
                    <div className="evc-review-pane-body">
                      {scopedCandidates.length === 0 ? (
                        <p className="evc-review-empty" data-testid="evc-wiz-pick-org">
                          {L.targetPickOrg}
                        </p>
                      ) : visibleTargets.length === 0 ? (
                        /* 「대상이 없다」고 말하지 않는다 — 조직 선택은 그대로이고
                           지금 안 보일 뿐이다. */
                        <div className="evc-review-empty" data-testid="evc-wiz-filter-noresult">
                          <p>{L.targetFilterNoResult}</p>
                          <button
                            type="button"
                            className="evc-filter-reset"
                            onClick={clearReviewFilters}
                          >
                            {L.targetFilterReset}
                          </button>
                        </div>
                      ) : (
                        reviewGroups.map((g) => {
                          const open = !groupCollapsed.has(g.id);
                          return (
                            <div key={g.id} className="evc-roster-group">
                              {/* 접혀도 인원수와 「제외 →」 는 보인다 —
                                  접힌 그룹을 통째로 뺄 수 있어야 접기가 쓸모 있다. */}
                              <div className="evc-roster-group-head">
                                <button
                                  type="button"
                                  className="evc-org-caret"
                                  onClick={() =>
                                    setGroupCollapsed((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(g.id)) next.delete(g.id);
                                      else next.add(g.id);
                                      return next;
                                    })
                                  }
                                  aria-label={fill(L.targetToggleNode, {
                                    name: g.label,
                                  })}
                                  aria-expanded={open}
                                  data-testid={`evc-wiz-group-caret-${g.id}`}
                                >
                                  <CaretIcon size={12} open={open} />
                                </button>
                                <span className="evc-roster-group-name">{g.label}</span>
                                <span className="evc-org-n">
                                  {fill(L.targetGroupCount, { count: g.members.length })}
                                </span>
                                <button
                                  type="button"
                                  className="evc-roster-move is-out"
                                  onClick={() => moveMany(g.members, true)}
                                  aria-label={L.targetReviewExcludeOne}
                                  data-testid={`evc-wiz-group-exclude-${g.id}`}
                                >
                                  {L.targetMoveOut}
                                  <ArrowRightIcon size={13} />
                                </button>
                              </div>
                              {open &&
                                g.members.map((c) => (
                                  <div key={c.id} className="evc-roster-row">
                                    <div className="evc-roster-who">
                                      <span className="evc-roster-name">{c.name}</span>
                                      <span className="evc-roster-meta">
                                        {[c.jobLevel, c.employmentType]
                                          .filter(Boolean)
                                          .join(' · ')}
                                      </span>
                                    </div>
                                    {keptIds.includes(c.id) && (
                                      <span
                                        className="evc-roster-badge"
                                        data-testid={`evc-wiz-kept-${c.id}`}
                                      >
                                        {L.targetManualInclude}
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      className="evc-roster-move is-out"
                                      onClick={() => excludeOne(c.id)}
                                      aria-label={L.targetReviewExcludeOne}
                                      title={L.targetReviewExcludeOne}
                                      data-testid={`evc-wiz-exclude-${c.id}`}
                                    >
                                      {L.targetMoveOut}
                                      <ArrowRightIcon size={13} />
                                    </button>
                                  </div>
                                ))}
                            </div>
                          );
                        })
                      )}
                    </div>
                    {undoSnapshot && (
                      <div className="evc-review-pane-foot is-right">
                        <button
                          type="button"
                          className="evc-review-undo"
                          onClick={undoMove}
                          data-testid="evc-wiz-undo"
                        >
                          <UndoIcon size={13} />
                          {L.targetUndo}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ⑤ 제외 패널 — 접히지 않는다. 「무엇을 뺐나」는 항상 보여야 한다. */}
                  <div className="evc-review-pane evc-review-excluded">
                    <div className="evc-review-pane-head">
                      <span className="evc-review-pane-title">
                        {fill(L.targetReviewExcluded, { count: excludedMembers.length })}
                      </span>
                    </div>
                    <div className="evc-review-pane-body">
                      {excludedMembers.length === 0 ? (
                        <p className="evc-review-empty">{L.targetReviewNoExcluded}</p>
                      ) : (
                        excludedMembers.map((c) => (
                          <div key={c.id} className="evc-excluded-row">
                            <button
                              type="button"
                              className="evc-roster-move is-in"
                              onClick={() => includeOne(c.id)}
                              aria-label={L.targetReviewIncludeOne}
                              title={L.targetReviewIncludeOne}
                              data-testid={`evc-wiz-include-${c.id}`}
                            >
                              <ArrowLeftIcon size={13} />
                            </button>
                            <span className="evc-roster-name">{c.name}</span>
                            {/* 사유는 되돌려도 지우지 않는다 — 사라지면 다음 사람이
                                「왜 이 사람만 포함인가」를 되짚을 수 없다.
                                규칙이 뺀 것과 사람이 뺀 것을 여기서 가른다. */}
                            <span
                              className={`evc-excluded-reason${
                                exclusionReasonOf(c.id) === 'manual' ? ' is-manual' : ''
                              }`}
                              data-testid={`evc-wiz-reason-${c.id}`}
                            >
                              {exclusionReasonOf(c.id) === 'manual'
                                ? L.targetManualExclude
                                : (L[`exclusionType_${exclusionReasonOf(c.id)}`] ??
                                  exclusionReasonOf(c.id))}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <p className="evc-wiz-hint">{L.targetReviewFooter}</p>
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

              {promotionPicker && (
                <DatePicker
                  anchorRect={promotionPicker.rect}
                  anchorEl={promotionPicker.el}
                  selectedDate={isoToDate(promotionRef)}
                  onSelect={(d) => {
                    setPromotionRef(dateToIso(d));
                    setPromotionPicker(null);
                  }}
                  onClose={() => setPromotionPicker(null)}
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
                  {/* 위원 검색 — 입력 즉시 필터. 후보 명단이 아직 없거나 조회가 깨졌으면 비활성 */}
                  <input
                    className="evc-wiz-committee-search"
                    value={committeeSearch}
                    onChange={(e) => setCommitteeSearch(e.target.value)}
                    disabled={committeeCandidatesLoading || committeeCandidatesError}
                    placeholder={
                      committeeCandidatesLoading
                        ? (L.wizardCommitteeLoading ?? '위원 후보 명단을 불러오는 중…')
                        : (L.wizardCommitteeSearch ?? '이름 · 부서 · 직책 검색')
                    }
                    aria-label={L.wizardCommitteeSearch ?? '이름 · 부서 · 직책 검색'}
                    data-testid="evc-wiz-committee-search"
                  />

                  {/* 선택 요약 — 검색·조회 상태와 무관하게 항상 노출한다.
                      검색으로 가려진 위원도 여기서 확인·해제한다(해제 경로 2개 중 하나). */}
                  <div
                    className={`evc-wiz-committee-summary${committee.length === 0 ? ' is-empty' : ''}`}
                    data-testid="evc-wiz-committee-summary"
                  >
                    <span className="evc-wiz-committee-summary-count">
                      {committee.length > 0
                        ? fill(L.wizardCommitteeSummary, { count: committee.length })
                        : (L.wizardCommitteeSelectOne ?? '위원을 1명 이상 선택하세요')}
                    </span>
                    {committeeChair && (
                      <span
                        className="evc-wiz-committee-chair"
                        data-testid="evc-wiz-committee-summary-chair"
                      >
                        {`${L.wizardCommitteeChair} ${committeeChair.name}`}
                      </span>
                    )}
                    {hiddenSelectedCount > 0 && (
                      <span
                        className="evc-wiz-committee-summary-hidden"
                        data-testid="evc-wiz-committee-summary-hidden"
                      >
                        {fill(
                          L.wizardCommitteeHiddenSelected ??
                            '· 검색 결과 밖 {{count}}명 포함(선택 유지)',
                          { count: hiddenSelectedCount },
                        )}
                      </span>
                    )}
                    {committee.length > 0 && (
                      <span className="evc-wiz-committee-chips">
                        {committee.map((id, i) => {
                          const c = committeeById.get(id);
                          return (
                            <span
                              key={id}
                              className={`evc-wiz-committee-chip${i === 0 ? ' is-chair' : ''}`}
                              data-testid={`evc-wiz-committee-chip-${id}`}
                            >
                              {c?.name ?? id}
                              <button
                                type="button"
                                className="evc-wiz-committee-chip-x"
                                onClick={() => toggleCommittee(id)}
                                aria-label={`${c?.name ?? id} ${L.wizardCommitteeRemove ?? '위원 제거'}`}
                                data-testid={`evc-wiz-committee-chip-remove-${id}`}
                              >
                                ×
                              </button>
                            </span>
                          );
                        })}
                      </span>
                    )}
                  </div>

                  {committeeCandidatesLoading ? (
                    /* 로딩 — 카드와 같은 높이 자리를 잡아 레이아웃이 튀지 않게 한다.
                       여기서 '후보 없음' 을 띄우면 조직에 후보가 없다는 오해를 만든다. */
                    <div
                      className="evc-wiz-committee-list"
                      data-testid="evc-wiz-committee-loading"
                      aria-busy="true"
                    >
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <span key={i} className="evc-wiz-committee-skeleton" />
                      ))}
                    </div>
                  ) : committeeCandidatesError ? (
                    /* 조회 실패 — 선택은 유지한 채 재시도만 유도한다.
                       위원 0명이면 「다음」은 committeeValid 로 계속 차단된다. */
                    <div
                      className="evc-wiz-committee-error"
                      data-testid="evc-wiz-committee-error"
                    >
                      <span>
                        {fill(
                          L.wizardCommitteeLoadError ??
                            '위원 후보 명단을 불러오지 못했습니다. 이미 선택한 위원 {{count}}명은 그대로 유지됩니다.',
                          { count: committee.length },
                        )}
                      </span>
                      {onReloadCommitteeCandidates && (
                        <button
                          type="button"
                          className="evc-wiz-committee-retry"
                          onClick={onReloadCommitteeCandidates}
                          data-testid="evc-wiz-committee-retry"
                        >
                          {L.wizardCommitteeRetry ?? '다시 시도'}
                        </button>
                      )}
                    </div>
                  ) : committeeCandidates.length === 0 ? (
                    <p className="evc-wiz-hint">{L.wizardCommitteeEmpty}</p>
                  ) : visibleCommitteeCandidates.length === 0 ? (
                    /* 검색 결과 0건 — 선택이 유지된다는 사실을 같이 알린다.
                       검색으로 위원이 빠졌다고 오해하지 않게. */
                    <div
                      className="evc-wiz-committee-empty"
                      data-testid="evc-wiz-committee-search-empty"
                    >
                      <span className="evc-wiz-committee-empty-title">
                        {fill(
                          L.wizardCommitteeSearchEmpty ?? '"{{query}}" 검색 결과가 없습니다.',
                          { query: committeeSearch.trim() },
                        )}
                      </span>
                      <span className="evc-wiz-committee-empty-sub">
                        {fill(
                          L.wizardCommitteeSearchEmptyHint ??
                            '이름 · 부서 · 직책으로 다시 찾아보세요. 선택한 위원 {{count}}명은 검색과 무관하게 유지됩니다.',
                          { count: committee.length },
                        )}
                      </span>
                      <button
                        type="button"
                        className="evc-wiz-committee-retry"
                        onClick={() => setCommitteeSearch('')}
                        data-testid="evc-wiz-committee-search-reset"
                      >
                        {L.wizardCommitteeSearchReset ?? '검색 초기화'}
                      </button>
                    </div>
                  ) : (
                    <div className="evc-wiz-committee-list">
                      {visibleCommitteeCandidates.map((c) => {
                        const idx = committee.indexOf(c.id);
                        const on = idx >= 0;
                        return (
                          <button
                            type="button"
                            key={c.id}
                            className={`evc-wiz-committee-item${on ? ' is-on' : ''}`}
                            onClick={() => toggleCommittee(c.id)}
                            data-testid="evc-wiz-committee-item"
                          >
                            <span
                              className={`evc-member-check${on ? ' is-on' : ''}`}
                              data-testid={`evc-wiz-committee-check-${c.id}`}
                            />
                            <span className="evc-wiz-committee-text">
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
                                {/* 직책도 검색 대상이라 카드에 보여야 '왜 이 사람이 나왔나'가 설명된다 */}
                                {c.jobPosition ? ` · ${c.jobPosition}` : ''}
                              </span>
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
              <p className="evc-wiz-hint">
                {isManage ? L.manageSaveHint : L.createDraftHint}
              </p>
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
                    <span className="evc-wiz-preset-saved" data-testid="evc-wiz-preset-saved">
                      ✓ {L.presetSaved}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="evc-wiz-footer">
          <button
            type="button"
            className="evc-btn is-ghost"
            onClick={step === 0 ? requestClose : () => goStep(step - 1)}
          >
            {step === 0 ? L.cancel : L.prev}
          </button>

          {/* PW-119 와 같은 방식 — 버튼을 비활성으로만 두면 왜 안 눌리는지 알 길이 없다. */}
          {step === 1 && !templateLibraryValid && (
            <span className="evc-wiz-block" data-testid="evc-wiz-block-template">
              {L.blockTemplateLibrary} ({phaseNames(phasesMissingLibrary)})
            </span>
          )}
          {step === 2 && !templateMapValid && (
            <span className="evc-wiz-block" data-testid="evc-wiz-block-template-map">
              {L.blockTemplateMap} ({phaseNames(phasesMissingTemplate)})
            </span>
          )}
          {step === steps.length - 1 && submitBlockHint && (
            <span className="evc-wiz-block" data-testid="evc-wiz-block-submit">
              {submitBlockHint}
            </span>
          )}
          <div className="evc-wiz-footer-right">
            {/* PW-440 — 「어디까지 저장됐나」를 그 자리에서 읽을 수 있어야 한다.
                저장이 보이지 않으면 사용자는 저장됐다고 믿지 않는다. */}
            {draftEnabled && (
              <span
                className={`evc-wiz-draft-state${draftError ? ' is-error' : ''}`}
                data-testid="evc-wiz-draft-state"
              >
                {draftError ? (
                  L.draftSaveFailed
                ) : draftSaving ? (
                  L.draftSaving
                ) : !draftSavedAt ? (
                  ''
                ) : draftDirty ? (
                  fill(L.draftUnsaved, { time: stampTime(draftSavedAt) })
                ) : (
                  <>
                    {/* 아이콘은 이모지가 아니라 인라인 SVG 다 — 번역 문자열에 ✓ 를 넣으면
                        OS·폰트마다 모양이 갈리고 색을 상속하지 못한다. */}
                    <CheckCircleIcon size={13} />{' '}
                    {fill(L.draftSaved, { time: stampTime(draftSavedAt) })}
                  </>
                )}
              </span>
            )}
            {/* 수동 저장은 «한 단계 안에 오래 머무는 경우»를 위한 보조 수단이다.
                필수값이 비어도 항상 활성 — 초안은 부분 저장이 정상이다. */}
            {draftEnabled && (
              <button
                type="button"
                className="evc-btn is-ghost"
                onClick={() => void saveDraft()}
                disabled={draftSaving}
                data-testid="evc-wiz-draft-save"
              >
                {L.draftSaveNow}
              </button>
            )}
            {step < steps.length - 1 ? (
              <button
                type="button"
                className="evc-btn is-primary"
                disabled={!canAdvance}
                onClick={() => goStep(step + 1)}
                data-testid="evc-wiz-next"
              >
                {L.next}
              </button>
            ) : (
              <button
                type="button"
                className="evc-btn is-primary"
                disabled={!canSubmit}
                onClick={submit}
                data-testid="evc-wiz-submit"
              >
                {isManage ? L.saveChanges : L.create}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* PW-440 이탈 확인 — 구 동작은 바깥 클릭·✕ 에서 경고 없이 닫히고 입력이 사라졌다.
          🔴 **3지선다**다. 2지선다("사라집니다 · 나가시겠습니까?")는 사용자에게 유실
          외의 선택지를 주지 않는다 — 저장이라는 길이 있는데 없는 것처럼 물었다. */}
      {leaveAsk && (
        <div
          className="evc-modal-overlay"
          onClick={() => setLeaveAsk(false)}
          data-testid="evc-wiz-leave-ask"
        >
          <div className="evc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="evc-wiz-header">
              <h3 className="evc-modal-title">{L.draftLeaveTitle}</h3>
            </div>
            <div className="evc-wiz-body">
              <p className="evc-wiz-hint">{L.draftLeaveBody}</p>
              <ul className="evc-wiz-hint-list">
                <li>{L.draftLeaveHint1}</li>
                <li>{L.draftLeaveHint2}</li>
              </ul>
              {draftError && (
                <p className="evc-wiz-block" data-testid="evc-wiz-leave-error">
                  {L.draftSaveFailed}
                </p>
              )}
            </div>
            <div className="evc-wiz-footer">
              <button
                type="button"
                className="evc-btn is-ghost"
                onClick={() => setLeaveAsk(false)}
                data-testid="evc-wiz-leave-cancel"
              >
                {L.cancel}
              </button>
              <button
                type="button"
                className="evc-btn is-ghost"
                onClick={() => {
                  setLeaveAsk(false);
                  onCancel?.();
                }}
                data-testid="evc-wiz-leave-discard"
              >
                {L.draftLeaveDiscard}
              </button>
              <button
                type="button"
                className="evc-btn is-primary"
                disabled={draftSaving}
                onClick={() => void leaveWithSave()}
                data-testid="evc-wiz-leave-save"
              >
                {L.draftLeaveSave}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* A4 불러오기 다이얼로그 — 사이클명·저장일·사용 횟수 + '이 설정으로 시작'. */}
      {presetDialogOpen && (
        <div
          className="evc-modal-overlay"
          onClick={() => setPresetDialogOpen(false)}
        >
          <div className="evc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="evc-wiz-header">
              <h3 className="evc-modal-title">{L.presetDialogTitle}</h3>
              <button
                type="button"
                className="evc-wiz-close"
                onClick={() => setPresetDialogOpen(false)}
                aria-label={L.cancel}
              >
                ✕
              </button>
            </div>
            <p className="evc-modal-sub">{L.presetDialogSub}</p>
            <div className="evc-preset-list" data-testid="evc-wiz-preset-list">
              {presets.map((p) => (
                <div key={p.id} className="evc-preset-item">
                  <div className="evc-preset-item-main">
                    <span className="evc-preset-item-name">{p.name}</span>
                    <span className="evc-preset-item-meta">
                      {fill(L.presetMeta, {
                        date: (p.createdAt ?? '').slice(0, 10),
                        uses: p.usageCount ?? 0,
                      })}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="evc-btn is-primary"
                    onClick={() => startFromPreset(p.id)}
                    data-testid={`evc-wiz-preset-start-${p.id}`}
                  >
                    {L.presetStart}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 덮어쓰기 확인 — 이미 입력한 값이 있을 때만 뜬다. */}
      {pendingPresetId && (
        <div className="evc-modal-overlay" onClick={() => setPendingPresetId(null)}>
          <div className="evc-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="evc-modal-title">{L.presetOverwriteTitle}</h3>
            <p className="evc-modal-sub">{L.presetOverwriteBody}</p>
            <div className="evc-modal-actions">
              <button
                type="button"
                className="evc-btn is-ghost"
                onClick={() => setPendingPresetId(null)}
                data-testid="evc-wiz-preset-overwrite-cancel"
              >
                {L.cancel}
              </button>
              <button
                type="button"
                className="evc-btn is-primary"
                onClick={() => void loadPresetById(pendingPresetId)}
                data-testid="evc-wiz-preset-overwrite-confirm"
              >
                {L.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
