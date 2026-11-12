import { useCallback, useEffect, useRef, useState } from 'react';
import ModalLayer from '../shared/ModalLayer.jsx';
import Button from '../shared/Button.jsx';
import ConfirmModal from '../shared/ConfirmModal.jsx';
import Icon from '../shared/Icon.jsx';
import Spinner from '../shared/Spinner.jsx';
import Stack from '../shared/Stack.jsx';
import { ArrowRightGlyph, ChevronDownGlyph, CloseGlyph } from '../shared/lineIcons.jsx';
import StepNavButton from '../shared/StepNav.jsx';
import Toast from '../shared/Toast.jsx';
import assetUrl from '../shared/assetUrl.js';
import { healthTier, healthLabel } from './snippetHealth.js';
import { isEnterKey } from '../shared/enterKey.js';

/**
 * SnippetModal — "스니펫 작성" 모달.
 * Figma "content_modal" (node 16626:54036): 650x920 고정, r=16.
 *
 * 구조:
 *   Top bar (pad 20/48/0/48) — 닫기 X
 *   Body (scroll, gap 48):
 *     - 날짜 타이틀 (YYYY.MM.DD)
 *     - Progress bar: What / Why / Value / Highlights / Lowlights
 *       (섹션을 채우면 active bar 가 그라디언트로 오른쪽으로 확장)
 *     - What / Why / Value / Highlights / Lowlights — 각각 textarea
 *     - Health Check — 1~10 점수 버튼 + 영향 요인 textarea (Figma 16627:58459)
 *     - Summary — textarea + AI 요약 생성 버튼 + helper
 *     - Tags — input + AI 태그 추출 버튼 + 추천 tag chips
 *   Footer (pad 24/48/48/48, gap 12) — 초기화 / 등록
 */
const HEALTH_SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// What 등 텍스트 필드 글자수 제한. 90% 근접 시 카운터를 빨강으로 경고.
// `sectionMaxLength` prop 을 안 주면 다섯 칸 모두 이 값이다.
const SNIPPET_MAX_LEN = 500;
const NEAR_LIMIT_RATIO = 0.9;
const DEFAULT_SECTION_MAX_LENGTH = {
  what: SNIPPET_MAX_LEN,
  why: SNIPPET_MAX_LEN,
  value: SNIPPET_MAX_LEN,
  highlights: SNIPPET_MAX_LEN,
  lowlights: SNIPPET_MAX_LEN,
};
const SECTIONS = [
  {
    key: 'what',
    label: 'What',
    hint: '오늘 무엇을 하셨나요?',
    placeholder:
      '오늘 작업하신 일들을 구체적으로 기록해주세요.\n(예: CMS 기능 보강 인력구조 개선 및 영향 분석, 이슈 확인 등)',
  },
  {
    key: 'why',
    label: 'Why',
    hint: '왜 그 일을 하셨나요?',
    placeholder:
      '이 일을 진행한 배경이나 이유를 적어주세요.\n(예: 신규 기능 요청사항 반영, 고객 피드백 기반 개선 등)',
  },
  {
    key: 'value',
    label: 'Value I added',
    progressLabel: 'Value',
    hint: '어떤 가치를 만들었나요?',
    placeholder:
      '스스로 만들어낸 가치, 실적, 결과물을 정리해주세요.\n(예: 생산성 지표 개선, 사용자 경험 향상, 팀 내 지식 공유 등)',
  },
  {
    key: 'highlights',
    label: 'Highlights',
    hint: '오늘의 하이라이트는 무엇이었나요?',
    placeholder: '오늘의 가장 좋았던 순간, 성취, 배운 점을 기록해주세요.',
  },
  {
    key: 'lowlights',
    label: 'Lowlights',
    hint: '오늘의 아쉬웠던 점은 무엇이었나요?',
    placeholder: '막히거나 아쉬웠던 점, 내일 개선할 부분을 기록해주세요.',
  },
];

// `suggestedTags` prop 이 없을 때 사용하는 fallback 시드 — 호스트 앱이 추천 풀을
// 주입하지 않아도 스니핏 모달은 빈 상태로 보이지 않도록 한다.
// 활동 초안(PW-1154 · pivit-specs `A. daily-snippet/snippet-app.jsx` DraftMark 시안 포팅).
// 칸 키는 이 모달의 키(`value`)이고, 호스트가 주는 초안은 기획서 API 키(`values`)다.
// 화면 순서(위→아래) — 안내 문구와 「첫 노란 칸으로 이동」이 이 순서를 따른다.
const DRAFT_FIELD_KEYS = ['what', 'why', 'value', 'highlights', 'lowlights', 'summary', 'tags'];
const DRAFT_KEY_OF_FIELD = { value: 'values' };
const TAG_LIMIT = 8;
// [AI 요약] 이 켜지는 글자 수 — 이 수를 «넘어야» 켜진다 (기획서 `allText.trim().length > 20`).
const AI_SUMMARY_MIN_CHARS = 20;
const DEFAULT_DRAFT_LABELS = {
  fill: '오늘 활동으로 초안 채우기',
  filling: '초안 만드는 중…',
  linkNotice: '내 설정 > 개인 연동에서 Jira·GitHub 계정을 연결해 주세요',
  linkAction: '내 설정으로',
  empty: '가져올 활동이 없습니다',
  fail: '초안을 만들지 못했습니다. 다시 시도해 주세요.',
  left: '직접 써야 할 칸:',
  // 띠를 접은 한 줄의 «직접 쓸 칸 N» — 컨디션 + AI 가 비워 둔 칸 수 (PW-2733)
  leftCount: (n) => `직접 쓸 칸 ${n}`,
  markUnconfirmed: 'AI 초안',
  confirm: '확인',
  markConfirmed: '확인함',
  blocked: (n, names) => `확인하지 않은 AI 초안 ${n}칸: ${names}`,
  // 노란 칸이 남은 채 닫으려 할 때 묻는 확인 창 (기획서 작성 화면 정책 §5-A.3 · pivit-work PW-2734)
  closeConfirm: (n) => `확인하지 않은 AI 초안 ${n}칸은 저장되지 않습니다. 닫을까요?`,
  closeConfirmKeep: '계속 쓰기',
  closeConfirmDiscard: '닫기',
  saving: '저장 중...',
  saved: (time) => `자동저장됨 ${time}`,
  saveFailed: '저장 실패',
  progressLoading: '가져오는 중',
  // 태그가 TAG_LIMIT 개 찼을 때 칸 아래 안내 (기획서 작성 화면 정책 §3.2 · §9 오류 표 문구 · PW-2392)
  tagLimit: '태그는 최대 8개까지 추가할 수 있습니다.',
  // Summary 가 노란(확인 전)이고 Lowlights 에 글이 있을 때 노란 표시 줄 바로 아래 안내 (기획서 작성 화면 정책 §3.1
  // «열람 범위 안내 한 줄» · PW-2441). 요약은 같은 회사 재직 동료도 보지만(타임라인 그룹 · PW-2495) Lowlights 칸은 본인·조직장·어드민만 본다.
  summaryTeamVisible: '요약은 같은 회사 동료도 봅니다 — 아쉬운 점(Lowlights)에서 옮겨진 내용이 있으면 확인 전에 고쳐 주세요.',
};

