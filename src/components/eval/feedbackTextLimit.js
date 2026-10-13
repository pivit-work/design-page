import { createContext, useContext } from 'react';

/**
 * 피드백 본문 최대 길이 (PW-1799) — 두 피드백 캔버스의 입력칸 여섯 곳이 같은 한도를 쓴다.
 * 한도 숫자는 앱이 `textMaxLength` prop 으로 넘긴다(서버 정본과 같은 값). 안 넘기면 제한 없음.
 * 칸마다 prop 을 몇 층씩 내려보내지 않으려고 캔버스 뿌리가 컨텍스트로 깔아 둔다.
 */
export const FeedbackTextLimitContext = createContext(undefined);

export function useFeedbackTextLimit() {
  return useContext(FeedbackTextLimitContext);
}

/** 한도를 넘었는가 — 넘으면 보내기를 막는다. 붙여 넣기는 브라우저가 자르지만 AI 초안처럼 코드로 넣은 글은 안 잘린다. */
export function useFeedbackTextTooLong(text) {
  const max = useFeedbackTextLimit();
  return max != null && String(text ?? '').length > max;
}
