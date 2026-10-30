/**
 * OKR 화면 문구 — 소비자가 번역을 넘기는 자리 (pivit-work PW-2415).
 *
 * 종전에는 문구가 OKR 부품 안에 한국어로 박혀 있어서, 영어로 바꿔도 개인·팀 OKR·대시보드·
 * 전략 캔버스·컨텍스트 설정 창 안은 한국어로 남았다. 조직도(`orgchart-labels.jsx`, PW-705)와 같은
 * 모양으로 문구를 여기 한 곳에 모으고 캔버스·창이 `labels` prop 으로 번역을 받는다.
 *
 * `labels` 는 둘 중 하나다:
 *  - 객체 — `{ 'board.feedback': 'Feedback', … }` 처럼 바꿀 키만 준다.
 *  - 함수 — `(key, vars) => string | undefined`. 번역기를 그대로 물린다. 빈 값이면 아래 기본값.
 *
 * 🔴 **안 넘기면 지금 한국어 문구가 그대로 나온다** — 기본값이 곧 종전 화면이다.
 * 자리 표시는 `{{name}}` 이다(i18next 와 같다).
 */
import { createContext, useContext } from 'react';
import { resolveKoreanParticles } from '../shared/koreanParticle.js';

export const OKR_LABELS = {
  // ── 개인·팀 OKR 머리 ──
  'period.history': '히스토리',

  // ── 보드 ──
  'board.linkedParents': '연결된 상위 OKR',
  'board.overall': '전체달성률',
  'board.statusToggleHint': '클릭해 상태 전환',
  'board.unalignedNote': '회사 OKR 미연결',
  'board.unalignedTitle': '상위 KR 에 연결된 하위 KR 이 없습니다',
  'board.teamLink': '팀{{team}}',
  'board.feedback': '피드백',
  'board.writeFeedback': '피드백 작성',
  'board.viewAllFeedback': '전체 보기',
  'board.feedbackSubmit': '완료',
  'board.cancel': '취소',

  // ── 미정렬 딱지 ──
  'unaligned.label': '미정렬',
  'unaligned.count': '미정렬 {{count}}',
  'unaligned.rowTitle': '상위 연결이 없는 KR {{count}}개 — 아직 어느 팀도 받지 않았습니다',

  // ── AI 인사이트 상자 ──
  'insights.label': 'AI 인사이트',
  'insights.autoChip': '자동 분석',
  'insights.refresh': '새로고침',
  'insights.close': '닫기',

  // ── 대시보드 ──
  'dashboard.dragHint': '화면을 드래그하면 좀 더 쉽게 OKR를 보실 수 있습니다.',

  // ── 전략 캔버스 ──
  'strategy.tabCanvas': '전략 캔버스',
  'strategy.tabHistory': '히스토리',
  'strategy.aiAll': '전략 전체 AI 자동완성',
  'strategy.aiAllRunning': 'AI 자동완성 중…',
  'strategy.cancel': '취소',
  'strategy.save': '저장',
  'strategy.saving': '저장 중…',
  'strategy.edit': '편집',
  'strategy.rowAi': '{{row}} AI 자동완성',
  'strategy.rowAiShort': 'AI',
  'strategy.rowAiRunning': '생성 중…',
  'strategy.placeholder': '준비 중인 화면입니다',
  'strategy.close': '닫기',
  'strategy.saveFailed': '전략 캔버스 저장에 실패했습니다. 잠시 후 다시 시도해주세요.',
  'strategy.missingFirst': '{{fields}}을(를) 먼저 입력해주세요.',
  'strategy.aiFailed': 'AI 자동완성에 실패했습니다. 잠시 후 다시 시도해주세요.',

  // ── OKR 컨텍스트 설정 창 ──
  'context.title': 'OKR 컨텍스트 설정',
  'context.adminOnly': '관리자 전용',
  'context.optional': '선택사항',
  'context.footerHint': 'AI 분석은 선택입니다. 확인하지 않은 분석 결과는 컨텍스트로 주입되지 않습니다.',
  'context.start': 'OKR설정 시작',
  'context.intro': 'AI가 우리 회사를 이해하는 기반 지식입니다. 회사 문서·링크·전략 메모를 한 곳에 등록해두면, 이후 모든 OKR 수립(전사→부문→팀→개인)에서 AI 제안의 정확도가 높아집니다.',
  'context.introNote': '비워두고도 OKR 설정을 진행할 수 있어요.',
  'context.sourcesTitle': '지식 소스',
  'context.sourcesDesc': '파일·링크·텍스트를 하나의 목록에 자유롭게 추가하세요. 분류는 필요 없습니다.',
  'context.uploadAria': '지식 소스 파일 업로드',
  'context.uploadClick': '업로드하려면 클릭하세요',
  'context.uploadOr': '또는 끌어서 놓기',
  'context.analysisTitle': 'AI 분석 — 키워드·전략 테마 추출',
  'context.analysisDesc': '소스가 1건 이상일 때 분석할 수 있습니다. 선택 사항이며 수동으로 실행됩니다.',

  // ── KR 피드백 옛 창 (앱은 열지 않는다 — OkrBoard.jsx 머리 주석) ──
  'krFeedback.eyebrow': 'KR 피드백',
  'krFeedback.request': '피드백 요청 보내기',
  'krFeedback.reply': '답변 달기',
  'krFeedback.replyPlaceholder': '답변을 입력해 주세요.',
  'krFeedback.cancel': '취소',
  'krFeedback.submit': '등록',
  'krFeedback.submitting': '등록 중…',
  'krFeedback.replyFailed': '답변 등록에 실패했습니다. 잠시 후 다시 시도해주세요.',
};

function interpolate(str, vars) {
  if (!vars) return str;
  return resolveKoreanParticles(str.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (vars[k] == null ? m : String(vars[k]))));
}

/**
 * `labels`(객체·함수·없음)를 `L(key, vars) → string` 하나로 만든다.
 * 소비자가 못 준 키는 기본값(한국어)으로 떨어진다 — 빈 칸이 뜨지 않는다.
 */
export function makeOkrLabels(labels) {
  return (key, vars) => {
    // 함수가 준 문구는 번역기가 자리 표시를 이미 채운 완성 문장이다 — 다시 채우지 않는다.
    if (typeof labels === 'function') {
      const v = labels(key, vars);
      if (typeof v === 'string' && v !== '') return v;
    } else if (labels && typeof labels === 'object') {
      const v = labels[key];
      if (typeof v === 'string' && v !== '') return interpolate(v, vars);
    }
    const base = OKR_LABELS[key];
    return base == null ? key : interpolate(base, vars);
  };
}

const DEFAULT_L = makeOkrLabels(null);

export const OkrLabelsContext = createContext(DEFAULT_L);

/** 캔버스 안 부품이 문구를 꺼내는 곳. Provider 가 없으면 한국어 기본값. */
export function useOkrLabels() {
  return useContext(OkrLabelsContext);
}