/** 그 칸이 비었나 — 태그는 개수, 나머지는 공백을 뺀 글. */
function isFieldEmpty(key, texts, sum, tg) {
  if (key === 'summary') return !sum.trim();
  if (key === 'tags') return tg.length === 0;
  return !(texts[key] ?? '').trim();
}

const DEFAULT_SUGGESTED_TAGS = [
  '기획', '회의', '개발', '디자인', '리뷰', '문서', '외부미팅', 'TaV', '번역', '산출물', '참석자',
];

/**
 * 화면 문구 — 기본값은 한국어(디자인 프리뷰·한국어 화면이 지금 그대로 보이게).
 * 앱은 `labels` 로 화면 언어 문구를 넘기고, 넘긴 키만 덮어쓴다 (pivit-work PW-2329).
 * 칸 이름(What·Why·Summary·Tags·Health Check)은 원래 영어라 문구 칸이 아니다.
 */
const DEFAULT_SNIPPET_MODAL_LABELS = {
  sections: Object.fromEntries(SECTIONS.map((sec) => [sec.key, { hint: sec.hint, placeholder: sec.placeholder }])),
  headerTitle: '데일리 스니펫',
  close: '닫기',
  prevDate: '이전 날짜',
  nextDate: '다음 날짜',
  healthAria: 'Health Check 점수',
  // 점수 이름표 낱말 — snippetHealth.js 의 healthLabel 에 넘긴다. 안 주면 한국어
  healthWords: undefined,
  healthReasonPlaceholder: '무엇이 영향을 주었나요? (선택)',
  summaryHint: '버튼을 누르면 AI 초안이 채워집니다',
  summaryGenerate: '요약 생성',
  summaryGenerating: '생성 중…',
  // 자리표시 글 둘 — 버튼을 못 누를 때(본문 20자 이하) / 누를 수 있을 때 (PW-2762)
  summaryPlaceholder: '본문(What/Why 등)을 먼저 입력하면 AI 요약 생성 버튼을 누를 수 있습니다',
  summaryReadyPlaceholder: 'AI 요약 생성 버튼을 누르거나 직접 입력하세요',
  summaryInfo: 'What·Why·Values 항목을 채운 뒤 AI 요약 생성 버튼을 누르면 요약 초안이 채워집니다.',
  summaryFailed: 'AI 요약 생성에 실패했습니다.',
  tagsHint: '버튼을 누르면 AI가 태그를 추천합니다',
  tagsExtract: '태그 추출',
  tagsExtracting: '추출 중…',
  tagsFailed: 'AI 태그 추출에 실패했습니다.',
  tagRemove: '삭제',
  tagInputPlaceholder: '태그 입력 후 Enter',
  reset: '초기화',
  // `suggestedTags` 가 비었을 때 보이는 추천 칩
  defaultSuggestedTags: DEFAULT_SUGGESTED_TAGS,
};

// 기존 스니핏을 수정할 때 prefill 하려면 initial 에 { summary, tags,
// sections:{what,why,value,highlights,lowlights} } 모양으로 넘긴다.
// (partial 허용 — 없는 필드는 빈 문자열/빈 배열로 초기화)
//
// AI 통합 props (모두 optional):
//   onAiSummarize(input) → Promise<{summary: string}>
//     "AI 요약 생성" 버튼 클릭 시 호출. summary 만 채워준다.
//   onAiExtractTags(input) → Promise<{tags: string[]}>
//     "AI 태그 추출" 버튼 클릭 시 호출. 결과는 태그 칸에 넣지 않고 추천 칩 줄 맨 앞에 보여준다 —
//     사람이 눌러야 들어간다(PW-1250 · QA TC-SNP-004). 태그는 TAG_LIMIT(8)개까지.
//   suggestedTags?: string[] — 추천 칩 풀. 누락 시 DEFAULT_SUGGESTED_TAGS.
//   onTagSelect?: (name: string) => void — 추천 칩 클릭 시 호스트에 알림.
//     선택된 태그의 모달 내부 상태 추가는 모달이 직접 처리하므로 호스트는 보통
//     analytics/카운트 갱신용으로만 쓴다.
//
//   input 형태: {whatDidYouDo, whyDidYouDoIt, valuesAdded, highlights, lowlights,
//                healthScore, healthNote}
//     healthScore: 1~10 또는 null (미선택). 호스트는 null 이면 prompt 에서 제외.
//     healthNote:  영향 요인 자유 입력. summary 톤·컨텍스트 보강용.
//
//   sectionMaxLength?: { what?, why?, value?, highlights?, lowlights? } — 칸별 글자수
//     상한. 준 객체에 없는 칸은 상한도 카운터도 없다. 누락 시 다섯 칸 모두 500.
//     한도는 호스트(서버와 같은 값)가 정하고 이 화면은 받은 값으로 막기만 한다.
//
//   onAiExtractTags 의 input 에는 summary 도 실린다(요약 칸 글).
//
//   각 콜백이 누락되면 해당 버튼은 disabled. 글이 모자라도 disabled — 요약은 다섯 칸 합쳐
//   공백 빼고 20자 초과, 태그는 요약이나 What 이 있어야 켜진다. 두 콜백을 분리한 이유는 사용자가
//   UI 상 각각의 버튼을 누르므로 LLM 호출/대기/에러도 분리되어야 자연스럽기
//   때문이다.
//
// 활동 초안 (PW-1154 · 기획서 daily-snippet §6.0, 작성 화면 정책서 §5-A) — 모두 optional:
//   onAiDraft?: () => Promise<{ linked?: {jira, github}, activityCount: number,
//                                draft: {summary?, tags?, what?, why?, values?, highlights?, lowlights?} } | null>
//     「오늘 활동으로 초안 채우기」 버튼. 없으면 버튼·안내가 통째로 안 보인다(종전 화면 그대로).
//     응답 draft 의 칸 가운데 **비어 있거나 아직 노란 칸**에만 넣고 그 칸을 노란(미확인)으로 표시한다.
//     초록(확인한) 칸·사람이 쓴 칸은 건드리지 않는다. 컨디션(Health Check)은 채우지 않는다.
//     null 을 돌려주면 호스트가 이미 처리한 것(예: 체험 AI 소진 안내)으로 보고 아무것도 바꾸지 않는다.
//     던지면 버튼 아래에 실패 문구를 띄운다.
//   aiDraftLinked?: boolean — false 면 버튼 대신 계정 연결 안내를 띄운다. 모르면(undefined) 버튼을
//     두고, 누른 뒤 응답 linked 가 둘 다 false 면 안내로 바꾼다.
//   onOpenAccountLinks?: () => void — 안내의 「내 설정으로 →」.
//   aiNotice?: { at: 'draft' | 'summary' | 'tags', content: ReactNode } | null
//     호스트가 그 AI 버튼 자리에 띄우는 안내(체험 AI 소진 등). 한 번에 하나.
//   draftBand?: 띠 안의 «어디서 무엇을 가져왔나 · AI 가 쓰는 중» (PW-1649 · PW-2733) — 없으면 버튼만 있는 띠.
//     {
//       sources: Array<{ key, name, state: 'loading'|'done'|'fail'|'off', value?, unit?, text? }>
//         출처마다 같은 폭 칸 하나 — 출처가 늘어도 칸만 는다(둘이면 2열, 셋부터 3열). loading 은 도는 표시 + text
//         (없으면 progressLoading) · done 은 굵은 value + unit · fail 은 주황 text(«못 가져옴 · 아까 것 23») ·
//         off 는 보라 text 단추(«연결해 주세요») — 누르면 onOpenAccountLinks.
//       status?: string        펼친 띠 머리 오른쪽 한 줄(«오늘 활동 찾는 중 · 1/2곳» · «07:14에 가져옴»)
//       fetching?: boolean     가져오는 중 — 접기 단추를 끄고 ⌄ 를 숨긴다
//       summary?: { total: string, failed?: string|null }  접힌 한 줄의 «활동 95건» · 주황 «1곳 못 가져옴»
//       writing?: { main: string, detail?: string|null } | null  AI 가 쓰는 동안 칸 아래 두 줄(굵게 · 회색)
//       collapsed?: boolean    한 줄로 접는다 — 접힌 줄엔 버튼 · summary · «직접 쓸 칸 N»(leftCount) · ⌄
//       onToggle?: () => void  접힌 줄·⌄ 를 누를 때 — 호스트가 collapsed 를 뒤집는다
//     }
//     계정 연결 안내가 떠 있을 때는 sources 를 그리지 않는다.
//   draftLabels?: 위 문구들 — 호스트가 번역해 넘긴다. 없는 키는 한국어 기본값.
//     tagLimit 은 태그가 8개 찼을 때 Tags 칸 아래 안내 (PW-2392).
//     summaryTeamVisible 은 노란 요약 + Lowlights 에 글이 있을 때 Summary 노란 표시 줄 아래 안내 (PW-2441).
//     closeConfirm(n)·closeConfirmKeep·closeConfirmDiscard 는 노란 칸이 남은 채 닫으려 할 때 확인 창 (PW-2734).
//   aiUsageNotice?: string | null — 아래 바 저장 상태 문구 밑에 같은 글씨로 한 줄 (PW-1515 · 기획서
//     screen-daily-snippet-write §6 「AI 사용 안내」 · D21). 제출하면 AI 표시가 사라진다는 안내라
//     호스트가 «AI 초안 칸이나 AI 추천 태그가 남아 있는 동안»만 넘긴다. 닫기 없음 · 제출을 막지 않는다.
//
// 자동 저장 표시 (기획 daily-snippet 작성 §11.2) — 모두 optional:
//   savedAt?: number — 마지막 서버 저장 성공 시각(ms). 「자동저장됨 HH:MM」의 시각.
//   saveStatus?: 'idle' | 'saving' | 'saved' | 'error' — 평소엔 표시 없음 / 「저장 중...」 /
//     「자동저장됨 HH:MM」 / 「저장 실패」. 안 주면 savedAt 이 있을 때만 'saved' 로 본다(종전 호스트).
//     문구는 draftLabels 의 saving·saved(time)·saveFailed 로 바꾼다.
//
// 남의 스니핏 읽기 (PW-1206) — 모두 optional:
//   readOnly?: boolean — 매니저가 팀원 스니핏을 여는 것처럼 «읽기만» 하는 자리. 켜면 칸이 고쳐지지
//     않고(readOnly), 점수를 바꿀 수 없으며, 쓰는 사람의 도구(AI 버튼·초안 채우기·추천 태그·태그 입력·
//     글자수·초기화·자동 등록 표시)가 사라진다. onDraftChange 도 부르지 않는다. 기본값 false — 종전 화면 그대로.
//   authorName?: string — 누구의 스니핏인지. 주면 제목이 「이름 · YYYY.MM.DD」가 된다.
//
//   노란 칸의 「확인」을 누르면 초록이 된다. 노란 칸의 글을 고쳐도 노란 그대로이고, 글을 다 지우면
//   표식이 사라진다. 「AI 요약 생성」 결과도 노란으로 시작한다. 추천 태그를 눌러 넣는 것은 색을
//   바꾸지 않는다. 노란 칸이 남은 채 등록(onSubmit)하거나 창을 닫으려 하면(✕·Esc·바깥) 그러지 않고
//   그 칸 이름을 알리며 첫 노란 칸으로 옮긴다.
//   표식은 작성 중에만 있다 — onDraftChange·onSubmit 의 두 번째 정보 `aiMarks`
//   ({[칸]: 'unconfirmed' | 'confirmed'}) 로 호스트에 알린다.
//
// 자동 저장 통지:
//   onDraftChange?: (draft, meta) => void
//     summary/tags/sectionTexts 가 바뀌거나 textarea/input 의 blur 시점에
//     호출된다. 호스트가 받아서 debounce 후 서버 저장 / localStorage 캐시 등
//     원하는 채널로 보낸다. meta.source 는 'change' | 'blur'.
//     한글 IME 조합 중에는 자모 단위 중간 상태가 호스트로 전달되지 않도록
//     compositionStart~compositionEnd 사이의 change/blur 호출을 보류한다.
//
// 작성 대상 날짜 이동 (PW-1421 · 기획 스니핏 작성 §7-B.2 · pivit-specs snippet-app.jsx DateNav):
//   onPrevDate?: () => void            주면 머리 날짜 왼쪽에 ‹ 를 그린다
//   onNextDate?: () => void            주면 머리 날짜 오른쪽에 › 를 그린다
//   nextDateDisabled?: boolean         작성 대상 날짜가 오늘이면 호스트가 true 로 준다
//   dateNavLabels?: { prev, next }     ‹ › 의 aria-label
//   ‹ › 는 공용 StepNavButton 그대로다. 날짜를 옮겨도 이 모달은 prefill 을 마운트 때만 읽으므로
//   호스트가 `key` 를 날짜로 바꿔 다시 마운트한다.
//
// 새로 쓸 수 없는 날짜 (PW-1421 · §7-B.4):
//   closedNotice?: string   주면 머리 날짜(와 ‹ ›) 아래에 이 안내 한 줄만 그린다 —
//                           입력 칸·초안·초기화·자동저장 표시를 그리지 않는다.
export default function SnippetModal({
  /** 제목 바로 오른쪽 «?» 튜토리얼 도움말 버튼 (pivit-work PW-2430). 안 주면 지금과 같다. */
  titleHelp,
  date,
  baseUrl,
  onClose,
  onSubmit,
  initial,
  onAiSummarize,
  onAiExtractTags,
  suggestedTags,
  onTagSelect,
  onDraftChange,
  savedAt,
  saveStatus,
  sectionMaxLength = DEFAULT_SECTION_MAX_LENGTH,
  onAiDraft,
  aiDraftLinked,
  draftBand,
  onOpenAccountLinks,
  aiNotice,
  draftLabels,
  readOnly = false,
  authorName,
  onPrevDate,
  onNextDate,
  nextDateDisabled = false,
  dateNavLabels,
  closedNotice,
  aiUsageNotice,
  labels,
}) {
  const L = { ...DEFAULT_DRAFT_LABELS, ...(draftLabels || {}) };
  const T = labels ? { ...DEFAULT_SNIPPET_MODAL_LABELS, ...labels } : DEFAULT_SNIPPET_MODAL_LABELS;
  const sectionText = (key) => ({ ...DEFAULT_SNIPPET_MODAL_LABELS.sections[key], ...(T.sections?.[key] || {}) });
  const [summary, setSummary] = useState(initial?.summary ?? '');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState(initial?.tags ? [...initial.tags] : []);
  const [sectionTexts, setSectionTexts] = useState({
    what: initial?.sections?.what ?? '',
    why: initial?.sections?.why ?? '',
    value: initial?.sections?.value ?? '',
    highlights: initial?.sections?.highlights ?? '',
    lowlights: initial?.sections?.lowlights ?? '',
  });
  const [healthScore, setHealthScore] = useState(
    typeof initial?.health?.score === 'number' ? initial.health.score : null,
  );
  const [healthNote, setHealthNote] = useState(initial?.health?.note ?? '');
  const [scrolled, setScrolled] = useState(false);
  // 푸터 자동 저장 표시 — 실제 서버 저장 성공 시각(savedAt, host 제공)을 쓴다.
  // 아직 한 번도 저장 안 됐으면 시각을 지어내지 않는다 — 여는 시각을 보여주면
  // 저장한 적 없는 빈 창이 «저장됨»으로 읽힌다(PW-1250).
  const savedAtLabel =
    savedAt == null
      ? null
      : (() => {
          const d = new Date(savedAt);
          return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        })();
  const effectiveSaveStatus = saveStatus ?? (savedAt == null ? 'idle' : 'saved');
  const autosaveText =
    effectiveSaveStatus === 'saving'
      ? L.saving
      : effectiveSaveStatus === 'error'
        ? L.saveFailed
        : effectiveSaveStatus === 'saved' && savedAtLabel
          ? L.saved(savedAtLabel)
          : null;
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [tagsLoading, setTagsLoading] = useState(false);
  // AI 실패 — { message }. 서버가 준 말이 없으면 그릴 때 화면 언어 기본 문구(T.summaryFailed·T.tagsFailed)
  const [summaryError, setSummaryError] = useState(null);
  const [tagsError, setTagsError] = useState(null);
  const [aiSuggestedTags, setAiSuggestedTags] = useState([]);
  // 활동 초안 — 칸별 표식('unconfirmed' 노랑 · 'confirmed' 초록). 작성 중에만 있다.
  const [aiMarks, setAiMarks] = useState({});
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftNote, setDraftNote] = useState(null); // 'empty' | 'fail' | null
  const [draftLeft, setDraftLeft] = useState(null); // 초안이 비워 둔 칸 키 목록
  const [linkedFromDraft, setLinkedFromDraft] = useState(null);
  const [blocked, setBlocked] = useState(false);
  const fieldRefs = useRef({});
  // IME 조합 중 — 'change' 통지 보류 플래그. state 로 두면 compositionEnd 직후
  // useEffect 가 자연스럽게 재실행되어 최종 결과가 호스트로 전달된다.
  const [isComposing, setIsComposing] = useState(false);
  const onDraftChangeRef = useRef(onDraftChange);
  useEffect(() => {
    onDraftChangeRef.current = onDraftChange;
  }, [onDraftChange]);

  const basePool =
    Array.isArray(suggestedTags) && suggestedTags.length > 0
      ? suggestedTags
      : T.defaultSuggestedTags;
  const tagSuggestionPool = [...new Set([...aiSuggestedTags, ...basePool])];

  const contentRef = useRef(null);

  const fieldLabel = (key) => {
    if (key === 'summary') return 'Summary';
    if (key === 'tags') return 'Tags';
    if (key === 'health') return 'Health Check';
    return SECTIONS.find((sec) => sec.key === key)?.label ?? key;
  };
  const unconfirmedKeys = DRAFT_FIELD_KEYS.filter((k) => aiMarks[k] === 'unconfirmed');
  const showDraftArea = !readOnly && typeof onAiDraft === 'function';
  const draftLinked = linkedFromDraft ?? aiDraftLinked;
  const bandSources = draftLinked !== false ? (draftBand?.sources ?? []) : [];
  const bandHasBody =
    bandSources.length > 0 ||
    !!draftBand?.writing ||
    !!draftLeft ||
    draftNote != null ||
    aiNotice?.at === 'draft';
  // 접어도 실패·안내 줄은 숨기지 않는다 — 접힌 줄에 «못 만들었다»가 안 보이면 버튼이 그냥 멈춘 것으로 읽힌다.
  const bandCollapsed =
    !!draftBand?.collapsed && bandHasBody && draftNote == null && aiNotice?.at !== 'draft';
  const noticeAt = (at) =>
    aiNotice && aiNotice.at === at ? (
      <div className="tl-snippet-ai-notice">{aiNotice.content}</div>
    ) : null;

  const focusField = useCallback((key) => {
    const el = fieldRefs.current[key];
    if (!el) return;
    if (typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    // 입력칸을 먼저 — 칸 머리의 「확인」 버튼이 문서 순서상 앞에 있어도 글 쓰는 자리로 간다.
    const target = el.matches?.('textarea, input')
      ? el
      : el.querySelector?.('textarea') ?? el.querySelector?.('input') ?? el.querySelector?.('button');
    if (target && typeof target.focus === 'function') target.focus({ preventScroll: true });
  }, []);

  // 사람이 칸을 모두 지우면 표식을 없애고 사람 칸으로 돌린다(정책서 §5-A.3).
  // 글을 고치는 것만으로는 색이 바뀌지 않는다 — 확인은 「확인」 버튼으로만 한다.
  const clearMarkIfEmptied = (key, emptied) => {
    if (!emptied) return;
    setAiMarks((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleAiDraft = useCallback(async () => {
    if (!onAiDraft || draftLoading) return;
    setDraftNote(null);
    setDraftLoading(true);
    try {
      const result = await onAiDraft();
      if (!result) return;
      if (result.linked && !result.linked.jira && !result.linked.github) {
        setLinkedFromDraft(false);
        return;
      }
      if (result.linked) setLinkedFromDraft(true);
      if (!result.activityCount) {
        setDraftNote('empty');
        return;
      }
      const draft = result.draft || {};
      const nextMarks = { ...aiMarks };
      const nextTexts = { ...sectionTexts };
      let nextSummary = summary;
      let nextTags = tags;
      for (const k of DRAFT_FIELD_KEYS) {
        const v = draft[DRAFT_KEY_OF_FIELD[k] ?? k];
        const hasValue = k === 'tags' ? Array.isArray(v) && v.length > 0 : typeof v === 'string' && v.trim();
        if (!hasValue) continue;
        const canFill = isFieldEmpty(k, sectionTexts, summary, tags) || aiMarks[k] === 'unconfirmed';
        if (!canFill) continue;
        if (k === 'summary') nextSummary = v;
        else if (k === 'tags') nextTags = [...new Set(v.map((t) => String(t).trim()).filter(Boolean))].slice(0, TAG_LIMIT);
        else nextTexts[k] = sectionMaxLength?.[k] != null ? v.slice(0, sectionMaxLength[k]) : v;
        nextMarks[k] = 'unconfirmed';
      }
      setSectionTexts(nextTexts);
      setSummary(nextSummary);
      setTags(nextTags);
      setAiMarks(nextMarks);
      setDraftLeft(
        DRAFT_FIELD_KEYS.filter((k) => isFieldEmpty(k, nextTexts, nextSummary, nextTags)),
      );
    } catch {
      setDraftNote('fail');
    } finally {
      setDraftLoading(false);
    }
  }, [onAiDraft, draftLoading, aiMarks, sectionTexts, summary, tags, sectionMaxLength]);

  const confirmMark = (key) => setAiMarks((prev) => ({ ...prev, [key]: 'confirmed' }));

  // 노란(확인 안 한) 칸이 남은 채 닫으려 하면(✕·Esc·바깥 누르기) 바로 닫지 않고 확인 창을 띄운다
  // (pivit-work PW-2734 David 결정 2026-11-12 · 종전 PW-1154 «닫지 않는다»). [닫기] 만 글을 버린다 —
  // 호스트는 노란 칸의 글을 저장하지 않으므로 닫으면 그 AI 글은 남지 않는다.
  const [closeAsk, setCloseAsk] = useState(false);
  const requestClose = () => {
    if (unconfirmedKeys.length > 0) {
      setCloseAsk(true);
      return;
    }
    onClose();
  };
  // [계속 쓰기] · 확인 창의 Esc · 확인 창 바깥 누르기 — 창은 그대로, 노란 칸 이름을 알리고 첫 노란 칸으로.
  const keepWriting = () => {
    setCloseAsk(false);
    setBlocked(true);
    if (unconfirmedKeys.length > 0) focusField(unconfirmedKeys[0]);
  };
  const discardAndClose = () => {
    setCloseAsk(false);
    onClose();
  };
  const blockedShown = blocked && unconfirmedKeys.length > 0;

  const markClass = (key) =>
    aiMarks[key] === 'unconfirmed'
      ? ' is-draft-unconfirmed'
      : aiMarks[key] === 'confirmed'
        ? ' is-draft-confirmed'
        : '';

  const renderMark = (key) => {
    const mark = aiMarks[key];
    if (!mark) return null;
    if (mark === 'confirmed') {
      return (
        <span className="tl-snippet-draft-mark is-confirmed">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {L.markConfirmed}
        </span>
      );
    }
    return (
      <span className="tl-snippet-draft-mark is-unconfirmed">
        {L.markUnconfirmed}
        <button
          type="button"
          className="tl-snippet-draft-confirm"
          onClick={() => confirmMark(key)}
          aria-label={`${fieldLabel(key)} ${L.confirm}`}
        >
          {L.confirm}
        </button>
      </span>
    );
  };

  // Progress: 채워진 섹션 수 / 전체 섹션 수 → active bar width %
  const filledCount = SECTIONS.filter((s) => sectionTexts[s.key].trim()).length;
  const progressPct = (filledCount / SECTIONS.length) * 100;


  // Body scrollTop >= 40 → top bar 에 "데일리 스니펫 · {date}" 타이틀 노출
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop >= 40);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);


  const dateLabel = (() => {
    const d = date ?? new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}.${m}.${day}`;
  })();

  // 사람이 넣어 8개가 찬 순간 토스트를 잠깐 띄운다(TC-DS-031 «8개에서 토스트 후 입력 비활성»).
  // 토스트가 사라진 뒤에도 막힌 이유가 보이게 칸 아래 안내 줄은 남긴다 (PW-2392).
  const [tagLimitToast, setTagLimitToast] = useState(false);
  const tagLimitToastTimer = useRef(null);
  useEffect(() => () => clearTimeout(tagLimitToastTimer.current), []);
  const addTag = (t) => {
    const v = t.trim();
    if (!v || tags.includes(v) || tags.length >= TAG_LIMIT) return false;
    setTags((prev) => [...prev, v]);
    if (tags.length + 1 === TAG_LIMIT) {
      setTagLimitToast(true);
      clearTimeout(tagLimitToastTimer.current);
      tagLimitToastTimer.current = setTimeout(() => setTagLimitToast(false), 3000);
    }
    return true;
  };
  const tagsFull = tags.length >= TAG_LIMIT;
  const onTagKey = (e) => {
    if (isEnterKey(e)) {
      e.preventDefault();
      // 들어갔을 때만 칸을 비운다 — 이미 있는 태그·한도로 안 들어간 글자를 말없이 지우지 않는다 (PW-2392)
      if (addTag(tagInput)) setTagInput('');
    }
  };

  const removeTag = (t) => {
    const next = tags.filter((x) => x !== t);
    setTags(next);
    clearMarkIfEmptied('tags', next.length === 0);
  };

  const buildAiInput = useCallback(
    () => ({
      whatDidYouDo: sectionTexts.what,
      whyDidYouDoIt: sectionTexts.why,
      valuesAdded: sectionTexts.value,
      highlights: sectionTexts.highlights,
      lowlights: sectionTexts.lowlights,
      healthScore,
      healthNote,
    }),
    [sectionTexts, healthScore, healthNote],
  );

  // AI 버튼을 켜는 조건 (기획서 작성 화면 정책서 §3 · ai-data-spec 활성 조건).
  // 요약: 다섯 칸을 합친 글자가 공백 빼고 20자를 넘을 때. 태그: 요약이나 What 중 하나라도 있을 때
  // (2026-09-25 정정 — 태그에는 20자 기준이 없다).
  const summaryReady =
    [sectionTexts.what, sectionTexts.why, sectionTexts.value, sectionTexts.highlights, sectionTexts.lowlights]
      .join('')
      .trim().length > AI_SUMMARY_MIN_CHARS;
  const tagsReady = !!(summary.trim() || sectionTexts.what.trim());

  const handleSummarize = useCallback(async () => {
    if (!onAiSummarize || summaryLoading || !summaryReady) return;
    setSummaryError(null);
    setSummaryLoading(true);
    try {
      const result = await onAiSummarize(buildAiInput());
      if (result?.summary) {
        setSummary(result.summary);
        // AI 요약도 노란(미확인)으로 시작한다 — 초록·사람 칸이어도 대체한다(정책서 §5-A.3-A).
        setAiMarks((prev) => ({ ...prev, summary: 'unconfirmed' }));
      }
    } catch (err) {
      setSummaryError({ message: err?.message });
    } finally {
      setSummaryLoading(false);
    }
  }, [onAiSummarize, summaryLoading, summaryReady, buildAiInput]);

  // AI 결과는 추천으로만 둔다 — 고르는 것은 사람이다(PW-1250).
  const handleExtractTags = useCallback(async () => {
    if (!onAiExtractTags || tagsLoading || !tagsReady) return;
    setTagsError(null);
    setTagsLoading(true);
    try {
      // 태그는 요약도 읽는다 — 요약만 쓴 사람도 버튼이 켜지기 때문이다(ai-data-spec 태그 데이터 범위).
      const result = await onAiExtractTags({ ...buildAiInput(), summary });
      if (Array.isArray(result?.tags)) {
        setAiSuggestedTags([
          ...new Set(result.tags.map((t) => String(t ?? '').trim()).filter(Boolean)),
        ]);
      }
    } catch (err) {
      setTagsError({ message: err?.message });
    } finally {
      setTagsLoading(false);
    }
  }, [onAiExtractTags, tagsLoading, tagsReady, summary, buildAiInput]);

  const handleSuggestedTagClick = (t) => {
    addTag(t);
    if (onTagSelect) onTagSelect(t);
  };

  const handleReset = () => {
    setSummary('');
    setTagInput('');
    setTags([]);
    setAiSuggestedTags([]);
    setSectionTexts({ what: '', why: '', value: '', highlights: '', lowlights: '' });
    setHealthScore(null);
    setHealthNote('');
    setAiMarks({});
    setDraftLeft(null);
    setDraftNote(null);
    setBlocked(false);
  };

  const setSectionText = (key, v) => {
    setSectionTexts((prev) => ({ ...prev, [key]: v }));
    clearMarkIfEmptied(key, !v.trim());
  };

  // 자동 저장 통지 — summary/tags/sectionTexts 변경 시 호스트로 'change' 발화.
  // IME 조합 중에는 보류. compositionEnd 로 isComposing 이 false 가 되는 순간
  // useEffect 가 재실행되어 최종 결과가 한 번 통지된다.
  useEffect(() => {
    if (readOnly || !onDraftChangeRef.current) return;
    if (isComposing) return;
    onDraftChangeRef.current(
      {
        summary,
        tags,
        sections: sectionTexts,
        health: { score: healthScore, note: healthNote },
      },
      { source: 'change', aiMarks },
    );
  }, [summary, tags, sectionTexts, healthScore, healthNote, isComposing, aiMarks, readOnly]);

  const handleFieldBlur = useCallback(() => {
    if (readOnly || !onDraftChangeRef.current) return;
    if (isComposing) return;
    onDraftChangeRef.current(
      {
        summary,
        tags,
        sections: sectionTexts,
        health: { score: healthScore, note: healthNote },
      },
      { source: 'blur', aiMarks },
    );
  }, [summary, tags, sectionTexts, healthScore, healthNote, isComposing, aiMarks, readOnly]);

  const handleCompositionStart = useCallback(() => setIsComposing(true), []);
  const handleCompositionEnd = useCallback(() => setIsComposing(false), []);

  const canSubmit = summary.trim() || Object.values(sectionTexts).some((v) => v.trim());
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    // 노란(확인 안 한) AI 초안이 남으면 등록하지 않는다 — 「그대로 등록」은 없다(기획서 §6.0).
    if (unconfirmedKeys.length > 0) {
      setBlocked(true);
      focusField(unconfirmedKeys[0]);
      return;
    }
    onSubmit(
      {
        date: dateLabel,
        summary: summary.trim(),
        tags,
        sections: sectionTexts,
        health: { score: healthScore, note: healthNote.trim() },
      },
      { aiMarks },
    );
  };

  return (
    <ModalLayer onClose={requestClose}>
      <form
        className={`tl-group-modal tl-snippet-modal ${scrolled ? 'is-scrolled' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tl-snippet-modal-title"
        onSubmit={handleSubmit}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="tl-group-modal-top tl-snippet-top">
          <span className="tl-snippet-top-title" aria-hidden={!scrolled}>
            {authorName ? `${authorName}  ·  ` : ''}{T.headerTitle}  ·  {dateLabel}
          </span>
          <button
            type="button"
            className="tl-group-modal-close"
            aria-label={T.close}
            onClick={requestClose}
          >
            <CloseGlyph size={24} />
          </button>
        </div>

        <div ref={contentRef} className="tl-group-modal-content tl-snippet-modal-content">
          <div className="tl-snippet-date-row">
            {onPrevDate && (
              <StepNavButton
                direction="prev"
                baseUrl={baseUrl}
                aria-label={dateNavLabels?.prev ?? T.prevDate}
                onClick={onPrevDate}
              />
            )}
            <h2 id="tl-snippet-modal-title" className="tl-snippet-date">
              {authorName ? `${authorName} · ${dateLabel}` : dateLabel}
            </h2>
            {onNextDate && (
              <StepNavButton
                direction="next"
                baseUrl={baseUrl}
                aria-label={dateNavLabels?.next ?? T.nextDate}
                disabled={nextDateDisabled}
                onClick={onNextDate}
              />
            )}
            {titleHelp}
          </div>

          {closedNotice ? (
            <p className="tl-snippet-closed-notice" role="note">
              {closedNotice}
            </p>
          ) : (
          <>

          {/* 활동 초안 띠 (PW-1154 · PW-1649 · PW-2733) — 버튼·출처별 건수·직접 써야 할 칸을 한 띠로 묶어
              날짜 줄 바로 아래에 둔다. 진척 막대는 칸 목차라 그 바로 밑에 What 이 온다.
              띠는 창 전체를 채우는 도구라 맨 위다(카드 본문 ①). */}
          {showDraftArea && (
            <section
              className={`tl-snippet-band${bandCollapsed ? ' is-collapsed' : ''}`}
              aria-label={L.fill}
              data-testid="tl-snippet-band"
            >
              <div className="tl-snippet-band-top">
                {draftLinked === false ? (
                  <div className="tl-snippet-draft-link" role="note">
                    <span>{L.linkNotice}</span>
                    {onOpenAccountLinks && (
                      <button type="button" className="tl-snippet-draft-link-btn" onClick={onOpenAccountLinks}>
                        {L.linkAction}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <line x1="5" y1="12" x2="19" y2="12" />
                          <polyline points="12 5 19 12 12 19" />
                        </svg>
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    className="tl-snippet-ai-btn"
                    onClick={handleAiDraft}
                    disabled={draftLoading}
                    aria-busy={draftLoading || undefined}
                  >
                    {/* 기다리는 동안 반짝이 자리에 공용 도는 표시 — 오늘 활동을 바로 가져오느라 길어질 수 있다 (PW-1191) */}
                    {draftLoading ? (
                      <Spinner size={14} />
                    ) : (
                      <img
                        src={assetUrl(baseUrl, 'icons-solid/ai-sparkle.png')}
                        alt=""
                        width="14"
                        height="14"
                        aria-hidden="true"
                      />
                    )}
                    <span>{draftLoading ? L.filling : L.fill}</span>
                  </button>
                )}
                {bandHasBody && (
                  <Button
                    className="tl-snippet-band-toggle"
                    onClick={draftBand?.onToggle}
                    disabled={!draftBand?.onToggle || draftBand?.fetching}
                    aria-expanded={!bandCollapsed}
                    data-testid="tl-snippet-band-toggle"
                  >
                    {bandCollapsed ? (
                      <>
                        {draftBand?.summary && (
                          <span className="tl-snippet-band-sum">
                            <b>{draftBand.summary.total}</b>
                            {draftBand.summary.failed && (
                              <span className="is-warning"> · {draftBand.summary.failed}</span>
                            )}
                          </span>
                        )}
                        {draftLeft && (
                          <span className="tl-snippet-band-sum-left">{L.leftCount(draftLeft.length + 1)}</span>
                        )}
                      </>
                    ) : (
                      draftBand?.status && <span className="tl-snippet-band-when">{draftBand.status}</span>
                    )}
                    {!draftBand?.fetching && (
                      <span className={`tl-snippet-band-chev${bandCollapsed ? '' : ' is-open'}`} aria-hidden="true">
                        <ChevronDownGlyph size={16} />
                      </span>
                    )}
                  </Button>
                )}
              </div>
              {!bandCollapsed && bandHasBody && (
                <Stack gap="lg" testId="tl-snippet-band-body">
                  {bandSources.length > 0 && (
                    <div
                      className={`tl-snippet-band-stats is-cols-${bandSources.length <= 2 ? 2 : 3}`}
                      data-testid="tl-snippet-band-stats"
                    >
                      {bandSources.map((src) => (
                        <div
                          key={src.key}
                          className={`tl-snippet-band-stat is-${src.state}`}
                          role="status"
                          data-testid={`tl-snippet-band-stat-${src.key}`}
                        >
                          <span className="tl-snippet-band-stat-name">{src.name}</span>
                          {src.state === 'loading' ? (
                            <span className="tl-snippet-band-stat-val is-muted">
                              <Spinner size={10} /> {src.text ?? L.progressLoading}
                            </span>
                          ) : src.state === 'off' ? (
                            <Button
                              className="tl-snippet-band-stat-link"
                              onClick={onOpenAccountLinks}
                              disabled={!onOpenAccountLinks}
                            >
                              {src.text}
                              <ArrowRightGlyph size={12} />
                            </Button>
                          ) : (
                            <span className="tl-snippet-band-stat-val">
                              {src.value != null && <b>{src.value}</b>}
                              {src.unit && <small>{src.unit}</small>}
                              {src.text && <span>{src.text}</span>}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {draftBand?.writing && (
                    <div className="tl-snippet-band-writing" role="status" aria-live="polite" data-testid="tl-snippet-band-writing">
                      <span className="tl-snippet-band-writing-main">{draftBand.writing.main}</span>
                      {draftBand.writing.detail && (
                        <span className="tl-snippet-band-writing-detail">{draftBand.writing.detail}</span>
                      )}
                    </div>
                  )}
                  {noticeAt('draft')}
                  {draftNote === 'empty' && <div className="tl-snippet-draft-note">{L.empty}</div>}
                  {draftNote === 'fail' && (
                    <div className="tl-snippet-draft-note is-error" role="alert">{L.fail}</div>
                  )}
                  {draftLeft && (
                    <div className="tl-snippet-draft-left">
                      <span className="tl-snippet-draft-left-title">{L.left}</span>
                      {['health', ...draftLeft].map((k) => (
                        <button key={k} type="button" className="tl-snippet-tag" onClick={() => focusField(k)}>
                          {fieldLabel(k)}
                        </button>
                      ))}
                    </div>
                  )}
                </Stack>
              )}
            </section>
          )}

          {/* Progress bar — 섹션 채움 수만큼 active bar 가 그라디언트로 확장.
              Figma Frame 205, r=6, active bar r=6, 5등분. */}
          <div
            className="tl-snippet-progress"
            role="progressbar"
            aria-valuenow={filledCount}
            aria-valuemax={SECTIONS.length}
          >
            <span
              className="tl-snippet-progress-fill"
              style={{ width: `${progressPct}%` }}
              aria-hidden="true"
            />
            {SECTIONS.map((s, i) => {
              const thresholdPct = ((i + 1) / SECTIONS.length) * 100;
              const isActive = progressPct >= thresholdPct - 0.01;
              return (
                <span
                  key={s.key}
                  className={`tl-snippet-progress-segment ${isActive ? 'is-active' : ''}`}
                >
                  {s.progressLabel || s.label}
                </span>
              );
            })}
          </div>

          <div className="tl-snippet-body">
            {/* Figma 순서: 5 섹션 (What/Why/Value/Highlights/Lowlights) → Summary → Tags */}

            {/* What / Why / Value / Highlights / Lowlights */}
            {SECTIONS.map((s) => (
              <div
                className="tl-snippet-field"
                key={s.key}
                ref={(el) => {
                  fieldRefs.current[s.key] = el;
                }}
              >
                <div className="tl-snippet-field-head">
                  <div className="tl-snippet-field-label">
                    {s.label}
                    <span className="tl-snippet-label-hint">{sectionText(s.key).hint}</span>
                  </div>
                  {renderMark(s.key)}
                </div>
                <textarea
                  className={`tl-snippet-textarea${markClass(s.key)}`}
                  placeholder={readOnly ? undefined : sectionText(s.key).placeholder}
                  readOnly={readOnly}
                  value={sectionTexts[s.key]}
                  onChange={(e) => setSectionText(s.key, e.target.value)}
                  onCompositionStart={handleCompositionStart}
                  onCompositionEnd={handleCompositionEnd}
                  onBlur={handleFieldBlur}
                  maxLength={sectionMaxLength?.[s.key]}
                />
                {!readOnly && sectionMaxLength?.[s.key] != null && (
                  <div
                    className={`tl-snippet-count${
                      sectionTexts[s.key].length >
                      sectionMaxLength[s.key] * NEAR_LIMIT_RATIO
                        ? ' is-near-limit'
                        : ''
                    }`}
                  >
                    {sectionTexts[s.key].length} / {sectionMaxLength[s.key]}
                  </div>
                )}
              </div>
            ))}

            {/* Health Check — 1~10 점수 + 영향 요인 textarea (Figma 16627:58459) */}
            <div
              className="tl-snippet-field"
              ref={(el) => {
                fieldRefs.current.health = el;
              }}
            >
              <div className="tl-snippet-field-head tl-snippet-health-head">
                <div className="tl-snippet-field-label">
                  Health Check
                  {healthScore != null && (
                    // PW-1388 — 이름표도 선택된 칸(반올림)과 같은 값으로 읽는다. 6.7 이면 칸은 7 인데 이름표만 «힘듦»이 된다.
                    <span
                      className={`tl-snippet-health-label tl-snippet-health-label--${healthTier(Math.round(healthScore))}`}
                    >
                      {healthLabel(Math.round(healthScore), T.healthWords)}
                    </span>
                  )}
                </div>
                <div
                  className="tl-snippet-health-scores"
                  role="radiogroup"
                  aria-label={T.healthAria}
                  aria-readonly={readOnly || undefined}
                >
                  {HEALTH_SCORES.map((n) => {
                    // PW-1388 — 점수가 6.7 처럼 소수로 올 수 있다. 칸은 정수뿐이라 가장 가까운 칸을 고른다.
                    const selected = healthScore != null && Math.round(healthScore) === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={`tl-snippet-health-score tl-snippet-health-score--${healthTier(
                          n,
                        )} ${selected ? 'is-selected' : ''}`}
                        onClick={() => {
                          if (readOnly) return;
                          setHealthScore(selected ? null : n);
                        }}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              </div>
              <textarea
                className="tl-snippet-textarea"
                placeholder={readOnly ? undefined : T.healthReasonPlaceholder}
                readOnly={readOnly}
                value={healthNote}
                onChange={(e) => setHealthNote(e.target.value)}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                onBlur={handleFieldBlur}
              />
            </div>

            {/* Summary */}
            <div
              className="tl-snippet-field"
              ref={(el) => {
                fieldRefs.current.summary = el;
              }}
            >
              <div className="tl-snippet-field-head">
                <div className="tl-snippet-field-label">
                  Summary
                  {!readOnly && <span className="tl-snippet-label-hint">{T.summaryHint}</span>}
                </div>
                {renderMark('summary')}
                {!readOnly && (
                <button
                  type="button"
                  className="tl-snippet-ai-btn"
                  onClick={handleSummarize}
                  disabled={!onAiSummarize || summaryLoading || !summaryReady}
                  aria-busy={summaryLoading || undefined}
                >
                  <img
                    src={assetUrl(baseUrl, 'icons-solid/ai-sparkle.png')}
                    alt=""
                    width="14"
                    height="14"
                    aria-hidden="true"
                  />
                  <span className="tl-snippet-ai-gradient">AI</span>
                  <span>{summaryLoading ? T.summaryGenerating : T.summaryGenerate}</span>
                </button>
                )}
              </div>
              {/* 노란 요약 + Lowlights 에 글 — 확인·요약 지움(표시 사라짐)·Lowlights 비움·사람이 쓴 요약이면 숨는다 (PW-2441).
                  어느 버튼으로 채웠는지 따지지 않고 칸 상태로만 가른다 — 오늘 활동 초안으로 채운 노란 요약에도 보인다. */}
              {!readOnly && aiMarks.summary === 'unconfirmed' && sectionTexts.lowlights.trim() && (
                <div className="tl-snippet-label-hint" data-testid="snippet-summary-team-visible">
                  {L.summaryTeamVisible}
                </div>
              )}
              {noticeAt('summary')}
              <textarea
                className={`tl-snippet-textarea ${summary.trim() ? 'is-ai-filled' : ''}${markClass('summary')}`}
                placeholder={readOnly ? undefined : summaryReady ? T.summaryReadyPlaceholder : T.summaryPlaceholder}
                readOnly={readOnly}
                value={summary}
                onChange={(e) => {
                  setSummary(e.target.value);
                  clearMarkIfEmptied('summary', !e.target.value.trim());
                }}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                onBlur={handleFieldBlur}
              />
              {/* 안내 상자는 버튼을 못 누르고 칸이 빈 동안만 보인다 — 실패 문구도 이 상자에 뜨므로 실패하면 보인다 (PW-2762) */}
              {!readOnly && (summaryError || (!summaryReady && !summary.trim())) && (
              <div className="tl-snippet-info">
                <img
                  src={assetUrl(baseUrl, 'icons-solid/ai-sparkle.png')}
                  alt=""
                  width="14"
                  height="14"
                  aria-hidden="true"
                />
                <span className="tl-snippet-info-text">
                  {summaryError
                    ? summaryError.message || T.summaryFailed
                    : T.summaryInfo}
                </span>
              </div>
              )}
            </div>

            {/* Tags */}
            <div
              className="tl-snippet-field"
              ref={(el) => {
                fieldRefs.current.tags = el;
              }}
            >
              <div className="tl-snippet-field-head">
                <div className="tl-snippet-field-label">
                  Tags
                  {!readOnly && <span className="tl-snippet-label-hint">{T.tagsHint}</span>}
                </div>
                {renderMark('tags')}
                {!readOnly && (
                <button
                  type="button"
                  className="tl-snippet-ai-btn"
                  onClick={handleExtractTags}
                  disabled={!onAiExtractTags || tagsLoading || !tagsReady}
                  aria-busy={tagsLoading || undefined}
                >
                  <img
                    src={assetUrl(baseUrl, 'icons-solid/ai-sparkle.png')}
                    alt=""
                    width="14"
                    height="14"
                    aria-hidden="true"
                  />
                  <span className="tl-snippet-ai-gradient">AI</span>
                  <span>{tagsLoading ? T.tagsExtracting : T.tagsExtract}</span>
                </button>
                )}
              </div>
              {noticeAt('tags')}
              {/* 필드 안에 선택된 태그 chip + 신규 입력 */}
              <div className={`tl-snippet-tag-field ${tags.length ? 'is-ai-filled' : ''}${markClass('tags')}`}>
                {tags.map((t) => (
                  <span key={t} className="tl-snippet-tag tl-snippet-tag-selected">
                    {t}
                    {!readOnly && (
                    <button
                      type="button"
                      className="tl-snippet-tag-x"
                      aria-label={T.tagRemove}
                      onClick={() => removeTag(t)}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="9" y1="3" x2="3" y2="9" />
                        <line x1="3" y1="3" x2="9" y2="9" />
                      </svg>
                    </button>
                    )}
                  </span>
                ))}
                {!readOnly && (
                <input
                  type="text"
                  className="tl-snippet-tag-inline-input"
                  placeholder={tags.length === 0 ? T.tagInputPlaceholder : ''}
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={onTagKey}
                  onCompositionStart={handleCompositionStart}
                  onCompositionEnd={handleCompositionEnd}
                  onBlur={handleFieldBlur}
                  disabled={tagsFull}
                />
                )}
              </div>
              {!readOnly && tagsFull && (
                <div className="tl-snippet-label-hint">{L.tagLimit}</div>
              )}
              <Toast message={tagLimitToast ? L.tagLimit : null} tone="info" data-testid="snippet-tag-limit-toast" />
              {/* AI 태그 추출 실패 시에만 인라인 에러 노출 — Summary 의 summaryError 와 동일
                  패턴(tl-snippet-info). 정상 상태에서는 렌더되지 않아 시각 변화 없음.
                  추천 chip(.tl-snippet-suggest-tags, padding-bottom:80px) 앞에 두어
                  에러가 트리거 버튼 가까이 노출되도록 한다(80px 스페이서 아래로 밀리지 않게). */}
              {tagsError && (
                <div className="tl-snippet-info" role="alert">
                  <img
                    src={assetUrl(baseUrl, 'icons-solid/ai-sparkle.png')}
                    alt=""
                    width="14"
                    height="14"
                    aria-hidden="true"
                  />
                  <span className="tl-snippet-info-text">{tagsError.message || T.tagsFailed}</span>
                </div>
              )}
              {!readOnly && (
              <div className="tl-snippet-suggest-tags">
                {tagSuggestionPool.map((t) => {
                  const already = tags.includes(t) || tags.length >= TAG_LIMIT;
                  return (
                    <button
                      key={t}
                      type="button"
                      className={`tl-snippet-tag ${already ? 'is-dim' : ''}`}
                      onClick={() => handleSuggestedTagClick(t)}
                      disabled={already}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
              )}
            </div>
          </div>
          </>
          )}
        </div>

        {!readOnly && !closedNotice && (
        <div className="tl-snippet-modal-actions">
          <button
            type="button"
            className="tl-snippet-reset-btn"
            onClick={handleReset}
          >
            {T.reset}
          </button>
          {blockedShown && (
            <span className="tl-snippet-draft-blocked" role="alert">
              {L.blocked(unconfirmedKeys.length, unconfirmedKeys.map(fieldLabel).join(' · '))}
            </span>
          )}
          {(autosaveText || aiUsageNotice) && (
          <div className="tl-snippet-modal-status">
          {autosaveText && (
            <span
              className={`tl-snippet-autosave${effectiveSaveStatus === 'error' ? ' is-error' : ''}`}
              role="status"
              data-save-status={effectiveSaveStatus}
            >
              {autosaveText}
            </span>
          )}
          {aiUsageNotice && (
            <span className="tl-snippet-autosave is-note" data-testid="snippet-ai-usage-notice">
              {aiUsageNotice}
            </span>
          )}
          </div>
          )}
        </div>
        )}
      </form>
      {closeAsk && (
        <ConfirmModal
          title={L.closeConfirm(unconfirmedKeys.length)}
          confirmLabel={L.closeConfirmDiscard}
          cancelLabel={L.closeConfirmKeep}
          closeLabel={T.close}
          onConfirm={discardAndClose}
          onCancel={keepWriting}
          // 작성 창 막(.tl-modal-overlay · modal-shell.css 2147483000) 위에 떠야 누를 수 있다.
          zIndex={2147483001}
          testId="snippet-close-confirm"
          cancelTestId="snippet-close-confirm-keep"
          confirmTestId="snippet-close-confirm-discard"
        />
      )}
    </ModalLayer>
  );
}
